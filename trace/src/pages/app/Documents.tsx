import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Database, Download, Eye, EyeOff, FilePlus2, FileSearch, FileText, MoreHorizontal, Search, Trash2, X } from 'lucide-react';
import { DocIcon, DocumentUploadDialog, DocumentViewer, downloadDocument } from '../../components/product/DocumentDialogs';
import { EmptyState } from '../../components/ui/Badges';
import { Menu } from '../../components/ui/Menu';
import { ConfirmDialog } from '../../components/ui/Modal';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL } from '../../domain/catalog';
import type { DocumentType, ProductDocument } from '../../domain/types';
import { useDocumentTitle } from '../../hooks/misc';
import { formatDate, plural } from '../../lib/dates';
import { formatBytes } from '../../lib/format';
import { repository, type StorageUsage } from '../../storage';
import { toast, toastError } from '../../state/toast';
import { useWorkspace } from '../../state/workspace';

type Visibility = 'all' | 'public' | 'private';

export default function Documents() {
  useDocumentTitle('Документы');
  const { documents, products, deleteDocument, updateDocument } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [type, setType] = useState<DocumentType | ''>('');
  const [productId, setProductId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [upload, setUpload] = useState<{ productId?: string; type?: DocumentType } | null>(null);
  const [viewing, setViewing] = useState<ProductDocument | null>(null);
  const [toDelete, setToDelete] = useState<ProductDocument | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    if (params.get('upload') !== '1') return;
    setUpload({ productId: params.get('product') ?? undefined, type: (params.get('type') as DocumentType) ?? undefined });
    setParams({}, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    let alive = true;
    repository.files
      .usage()
      .then((u) => alive && setUsage(u))
      .catch(() => alive && setUsage(null));
    return () => {
      alive = false;
    };
  }, [documents]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...documents]
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .filter((d) => !type || d.type === type)
      .filter((d) => !productId || d.productId === productId)
      .filter((d) => visibility === 'all' || (visibility === 'public' ? d.isPublic : !d.isPublic))
      .filter((d) => {
        if (!needle) return true;
        const p = productById.get(d.productId);
        return [d.title, d.fileName, p?.name ?? '', p?.serial ?? ''].some((s) => s.toLowerCase().includes(needle));
      });
  }, [documents, q, type, productId, visibility, productById]);

  const hasFilters = Boolean(q || type || productId || visibility !== 'all');
  const totalBytes = documents.reduce((s, d) => s + d.size, 0);
  const withoutInstruction = products.filter((p) => !documents.some((d) => d.productId === p.id && d.type === 'instruction'));
  const resetFilters = () => {
    setQ('');
    setType('');
    setProductId('');
    setVisibility('all');
  };

  const togglePublic = async (d: ProductDocument) => {
    try {
      await updateDocument(d.id, { isPublic: !d.isPublic });
      toast.success(d.isPublic ? 'Документ скрыт от покупателей' : 'Документ показан в паспорте', d.title);
    } catch (err) {
      toastError('Не удалось изменить видимость', err);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteDocument(toDelete.id);
      toast.success('Документ удалён', toDelete.title);
    } catch (err) {
      toastError('Документ не удалён', err);
    }
    setToDelete(null);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Документы</h1>
          <p className="page-head__meta">
            {documents.length} {plural(documents.length, ['файл', 'файла', 'файлов'])}
            {totalBytes > 0 && ` · ${formatBytes(totalBytes)}`}
            {withoutInstruction.length > 0 && products.length > 0 && (
              <span className="docs-gap">
                Без инструкции: {withoutInstruction.length} {plural(withoutInstruction.length, ['изделие', 'изделия', 'изделий'])}
              </span>
            )}
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--primary" onClick={() => setUpload({})} disabled={products.length === 0}>
            <FilePlus2 aria-hidden />
            Добавить документ
          </button>
        </div>
      </header>

      <div className="storage-note">
        <Database aria-hidden />
        <p>
          Файлы хранятся в этом браузере (IndexedDB): PDF, JPG, PNG и WEBP до 10 МБ. На другом устройстве или после очистки данных сайта их не будет —
          для работы нескольких сотрудников нужно серверное хранилище.
          {usage && (
            <span className="storage-note__usage mono">
              {' '}
              Занято {formatBytes(usage.bytes)}
              {usage.quota ? ` из ${formatBytes(usage.quota)}` : ''}
            </span>
          )}
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<FileText />}
            title="Библиотека пуста"
            text={
              products.length === 0
                ? 'Документы привязываются к изделиям. Сначала добавьте изделие.'
                : 'Загрузите инструкцию, паспорт качества или сертификат и привяжите к изделию — покупатель откроет их из паспорта.'
            }
            actions={
              products.length === 0 ? (
                <Link to="/app/products/new" className="btn btn--primary btn--lg">
                  Добавить изделие
                </Link>
              ) : (
                <button type="button" className="btn btn--primary btn--lg" onClick={() => setUpload({})}>
                  Добавить документ
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="input-affix toolbar__search">
              <Search aria-hidden />
              <input
                className="input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Название, файл или изделие"
                aria-label="Поиск документов"
              />
            </div>
            <select
              className="select toolbar__select"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType | '')}
              aria-label="Тип документа"
            >
              <option value="">Все типы</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select className="select toolbar__select" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Изделие">
              <option value="">Все изделия</option>
              {[...products]
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <select
              className="select toolbar__select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              aria-label="Видимость"
            >
              <option value="all">Любая видимость</option>
              <option value="public">В паспорте</option>
              <option value="private">Внутренние</option>
            </select>
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                <X aria-hidden />
                Сбросить
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={<FileSearch />}
                title="Ничего не найдено"
                text="С выбранными фильтрами документов нет."
                actions={
                  <button type="button" className="btn btn--secondary" onClick={resetFilters}>
                    Сбросить фильтры
                  </button>
                }
              />
            </div>
          ) : (
            <div className="panel">
              <div className="table-wrap">
                <table className="table docs-table">
                  <thead>
                    <tr>
                      <th>Документ</th>
                      <th>Тип</th>
                      <th>Изделие</th>
                      <th>Размер</th>
                      <th>Загружен</th>
                      <th>Видимость</th>
                      <th className="col-actions">
                        <span className="visually-hidden">Действия</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const p = productById.get(d.productId);
                      return (
                        <tr key={d.id}>
                          <td>
                            <button type="button" className="doc-cell" onClick={() => setViewing(d)}>
                              <span className="doc-cell__icon">
                                <DocIcon mime={d.mime} />
                              </span>
                              <span className="doc-cell__text">
                                <span className="doc-cell__title">{d.title}</span>
                                <span className="doc-cell__file mono">{d.fileName}</span>
                              </span>
                            </button>
                          </td>
                          <td className="nowrap">{DOCUMENT_TYPE_LABEL[d.type]}</td>
                          <td>
                            {p ? (
                              <Link to={`/app/products/${p.id}`} className="doc-product">
                                <span>{p.name}</span>
                                <span className="mono">{p.serial}</span>
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="mono nowrap">{d.size ? formatBytes(d.size) : <span className="muted">готовится</span>}</td>
                          <td className="mono nowrap">{formatDate(d.uploadedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className={d.isPublic ? 'vis-toggle is-public' : 'vis-toggle'}
                              onClick={() => void togglePublic(d)}
                              aria-pressed={d.isPublic}
                              title={d.isPublic ? 'Скрыть от покупателей' : 'Показать в паспорте'}
                            >
                              {d.isPublic ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                              {d.isPublic ? 'В паспорте' : 'Внутренний'}
                            </button>
                          </td>
                          <td className="col-actions">
                            <Menu
                              label={`Действия: ${d.title}`}
                              trigger={<MoreHorizontal />}
                              items={[
                                { label: 'Просмотр', icon: <Eye />, onSelect: () => setViewing(d) },
                                { label: 'Скачать', icon: <Download />, onSelect: () => void downloadDocument(d) },
                                { kind: 'separator' },
                                { label: 'Удалить', icon: <Trash2 />, danger: true, onSelect: () => setToDelete(d) },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <DocumentUploadDialog open={Boolean(upload)} onClose={() => setUpload(null)} productId={upload?.productId} type={upload?.type} />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить документ?"
        text={toDelete && `«${toDelete.title}» исчезнет из библиотеки и из паспорта изделия. Файл удалится из хранилища браузера.`}
        confirmLabel="Удалить документ"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
