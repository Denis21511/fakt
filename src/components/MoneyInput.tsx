import { useEffect, useState } from 'react';
import { currencySuffix, moneyInputValue, parseMoney } from '../lib/format';
import { cx } from './ui';

/**
 * Поле ввода суммы. Хранит строку, пока пользователь печатает,
 * и наружу отдаёт копейки (null — пусто, NaN — ошибка ввода).
 * При потере фокуса значение форматируется с разделителями разрядов.
 */
export function MoneyInput({
  value,
  onChange,
  id,
  invalid,
  placeholder = '0',
  ariaLabel,
  autoFocus,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(() => moneyInputValue(value));
  const [focused, setFocused] = useState(false);

  // Синхронизация, если значение изменилось извне
  useEffect(() => {
    if (focused) return;
    const parsed = parseMoney(text);
    if (parsed !== value && !(Number.isNaN(parsed) && Number.isNaN(value))) setText(moneyInputValue(value));
  }, [value]);

  return (
    <div className={cx('input-money', invalid && 'is-invalid')}>
      <input
        id={id}
        className="input num"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        autoFocus={autoFocus}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d\s., ]/g, '');
          setText(next);
          onChange(parseMoney(next));
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseMoney(text);
          if (parsed !== null && !Number.isNaN(parsed)) setText(moneyInputValue(parsed));
        }}
      />
      <span className="input-money__suffix">{currencySuffix()}</span>
    </div>
  );
}
