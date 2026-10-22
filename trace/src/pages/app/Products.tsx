import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, MoreHorizontal, PackagePlus, Plus, Rows3, Search, SearchX, X } from 'lucide-react';
import { ProductImage } from '../../components/product/ProductImage';
import { useProductActions } from '../../components/product/useProductActions';
import { EmptyState, PassportBadge, WarrantyBadge } from '../../components/ui/Badges';
import { Segmented } from '../../components/ui/Field';
import { Menu } from '../../components/ui/Menu';
import { CATEGORIES, CATEGORY_SHORT } from '../../domain/catalog';
import { productIssues } from '../../domain/passport';
import { matchesProduct } from '../../domain/search';
import type { Product } from '../../domain/types';
import { warrantyInfo } from '../../domain/warranty';
import { usePref, useDocumentTitle } from '../../hooks/misc';
import { formatDate, plural } from '../../lib/dates';
import { useWorkspace } from '../../state/workspace';

type StatusFilter = 'all' | 'published' | 'draft' | 'withdrawn' | 'unpublished' | 'attention';
type SortKey = 'created' | 'created-asc' | 'name' | 'manufactured';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'created', label: 'Сначала новые' },
  { id: 'created-asc', label: 'Сначала старые' },
  { id: 'manufactured', label: 'По дате изготовления' },
  { id: 'name', label: 'По названию' },
];

const STATUS_FILTERS: StatusFilter[] = ['all', 'published', 'draft', 'withdrawn', 'unpublished', 'attention'];

