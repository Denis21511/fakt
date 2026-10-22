import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Eye, PackageSearch, Save } from 'lucide-react';
import { PassportView } from '../../components/passport/PassportView';
import { PhoneFrame } from '../../components/passport/PhoneFrame';
import { ProductImage } from '../../components/product/ProductImage';
import { EmptyState } from '../../components/ui/Badges';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { toPublicPassport } from '../../domain/passport';
import {
  emptyFormValues,
  firstStepWithError,
  productToForm,
  STEP_FIELDS,
  validateProductForm,
  type FieldErrors,
  type FormField,
  type ProductFormValues,
  type StepId,
} from '../../domain/validation';
import { useDocumentTitle } from '../../hooks/misc';
import { useLocalFileUrl } from '../../hooks/useBlobUrl';
import { cx } from '../../lib/cx';
import { passportToken } from '../../lib/id';
import { toast, toastError } from '../../state/toast';
import { useWorkspace } from '../../state/workspace';
import { photoAfterChange, previewDocuments, previewProduct, STEPS, type EditorState } from './editor/model';
import { StepBasics, StepDocuments, StepPublish, StepSpecs, StepWarranty, type StepProps } from './editor/steps';
import '../../styles/editor.css';
import '../../styles/passport.css';

const STEP_COMPONENTS: Record<StepId, (p: StepProps) => JSX.Element> = {
  basics: StepBasics,
  specs: StepSpecs,
  warranty: StepWarranty,
  documents: StepDocuments,
  publish: StepPublish,
};

export default function ProductEditor() {
  const { id } = useParams();
  const products = useWorkspace((s) => s.products);
  const base = id ? (products.find((p) => p.id === id) ?? null) : null;

  if (id && !base) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            icon={<PackageSearch />}
            title="Изделие не найдено"
            text="Возможно, его удалили. Вернитесь в каталог и выберите другое изделие."
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
  return <Editor key={id ?? 'new'} base={base} />;
}

