import type { Granularity, PeriodKey } from './types';

/** Работаем с датами в формате YYYY-MM-DD в локальном часовом поясе. */

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(fromISO: string, toISOValue: string): number {
  const a = parseISO(fromISO).getTime();
  const b = parseISO(toISOValue).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISO(iso);
  return toISO(d) === iso;
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_NOM_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** «21 окт 2026» (год опускается для текущего года при short=true) */
export function formatDate(iso: string | null | undefined, opts: { short?: boolean } = {}): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return opts.short && sameYear ? base : `${base} ${d.getFullYear()}`;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: '30d', label: 'За 30 дней', days: 30 },
  { key: '90d', label: 'За 3 месяца', days: 91 },
  { key: '180d', label: 'За 6 месяцев', days: 183 },
  { key: '365d', label: 'За 12 месяцев', days: 365 },
  { key: 'all', label: 'За всё время', days: null },
];

export function periodLabel(key: PeriodKey): string {
  return PERIOD_OPTIONS.find((p) => p.key === key)?.label ?? '';
}

/** Попадает ли дата в период, отсчитанный назад от сегодняшнего дня. */
export function inPeriod(iso: string, key: PeriodKey): boolean {
  const opt = PERIOD_OPTIONS.find((p) => p.key === key);
  if (!opt || opt.days === null) return true;
  const from = addDays(todayISO(), -(opt.days - 1));
  return iso >= from;
}

/* ---------- Корзины для графиков ---------- */

export interface Bucket {
  key: string;
  label: string;
  fullLabel: string;
  start: string;
  end: string; // включительно
}

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7; // понедельник = 0
  r.setDate(r.getDate() - day);
  return r;
}

export function bucketStart(iso: string, g: Granularity): Date {
  const d = parseISO(iso);
  if (g === 'week') return startOfWeek(d);
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}

function nextBucket(d: Date, g: Granularity): Date {
  if (g === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(d.getFullYear(), d.getMonth() + 3, 1);
}

function prevBucket(d: Date, g: Granularity): Date {
  if (g === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return new Date(d.getFullYear(), d.getMonth() - 3, 1);
}

function describe(start: Date, g: Granularity): Bucket {
  const end = new Date(nextBucket(start, g).getTime() - 86_400_000);
  const startISO = toISO(start);
  const endISO = toISO(end);
  let label: string;
  let fullLabel: string;
  if (g === 'week') {
    label = `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, '0')}`;
    fullLabel = `Неделя ${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} — ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  } else if (g === 'month') {
    label = MONTHS_NOM_SHORT[start.getMonth()];
    fullLabel = `${MONTHS_NOM[start.getMonth()]} ${start.getFullYear()}`;
  } else {
    const q = Math.floor(start.getMonth() / 3) + 1;
    label = `${q} кв. ${String(start.getFullYear()).slice(2)}`;
    fullLabel = `${q} квартал ${start.getFullYear()}`;
  }
  return { key: startISO, label, fullLabel, start: startISO, end: endISO };
}

/** Последовательность корзин от fromISO до сегодняшнего дня. */
export function bucketsBetween(fromISO: string, toISOValue: string, g: Granularity): Bucket[] {
  const result: Bucket[] = [];
  let cur = bucketStart(fromISO, g);
  const last = bucketStart(toISOValue, g).getTime();
  let guard = 0;
  while (cur.getTime() <= last && guard < 500) {
    result.push(describe(cur, g));
    cur = nextBucket(cur, g);
    guard++;
  }
  return result;
}

/** Последние n корзин, заканчивая текущей. */
export function lastBuckets(n: number, g: Granularity): Bucket[] {
  let cur = bucketStart(todayISO(), g);
  const out: Bucket[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(describe(cur, g));
    cur = prevBucket(cur, g);
  }
  return out;
}
