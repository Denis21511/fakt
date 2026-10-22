import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

let openCount = 0;

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Окна с вводом не закрываются случайным кликом мимо */
  closeOnBackdrop?: boolean;
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.classList.add('modal-open');
    const node = ref.current;
    const target = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!node) return;
      const all = document.querySelectorAll('.modal');
      if (all[all.length - 1] !== node) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount === 0) document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden />
      <div ref={ref} className={cx('modal', `modal--${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__head">
          <div>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle && <div className="modal__subtitle">{subtitle}</div>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <X />
          </button>
        </div>
        <div className={cx('modal__body', bodyClassName)}>{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button type="button" className={cx('btn', danger ? 'btn--danger' : 'btn--dark')} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy && <span className="spinner" aria-hidden />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ color: 'var(--muted)', fontSize: 15 }}>{text}</div>
    </Modal>
  );
}
