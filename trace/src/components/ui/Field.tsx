import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cx } from '../../lib/cx';

interface ControlProps {
  id: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/**
 * Подпись, подсказка и ошибка для одного поля. Единственный дочерний элемент
 * получает id, aria-invalid и aria-describedby автоматически. Если поле обёрнуто
 * (суффикс «мм», кнопка рядом), дочерним передаётся функция, получающая эти атрибуты.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactElement | ((control: ControlProps) => ReactElement);
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const controlProps: ControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  };
  const control =
    typeof children === 'function'
      ? children(controlProps)
      : isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, { ...controlProps })
        : children;

  return (
    <div className={cx('field', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__req" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <AlertCircle size={15} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {hint && <span className="switch__hint">{hint}</span>}
      </span>
      <span className="switch__control">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" aria-hidden />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode; count?: number; title?: string }[];
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg__btn" aria-pressed={value === o.value} title={o.title} onClick={() => onChange(o.value)}>
          {o.icon}
          {o.label}
          {o.count !== undefined && <span className="seg__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
