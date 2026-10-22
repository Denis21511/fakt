import type { CSSProperties } from 'react';
import { cx } from '../../lib/cx';

/** Знак TRACE: угловые метки сканирования вокруг «модуля» — как у маркера технического чертежа */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="#171916" />
      <path d="M8 12.5V8h4.5M19.5 8H24v4.5M24 19.5V24h-4.5M12.5 24H8v-4.5" fill="none" stroke="#C8F169" strokeWidth="2.6" strokeLinecap="square" />
      <rect x="13" y="13" width="6" height="6" fill="#F5F5F0" />
    </svg>
  );
}

export function Logo({ tone = 'dark', size = 28, className }: { tone?: 'dark' | 'light'; size?: number; className?: string }) {
  return (
    <span className={cx('logo', `logo--${tone}`, className)} style={{ '--logo-size': `${size}px` } as CSSProperties}>
      <LogoMark size={size} />
      <span className="logo__word">TRACE</span>
    </span>
  );
}

/** Фирменный мотив: четыре угловые метки вокруг содержимого */
export function CornerMarks({ className, inset = 0, size = 14, color }: { className?: string; inset?: number; size?: number; color?: string }) {
  const style = { '--cm-inset': `${inset}px`, '--cm-size': `${size}px`, '--cm-color': color } as CSSProperties;
  return (
    <span className={cx('corner-marks', className)} style={style} aria-hidden>
      <span className="cm cm--tl" />
      <span className="cm cm--tr" />
      <span className="cm cm--bl" />
      <span className="cm cm--br" />
    </span>
  );
}
