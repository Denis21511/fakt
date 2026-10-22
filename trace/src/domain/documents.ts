import type { DocumentType } from './types';

/** Тип документа по имени файла — чтобы не выбирать его вручную в типичных случаях */
export function guessDocType(fileName: string): DocumentType {
  const n = fileName.toLowerCase();
  if (/инструк|instruk|manual|руковод/.test(n)) return 'instruction';
  if (/сертиф|sertif|certif/.test(n)) return 'certificate';
  if (/паспорт|pasport|качеств|kachestv|quality/.test(n)) return 'quality';
  if (/гарант|garant|warrant/.test(n)) return 'warranty';
  if (/черт|chert|схем|shem|drawing/.test(n)) return 'drawing';
  return 'other';
}

export function titleFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim();
}
