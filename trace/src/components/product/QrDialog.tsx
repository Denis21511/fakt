import { Link } from 'react-router-dom';
import { Copy, Download, ExternalLink, Printer } from 'lucide-react';
import type { Product } from '../../domain/types';
import { downloadBlob, safeFileName } from '../../lib/download';
import { groupToken } from '../../lib/id';
import { passportUrl, qrPngBlob, qrSvgString } from '../../lib/qr';
import { toast, toastError } from '../../state/toast';
import { CornerMarks } from '../brand/Logo';
import { Modal } from '../ui/Modal';
import { QrCode } from './QrCode';

export async function copyText(text: string, what = 'Ссылка скопирована') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what);
  } catch {
    toast.error('Не удалось скопировать', 'Браузер не дал доступ к буферу обмена — выделите ссылку вручную');
  }
}

export async function downloadQr(product: Product, format: 'png' | 'svg') {
  const url = passportUrl(product.token);
  const base = safeFileName(`TRACE_${product.serial}`);
  try {
    if (format === 'svg') downloadBlob(new Blob([qrSvgString(url)], { type: 'image/svg+xml' }), `${base}.svg`);
    else downloadBlob(await qrPngBlob(url), `${base}.png`);
  } catch (err) {
    toastError('QR-код не скачан', err);
  }
}

export function QrDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  if (!product) return null;
  const url = passportUrl(product.token);
  const published = product.passport.status === 'published';
  return (
    <Modal
      open
      onClose={onClose}
      title="QR-код паспорта"
      subtitle={product.name}
      size="md"
      footer={
        <>
          <Link to={`/app/qr?product=${product.id}`} className="btn btn--secondary" onClick={onClose}>
            <Printer aria-hidden />
            Печать этикетки
          </Link>
          <button type="button" className="btn btn--secondary" onClick={() => downloadQr(product, 'svg')}>
            <Download aria-hidden />
            SVG
          </button>
          <button type="button" className="btn btn--dark" onClick={() => downloadQr(product, 'png')} data-autofocus>
            <Download aria-hidden />
            PNG
          </button>
        </>
      }
    >
      <div className="qr-dialog">
        <div className="qr-dialog__code">
          <CornerMarks size={22} />
          <QrCode value={url} margin={1} title={`QR-код паспорта ${product.serial}`} />
        </div>
        <div className="qr-dialog__info">
          <dl className="kv kv--tight">
            <dt>Серийный номер</dt>
            <dd className="mono">{product.serial}</dd>
            <dt>Код паспорта</dt>
            <dd className="mono">{groupToken(product.token)}</dd>
          </dl>
          <div className="qr-dialog__url">
            <span className="mono">{url}</span>
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => copyText(url)} aria-label="Скопировать ссылку">
              <Copy />
            </button>
          </div>
          {!published && (
            <p className="qr-dialog__warn">
              Паспорт не опубликован: по этому коду покупатель увидит сообщение «Паспорт ещё не опубликован». Код останется прежним после публикации —
              этикетку можно печатать заранее.
            </p>
          )}
          <a className="link-btn" href={url} target="_blank" rel="noopener">
            Открыть публичную страницу
            <ExternalLink aria-hidden />
          </a>
        </div>
      </div>
    </Modal>
  );
}
