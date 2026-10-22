import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ProductImage } from '../components/product/ProductImage';
import { PassportBadge } from '../components/ui/Badges';
import { searchProducts } from '../domain/search';
import { useMediaQuery } from '../hooks/misc';
import { cx } from '../lib/cx';
import { useWorkspace } from '../state/workspace';

/** Поиск по названию, артикулу и серийному номеру из любой точки кабинета. «/» — фокус. */
export function GlobalSearch() {
  const products = useWorkspace((s) => s.products);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const narrow = useMediaQuery('(max-width: 760px)');

  const results = useMemo(() => (q.trim() ? searchProducts(products, q).slice(0, 6) : []), [products, q]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === '/' && !typing && !document.body.classList.contains('modal-open')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    navigate(path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!q.trim()) return;
      const hit = results[active];
      go(hit ? `/app/products/${hit.id}` : `/app/products?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && q.trim().length > 0;

  return (
    <div className="gsearch" ref={boxRef}>
      <div className="input-affix">
        <Search aria-hidden />
        <input
          ref={inputRef}
          className="input gsearch__input"
          type="search"
          placeholder={narrow ? 'Поиск изделий' : 'Название, артикул или серийный номер'}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label="Поиск изделий"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        />
        <span className="kbd gsearch__kbd" aria-hidden>
          /
        </span>
      </div>
      {showList && (
        <div className="gsearch__pop" role="listbox" id={listId} aria-label="Найденные изделия">
          {results.length === 0 && <div className="gsearch__empty">Ничего не найдено по запросу «{q.trim()}»</div>}
          {results.map((p, i) => (
            <div
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cx('gsearch__item', i === active && 'is-active')}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/app/products/${p.id}`);
              }}
            >
              <ProductImage photo={p.photo} alt="" size="thumb" />
              <span className="gsearch__text">
                <span className="gsearch__name">{p.name}</span>
                <span className="gsearch__meta mono">
                  {p.sku} · {p.serial}
                </span>
              </span>
              <PassportBadge status={p.passport.status} plain />
            </div>
          ))}
          {results.length > 0 && (
            <div
              id={`${listId}-${results.length}`}
              role="option"
              aria-selected={active === results.length}
              className={cx('gsearch__all', active === results.length && 'is-active')}
              onMouseEnter={() => setActive(results.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/app/products?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              Все результаты в каталоге
            </div>
          )}
        </div>
      )}
    </div>
  );
}
