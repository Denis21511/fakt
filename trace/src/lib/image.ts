/**
 * Фото с телефона весит 4–8 МБ, а хранилище браузера ограничено,
 * поэтому перед сохранением изображение уменьшается.
 */
export async function downscaleImage(file: File, { maxSide = 1600, type = 'image/jpeg', quality = 0.86 } = {}): Promise<Blob> {
  if (file.type === 'image/svg+xml') return file;
  const bitmap = await loadImage(file);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (ratio === 1 && file.size < 600 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d')!;
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать изображение'))), type, quality),
  );
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Файл не читается как изображение'));
    };
    img.src = url;
  });
}
