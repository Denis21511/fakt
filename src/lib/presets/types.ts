import type { Category, OrderStatus, Settings } from '../types';

export type PlanSpec = [categoryId: string, amountRub: number, name?: string];
export type ExpenseSpec = [categoryId: string, name: string, amountRub: number, dayFromStart: number, comment?: string];

export interface OrderSpec {
  number: number;
  title: string;
  client: string;
  description: string;
  /** Сколько дней назад создан заказ */
  ago: number;
  /** Плановая длительность в днях */
  duration: number;
  /** Через сколько дней после создания завершён (для завершённых) */
  doneAfter?: number;
  status: OrderStatus;
  price: number;
  plan: PlanSpec[];
  expenses?: ExpenseSpec[];
  note?: string;
}

/** Набор демо-данных и отраслевых формулировок под конкретного клиента. */
export interface DemoPreset {
  /** Ключ localStorage: у каждого пресета свои данные в браузере. */
  storageKey: string;
  categories: Category[];
  settings: Settings;
  specs: OrderSpec[];
  nextNumber: number;
  copy: {
    overviewTitle: string;
    orderTitlePlaceholder: string;
    expenseNamePlaceholder: string;
    deviationPlaceholder: string;
    categoryPlaceholder: string;
    /** «…демонстрационным набором мастерской» */
    demoOwner: string;
  };
  /** Заголовок вкладки браузера; если не задан — остаётся из index.html. */
  documentTitle?: string;
}
