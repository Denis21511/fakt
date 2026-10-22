import { useMemo } from 'react';
import { qrMatrix, qrPath } from '../../lib/qr';

/** QR-код векторно: матрицу кодирует библиотека qrcode, здесь только отрисовка */
export function QrCode({
  value,
  margin = 2,
  className,
  dark = '#171916',
  light = '#FFFFFF',
  title,
}: {
  value: string;
  margin?: number;
  className?: string;
  dark?: string;
  light?: string;
  title?: string;
}) {
  const { size, d } = useMemo(() => {
    const m = qrMatrix(value);
    return { size: m.size + margin * 2, d: qrPath(m, margin) };
  }, [value, margin]);
  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={title ?? `QR-код: ${value}`}>
      <rect width={size} height={size} fill={light} />
      <path d={d} fill={dark} />
    </svg>
  );
}
