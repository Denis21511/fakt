import type { ISODate } from '../domain/types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** Полночь по местному времени — чтобы сравнение дат не зависело от часового пояса */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidISODate(iso: string | null | undefined): iso is ISODate {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISODate(parseISODate(iso)) === iso;
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

function toDate(iso: string): Date {
  return iso.length > 10 ? new Date(iso) : parseISODate(iso);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatToday(): { date: string; weekday: string } {
  const d = new Date();
  return { date: `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`, weekday: WEEKDAYS[d.getDay()] };
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** Срок между датами словами: «4 года 5 мес.», «2 мес.», «12 дней» */
export function humanSpan(from: ISODate, to: ISODate): string {
  const days = diffDays(from, to);
  if (days <= 0) return '0 дней';
  if (days < 45) return `${days} ${plural(days, ['день', 'дня', 'дней'])}`;
  const a = parseISODate(from);
  const b = parseISODate(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} мес.`;
  const y = `${years} ${plural(years, ['год', 'года', 'лет'])}`;
  return rest ? `${y} ${rest} мес.` : y;
}

export function monthsLabel(months: number): string {
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y} ${plural(y, ['год', 'года', 'лет'])}`;
  }
  return `${months} ${plural(months, ['месяц', 'месяца', 'месяцев'])}`;
}
