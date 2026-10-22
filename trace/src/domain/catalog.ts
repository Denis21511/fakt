import type { DocumentType, DrawingVariant, PassportStatus, ProductCategory } from './types';

export const CATEGORIES: { id: ProductCategory; label: string; short: string }[] = [
  { id: 'entrance', label: 'Входные двери', short: 'Входная дверь' },
  { id: 'technical', label: 'Технические двери', short: 'Техническая дверь' },
  { id: 'fire', label: 'Противопожарные двери', short: 'Противопожарная дверь' },
  { id: 'block', label: 'Дверные блоки', short: 'Дверной блок' },
  { id: 'gate', label: 'Ворота', short: 'Ворота' },
  { id: 'structure', label: 'Металлоконструкции', short: 'Металлоконструкция' },
  { id: 'hardware', label: 'Комплектующие', short: 'Комплектующие' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<ProductCategory, string>;
export const CATEGORY_SHORT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.short])) as Record<ProductCategory, string>;

export const DEFAULT_DRAWING: Record<ProductCategory, DrawingVariant> = {
  entrance: 'entrance',
  technical: 'technical',
  fire: 'fire',
  block: 'block',
  gate: 'gate',
  structure: 'structure',
  hardware: 'hardware',
};

export const PASSPORT_STATUS_LABEL: Record<PassportStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  withdrawn: 'Снят с публикации',
};

export const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'instruction', label: 'Инструкция' },
  { id: 'quality', label: 'Паспорт качества' },
  { id: 'certificate', label: 'Сертификат' },
  { id: 'warranty', label: 'Гарантийный талон' },
  { id: 'drawing', label: 'Чертёж' },
  { id: 'other', label: 'Другое' },
];

export const DOCUMENT_TYPE_LABEL = Object.fromEntries(DOCUMENT_TYPES.map((t) => [t.id, t.label])) as Record<DocumentType, string>;

/** Ограничения локального хранилища MVP */
export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_DOCUMENT_EXT = '.pdf,.jpg,.jpeg,.png,.webp';
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_IMAGE_EXT = '.jpg,.jpeg,.png,.webp';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export const WARRANTY_PRESETS = [12, 24, 36, 60];

export const BRAND_COLOR_PRESETS = ['#C8F169', '#F2B33D', '#E8572A', '#3D7BF2', '#1F8A70', '#20221F'];