function Editor({ base }: { base: ReturnType<typeof useWorkspace.getState>['products'][number] | null }) {
  const navigate = useNavigate();
  const { products, documents, company, saveProduct } = useWorkspace();
  const isNew = !base;
  useDocumentTitle(isNew ? 'Новое изделие' : `Редактирование — ${base.name}`);

  const [token] = useState(() => base?.token ?? passportToken());
  const initial = useMemo<EditorState>(() => {
    const values = base ? productToForm(base) : { ...emptyFormValues(), manufacturer: company.name };
    return { values, photo: { action: 'keep' }, newDocs: [], removedDocIds: [] };
  }, []);
  const [state, setState] = useState<EditorState>(initial);
  const [step, setStep] = useState<StepId>('basics');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [validated, setValidated] = useState<Set<StepId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const existingDocs = useMemo(() => (base ? documents.filter((d) => d.productId === base.id) : []), [base, documents]);

  const dirty =
    JSON.stringify(state.values) !== JSON.stringify(initial.values) ||
    state.photo.action !== 'keep' ||
    state.newDocs.length > 0 ||
    state.removedDocIds.length > 0;

  useEffect(() => {
    if (!dirty || saving) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, saving]);

  const ctx = { products, selfId: base?.id ?? null };

  // После первой проверки шага ошибки обновляются по мере ввода
  useEffect(() => {
    if (validated.size === 0) return;
    const all = validateProductForm(state.values, ctx);
    const visible: FieldErrors = {};
    for (const s of validated) for (const f of STEP_FIELDS[s]) if (all[f]) visible[f] = all[f];
    setErrors(visible);
  }, [state.values, validated]);

  const update = (fn: (s: EditorState) => EditorState) => setState(fn);
  const setValue = <K extends FormField>(key: K, value: ProductFormValues[K]) => setState((s) => ({ ...s, values: { ...s.values, [key]: value } }));

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const allErrors = validateProductForm(state.values, ctx);
  const stepHasError = (s: StepId) => validated.has(s) && STEP_FIELDS[s].some((f) => allErrors[f]);

  // Смена шага: панель — в поле зрения, фокус — на заголовок шага (для клавиатуры и экранных дикторов)
  const stepChanged = useRef(false);
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    panel.querySelector<HTMLElement>('.step-head__title')?.focus({ preventScroll: true });
  }, [step]);

  const focusFirstInvalid = useRef(false);
  useEffect(() => {
    if (!focusFirstInvalid.current) return;
    // Ошибки появляются в разметке на следующем рендере — ждём, пока поле станет помеченным
    const field = panelRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!field) return;
    focusFirstInvalid.current = false;
    field.focus();
  });

  const goTo = (next: StepId) => {
    stepChanged.current = true;
    setStep(next);
  };

  const next = () => {
    const stepErrors = STEP_FIELDS[step].filter((f) => allErrors[f]);
    setValidated((v) => new Set(v).add(step));
    if (stepErrors.length > 0) {
      focusFirstInvalid.current = true;
      return;
    }
    if (stepIndex < STEPS.length - 1) goTo(STEPS[stepIndex + 1].id);
  };

  const save = async () => {
    const order = STEPS.map((s) => s.id);
    setValidated(new Set(order));
    const bad = firstStepWithError(allErrors, order);
    if (bad) {
      setStep(bad);
      toast.error('Проверьте заполнение', `Шаг «${STEPS.find((s) => s.id === bad)!.title}» содержит ошибки`);
      focusFirstInvalid.current = true;
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProduct({
        id: base?.id ?? null,
        token,
        values: state.values,
        photo: state.photo,
        newDocuments: state.newDocs.map(({ file, title, type, isPublic }) => ({ file, title, type, isPublic })),
        removedDocumentIds: state.removedDocIds,
      });
      toast.success(isNew ? 'Изделие создано' : 'Изменения сохранены', saved.name);
      navigate(`/app/products/${saved.id}`, { replace: true, state: { saved: isNew ? 'created' : 'updated' } });
    } catch (err) {
      toastError('Изделие не сохранено', err);
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirty) setLeaving(true);
    else navigate(base ? `/app/products/${base.id}` : '/app/products');
  };

  // Предпросмотр паспорта из текущего состояния формы
  const localPhotoUrl = useLocalFileUrl(state.photo.action === 'replace' ? state.photo.file : null);
  const previewP = previewProduct(state.values, base, token, photoAfterChange(base, state.photo));
  const passport = toPublicPassport(previewP, previewDocuments(previewP.id, existingDocs, state), company);
  const photoOverride = localPhotoUrl ? <img src={localPhotoUrl} alt="" /> : undefined;

  const StepComponent = STEP_COMPONENTS[step];
  const stepProps: StepProps = { state, errors, setValue, update, base, products, existingDocs, token };

  return (
    <div className="page editor-page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to="/app/products">Изделия</Link>
        <ChevronRight aria-hidden />
        {base ? <Link to={`/app/products/${base.id}`}>{base.name}</Link> : <span>Новое изделие</span>}
        {base && (
          <>
            <ChevronRight aria-hidden />
            <span>Редактирование</span>
          </>
        )}
      </nav>
      <header className="page-head">
        <div className="editor-title">
          {base && <ProductImage photo={base.photo} alt="" size="thumb" />}
          <div>
            <h1 className="page-head__title">{isNew ? 'Новое изделие' : state.values.name || base.name}</h1>
            <p className="page-head__meta">
              {isNew ? 'Пять шагов: от названия до QR-кода' : <span className="mono">{state.values.serial}</span>}
              {dirty && <span className="unsaved">Есть несохранённые изменения</span>}
            </p>
          </div>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--ghost" onClick={cancel} disabled={saving}>
            Отмена
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setPreview(true)}>
            <Eye aria-hidden />
            Предпросмотр
          </button>
          <button type="button" className="btn btn--dark" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" aria-hidden /> : <Save aria-hidden />}
            {isNew ? 'Сохранить изделие' : 'Сохранить'}
          </button>
        </div>
      </header>

      <div className="editor">
        <ol className="stepper" aria-label="Шаги заполнения">
          {STEPS.map((s, i) => {
            const done = i < stepIndex && !stepHasError(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={cx('stepper__item', s.id === step && 'is-current', done && 'is-done', stepHasError(s.id) && 'has-error')}
                  aria-current={s.id === step ? 'step' : undefined}
                  onClick={() => goTo(s.id)}
                >
                  <span className="stepper__num mono" aria-hidden>
                    {stepHasError(s.id) ? '!' : done ? <Check /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="stepper__text">
                    <span className="stepper__title">{s.title}</span>
                    <span className="stepper__hint">{stepHasError(s.id) ? 'Есть ошибки' : s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className={cx('editor__body', step === 'publish' && 'editor__body--wide')}>
          <section className="panel step-panel" ref={panelRef} aria-label={STEPS[stepIndex].title}>
            <div className="step-panel__inner" key={step}>
              <StepComponent {...stepProps} />
            </div>
            <footer className="step-nav">
              <span className="step-nav__count mono">
                Шаг {stepIndex + 1} из {STEPS.length}
              </span>
              <div className="step-nav__btns">
                {stepIndex > 0 && (
                  <button type="button" className="btn btn--secondary" onClick={() => goTo(STEPS[stepIndex - 1].id)}>
                    <ArrowLeft aria-hidden />
                    Назад
                  </button>
                )}
                {stepIndex < STEPS.length - 1 ? (
                  <button type="button" className="btn btn--dark" onClick={next}>
                    Далее: {STEPS[stepIndex + 1].title.toLowerCase()}
                    <ArrowRight aria-hidden />
                  </button>
                ) : (
                  <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
                    {saving ? <span className="spinner" aria-hidden /> : <Check aria-hidden />}
                    {state.values.passportStatus === 'published' ? 'Сохранить и опубликовать' : 'Сохранить изделие'}
                  </button>
                )}
              </div>
            </footer>
          </section>

          {step === 'publish' && (
            <aside className="editor-preview" aria-label="Предпросмотр паспорта">
              <PhoneFrame>
                <PassportView passport={passport} photoOverride={photoOverride} compact />
              </PhoneFrame>
              <p className="editor-preview__note">Так паспорт увидит покупатель на телефоне</p>
            </aside>
          )}
        </div>
      </div>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Предпросмотр паспорта"
        subtitle="Несохранённые изменения уже учтены"
        size="md"
        bodyClassName="preview-modal"
      >
        <PhoneFrame>
          <PassportView passport={passport} photoOverride={photoOverride} compact />
        </PhoneFrame>
      </Modal>

      <ConfirmDialog
        open={leaving}
        title="Выйти без сохранения?"
        text="Внесённые изменения, выбранные фотографии и документы будут потеряны."
        confirmLabel="Выйти без сохранения"
        danger
        onConfirm={() => navigate(base ? `/app/products/${base.id}` : '/app/products')}
        onCancel={() => setLeaving(false)}
      />
    </div>
  );
}
