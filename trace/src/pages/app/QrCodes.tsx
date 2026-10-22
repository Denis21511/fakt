import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Copy, Download, ExternalLink, Minus, Plus, Printer, QrCode as QrIcon, Search } from 'lucide-react';
import { CornerMarks } from '../../components/brand/Logo';
import { Label, LABEL_FORMATS, type LabelFormat } from '../../components/labels/Label';
import { usePrintLabels, type PrintMode } from '../../components/labels/PrintLabels';
import { copyText, downloadQr } from '../../components/product/QrDialog';
import { QrCode } from '../../components/product/QrCode';
import { EmptyState, PassportBadge } from '../../components/ui/Badges';
import { Segmented } from '../../components/ui/Field';
import { matchesProduct } from '../../domain/search';
import type { Product } from '../../domain/types';
import { useDocumentTitle, usePref } from '../../hooks/misc';
import { cx } from '../../lib/cx';
import { plural } from '../../lib/dates';
import { downloadBlob, safeFileName } from '../../lib/download';
import { groupToken } from '../../lib/id';
import { passportPath, passportUrl } from '../../lib/qr';
import { repository } from '../../storage';
import { useWorkspace } from '../../state/workspace';
import '../../styles/qr.css';

/** Логотип для встраивания в SVG этикетки: data:-URL переживает скачивание файла */
function useLogoDataUrl(fileId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!fileId) return;
    void repository.files.get(fileId).then((file) => {
      if (!file || !alive) return;
      const reader = new FileReader();
      reader.onload = () => alive && setUrl(reader.result as string);
      reader.readAsDataURL(file.blob);
    });
    return () => {
      alive = false;
    };
  }, [fileId]);
  return url;
}

