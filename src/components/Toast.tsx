import { create } from 'zustand';
import { Check, Info } from 'lucide-react';
import { uid } from '../lib/id';

interface ToastItem {
  id: string;
  text: string;
  tone: 'success' | 'info';
  leaving?: boolean;
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));

export function toast(text: string, tone: ToastItem['tone'] = 'success') {
  const id = uid();
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text, tone }] }));
  window.setTimeout(() => {
    useToasts.setState((s) => ({ items: s.items.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
  }, 2800);
  window.setTimeout(() => {
    useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  }, 3000);
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.leaving ? ' is-leaving' : ''}`}>
          <span className="toast__icon">{t.tone === 'success' ? <Check size={14} strokeWidth={2.6} /> : <Info size={14} />}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
