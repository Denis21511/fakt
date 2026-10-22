import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Database, Download, ImagePlus, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import { PassportView } from '../../components/passport/PassportView';
import { PhoneFrame } from '../../components/passport/PhoneFrame';
import { CompanyAvatar } from '../../components/product/CompanyAvatar';
import { Field, Switch } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { createDemoWorkspace } from '../../data/demo';
import { ACCEPTED_IMAGE_EXT, BRAND_COLOR_PRESETS } from '../../domain/catalog';
import { toPublicPassport } from '../../domain/passport';
import type { CompanySettings, PublicDisplay } from '../../domain/types';
import { useDocumentTitle } from '../../hooks/misc';
import { useLocalFileUrl } from '../../hooks/useBlobUrl';
import { inkOn, isHexColor } from '../../lib/color';
import { cx } from '../../lib/cx';
import { plural } from '../../lib/dates';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { repository, type StorageUsage } from '../../storage';
import { toast, toastError } from '../../state/toast';
import { useWorkspace, validateImageFile } from '../../state/workspace';
import '../../styles/passport.css';
import '../../styles/settings.css';

type LogoChange = { action: 'keep' } | { action: 'remove' } | { action: 'replace'; file: File };
type Errors = Partial<Record<'name' | 'email' | 'website' | 'brandColor', string>>;

const DISPLAY_OPTIONS: { key: keyof PublicDisplay; label: string; hint: string }[] = [
  { key: 'phone', label: 'Телефон', hint: 'Кнопка «Связаться по гарантии» звонит по нему' },
  { key: 'email', label: 'Электронная почта', hint: '' },
  { key: 'website', label: 'Сайт', hint: '' },
  { key: 'address', label: 'Адрес производства', hint: '' },
  { key: 'sku', label: 'Артикул изделия', hint: 'Скройте, если артикул — внутренний код' },
  { key: 'warrantyTerms', label: 'Условия гарантии', hint: 'Текст условий из карточки изделия' },
  { key: 'documents', label: 'Документы', hint: 'Только отмеченные «Показывать покупателю»' },
];

function validate(c: CompanySettings): Errors {
  const e: Errors = {};
  if (!c.name.trim()) e.name = 'Укажите название — оно стоит в шапке каждого паспорта';
  if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = 'Адрес почты выглядит неверно';
  if (c.website.trim() && !/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(c.website.trim())) e.website = 'Например: format-metall.ru';
  if (!isHexColor(c.brandColor)) e.brandColor = 'Цвет в формате #RRGGBB';
  return e;
}

