import type { Category, Kopecks, Order, OrderStatus } from './types';

/*
 * Финансовая модель заказа.
 *
 *  Плановая себестоимость  = Σ плановых расходов
 *  Плановая прибыль        = цена − плановая себестоимость
 *  Плановая рентабельность = плановая прибыль / цена × 100 %
 *
 *  Фактическая прибыль (финальная) = цена − Σ фактических расходов.
 *    Считается только для завершённого заказа с подтверждённой полнотой расходов.
 *
 *  Расчётная прибыль (заказ в работе) = цена − Σ по статьям max(план, факт).
 *    Консервативный прогноз: уже случившийся перерасход учитывается сразу,
 *    а по статьям, где факт пока меньше плана, ожидаем расходы по плану.
 */

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Черновик',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const STATUS_ORDER: OrderStatus[] = ['draft', 'in_progress', 'completed', 'cancelled'];

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function plannedCost(o: Order): Kopecks {
  return sum(o.plannedCosts.map((c) => c.amount));
}

export function actualCost(o: Order): Kopecks {
  return sum(o.expenses.map((e) => e.amount));
}

export function plannedProfit(o: Order): Kopecks {
  return o.price - plannedCost(o);
}

export function margin(profit: Kopecks, price: Kopecks): number | null {
  if (price <= 0) return null;
  return (profit / price) * 100;
}

export function plannedMargin(o: Order): number | null {
  return margin(plannedProfit(o), o.price);
}

/** Заказ завершён и пользователь подтвердил полноту расходов. */
export function isFinal(o: Order): boolean {
  return o.status === 'completed' && o.expensesConfirmed;
}

/** Учитывается ли заказ в выручке и плане (черновики и отменённые — нет). */
export function isCommitted(o: Order): boolean {
  return o.status === 'in_progress' || o.status === 'completed';
}

export interface CategoryLine {
  categoryId: string;
  name: string;
  planned: Kopecks;
  actual: Kopecks;
  /** факт − план; > 0 — перерасход, < 0 — экономия */
  deviation: Kopecks;
  hasPlan: boolean;
  hasActual: boolean;
  expenseCount: number;
}

export function categoryLines(o: Order, categories: Category[]): CategoryLine[] {
  const map = new Map<string, CategoryLine>();
  const nameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Без категории';
  const ensure = (id: string) => {
    let line = map.get(id);
    if (!line) {
      line = {
        categoryId: id,
        name: nameOf(id),
        planned: 0,
        actual: 0,
        deviation: 0,
        hasPlan: false,
        hasActual: false,
        expenseCount: 0,
      };
      map.set(id, line);
    }
    return line;
  };
  for (const c of o.plannedCosts) {
    const l = ensure(c.categoryId);
    l.planned += c.amount;
    l.hasPlan = true;
  }
  for (const e of o.expenses) {
    const l = ensure(e.categoryId);
    l.actual += e.amount;
    l.hasActual = true;
    l.expenseCount += 1;
  }
  const order = new Map(categories.map((c, i) => [c.id, i]));
  return [...map.values()]
    .map((l) => ({ ...l, deviation: l.actual - l.planned }))
    .sort((a, b) => (order.get(a.categoryId) ?? 99) - (order.get(b.categoryId) ?? 99));
}

/** Консервативная оценка итоговой себестоимости заказа в работе. */
export function forecastCost(o: Order): Kopecks {
  const lines = categoryLines(o, []);
  return sum(lines.map((l) => Math.max(l.planned, l.actual)));
}

export type ProfitKind = 'final' | 'forecast' | 'plan' | 'none';

export interface ProfitView {
  kind: ProfitKind;
  /** Финальная, расчётная или плановая прибыль; null — не применимо */
  profit: Kopecks | null;
  cost: Kopecks | null;
  margin: number | null;
  /** Отклонение прибыли от плана (отрицательное — хуже плана) */
  deviation: Kopecks | null;
}

/**
 * Текущая оценка прибыли заказа с честной пометкой о её природе:
 *  final    — фактическая, заказ закрыт и расходы подтверждены;
 *  forecast — расчётная, заказ в работе (или закрыт без подтверждения);
 *  plan     — черновик: есть только план;
 *  none     — отменённый заказ.
 */
