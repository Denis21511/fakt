export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Имя файла без символов, недопустимых в Windows */
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|«»]+/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'file'
  );
}
