import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ExternalLink, Pencil, QrCode as QrIcon, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import type { Product } from '../../domain/types';
import { passportPath } from '../../lib/qr';
import { toast, toastError } from '../../state/toast';
import { useWorkspace } from '../../state/workspace';
import type { MenuItem } from '../ui/Menu';
import { ConfirmDialog } from '../ui/Modal';
import { QrDialog } from './QrDialog';

/** Общие действия над изделием: публикация, удаление с подтверждением, QR-код */
export function useProductActions({ afterDelete }: { afterDelete?: () => void } = {}) {
  const navigate = useNavigate();
  const setPassportStatus = useWorkspace((s) => s.setPassportStatus);
  const deleteProduct = useWorkspace((s) => s.deleteProduct);
  const documents = useWorkspace((s) => s.documents);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [qrFor, setQrFor] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const publish = async (p: Product) => {
    try {
      await setPassportStatus(p.id, 'published');
      toast.success('Паспорт опубликован', `${p.name} — покупатели видят паспорт по QR-коду`);
    } catch (err) {
      toastError('Паспорт не опубликован', err);
    }
  };

  const withdraw = async (p: Product) => {
    try {
      await setPassportStatus(p.id, 'withdrawn');
      toast.info('Паспорт снят с публикации', 'По QR-коду теперь открывается сообщение о недоступном паспорте');
    } catch (err) {
      toastError('Не удалось снять с публикации', err);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteProduct(toDelete.id);
      toast.success('Изделие удалено', toDelete.name);
      setToDelete(null);
      afterDelete?.();
    } catch (err) {
      toastError('Изделие не удалено', err);
    } finally {
      setBusy(false);
    }
  };

  const menuItems = (p: Product, { inDetail = false } = {}): MenuItem[] => [
    ...(inDetail ? [] : [{ label: 'Открыть карточку', icon: <SquareArrowOutUpRight />, to: `/app/products/${p.id}` }]),
    { label: 'Редактировать', icon: <Pencil />, onSelect: () => navigate(`/app/products/${p.id}/edit`) },
    { label: 'QR-код', icon: <QrIcon />, onSelect: () => setQrFor(p) },
    { label: 'Публичный паспорт', icon: <ExternalLink />, href: passportPath(p.token) },
    { kind: 'separator' },
    p.passport.status === 'published'
      ? { label: 'Снять с публикации', icon: <EyeOff />, onSelect: () => void withdraw(p) }
      : { label: 'Опубликовать паспорт', icon: <Eye />, onSelect: () => void publish(p) },
    { kind: 'separator' },
    { label: 'Удалить', icon: <Trash2 />, danger: true, onSelect: () => setToDelete(p) },
  ];

  const docCount = toDelete ? documents.filter((d) => d.productId === toDelete.id).length : 0;

  const dialogs = (
    <>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить изделие?"
        text={
          toDelete && (
            <>
              <p>
                <strong style={{ color: 'var(--ink)' }}>{toDelete.name}</strong>, серийный номер <span className="mono">{toDelete.serial}</span>.
              </p>
              <p style={{ marginTop: 10 }}>
                {docCount > 0 ? `Вместе с изделием удалятся документы (${docCount}). ` : ''}
                {toDelete.passport.status === 'published'
                  ? 'Паспорт перестанет открываться: по напечатанному QR-коду покупатель увидит «Паспорт не найден».'
                  : 'Действие нельзя отменить.'}
              </p>
            </>
          )
        }
        confirmLabel="Удалить изделие"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <QrDialog product={qrFor} onClose={() => setQrFor(null)} />
    </>
  );

  return { publish, withdraw, askDelete: setToDelete, showQr: setQrFor, menuItems, dialogs };
}
