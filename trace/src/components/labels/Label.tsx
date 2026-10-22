import { forwardRef, useMemo } from 'react';
import type { CompanySettings, Product } from '../../domain/types';
import { warrantyEnd } from '../../domain/warranty';
import { formatDate } from '../../lib/dates';
import { passportUrl, qrMatrix, qrPath } from '../../lib/qr';

export type LabelFormat = 'compact' | 'minimal' | 'extended';

export const LABEL_FORMATS: { id: LabelFormat; title: string; text: string; w: number; h: number }[] = [
  { id: 'compact', title: 'Компактная техническая', text: 'Серийный номер и артикул рядом с кодом. Для коробки, торца полотна, рамы.', w: 50, h: 25 },
  { id: 'minimal', title: 'Белая минималистичная', text: 'Только код и логотип. Для лицевых поверхностей и документов.', w: 40, h: 40 },
  { id: 'extended', title: 'Расширенная', text: 'Шильд с названием, серийным номером, датой и гарантией.', w: 70, h: 40 },
];

const INK = '#171916';
const MUTED = '#5f635a';
const SANS = "'Inter Variable', Inter, Arial, sans-serif";
const DISPLAY = "'Manrope Variable', Manrope, Arial, sans-serif";
const MONO = "'JetBrains Mono Variable', 'JetBrains Mono', Consolas, monospace";

/** Перенос строк по оценке ширины символов: SVG сам текст не переносит */
function wrapText(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const perLine = Math.max(4, Math.floor(maxWidth / (fontSize * 0.56)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = `${cut[maxLines - 1].slice(0, perLine - 1).trimEnd()}…`;
    return cut;
  }
  return lines;
}

function Qr({ url, x, y, size }: { url: string; x: number; y: number; size: number }) {
  const { n, d } = useMemo(() => {
    const m = qrMatrix(url);
    return { n: m.size, d: qrPath(m) };
  }, [url]);
  const s = size / n;
  return <path d={d} fill={INK} transform={`translate(${x} ${y}) scale(${s})`} shapeRendering="crispEdges" />;
}

function Mark({ x, y, size }: { x: number; y: number; size: number }) {
  const k = size / 32;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect width="32" height="32" rx="6" fill={INK} />
      <path d="M8 12.5V8h4.5M19.5 8H24v4.5M24 19.5V24h-4.5M12.5 24H8v-4.5" fill="none" stroke="#fff" strokeWidth="2.8" />
      <rect x="13" y="13" width="6" height="6" fill="#fff" />
    </g>
  );
}

function Corners({ x, y, size, arm, stroke = 0.3 }: { x: number; y: number; size: number; arm: number; stroke?: number }) {
  const r = x + size;
  const b = y + size;
  return (
    <path
      d={`M${x} ${y + arm}V${y}H${x + arm}M${r - arm} ${y}H${r}V${y + arm}M${r} ${b - arm}V${b}H${r - arm}M${x + arm} ${b}H${x}V${b - arm}`}
      fill="none"
      stroke={INK}
      strokeWidth={stroke}
    />
  );
}

export interface LabelProps {
  format: LabelFormat;
  product: Product;
  company: Pick<CompanySettings, 'name'>;
  /** data:-URL логотипа компании — встраивается в SVG и при скачивании */
  logoHref?: string | null;
  /** Ширина на экране; без неё — реальный размер в миллиметрах (для печати) */
  displayWidth?: number;
  className?: string;
}

