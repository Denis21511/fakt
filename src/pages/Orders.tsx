import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, MoreHorizontal, Pencil, Search, SearchX, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/Modal';
import { Menu } from '../components/Menu';
import { ProfitCell } from '../components/OrderBits';
import { NewOrderButton, PageHeader, PeriodSelect } from '../components/PageHeader';
import { toast } from '../components/Toast';
import { EmptyState, Segmented, StatusBadge, cx } from '../components/ui';
import { actualCost, isCommitted, plannedCost, plannedProfit, profitView, STATUS_LABEL, STATUS_ORDER } from '../lib/calc';
import { formatDate, inPeriod } from '../lib/dates';
import { money, orderNo, ordersWord } from '../lib/format';
import { useStore } from '../lib/store';
import { useOrderForm } from '../lib/uiStore';
import type { Order, OrderStatus, PeriodKey } from '../lib/types';

type SortKey = 'title' | 'client' | 'createdAt' | 'price' | 'plannedCost' | 'plannedProfit' | 'actualCost' | 'profit' | 'status';
type StatusFilter = 'all' | OrderStatus;

const STATUS_RANK: Record<OrderStatus, number> = { in_progress: 0, draft: 1, completed: 2, cancelled: 3 };

const sorters: Record<SortKey, (o: Order) => number | string> = {
  title: (o) => o.title.toLowerCase(),
  client: (o) => o.client.toLowerCase(),
  createdAt: (o) => o.createdAt + String(o.number).padStart(8, '0'),
  price: (o) => o.price,
  plannedCost: plannedCost,
  plannedProfit: plannedProfit,
  actualCost: (o) => (o.expenses.length ? actualCost(o) : -Infinity),
  profit: (o) => {
    const v = profitView(o);
    return (v.kind === 'final' || v.kind === 'forecast') && v.profit !== null ? v.profit : -Infinity;
  },
  status: (o) => STATUS_RANK[o.status],
};

