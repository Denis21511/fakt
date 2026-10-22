import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, FileText, LayoutGrid, Menu as MenuIcon, Package, Plus, QrCode, Settings as SettingsIcon, ShieldCheck, X } from 'lucide-react';
import { Logo } from '../components/brand/Logo';
import { CompanyAvatar } from '../components/product/CompanyAvatar';
import { isWarrantyLive, warrantyInfo } from '../domain/warranty';
import { cx } from '../lib/cx';
import { useWorkspace } from '../state/workspace';
import { PageFallback } from '../components/ui/PageFallback';
import { GlobalSearch } from './GlobalSearch';
import '../styles/app.css';
import '../styles/pages.css';
import '../styles/detail.css';
import '../styles/library.css';

const NAV = [
  { to: '/app', label: 'Обзор', icon: LayoutGrid, end: true },
  { to: '/app/products', label: 'Изделия', icon: Package },
  { to: '/app/qr', label: 'QR-коды', icon: QrCode },
  { to: '/app/documents', label: 'Документы', icon: FileText },
  { to: '/app/warranties', label: 'Гарантии', icon: ShieldCheck },
  { to: '/app/settings', label: 'Настройки', icon: SettingsIcon },
] as const;

function sectionOf(pathname: string) {
  const match = [...NAV].reverse().find((n) => (n.to === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(n.to)));
  return match ?? NAV[0];
}

export default function AppLayout() {
  const { status, error, init, prepareDemoFiles, products, documents, company, mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (status !== 'ready') return;
    const id = window.setTimeout(() => void prepareDemoFiles(), 1200);
    return () => window.clearTimeout(id);
  }, [status, prepareDemoFiles]);

  useEffect(() => setDrawer(false), [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const counts = useMemo(
    () => ({
      '/app/products': products.length,
      '/app/qr': products.filter((p) => p.passport.status === 'published').length,
      '/app/documents': documents.length,
      '/app/warranties': products.filter((p) => isWarrantyLive(warrantyInfo(p.warranty).status)).length,
    }),
    [products, documents],
  );

  const section = sectionOf(location.pathname);
  const SectionIcon = section.icon;
  const companyName = company.name || 'Ваша компания';

  return (
    <div className={cx('shell', drawer && 'shell--drawer')}>
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="sidebar__top">
          <Link to="/app" className="sidebar__logo" aria-label="TRACE — обзор">
            <Logo tone="light" size={30} />
          </Link>
          <button type="button" className="icon-btn sidebar__close" onClick={() => setDrawer(false)} aria-label="Закрыть меню">
            <X />
          </button>
        </div>
        <nav className="sidebar__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const count = counts[item.to as keyof typeof counts];
            return (
              <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false} className="navlink">
                <Icon className="navlink__icon" aria-hidden />
                <span className="navlink__label">{item.label}</span>
                {status === 'ready' && count !== undefined && <span className="navlink__count">{count}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar__bottom">
          <Link to="/" className="sidebar__site">
            Сайт TRACE
            <ArrowUpRight aria-hidden />
          </Link>
          <Link to="/app/settings" className="profile">
            <CompanyAvatar company={company} size={38} />
            <span className="profile__text">
              <span className="profile__name">{companyName}</span>
              <span className="profile__sub">{mode === 'demo' ? 'Демонстрационная компания' : company.legalName || 'Профиль компании'}</span>
            </span>
          </Link>
        </div>
      </aside>
      <div className="shell__scrim" onClick={() => setDrawer(false)} aria-hidden />

      <div className="shell__main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__burger" onClick={() => setDrawer(true)} aria-label="Открыть меню" aria-expanded={drawer}>
            <MenuIcon />
          </button>
          <div className="topbar__section">
            <SectionIcon aria-hidden />
            <span>{section.label}</span>
          </div>
          <GlobalSearch />
          <div className="topbar__right">
            <Link to="/app/settings" className="company-chip" title="Текущая компания — настройки">
              <CompanyAvatar company={company} size={26} />
              <span className="company-chip__name">{companyName}</span>
              {mode === 'demo' && <span className="tag tag--dark">Демо</span>}
            </Link>
            <button type="button" className="btn btn--primary topbar__add" onClick={() => navigate('/app/products/new')}>
              <Plus aria-hidden />
              <span>Добавить изделие</span>
            </button>
          </div>
        </header>

        <main id="main" className="shell__content" tabIndex={-1}>
          {status === 'ready' ? (
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          ) : status === 'error' ? (
            <div className="page">
              <div className="notice notice--danger" role="alert">
                <div>
                  <div className="notice__title">Данные не загрузились</div>
                  <div className="notice__text">{error}</div>
                </div>
              </div>
            </div>
          ) : (
            <PageFallback />
          )}
        </main>
      </div>
    </div>
  );
}