export function profitView(o: Order): ProfitView {
  const pp = plannedProfit(o);
  if (o.status === 'cancelled') return { kind: 'none', profit: null, cost: null, margin: null, deviation: null };
  if (o.status === 'draft') return { kind: 'plan', profit: pp, cost: plannedCost(o), margin: plannedMargin(o), deviation: null };
  if (isFinal(o)) {
    const cost = actualCost(o);
    const profit = o.price - cost;
    return { kind: 'final', profit, cost, margin: margin(profit, o.price), deviation: profit - pp };
  }
  const cost = forecastCost(o);
  const profit = o.price - cost;
  return { kind: 'forecast', profit, cost, margin: margin(profit, o.price), deviation: profit - pp };
}

export interface Completeness {
  /** Статьи плана, по которым уже есть фактические расходы */
  covered: number;
  total: number;
  missing: string[];
  ratio: number;
  confirmed: boolean;
}

export function completeness(o: Order, categories: Category[]): Completeness {
  const lines = categoryLines(o, categories).filter((l) => l.hasPlan && l.planned > 0);
  const covered = lines.filter((l) => l.hasActual).length;
  return {
    covered,
    total: lines.length,
    missing: lines.filter((l) => !l.hasActual).map((l) => l.name),
    ratio: lines.length ? covered / lines.length : o.expenses.length ? 1 : 0,
    confirmed: isFinal(o),
  };
}

/** Порог «существенного» отклонения: 3 % от цены, но не меньше 2 000 ₽. */
export function isSignificantOverrun(o: Order): boolean {
  const v = profitView(o);
  if (v.deviation === null || v.deviation >= 0) return false;
  const threshold = Math.max(200_000, Math.round(o.price * 0.03));
  return -v.deviation >= threshold;
}

/** Статья с наибольшим перерасходом — подсказка, если причина не записана. */
export function topOverrun(o: Order, categories: Category[]): CategoryLine | null {
  const lines = categoryLines(o, categories).filter((l) => l.deviation > 0);
  if (!lines.length) return null;
  return lines.reduce((a, b) => (b.deviation > a.deviation ? b : a));
}

export function isOverdue(o: Order, today: string): boolean {
  return (o.status === 'in_progress' || o.status === 'draft') && !!o.dueDate && o.dueDate < today;
}

/* ---------- Агрегаты по набору заказов ---------- */

export interface Totals {
  committedCount: number;
  revenue: Kopecks;
  plannedProfit: Kopecks;
  plannedMargin: number | null;
  /** Завершённые с подтверждёнными расходами */
  finalCount: number;
  finalRevenue: Kopecks;
  finalProfit: Kopecks;
  finalPlannedProfit: Kopecks;
  finalMargin: number | null;
  finalPlannedMargin: number | null;
  /** Отклонение по сопоставимым (финальным) заказам */
  finalDeviation: Kopecks;
  inProgressCount: number;
  forecastProfit: Kopecks;
  forecastPlannedProfit: Kopecks;
}

export function totals(orders: Order[]): Totals {
  const committed = orders.filter(isCommitted);
  const finals = committed.filter(isFinal);
  const progress = committed.filter((o) => !isFinal(o));
  const revenue = sum(committed.map((o) => o.price));
  const pp = sum(committed.map(plannedProfit));
  const finalRevenue = sum(finals.map((o) => o.price));
  const finalProfit = sum(finals.map((o) => o.price - actualCost(o)));
  const finalPlanned = sum(finals.map(plannedProfit));
  return {
    committedCount: committed.length,
    revenue,
    plannedProfit: pp,
    plannedMargin: margin(pp, revenue),
    finalCount: finals.length,
    finalRevenue,
    finalProfit,
    finalPlannedProfit: finalPlanned,
    finalMargin: margin(finalProfit, finalRevenue),
    finalPlannedMargin: margin(finalPlanned, finalRevenue),
    finalDeviation: finalProfit - finalPlanned,
    inProgressCount: progress.length,
    forecastProfit: sum(progress.map((o) => profitView(o).profit ?? 0)),
    forecastPlannedProfit: sum(progress.map(plannedProfit)),
  };
}
