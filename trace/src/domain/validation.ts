import { diffDays, isValidISODate, todayISO } from '../lib/dates';
import type { PassportStatus, Product, ProductCategory, SpecRow } from './types';

/** Значения формы изделия — числа хранятся строками, пока пользователь печатает */
export interface ProductFormValues {
  name: string;
  category: ProductCategory | '';
  sku: string;
  serial: string;
  description: string;
  manufacturer: string;
  model: string;
  material: string;
  width: string;
  height: string;
  depth: string;
  color: string;
  manufacturedAt: string;
  equipment: string[];
  specs: SpecRow[];
  warrantyMonths: string;
  warrantyStart: string;
  warrantyTerms: string;
  passportStatus: PassportStatus;
}

export type FormField = keyof ProductFormValues;
export type FieldErrors = Partial<Record<FormField, string>>;

export type StepId = 'basics' | 'specs' | 'warranty' | 'documents' | 'publish';

export const STEP_FIELDS: Record<StepId, FormField[]> = {
  basics: ['name', 'category', 'sku', 'serial', 'description'],
  specs: ['manufacturer', 'model', 'material', 'width', 'height', 'depth', 'color', 'manufacturedAt', 'equipment', 'specs'],
  warranty: ['warrantyMonths', 'warrantyStart', 'warrantyTerms'],
  documents: [],
  publish: ['passportStatus'],
};

export function emptyFormValues(): ProductFormValues {
  return {
    name: '',
    category: '',
    sku: '',
    serial: '',
    description: '',
    manufacturer: '',
    model: '',
    material: '',
    width: '',
    height: '',
    depth: '',
    color: '',
    manufacturedAt: todayISO(),
    equipment: [],
    specs: [],
    warrantyMonths: '',
    warrantyStart: '',
    warrantyTerms: '',
    passportStatus: 'draft',
  };
}

export function productToForm(p: Product): ProductFormValues {
  const num = (v: number | null) => (v === null ? '' : String(v));
  return {
    name: p.name,
    category: p.category,
    sku: p.sku,
    serial: p.serial,
    description: p.description,
    manufacturer: p.manufacturer,
    model: p.model,
    material: p.material,
    width: num(p.dimensions.width),
    height: num(p.dimensions.height),
    depth: num(p.dimensions.depth),
    color: p.color,
    manufacturedAt: p.manufacturedAt,
    equipment: [...p.equipment],
    specs: p.specs.map((s) => ({ ...s })),
    warrantyMonths: num(p.warranty.months),
    warrantyStart: p.warranty.startDate ?? '',
    warrantyTerms: p.warranty.terms,
    passportStatus: p.passport.status,
  };
}

export function parseIntOrNull(value: string): number | null {
  const v = value.trim().replace(/\s/g, '');
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

const CODE_RE = /^[\p{L}\d][\p{L}\d\-./_ ]*$/u;

export interface ValidationContext {
  /** Изделия, с которыми проверяется уникальность серийного номера */
  products: Pick<Product, 'id' | 'serial'>[];
  selfId: string | null;
}

export function validateProductForm(v: ProductFormValues, ctx: ValidationContext): FieldErrors {
  const e: FieldErrors = {};
  const today = todayISO();

  if (!v.name.trim()) e.name = 'Укажите название изделия';
  else if (v.name.trim().length > 120) e.name = 'Не длиннее 120 символов';

  if (!v.category) e.category = 'Выберите категорию';

  if (!v.sku.trim()) e.sku = 'Укажите артикул';
  else if (!CODE_RE.test(v.sku.trim())) e.sku = 'Буквы, цифры, дефис, точка или косая черта';

  const serial = v.serial.trim();
  if (!serial) e.serial = 'Укажите серийный номер — он печатается на этикетке';
  else if (!CODE_RE.test(serial)) e.serial = 'Буквы, цифры, дефис, точка или косая черта';
  else {
    const dup = ctx.products.find((p) => p.id !== ctx.selfId && p.serial.trim().toLowerCase() === serial.toLowerCase());
    if (dup) e.serial = 'Изделие с таким серийным номером уже есть в каталоге';
  }

  if (v.description.length > 1000) e.description = 'Не длиннее 1000 символов';

  if (!v.manufacturer.trim()) e.manufacturer = 'Укажите производителя';

  for (const key of ['width', 'height', 'depth'] as const) {
    if (!v[key].trim()) continue;
    const n = parseIntOrNull(v[key]);
    if (n === null || n <= 0 || n > 30000) e[key] = 'Целое число миллиметров, до 30 000';
  }

  if (!v.manufacturedAt) e.manufacturedAt = 'Укажите дату изготовления';
  else if (!isValidISODate(v.manufacturedAt)) e.manufacturedAt = 'Некорректная дата';
  else if (diffDays(today, v.manufacturedAt) > 0) e.manufacturedAt = 'Дата изготовления не может быть в будущем';

  const months = v.warrantyMonths.trim();
  if (months) {
    const n = parseIntOrNull(months);
    if (n === null || n <= 0 || n > 240) e.warrantyMonths = 'Целое число месяцев от 1 до 240';
    if (!v.warrantyStart) e.warrantyStart = 'Укажите, с какой даты действует гарантия';
  } else if (v.warrantyStart) {
    e.warrantyMonths = 'Укажите срок гарантии или очистите дату начала';
  }
  if (v.warrantyStart) {
    if (!isValidISODate(v.warrantyStart)) e.warrantyStart = 'Некорректная дата';
    else if (isValidISODate(v.manufacturedAt) && diffDays(v.manufacturedAt, v.warrantyStart) < 0) {
      e.warrantyStart = 'Гарантия не может начаться раньше даты изготовления';
    }
  }
  if (v.warrantyTerms.length > 2000) e.warrantyTerms = 'Не длиннее 2000 символов';

  return e;
}

export function firstStepWithError(errors: FieldErrors, steps: StepId[]): StepId | null {
  for (const step of steps) {
    if (STEP_FIELDS[step].some((f) => errors[f])) return step;
  }
  return null;
}
