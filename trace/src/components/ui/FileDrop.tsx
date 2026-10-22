import { useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { cx } from '../../lib/cx';

/** Зона загрузки: клик по ней открывает выбор файла, файлы можно перетащить */
export function FileDrop({
  accept,
  multiple = false,
  onFiles,
  title,
  hint,
  icon,
  compact,
  label,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  /** Доступное имя поля выбора файла */
  label: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cx('dropzone', over && 'is-over', compact && 'dropzone--compact')}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={label}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      <span className="dropzone__icon" aria-hidden>
        {icon ?? <Upload />}
      </span>
      <span className="dropzone__title">{title}</span>
      {hint && <span className="dropzone__hint">{hint}</span>}
    </div>
  );
}
