import type { CompanySettings } from '../../domain/types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { repository } from '../../storage';

export function initials(name: string): string {
  const words = name.replace(/[«»"]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

/** Логотип компании или её инициалы на фирменном цвете */
export function CompanyAvatar({
  company,
  size = 32,
  publicToken,
}: {
  company: Pick<CompanySettings, 'name' | 'logoFileId' | 'brandColor'>;
  size?: number;
  publicToken?: string;
}) {
  const id = company.logoFileId;
  const { url } = useBlobUrl(id ? `${publicToken ?? 'app'}:${id}` : null, () =>
    publicToken ? repository.getPublicAsset(publicToken, id!) : repository.files.get(id!),
  );
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {url ? <img src={url} alt="" /> : <span className="avatar__initials">{initials(company.name)}</span>}
    </span>
  );
}
