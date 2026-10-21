import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_LABEL } from '../lib/calc';
import { money, signedMoney } from '../lib/format';
import type { Kopecks, OrderStatus } from '../lib/types';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cx('status', `status--${status}`)}>
      <span className="status__dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Отклонение прибыли: положительное — зелёное, отрицательное — терракотовое. */
export function Delta({
  value,
  invert = false,
  className,
  size = 'md',
}: {
  value: Kopecks | null;
  /** Для расходов: перерасход (>0) — плохо */
  invert?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  if (value === null) return <span className={cx('delta delta--none', className)}>—</span>;
  const rounded = Math.round(value);
  const good = invert ? rounded < 0 : rounded > 0;
  const bad = invert ? rounded > 0 : rounded < 0;
  return (
    <span className={cx('delta', `delta--${size}`, good && 'delta--pos', bad && 'delta--neg', className)}>
      {signedMoney(value)}
    </span>
  );
}

export function Money({ value, className, muted }: { value: Kopecks | null; className?: string; muted?: boolean }) {
  return (
    <span className={cx('num', muted && 'text-muted', className, value !== null && value < 0 && 'text-neg')}>
      {value === null ? '—' : money(value)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      {icon && <div className="empty__icon">{icon}</div>}
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cx('segmented', size === 'sm' && 'segmented--sm')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cx('segmented__item', o.value === value && 'is-active')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="segmented__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  icon,
  className,
  id,
  invalid,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  icon?: ReactNode;
  className?: string;
  id?: string;
  invalid?: boolean;
}) {
  return (
    <div className={cx('select', icon ? 'select--icon' : null, invalid && 'is-invalid', className)}>
      {icon && <span className="select__icon">{icon}</span>}
      <select id={id} value={value} aria-label={label} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="select__chevron" size={15} aria-hidden />
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cx('field', error && 'field--error', className)}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <div className="field__error" role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="field__hint">{hint}</div>
      ) : null}
    </div>
  );
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Плавная смена числовых значений (≈ 360 мс), уважает «уменьшение движения». */
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value || reduceMotion()) {
      fromRef.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const dur = 360;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (value - from) * eased;
      setShown(p === 1 ? value : Math.round(v / 100) * 100);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame.current = requestAnimationFrame(tick);
    // Страховка: если кадры не рисуются (фоновая вкладка), всё равно показать итог
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(frame.current);
      fromRef.current = value;
      setShown(value);
    }, dur + 120);
    return () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(settle);
      fromRef.current = value;
    };
  }, [value]);

  return <>{format(shown)}</>;
}

/** Небольшой индикатор-полоска (0..1). */
export function Meter({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'neg' | 'muted'; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cx('meter', `meter--${tone}`)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <div className="meter__fill" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function useStableId(prefix: string) {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, '')}`;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="infotip" tabIndex={0} aria-label={text} data-tip={text}>
      ?
    </span>
  );
}
