import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export function PhoneFrame({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cx('phone', className)} aria-label={label} role={label ? 'region' : undefined}>
      <span className="phone__notch" aria-hidden />
      <div className="phone__screen passport-shell">{children}</div>
    </div>
  );
}
