import type { ReactNode } from 'react';
import type { Dimensions, DrawingVariant } from '../../domain/types';
import { formatNumber } from '../../lib/format';

/**
 * Техническая иллюстрация изделия в стиле фасадного чертежа.
 * Используется вместо фотографии у демо-изделий и у изделий, для которых
 * производитель выбрал схему. С размерами — выносные размерные линии в мм.
 */

const METAL = '#C9CCC3';
const METAL_DARK = '#8E9189';
const DIM = '#8B8F85';
const DIM_TEXT = '#62665D';

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Art {
  box: Box;
  body: ReactNode;
}

function hinges(x: number, ys: number[], fill = '#6E7169') {
  return ys.map((y) => <rect key={y} x={x} y={y} width="4" height="16" rx="1" fill={fill} />);
}

function lever(x: number, y: number, dir: 1 | -1 = -1) {
  return (
    <g>
      <rect x={x - 4} y={y - 8} width="8" height="16" rx="1.5" fill={METAL} />
      <rect x={dir === -1 ? x - 28 : x} y={y - 2.5} width="28" height="5" rx="2.5" fill={METAL} />
    </g>
  );
}

function entrance(): Art {
  return {
    box: { x1: 130, y1: 46, x2: 270, y2: 356 },
    body: (
      <g>
        <rect x="130" y="46" width="140" height="310" fill="#262923" />
        <rect x="137" y="53" width="126" height="303" fill="#31352E" />
        <rect x="150" y="74" width="100" height="262" fill="none" stroke="#4A4F44" strokeWidth="1.5" />
        <path d="M150 122h78M172 166h78M150 286h62M186 310h64" stroke="#4A4F44" strokeWidth="1.5" />
        <circle cx="200" cy="104" r="3.2" fill={METAL} />
        <rect x="243" y="168" width="6" height="11" rx="1" fill={METAL} />
        {lever(246, 206)}
        <rect x="243" y="232" width="6" height="11" rx="1" fill={METAL} />
      </g>
    ),
  };
}

function technical(): Art {
  return {
    box: { x1: 128, y1: 44, x2: 272, y2: 356 },
    body: (
      <g>
        <rect x="128" y="44" width="144" height="312" fill="#9C9F98" />
        <rect x="135" y="51" width="130" height="305" fill="#CBCDC7" />
        {hinges(129, [78, 196, 314], '#74776F')}
        <rect x="162" y="296" width="76" height="40" fill="#B9BCB5" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="166" y={301 + i * 6} width="68" height="2.4" fill="#8F928B" />
        ))}
        <rect x="240" y="180" width="10" height="54" rx="2" fill="#2A2D27" />
        <rect x="216" y="191" width="32" height="5" rx="2.5" fill="#2A2D27" />
        <circle cx="245" cy="222" r="2.6" fill={METAL} />
      </g>
    ),
  };
}

function fireSign(x: number, y: number) {
  return (
    <g>
      <rect x={x} y={y} width="46" height="20" rx="2" fill="#C4442E" />
      <text x={x + 23} y={y + 14} textAnchor="middle" fontFamily="Manrope Variable, sans-serif" fontWeight="800" fontSize="10.5" fill="#fff">
        EI 60
      </text>
    </g>
  );
}

function fire(): Art {
  return {
    box: { x1: 128, y1: 46, x2: 272, y2: 356 },
    body: (
      <g>
        <rect x="128" y="46" width="144" height="310" fill="#D7D8D0" />
        <rect x="135" y="53" width="130" height="303" fill="#F4F3ED" />
        {hinges(129, [80, 200, 316], '#A2A59C')}
        <rect x="146" y="60" width="56" height="11" rx="2" fill={METAL_DARK} />
        <path d="M200 66l30 -2" stroke={METAL_DARK} strokeWidth="4" strokeLinecap="round" />
        {fireSign(177, 122)}
        <rect x="146" y="212" width="112" height="9" rx="4.5" fill="#B4B7AE" />
        <rect x="149" y="208" width="10" height="17" rx="2" fill={METAL_DARK} />
        <rect x="245" y="208" width="10" height="17" rx="2" fill={METAL_DARK} />
      </g>
    ),
  };
}

function double(fireRated: boolean): Art {
  const frame = fireRated ? '#C9CAC2' : '#3A2A22';
  const leaf = fireRated ? '#E4E5DE' : '#4A372D';
  const line = fireRated ? '#C3C4BB' : '#5F493D';
  return {
    box: { x1: 100, y1: 46, x2: 300, y2: 356 },
    body: (
      <g>
        <rect x="100" y="46" width="200" height="310" fill={frame} />
        <rect x="107" y="53" width="58" height="303" fill={leaf} />
        <rect x="167" y="53" width="126" height="303" fill={leaf} />
        <rect x="117" y="72" width="38" height="266" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="181" y="72" width="98" height="266" fill="none" stroke={line} strokeWidth="1.5" />
        {fireRated ? (
          <g>
            <rect x="112" y="60" width="40" height="10" rx="2" fill={METAL_DARK} />
            <rect x="200" y="60" width="52" height="10" rx="2" fill={METAL_DARK} />
            {fireSign(207, 120)}
            <rect x="178" y="212" width="104" height="9" rx="4.5" fill="#B4B7AE" />
          </g>
        ) : (
          <g>
            <rect x="174" y="166" width="6" height="11" rx="1" fill={METAL} />
            {lever(177, 206, 1)}
            <rect x="174" y="232" width="6" height="11" rx="1" fill={METAL} />
          </g>
        )}
      </g>
    ),
  };
}

