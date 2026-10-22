import type { DocumentType, Product, ProductDocument, ProductCategory } from '../../../domain/types';
import type { ProductFormValues, StepId } from '../../../domain/validation';
import { parseIntOrNull } from '../../../domain/validation';
import type { PhotoChange } from '../../../state/workspace';

export interface PendingDoc {
  key: string;
  file: File;
  title: string;
  type: DocumentType;
  isPublic: boolean;
}

export interface EditorState {
  values: ProductFormValues;
  photo: PhotoChange;
  newDocs: PendingDoc[];
  removedDocIds: string[];
}

export const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: 'basics', title: 'Основная информация', hint: 'Название, коды, фото' },
  { id: 'specs', title: 'Характеристики', hint: 'Модель, материал, размеры' },
  { id: 'warranty', title: 'Гарантия', hint: 'Срок и условия' },
  { id: 'documents', title: 'Документы', hint: 'Инструкция, сертификаты' },
  { id: 'publish', title: 'Публикация', hint: 'Проверка и QR-код' },
];

/** Предлагает следующий серийный номер по шаблону последних изделий: FM-2610-0547 → FM-YYMM-0548 */
export function suggestSerial(products: Pick<Product, 'serial' | 'createdAt'>[], now = new Date()): string {
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const taken = new Set(products.map((p) => p.serial.toLowerCase()));
  const latest = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const dated = latest?.serial.match(/^([\p{L}]+)-(\d{4})-(\d+)$/u);
  let candidate: string;
  if (dated) {
    const prefix = dated[1];
    const width = dated[3].length;
    const max = products.reduce((m, p) => {
      const mm = p.serial.match(/^([\p{L}]+)-\d{4}-(\d+)$/u);
      return mm && mm[1] === prefix ? Math.max(m, Number(mm[2])) : m;
    }, 0);
    candidate = `${prefix}-${yymm}-${String(max + 1).padStart(width, '0')}`;
  } else {
    const generic = latest?.serial.match(/^(.*?)(\d+)$/);
    candidate = generic ? `${generic[1]}${String(Number(generic[2]) + 1).padStart(generic[2].length, '0')}` : `SN-${yymm}-0001`;
  }
  while (taken.has(candidate.toLowerCase())) {
    candidate = candidate.replace(/(\d+)$/, (d) => String(Number(d) + 1).padStart(d.length, '0'));
  }
  return candidate;
}

export const SPEC_SUGGESTIONS: Record<ProductCategory, string[]> = {
  entrance: ['Класс взломостойкости', 'Открывание', 'Контуры уплотнения', 'Толщина полотна', 'Масса'],
  technical: ['Открывание', 'Покрытие', 'Толщина металла', 'Масса'],
  fire: ['Предел огнестойкости', 'Открывание', 'Самозакрывание', 'Масса'],
  block: ['Открывание', 'Створки', 'Масса'],
  gate: ['Створки', 'Привод', 'Ветровая нагрузка', 'Масса'],
  structure: ['Антикоррозийная обработка', 'Контроль сварных швов', 'Нагрузка', 'Масса'],
  hardware: ['Масса двери', 'Ширина створки', 'Регулировка'],
};

export const DEFAULT_TERMS: Record<ProductCategory, string> = {
  entrance:
    'Гарантия распространяется на полотно, коробку, сварные швы, замки и фурнитуру при соблюдении инструкции по монтажу и эксплуатации. Не распространяется на механические повреждения, следы самостоятельного ремонта и повреждения покрытия абразивными средствами.',
  technical:
    'Гарантия распространяется на полотно, коробку, сварные швы и фурнитуру при соблюдении инструкции по монтажу и эксплуатации. Не распространяется на механические повреждения и следы самостоятельного ремонта.',
  fire: 'Гарантия распространяется на полотно, коробку, сварные швы, замок и доводчик. Огнестойкость сохраняется при монтаже организацией с лицензией МЧС и ежегодном осмотре уплотнителей и доводчика.',
  block:
    'Гарантия распространяется на полотно, коробку, наличники и фурнитуру при соблюдении инструкции по монтажу. Не распространяется на механические повреждения и следы самостоятельного ремонта.',
  gate: 'Гарантия распространяется на каркас, сварные соединения, петли и ригели. Обслуживание петель и ригелей — не реже одного раза в 6 месяцев.',
  structure: 'Гарантия распространяется на сварные соединения и антикоррозийное покрытие при монтаже по схеме производителя.',
  hardware: 'Гарантия действует при монтаже по шаблону из комплекта и соблюдении допустимой массы и ширины двери.',
};

/** Изделие из несохранённой формы — для предпросмотра паспорта */
export function previewProduct(values: ProductFormValues, base: Product | null, token: string, photo: Product['photo']): Product {
  const months = parseIntOrNull(values.warrantyMonths);
  const now = new Date().toISOString();
  return {
    id: base?.id ?? 'preview',
    token: base?.token ?? token,
    name: values.name.trim() || 'Название изделия',
    category: values.category || 'entrance',
    sku: values.sku.trim(),
    serial: values.serial.trim() || '—',
    description: values.description.trim(),
    photo,
    manufacturer: values.manufacturer.trim(),
    model: values.model.trim(),
    material: values.material.trim(),
    dimensions: { width: parseIntOrNull(values.width), height: parseIntOrNull(values.height), depth: parseIntOrNull(values.depth) },
    color: values.color.trim(),
    manufacturedAt: values.manufacturedAt,
    equipment: values.equipment.filter((e) => e.trim()),
    specs: values.specs.filter((s) => s.label.trim() && s.value.trim()),
    warranty: { months: months && months > 0 ? months : null, startDate: values.warrantyStart || null, terms: values.warrantyTerms },
    passport: { status: values.passportStatus, publishedAt: base?.passport.publishedAt ?? now },
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}

export function previewDocuments(productId: string, existing: ProductDocument[], state: EditorState): ProductDocument[] {
  const kept = existing.filter((d) => !state.removedDocIds.includes(d.id));
  const pending: ProductDocument[] = state.newDocs.map((d) => ({
    id: d.key,
    productId,
    title: d.title || d.file.name,
    type: d.type,
    fileId: d.key,
    fileName: d.file.name,
    mime: d.file.type,
    size: d.file.size,
    uploadedAt: new Date().toISOString(),
    isPublic: d.isPublic,
  }));
  return [...kept.map((d) => ({ ...d, productId })), ...pending];
}

export function photoAfterChange(base: Product | null, change: PhotoChange): Product['photo'] {
  switch (change.action) {
    case 'keep':
      return base?.photo ?? null;
    case 'remove':
      return null;
    case 'drawing':
      return { kind: 'drawing', variant: change.variant };
    case 'replace':
      // Файл ещё не сохранён — предпросмотр показывает его отдельно
      return null;
  }
}
