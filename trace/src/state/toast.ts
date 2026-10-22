import { create } from 'zustand';
import { uid } from '../lib/id';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  text?: string;
}

interface ToastState {
  toasts: Toast[];
  push(t: Omit<Toast, 'id'>): void;
  dismiss(id: string): void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push(t) {
    const id = uid();
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.kind === 'error' ? 7000 : 4200);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  success: (title: string, text?: string) => useToasts.getState().push({ kind: 'success', title, text }),
  error: (title: string, text?: string) => useToasts.getState().push({ kind: 'error', title, text }),
  info: (title: string, text?: string) => useToasts.getState().push({ kind: 'info', title, text }),
};

/** Ошибка операции → сообщение пользователю. Сообщения слоя хранения уже написаны для людей. */
export function toastError(title: string, err: unknown) {
  toast.error(title, err instanceof Error ? err.message : undefined);
}