function block(): Art {
  return {
    box: { x1: 118, y1: 36, x2: 282, y2: 356 },
    body: (
      <g>
        <rect x="118" y="36" width="164" height="320" fill="#1F211D" />
        <rect x="128" y="46" width="144" height="310" fill="#2C2E29" />
        <rect x="134" y="52" width="132" height="304" fill="#F2F2ED" />
        <rect x="150" y="76" width="100" height="258" fill="none" stroke="#DADAD3" strokeWidth="1.5" />
        <path d="M150 205h100" stroke="#DADAD3" strokeWidth="1.5" />
        <rect x="245" y="194" width="9" height="40" rx="2" fill="#2A2D27" />
        <rect x="224" y="202" width="28" height="5" rx="2.5" fill="#2A2D27" />
      </g>
    ),
  };
}

function gate(): Art {
  const ribs = (x: number, w: number) =>
    Array.from({ length: Math.floor(w / 12) }, (_, i) => <path key={i} d={`M${x + 8 + i * 12} 70v280`} stroke="#555956" strokeWidth="1.4" />);
  return {
    box: { x1: 62, y1: 60, x2: 338, y2: 356 },
    body: (
      <g>
        <rect x="62" y="60" width="11" height="296" fill="#2F3230" />
        <rect x="327" y="60" width="11" height="296" fill="#2F3230" />
        <rect x="75" y="64" width="124" height="292" fill="#474A49" />
        <rect x="201" y="64" width="124" height="292" fill="#474A49" />
        {ribs(75, 124)}
        {ribs(201, 124)}
        <rect x="75" y="64" width="124" height="292" fill="none" stroke="#2F3230" strokeWidth="4" />
        <rect x="201" y="64" width="124" height="292" fill="none" stroke="#2F3230" strokeWidth="4" />
        <rect x="232" y="196" width="62" height="160" fill="#4D504F" stroke="#2F3230" strokeWidth="3" />
        <rect x="282" y="266" width="5" height="18" rx="1.5" fill={METAL} />
        {[90, 200, 314].map((y) => (
          <g key={y}>
            <rect x="72" y={y} width="6" height="18" rx="1" fill="#6E7169" />
            <rect x="322" y={y} width="6" height="18" rx="1" fill="#6E7169" />
          </g>
        ))}
        <rect x="190" y="250" width="5" height="106" fill="#6E7169" />
      </g>
    ),
  };
}

function gateSectional(): Art {
  const panels = Array.from({ length: 6 }, (_, i) => 84 + i * 45.3);
  return {
    box: { x1: 62, y1: 72, x2: 338, y2: 356 },
    body: (
      <g>
        <rect x="62" y="72" width="276" height="284" fill="#2E312C" />
        <rect x="72" y="82" width="256" height="274" fill="#F1F1EC" />
        {panels.map((y, i) => (
          <g key={i}>
            {i > 0 && <path d={`M72 ${y}h256`} stroke="#C9CAC2" strokeWidth="1.6" />}
            <path d={`M72 ${y + 15}h256M72 ${y + 30}h256`} stroke="#E2E3DC" strokeWidth="1" />
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={96 + i * 58} y="136" width="34" height="14" rx="2" fill="#2A2D27" />
        ))}
        <rect x="190" y="332" width="20" height="6" rx="3" fill={METAL_DARK} />
      </g>
    ),
  };
}

function structure(): Art {
  const c = '#3B3E39';
  const posts = [70, 135, 200, 265, 330];
  return {
    box: { x1: 66, y1: 96, x2: 334, y2: 352 },
    body: (
      <g fill="none" stroke={c} strokeLinecap="square">
        <path d="M70 100h260" strokeWidth="8" />
        <path d="M70 300h260" strokeWidth="5" />
        {posts.map((x) => (
          <path key={x} d={`M${x} 100v248`} strokeWidth="7" />
        ))}
        {posts.slice(0, -1).map((x, i) => (
          <path key={x} d={i % 2 ? `M${x} 100L${x + 65} 300` : `M${x} 300L${x + 65} 100`} strokeWidth="3" />
        ))}
        {posts.map((x) => (
          <rect key={x} x={x - 12} y="348" width="24" height="5" fill={c} stroke="none" />
        ))}
      </g>
    ),
  };
}