export default function QrCodes() {
  useDocumentTitle('QR-коды');
  const { products, company } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [format, setFormat] = usePref<LabelFormat>('labelFormat', 'compact', ['compact', 'minimal', 'extended']);
  const [mode, setMode] = usePref<PrintMode>('printMode', 'roll', ['roll', 'a4']);
  const [copies, setCopies] = useState(1);
  const initialId = params.get('product');
  const [activeId, setActiveId] = useState<string | null>(
    initialId && products.some((p) => p.id === initialId) ? initialId : (products[0]?.id ?? null),
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialId ? [initialId] : []));
  const labelRef = useRef<SVGSVGElement>(null);
  const logoHref = useLogoDataUrl(company.logoFileId);
  const printer = usePrintLabels();

  const list = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .filter((p) => matchesProduct(p, q))
        .filter((p) => (filter === 'all' ? true : filter === 'published' ? p.passport.status === 'published' : p.passport.status !== 'published')),
    [products, q, filter],
  );
  const active = products.find((p) => p.id === activeId) ?? null;
  const publishedCount = products.filter((p) => p.passport.status === 'published').length;

  useEffect(() => {
    if (initialId) setParams({}, { replace: true });
  }, []);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allVisibleSelected = list.length > 0 && list.every((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) list.forEach((p) => next.delete(p.id));
      else list.forEach((p) => next.add(p.id));
      return next;
    });

  const batch: Product[] = selected.size > 0 ? products.filter((p) => selected.has(p.id)) : active ? [active] : [];
  const total = batch.length * copies;
  const fmt = LABEL_FORMATS.find((f) => f.id === format)!;

  const downloadLabel = () => {
    if (!labelRef.current || !active) return;
    const svg = labelRef.current.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('width', `${fmt.w}mm`);
    svg.setAttribute('height', `${fmt.h}mm`);
    downloadBlob(new Blob([svg.outerHTML], { type: 'image/svg+xml' }), `${safeFileName(`TRACE_label_${active.serial}`)}.svg`);
  };

  if (products.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-head__title">QR-коды</h1>
        </header>
        <div className="panel">
          <EmptyState
            icon={<QrIcon />}
            title="Кодов пока нет"
            text="QR-код появляется у каждого изделия автоматически. Добавьте изделие — и сразу сможете напечатать этикетку."
            actions={
              <Link to="/app/products/new" className="btn btn--primary btn--lg">
                Добавить изделие
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">QR-коды</h1>
          <p className="page-head__meta">
            {products.length} {plural(products.length, ['код', 'кода', 'кодов'])} · {publishedCount}{' '}
            {plural(publishedCount, ['ведёт', 'ведут', 'ведут'])} на опубликованный паспорт
          </p>
        </div>
      </header>

      <div className="qr-layout">
        <section className="panel qr-list" aria-label="Изделия и их коды">
          <div className="qr-list__tools">
            <div className="input-affix">
              <Search aria-hidden />
              <input
                className="input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Название или серийный номер"
                aria-label="Поиск по кодам"
              />
            </div>
            <Segmented
              label="Фильтр по статусу паспорта"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'published', label: 'Опубликованы' },
                { value: 'unpublished', label: 'Закрыты' },
              ]}
            />
            <label className="check qr-list__all">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              Выбрать все для печати
              {selected.size > 0 && <span className="qr-list__sel mono">{selected.size}</span>}
            </label>
          </div>
          <ul className="qr-items">
            {list.length === 0 && <li className="qr-items__empty">Ничего не найдено</li>}
            {list.map((p) => (
              <li key={p.id} className={cx('qr-item', p.id === activeId && 'is-active')}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Печатать этикетку: ${p.name}`} />
                <button type="button" className="qr-item__main" onClick={() => setActiveId(p.id)} aria-pressed={p.id === activeId}>
                  <QrCode value={passportUrl(p.token)} margin={0} className="qr-item__code" title={`QR-код ${p.serial}`} />
                  <span className="qr-item__text">
                    <span className="qr-item__name">{p.name}</span>
                    <span className="qr-item__serial mono">{p.serial}</span>
                  </span>
                  <span
                    className={cx('qr-item__dot', p.passport.status === 'published' && 'is-live')}
                    title={p.passport.status === 'published' ? 'Паспорт опубликован' : 'Паспорт закрыт'}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {active && (
          <div className="qr-work">
            <section className="qr-hero" aria-label="Выбранный код">
              <div className="qr-hero__code">
                <CornerMarks size={20} color="#C8F169" />
                <QrCode value={passportUrl(active.token)} margin={2} title={`QR-код паспорта ${active.serial}`} />
              </div>
              <div className="qr-hero__info">
                <PassportBadge status={active.passport.status} />
                <h2 className="qr-hero__name">{active.name}</h2>
                <dl className="qr-hero__kv">
                  <dt>Серийный номер</dt>
                  <dd className="mono">{active.serial}</dd>
                  <dt>Код паспорта</dt>
                  <dd className="mono">{groupToken(active.token)}</dd>
                </dl>
                <div className="qr-hero__url">
                  <span className="mono">{passportUrl(active.token)}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={() => void copyText(passportUrl(active.token))}
                    aria-label="Скопировать ссылку"
                  >
                    <Copy />
                  </button>
                </div>
                <div className="qr-hero__actions">
                  <button type="button" className="btn btn--sm qr-hero__btn" onClick={() => void downloadQr(active, 'png')}>
                    <Download aria-hidden />
                    PNG
                  </button>
                  <button type="button" className="btn btn--sm qr-hero__btn" onClick={() => void downloadQr(active, 'svg')}>
                    <Download aria-hidden />
                    SVG
                  </button>
                  <a className="btn btn--sm qr-hero__btn" href={passportPath(active.token)} target="_blank" rel="noopener">
                    <ExternalLink aria-hidden />
                    Паспорт
                  </a>
                </div>
                {active.passport.status !== 'published' && (
                  <p className="qr-hero__warn">
                    Паспорт закрыт: по коду откроется «Паспорт ещё не опубликован». После публикации код останется тем же.
                  </p>
                )}
              </div>
            </section>

            <section className="panel label-designer" aria-labelledby="label-h">
              <div className="panel__head">
                <h2 className="panel__title" id="label-h">
                  Этикетка
                </h2>
                <span className="muted label-designer__size mono">
                  {fmt.w} × {fmt.h} мм
                </span>
              </div>
              <div className="label-designer__body">
                <div className="label-formats" role="radiogroup" aria-label="Формат этикетки">
                  {LABEL_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={format === f.id}
                      className={cx('label-format', format === f.id && 'is-selected')}
                      onClick={() => setFormat(f.id)}
                    >
                      <span className="label-format__thumb" aria-hidden>
                        <Label format={f.id} product={active} company={company} logoHref={logoHref} displayWidth={f.w * 1.9} />
                      </span>
                      <span className="label-format__title">{f.title}</span>
                      <span className="label-format__size mono">
                        {f.w} × {f.h} мм
                      </span>
                      <span className="label-format__text">{f.text}</span>
                    </button>
                  ))}
                </div>

                <div className="label-stage">
                  <div className="label-stage__paper">
                    <Label
                      ref={labelRef}
                      format={format}
                      product={active}
                      company={company}
                      logoHref={logoHref}
                      displayWidth={fmt.w * 6.4}
                      className="label-stage__svg"
                    />
                  </div>
                  <p className="label-stage__note">Предпросмотр увеличен. При печати этикетка выходит в реальном размере.</p>
                </div>

                <div className="print-bar">
                  <div className="print-bar__opts">
                    <div className="field">
                      <span className="field__label">Принтер</span>
                      <Segmented
                        label="Режим печати"
                        value={mode}
                        onChange={setMode}
                        options={[
                          { value: 'roll', label: 'Этикеточный', title: 'Одна этикетка на страницу точного размера' },
                          { value: 'a4', label: 'Лист A4', title: 'Сетка этикеток с линиями реза' },
                        ]}
                      />
                    </div>
                    <div className="field">
                      <span className="field__label" id="copies-label">
                        Копий на изделие
                      </span>
                      <div className="stepper-input" role="group" aria-labelledby="copies-label">
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm"
                          onClick={() => setCopies((c) => Math.max(1, c - 1))}
                          aria-label="Меньше копий"
                          disabled={copies <= 1}
                        >
                          <Minus />
                        </button>
                        <span className="mono" aria-live="polite">
                          {copies}
                        </span>
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm"
                          onClick={() => setCopies((c) => Math.min(50, c + 1))}
                          aria-label="Больше копий"
                          disabled={copies >= 50}
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="print-bar__actions">
                    <span className="print-bar__summary">
                      {selected.size > 0 ? `Выбрано изделий: ${selected.size}` : 'Печатается выбранное изделие'}
                      {' · '}
                      {total} {plural(total, ['этикетка', 'этикетки', 'этикеток'])}
                    </span>
                    <button type="button" className="btn btn--secondary" onClick={downloadLabel}>
                      <Download aria-hidden />
                      SVG этикетки
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={batch.length === 0 || printer.printing}
                      onClick={() => printer.print({ products: batch, format, mode, copies, company, logoHref })}
                    >
                      <Printer aria-hidden />
                      Печать
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
      {printer.node}
    </div>
  );
}
