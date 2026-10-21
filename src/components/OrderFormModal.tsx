import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { addDays, isValidISO, todayISO } from '../lib/dates';
import { money, orderNo, pct } from '../lib/format';
import { uid } from '../lib/id';
import { useStore, type OrderInput } from '../lib/store';
import { useOrderForm } from '../lib/uiStore';
import type { Order } from '../lib/types';
import { Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { toast } from './Toast';
import { AnimatedNumber, Field, Segmented, Select, cx } from './ui';
import { PRESET } from '../lib/presets';

interface Row {
  key: string;
  categoryId: string;
  name: string;
  amount: number | null;
}

interface FormState {
  title: string;
  client: string;
  description: string;
  createdAt: string;
  dueDate: string;
  price: number | null;
  status: 'draft' | 'in_progress';
  rows: Row[];
}

const MAX_KOPECKS = 100_000_000_000; // 1 млрд ₽

function initialState(order: Order | undefined, categoryIds: string[]): FormState {
  if (order) {
    return {
      title: order.title,
      client: order.client,
      description: order.description,
      createdAt: order.createdAt,
      dueDate: order.dueDate,
      price: order.price,
      status: order.status === 'draft' ? 'draft' : 'in_progress',
      rows: order.plannedCosts.map((c) => ({ key: c.id, categoryId: c.categoryId, name: c.name, amount: c.amount })),
    };
  }
  const today = todayISO();
  return {
    title: '',
    client: '',
    description: '',
    createdAt: today,
    dueDate: addDays(today, 21),
    price: null,
    status: 'in_progress',
    rows: categoryIds.slice(0, 3).map((id) => ({ key: uid(), categoryId: id, name: '', amount: null })),
  };
}

type Errors = Partial<Record<'title' | 'client' | 'createdAt' | 'dueDate' | 'price' | 'rows', string>> & {
  rowErrors?: Record<string, string>;
};

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 2) e.title = 'Укажите название заказа — не короче 2 символов';
  else if (f.title.length > 140) e.title = 'Слишком длинное название — до 140 символов';
  if (!f.client.trim()) e.client = 'Укажите клиента';
  if (!isValidISO(f.createdAt)) e.createdAt = 'Укажите корректную дату';
  if (!isValidISO(f.dueDate)) e.dueDate = 'Укажите корректную дату';
  else if (isValidISO(f.createdAt) && f.dueDate < f.createdAt) e.dueDate = 'Срок не может быть раньше даты создания';
  if (f.price === null) e.price = 'Укажите цену продажи';
  else if (Number.isNaN(f.price)) e.price = 'Введите сумму цифрами, например 186 000';
  else if (f.price <= 0) e.price = 'Цена должна быть больше нуля';
  else if (f.price > MAX_KOPECKS) e.price = 'Сумма слишком велика';
  const rowErrors: Record<string, string> = {};
  for (const r of f.rows) {
    if (r.amount !== null && Number.isNaN(r.amount)) rowErrors[r.key] = 'Некорректная сумма';
    else if (r.amount !== null && r.amount > MAX_KOPECKS) rowErrors[r.key] = 'Сумма слишком велика';
    else if (r.amount === null && r.name.trim()) rowErrors[r.key] = 'Укажите сумму';
  }
  if (Object.keys(rowErrors).length) {
    e.rowErrors = rowErrors;
    e.rows = 'Проверьте суммы в плановых расходах';
  }
  return e;
}

export function OrderFormModal() {
  const { open, editId, close } = useOrderForm();
  const order = useStore((s) => s.orders.find((o) => o.id === editId));
  if (!open) return null;
  // key пересоздаёт форму при каждом открытии
  return <OrderForm key={editId ?? 'new'} order={editId ? order : undefined} onClose={close} />;
}

