import type { ReactNode } from 'react';
import { PASSPORT_STATUS_LABEL } from '../../domain/catalog';
import type { PassportStatus } from '../../domain/types';
import { WARRANTY_STATUS_LABEL, type WarrantyStatus } from '../../domain/warranty';
import { cx } from '../../lib/cx';

export function PassportBadge({ status, plain }: { status: PassportStatus; plain?: boolean }) {
  return (
    <span className={cx('badge', `badge--${status}`, plain && 'badge--plain')}>
      <span className="badge__dot" aria-hidden />
      {PASSPORT_STATUS_LABEL[status]}
    </span>
  );
}

export function WarrantyBadge({ status, plain, sub }: { status: WarrantyStatus; plain?: boolean; sub?: ReactNode }) {
  return (
    <span className={cx('badge', `badge--${status}`, plain && 'badge--plain')}>
      <span className="badge__dot" aria-hidden />
      {WARRANTY_STATUS_LABEL[status]}
      {sub && <span className="badge__sub">{sub}</span>}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  actions,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      {icon && <div className="empty__icon">{icon}</div>}
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