export default function Products() {
  useDocumentTitle('Изделия');
  const { products, documents, mode } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const actions = useProductActions();
  const [view, setView] = usePref<'table' | 'cards'>('productsView', 'table', ['table', 'cards']);

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const statusParam = params.get('status') as StatusFilter | null;
  const status: StatusFilter = statusParam && STATUS_FILTERS.includes(statusParam) ? statusParam : 'all';
  const sort = (params.get('sort') as SortKey) || 'created';

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && !(key === 'status' && value === 'all') && !(key === 'sort' && value === 'created')) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const needsAttention = useMemo(() => {
    const ids = new Set<string>();
    for (const p of products) {
      if (productIssues(p, documents).some((i) => i.kind !== 'no-photo' && i.kind !== 'no-warranty')) ids.add(p.id);
    }
    return ids;
  }, [products, documents]);

  const statusMatch = (p: Product, s: StatusFilter) => {
    switch (s) {
      case 'all':
        return true;
      case 'unpublished':
        return p.passport.status !== 'published';
      case 'attention':
        return needsAttention.has(p.id);
      default:
        return p.passport.status === s;
    }
  };

  const base = useMemo(() => products.filter((p) => (!category || p.category === category) && matchesProduct(p, q)), [products, category, q]);

  const filtered = useMemo(() => {
    const list = base.filter((p) => statusMatch(p, status));
    const by: Record<SortKey, (a: Product, b: Product) => number> = {
      created: (a, b) => b.createdAt.localeCompare(a.createdAt),
      'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
      manufactured: (a, b) => b.manufacturedAt.localeCompare(a.manufacturedAt),
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    };
    return list.sort(by[sort] ?? by.created);
  }, [base, status, sort, needsAttention]);

  const count = (s: StatusFilter) => base.filter((p) => statusMatch(p, s)).length;
  const hasFilters = Boolean(q || category || status !== 'all');

  if (products.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-head__title">Изделия</h1>
            <p className="page-head__meta">Каталог пуст</p>
          </div>
        </header>
        <div className="panel catalog-empty">
          <EmptyState
            icon={<PackagePlus />}
            title="Добавьте первое изделие"
            text="Укажите серийный номер, характеристики и гарантию — TRACE соберёт цифровой паспорт и выдаст QR-код для наклейки."
            actions={
              <>
                <Link to="/app/products/new" className="btn btn--primary btn--lg">
                  <Plus aria-hidden />
                  Добавить изделие
                </Link>
                {mode === 'own' && (
                  <Link to="/app/settings#data" className="btn btn--secondary btn--lg">
                    Вернуть демо-данные
                  </Link>
                )}
              </>
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
          <h1 className="page-head__title">Изделия</h1>
          <p className="page-head__meta">
            {hasFilters
              ? `Найдено ${filtered.length} из ${products.length}`
              : `${products.length} ${plural(products.length, ['запись', 'записи', 'записей'])} в каталоге`}
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/app/products/new" className="btn btn--primary">
            <Plus aria-hidden />
            Добавить изделие
          </Link>
        </div>
      </header>

      <div className="toolbar">
        <div className="input-affix toolbar__search">
          <Search aria-hidden />
          <input
            className="input"
            type="search"
            value={q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Название, артикул или серийный номер"
            aria-label="Поиск по каталогу"
          />
        </div>
        <select className="select toolbar__select" value={category} onChange={(e) => update('category', e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="select toolbar__select" value={sort} onChange={(e) => update('sort', e.target.value)} aria-label="Сортировка">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="toolbar__view">
          <Segmented
            label="Вид каталога"
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: <span className="visually-hidden">Таблица</span>, icon: <Rows3 aria-hidden />, title: 'Таблица' },
              { value: 'cards', label: <span className="visually-hidden">Карточки</span>, icon: <LayoutGrid aria-hidden />, title: 'Карточки' },
            ]}
          />
        </div>
      </div>

      <div className="status-tabs">
        <Segmented
          label="Статус паспорта"
          value={status}
          onChange={(v) => update('status', v)}
          options={[
            { value: 'all', label: 'Все', count: count('all') },
            { value: 'published', label: 'Опубликованы', count: count('published') },
            { value: 'draft', label: 'Черновики', count: count('draft') },
            { value: 'withdrawn', label: 'Сняты', count: count('withdrawn') },
            { value: 'unpublished', label: 'Без паспорта', count: count('unpublished') },
            { value: 'attention', label: 'Требуют внимания', count: count('attention') },
          ]}
        />
        {hasFilters && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({}, { replace: true })}>
            <X aria-hidden />
            Сбросить фильтры
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<SearchX />}
            title="Ничего не найдено"
            text={
              q
                ? `По запросу «${q}» с выбранными фильтрами изделий нет. Проверьте написание серийного номера или сбросьте фильтры.`
                : 'С выбранными фильтрами изделий нет.'
            }
            actions={
              <button type="button" className="btn btn--secondary" onClick={() => setParams({}, { replace: true })}>
                Сбросить фильтры
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className={view === 'table' ? 'panel catalog-table' : 'catalog-table catalog-table--hidden'}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Изделие</th>
                    <th>Артикул</th>
                    <th>Серийный номер</th>
                    <th>Изготовлено</th>
                    <th>Паспорт</th>
                    <th>Гарантия</th>
                    <th className="col-actions">
                      <span className="visually-hidden">Действия</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const w = warrantyInfo(p.warranty);
                    return (
                      <tr key={p.id} className="is-clickable" onClick={() => navigate(`/app/products/${p.id}`)}>
                        <td>
                          <div className="cell-product">
                            <ProductImage photo={p.photo} alt="" size="thumb" />
                            <div className="cell-product__text">
                              <Link to={`/app/products/${p.id}`} className="cell-product__name" onClick={(e) => e.stopPropagation()}>
                                {p.name}
                              </Link>
                              <span className="cell-product__sub">{CATEGORY_SHORT[p.category]}</span>
                            </div>
                          </div>
                        </td>
                        <td className="mono nowrap">{p.sku}</td>
                        <td className="mono nowrap">{p.serial}</td>
                        <td className="mono nowrap">{formatDate(p.manufacturedAt)}</td>
                        <td>
                          <PassportBadge status={p.passport.status} plain />
                        </td>
                        <td>
                          <div className="cell-warranty">
                            <WarrantyBadge status={w.status} plain />
                            {w.endDate && <span className="cell-warranty__date mono">до {formatDate(w.endDate)}</span>}
                          </div>
                        </td>
                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                          <Menu label={`Действия: ${p.name}`} trigger={<MoreHorizontal />} items={actions.menuItems(p)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ul className={view === 'cards' ? 'pcards' : 'pcards pcards--mobile-only'}>
            {filtered.map((p) => {
              const w = warrantyInfo(p.warranty);
              return (
                <li key={p.id} className="pcard">
                  <Link to={`/app/products/${p.id}`} className="pcard__media" tabIndex={-1} aria-hidden>
                    <ProductImage photo={p.photo} alt="" />
                  </Link>
                  <div className="pcard__body">
                    <div className="pcard__top">
                      <span className="pcard__cat">{CATEGORY_SHORT[p.category]}</span>
                      <Menu label={`Действия: ${p.name}`} trigger={<MoreHorizontal />} items={actions.menuItems(p)} />
                    </div>
                    <Link to={`/app/products/${p.id}`} className="pcard__name">
                      {p.name}
                    </Link>
                    <dl className="pcard__codes">
                      <dt>Арт.</dt>
                      <dd className="mono">{p.sku}</dd>
                      <dt>S/N</dt>
                      <dd className="mono">{p.serial}</dd>
                    </dl>
                    <div className="pcard__status">
                      <PassportBadge status={p.passport.status} plain />
                      <WarrantyBadge status={w.status} plain />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {actions.dialogs}
    </div>
  );
}
