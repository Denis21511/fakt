import { profitView, type ProfitView } from '../lib/calc';
import { money } from '../lib/format';
import type { Order } from '../lib/types';
import { cx } from './ui';

const KIND_LABEL: Record<ProfitView['kind'], string> = {
  final: 'факт',
  forecast: 'расчёт',
  plan: 'план',
  none: '',
};

/** Ячейка «Фактическая / расчётная прибыль» с честной пометкой природы числа. */
export function ProfitCell({ order, showKind = true }: { order: Order; showKind?: boolean }) {
  const v = profitView(order);
  if (v.kind === 'none' || v.kind === 'plan' || v.profit === null) return <span className="text-faint">—</span>;
  return (
    <span className={cx('profit-cell', v.kind === 'forecast' && 'profit-cell--forecast')}>
      <span className={cx('num', v.profit < 0 && 'text-neg')}>{money(v.profit)}</span>
      {showKind && v.kind === 'forecast' && (
        <span className="kind-tag" title="Предварительная оценка: заказ ещё в работе">
          {KIND_LABEL[v.kind]}
        </span>
      )}
    </span>
  );
}
