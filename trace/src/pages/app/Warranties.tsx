import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ProductImage } from '../../components/product/ProductImage';
import { EmptyState, WarrantyBadge } from '../../components/ui/Badges';
import { Segmented } from '../../components/ui/Field';
import type { Product } from '../../domain/types';
import { EXPIRING_WINDOW_DAYS, warrantyInfo, type WarrantyInfo, type WarrantyStatus } from '../../domain/warranty';
import { useDocumentTitle } from '../../hooks/misc';
import { cx } from '../../lib/cx';
import { formatDate, monthsLabel, parseISODate, todayISO } from '../../lib/dates';
import { useWorkspace } from '../../state/workspace';

type Filter = 'all' | 'active' | 'expiring' | 'expired' | 'none';

interface Row {
  product: Product;
  info: WarrantyInfo;
}

const ORDER: Record<WarrantyStatus, number> = { expiring: 0, active: 1, pending: 2, expired: 3, none: 4 };

export default function Warranties() {
  useDocumentTitle('Гарантии');
  const products = useWorkspace((s) => s.products);
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayISO();

  const rows: Row[] = useMemo(
    () =>
      products
        .map((product) => ({ product, info: warrantyInfo(product.warranty, today) }))
        .sort((a, b) => ORDER[a.info.status] - ORDER[b.info.status] || (a.info.endDate ?? '9').localeCompare(b.info.endDate ?? '9')),
    [products, today],
  );

  const count = (f: Filter) => rows.filter((r) => match(r, f)).length;
  const visible = rows.filter((r) => match(r, filter));

  // Шкала: от начала самой ранней гарантии до окончания самой поздней, по целым годам
  const range = useMemo(() => {
    const dated = rows.filter((r) => r.info.startDate && r.info.endDate);
    if (dated.length === 0) return null;
    const from = Math.min(...dated.map((r) => parseISODate(r.info.startDate!).getFullYear()), parseISODate(today).getFullYear());
    const to = Math.max(...dated.map((r) => parseISODate(r.info.endDate!).getFullYear()), parseISODate(today).getFullYear()) + 1;
    return { start: new Date(from, 0, 1).getTime(), end: new Date(to, 0, 1).getTime(), years: Array.from({ length: to - from }, (_, i) => from + i) };
  }, [rows, today]);

  const pos = (iso: string) => (range ? ((parseISODate(iso).getTime() - range.start) / (range.end - range.start)) * 100 : 0);
  const todayPos = pos(today);

  if (products.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-head__title">Гарантии</h1>
        </header>
        <div className="panel">
          <EmptyState
            icon={<ShieldCheck />}
            title="Гарантий пока нет"
            text="Срок гарантии указывается при создании изделия. Здесь будет видно, какие гарантии действуют и какие скоро закончатся."
            actions={
              <Link to="/app/products/new" className="btn btn--primary btn--lg">
                Добавить изделие
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Гарантии</h1>
          <p className="page-head__meta">
            <span>
              Статусы на сегодня, <span className="mono">{formatDate(today)}</span>. «Истекает» — меньше {EXPIRING_WINDOW_DAYS} дней до окончания.
            </span>
          </p>
        </div>
      </header>

      <div className="status-tabs">
        <Segmented
          label="Статус гарантии"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все', count: count('all') },
            { value: 'active', label: 'Действуют', count: count('active') },
            { value: 'expiring', label: 'Истекают', count: count('expiring') },
            { value: 'expired', label: 'Истекли', count: count('expired') },
            { value: 'none', label: 'Не оформлены', count: count('none') },
          ]}
        />
      </div>

      <section className="panel wt" aria-label="Сроки гарантий">
        {range && (
          <div className="wt-row wt-row--head" aria-hidden>
            <span>Изделие</span>
            <div className="wt-scale">
              {range.years.map((y) => (
                <span
                  key={y}
                  className="wt-year"
                  style={{ left: `${((new Date(y, 0, 1).getTime() - range.start) / (range.end - range.start)) * 100}%` }}
                >
                  {y}
                </span>
              ))}
              <span className="wt-today-label" style={{ left: `${todayPos}%` }}>
                Сегодня
              </span>
            </div>
            <span>Окончание</span>
          </div>
        )}
        {visible.length === 0 && <div className="wt-empty">Нет изделий с таким статусом гарантии.</div>}
        {visible.map(({ product: p, info }) => {
          const hasBar = range && info.startDate && info.endDate;
          const left = hasBar ? pos(info.startDate!) : 0;
          const right = hasBar ? pos(info.endDate!) : 0;
          const elapsed = hasBar ? Math.min(Math.max(todayPos, left), right) : 0;
          return (
            <Link key={p.id} to={`/app/products/${p.id}`} className={cx('wt-row', `wt-row--${info.status}`)}>
              <span className="wt-product">
                <ProductImage photo={p.photo} alt="" size="thumb" />
                <span className="wt-product__text">
                  <span className="wt-product__name">{p.name}</span>
                  <span className="wt-product__meta mono">
                    {p.serial}
                    {p.warranty.months ? ` · ${monthsLabel(p.warranty.months)}` : ''}
                  </span>
                </span>
              </span>
              <span className="wt-track">
                {range && <span className="wt-now" style={{ left: `${todayPos}%` }} aria-hidden />}
                {hasBar ? (
                  <span
                    className="wt-bar"
                    style={{ left: `${left}%`, width: `${Math.max(right - left, 0.6)}%` }}
                    role="img"
                    aria-label={`Гарантия с ${formatDate(info.startDate)} по ${formatDate(info.endDate)}`}
                  >
                    <span className="wt-bar__used" style={{ width: `${right > left ? ((elapsed - left) / (right - left)) * 100 : 0}%` }} />
                  </span>
                ) : (
                  <span className="wt-none">Срок не указан</span>
                )}
              </span>
              <span className="wt-end">
                <WarrantyBadge status={info.status} plain />
                <span className="wt-end__date mono">
                  {info.endDate
                    ? info.status === 'expired'
                      ? `${formatDate(info.endDate)}`
                      : `${formatDate(info.endDate)} · ${info.remaining?.replace(/^осталось /, '') ?? ''}`
                    : '—'}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
      <p className="wt-legend">
        <span className="wt-legend__item">
          <span className="wt-legend__sw wt-legend__sw--used" />
          Прошедший срок
        </span>
        <span className="wt-legend__item">
          <span className="wt-legend__sw wt-legend__sw--left" />
          Оставшийся срок
        </span>
        <span className="wt-legend__item">
          <span className="wt-legend__sw wt-legend__sw--now" />
          Сегодня
        </span>
      </p>
    </div>
  );
}

function match(r: Row, f: Filter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'active':
      return r.info.status === 'active' || r.info.status === 'pending';
    default:
      return r.info.status === f;
  }
}
