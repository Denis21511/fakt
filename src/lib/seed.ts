import { addDays, todayISO } from './dates';
import { uid } from './id';
import { PRESET } from './presets';
import type { Category, Expense, Order, PlannedCost, Settings } from './types';

export const DEFAULT_CATEGORIES: Category[] = PRESET.categories;

export const DEFAULT_SETTINGS: Settings = PRESET.settings;

const NAMES: Record<string, string> = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c.name]));

/** Суммы в демо-данных задаются в рублях и переводятся в копейки. */
const rub = (v: number) => Math.round(v * 100);

export function buildDemoOrders(): Order[] {
  const today = todayISO();
  return PRESET.specs.map((s) => {
    const createdAt = addDays(today, -s.ago);
    const plannedCosts: PlannedCost[] = s.plan.map(([categoryId, amount, name]) => ({
      id: uid(),
      categoryId,
      name: name ?? NAMES[categoryId],
      amount: rub(amount),
    }));
    const expenses: Expense[] = (s.expenses ?? []).map(([categoryId, name, amount, day, comment]) => ({
      id: uid(),
      categoryId,
      name,
      amount: rub(amount),
      date: addDays(createdAt, Math.min(day, s.ago)),
      comment: comment ?? '',
    }));
    const completedAt = s.status === 'completed' && s.doneAfter !== undefined ? addDays(createdAt, s.doneAfter) : null;
    return {
      id: uid(),
      number: s.number,
      title: s.title,
      client: s.client,
      description: s.description,
      createdAt,
      dueDate: addDays(createdAt, s.duration),
      price: rub(s.price),
      status: s.status,
      plannedCosts,
      expenses,
      completedAt,
      expensesConfirmed: s.status === 'completed',
      deviationNote: s.note ?? '',
      updatedAt: new Date().toISOString(),
    };
  });
}

export const DEMO_NEXT_NUMBER = PRESET.nextNumber;