function OrderForm({ order, onClose }: { order: Order | undefined; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const nextNumber = useStore((s) => s.nextNumber);
  const createOrder = useStore((s) => s.createOrder);
  const updateOrder = useStore((s) => s.updateOrder);
  const navigate = useNavigate();
  const isEdit = !!order;

  const [f, setF] = useState<FormState>(() => initialState(order, categories.map((c) => c.id)));
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => validate(f), [f]);
  const shown: Errors = submitted ? errors : {};

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const setRow = (key: string, patch: Partial<Row>) =>
    setF((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const validAmount = (v: number | null) => (v === null || Number.isNaN(v) ? 0 : v);
  const cost = f.rows.reduce((a, r) => a + validAmount(r.amount), 0);
  const price = validAmount(f.price);
  const profit = price - cost;
  const marginValue = price > 0 ? (profit / price) * 100 : null;

  const addRow = () => {
    const used = new Set(f.rows.map((r) => r.categoryId));
    const next = categories.find((c) => !used.has(c.id)) ?? categories[categories.length - 1];
    if (!next) return;
    setF((s) => ({ ...s, rows: [...s.rows, { key: uid(), categoryId: next.id, name: '', amount: null }] }));
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.plan-row:last-child .input-money input');
      inputs[inputs.length - 1]?.focus();
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      setTimeout(() => document.querySelector<HTMLElement>('.modal [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
    const input: OrderInput = {
      title: f.title.trim(),
      client: f.client.trim(),
      description: f.description.trim(),
      createdAt: f.createdAt,
      dueDate: f.dueDate,
      price: f.price as number,
      status: f.status,
      plannedCosts: f.rows
        .filter((r) => r.amount !== null && !Number.isNaN(r.amount) && r.amount > 0)
        .map((r) => ({ categoryId: r.categoryId, name: r.name.trim() || catName(r.categoryId), amount: r.amount as number })),
    };
    if (order) {
      updateOrder(order.id, input);
      toast('Изменения сохранены');
      onClose();
    } else {
      const created = createOrder(input);
      toast(`Заказ ${orderNo(created.number)} создан`);
      onClose();
      navigate(`/orders/${created.id}`);
    }
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal
      open
      closeOnBackdrop={false}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Редактирование заказа' : 'Новый заказ'}
      subtitle={isEdit ? `${orderNo(order!.number)} · ${order!.title}` : `Будет присвоен номер ${orderNo(nextNumber)}`}
      initialFocus="#f-title"
      footer={
        <div className="form-footer">
          <div className="form-summary" aria-live="polite">
            <div className="form-summary__item">
              <span>Себестоимость</span>
              <strong className="num">
                <AnimatedNumber value={cost} format={money} />
              </strong>
            </div>
            <div className="form-summary__item">
              <span>Плановая прибыль</span>
              <strong className={cx('num', profit < 0 && 'text-neg', profit > 0 && price > 0 && 'text-pos')}>
                <AnimatedNumber value={profit} format={money} />
              </strong>
            </div>
            <div className="form-summary__item">
              <span>Рентабельность</span>
              <strong className={cx('num', marginValue !== null && marginValue < 0 && 'text-neg')}>{pct(marginValue)}</strong>
            </div>
          </div>
          <div className="form-footer__actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" form="order-form" className="btn btn-primary">
              {isEdit ? 'Сохранить' : 'Создать заказ'}
            </button>
          </div>
        </div>
      }
    >
      <form id="order-form" className="order-form" onSubmit={submit} noValidate>
        <section className="form-section">
          <h3 className="form-section__title">Основная информация</h3>
          <div className="form-grid">
            <Field label="Название заказа" htmlFor="f-title" error={shown.title} className="span-2">
              <input
                id="f-title"
                className="input"
                placeholder={PRESET.copy.orderTitlePlaceholder}
                value={f.title}
                aria-invalid={!!shown.title || undefined}
                onChange={(e) => set('title', e.target.value)}
                maxLength={160}
              />
            </Field>
            <Field label="Клиент" htmlFor="f-client" error={shown.client}>
              <input
                id="f-client"
                className="input"
                placeholder="Имя или организация"
                value={f.client}
                aria-invalid={!!shown.client || undefined}
                onChange={(e) => set('client', e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Цена продажи" htmlFor="f-price" error={shown.price}>
              <MoneyInput id="f-price" value={f.price} onChange={(v) => set('price', v)} invalid={!!shown.price} />
            </Field>
            <Field label="Дата создания" htmlFor="f-created" error={shown.createdAt}>
              <input
                id="f-created"
                type="date"
                className="input"
                value={f.createdAt}
                aria-invalid={!!shown.createdAt || undefined}
                onChange={(e) => set('createdAt', e.target.value)}
              />
            </Field>
            <Field label="Плановое завершение" htmlFor="f-due" error={shown.dueDate}>
              <input
                id="f-due"
                type="date"
                className="input"
                value={f.dueDate}
                min={f.createdAt}
                aria-invalid={!!shown.dueDate || undefined}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </Field>
            <Field label="Описание изделия" htmlFor="f-desc" className="span-2" hint="Необязательно: размеры, материал, особенности">
              <textarea
                id="f-desc"
                className="input textarea"
                rows={2}
                value={f.description}
                onChange={(e) => set('description', e.target.value)}
                maxLength={600}
              />
            </Field>
            {!isEdit && (
              <div className="field span-2">
                <span className="field__label">Статус</span>
                <Segmented
                  label="Статус нового заказа"
                  value={f.status}
                  onChange={(v) => set('status', v)}
                  options={[
                    { value: 'in_progress', label: 'Сразу в работу' },
                    { value: 'draft', label: 'Черновик — расчёт для клиента' },
                  ]}
                />
              </div>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <h3 className="form-section__title">Плановые расходы</h3>
            <span className="form-section__hint">Пустые строки не сохраняются</span>
          </div>
          {f.rows.length > 0 ? (
            <div className="plan-rows">
              <div className="plan-row plan-row--head" aria-hidden>
                <span>Категория</span>
                <span>Описание</span>
                <span className="ta-r">Сумма</span>
                <span />
              </div>
              {f.rows.map((r, i) => (
                <div className="plan-row" key={r.key}>
                  <Select
                    value={r.categoryId}
                    onChange={(v) => setRow(r.key, { categoryId: v })}
                    options={categoryOptions}
                    label={`Категория строки ${i + 1}`}
                  />
                  <input
                    className="input"
                    placeholder={categories.find((c) => c.id === r.categoryId)?.name}
                    aria-label={`Описание строки ${i + 1}`}
                    value={r.name}
                    onChange={(e) => setRow(r.key, { name: e.target.value })}
                    maxLength={120}
                  />
                  <div className="plan-row__amount">
                    <MoneyInput
                      value={r.amount}
                      onChange={(v) => setRow(r.key, { amount: v })}
                      invalid={!!shown.rowErrors?.[r.key]}
                      ariaLabel={`Сумма строки ${i + 1}`}
                    />
                    {shown.rowErrors?.[r.key] && <div className="field__error">{shown.rowErrors[r.key]}</div>}
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn--subtle"
                    aria-label={`Удалить строку ${i + 1}`}
                    onClick={() => setF((s) => ({ ...s, rows: s.rows.filter((x) => x.key !== r.key) }))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-note">Плановые расходы не указаны — плановая прибыль будет равна цене продажи.</p>
          )}
          <button type="button" className="btn btn-ghost btn-sm add-row" onClick={addRow} disabled={!categories.length}>
            <Plus size={15} /> Добавить статью расходов
          </button>
          {price > 0 && profit < 0 && (
            <p className="form-warning">Плановая себестоимость превышает цену — заказ будет убыточным.</p>
          )}
        </section>
      </form>
    </Modal>
  );
}
