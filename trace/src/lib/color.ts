const GRAPHITE: [number, number, number] = [23, 25, 22];

/** Цвет текста поверх фирменного цвета: графит или белый — что контрастнее по WCAG */
export function inkOn(hex: string): '#171916' | '#FFFFFF' {
  const rgb = parseHex(hex);
  if (!rgb) return '#171916';
  const lum = relativeLuminance(rgb);
  const contrastDark = (lum + 0.05) / (relativeLuminance(GRAPHITE) + 0.05);
  const contrastLight = 1.05 / (lum + 0.05);
  return contrastDark >= contrastLight ? '#171916' : '#FFFFFF';
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function parseHex(hex: string): [number, number, number] | null {
  if (!isHexColor(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
