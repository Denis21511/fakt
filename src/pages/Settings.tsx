import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, Database, HardDrive, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { toast } from '../components/Toast';
import { Segmented, cx } from '../components/ui';
import { money, ordersWord, plural } from '../lib/format';
import { isCategoryUsed, STORAGE_KEY, useStore } from '../lib/store';
import type { Category, CurrencyDisplay } from '../lib/types';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const orders = useStore((s) => s.orders);
  const categories = useStore((s) => s.categories);
  const isDemo = useStore((s) => s.isDemo);
  const addCategory = useStore((s) => s.addCategory);
  const resetDemo = useStore((s) => s.resetDemo);
  const clearAll = useStore((s) => s.clearAll);
  const location = useLocation();

  const [company, setCompany] = useState(settings.companyName);
  const [newCat, setNewCat] = useState('');
  const [newCatError, setNewCatError] = useState('');
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  useEffect(() => {
    if (location.hash === '#storage') {
      requestAnimationFrame(() => document.getElementById('storage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [location.hash]);

  const saveCompany = () => {
    const name = company.trim();
    if (!name) {
      setCompany(settings.companyName);
      return;
    }
    if (name !== settings.companyName) {
      updateSettings({ companyName: name });
      toast('Название сохранено');
    }
  };

  const submitCategory = () => {
    const name = newCat.trim();
    if (!name) return setNewCatError('Введите название категории');
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return setNewCatError('Такая категория уже есть');
    addCategory(name);
    setNewCat('');
    setNewCatError('');
    toast(`Категория «${name}» добавлена`);
  };

  const expensesCount = orders.reduce((a, o) => a + o.expenses.length, 0);
  let storageSize = 0;
  try {
    storageSize = new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size;
  } catch {
    storageSize = 0;
  }

  return (
    <div className="page page--narrow">
      <PageHeader title="Настройки" subtitle="Предприятие, справочники и данные" />

      <section className="settings-section">
        <div className="settings-section__intro">
          <h2 className="settings-section__title">Предприятие</h2>
          <p>Отображается в боковой панели.</p>
        </div>
        <div className="panel settings-card">
          <label className="field__label" htmlFor="s-company">
            Название предприятия
          </label>
          <div className="inline-form">
            <input
              id="s-company"
              className="input"
              value={company}
              maxLength={80}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={saveCompany}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            {company.trim() !== settings.companyName && company.trim() && (
              <button type="button" className="btn btn-primary btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={saveCompany}>
                <Check size={15} /> Сохранить
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__intro">
          <h2 className="settings-section__title">Категории расходов</h2>
          <p>Используются в плановых и фактических расходах. Категорию, которая уже есть в заказах, можно переименовать, но не удалить.</p>
        </div>
        <div className="panel settings-card settings-card--flush">
          <ul className="cat-list">
            {categories.map((c, i) => (
              <CategoryRow
                key={`${c.id}:${c.name}`}
                category={c}
                first={i === 0}
                last={i === categories.length - 1}
                used={isCategoryUsed(orders, c.id)}
                taken={categories.filter((x) => x.id !== c.id).map((x) => x.name.toLowerCase())}
              />
            ))}
          </ul>
          <div className="cat-add">
            <div className={cx('inline-form', newCatError && 'field--error')}>
              <input
                className="input"
                placeholder="Новая категория, например «Аренда оборудования»"
                aria-label="Название новой категории"
                value={newCat}
                maxLength={60}
                aria-invalid={!!newCatError || undefined}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  setNewCatError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitCategory()}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={submitCategory}>
                <Plus size={15} /> Добавить
              </button>
            </div>
            {newCatError && <div className="field__error">{newCatError}</div>}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__intro">
          <h2 className="settings-section__title">Отображение сумм</h2>
          <p>Все суммы — в российских рублях.</p>
        </div>
        <div className="panel settings-card">
          <div className="setting-row">
            <div>
              <div className="setting-row__label">Обозначение валюты</div>
              <div className="setting-row__hint">Пример: {money(18_600_000)}</div>
            </div>
            <Segmented<CurrencyDisplay>
              size="sm"
              label="Обозначение валюты"
              value={settings.currencyDisplay}
              onChange={(v) => updateSettings({ currencyDisplay: v })}
              options={[
                { value: 'symbol', label: '₽' },
                { value: 'short', label: 'руб.' },
              ]}
            />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row__label">Показывать копейки</div>
              <div className="setting-row__hint">Обычно суммы по заказам удобнее читать без копеек</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.showKopecks}
                onChange={(e) => updateSettings({ showKopecks: e.target.checked })}
                aria-label="Показывать копейки"
              />
              <span className="switch__track" aria-hidden />
            </label>
          </div>
        </div>
      </section>

      <section className="settings-section" id="storage">
        <div className="settings-section__intro">
          <h2 className="settings-section__title">Данные</h2>
          <p>Режим хранения и демонстрационные данные.</p>
        </div>
        <div className="panel settings-card">
          <div className="storage-info">
            <div className="storage-info__icon">
              <HardDrive size={18} />
            </div>
            <div>
              <div className="storage-info__title">
                Демо-режим: локальное хранение
                <span className="chip chip--lime">{isDemo ? 'демо-данные' : 'ваши данные'}</span>
              </div>
              <p className="storage-info__text">
                Данные сохраняются в памяти этого браузера (localStorage) и переживают перезагрузку страницы. Они не
                передаются на сервер, не синхронизируются между устройствами и пользователями и будут потеряны при очистке
                данных браузера.
              </p>
              <div className="storage-info__stats">
                <span>
                  <Database size={13} /> {orders.length} {ordersWord(orders.length)}
                </span>
                <span>
                  {expensesCount} {plural(expensesCount, 'расход', 'расхода', 'расходов')}
                </span>
                <span>{(storageSize / 1024).toFixed(1).replace('.', ',')} КБ</span>
              </div>
            </div>
          </div>
          <div className="danger-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm('reset')}>
              <RotateCcw size={15} /> Восстановить демо-данные
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-ghost--danger" onClick={() => setConfirm('clear')}>
              <Trash2 size={15} /> Начать с чистого листа
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm === 'reset'}
        tone="primary"
        title="Восстановить демо-данные?"
        text="Все текущие заказы, расходы, категории и настройки будут заменены демонстрационным набором мастерской. Это действие нельзя отменить."
        confirmLabel="Восстановить"
        onConfirm={() => {
          resetDemo();
          setCompany(useStore.getState().settings.companyName);
          toast('Демо-данные восстановлены');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Удалить все данные?"
        text="Будут удалены все заказы и расходы. Категории вернутся к стандартному набору. Демо-данные можно будет восстановить здесь же."
        confirmLabel="Удалить всё"
        onConfirm={() => {
          clearAll();
          setCompany(useStore.getState().settings.companyName);
          toast('Все данные удалены');
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function CategoryRow({
  category,
  used,
  first,
  last,
  taken,
}: {
  category: Category;
  used: boolean;
  first: boolean;
  last: boolean;
  taken: string[];
}) {
  const rename = useStore((s) => s.renameCategory);
  const remove = useStore((s) => s.deleteCategory);
  const move = useStore((s) => s.moveCategory);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState('');

  const commit = () => {
    const v = name.trim();
    if (!v) {
      setName(category.name);
      setError('');
      return;
    }
    if (taken.includes(v.toLowerCase())) {
      setError('Такая категория уже есть');
      return;
    }
    setError('');
    if (v !== category.name) {
      rename(category.id, v);
      toast('Категория переименована');
    }
  };

  return (
    <li className="cat-row">
      <div className="cat-row__main">
        <input
          className={cx('input input--quiet', error && 'is-invalid')}
          value={name}
          aria-label={`Название категории ${category.name}`}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        {error && <div className="field__error">{error}</div>}
      </div>
      {used && <span className="cat-row__used">в заказах</span>}
      <div className="cat-row__actions">
        <button type="button" className="icon-btn icon-btn--subtle" disabled={first} aria-label="Выше" onClick={() => move(category.id, -1)}>
          <ArrowUp size={15} />
        </button>
        <button type="button" className="icon-btn icon-btn--subtle" disabled={last} aria-label="Ниже" onClick={() => move(category.id, 1)}>
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--subtle icon-btn--danger"
          disabled={used}
          aria-label={used ? 'Нельзя удалить: категория используется в заказах' : `Удалить категорию ${category.name}`}
          title={used ? 'Используется в заказах — удалить нельзя' : 'Удалить'}
          onClick={() => {
            remove(category.id);
            toast(`Категория «${category.name}» удалена`);
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
