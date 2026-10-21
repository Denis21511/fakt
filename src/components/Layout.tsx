import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, LayoutGrid, ListOrdered, Menu as MenuIcon, Plus, Settings, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useOrderForm } from '../lib/uiStore';
import { OrderFormModal } from './OrderFormModal';
import { Toaster } from './Toast';
import { cx } from './ui';

/** Форма плиты: скруглённый квадрат со срезанным углом, как у металлической бирки. */
export const LOGO_PLATE = 'M10 0H30A10 10 0 0 1 40 10V33L33 40H10A10 10 0 0 1 0 30V10A10 10 0 0 1 10 0Z';

/**
 * Монограмма FAKT: четыре буквы в сетке 2×2 на графитовой плите.
 * Буквы собраны из прямых «профильных» линий с рубленными торцами —
 * как маркировка, выбитая на шильдике.
 */
export function LogoMark({
  size = 32,
  plate = '#20251F',
  ink = '#D5F36A',
}: {
  size?: number;
  plate?: string;
  ink?: string;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="logo-mark">
      <defs>
        <clipPath id={`${id}-a`}>
          <rect x="22" y="8" width="10" height="10" />
        </clipPath>
        <clipPath id={`${id}-k`}>
          <rect x="8" y="22" width="10" height="10" />
        </clipPath>
      </defs>
      <path d={LOGO_PLATE} fill={plate} />
      <g fill="none" stroke={ink} strokeWidth="2.8" strokeLinejoin="miter" strokeLinecap="butt">
        <path d="M9.4 18V9.4H18M9.4 14H16.4" />
        <path d="M22.96 20L26.74 6M31.04 20L27.26 6M24.5 14.2H29.5" clipPath={`url(#${id}-a)`} />
        <path d="M9.4 22V32M9.4 28.4L18.6 21.1M12.4 26L18.2 33" clipPath={`url(#${id}-k)`} />
        <path d="M22 23.4H32M27 22V32" />
      </g>
    </svg>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="FAKT — на главную">
      {/* На тёмной панели — инверсия: лаймовая плита, графитовые буквы */}
      <LogoMark plate="#D5F36A" ink="#171A20" />
      <span className="brand__text">
        <span className="brand__name">FAKT</span>
        <span className="brand__tag">Контроль прибыли</span>
      </span>
    </NavLink>
  );
}

const NAV = [
  { to: '/', label: 'Обзор', icon: LayoutGrid, end: true },
  { to: '/orders', label: 'Все заказы', icon: ListOrdered, end: false },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3, end: false },
  { to: '/settings', label: 'Настройки', icon: Settings, end: false },
];

function SidebarContent() {
  const company = useStore((s) => s.settings.companyName);
  const activeCount = useStore((s) => s.orders.filter((o) => o.status === 'in_progress').length);
  const openCreate = useOrderForm((s) => s.openCreate);
  return (
    <>
      <nav className="nav" aria-label="Основная навигация">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('nav__item', isActive && 'is-active')}>
            <Icon size={17} strokeWidth={1.9} />
            <span>{label}</span>
            {to === '/orders' && activeCount > 0 && (
              <span className="nav__count" title="Заказов в работе">
                {activeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button type="button" className="sidebar__new" onClick={openCreate}>
        <Plus size={16} /> Новый заказ
      </button>
      <div className="sidebar__foot">
        <div className="company">
          <div className="company__avatar" aria-hidden>
            {company.replace(/[«»"]/g, '').trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() ?? 'М'}
          </div>
          <div className="company__meta">
            <div className="company__name" title={company}>
              {company || 'Без названия'}
            </div>
            <div className="company__role">Владелец</div>
          </div>
        </div>
        <NavLink to="/settings#storage" className="demo-pill" title="Данные хранятся только в этом браузере">
          <span className="demo-pill__dot" aria-hidden />
          <span>
            <b>Демо-режим</b>
            <small>Данные хранятся в этом браузере</small>
          </span>
        </NavLink>
      </div>
    </>
  );
}

export function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const currency = useStore((s) => `${s.settings.currencyDisplay}-${s.settings.showKopecks}`);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <SidebarContent />
      </aside>

      <header className="topbar">
        <Brand />
        <button
          type="button"
          className="icon-btn"
          aria-label={drawer ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={drawer}
          onClick={() => setDrawer((v) => !v)}
        >
          {drawer ? <X size={20} /> : <MenuIcon size={20} />}
        </button>
      </header>
      {drawer && (
        <div className="drawer-layer">
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer" role="dialog" aria-label="Меню">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* key: перерисовка сумм при смене формата валюты */}
      <main className="main" key={currency} id="main">
        <Outlet />
      </main>
      <OrderFormModal />
      <Toaster />
    </div>
  );
}
