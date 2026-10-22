import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FilePlus2, PackagePlus, QrCode } from 'lucide-react';
import { ProductImage } from '../../components/product/ProductImage';
import { useProductActions } from '../../components/product/useProductActions';
import { PassportBadge } from '../../components/ui/Badges';
import { CATEGORY_SHORT } from '../../domain/catalog';
import { workspaceStats } from '../../domain/stats';
import type { IssueKind } from '../../domain/passport';
import type { Product } from '../../domain/types';
import { useDocumentTitle } from '../../hooks/misc';
import { formatDate, formatToday, plural } from '../../lib/dates';
import { cx } from '../../lib/cx';
import { useWorkspace } from '../../state/workspace';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

/** Оттенки графита для разбивки по категориям — без радуги, порядок по убыванию */
const CATEGORY_TONES = ['#20221F', '#4D5148', '#7C8075', '#A6A99E', '#C9CBC1', '#DEDFD7', '#ECEDE6'];

export default function Overview() {
  useDocumentTitle('Обзор');
  const { products, documents, company, mode } = useWorkspace();
  const navigate = useNavigate();
  const actions = useProductActions();
  const stats = useMemo(() => workspaceStats(products, documents), [products, documents]);
  const today = formatToday();
  const recent = useMemo(() => [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [products]);
  const liveWarranties = stats.warranty.active + stats.warranty.expiring;
  const publishedShare = stats.total ? stats.published / stats.total : 0;

  const issueAction = (p: Product, kind: IssueKind) => {
    switch (kind) {
      case 'draft':
      case 'withdrawn':
        return (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => void actions.publish(p)}>
            Опубликовать
          </button>
        );
      case 'no-instruction':
        return (
          <Link className="btn btn--secondary btn--sm" to={`/app/documents?upload=1&product=${p.id}&type=instruction`}>
            Добавить инструкцию
          </Link>
        );
      default:
        return (
          <Link className="btn btn--ghost btn--sm" to={`/app/products/${p.id}`}>
            Открыть
          </Link>
        );
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Панель производства</h1>
          <p className="page-head__meta">
            <span className="mono">
              {today.date}, {today.weekday}
            </span>
            <span>
              {greeting()}.{' '}
              {stats.attention.length > 0
                ? `${stats.attention.length} ${plural(stats.attention.length, ['изделие требует', 'изделия требуют', 'изделий требуют'])} внимания.`
                : stats.total > 0
                  ? 'Все паспорта в порядке.'
                  : `Добавьте первое изделие${company.name ? ` ${company.name}` : ''}.`}
            </span>
          </p>
        </div>
        {mode === 'demo' && (
          <p className="demo-note">
            Демо-данные вымышленного производителя «ФОРМАТ МЕТАЛЛ». Изменения сохраняются в этом браузере.{' '}
            <Link to="/app/settings#data">Управление данными</Link>
          </p>
        )}
      </header>

      <section className="metrics" aria-label="Показатели">
        <div className="metric metric--hero">
          <div className="metric__label">Всего изделий</div>
          <div className="metric__value num">{stats.total}</div>
          {stats.total > 0 && (
            <>
              <div className="catbar" aria-hidden>
                {stats.byCategory.map((c, i) => (
                  <span key={c.id} style={{ flexGrow: c.count, background: CATEGORY_TONES[i] }} />
                ))}
              </div>
              <ul className="catlegend">
                {stats.byCategory.map((c, i) => (
                  <li key={c.id}>
                    <span className="catlegend__swatch" style={{ background: CATEGORY_TONES[i] }} aria-hidden />
                    {c.label}
                    <span className="catlegend__n mono">{c.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <Link className="metric" to="/app/products?status=published">
          <div className="metric__label">Паспорта опубликованы</div>
          <div className="metric__value num">
            {stats.published}
            <span className="metric__of">из {stats.total}</span>
          </div>
          <div className="meter" role="img" aria-label={`Опубликовано ${Math.round(publishedShare * 100)}%`}>
            <span style={{ width: `${publishedShare * 100}%` }} />
          </div>
          <div className="metric__note">{stats.total > 0 ? 'Покупатели видят их по QR-коду' : 'Паспорт создаётся вместе с изделием'}</div>
        </Link>
        <Link className="metric" to="/app/warranties">
          <div className="metric__label">Гарантии активны</div>
          <div className="metric__value num">{liveWarranties}</div>
          <div className="metric__note">
            {stats.warranty.expiring > 0 && (
              <span className="metric__flag metric__flag--warn">
                {stats.warranty.expiring} {plural(stats.warranty.expiring, ['истекает', 'истекают', 'истекают'])} в ближайшие 60 дней
              </span>
            )}
            {stats.warranty.expired > 0 && <span className="metric__flag">{stats.warranty.expired} уже истекла</span>}
            {stats.warranty.expiring === 0 &&
              stats.warranty.expired === 0 &&
              (liveWarranties > 0 ? 'Ни одна не истекает в ближайшие 60 дней' : 'Гарантии появятся вместе с изделиями')}
          </div>
        </Link>
        <Link className="metric" to="/app/products?status=unpublished">
          <div className="metric__label">Без цифрового паспорта</div>
          <div className="metric__value num">{stats.unpublished}</div>
          <div className="metric__note">
            {stats.unpublished > 0
              ? `Черновики — ${stats.drafts}, сняты с публикации — ${stats.withdrawn}`
              : stats.total > 0
                ? 'У каждого изделия есть опубликованный паспорт'
                : 'Изделий пока нет'}
          </div>
        </Link>
      </section>

      <div className="overview-grid">
        <section className="panel overview-recent" aria-labelledby="recent-title">
          <div className="panel__head">
            <h2 className="panel__title" id="recent-title">
              Недавно добавлены
            </h2>
            <Link to="/app/products" className="link-btn">
              Весь каталог
              <ArrowRight aria-hidden />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty empty--compact">
              <div className="empty__text">Здесь появятся последние добавленные изделия.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Изделие</th>
                    <th>Серийный номер</th>
                    <th>Изготовлено</th>
                    <th>Паспорт</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id} className="is-clickable" onClick={() => navigate(`/app/products/${p.id}`)}>
                      <td>
                        <div className="cell-product">
                          <ProductImage photo={p.photo} alt="" size="thumb" />
                          <div className="cell-product__text">
                            <Link to={`/app/products/${p.id}`} className="cell-product__name" onClick={(e) => e.stopPropagation()}>
                              {p.name}
                            </Link>
                            <span className="cell-product__sub">{CATEGORY_SHORT[p.category]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{p.serial}</td>
                      <td className="mono">{formatDate(p.manufacturedAt)}</td>
                      <td>
                        <PassportBadge status={p.passport.status} plain />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="overview-side">
          <section className="workbench" aria-labelledby="quick-title">
            <h2 className="workbench__title" id="quick-title">
              Быстрое действие
            </h2>
            <div className="workbench__actions">
              <Link to="/app/products/new" className="wb-action wb-action--primary">
                <PackagePlus aria-hidden />
                <span>
                  <span className="wb-action__label">Создать изделие</span>
                  <span className="wb-action__hint">Паспорт и QR-код за пять шагов</span>
                </span>
              </Link>
              <Link to="/app/documents?upload=1" className="wb-action">
                <FilePlus2 aria-hidden />
                <span>
                  <span className="wb-action__label">Добавить документ</span>
                  <span className="wb-action__hint">Инструкция, сертификат, паспорт качества</span>
                </span>
              </Link>
              <Link to="/app/qr" className="wb-action">
                <QrCode aria-hidden />
                <span>
                  <span className="wb-action__label">Открыть QR-коды</span>
                  <span className="wb-action__hint">Скачать или напечатать этикетки</span>
                </span>
              </Link>
            </div>
          </section>

          <section className="panel" aria-labelledby="attention-title">
            <div className="panel__head">
              <h2 className="panel__title" id="attention-title">
                Требуют внимания <span className="panel__count">{stats.attention.length}</span>
              </h2>
              {stats.attention.length > 5 && (
                <Link to="/app/products?status=attention" className="link-btn">
                  Все
                  <ArrowRight aria-hidden />
                </Link>
              )}
            </div>
            {stats.attention.length === 0 ? (
              <div className="attention-ok">
                <CheckCircle2 aria-hidden />
                <span>{stats.total ? 'Все паспорта опубликованы, инструкции на месте.' : 'Пока нечего проверять.'}</span>
              </div>
            ) : (
              <ul className="attention">
                {stats.attention.slice(0, 5).map(({ product: p, issues }) => (
                  <li key={p.id} className="attention__item">
                    <ProductImage photo={p.photo} alt="" size="thumb" />
                    <div className="attention__body">
                      <Link to={`/app/products/${p.id}`} className="attention__name">
                        {p.name}
                      </Link>
                      <div className="attention__issues">
                        {issues.map((i) => (
                          <span key={i.kind} className={cx('issue', `issue--${i.kind}`)}>
                            {i.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="attention__action">{issueAction(p, issues[0].kind)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {actions.dialogs}
    </div>
  );
}
