import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  Printer,
  QrCode as QrIcon,
  Trash2,
  X,
} from 'lucide-react';
import { CornerMarks } from '../../components/brand/Logo';
import { DocIcon, DocumentUploadDialog, DocumentViewer, downloadDocument } from '../../components/product/DocumentDialogs';
import { ProductImage } from '../../components/product/ProductImage';
import { copyText, downloadQr } from '../../components/product/QrDialog';
import { QrCode } from '../../components/product/QrCode';
import { useProductActions } from '../../components/product/useProductActions';
import { EmptyState, PassportBadge, WarrantyBadge } from '../../components/ui/Badges';
import { Menu } from '../../components/ui/Menu';
import { ConfirmDialog } from '../../components/ui/Modal';
import { CATEGORY_SHORT, DOCUMENT_TYPE_LABEL } from '../../domain/catalog';
import type { ProductDocument } from '../../domain/types';
import { warrantyInfo } from '../../domain/warranty';
import { useDocumentTitle } from '../../hooks/misc';
import { formatDate, formatDateTime, monthsLabel } from '../../lib/dates';
import { formatBytes, formatDimensions } from '../../lib/format';
import { groupToken } from '../../lib/id';
import { passportPath, passportUrl } from '../../lib/qr';
import { toast, toastError } from '../../state/toast';
import { selectProduct, useWorkspace } from '../../state/workspace';

