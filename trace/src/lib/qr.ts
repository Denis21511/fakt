import QRCode from 'qrcode';

/** Публичный адрес паспорта — именно он зашивается в QR-код */
export function passportUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}p/${token}`;
}

/** Ссылка для <a href> с учётом base-пути сборки (открывается в новой вкладке) */
export function passportPath(token: string): string {
  return `${import.meta.env.BASE_URL}p/${token}`;
}

export interface QrMatrix {
  size: number;
  isDark(row: number, col: number): boolean;
}

const cache = new Map<string, QrMatrix>();

/** Кодирование — библиотекой qrcode (уровень коррекции M: наклейки царапаются) */
export function qrMatrix(text: string): QrMatrix {
  const hit = cache.get(text);
  if (hit) return hit;
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const matrix: QrMatrix = { size: modules.size, isDark: (r, c) => Boolean(modules.get(r, c)) };
  cache.set(text, matrix);
  return matrix;
}

/** SVG-путь из горизонтальных отрезков модулей; координаты в модулях, со смещением на поле */
export function qrPath(matrix: QrMatrix, margin = 0): string {
  let d = '';
  for (let r = 0; r < matrix.size; r++) {
    let c = 0;
    while (c < matrix.size) {
      if (!matrix.isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < matrix.size && matrix.isDark(r, c)) c++;
      d += `M${start + margin} ${r + margin}h${c - start}v1h${start - c}z`;
    }
  }
  return d;
}

export function qrSvgString(text: string, { margin = 4, dark = '#171916', light = '#FFFFFF' } = {}): string {
  const m = qrMatrix(text);
  const n = m.size + margin * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * 10}" height="${n * 10}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="${light}"/>` +
    `<path d="${qrPath(m, margin)}" fill="${dark}"/></svg>`
  );
}

export function qrPngBlob(text: string, { pixels = 1024, margin = 4, dark = '#171916', light = '#FFFFFF' } = {}): Promise<Blob> {
  const m = qrMatrix(text);
  const n = m.size + margin * 2;
  const scale = Math.max(1, Math.floor(pixels / n));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark;
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.isDark(r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG не сформирован'))), 'image/png'));
}