export const Label = forwardRef<SVGSVGElement, LabelProps>(function Label({ format, product, company, logoHref, displayWidth, className }, ref) {
  const f = LABEL_FORMATS.find((x) => x.id === format)!;
  const url = passportUrl(product.token);
  const sizeProps = displayWidth ? { width: displayWidth, height: (displayWidth * f.h) / f.w } : { width: `${f.w}mm`, height: `${f.h}mm` };
  const companyName = company.name || product.manufacturer;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${f.w} ${f.h}`}
      {...sizeProps}
      className={className}
      role="img"
      aria-label={`Этикетка «${f.title}»: ${product.name}, ${product.serial}`}
    >
      <rect width={f.w} height={f.h} fill="#fff" />
      {format === 'compact' && (
        <g>
          <rect x="0.4" y="0.4" width={f.w - 0.8} height={f.h - 0.8} rx="1.4" fill="none" stroke={INK} strokeWidth="0.35" />
          <Qr url={url} x={2.3} y={2.3} size={20.4} />
          <path d="M24.8 2.4V22.6" stroke={INK} strokeWidth="0.25" />
          <text x="26.4" y="5.6" fontFamily={SANS} fontSize="1.75" fill={MUTED}>
            Серийный номер
          </text>
          <text x="26.4" y="9.6" fontFamily={MONO} fontWeight="700" fontSize={product.serial.length > 13 ? 2.3 : 2.75} fill={INK}>
            {product.serial}
          </text>
          <text x="26.4" y="13.3" fontFamily={SANS} fontSize="1.75" fill={MUTED}>
            Артикул
          </text>
          <text x="26.4" y="16" fontFamily={MONO} fontSize="1.95" fill={INK}>
            {product.sku.length > 18 ? `${product.sku.slice(0, 17)}…` : product.sku}
          </text>
          <Mark x={26.4} y={18.8} size={3.6} />
          <text x="30.8" y="21.6" fontFamily={DISPLAY} fontWeight="800" fontSize="1.9" letterSpacing="0.3" fill={INK}>
            TRACE
          </text>
          <text x="38.6" y="21.55" fontFamily={SANS} fontSize="1.45" fill={MUTED}>
            паспорт
          </text>
        </g>
      )}

      {format === 'minimal' && (
        <g>
          <Corners x={5} y={3} size={30} arm={3.2} />
          <Qr url={url} x={7.2} y={5.2} size={25.6} />
          {logoHref ? (
            <image href={logoHref} x={5} y={34.1} width={3.6} height={3.6} preserveAspectRatio="xMidYMid meet" />
          ) : (
            <Mark x={5} y={34.1} size={3.6} />
          )}
          <text x="9.6" y="36.4" fontFamily={DISPLAY} fontWeight="800" fontSize="2.2" fill={INK}>
            {companyName.length > 22 ? `${companyName.slice(0, 21)}…` : companyName}
          </text>
          <text x="9.6" y="38.5" fontFamily={SANS} fontSize="1.5" fill={MUTED}>
            Цифровой паспорт изделия
          </text>
        </g>
      )}

      {format === 'extended' && <Extended product={product} companyName={companyName} url={url} logoHref={logoHref} />}
    </svg>
  );
});

function Extended({ product, companyName, url, logoHref }: { product: Product; companyName: string; url: string; logoHref?: string | null }) {
  const nameLines = wrapText(product.name, 40, 2.7, 2);
  const end = warrantyEnd(product.warranty);
  const cells: [string, string][] = [
    ['Серийный номер', product.serial],
    ['Дата изготовления', formatDate(product.manufacturedAt)],
    ['Артикул', product.sku],
    ['Гарантия до', end ? formatDate(end) : '—'],
  ];
  const nameBottom = 9.6 + nameLines.length * 3.3;
  const gridTop = Math.max(nameBottom + 1.2, 17.2);
  return (
    <g>
      <rect x="0.4" y="0.4" width="69.2" height="39.2" rx="1.6" fill="none" stroke={INK} strokeWidth="0.35" />
      <path d="M0.4 7.2H69.6" stroke={INK} strokeWidth="0.35" />
      {logoHref ? (
        <image href={logoHref} x={2.4} y={1.8} width={3.6} height={3.6} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <Mark x={2.4} y={1.8} size={3.6} />
      )}
      <text x="7.2" y="4.75" fontFamily={DISPLAY} fontWeight="800" fontSize="2.2" fill={INK}>
        {companyName.length > 30 ? `${companyName.slice(0, 29)}…` : companyName}
      </text>
      <text x="67.4" y="4.7" textAnchor="end" fontFamily={SANS} fontWeight="600" fontSize="1.6" fill={MUTED}>
        Цифровой паспорт изделия
      </text>
      {nameLines.map((line, i) => (
        <text key={i} x="2.6" y={11.6 + i * 3.3} fontFamily={DISPLAY} fontWeight="800" fontSize="2.7" fill={INK}>
          {line}
        </text>
      ))}
      {cells.map(([label, value], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 2.6 + col * 21;
        const y = gridTop + row * 8.4;
        return (
          <g key={label}>
            <path d={`M${x} ${y}H${x + 19.4}`} stroke={INK} strokeWidth="0.2" />
            <text x={x} y={y + 2.6} fontFamily={SANS} fontSize="1.45" fill={MUTED}>
              {label}
            </text>
            <text x={x} y={y + 5.8} fontFamily={MONO} fontWeight="700" fontSize={value.length > 13 ? 1.8 : 2.15} fill={INK}>
              {value.length > 16 ? `${value.slice(0, 15)}…` : value}
            </text>
          </g>
        );
      })}
      <Qr url={url} x={46.2} y={10} size={21.6} />
      <text x="57" y="35.6" textAnchor="middle" fontFamily={SANS} fontSize="1.45" fill={MUTED}>
        Инструкция и гарантия
      </text>
      <text x="57" y="37.6" textAnchor="middle" fontFamily={SANS} fontSize="1.45" fill={MUTED}>
        по QR-коду
      </text>
    </g>
  );
}
