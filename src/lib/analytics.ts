import { actualCost, categoryLines, isFinal, plannedProfit } from './calc';
import { addDays, bucketsBetween, lastBuckets, PERIOD_OPTIONS, todayISO, type Bucket } from './dates';
import type { Category, Granularity, Order, PeriodKey } from './types';

export interface PlanFactPoint {
  key: string;
  label: string;
  fullLabel: string;
  /** рубли */
  plan: number;
  fact: number;
  count: number;
}

/** Плановая и фактическая прибыль завершённых заказов по корзинам (по дате заказа). */
export function planFactSeries(orders: Order[], buckets: Bucket[]): PlanFactPoint[] {
  const finals = orders.filter(isFinal);
  return buckets.map((b) => {
    const inB = finals.filter((o) => o.createdAt >= b.start && o.createdAt <= b.end);
    return {
      key: b.key,
      label: b.label,
      fullLabel: b.fullLabel,
      plan: inB.reduce((a, o) => a + plannedProfit(o), 0) / 100,
      fact: inB.reduce((a, o) => a + (o.price - actualCost(o)), 0) / 100,
      count: inB.length,
    };
  });
}

const DEFAULT_COUNT: Record<Granularity, number> = { week: 12, month: 12, quarter: 6 };
const MIN_COUNT: Record<Granularity, number> = { week: 8, month: 6, quarter: 4 };

/** Последние корзины, без пустого «хвоста» в начале (но не меньше минимума). */
export function recentBuckets(orders: Order[], g: Granularity): Bucket[] {
  const all = lastBuckets(DEFAULT_COUNT[g], g);
  const finals = orders.filter(isFinal);
  const firstIdx = all.findIndex((b) => finals.some((o) => o.createdAt >= b.start && o.createdAt <= b.end));
  if (firstIdx < 0) return all.slice(-MIN_COUNT[g]);
  return all.slice(Math.min(firstIdx, all.length - MIN_COUNT[g]));
}

/** Корзины для выбранного периода (для «Всё время» — от самого раннего заказа). */
export function periodBuckets(orders: Order[], period: PeriodKey, g: Granularity): Bucket[] {
  const today = todayISO();
  const opt = PERIOD_OPTIONS.find((p) => p.key === period);
  let from: string;
  if (opt?.days) from = addDays(today, -(opt.days - 1));
  else from = orders.reduce((m, o) => (o.createdAt < m ? o.createdAt : m), today);
  const buckets = bucketsBetween(from, today, g);
  return buckets.length > 40 ? buckets.slice(-40) : buckets;
}

export interface CategoryAggregate {
  categoryId: string;
  name: string;
  planned: number;
  actual: number;
  deviation: number;
  overrunOrders: number;
}

/** План и факт по статьям расходов для завершённых заказов (копейки). */
export function categoryAggregates(orders: Order[], categories: Category[]): CategoryAggregate[] {
  const map = new Map<string, CategoryAggregate>();
  for (const o of orders.filter(isFinal)) {
    for (const l of categoryLines(o, categories)) {
      const a = map.get(l.categoryId) ?? {
        categoryId: l.categoryId,
        name: l.name,
        planned: 0,
        actual: 0,
        deviation: 0,
        overrunOrders: 0,
      };
      a.planned += l.planned;
      a.actual += l.actual;
      if (l.deviation > 0) a.overrunOrders += 1;
      map.set(l.categoryId, a);
    }
  }
  const idx = new Map(categories.map((c, i) => [c.id, i]));
  return [...map.values()]
    .map((a) => ({ ...a, deviation: a.actual - a.planned }))
    .sort((a, b) => (idx.get(a.categoryId) ?? 99) - (idx.get(b.categoryId) ?? 99));
}
