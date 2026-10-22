import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';

export type MenuItem =
  | { kind?: 'item'; label: string; icon?: ReactNode; onSelect?: () => void; to?: string; href?: string; danger?: boolean; disabled?: boolean }
  | { kind: 'separator' };

export function Menu({
  trigger,
  items,
  label,
  align = 'end',
}: {
  /** Содержимое кнопки-триггера */
  trigger: ReactNode;
  items: MenuItem[];
  /** Доступное имя кнопки */
  label: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const m = menuRef.current.getBoundingClientRect();
    let left = align === 'end' ? r.right - m.width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - m.width - 8));
    let top = r.bottom + 6;
    if (top + m.height > window.innerHeight - 8) top = Math.max(8, r.top - m.height - 6);
    setPos({ top, left });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('.menu__item:not([aria-disabled="true"])') ?? []);
    items()[0]?.focus();
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btnRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Tab') {
        close();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const select = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="menu"
            role="menu"
            style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) => {
              if (item.kind === 'separator') return <div key={i} className="menu__sep" role="separator" />;
              const cls = cx('menu__item', item.danger && 'menu__item--danger');
              if (item.to) {
                return (
                  <Link key={i} to={item.to} className={cls} role="menuitem" onClick={() => select(item.onSelect)}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              }
              if (item.href) {
                return (
                  <a key={i} href={item.href} target="_blank" rel="noopener" className={cls} role="menuitem" onClick={() => select(item.onSelect)}>
                    {item.icon}
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  role="menuitem"
                  disabled={item.disabled}
                  aria-disabled={item.disabled || undefined}
                  onClick={() => select(item.onSelect)}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
