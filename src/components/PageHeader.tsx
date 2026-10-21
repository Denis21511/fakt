import type { ReactNode } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { PERIOD_OPTIONS } from '../lib/dates';
import type { PeriodKey } from '../lib/types';
import { useOrderForm } from '../lib/uiStore';
import { Select } from './ui';

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow && <div className="page-head__eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

export function NewOrderButton() {
  const openCreate = useOrderForm((s) => s.openCreate);
  return (
    <button type="button" className="btn btn-primary" onClick={openCreate}>
      <Plus size={16} strokeWidth={2.2} /> Новый заказ
    </button>
  );
}

export function PeriodSelect({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  return (
    <Select
      label="Период по дате заказа"
      icon={<CalendarRange size={15} />}
      value={value}
      onChange={onChange}
      options={PERIOD_OPTIONS.map((p) => ({ value: p.key, label: p.label }))}
    />
  );
}
