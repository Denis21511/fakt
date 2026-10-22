import type { Dimensions } from '../domain/types';

const nf = new Intl.NumberFormat('ru-RU');

export function formatNumber(n: number): string {
  return nf.format(n);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
}

export function formatDimensions(d: Dimensions): string {
  const parts = [d.width, d.height, d.depth].filter((v): v is number => typeof v === 'number' && v > 0);
  if (parts.length === 0) return '';
  return `${parts.map(formatNumber).join(' × ')} мм`;
}

/** Ссылка без протокола для показа: https://site.ru/ → site.ru */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function externalUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