export default function Settings() {
  useDocumentTitle('Настройки');
  const { company, products, documents, mode, saveCompany, restoreDemo, removeDemoData } = useWorkspace();
  const location = useLocation();
  const [draft, setDraft] = useState<CompanySettings>(company);
  const [logo, setLogo] = useState<LogoChange>({ action: 'keep' });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'restore' | 'clear' | null>(null);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const logoUrl = useLocalFileUrl(logo.action === 'replace' ? logo.file : null);

  // Перечитывание хранилища создаёт новый объект с теми же данными — черновик сбрасываем только при реальном изменении
  const companyJson = JSON.stringify(company);
  useEffect(() => setDraft(JSON.parse(companyJson) as CompanySettings), [companyJson]);

  useEffect(() => {
    if (location.hash === '#data') document.getElementById('data')?.scrollIntoView({ block: 'start' });
  }, [location.hash]);

  useEffect(() => {
    let alive = true;
    void repository.files
      .usage()
      .then((u) => alive && setUsage(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [documents, company]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(company) || logo.action !== 'keep';
  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setDisplay = (key: keyof PublicDisplay, value: boolean) => setDraft((d) => ({ ...d, publicDisplay: { ...d.publicDisplay, [key]: value } }));

  const save = async () => {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Проверьте поля', Object.values(e)[0]);
      return;
    }
    setSaving(true);
    try {
      await saveCompany({ ...draft, name: draft.name.trim(), email: draft.email.trim(), website: draft.website.trim() }, logo);
      setLogo({ action: 'keep' });
      toast.success('Настройки сохранены', 'Публичные паспорта уже показывают новые данные');
    } catch (err) {
      toastError('Настройки не сохранены', err);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(company);
    setLogo({ action: 'keep' });
    setErrors({});
  };

  const runDataAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'restore') {
        await restoreDemo();
        toast.success('Демо-данные восстановлены', '12 изделий «ФОРМАТ МЕТАЛЛ» в исходном виде');
      } else {
        await removeDemoData();
        toast.success('Демо-данные удалены', 'Заполните профиль компании и добавьте первое изделие');
      }
      setLogo({ action: 'keep' });
      setConfirm(null);
    } catch (err) {
      toastError('Операция не выполнена', err);
    } finally {
      setBusy(false);
    }
  };

  const exportJson = () => {
    const data = { exportedAt: new Date().toISOString(), format: 'trace-workspace@1', company, products, documents };
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      `trace-export-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  // Предпросмотр на реальном изделии: опубликованное или первое из каталога, иначе — пример
  const sample = products.find((p) => p.passport.status === 'published') ?? products[0] ?? createDemoWorkspace().products[0];
  const previewCompany: CompanySettings = { ...draft, logoFileId: logo.action === 'keep' ? draft.logoFileId : null };
  const passport = toPublicPassport(
    sample,
    documents.filter((d) => d.productId === sample.id),
    previewCompany,
  );
  const demoCount = products.filter((p) => p.demo).length;
  const ownCount = products.length - demoCount;
  const colorInk = isHexColor(draft.brandColor) ? inkOn(draft.brandColor) : '#171916';

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Настройки</h1>
          <p className="page-head__meta">Профиль компании и то, как выглядят публичные паспорта</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--ghost" onClick={reset} disabled={!dirty || saving}>
            <Undo2 aria-hidden />
            Отменить изменения
          </button>
          <button type="button" className="btn btn--dark" onClick={save} disabled={!dirty || saving}>
            {saving ? <span className="spinner" aria-hidden /> : <Save aria-hidden />}
            Сохранить изменения
          </button>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-main">
          <section className="panel settings-section" aria-labelledby="s-company">
            <div className="settings-section__head">
              <h2 id="s-company">Компания</h2>
              <p>Название стоит в шапке паспорта и на этикетках.</p>
            </div>
            <div className="settings-section__body form-grid">
              <Field label="Название компании" required error={errors.name}>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="ФОРМАТ МЕТАЛЛ"
                  maxLength={60}
                />
              </Field>
              <Field label="Юридическое название">
                <input
                  className="input"
                  value={draft.legalName}
                  onChange={(e) => set('legalName', e.target.value)}
                  placeholder="ООО «Формат Металл»"
                  maxLength={100}
                />
              </Field>
              <div className="field span-2">
                <span className="field__label">Логотип</span>
                <div className="logo-picker">
                  {logoUrl ? (
                    <span className="avatar" style={{ width: 64, height: 64 }}>
                      <img src={logoUrl} alt="Новый логотип" />
                    </span>
                  ) : (
                    <CompanyAvatar company={logo.action === 'remove' ? { ...draft, logoFileId: null } : draft} size={64} />
                  )}
                  <div className="logo-picker__actions">
                    <label className="btn btn--secondary btn--sm logo-picker__upload">
                      <ImagePlus aria-hidden />
                      {draft.logoFileId || logo.action === 'replace' ? 'Заменить' : 'Загрузить логотип'}
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_EXT}
                        className="visually-hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          const problem = validateImageFile(file);
                          if (problem) toast.error('Логотип не добавлен', problem);
                          else setLogo({ action: 'replace', file });
                        }}
                      />
                    </label>
                    {(draft.logoFileId || logo.action === 'replace') && logo.action !== 'remove' && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLogo({ action: 'remove' })}>
                        <Trash2 aria-hidden />
                        Убрать
                      </button>
                    )}
                    <span className="field__hint">PNG с прозрачным фоном, квадратный. Без логотипа показываются инициалы на фирменном цвете.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel settings-section" aria-labelledby="s-contacts">
            <div className="settings-section__head">
              <h2 id="s-contacts">Контакты</h2>
              <p>Покупатель увидит их в разделе «Производитель», если показ разрешён ниже.</p>
            </div>
            <div className="settings-section__body form-grid">
              <Field label="Телефон">
                <input
                  className="input"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+7 (343) 000-00-00"
                />
              </Field>
              <Field label="Электронная почта" error={errors.email}>
                <input
                  className="input"
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="service@company.ru"
                />
              </Field>
              <Field label="Сайт" error={errors.website}>
                <input className="input" value={draft.website} onChange={(e) => set('website', e.target.value)} placeholder="company.ru" />
              </Field>
              <Field label="Адрес">
                <input className="input" value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Город, улица, дом" />
              </Field>
            </div>
          </section>

          <section className="panel settings-section" aria-labelledby="s-passport">
            <div className="settings-section__head">
              <h2 id="s-passport">Публичный паспорт</h2>
              <p>Фирменный цвет и состав данных, которые видит покупатель.</p>
            </div>
            <div className="settings-section__body">
              <div className="field">
                <span className="field__label" id="brand-color-label">
                  Фирменный цвет паспорта
                </span>
                <div className="color-picker" role="group" aria-labelledby="brand-color-label">
                  {BRAND_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx('swatch', draft.brandColor.toLowerCase() === c.toLowerCase() && 'is-selected')}
                      style={{ background: c }}
                      onClick={() => set('brandColor', c)}
                      aria-label={`Цвет ${c}`}
                      aria-pressed={draft.brandColor.toLowerCase() === c.toLowerCase()}
                    />
                  ))}
                  <label className="color-custom">
                    <input
                      type="color"
                      value={isHexColor(draft.brandColor) ? draft.brandColor : '#C8F169'}
                      onChange={(e) => set('brandColor', e.target.value.toUpperCase())}
                      aria-label="Выбрать свой цвет"
                    />
                    <input
                      className="input input--mono"
                      value={draft.brandColor}
                      onChange={(e) => set('brandColor', e.target.value.trim())}
                      aria-label="Цвет в формате HEX"
                      aria-invalid={errors.brandColor ? true : undefined}
                      maxLength={7}
                    />
                  </label>
                  <span className="color-sample" style={isHexColor(draft.brandColor) ? { background: draft.brandColor, color: colorInk } : undefined}>
                    Гарантия действует
                  </span>
                </div>
                {errors.brandColor ? (
                  <p className="field__error">{errors.brandColor}</p>
                ) : (
                  <p className="field__hint">Цвет текста поверх фирменного подбирается автоматически, чтобы надписи оставались читаемыми.</p>
                )}
              </div>
              <div className="display-switches">
                <span className="field__label">Показывать в паспорте</span>
                {DISPLAY_OPTIONS.map((o) => (
                  <Switch
                    key={o.key}
                    label={o.label}
                    hint={o.hint || undefined}
                    checked={draft.publicDisplay[o.key]}
                    onChange={(v) => setDisplay(o.key, v)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="panel settings-section" id="data" aria-labelledby="s-data">
            <div className="settings-section__head">
              <h2 id="s-data">Данные</h2>
              <p>Где хранятся записи и как управлять демонстрационным набором.</p>
            </div>
            <div className="settings-section__body data-section">
              <div className="data-storage">
                <Database aria-hidden />
                <div>
                  <p className="data-storage__title">Локальное хранилище браузера</p>
                  <p className="data-storage__text">
                    Изделия и настройки — в localStorage, файлы — в IndexedDB этого браузера. Это демонстрационный режим, а не серверная база: данные
                    не синхронизируются между устройствами и сотрудниками. Слой хранения вынесен в отдельный модуль — подключение сервера не потребует
                    переделки экранов.
                  </p>
                  <p className="data-storage__stats mono">
                    {products.length} {plural(products.length, ['изделие', 'изделия', 'изделий'])} · {documents.length}{' '}
                    {plural(documents.length, ['документ', 'документа', 'документов'])}
                    {usage && ` · файлы ${formatBytes(usage.bytes)}`}
                  </p>
                </div>
              </div>

              <div className="data-actions">
                <div className="data-action">
                  <div>
                    <p className="data-action__title">Демонстрационные данные</p>
                    <p className="data-action__text">
                      {mode === 'demo'
                        ? `Открыт демо-набор «ФОРМАТ МЕТАЛЛ»: ${demoCount} ${plural(demoCount, ['изделие', 'изделия', 'изделий'])}${ownCount ? `, добавлено вами — ${ownCount}` : ''}.`
                        : demoCount
                          ? `Демо-изделий в каталоге: ${demoCount}.`
                          : 'Демо-данные удалены, в каталоге только ваши изделия.'}
                    </p>
                  </div>
                  <div className="data-action__btns">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConfirm('restore')}>
                      <RotateCcw aria-hidden />
                      Восстановить демо
                    </button>
                    {(mode === 'demo' || demoCount > 0) && (
                      <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm('clear')}>
                        <Trash2 aria-hidden />
                        Удалить демо-данные
                      </button>
                    )}
                  </div>
                </div>
                <div className="data-action">
                  <div>
                    <p className="data-action__title">Экспорт</p>
                    <p className="data-action__text">
                      JSON с изделиями, документами (без файлов) и настройками — для резервной копии или переноса на сервер.
                    </p>
                  </div>
                  <div className="data-action__btns">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={exportJson}>
                      <Download aria-hidden />
                      Скачать JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="settings-preview" aria-label="Предпросмотр паспорта">
          <PhoneFrame>
            <PassportView passport={passport} logoOverride={logoUrl} compact />
          </PhoneFrame>
          <p className="settings-preview__note">{dirty ? 'Предпросмотр с несохранёнными изменениями' : `Паспорт изделия «${sample.name}»`}</p>
        </aside>
      </div>

      {dirty && (
        <div className="savebar" role="region" aria-label="Несохранённые изменения">
          <span>Есть несохранённые изменения</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset} disabled={saving}>
            Отменить
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving}>
            Сохранить
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'restore' ? 'Восстановить демо-данные?' : 'Удалить демо-данные?'}
        text={
          confirm === 'restore'
            ? 'Каталог, документы и настройки вернутся к исходному набору «ФОРМАТ МЕТАЛЛ». Изделия, которые вы добавили, и их файлы будут удалены.'
            : `Будут удалены ${demoCount} демо-${plural(demoCount, ['изделие', 'изделия', 'изделий'])} с документами и профиль демо-компании. Ваши изделия (${ownCount}) останутся.`
        }
        confirmLabel={confirm === 'restore' ? 'Восстановить' : 'Удалить демо-данные'}
        danger
        busy={busy}
        onConfirm={runDataAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
