import { useMemo, useState, type FormEvent } from 'react';
import { categoryLines } from '../lib/calc';
import { isValidISO, todayISO } from '../lib/dates';
import { money, signedMoney } from '../lib/format';
import { useStore } from '../lib/store';
import type { Expense, Order } from '../lib/types';
import { Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { toast } from './Toast';
import { Field, Select, cx } from './ui';
import { PRESET } from '../lib/presets';

export function ExpenseFormModal({
  order,
  expense,
  defaultCategoryId,
  onClose,
}: {
  order: Order;
  expense?: Expense;
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const categories = useStore((s) => s.categories);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);

  const firstPlanned = order.plannedCosts[0]?.categoryId;
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? defaultCategoryId ?? firstPlanned ?? categories[0]?.id ?? '',
  );
  const [name, setName] = useState(expense?.name ?? '');
  const [amount, setAmount] = useState<number | null>(expense?.amount ?? null);
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [comment, setComment] = useState(expense?.comment ?? '');
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!categoryId) e.category = 'Выберите категорию';
    if (!name.trim()) e.name = 'Опишите расход, например «Профтруба 40×20»';
    if (amount === null) e.amount = 'Укажите сумму';
    else if (Number.isNaN(amount)) e.amount = 'Введите сумму цифрами';
    else if (amount <= 0) e.amount = 'Сумма должна быть больше нуля';
    else if (amount > 100_000_000_000) e.amount = 'Сумма слишком велика';
    if (!isValidISO(date)) e.date = 'Укажите корректную дату';
    return e;
  }, [categoryId, name, amount, date]);
  const shown = submitted ? errors : {};

  // Живой контекст: как расход повлияет на статью
  const line = categoryLines(order, categories).find((l) => l.categoryId === categoryId);
  const planned = line?.planned ?? 0;
  const otherActual = (line?.actual ?? 0) - (expense && expense.categoryId === categoryId ? expense.amount : 0);
  const valid = amount !== null && !Number.isNaN(amount) && amount > 0 ? amount : 0;
  const after = otherActual + valid;
  const diff = after - planned;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      setTimeout(() => document.querySelector<HTMLElement>('.modal [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    const input = { categoryId, name: name.trim(), amount: amount as number, date, comment: comment.trim() };
    if (expense) {
      updateExpense(order.id, expense.id, input);
      toast('Расход обновлён');
    } else {
      addExpense(order.id, input);
      toast('Расход добавлен');
    }
    onClose();
  };

  return (
    <Modal
      open
      closeOnBackdrop={false}
      onClose={onClose}
      title={expense ? 'Изменить расход' : 'Новый расход'}
      subtitle={order.title}
      initialFocus={expense ? '#e-amount' : '#e-name'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form="expense-form" className="btn btn-primary">
            {expense ? 'Сохранить' : 'Добавить расход'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} noValidate className="form-grid">
        <Field label="Категория" htmlFor="e-cat" error={shown.category}>
          <Select
            id="e-cat"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="Дата" htmlFor="e-date" error={shown.date}>
          <input
            id="e-date"
            type="date"
            className="input"
            value={date}
            aria-invalid={!!shown.date || undefined}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Название или описание" htmlFor="e-name" error={shown.name} className="span-2">
          <input
            id="e-name"
            className="input"
            placeholder={PRESET.copy.expenseNamePlaceholder}
            value={name}
            aria-invalid={!!shown.name || undefined}
            onChange={(e) => setName(e.target.value)}
            maxLength={140}
          />
        </Field>
        <Field label="Сумма" htmlFor="e-amount" error={shown.amount}>
          <MoneyInput id="e-amount" value={amount} onChange={setAmount} invalid={!!shown.amount} />
        </Field>
        <div className="expense-context" aria-live="polite">
          <div className="expense-context__row">
            <span>План по статье</span>
            <span className="num">{line?.hasPlan ? money(planned) : 'не запланировано'}</span>
          </div>
          <div className="expense-context__row">
            <span>Факт с этим расходом</span>
            <span className="num">{money(after)}</span>
          </div>
          {(line?.hasPlan || after > 0) && (
            <div className={cx('expense-context__row expense-context__total', diff > 0 ? 'text-neg' : 'text-pos')}>
              <span>{diff > 0 ? 'Перерасход' : 'Остаток плана'}</span>
              <span className="num">{diff > 0 ? signedMoney(diff) : money(-diff)}</span>
            </div>
          )}
        </div>
        <Field label="Комментарий" htmlFor="e-comment" className="span-2" hint="Необязательно: поставщик, причина отклонения">
          <textarea
            id="e-comment"
            className="input textarea"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
          />
        </Field>
      </form>
    </Modal>
  );
}
