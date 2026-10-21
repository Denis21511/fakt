/** Все денежные суммы хранятся в копейках (целые числа), чтобы избежать ошибок округления. */
export type Kopecks = number;

export type OrderStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface Category {
  id: string;
  name: string;
}

export interface PlannedCost {
  id: string;
  categoryId: string;
  name: string;
  amount: Kopecks;
}

export interface Expense {
  id: string;
  categoryId: string;
  name: string;
  amount: Kopecks;
  /** ISO-дата YYYY-MM-DD */
  date: string;
  comment: string;
}

export interface Order {
  id: string;
  number: number;
  title: string;
  client: string;
  description: string;
  /** ISO-дата создания заказа YYYY-MM-DD */
  createdAt: string;
  /** Плановая дата завершения YYYY-MM-DD */
  dueDate: string;
  price: Kopecks;
  status: OrderStatus;
  plannedCosts: PlannedCost[];
  expenses: Expense[];
  /** Дата фактического завершения */
  completedAt: string | null;
  /** Пользователь подтвердил, что все расходы внесены */
  expensesConfirmed: boolean;
  /** Причина отклонения от плана, записанная пользователем */
  deviationNote: string;
  updatedAt: string;
}

export type CurrencyDisplay = 'symbol' | 'short';

export interface Settings {
  companyName: string;
  currencyDisplay: CurrencyDisplay;
  showKopecks: boolean;
}

export type PeriodKey = '30d' | '90d' | '180d' | '365d' | 'all';
export type Granularity = 'week' | 'month' | 'quarter';
