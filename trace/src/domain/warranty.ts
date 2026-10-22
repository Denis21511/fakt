import { addMonths, diffDays, humanSpan, todayISO } from '../lib/dates';
import type { ISODate, Warranty } from './types';

export type WarrantyStatus = 'none' | 'pending' | 'active' | 'expiring' | 'expired';

/** За сколько дней до окончания гарантия попадает в «Истекает» */
export const EXPIRING_WINDOW_DAYS = 60;

export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  none: 'Не оформлена',
  pending: 'Ещё не началась',
  active: 'Действует',
  expiring: 'Истекает',
  expired: 'Истекла',
};

export interface WarrantyInfo {
  status: WarrantyStatus;
  startDate: ISODate | null;
  endDate: ISODate | null;
  daysLeft: number | null;
  /** «осталось 4 года 5 мес.» / «закончилась 12.03.2026» — короткое пояснение к статусу */
  remaining: string | null;
}

export function warrantyEnd(w: Warranty): ISODate | null {
  if (!w.months || !w.startDate) return null;
  return addMonths(w.startDate, w.months);
}

export function warrantyInfo(w: Warranty, today: ISODate = todayISO()): WarrantyInfo {
  const endDate = warrantyEnd(w);
  if (!endDate || !w.startDate) {
    return { status: 'none', startDate: w.startDate, endDate: null, daysLeft: null, remaining: null };
  }
  if (diffDays(today, w.startDate) > 0) {
    return { status: 'pending', startDate: w.startDate, endDate, daysLeft: null, remaining: `начнётся через ${humanSpan(today, w.startDate)}` };
  }
  const daysLeft = diffDays(today, endDate);
  if (daysLeft <= 0) {
    return { status: 'expired', startDate: w.startDate, endDate, daysLeft, remaining: null };
  }
  return {
    status: daysLeft <= EXPIRING_WINDOW_DAYS ? 'expiring' : 'active',
    startDate: w.startDate,
    endDate,
    daysLeft,
    remaining: `осталось ${humanSpan(today, endDate)}`,
  };
}

/** Действующая гарантия — включая ту, что скоро истекает */
export function isWarrantyLive(status: WarrantyStatus): boolean {
  return status === 'active' || status === 'expiring';
}
