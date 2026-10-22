import { ImageOff } from 'lucide-react';
import type { Dimensions, ProductPhoto } from '../../domain/types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { cx } from '../../lib/cx';
import { repository } from '../../storage';
import { ProductDrawing } from './ProductDrawing';

export function ProductImage({
  photo,
  dims,
  alt,
  size = 'md',
  publicToken,
  className,
}: {
  photo: ProductPhoto | null;
  dims?: Dimensions | null;
  alt: string;
  size?: 'thumb' | 'md' | 'lg';
  /** На публичной странице файл запрашивается через публичное API паспорта */
  publicToken?: string;
  className?: string;
}) {
  const fileId = photo?.kind === 'file' ? photo.fileId : null;
  const { url, status } = useBlobUrl(fileId ? `${publicToken ?? 'app'}:${fileId}` : null, () =>
    publicToken ? repository.getPublicAsset(publicToken, fileId!) : repository.files.get(fileId!),
  );

  return (
    <div className={cx('pimg', `pimg--${size}`, className)}>
      {photo?.kind === 'drawing' && <ProductDrawing variant={photo.variant} dims={size === 'thumb' ? null : dims} className="pimg__drawing" />}
      {photo?.kind === 'file' && url && <img src={url} alt={alt} className="pimg__photo" />}
      {photo?.kind === 'file' && status === 'loading' && <span className="pimg__loading" aria-hidden />}
      {(!photo || (photo.kind === 'file' && status === 'missing')) && (
        <div className="pimg__empty">
          <ImageOff aria-hidden />
          {size !== 'thumb' && <span>{photo ? 'Файл фотографии не найден' : 'Нет фотографии'}</span>}
        </div>
      )}
    </div>
  );
}
