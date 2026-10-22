import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileImage, FileText, X } from 'lucide-react';
import { ACCEPTED_DOCUMENT_EXT, DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL, MAX_DOCUMENT_BYTES } from '../../domain/catalog';
import { guessDocType, titleFromFile } from '../../domain/documents';
import type { DocumentType, ProductDocument } from '../../domain/types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { formatDateTime } from '../../lib/dates';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { repository } from '../../storage';
import { toast, toastError } from '../../state/toast';
import { useWorkspace, validateDocumentFile } from '../../state/workspace';
import { Field } from '../ui/Field';
import { FileDrop } from '../ui/FileDrop';
import { Modal } from '../ui/Modal';

export function DocIcon({ mime }: { mime: string }) {
  return mime.startsWith('image/') ? <FileImage aria-hidden /> : <FileText aria-hidden />;
}

export async function downloadDocument(doc: ProductDocument) {
  try {
    const file = await repository.getDocumentFile(doc);
    if (!file) throw new Error('Файл не найден в хранилище браузера');
    downloadBlob(file.blob, doc.fileName);
  } catch (err) {
    toastError('Документ не скачан', err);
  }
}

/** Добавление документа: файл действительно записывается в хранилище до появления в библиотеке */
export function DocumentUploadDialog({
  open,
  onClose,
  productId: initialProduct,
  type: initialType,
}: {
  open: boolean;
  onClose: () => void;
  productId?: string;
  type?: DocumentType;
}) {
  const { products, addDocument } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>(initialType ?? 'instruction');
  const [productId, setProductId] = useState(initialProduct ?? '');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<{ product?: string; file?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setFileError(null);
    setTitle('');
    setType(initialType ?? 'instruction');
    setProductId(initialProduct ?? '');
    setIsPublic(true);
    setErrors({});
  }, [open, initialProduct, initialType]);

  const pick = (files: File[]) => {
    const f = files[0];
    const problem = validateDocumentFile(f);
    if (problem) {
      setFile(null);
      setFileError(`${f.name}: ${problem}`);
      return;
    }
    setFileError(null);
    setFile(f);
    setErrors((e) => ({ ...e, file: undefined }));
    if (!title.trim()) setTitle(titleFromFile(f.name));
    if (!initialType) setType(guessDocType(f.name));
  };

  const submit = async () => {
    const next = {
      file: file ? undefined : 'Выберите файл',
      product: productId ? undefined : 'Выберите изделие',
    };
    setErrors(next);
    if (!file || !productId) return;
    setBusy(true);
    try {
      const doc = await addDocument({ file, title, type, productId, isPublic });
      toast.success('Документ добавлен', `${doc.title} · ${formatBytes(doc.size)}`);
      onClose();
    } catch (err) {
      toastError('Документ не добавлен', err);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Добавить документ"
      subtitle="Файл сохраняется в хранилище этого браузера"
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button type="button" className="btn btn--dark" onClick={submit} disabled={busy}>
            {busy && <span className="spinner" aria-hidden />}
            Добавить документ
          </button>
        </>
      }
    >
      <div className="upload-form">
        {file ? (
          <div className="upload-file">
            <span className="upload-file__icon">
              <DocIcon mime={file.type} />
            </span>
            <span className="upload-file__text">
              <span className="upload-file__name">{file.name}</span>
              <span className="upload-file__meta">
                {file.type === 'application/pdf' ? 'PDF' : 'Изображение'} · {formatBytes(file.size)}
              </span>
            </span>
            <button type="button" className="icon-btn" onClick={() => setFile(null)} aria-label="Выбрать другой файл">
              <X />
            </button>
          </div>
        ) : (
          <FileDrop
            accept={ACCEPTED_DOCUMENT_EXT}
            onFiles={pick}
            label="Файл документа"
            title="Выберите или перетащите файл"
            hint={`PDF, JPG, PNG или WEBP — до ${formatBytes(MAX_DOCUMENT_BYTES)}`}
          />
        )}
        {(fileError || errors.file) && (
          <p className="field__error" role="alert">
            {fileError ?? errors.file}
          </p>
        )}
        <Field label="Изделие" required error={errors.product}>
          <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="" disabled>
              Выберите изделие
            </option>
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.serial}
              </option>
            ))}
          </select>
        </Field>
        <div className="upload-form__row">
          <Field label="Название">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Инструкция по монтажу и эксплуатации" />
          </Field>
          <Field label="Тип">
            <select className="select" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>
            Показывать покупателю в паспорте
            <span className="check__hint">Внутренние протоколы и схемы лучше оставить скрытыми</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

export function DocumentViewer({ doc, onClose }: { doc: ProductDocument | null; onClose: () => void }) {
  const { url, status } = useBlobUrl(doc ? `${doc.id}:${doc.fileId}` : null, () => repository.getDocumentFile(doc!));
  if (!doc) return null;
  const isPdf = doc.mime === 'application/pdf';
  return (
    <Modal
      open
      onClose={onClose}
      title={doc.title}
      subtitle={`${DOCUMENT_TYPE_LABEL[doc.type]} · ${doc.fileName}${doc.size ? ` · ${formatBytes(doc.size)}` : ''} · загружен ${formatDateTime(doc.uploadedAt)}`}
      size="xl"
      bodyClassName="viewer"
      footer={
        <>
          {url && (
            <a className="btn btn--secondary" href={url} target="_blank" rel="noopener">
              <ExternalLink aria-hidden />
              Открыть в новой вкладке
            </a>
          )}
          <button type="button" className="btn btn--dark" onClick={() => void downloadDocument(doc)} disabled={status !== 'ready'}>
            <Download aria-hidden />
            Скачать
          </button>
        </>
      }
    >
      {status === 'loading' && (
        <div className="viewer__state">
          <span className="spinner" aria-hidden />
          {doc.demo ? 'Готовим демонстрационный PDF…' : 'Загрузка файла…'}
        </div>
      )}
      {status === 'missing' && (
        <div className="viewer__state viewer__state--error">
          Файл не найден в хранилище браузера. Возможно, данные сайта были очищены — загрузите документ заново.
        </div>
      )}
      {status === 'ready' &&
        url &&
        (isPdf ? <iframe className="viewer__pdf" src={url} title={doc.title} /> : <img className="viewer__img" src={url} alt={doc.title} />)}
    </Modal>
  );
}