export function Orders() {
  const orders = useStore((s) => s.orders);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const openEdit = useOrderForm((s) => s.openEdit);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const statusParam = params.get('status');
  const status: StatusFilter = STATUS_ORDER.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : 'all';
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [toDelete, setToDelete] = useState<Order | null>(null);

  const setStatus = (s: StatusFilter) => {
    const next = new URLSearchParams(params);
    if (s === 'all') next.delete('status');
    else next.set('status', s);
    setParams(next, { replace: true });
  };

  const byPeriodAndQuery = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^№\s*/, '');
    return orders.filter(
      (o) =>
        inPeriod(o.createdAt, period) &&
        (!q ||
          o.title.toLowerCase().includes(q) ||
          o.client.toLowerCase().includes(q) ||
          String(o.number).includes(q) ||
          o.description.toLowerCase().includes(q)),
    );
  }, [orders, query, period]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: byPeriodAndQuery.length, draft: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const o of byPeriodAndQuery) c[o.status]++;
    return c;
  }, [byPeriodAndQuery]);

  const rows = useMemo(() => {
    const list = status === 'all' ? byPeriodAndQuery : byPeriodAndQuery.filter((o) => o.status === status);
    const get = sorters[sort.key];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x < y) return -1 * dir;
      if (x > y) return 1 * dir;
      return b.number - a.number;
    });
  }, [byPeriodAndQuery, status, sort]);

  const committed = rows.filter(isCommitted);
  const inProgressTotal = orders.filter((o) => o.status === 'in_progress').length;
  const sumPrice = committed.reduce((a, o) => a + o.price, 0);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'title' || key === 'client' || key === 'status' ? 'asc' : 'desc' },
    );

  // Обычная функция, а не компонент: иначе заголовки пересоздаются при каждом
  // рендере и кнопка сортировки теряет фокус клавиатуры.
  const th = (k: SortKey, children: string, right?: boolean) => {
    const active = sort.key === k;
    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th key={k} className={cx(right && 'ta-r')} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={cx('th-sort', active && 'is-active')} onClick={() => toggleSort(k)}>
          {children}
          <Icon size={13} aria-hidden />
        </button>
      </th>
    );
  };

  const hasFilters = query || status !== 'all' || period !== 'all';

  return (
    <div className="page">
      <PageHeader
        title="Все заказы"
        subtitle={
          orders.length
            ? `${orders.length} ${ordersWord(orders.length)} в базе · ${inProgressTotal} в работе`
            : 'Здесь будут все заказы предприятия'
        }
        actions={<NewOrderButton />}
      />

      {orders.length > 0 && (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={16} className="search__icon" aria-hidden />
              <input
                className="input search__input"
                type="search"
                placeholder="Поиск по названию, клиенту или номеру"
                aria-label="Поиск заказов"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="search__clear" aria-label="Очистить поиск" onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <PeriodSelect value={period} onChange={setPeriod} />
          </div>
          <div className="toolbar toolbar--secondary">
            <div className="scroll-x">
              <Segmented
                label="Фильтр по статусу"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'Все', count: counts.all },
                  ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s], count: counts[s] })),
                ]}
              />
            </div>
            {rows.length > 0 && (
              <div className="toolbar__summary">
                Показано {rows.length} · сумма заказов <b className="num">{money(sumPrice)}</b>
                <span className="text-faint"> без черновиков и отменённых</span>
              </div>
            )}
          </div>
        </>
      )}

      <section className="panel panel--flush">
        {rows.length === 0 ? (
          orders.length === 0 ? (
            <EmptyState
              title="Заказов пока нет"
              text="Создайте первый заказ — укажите цену и плановые расходы."
              action={<NewOrderButton />}
            />
          ) : (
            <EmptyState
              icon={<SearchX size={20} />}
              title="Ничего не найдено"
              text="Попробуйте изменить запрос или сбросить фильтры."
              action={
                hasFilters ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setQuery('');
                      setPeriod('all');
                      setStatus('all');
                    }}
                  >
                    Сбросить фильтры
                  </button>
                ) : undefined
              }
            />
          )
        ) : (
          <div className="table-wrap">
            <table className="table table--cards table--orders">
              <thead>
                <tr>
                  {th('title', 'Заказ')}
                  {th('client', 'Клиент')}
                  {th('createdAt', 'Дата')}
                  {th('price', 'Цена', true)}
                  {th('plannedCost', 'План. затраты', true)}
                  {th('plannedProfit', 'План. прибыль', true)}
                  {th('actualCost', 'Факт. затраты', true)}
                  {th('profit', 'Факт. прибыль', true)}
                  {th('status', 'Статус')}
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const pp = plannedProfit(o);
                  return (
                    <tr key={o.id} className="is-clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                      <td className="cell-main">
                        <Link to={`/orders/${o.id}`} className="order-link" onClick={(e) => e.stopPropagation()}>
                          <span className="order-link__title">{o.title}</span>
                          <span className="order-link__no">
                            {orderNo(o.number)}
                            <span className="order-link__client"> · {o.client}</span>
                          </span>
                        </Link>
                      </td>
                      <td data-label="Клиент" className="cell-client">
                        {o.client}
                      </td>
                      <td data-label="Дата" className="nowrap text-muted">
                        {formatDate(o.createdAt, { short: true })}
                      </td>
                      <td data-label="Цена" className="ta-r num">
                        {money(o.price)}
                      </td>
                      <td data-label="План. затраты" className="ta-r num text-muted">
                        {money(plannedCost(o))}
                      </td>
                      <td data-label="План. прибыль" className={cx('ta-r num', pp < 0 && 'text-neg')}>
                        {money(pp)}
                      </td>
                      <td data-label="Факт. затраты" className="ta-r num">
                        {o.expenses.length ? (
                          <span className={cx(actualCost(o) > plannedCost(o) && 'text-neg')}>{money(actualCost(o))}</span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td data-label="Факт. прибыль" className="ta-r">
                        <ProfitCell order={o} />
                      </td>
                      <td data-label="Статус" className="cell-status">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="cell-actions">
                        <Menu
                          label={`Действия с заказом ${orderNo(o.number)}`}
                          trigger={<MoreHorizontal size={17} />}
                          items={[
                            { label: 'Открыть', icon: <ExternalLink size={15} />, onSelect: () => navigate(`/orders/${o.id}`) },
                            { label: 'Редактировать', icon: <Pencil size={15} />, onSelect: () => openEdit(o.id) },
                            'divider',
                            { label: 'Удалить', icon: <Trash2 size={15} />, danger: true, onSelect: () => setToDelete(o) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title="Удалить заказ?"
        text={
          toDelete && (
            <>
              Заказ <b>{orderNo(toDelete.number)} «{toDelete.title}»</b> будет удалён вместе со всеми расходами (
              {toDelete.expenses.length}). Это действие нельзя отменить.
            </>
          )
        }
        confirmLabel="Удалить заказ"
        onConfirm={() => {
          if (!toDelete) return;
          deleteOrder(toDelete.id);
          toast(`Заказ ${orderNo(toDelete.number)} удалён`);
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
