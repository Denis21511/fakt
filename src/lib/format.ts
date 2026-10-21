import type { CurrencyDisplay, Kopecks } from './types';

/**
 * Настройки отображения денег. Обновляются из хранилища (см. store.ts),
 * а компоненты перемонтируются при их изменении (см. AppLayout).
 */
const config: { currency: CurrencyDisplay; showKopecks: boolean } = {
  currency: 'symbol',
  showKopecks: false,
};

export function setMoneyConfig(currency: CurrencyDisplay, showKopecks: boolean) {
  config.currency = currency;
  config.showKopecks = showKopecks;
}

const MINUS = '−';
const NBSP = ' ';

const intFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const kopFmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const oneFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export function currencySuffix() {
  return config.currency === 'symbol' ? '₽' : 'руб.';
}

/** Число без знака валюты: «186 000» */
export function amount(k: Kopecks): string {
  const value = Math.round(k);
  const abs = Math.abs(value) / 100;
  // Копейки показываем всегда (если включено) или только когда они есть —
  // так суммы с копейками остаются арифметически согласованными.
  const withKopecks = config.showKopecks || value % 100 !== 0;
  const s = withKopecks ? kopFmt.format(abs) : intFmt.format(abs);
  return (value < 0 ? MINUS : '') + s;
}

/** «186 000 ₽» */
export function money(k: Kopecks): string {
  return `${amount(k)}${NBSP}${currencySuffix()}`;
}

/** «+3 300 ₽» / «−9 200 ₽» / «0 ₽» */
export function signedMoney(k: Kopecks): string {
  const rounded = Math.round(k);
  if (rounded === 0) return money(0);
  return (rounded > 0 ? '+' : '') + money(rounded);
}

/** «34,9 %» */
export function pct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const s = pctFmt.format(Math.abs(value));
  return `${value < 0 && s !== '0,0' ? MINUS : ''}${s}${NBSP}%`;
}

/** «+1,8 п.п.» */
export function signedPoints(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const s = pctFmt.format(Math.abs(value));
  if (s === '0,0') return `0${NBSP}п.п.`;
  return `${value > 0 ? '+' : MINUS}${s}${NBSP}п.п.`;
}

/** Компактная запись для осей графиков: «120 тыс.», «1,2 млн» */
export function compactRub(rub: number): string {
  const abs = Math.abs(rub);
  const sign = rub < 0 ? MINUS : '';
  // 999 500 округляется до «1 млн», а не до «1 000 тыс.»
  if (abs >= 999_500) return `${sign}${oneFmt.format(abs / 1_000_000)}${NBSP}млн`;
  if (abs >= 1_000) return `${sign}${oneFmt.format(Math.round(abs / 1000))}${NBSP}тыс.`;
  return `${sign}${intFmt.format(abs)}`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function ordersWord(n: number) {
  return plural(n, 'заказ', 'заказа', 'заказов');
}

/** Номер заказа «№ 1042» */
export function orderNo(n: number) {
  return `№${NBSP}${n}`;
}

/**
 * Разбор суммы, введённой пользователем: «42 000», «42000,50», «42 000.5».
 * Возвращает копейки, null для пустой строки или NaN для некорректного ввода.
 */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[\s  ₽]/g, '').replace(/руб\.?/i, '').replace(',', '.');
  if (s === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  const value = Math.round(parseFloat(s) * 100);
  return Number.isFinite(value) ? value : NaN;
}

/** Представление суммы в поле ввода: «42 000» или «42 000,5» */
export function moneyInputValue(k: Kopecks | null): string {
  if (k === null || !Number.isFinite(k)) return '';
  const rub = k / 100;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(rub);
}