function hatch(): Art {
  return {
    box: { x1: 120, y1: 110, x2: 280, y2: 270 },
    body: (
      <g>
        <rect x="70" y="60" width="260" height="260" fill="#E0E0D9" />
        {Array.from({ length: 18 }, (_, i) => (
          <path key={i} d={`M${70 + i * 16} 320L${70 + i * 16 + 60} 260`} stroke="#D3D3CB" strokeWidth="1" />
        ))}
        <rect x="120" y="110" width="160" height="160" fill="#D2D3CB" />
        <rect x="127" y="117" width="146" height="146" fill="#F6F6F1" />
        <circle cx="255" cy="190" r="7" fill={METAL_DARK} />
        <path d="M255 186l3.5 6h-7z" fill="#F6F6F1" />
      </g>
    ),
  };
}

function hardware(): Art {
  return {
    box: { x1: 96, y1: 150, x2: 336, y2: 214 },
    body: (
      <g>
        <rect x="96" y="160" width="160" height="46" rx="7" fill="#CDD0C8" />
        <rect x="96" y="160" width="160" height="46" rx="7" fill="none" stroke="#A5A89F" strokeWidth="1.5" />
        <rect x="104" y="196" width="144" height="4" rx="2" fill="#B8BBB2" />
        <circle cx="114" cy="176" r="4" fill={METAL_DARK} />
        <circle cx="128" cy="176" r="4" fill={METAL_DARK} />
        <circle cx="226" cy="206" r="11" fill="#6E7169" />
        <path d="M226 206L300 240" stroke="#7E8179" strokeWidth="9" strokeLinecap="round" />
        <path d="M300 240L322 172" stroke="#7E8179" strokeWidth="7" strokeLinecap="round" />
        <circle cx="300" cy="240" r="5" fill="#5D6058" />
        <rect x="306" y="150" width="34" height="16" rx="3" fill="#A5A89F" />
      </g>
    ),
  };
}

const ART: Record<DrawingVariant, () => Art> = {
  entrance,
  technical,
  fire,
  'fire-double': () => double(true),
  double: () => double(false),
  block,
  gate,
  'gate-sectional': gateSectional,
  structure,
  hatch,
  hardware,
};

export const DRAWING_OPTIONS: { variant: DrawingVariant; label: string }[] = [
  { variant: 'entrance', label: 'Входная дверь' },
  { variant: 'technical', label: 'Техническая дверь' },
  { variant: 'fire', label: 'Дверь EI' },
  { variant: 'double', label: 'Двупольная дверь' },
  { variant: 'fire-double', label: 'Двупольная EI' },
  { variant: 'block', label: 'Дверной блок' },
  { variant: 'gate', label: 'Распашные ворота' },
  { variant: 'gate-sectional', label: 'Секционные ворота' },
  { variant: 'structure', label: 'Каркас' },
  { variant: 'hatch', label: 'Люк' },
  { variant: 'hardware', label: 'Доводчик' },
];

export function ProductDrawing({ variant, dims, className }: { variant: DrawingVariant; dims?: Dimensions | null; className?: string }) {
  const art = (ART[variant] ?? entrance)();
  const { x1, y1, x2, y2 } = art.box;
  const showDims = Boolean(dims && (dims.width || dims.height));
  return (
    <svg className={className} viewBox="0 0 400 400" role="img" aria-label="Техническая иллюстрация изделия" preserveAspectRatio="xMidYMid meet">
      <path d="M24 356.5h352" stroke="#C9CBC1" strokeWidth="1" />
      {art.body}
      {showDims && dims?.width ? (
        <g stroke={DIM} strokeWidth="1">
          <path d={`M${x1} ${y2 + 8}v18M${x2} ${y2 + 8}v18M${x1} ${y2 + 20}h${x2 - x1}`} />
          <path d={`M${x1} ${y2 + 20}l6 -3v6zM${x2} ${y2 + 20}l-6 -3v6z`} fill={DIM} stroke="none" />
          <text
            x={(x1 + x2) / 2}
            y={y2 + 38}
            textAnchor="middle"
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize="11"
            fill={DIM_TEXT}
            stroke="none"
          >
            {formatNumber(dims.width)}
          </text>
        </g>
      ) : null}
      {showDims && dims?.height ? (
        <g stroke={DIM} strokeWidth="1">
          <path d={`M${x1 - 8} ${y1}h-18M${x1 - 8} ${y2}h-18M${x1 - 20} ${y1}v${y2 - y1}`} />
          <path d={`M${x1 - 20} ${y1}l-3 6h6zM${x1 - 20} ${y2}l-3 -6h6z`} fill={DIM} stroke="none" />
          <text
            x={x1 - 28}
            y={(y1 + y2) / 2}
            textAnchor="middle"
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize="11"
            fill={DIM_TEXT}
            stroke="none"
            transform={`rotate(-90 ${x1 - 28} ${(y1 + y2) / 2})`}
          >
            {formatNumber(dims.height)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
