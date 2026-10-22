import type { CSSProperties, ReactNode } from 'react';
import { Download, FileImage, FileText, Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { PublicDocument, PublicPassport } from '../../domain/passport';
import { WARRANTY_STATUS_LABEL } from '../../domain/warranty';
import { inkOn, isHexColor } from '../../lib/color';
import { cx } from '../../lib/cx';
import { formatDate, monthsLabel } from '../../lib/dates';
import { displayUrl, externalUrl, formatBytes, formatDimensions, telHref } from '../../lib/format';
import { groupToken } from '../../lib/id';
import { CornerMarks, LogoMark } from '../brand/Logo';
import { CompanyAvatar } from '../product/CompanyAvatar';
import { ProductImage } from '../product/ProductImage';

export interface PassportViewProps {
  passport: PublicPassport;
  /** Публичная страница: файлы запрашиваются через публичное API по токену */
  publicToken?: string;
  /** Предпросмотр в редакторе: несохранённое фото */
  photoOverride?: ReactNode;
  /** Предпросмотр настроек: несохранённый логотип */
  logoOverride?: string | null;
  onOpenDocument?: (doc: PublicDocument, mode: 'view' | 'download') => void;
  /** Рамка телефона в предпросмотре: без внешних отступов страницы */
  compact?: boolean;
}

function DocIcon({ mime }: { mime: string }) {
  return mime.startsWith('image/') ? <FileImage aria-hidden /> : <FileText aria-hidden />;
}

export function PassportView({ passport, publicToken, photoOverride, logoOverride, onOpenDocument, compact }: PassportViewProps) {
  const { product: p, warranty: w, company: c, documents } = passport;
  const brand = isHexColor(c.brandColor) ? c.brandColor : '#C8F169';
  const style = { '--brand': brand, '--brand-ink': inkOn(brand) } as CSSProperties;
  const dims = formatDimensions(p.dimensions);

  const specs: [string, ReactNode][] = [];
  if (p.model) specs.push(['Модель', p.model]);
  if (dims) specs.push(['Габариты', dims]);
  if (p.material) specs.push(['Материал', p.material]);
  if (p.color) specs.push(['Цвет и отделка', p.color]);
  for (const s of p.specs) specs.push([s.label, s.value]);
  specs.push(['Производитель', p.manufacturer]);

  const contacts = [
    c.phone && { icon: <Phone aria-hidden />, label: c.phone, href: telHref(c.phone) },
    c.email && { icon: <Mail aria-hidden />, label: c.email, href: `mailto:${c.email}` },
    c.website && { icon: <Globe aria-hidden />, label: displayUrl(c.website), href: externalUrl(c.website), external: true },
    c.address && { icon: <MapPin aria-hidden />, label: c.address },
  ].filter(Boolean) as { icon: ReactNode; label: string; href?: string; external?: boolean }[];

  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  return (
    <article className={cx('passport', compact && 'passport--compact')} style={style}>
      <header className="pp-top">
        <div className="pp-maker">
          {logoOverride ? (
            <span className="avatar" style={{ width: 34, height: 34 }} aria-hidden>
              <img src={logoOverride} alt="" />
            </span>
          ) : (
            <CompanyAvatar company={c} size={34} publicToken={publicToken} />
          )}
          <span className="pp-maker__name">{c.name || p.manufacturer}</span>
        </div>
        <span className="pp-trace" aria-label="TRACE">
          <LogoMark size={20} />
          <span aria-hidden>TRACE</span>
        </span>
      </header>

      <section className="pp-hero">
        <p className="pp-badge">Цифровой паспорт изделия</p>
        <h1 className="pp-name">{p.name}</h1>
        <p className="pp-cat">{p.categoryLabel}</p>
        <div className="pp-photo">
          {photoOverride ?? <ProductImage photo={p.photo} dims={p.dimensions} alt={p.name} size="lg" publicToken={publicToken} />}
          <CornerMarks inset={10} size={16} color="rgba(32,34,31,.5)" />
        </div>
        <dl className="pp-plate">
          <div className="pp-plate__cell pp-plate__cell--wide">
            <dt>Серийный номер</dt>
            <dd className="mono">{p.serial}</dd>
          </div>
          <div className="pp-plate__cell">
            <dt>Дата изготовления</dt>
            <dd className="mono">{formatDate(p.manufacturedAt)}</dd>
          </div>
          {p.sku && (
            <div className="pp-plate__cell">
              <dt>Артикул</dt>
              <dd className="mono">{p.sku}</dd>
            </div>
          )}
        </dl>
        {p.description && <p className="pp-desc">{p.description}</p>}
      </section>

      <section className={cx('pp-warranty', `pp-warranty--${w.status}`)} aria-label="Статус гарантии">
        <span className="pp-warranty__dot" aria-hidden />
        <div className="pp-warranty__text">
          <strong>{w.status === 'none' ? 'Гарантия не указана' : `Гарантия ${WARRANTY_STATUS_LABEL[w.status].toLowerCase()}`}</strong>
          <span>
            {w.status === 'none' && 'Уточните условия у производителя'}
            {w.endDate && w.status !== 'expired' && `до ${formatDate(w.endDate)}${w.remaining ? ` · ${w.remaining}` : ''}`}
            {w.status === 'expired' && `закончилась ${formatDate(w.endDate)}`}
          </span>
        </div>
      </section>

      {specs.length > 0 && (
        <section className="pp-section" aria-labelledby="pp-specs">
          <h2 className="pp-h" id="pp-specs">
            <span className="pp-h__num mono">{num()}</span>Характеристики
          </h2>
          <dl className="pp-kv">
            {specs.map(([k, v]) => (
              <div key={k} className="pp-kv__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {p.equipment.length > 0 && (
        <section className="pp-section" aria-labelledby="pp-equip">
          <h2 className="pp-h" id="pp-equip">
            <span className="pp-h__num mono">{num()}</span>Комплектация
          </h2>
          <ul className="pp-list">
            {p.equipment.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="pp-section" aria-labelledby="pp-docs">
        <h2 className="pp-h" id="pp-docs">
          <span className="pp-h__num mono">{num()}</span>Инструкции и документы
        </h2>
        {documents.length === 0 ? (
          <p className="pp-muted">Производитель пока не приложил документы к этому изделию.</p>
        ) : (
          <ul className="pp-docs">
            {documents.map((d) => (
              <li key={d.id} className="pp-doc">
                <button type="button" className="pp-doc__main" onClick={() => onOpenDocument?.(d, 'view')} disabled={!onOpenDocument}>
                  <span className="pp-doc__icon">
                    <DocIcon mime={d.mime} />
                  </span>
                  <span className="pp-doc__text">
                    <span className="pp-doc__title">{d.title}</span>
                    <span className="pp-doc__meta">
                      {d.typeLabel}
                      {d.size > 0 && ` · ${d.mime === 'application/pdf' ? 'PDF' : 'Изображение'}, ${formatBytes(d.size)}`}
                    </span>
                  </span>
                </button>
                {onOpenDocument && (
                  <button
                    type="button"
                    className="icon-btn pp-doc__dl"
                    onClick={() => onOpenDocument(d, 'download')}
                    aria-label={`Скачать: ${d.title}`}
                  >
                    <Download />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {w.status !== 'none' && (
        <section className="pp-section" aria-labelledby="pp-warranty">
          <h2 className="pp-h" id="pp-warranty">
            <span className="pp-h__num mono">{num()}</span>Гарантия изготовителя
          </h2>
          <dl className="pp-kv">
            {w.months && (
              <div className="pp-kv__row">
                <dt>Срок</dt>
                <dd>{monthsLabel(w.months)}</dd>
              </div>
            )}
            <div className="pp-kv__row">
              <dt>Начало</dt>
              <dd className="mono">{formatDate(w.startDate)}</dd>
            </div>
            <div className="pp-kv__row">
              <dt>Окончание</dt>
              <dd className="mono">{formatDate(w.endDate)}</dd>
            </div>
          </dl>
          {w.terms && <p className="pp-terms">{w.terms}</p>}
        </section>
      )}

      <section className="pp-section" aria-labelledby="pp-maker">
        <h2 className="pp-h" id="pp-maker">
          <span className="pp-h__num mono">{num()}</span>Производитель
        </h2>
        <p className="pp-maker-name">
          {c.name || p.manufacturer}
          {c.legalName && <span>{c.legalName}</span>}
        </p>
        {contacts.length > 0 && (
          <ul className="pp-contacts">
            {contacts.map((ct) => (
              <li key={ct.label}>
                {ct.href ? (
                  <a href={ct.href} {...(ct.external ? { target: '_blank', rel: 'noopener' } : {})}>
                    {ct.icon}
                    <span>{ct.label}</span>
                  </a>
                ) : (
                  <span className="pp-contacts__static">
                    {ct.icon}
                    <span>{ct.label}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {c.phone && (
          <a className="pp-call" href={telHref(c.phone)}>
            <Phone aria-hidden />
            Связаться по гарантии
          </a>
        )}
      </section>

      <footer className="pp-foot">
        <span className="pp-foot__brand">
          <LogoMark size={16} />
          TRACE
        </span>
        <span className="pp-foot__meta">
          Код паспорта <span className="mono">{groupToken(passport.token)}</span>
          {passport.publishedAt && (
            <>
              {' '}
              · опубликован <span className="mono">{formatDate(passport.publishedAt)}</span>
            </>
          )}
        </span>
      </footer>
    </article>
  );
}
