import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToasts } from '../../state/toast';
import { cx } from '../../lib/cx';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={cx('toast', `toast--${t.kind}`)} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon className="toast__icon" aria-hidden />
            <div>
              <div className="toast__title">{t.title}</div>
              {t.text && <div className="toast__text">{t.text}</div>}
            </div>
            <button type="button" className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Скрыть уведомление">
              <X />
            </button>
          </div>
        );
      })}
    </div>
  );
}
