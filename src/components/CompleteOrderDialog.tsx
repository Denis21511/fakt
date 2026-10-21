import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { actualCost, completeness, margin, plannedProfit } from '../lib/calc';
import { isValidISO, todayISO } from '../lib/dates';
import { money, pct } from '../lib/format';
import { useStore } from '../lib/store';
import type { Order } from '../lib/types';
import { Modal } from './Modal';
import { toast } from './Toast';
import { Delta, Field, cx } from './ui';

/** Завершение заказа: пользователь подтверждает, что все расходы внесены. */
export function CompleteOrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const completeOrder = useStore((s) => s.completeOrder);
  const [confirmed, setConfirmed] = useState(false);
  const [date, setDate] = useState(() => {
    const t = todayISO();
    return t < order.createdAt ? order.createdAt : t;
  });

  const c = completeness(order, categories);
  const cost = actualCost(order);
  const profit = order.price - cost;
  const pp = plannedProfit(order);
  const dateError = !isValidISO(date)
    ? 'Укажите корректную дату'
    : date < order.createdAt
      ? 'Дата завершения раньше даты создания заказа'
      : undefined;

  const submit = () => {
    if (!confirmed || dateError) return;
    completeOrder(order.id, date);
    toast('Заказ завершён, прибыль зафиксирована');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Завершить заказ"
      subtitle={order.title}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary" disabled={!confirmed || !!dateError} onClick={submit}>
            Завершить и зафиксировать прибыль
          </button>
        </>
      }
    >
      <div className="complete">
        <div className="complete__numbers">
          <div>
            <span>Цена продажи</span>
            <strong className="num">{money(order.price)}</strong>
          </div>
          <div>
            <span>Фактические расходы</span>
            <strong className="num">{money(cost)}</strong>
          </div>
          <div>
            <span>Фактическая прибыль</span>
            <strong className={cx('num', profit < 0 && 'text-neg')}>{money(profit)}</strong>
            <small>
              {pct(margin(profit, order.price))} · к плану <Delta value={profit - pp} size="sm" />
            </small>
          </div>
        </div>

        {c.total > 0 && c.missing.length > 0 ? (
          <div className="notice notice--warn">
            <AlertTriangle size={17} />
            <div>
              <strong>
                Расходы внесены по {c.covered} из {c.total} статей плана.
              </strong>{' '}
              Нет записей по статьям: {c.missing.join(', ')}. Если таких затрат не было — всё в порядке, иначе
              внесите их перед завершением.
            </div>
          </div>
        ) : (
          <div className="notice notice--ok">
            <CheckCircle2 size={17} />
            <div>Расходы внесены по всем статьям плана.</div>
          </div>
        )}

        <Field label="Дата завершения" htmlFor="c-date" error={dateError} className="complete__date">
          <input
            id="c-date"
            type="date"
            className="input"
            value={date}
            min={order.createdAt}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!dateError || undefined}
          />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-autofocus />
          <span className="checkbox__box" aria-hidden />
          <span>
            Подтверждаю, что все расходы по заказу внесены полностью. Прибыль будет зафиксирована как
            фактическая.
          </span>
        </label>
      </div>
    </Modal>
  );
}
