import { create } from 'zustand';

/** Глобальное состояние модальной формы заказа (создание / редактирование). */
interface OrderFormState {
  open: boolean;
  editId: string | null;
  openCreate: () => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useOrderForm = create<OrderFormState>((set) => ({
  open: false,
  editId: null,
  openCreate: () => set({ open: true, editId: null }),
  openEdit: (id) => set({ open: true, editId: id }),
  close: () => set({ open: false }),
}));
