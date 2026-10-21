import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setMoneyConfig } from './format';
import { uid } from './id';
import { buildDemoOrders, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEMO_NEXT_NUMBER } from './seed';
import type { Category, Expense, Granularity, Order, OrderStatus, PeriodKey, PlannedCost, Settings } from './types';

export const STORAGE_KEY = 'fakt:data:v1';

export interface OrderInput {
  title: string;
  client: string;
  description: string;
  createdAt: string;
  dueDate: string;
  price: number;
  status: OrderStatus;
  plannedCosts: Omit<PlannedCost, 'id'>[];
}

export type ExpenseInput = Omit<Expense, 'id'>;

interface UiPrefs {
  overviewPeriod: PeriodKey;
  overviewGranularity: Granularity;
  analyticsPeriod: PeriodKey;
  analyticsGranularity: Granularity;
}

interface State {
  orders: Order[];
  categories: Category[];
  settings: Settings;
  nextNumber: number;
  isDemo: boolean;
  ui: UiPrefs;

  createOrder: (input: OrderInput) => Order;
  updateOrder: (id: string, input: OrderInput) => void;
  deleteOrder: (id: string) => void;
  setStatus: (id: string, status: Exclude<OrderStatus, 'completed'>) => void;
  completeOrder: (id: string, completedAt: string) => void;
  setDeviationNote: (id: string, note: string) => void;

  addExpense: (orderId: string, input: ExpenseInput) => void;
  updateExpense: (orderId: string, expenseId: string, input: ExpenseInput) => void;
  deleteExpense: (orderId: string, expenseId: string) => void;

  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setUi: (patch: Partial<UiPrefs>) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const now = () => new Date().toISOString();

const withPlanIds = (costs: Omit<PlannedCost, 'id'>[]): PlannedCost[] => costs.map((c) => ({ ...c, id: uid() }));

function demoState() {
  return {
    orders: buildDemoOrders(),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_SETTINGS },
    nextNumber: DEMO_NEXT_NUMBER,
    isDemo: true,
  };
}

const DEFAULT_UI: UiPrefs = {
  overviewPeriod: '365d',
  overviewGranularity: 'month',
  analyticsPeriod: 'all',
  analyticsGranularity: 'month',
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchOrder = (id: string, fn: (o: Order) => Order) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...fn(o), updatedAt: now() } : o)) }));

      return {
        ...demoState(),
        ui: DEFAULT_UI,

        createOrder: (input) => {
          const order: Order = {
            id: uid(),
            number: get().nextNumber,
            title: input.title,
            client: input.client,
            description: input.description,
            createdAt: input.createdAt,
            dueDate: input.dueDate,
            price: input.price,
            status: input.status,
            plannedCosts: withPlanIds(input.plannedCosts),
            expenses: [],
            completedAt: null,
            expensesConfirmed: false,
            deviationNote: '',
            updatedAt: now(),
          };
          set((s) => ({ orders: [order, ...s.orders], nextNumber: s.nextNumber + 1 }));
          return order;
        },

        updateOrder: (id, input) =>
          patchOrder(id, (o) => ({
            ...o,
            title: input.title,
            client: input.client,
            description: input.description,
            createdAt: input.createdAt,
            dueDate: input.dueDate,
            price: input.price,
            plannedCosts: withPlanIds(input.plannedCosts),
          })),

        deleteOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),

        setStatus: (id, status) =>
          patchOrder(id, (o) => ({ ...o, status, completedAt: null, expensesConfirmed: false })),

        completeOrder: (id, completedAt) =>
          patchOrder(id, (o) => ({ ...o, status: 'completed', completedAt, expensesConfirmed: true })),

        setDeviationNote: (id, note) => patchOrder(id, (o) => ({ ...o, deviationNote: note })),

        addExpense: (orderId, input) =>
          patchOrder(orderId, (o) => ({ ...o, expenses: [...o.expenses, { ...input, id: uid() }] })),

        updateExpense: (orderId, expenseId, input) =>
          patchOrder(orderId, (o) => ({
            ...o,
            expenses: o.expenses.map((e) => (e.id === expenseId ? { ...input, id: e.id } : e)),
          })),

        deleteExpense: (orderId, expenseId) =>
          patchOrder(orderId, (o) => ({ ...o, expenses: o.expenses.filter((e) => e.id !== expenseId) })),

        addCategory: (name) => set((s) => ({ categories: [...s.categories, { id: uid(), name }] })),

        renameCategory: (id, name) =>
          set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),

        deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

        moveCategory: (id, dir) =>
          set((s) => {
            const i = s.categories.findIndex((c) => c.id === id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= s.categories.length) return s;
            const next = [...s.categories];
            [next[i], next[j]] = [next[j], next[i]];
            return { categories: next };
          }),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

        resetDemo: () => set(() => demoState()),

        clearAll: () =>
          set((s) => ({
            orders: [],
            categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
            settings: { ...s.settings },
            nextNumber: 1,
            isDemo: false,
          })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        orders: s.orders,
        categories: s.categories,
        settings: s.settings,
        nextNumber: s.nextNumber,
        isDemo: s.isDemo,
        ui: s.ui,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          ui: { ...current.ui, ...(p.ui ?? {}) },
        };
      },
    },
  ),
);

// Синхронизация настроек отображения денег с модулем форматирования.
const applyMoney = (s: Settings) => setMoneyConfig(s.currencyDisplay, s.showKopecks);
applyMoney(useStore.getState().settings);
useStore.subscribe((s) => applyMoney(s.settings));

// При первом запуске сразу сохраняем демо-данные, чтобы идентификаторы заказов
// не менялись между перезагрузками страницы.
try {
  if (!localStorage.getItem(STORAGE_KEY)) useStore.setState({});
} catch {
  /* хранилище недоступно — работаем в памяти */
}

export function useOrder(id: string | undefined) {
  return useStore((s) => s.orders.find((o) => o.id === id));
}

export function isCategoryUsed(orders: Order[], categoryId: string) {
  return orders.some(
    (o) => o.plannedCosts.some((c) => c.categoryId === categoryId) || o.expenses.some((e) => e.categoryId === categoryId),
  );
}