export default function ProductDetail() {
  const { id } = useParams();
  const product = useWorkspace(selectProduct(id));
  const allDocs = useWorkspace((s) => s.documents);
  const deleteDocument = useWorkspace((s) => s.deleteDocument);
  const updateDocument = useWorkspace((s) => s.updateDocument);
  const navigate = useNavigate();
  const location = useLocation();
  const actions = useProductActions({ afterDelete: () => navigate('/app/products', { replace: true }) });
  const [saved, setSaved] = useState<'created' | 'updated' | null>((location.state as { saved?: 'created' | 'updated' } | null)?.saved ?? null);
  const [upload, setUpload] = useState(false);
  const [viewing, setViewing] = useState<ProductDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<ProductDocument | null>(null);
  useDocumentTitle(product?.name ?? 'Изделие');

  useEffect(() => {
    // Флаг «только что сохранено» не должен пережить перезагрузку страницы
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []);

  if (!product) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            icon={<PackageSearch />}
            title="Изделие не найдено"
            text="Его могли удалить или ссылка устарела."
            actions={
              <Link to="/app/products" className="btn btn--dark">
                В каталог
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const docs = allDocs.filter((d) => d.productId === product.id);
  const w = warrantyInfo(product.warranty);
  const url = passportUrl(product.token);
  const published = product.passport.status === 'published';
  const dims = formatDimensions(product.dimensions);
  const specs: [string, string][] = [
    ['Производитель', product.manufacturer],
    ['Модель', product.model],
    ['Материал', product.material],
    ['Габариты', dims],
    ['Цвет и отделка', product.color],
    ['Дата изготовления', formatDate(product.manufacturedAt)],
    ...product.specs.map((s): [string, string] => [s.label, s.value]),
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await deleteDocument(docToDelete.id);
      toast.success('Документ удалён', docToDelete.title);
    } catch (err) {
      toastError('Документ не удалён', err);
    }
    setDocToDelete(null);
  };

  const togglePublic = async (d: ProductDocument) => {
    try {
      await updateDocument(d.id, { isPublic: !d.isPublic });
      toast.success(d.isPublic ? 'Документ скрыт от покупателей' : 'Документ показан в паспорте', d.title);
    } catch (err) {
      toastError('Не удалось изменить видимость', err);
    }
  };

  return (
    <div className="page detail">
      <nav className="crumbs" aria-label="Навигация">
        <Link to="/app/products">Изделия</Link>
        <ChevronRight aria-hidden />
        <span>{CATEGORY_SHORT[product.category]}</span>
      </nav>

      {saved && (
        <div className="saved-banner" role="status">
          <span className="saved-banner__mark" aria-hidden>
            <CheckCircle2 />
          </span>
          <div className="saved-banner__text">
            <strong>{saved === 'created' ? 'Изделие создано' : 'Изменения сохранены'}</strong>
            <span>
              {published
                ? 'Паспорт опубликован — QR-код ведёт на актуальную страницу.'
                : 'Паспорт сохранён черновиком. Опубликуйте его, когда изделие будет готово к передаче.'}
            </span>
          </div>
          <div className="saved-banner__actions">
            <Link to={`/app/qr?product=${product.id}`} className="btn btn--primary btn--sm">
              <Printer aria-hidden />
              Печать этикетки
            </Link>
            <button type="button" className="icon-btn" onClick={() => setSaved(null)} aria-label="Скрыть сообщение">
              <X />
            </button>
          </div>
        </div>
      )}

      <header className="page-head detail-head">
        <div>
          <h1 className="page-head__title">{product.name}</h1>
          <div className="detail-head__codes">
            <span>
              <span className="detail-head__k">Артикул</span>
              <span className="mono">{product.sku}</span>
            </span>
            <span>
              <span className="detail-head__k">Серийный номер</span>
              <span className="mono">{product.serial}</span>
            </span>
            <PassportBadge status={product.passport.status} />
          </div>
        </div>
        <div className="page-head__actions">
          <Link to={`/app/products/${product.id}/edit`} className="btn btn--secondary">
            <Pencil aria-hidden />
            Редактировать
          </Link>
          <a href={passportPath(product.token)} target="_blank" rel="noopener" className="btn btn--secondary">
            <ExternalLink aria-hidden />
            Открыть паспорт
          </a>
          <button type="button" className="btn btn--dark" onClick={() => actions.showQr(product)}>
            <QrIcon aria-hidden />
            QR-код
          </button>
          <Menu
            label="Другие действия"
            trigger={<MoreHorizontal />}
            items={actions
              .menuItems(product, { inDetail: true })
              .filter((i) => !('label' in i) || (i.label !== 'Редактировать' && i.label !== 'QR-код'))}
          />
        </div>
      </header>

      {!published && (
        <div className="notice notice--warn detail-notice">
          <AlertTriangle aria-hidden />
          <div>
            <div className="notice__title">{product.passport.status === 'draft' ? 'Паспорт не опубликован' : 'Паспорт снят с публикации'}</div>
            <div className="notice__text">
              Покупатель, отсканировавший QR-код, увидит сообщение «Паспорт ещё не опубликован» — без данных изделия.
            </div>
            <div className="notice__actions">
              <button type="button" className="btn btn--dark btn--sm" onClick={() => void actions.publish(product)}>
                <Eye aria-hidden />
                Опубликовать паспорт
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel detail-overview" aria-label="Изделие">
            <div className="detail-overview__media">
              <ProductImage photo={product.photo} dims={product.dimensions} alt={product.name} size="lg" />
              <CornerMarks inset={10} size={14} color="rgba(32,34,31,.45)" />
            </div>
            <div className="detail-overview__specs">
              <h2 className="detail-h">Основные характеристики</h2>
              {product.description && <p className="detail-desc">{product.description}</p>}
              <dl className="kv">
                {specs.map(([k, v]) => (
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </section>

          <section className="panel" aria-labelledby="warranty-h">
            <div className="panel__head">
              <h2 className="panel__title" id="warranty-h">
                Гарантия
              </h2>
              <WarrantyBadge status={w.status} />
            </div>
            <div className="panel__body">
              {w.status === 'none' ? (
                <p className="muted">
                  Гарантия не оформлена. <Link to={`/app/products/${product.id}/edit`}>Указать срок и условия</Link>
                </p>
              ) : (
                <>
                  <div className="plate">
                    <div className="plate__cell">
                      <span>Срок</span>
                      <strong>{product.warranty.months ? monthsLabel(product.warranty.months) : '—'}</strong>
                    </div>
                    <div className="plate__cell">
                      <span>Начало</span>
                      <strong className="mono">{formatDate(w.startDate)}</strong>
                    </div>
                    <div className="plate__cell">
                      <span>Окончание</span>
                      <strong className="mono">{formatDate(w.endDate)}</strong>
                    </div>
                    <div className="plate__cell">
                      <span>Осталось</span>
                      <strong>{w.status === 'expired' ? 'Истекла' : (w.remaining?.replace(/^осталось /, '') ?? '—')}</strong>
                    </div>
                  </div>
                  {product.warranty.terms && <p className="detail-terms">{product.warranty.terms}</p>}
                </>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="docs-h">
            <div className="panel__head">
              <h2 className="panel__title" id="docs-h">
                Документы <span className="panel__count">{docs.length}</span>
              </h2>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setUpload(true)}>
                <FilePlus2 aria-hidden />
                Добавить документ
              </button>
            </div>
            {docs.length === 0 ? (
              <EmptyState
                compact
                title="Документов пока нет"
                text="Приложите инструкцию по монтажу и эксплуатации — покупатели чаще всего ищут именно её."
                actions={
                  <button type="button" className="btn btn--dark btn--sm" onClick={() => setUpload(true)}>
                    Добавить инструкцию
                  </button>
                }
              />
            ) : (
              <ul className="doc-list">
                {docs.map((d) => (
                  <li key={d.id} className="doc-row">
                    <button type="button" className="doc-row__main" onClick={() => setViewing(d)}>
                      <span className="doc-row__icon">
                        <DocIcon mime={d.mime} />
                      </span>
                      <span className="doc-row__text">
                        <span className="doc-row__title">{d.title}</span>
                        <span className="doc-row__meta">
                          {DOCUMENT_TYPE_LABEL[d.type]} · {d.size ? formatBytes(d.size) : 'PDF'} · {formatDate(d.uploadedAt)}
                        </span>
                      </span>
                    </button>
                    <span className={d.isPublic ? 'doc-row__vis' : 'doc-row__vis doc-row__vis--private'}>
                      {d.isPublic ? 'В паспорте' : 'Внутренний'}
                    </span>
                    <Menu
                      label={`Действия: ${d.title}`}
                      trigger={<MoreHorizontal />}
                      items={[
                        { label: 'Просмотр', icon: <Eye />, onSelect: () => setViewing(d) },
                        { label: 'Скачать', icon: <Download />, onSelect: () => void downloadDocument(d) },
                        { label: d.isPublic ? 'Скрыть от покупателей' : 'Показать в паспорте', icon: <Eye />, onSelect: () => void togglePublic(d) },
                        { kind: 'separator' },
                        { label: 'Удалить', icon: <Trash2 />, danger: true, onSelect: () => setDocToDelete(d) },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {product.equipment.length > 0 && (
            <section className="panel" aria-labelledby="equip-h">
              <div className="panel__head">
                <h2 className="panel__title" id="equip-h">
                  Комплектация <span className="panel__count">{product.equipment.length}</span>
                </h2>
              </div>
              <ol className="equip-list">
                {product.equipment.map((e, i) => (
                  <li key={i}>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    {e}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="detail-side">
          <section className="idblock" aria-label="Цифровой идентификатор">
            <div className="idblock__head">
              <span>Цифровой идентификатор</span>
              <span className={published ? 'idblock__live' : 'idblock__live idblock__live--off'}>
                {published ? 'Паспорт открыт' : 'Паспорт закрыт'}
              </span>
            </div>
            <div className="idblock__qr">
              <CornerMarks size={18} color="#C8F169" />
              <QrCode value={url} margin={2} title={`QR-код паспорта ${product.serial}`} />
            </div>
            <dl className="idblock__kv">
              <dt>Код паспорта</dt>
              <dd className="mono">{groupToken(product.token)}</dd>
              <dt>Серийный номер</dt>
              <dd className="mono">{product.serial}</dd>
            </dl>
            <div className="idblock__url">
              <span className="mono">{url}</span>
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => void copyText(url)} aria-label="Скопировать ссылку на паспорт">
                <Copy />
              </button>
            </div>
            <div className="idblock__actions">
              <button type="button" className="btn btn--sm idblock__btn" onClick={() => void downloadQr(product, 'png')}>
                <Download aria-hidden />
                PNG
              </button>
              <button type="button" className="btn btn--sm idblock__btn" onClick={() => void downloadQr(product, 'svg')}>
                <Download aria-hidden />
                SVG
              </button>
              <Link to={`/app/qr?product=${product.id}`} className="btn btn--primary btn--sm">
                <Printer aria-hidden />
                Этикетка
              </Link>
            </div>
          </section>

          <section className="panel" aria-label="История записи">
            <dl className="kv kv--tight detail-meta">
              <dt>Создано</dt>
              <dd className="mono">{formatDateTime(product.createdAt)}</dd>
              <dt>Изменено</dt>
              <dd className="mono">{formatDateTime(product.updatedAt)}</dd>
              <dt>Опубликовано</dt>
              <dd className="mono">{product.passport.publishedAt ? formatDateTime(product.passport.publishedAt) : '—'}</dd>
              <dt>Категория</dt>
              <dd>{CATEGORY_SHORT[product.category]}</dd>
            </dl>
            {product.demo && <p className="detail-demo">Демо-запись — удаляется вместе с демо-данными в настройках.</p>}
          </section>
        </aside>
      </div>

      {actions.dialogs}
      <DocumentUploadDialog open={upload} onClose={() => setUpload(false)} productId={product.id} />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(docToDelete)}
        title="Удалить документ?"
        text={docToDelete && `«${docToDelete.title}» исчезнет из библиотеки и из паспорта изделия. Файл удалится из хранилища.`}
        confirmLabel="Удалить документ"
        danger
        onConfirm={confirmDeleteDoc}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}
