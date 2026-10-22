import { useEffect, useRef, type ReactNode } from 'react';
import { CalendarCheck, Check, FileImage, FileText, Plus, RotateCcw, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { CornerMarks } from '../../../components/brand/Logo';
import { ProductDrawing, DRAWING_OPTIONS } from '../../../components/product/ProductDrawing';
import { ProductImage } from '../../../components/product/ProductImage';
import { QrCode } from '../../../components/product/QrCode';
import { WarrantyBadge } from '../../../components/ui/Badges';
import { Field } from '../../../components/ui/Field';
import { FileDrop } from '../../../components/ui/FileDrop';
import {
  ACCEPTED_DOCUMENT_EXT,
  ACCEPTED_IMAGE_EXT,
  CATEGORIES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABEL,
  MAX_DOCUMENT_BYTES,
  WARRANTY_PRESETS,
} from '../../../domain/catalog';
import type { PassportStatus, Product, ProductDocument } from '../../../domain/types';
import type { FieldErrors, FormField, ProductFormValues } from '../../../domain/validation';
import { parseIntOrNull } from '../../../domain/validation';
import { warrantyInfo } from '../../../domain/warranty';
import { useLocalFileUrl } from '../../../hooks/useBlobUrl';
import { cx } from '../../../lib/cx';
import { addMonths, formatDate, isValidISODate, monthsLabel, todayISO } from '../../../lib/dates';
import { formatBytes } from '../../../lib/format';
import { uid } from '../../../lib/id';
import { passportUrl } from '../../../lib/qr';
import { toast } from '../../../state/toast';
import { validateDocumentFile, validateImageFile } from '../../../state/workspace';
import { guessDocType, titleFromFile } from '../../../domain/documents';
import { DEFAULT_TERMS, SPEC_SUGGESTIONS, suggestSerial, type EditorState } from './model';

export interface StepProps {
  state: EditorState;
  errors: FieldErrors;
  setValue: <K extends FormField>(key: K, value: ProductFormValues[K]) => void;
  update: (fn: (s: EditorState) => EditorState) => void;
  base: Product | null;
  products: Product[];
  existingDocs: ProductDocument[];
  token: string;
}

function StepHead({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="step-head">
      <h2 className="step-head__title" tabIndex={-1}>
        {title}
      </h2>
      <p className="step-head__text">{text}</p>
    </div>
  );
}

/* ───────── 1. Основная информация ───────── */

export function StepBasics({ state, errors, setValue, update, base, products }: StepProps) {
  const v = state.values;
  return (
    <>
      <StepHead title="Основная информация" text="То, по чему изделие находят в каталоге и узнают на этикетке. Поля со звёздочкой обязательны." />
      <div className="form-grid">
        <Field label="Название" required error={errors.name} className="span-2" hint="Как изделие называется для покупателя: тип и модель">
          <input
            className="input"
            value={v.name}
            onChange={(e) => setValue('name', e.target.value)}
            placeholder="Например: Входная дверь «Контур 01»"
            maxLength={140}
            data-autofocus
          />
        </Field>
        <Field label="Категория" required error={errors.category}>
          <select className="select" value={v.category} onChange={(e) => setValue('category', e.target.value as ProductFormValues['category'])}>
            <option value="" disabled>
              Выберите категорию
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Артикул" required error={errors.sku} hint="Код модели в вашей номенклатуре">
          <input
            className="input input--mono"
            value={v.sku}
            onChange={(e) => setValue('sku', e.target.value.toUpperCase())}
            placeholder="KNT-01-960L"
            maxLength={40}
          />
        </Field>
        <Field
          label="Серийный номер"
          required
          error={errors.serial}
          hint="Уникален для каждого изделия — печатается на этикетке и в паспорте"
          className="span-2 field--serial"
        >
          {(control) => (
            <div className="input-with-action">
              <input
                {...control}
                className="input input--mono"
                value={v.serial}
                onChange={(e) => setValue('serial', e.target.value.toUpperCase())}
                placeholder="FM-2610-0548"
                maxLength={40}
              />
              <button type="button" className="btn btn--secondary" onClick={() => setValue('serial', suggestSerial(products))}>
                <Wand2 aria-hidden />
                Следующий номер
              </button>
            </div>
          )}
        </Field>
        <Field label="Описание" error={errors.description} className="span-2" hint="Одно-два предложения: для чего изделие и чем отличается">
          <textarea className="textarea" rows={3} value={v.description} onChange={(e) => setValue('description', e.target.value)} maxLength={1000} />
        </Field>
      </div>

      <div className="subsection">
        <h3 className="subsection__title">Изображение</h3>
        <PhotoPicker state={state} update={update} base={base} />
      </div>
    </>
  );
}

function PhotoPicker({ state, update, base }: Pick<StepProps, 'state' | 'update' | 'base'>) {
  const change = state.photo;
  const localUrl = useLocalFileUrl(change.action === 'replace' ? change.file : null);
  const current =
    change.action === 'drawing' ? ({ kind: 'drawing', variant: change.variant } as const) : change.action === 'keep' ? (base?.photo ?? null) : null;
  const hasImage = change.action === 'replace' || Boolean(current);

  const onFiles = (files: File[]) => {
    const file = files[0];
    const problem = validateImageFile(file);
    if (problem) {
      toast.error('Фотография не добавлена', `${file.name}: ${problem}`);
      return;
    }
    update((s) => ({ ...s, photo: { action: 'replace', file } }));
  };

  return (
    <div className="photo-picker">
      <div className="photo-picker__preview">
        {change.action === 'replace' && localUrl ? (
          <div className="pimg">
            <img src={localUrl} alt="Выбранная фотография" className="pimg__photo" />
          </div>
        ) : (
          <ProductImage photo={current} alt="Изображение изделия" />
        )}
        <CornerMarks inset={8} size={12} color="rgba(32,34,31,.45)" />
      </div>
      <div className="photo-picker__options">
        <FileDrop
          accept={ACCEPTED_IMAGE_EXT}
          onFiles={onFiles}
          label="Загрузить фотографию изделия"
          title={change.action === 'replace' ? `Выбрано: ${change.file.name}` : 'Загрузить фотографию'}
          hint="JPG, PNG или WEBP. Большие снимки уменьшаются до 1600 px"
          compact
        />
        <p className="photo-picker__or">Нет фотографии — используйте техническую схему</p>
        <div className="drawing-grid" role="radiogroup" aria-label="Техническая схема">
          {DRAWING_OPTIONS.map((o) => {
            const selected = current?.kind === 'drawing' && current.variant === o.variant;
            return (
              <button
                key={o.variant}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cx('drawing-opt', selected && 'is-selected')}
                onClick={() => update((s) => ({ ...s, photo: { action: 'drawing', variant: o.variant } }))}
                title={o.label}
              >
                <ProductDrawing variant={o.variant} />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
        <div className="photo-picker__actions">
          {hasImage && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update((s) => ({ ...s, photo: { action: 'remove' } }))}>
              <X aria-hidden />
              Убрать изображение
            </button>
          )}
          {base?.photo && change.action !== 'keep' && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update((s) => ({ ...s, photo: { action: 'keep' } }))}>
              <RotateCcw aria-hidden />
              Вернуть прежнее
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── 2. Характеристики ───────── */

export function StepSpecs({ state, errors, setValue }: StepProps) {
  const v = state.values;
  const suggestions = v.category ? SPEC_SUGGESTIONS[v.category].filter((s) => !v.specs.some((x) => x.label === s)) : [];
  return (
    <>
      <StepHead title="Характеристики" text="Технические данные из паспорта изделия. Покупатель увидит их в разделе «Характеристики»." />
      <div className="form-grid">
        <Field label="Производитель" required error={errors.manufacturer}>
          <input className="input" value={v.manufacturer} onChange={(e) => setValue('manufacturer', e.target.value)} />
        </Field>
        <Field label="Модель" error={errors.model}>
          <input className="input" value={v.model} onChange={(e) => setValue('model', e.target.value)} placeholder="Контур 01" />
        </Field>
        <Field label="Материал" className="span-2" error={errors.material}>
          <input
            className="input"
            value={v.material}
            onChange={(e) => setValue('material', e.target.value)}
            placeholder="Сталь 1,5 мм, базальтовая вата"
          />
        </Field>
        <fieldset className="span-2 dims">
          <legend className="field__label">Размеры, мм</legend>
          <div className="dims__row">
            {(
              [
                ['width', 'Ширина'],
                ['height', 'Высота'],
                ['depth', 'Глубина'],
              ] as const
            ).map(([key, label], i) => (
              <Field key={key} label={label} error={errors[key]}>
                {(control) => (
                  <div className="input-affix input-affix--suffix">
                    <input
                      {...control}
                      className="input input--mono"
                      inputMode="numeric"
                      value={v[key]}
                      onChange={(e) => setValue(key, e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder={['960', '2050', '90'][i]}
                    />
                    <span className="input-affix__suffix">мм</span>
                  </div>
                )}
              </Field>
            ))}
          </div>
        </fieldset>
        <Field label="Цвет и отделка" error={errors.color}>
          <input className="input" value={v.color} onChange={(e) => setValue('color', e.target.value)} placeholder="Графит муар RAL 7024" />
        </Field>
        <Field label="Дата изготовления" required error={errors.manufacturedAt}>
          <input
            className="input input--mono"
            type="date"
            value={v.manufacturedAt}
            max={todayISO()}
            onChange={(e) => setValue('manufacturedAt', e.target.value)}
          />
        </Field>
      </div>

      <div className="subsection">
        <h3 className="subsection__title">Комплектация</h3>
        <p className="subsection__hint">Что покупатель получает вместе с изделием. Каждая позиция — отдельной строкой.</p>
        <ListEditor
          items={v.equipment}
          onChange={(items) => setValue('equipment', items)}
          placeholder="Например: Замок сувальдный, 3 класс"
          addLabel="Добавить позицию"
          itemLabel="Позиция комплектации"
        />
      </div>

      <div className="subsection">
        <h3 className="subsection__title">Дополнительные характеристики</h3>
        <p className="subsection__hint">Класс взломостойкости, масса, предел огнестойкости — всё, что важно для этого типа изделий.</p>
        <div className="spec-rows">
          {v.specs.map((s, i) => (
            <div key={i} className="spec-row">
              <input
                className="input"
                value={s.label}
                aria-label={`Параметр ${i + 1}`}
                placeholder="Параметр"
                onChange={(e) =>
                  setValue(
                    'specs',
                    v.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  )
                }
              />
              <input
                className="input"
                value={s.value}
                aria-label={`Значение параметра ${i + 1}`}
                placeholder="Значение"
                onChange={(e) =>
                  setValue(
                    'specs',
                    v.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                  )
                }
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Удалить параметр ${s.label || i + 1}`}
                onClick={() =>
                  setValue(
                    'specs',
                    v.specs.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <div className="chips-row">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setValue('specs', [...v.specs, { label: '', value: '' }])}>
            <Plus aria-hidden />
            Добавить характеристику
          </button>
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setValue('specs', [...v.specs, { label: s, value: '' }])}>
              <Plus aria-hidden />
              {s}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  itemLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  useEffect(() => {
    if (!focusLast.current) return;
    focusLast.current = false;
    listRef.current?.querySelector<HTMLInputElement>('.list-row:last-child input')?.focus();
  }, [items.length]);
  const add = () => {
    focusLast.current = true;
    onChange([...items, '']);
  };
  return (
    <>
      <div className="list-rows" ref={listRef}>
        {items.map((item, i) => (
          <div key={i} className="list-row">
            <span className="list-row__n mono" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              className="input"
              value={item}
              aria-label={`${itemLabel} ${i + 1}`}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (i === items.length - 1 && item.trim()) add();
                }
              }}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Удалить: ${item || `${itemLabel} ${i + 1}`}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--secondary btn--sm" onClick={add}>
        <Plus aria-hidden />
        {addLabel}
      </button>
    </>
  );
}

/* ───────── 3. Гарантия ───────── */

export function StepWarranty({ state, errors, setValue }: StepProps) {
  const v = state.values;
  const months = parseIntOrNull(v.warrantyMonths);
  const end = months && months > 0 && isValidISODate(v.warrantyStart) ? addMonths(v.warrantyStart, months) : null;
  const info = warrantyInfo({
    months: months && months > 0 ? months : null,
    startDate: isValidISODate(v.warrantyStart) ? v.warrantyStart : null,
    terms: '',
  });
  const custom = v.warrantyMonths !== '' && !WARRANTY_PRESETS.includes(Number(v.warrantyMonths));

  return (
    <>
      <StepHead title="Гарантия" text="Срок и условия попадут в паспорт. Статус гарантии пересчитывается автоматически каждый день." />
      <div className="form-grid">
        <div className="field span-2">
          <span className="field__label" id="warranty-term-label">
            Срок гарантии
          </span>
          <div className="term-picker" role="group" aria-labelledby="warranty-term-label">
            <button
              type="button"
              className={cx('term', v.warrantyMonths === '' && 'is-selected')}
              aria-pressed={v.warrantyMonths === ''}
              onClick={() => setValue('warrantyMonths', '')}
            >
              Без гарантии
            </button>
            {WARRANTY_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className={cx('term', Number(v.warrantyMonths) === m && 'is-selected')}
                aria-pressed={Number(v.warrantyMonths) === m}
                onClick={() => {
                  setValue('warrantyMonths', String(m));
                  if (!v.warrantyStart) setValue('warrantyStart', v.manufacturedAt || todayISO());
                }}
              >
                {monthsLabel(m)}
              </button>
            ))}
            <div className={cx('term term--input', custom && 'is-selected')}>
              <input
                className="input input--mono"
                inputMode="numeric"
                aria-label="Другой срок, месяцев"
                placeholder="Другой"
                value={custom ? v.warrantyMonths : ''}
                onChange={(e) => {
                  setValue('warrantyMonths', e.target.value.replace(/\D/g, ''));
                  if (!v.warrantyStart && e.target.value) setValue('warrantyStart', v.manufacturedAt || todayISO());
                }}
              />
              <span>мес.</span>
            </div>
          </div>
          {errors.warrantyMonths && (
            <p className="field__error" role="alert">
              {errors.warrantyMonths}
            </p>
          )}
        </div>

        <Field label="Дата начала" required={Boolean(v.warrantyMonths)} error={errors.warrantyStart} hint="Обычно — дата продажи или монтажа">
          <input className="input input--mono" type="date" value={v.warrantyStart} onChange={(e) => setValue('warrantyStart', e.target.value)} />
        </Field>
        <div className="field">
          <span className="field__label">Быстрый выбор</span>
          <div className="chips-row chips-row--tight">
            <button
              type="button"
              className="chip"
              onClick={() => setValue('warrantyStart', v.manufacturedAt)}
              disabled={!isValidISODate(v.manufacturedAt)}
            >
              <CalendarCheck aria-hidden />С даты изготовления
            </button>
            <button type="button" className="chip" onClick={() => setValue('warrantyStart', todayISO())}>
              <CalendarCheck aria-hidden />С сегодняшнего дня
            </button>
          </div>
        </div>

        <div className="warranty-summary span-2" aria-live="polite">
          <div className="warranty-summary__cell">
            <span>Начало</span>
            <strong className="mono">{formatDate(v.warrantyStart || null)}</strong>
          </div>
          <div className="warranty-summary__cell">
            <span>Окончание</span>
            <strong className="mono">{end ? formatDate(end) : '—'}</strong>
          </div>
          <div className="warranty-summary__cell">
            <span>Статус на сегодня</span>
            <WarrantyBadge status={info.status} plain sub={info.remaining ?? undefined} />
          </div>
        </div>

        <Field
          label="Условия гарантии"
          className="span-2"
          error={errors.warrantyTerms}
          hint="Что покрывает гарантия и что нет. Показывается покупателю, если это разрешено в настройках."
        >
          <textarea className="textarea" rows={5} value={v.warrantyTerms} onChange={(e) => setValue('warrantyTerms', e.target.value)} />
        </Field>
        {v.category && !v.warrantyTerms.trim() && (
          <div className="span-2">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setValue('warrantyTerms', DEFAULT_TERMS[v.category as keyof typeof DEFAULT_TERMS])}
            >
              <Sparkles aria-hidden />
              Подставить типовые условия
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ───────── 4. Документы ───────── */

export function StepDocuments({ state, update, existingDocs }: StepProps) {
  const kept = existingDocs.filter((d) => !state.removedDocIds.includes(d.id));
  const all = [...kept.map((d) => d.type), ...state.newDocs.map((d) => d.type)];

  const onFiles = (files: File[]) => {
    const accepted: EditorState['newDocs'] = [];
    for (const file of files) {
      const problem = validateDocumentFile(file);
      if (problem) toast.error('Файл не добавлен', `${file.name}: ${problem}`);
      else accepted.push({ key: uid(), file, title: titleFromFile(file.name), type: guessDocType(file.name), isPublic: true });
    }
    if (accepted.length) update((s) => ({ ...s, newDocs: [...s.newDocs, ...accepted] }));
  };

  const patchNew = (key: string, patch: Partial<EditorState['newDocs'][number]>) =>
    update((s) => ({ ...s, newDocs: s.newDocs.map((d) => (d.key === key ? { ...d, ...patch } : d)) }));

  return (
    <>
      <StepHead
        title="Документы"
        text="Инструкция, паспорт качества, сертификаты. Файлы сохраняются вместе с изделием; отмеченные как публичные увидит покупатель."
      />
      <ul className="doc-checklist" aria-label="Рекомендуемые документы">
        {(['instruction', 'quality', 'certificate'] as const).map((t) => {
          const has = all.includes(t);
          return (
            <li key={t} className={cx(has && 'is-done')}>
              <span className="doc-checklist__mark" aria-hidden>
                {has && <Check />}
              </span>
              {DOCUMENT_TYPE_LABEL[t]}
              <span className="doc-checklist__state">{has ? 'добавлен' : t === 'instruction' ? 'рекомендуется' : 'по необходимости'}</span>
            </li>
          );
        })}
      </ul>

      <FileDrop
        accept={ACCEPTED_DOCUMENT_EXT}
        multiple
        onFiles={onFiles}
        label="Добавить документы"
        title="Перетащите файлы или выберите на компьютере"
        hint={`PDF, JPG, PNG, WEBP — до ${formatBytes(MAX_DOCUMENT_BYTES)} каждый`}
      />

      {(existingDocs.length > 0 || state.newDocs.length > 0) && (
        <ul className="doc-edit-list">
          {existingDocs.map((d) => {
            const removed = state.removedDocIds.includes(d.id);
            return (
              <li key={d.id} className={cx('doc-edit', removed && 'is-removed')}>
                <span className="doc-edit__icon">{d.mime.startsWith('image/') ? <FileImage aria-hidden /> : <FileText aria-hidden />}</span>
                <div className="doc-edit__text">
                  <span className="doc-edit__title">{d.title}</span>
                  <span className="doc-edit__meta">
                    {DOCUMENT_TYPE_LABEL[d.type]} · {d.size ? formatBytes(d.size) : 'PDF'} ·{' '}
                    {d.isPublic ? 'виден покупателю' : 'только для производства'}
                    {removed && ' · будет удалён при сохранении'}
                  </span>
                </div>
                {removed ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => update((s) => ({ ...s, removedDocIds: s.removedDocIds.filter((x) => x !== d.id) }))}
                  >
                    <RotateCcw aria-hidden />
                    Вернуть
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Удалить документ: ${d.title}`}
                    onClick={() => update((s) => ({ ...s, removedDocIds: [...s.removedDocIds, d.id] }))}
                  >
                    <Trash2 />
                  </button>
                )}
              </li>
            );
          })}
          {state.newDocs.map((d) => (
            <li key={d.key} className="doc-edit doc-edit--new">
              <span className="doc-edit__icon">{d.file.type.startsWith('image/') ? <FileImage aria-hidden /> : <FileText aria-hidden />}</span>
              <div className="doc-edit__fields">
                <input
                  className="input"
                  value={d.title}
                  aria-label={`Название документа ${d.file.name}`}
                  onChange={(e) => patchNew(d.key, { title: e.target.value })}
                />
                <select
                  className="select"
                  value={d.type}
                  aria-label={`Тип документа ${d.file.name}`}
                  onChange={(e) => patchNew(d.key, { type: e.target.value as typeof d.type })}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="check">
                  <input type="checkbox" checked={d.isPublic} onChange={(e) => patchNew(d.key, { isPublic: e.target.checked })} />
                  Показывать покупателю
                </label>
                <span className="doc-edit__meta">
                  <span className="tag">Новый</span> {d.file.name} · {formatBytes(d.file.size)}
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Убрать файл ${d.file.name}`}
                onClick={() => update((s) => ({ ...s, newDocs: s.newDocs.filter((x) => x.key !== d.key) }))}
              >
                <X />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────── 5. Публикация ───────── */

export function StepPublish({ state, setValue, base, token, existingDocs }: StepProps) {
  const v = state.values;
  const url = passportUrl(base?.token ?? token);
  const hasPhoto = state.photo.action === 'replace' || state.photo.action === 'drawing' || (state.photo.action === 'keep' && Boolean(base?.photo));
  const docs = [...existingDocs.filter((d) => !state.removedDocIds.includes(d.id)).map((d) => d.type), ...state.newDocs.map((d) => d.type)];
  const checks: { ok: boolean; label: string; hint: string }[] = [
    { ok: Boolean(v.name && v.serial && v.sku && v.category), label: 'Основная информация', hint: 'Название, артикул, серийный номер' },
    { ok: Boolean(v.manufacturer && v.manufacturedAt), label: 'Характеристики', hint: 'Производитель и дата изготовления' },
    { ok: hasPhoto, label: 'Изображение', hint: hasPhoto ? 'Фото или схема выбраны' : 'Без изображения паспорт выглядит пустым' },
    {
      ok: Boolean(v.warrantyMonths && v.warrantyStart),
      label: 'Гарантия',
      hint: v.warrantyMonths ? 'Срок и дата начала указаны' : 'Не указана — покупатель увидит «Гарантия не указана»',
    },
    {
      ok: docs.includes('instruction'),
      label: 'Инструкция',
      hint: docs.includes('instruction') ? 'Приложена' : 'Покупатели чаще всего ищут именно её',
    },
  ];
  const options: { id: PassportStatus; title: string; text: string }[] = [
    { id: 'published', title: 'Опубликовать паспорт', text: 'Покупатель увидит паспорт по QR-коду сразу после сохранения.' },
    { id: 'draft', title: 'Сохранить черновик', text: 'Паспорт закрыт. Этикетку можно напечатать заранее — код не изменится.' },
  ];
  if (base?.passport.status === 'withdrawn') {
    options.push({ id: 'withdrawn', title: 'Оставить снятым с публикации', text: 'Паспорт был опубликован, сейчас закрыт для покупателей.' });
  }

  return (
    <>
      <StepHead
        title="Публикация"
        text="Проверьте паспорт и решите, открыть ли его покупателям. QR-код уже сформирован и ведёт на постоянный адрес."
      />
      <div className="publish-grid">
        <div className="publish-main">
          <div className="status-options" role="radiogroup" aria-label="Статус паспорта">
            {options.map((o) => (
              <label key={o.id} className={cx('status-option', v.passportStatus === o.id && 'is-selected')}>
                <input type="radio" name="passport-status" checked={v.passportStatus === o.id} onChange={() => setValue('passportStatus', o.id)} />
                <span className="status-option__title">{o.title}</span>
                <span className="status-option__text">{o.text}</span>
              </label>
            ))}
          </div>

          <ul className="readiness" aria-label="Готовность паспорта">
            {checks.map((c) => (
              <li key={c.label} className={cx(c.ok && 'is-ok')}>
                <span className="readiness__mark" aria-hidden>
                  {c.ok ? <Check /> : '!'}
                </span>
                <span className="readiness__label">{c.label}</span>
                <span className="readiness__hint">{c.hint}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="qr-card">
          <div className="qr-card__code">
            <CornerMarks size={14} color="#C8F169" />
            <QrCode value={url} margin={1} title="QR-код паспорта" />
          </div>
          <div className="qr-card__info">
            <span className="qr-card__label">QR-код паспорта</span>
            <span className="qr-card__serial mono">{v.serial || 'серийный номер не указан'}</span>
            <span className="qr-card__url mono">{url}</span>
          </div>
        </div>
      </div>
    </>
  );
}
