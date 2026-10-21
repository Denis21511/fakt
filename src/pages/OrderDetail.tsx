import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileText,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { CompleteOrderDialog } from '../components/CompleteOrderDialog';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { ConfirmDialog } from '../components/Modal';
import { Menu, type MenuItem } from '../components/Menu';
import { toast } from '../components/Toast';
import { AnimatedNumber, Delta, EmptyState, Meter, StatusBadge, cx } from '../components/ui';
import {
  actualCost,
  categoryLines,
  completeness,
  forecastCost,
  isFinal,
  isOverdue,
  margin,
  plannedCost,
  plannedMargin,
  plannedProfit,
  STATUS_LABEL,
  type CategoryLine,
} from '../lib/calc';
import { diffDays, formatDate, todayISO } from '../lib/dates';
import { money, orderNo, pct, plural, signedPoints } from '../lib/format';
import { useOrder, useStore } from '../lib/store';
import { useOrderForm } from '../lib/uiStore';
import type { Expense, Order, OrderStatus } from '../lib/types';
import { PRESET } from '../lib/presets';

type Confirm =
  | { kind: 'delete-order' }
  | { kind: 'delete-expense'; expense: Expense }
  | { kind: 'status'; status: Exclude<OrderStatus, 'completed'> };

export function OrderDetail() {
  const { id } = useParams();
  const order = useOrder(id);
  const navigate = useNavigate();
  const categories = useStore((s) => s.categories);
  const setStatus = useStore((s) => s.setStatus);
  const deleteOrder = useStore((s) => s.deleteOrder);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const openEdit = useOrderForm((s) => s.openEdit);

  const [expenseModal, setExpenseModal] = useState<{ expense?: Expense; categoryId?: string } | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  if (!order) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            icon={<FileText size={20} />}
            title="Заказ не найден"
            text="Возможно, он был удалён или ссылка устарела."
            action={
              <Link to="/orders" className="btn btn-secondary">
                К списку заказов
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const lines = categoryLines(order, categories);
  const today = todayISO();
  const overdue = isOverdue(order, today);

  const changeStatus = (status: Exclude<OrderStatus, 'completed'>) => {
    setStatus(order.id, status);
    toast(`Статус: ${STATUS_LABEL[status].toLowerCase()}`);
  };

  const primaryAction = (() => {
    switch (order.status) {
      case 'draft':
        return (
          <button type="button" className="btn btn-primary" onClick={() => changeStatus('in_progress')}>
            <Play size={15} /> Взять в работу
          </button>
        );
      case 'in_progress':
        return (
          <button type="button" className="btn btn-primary" onClick={() => setCompleteOpen(true)}>
            <CheckCircle2 size={16} /> Завершить заказ
          </button>
        );
      case 'completed':
        return (
          <button type="button" className="btn btn-secondary" onClick={() => setConfirm({ kind: 'status', status: 'in_progress' })}>
            <RotateCcw size={15} /> Вернуть в работу
          </button>
        );
      case 'cancelled':
        return (
          <button type="button" className="btn btn-secondary" onClick={() => changeStatus('in_progress')}>
            <RotateCcw size={15} /> Возобновить
          </button>
        );
    }
  })();

  const menuItems: (MenuItem | 'divider')[] = [];
  if (order.status !== 'draft')
    menuItems.push({ label: 'Перевести в черновик', icon: <CircleDashed size={15} />, onSelect: () => setConfirm({ kind: 'status', status: 'draft' }) });
  if (order.status === 'draft')
    menuItems.push({ label: 'Завершить заказ', icon: <CheckCircle2 size={15} />, onSelect: () => setCompleteOpen(true) });
  if (order.status !== 'cancelled')
    menuItems.push({ label: 'Отменить заказ', icon: <XCircle size={15} />, onSelect: () => setConfirm({ kind: 'status', status: 'cancelled' }) });
  menuItems.push('divider', { label: 'Удалить заказ', icon: <Trash2 size={15} />, danger: true, onSelect: () => setConfirm({ kind: 'delete-order' }) });

  return (
    <div className="page page--order">
      <Link to="/orders" className="back-link">
        <ArrowLeft size={15} /> Все заказы
      </Link>

      <header className="order-head">
        <div className="order-head__main">
          <div className="order-head__top">
            <span className="order-head__no">{orderNo(order.number)}</span>
            <StatusBadge status={order.status} />
          </div>
          <h1 className="page-title">{order.title}</h1>
          <div className="order-meta">
            <span>
              <User size={14} aria-hidden /> {order.client}
            </span>
            <span>
              <CalendarClock size={14} aria-hidden /> Создан {formatDate(order.createdAt)}
            </span>
            {order.status === 'completed' && order.completedAt ? (
              <span>
                <CalendarCheck size={14} aria-hidden /> Завершён {formatDate(order.completedAt)}
                <span className="text-faint"> · срок {formatDate(order.dueDate, { short: true })}</span>
              </span>
            ) : (
              <span className={cx(overdue && 'text-neg')}>
                <CalendarCheck size={14} aria-hidden /> Срок {formatDate(order.dueDate)}
                {overdue && ` · просрочен на ${diffDays(order.dueDate, today)} ${plural(diffDays(order.dueDate, today), 'день', 'дня', 'дней')}`}
              </span>
            )}
          </div>
          {order.description && <p className="order-desc">{order.description}</p>}
        </div>
        <div className="order-head__actions">
          {primaryAction}
          <button type="button" className="btn btn-secondary" onClick={() => openEdit(order.id)}>
            <Pencil size={15} /> Редактировать
          </button>
          <Menu label="Другие действия" trigger={<MoreHorizontal size={18} />} items={menuItems} triggerClassName="icon-btn icon-btn--bordered" />
        </div>
      </header>

      <PlanFact order={order} />

      <Completeness order={order} onComplete={() => setCompleteOpen(true)} />

      <section className="panel" aria-labelledby="exp-title">
        <div className="panel__head">
          <div>
            <h2 className="panel__title" id="exp-title">
              Расходы по заказу
            </h2>
            <p className="panel__sub">
              {order.expenses.length
                ? `${order.expenses.length} ${plural(order.expenses.length, 'запись', 'записи', 'записей')} на ${money(actualCost(order))}`
                : 'Вносите фактические затраты по мере закупок и работ'}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setExpenseModal({})}>
            <Plus size={15} /> Добавить расход
          </button>
        </div>
        {lines.length === 0 ? (
          <EmptyState
            compact
            title="Нет ни плана, ни расходов"
            text="Добавьте плановые расходы в заказ или внесите первый фактический расход."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(order.id)}>
                Добавить план
              </button>
            }
          />
        ) : (
          <div className="exp-groups">
            {lines.map((l) => (
              <ExpenseGroup
                key={l.categoryId}
                line={l}
                final={isFinal(order)}
                expenses={order.expenses
                  .filter((e) => e.categoryId === l.categoryId)
                  .sort((a, b) => a.date.localeCompare(b.date))}
                onAdd={() => setExpenseModal({ categoryId: l.categoryId })}
                onEdit={(expense) => setExpenseModal({ expense })}
                onDelete={(expense) => setConfirm({ kind: 'delete-expense', expense })}
              />
            ))}
          </div>
        )}
      </section>

      <Deviations key={order.id} order={order} lines={lines} />

      {expenseModal && (
        <ExpenseFormModal
          order={order}
          expense={expenseModal.expense}
          defaultCategoryId={expenseModal.categoryId}
          onClose={() => setExpenseModal(null)}
        />
      )}
      {completeOpen && <CompleteOrderDialog order={order} onClose={() => setCompleteOpen(false)} />}

      <ConfirmDialog
        open={confirm?.kind === 'delete-order'}
        title="Удалить заказ?"
        text={
          <>
            Заказ <b>{orderNo(order.number)} «{order.title}»</b> и все его расходы ({order.expenses.length}) будут удалены без
            возможности восстановления.
          </>
        }
        confirmLabel="Удалить заказ"
        onConfirm={() => {
          deleteOrder(order.id);
          toast(`Заказ ${orderNo(order.number)} удалён`);
          navigate('/orders');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'delete-expense'}
        title="Удалить расход?"
        text={
          confirm?.kind === 'delete-expense' && (
            <>
              Расход <b>«{confirm.expense.name}»</b> на <b className="num">{money(confirm.expense.amount)}</b> от{' '}
              {formatDate(confirm.expense.date)} будет удалён. Показатели заказа пересчитаются.
            </>
          )
        }
        confirmLabel="Удалить расход"
        onConfirm={() => {
          if (confirm?.kind !== 'delete-expense') return;
          deleteExpense(order.id, confirm.expense.id);
          toast('Расход удалён');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'status'}
        tone={confirm?.kind === 'status' && confirm.status === 'cancelled' ? 'danger' : 'primary'}
        title={
          confirm?.kind === 'status'
            ? confirm.status === 'cancelled'
              ? 'Отменить заказ?'
              : confirm.status === 'draft'
                ? 'Перевести в черновик?'
                : 'Вернуть заказ в работу?'
            : ''
        }
        text={
          confirm?.kind === 'status' &&
          (confirm.status === 'cancelled'
            ? 'Отменённый заказ не учитывается в выручке и прибыли. Внесённые расходы сохранятся, заказ можно будет возобновить.'
            : order.status === 'completed'
              ? 'Фактическая прибыль снова станет расчётной, пока вы повторно не завершите заказ и не подтвердите расходы.'
              : 'Черновик не учитывается в выручке и плановой прибыли до тех пор, пока заказ не взят в работу.')
        }
        confirmLabel={
          confirm?.kind === 'status'
            ? confirm.status === 'cancelled'
              ? 'Отменить заказ'
              : confirm.status === 'draft'
                ? 'В черновик'
                : 'Вернуть в работу'
            : 'OK'
        }
        onConfirm={() => confirm?.kind === 'status' && changeStatus(confirm.status)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

/* ---------- План и факт ---------- */

function PfRow({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={cx('pf-row', strong && 'pf-row--strong')}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PlanFact({ order }: { order: Order }) {
  const pc = plannedCost(order);
  const pp = plannedProfit(order);
  const pm = plannedMargin(order);
  const final = isFinal(order);
  const spent = actualCost(order);
  const cost = final ? spent : order.status === 'in_progress' ? forecastCost(order) : spent;
  const profit = order.price - cost;
  const m = margin(profit, order.price);
  const showFact = final || order.status === 'in_progress';

  const factTitle = final ? 'Факт' : order.status === 'in_progress' ? 'Расчёт на сегодня' : 'Факт';
  const factBadge = final ? (
    <span className="chip chip--accent">Зафиксировано {order.completedAt ? formatDate(order.completedAt, { short: true }) : ''}</span>
  ) : order.status === 'in_progress' ? (
    <span className="chip chip--lime">Предварительно</span>
  ) : (
    <span className="chip">{order.status === 'draft' ? 'Заказ не в работе' : 'Заказ отменён'}</span>
  );

  return (
    <section className="pf" aria-label="План и факт">
      <div className="pf-block">
        <div className="pf-block__head">
          <h2 className="pf-block__title">План</h2>
          <span className="chip">Расчёт при создании</span>
        </div>
        <dl className="pf-list">
          <PfRow label="Цена продажи">
            <span className="num">{money(order.price)}</span>
          </PfRow>
          <PfRow label="Себестоимость">
            <span className="num">{money(pc)}</span>
          </PfRow>
          <PfRow label="Прибыль" strong>
            <span className={cx('num', pp < 0 && 'text-neg')}>{money(pp)}</span>
          </PfRow>
          <PfRow label="Рентабельность">
            <span className="num">{pct(pm)}</span>
          </PfRow>
        </dl>
      </div>

      <div className={cx('pf-block pf-block--fact', !showFact && 'pf-block--muted')}>
        <div className="pf-block__head">
          <h2 className="pf-block__title">{factTitle}</h2>
          {factBadge}
        </div>
        {showFact ? (
          <dl className="pf-list">
            <PfRow label="Цена продажи">
              <span className="num">{money(order.price)}</span>
            </PfRow>
            <PfRow label={final ? 'Себестоимость' : 'Себестоимость (оценка)'}>
              <span className="num">
                <AnimatedNumber value={cost} format={money} />
              </span>
              <Delta value={cost - pc} invert size="sm" />
            </PfRow>
            <PfRow label={final ? 'Прибыль' : 'Расчётная прибыль'} strong>
              <span className={cx('num', profit < 0 && 'text-neg')}>
                <AnimatedNumber value={profit} format={money} />
              </span>
              <Delta value={profit - pp} size="sm" />
            </PfRow>
            <PfRow label="Рентабельность">
              <span className="num">{pct(m)}</span>
              <span
                className={cx(
                  'delta delta--sm',
                  m !== null && pm !== null && m - pm < -0.05 && 'delta--neg',
                  m !== null && pm !== null && m - pm > 0.05 && 'delta--pos',
                )}
              >
                {m !== null && pm !== null ? signedPoints(m - pm) : '—'}
              </span>
            </PfRow>
          </dl>
        ) : (
          <div className="pf-placeholder">
            <p>
              {order.status === 'draft'
                ? 'Фактические показатели появятся, когда заказ будет взят в работу.'
                : 'Отменённый заказ не учитывается в прибыли.'}
            </p>
            {spent > 0 && (
              <p>
                Внесено расходов: <b className="num">{money(spent)}</b>
              </p>
            )}
          </div>
        )}
        {order.status === 'in_progress' && (
          <p className="pf-note">
            Внесено фактических расходов: <b className="num">{money(spent)}</b>. По статьям, где факт пока меньше плана, в оценке
            учтён план — так перерасход виден сразу, а экономия фиксируется после завершения.
          </p>
        )}
      </div>

      <CostBar order={order} cost={cost} />
    </section>
  );
}

/** Наглядная шкала: сколько денег из цены «съела» себестоимость, и где проходит план. */
function CostBar({ order, cost }: { order: Order; cost: number }) {
  const planned = plannedCost(order);
  const spent = actualCost(order);
  const forecast = order.status === 'in_progress' ? cost : spent;
  const scale = Math.max(order.price, spent, forecast, planned, 1);
  const p = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const okPart = Math.min(spent, planned);
  const overPart = Math.max(0, spent - planned);
  const pending = Math.max(0, forecast - spent);
  const pendingOk = Math.max(0, Math.min(forecast, planned) - spent);
  const pendingOver = pending - pendingOk;
  const totalOver = overPart + pendingOver;

  return (
    <div className="costbar" aria-label="Себестоимость относительно цены">
      <div className="costbar__track">
        <div className="costbar__seg costbar__seg--spent" style={{ width: p(okPart) }} />
        {overPart > 0 && <div className="costbar__seg costbar__seg--over" style={{ width: p(overPart) }} />}
        {pendingOk > 0 && <div className="costbar__seg costbar__seg--pending" style={{ width: p(pendingOk) }} />}
        {pendingOver > 0 && <div className="costbar__seg costbar__seg--pending-over" style={{ width: p(pendingOver) }} />}
        {planned > 0 && (
          <div className="costbar__marker" style={{ left: p(planned) }}>
            <span>план</span>
          </div>
        )}
        <div className="costbar__price" style={{ left: p(order.price) }} />
      </div>
      <div className="costbar__legend">
        <span>
          <i className="dot dot--spent" /> Внесено {money(spent)}
        </span>
        {totalOver > 0 && (
          <span className="text-neg">
            <i className="dot dot--over" /> Сверх плана {money(totalOver)}
          </span>
        )}
        {pending > 0 && (
          <span>
            <i className="dot dot--pending" /> Ожидается ещё {money(pending)}
          </span>
        )}
        <span className="costbar__legend-right">
          Прибыль — остаток до цены <b className="num">{money(order.price)}</b>
        </span>
      </div>
    </div>
  );
}

/* ---------- Полнота данных ---------- */

function Completeness({ order, onComplete }: { order: Order; onComplete: () => void }) {
  const categories = useStore((s) => s.categories);
  const c = completeness(order, categories);
  if (order.status === 'cancelled') return null;

  if (c.confirmed) {
    return (
      <div className="completeness completeness--ok">
        <CheckCircle2 size={18} />
        <div>
          <strong>Данные полные.</strong> Заказ завершён {order.completedAt ? formatDate(order.completedAt) : ''}, расходы
          подтверждены — прибыль фактическая.
        </div>
      </div>
    );
  }

  return (
    <div className="completeness">
      <div className="completeness__info">
        <div className="completeness__title">
          Полнота данных
          <span className="completeness__ratio num">
            {c.covered} из {c.total} {plural(c.total, 'статьи', 'статей', 'статей')}
          </span>
        </div>
        <div className="completeness__segments" aria-hidden>
          {Array.from({ length: Math.max(c.total, 1) }, (_, i) => (
            <span key={i} className={cx(i < c.covered && 'is-on')} />
          ))}
        </div>
        <p className="completeness__text">
          {c.total === 0
            ? 'В заказе нет плановых расходов — сравнивать не с чем.'
            : c.missing.length
              ? `Нет фактических расходов по статьям: ${c.missing.join(', ').toLowerCase()}.`
              : 'Расходы внесены по всем статьям плана. Если затрат больше не будет — завершите заказ.'}
          {' '}Прибыль считается {order.status === 'draft' ? 'плановой' : 'предварительной'} до завершения заказа.
        </p>
      </div>
      {order.status === 'in_progress' && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onComplete}>
          <CheckCircle2 size={15} /> Завершить заказ
        </button>
      )}
    </div>
  );
}

/* ---------- Расходы по категориям ---------- */

function ExpenseGroup({
  line,
  expenses,
  final,
  onAdd,
  onEdit,
  onDelete,
}: {
  line: CategoryLine;
  final: boolean;
  expenses: Expense[];
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const ratio = line.planned > 0 ? line.actual / line.planned : line.actual > 0 ? 1 : 0;
  const over = line.deviation > 0 && line.actual > 0;
  return (
    <div className="exp-group">
      <div className="exp-group__head">
        <div className="exp-group__name">
          {line.name}
          {!line.hasPlan && <span className="chip chip--neg">вне плана</span>}
        </div>
        <div className="exp-group__nums">
          <span className="num">
            <b>{money(line.actual)}</b>
            <span className="text-muted"> из {money(line.planned)}</span>
          </span>
          {line.hasActual && (final || line.deviation > 0) && <Delta value={line.deviation} invert size="sm" />}
        </div>
        <button type="button" className="icon-btn icon-btn--subtle" aria-label={`Добавить расход: ${line.name}`} onClick={onAdd}>
          <Plus size={16} />
        </button>
      </div>
      <Meter value={ratio} tone={over ? 'neg' : 'accent'} label={`${line.name}: израсходовано от плана`} />
      {expenses.length ? (
        <ul className="exp-list">
          {expenses.map((e) => (
            <li key={e.id} className="exp-item">
              <span className="exp-item__date">{formatDate(e.date, { short: true })}</span>
              <span className="exp-item__body">
                <span className="exp-item__name">{e.name}</span>
                {e.comment && <span className="exp-item__comment">{e.comment}</span>}
              </span>
              <span className="exp-item__amount num">{money(e.amount)}</span>
              <span className="exp-item__actions">
                <button type="button" className="icon-btn icon-btn--subtle" aria-label={`Изменить расход «${e.name}»`} onClick={() => onEdit(e)}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--subtle icon-btn--danger" aria-label={`Удалить расход «${e.name}»`} onClick={() => onDelete(e)}>
                  <Trash2 size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <button type="button" className="exp-empty" onClick={onAdd}>
          Расходов пока нет — <span>внести</span>
        </button>
      )}
    </div>
  );
}

/* ---------- Отклонения от плана ---------- */

function Deviations({ order, lines }: { order: Order; lines: CategoryLine[] }) {
  const setNote = useStore((s) => s.setDeviationNote);
  const [note, setNoteDraft] = useState(order.deviationNote);
  const dirty = note.trim() !== order.deviationNote;
  const withData = lines.filter((l) => l.hasActual || l.hasPlan);
  const maxAbs = Math.max(1, ...withData.map((l) => Math.abs(l.deviation)));
  const totalPlan = plannedCost(order);
  const totalActual = actualCost(order);
  const final = isFinal(order);
  const overrunSoFar = withData.reduce((a, l) => a + Math.max(0, l.deviation), 0);

  return (
    <section className="panel" aria-labelledby="dev-title">
      <div className="panel__head">
        <div>
          <h2 className="panel__title" id="dev-title">
            Отклонения от плана
          </h2>
          <p className="panel__sub">
            {final ? 'Итоговая разница по статьям расходов' : 'Разница между внесёнными расходами и планом на текущий момент'}
          </p>
        </div>
      </div>
      {withData.length === 0 ? (
        <EmptyState compact title="Нет данных для сравнения" text="Добавьте плановые расходы и внесите фактические." />
      ) : (
        <div className="table-wrap">
          <table className="table table--dev">
            <thead>
              <tr>
                <th>Статья</th>
                <th className="ta-r">План</th>
                <th className="ta-r">Факт</th>
                <th className="ta-r">Отклонение</th>
                <th className="dev-bar-col">
                  <span className="dev-axis">
                    <span>{final ? 'экономия' : 'остаток плана'}</span>
                    <span>перерасход</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {withData.map((l) => {
                const noData = !l.hasActual;
                const pctDev = l.planned > 0 ? (l.deviation / l.planned) * 100 : null;
                return (
                  <tr key={l.categoryId}>
                    <td>
                      {l.name}
                      {noData && <span className="dev-nodata">нет расходов</span>}
                    </td>
                    <td className="ta-r num text-muted">{money(l.planned)}</td>
                    <td className="ta-r num">{l.hasActual ? money(l.actual) : '—'}</td>
                    <td className="ta-r">
                      {noData ? (
                        <span className="text-faint">—</span>
                      ) : !final && l.deviation < 0 ? (
                        <span className="dev-cell">
                          <span className="delta delta--sm" title="Заказ в работе: расходы по статье ещё могут быть">
                            осталось {money(-l.deviation)}
                          </span>
                        </span>
                      ) : (
                        <span className="dev-cell">
                          <Delta value={l.deviation} invert size="sm" />
                          {pctDev !== null && l.deviation !== 0 && (
                            <span className="text-faint num">
                              {pctDev > 0 ? '+' : ''}
                              {pct(pctDev)}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="dev-bar-col">
                      {!noData && (
                        <div className="dev-bar">
                          <span className="dev-bar__axis" />
                          {l.deviation !== 0 && (
                            <span
                              className={cx('dev-bar__fill', l.deviation > 0 ? 'is-over' : final ? 'is-save' : 'is-left')}
                              style={{ width: `${(Math.abs(l.deviation) / maxAbs) * 50}%` }}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Итого</td>
                <td className="ta-r num">{money(totalPlan)}</td>
                <td className="ta-r num">{money(totalActual)}</td>
                <td className="ta-r">
                  {final ? (
                    <Delta value={totalActual - totalPlan} invert size="sm" />
                  ) : overrunSoFar > 0 ? (
                    <Delta value={overrunSoFar} invert size="sm" />
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="dev-bar-col text-faint dev-foot-note">
                  {final ? 'итог заказа' : overrunSoFar > 0 ? 'перерасход на текущий момент' : 'перерасхода пока нет'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="reason">
        <label htmlFor="dev-note" className="field__label">
          Причина отклонения
        </label>
        <div className="reason__row">
          <textarea
            id="dev-note"
            className="input textarea"
            rows={2}
            placeholder={PRESET.copy.deviationPlaceholder}
            value={note}
            maxLength={400}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          {dirty && (
            <div className="reason__actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNoteDraft(order.deviationNote)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setNote(order.id, note.trim());
                  toast('Причина отклонения сохранена');
                }}
              >
                Сохранить
              </button>
            </div>
          )}
        </div>
        <p className="field__hint">Показывается в блоке «Требует внимания» на обзоре.</p>
      </div>
    </section>
  );
}
