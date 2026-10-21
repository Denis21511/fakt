import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './ui';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

const GAP = 6;
const EDGE = 8;
// До измерения меню стоит за экраном (а не скрыто), чтобы на него мог перейти фокус
const OFFSCREEN: CSSProperties = { top: -9999, left: -9999 };

/**
 * Выпадающее меню действий. Рендерится в body с фиксированной позицией,
 * чтобы его не обрезали таблицы с прокруткой; у нижнего края раскрывается вверх.
 * Закрывается по клику вне, Esc, прокрутке; стрелки перемещают фокус.
 */
export function Menu({
  trigger,
  items,
  align = 'right',
  label,
  triggerClassName = 'icon-btn',
}: {
  trigger: ReactNode;
  items: (MenuItem | 'divider')[];
  align?: 'left' | 'right';
  label: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(OFFSCREEN);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Позиционирование относительно кнопки до отрисовки кадра
  useLayoutEffect(() => {
    if (!open) return;
    const btn = btnRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const h = menu.offsetHeight;
    const w = menu.offsetWidth;
    const fitsBelow = btn.bottom + GAP + h <= window.innerHeight - EDGE;
    const top = fitsBelow ? btn.bottom + GAP : Math.max(EDGE, btn.top - GAP - h);
    const rawLeft = align === 'right' ? btn.right - w : btn.left;
    const left = Math.min(Math.max(EDGE, rawLeft), window.innerWidth - w - EDGE);
    setStyle({ top, left, transformOrigin: `${align === 'right' ? 'right' : 'left'} ${fitsBelow ? 'top' : 'bottom'}` });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btnRef.current?.focus();
      }
      if (e.key === 'Tab') close();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...(menuRef.current?.querySelectorAll<HTMLElement>('.menu__item:not(:disabled)') ?? [])];
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    menuRef.current?.querySelector<HTMLElement>('.menu__item:not(:disabled)')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="menu-root" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className={cx(triggerClassName, open && 'is-open')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setStyle(OFFSCREEN);
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} className="menu" role="menu" aria-label={label} style={style} onClick={(e) => e.stopPropagation()}>
            {items.map((item, i) =>
              item === 'divider' ? (
                <div key={`d${i}`} className="menu__divider" role="separator" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={cx('menu__item', item.danger && 'menu__item--danger')}
                  disabled={item.disabled}
                  title={item.hint}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.icon && <span className="menu__icon">{item.icon}</span>}
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
