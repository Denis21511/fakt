import { formatDate, todayISO } from '../lib/dates';
import { CATEGORY_SHORT, DOCUMENT_TYPE_LABEL } from './catalog';
import type { CompanySettings, Dimensions, DocumentType, ISODate, ProductCategory, ProductDocument, ProductPhoto, Product, SpecRow } from './types';
import { warrantyInfo, type WarrantyStatus } from './warranty';

/**
 * Публичный паспорт — то, что видит покупатель. Собирается только из разрешённых полей,
 * чтобы внутренние данные не попадали на открытую страницу. С сервером этот объект
 * будет ответом публичного API.
 */
export interface PublicPassport {
  token: string;
  publishedAt: string | null;
  /** Паспорт из демонстрационного набора — страница честно об этом сообщает */
  isDemo: boolean;
  product: {
    name: string;
    category: ProductCategory;
    categoryLabel: string;
    sku: string | null;
    serial: string;
    description: string;
    photo: ProductPhoto | null;
    manufacturer: string;
    model: string;
    material: string;
    dimensions: Dimensions;
    color: string;
    manufacturedAt: ISODate;
    equipment: string[];
    specs: SpecRow[];
  };
  warranty: {
    months: number | null;
    startDate: ISODate | null;
    endDate: ISODate | null;
    status: WarrantyStatus;
    remaining: string | null;
    terms: string | null;
  };
  documents: PublicDocument[];
  company: PublicCompany;
}

export interface PublicDocument {
  id: string;
  title: string;
  type: DocumentType;
  typeLabel: string;
  fileName: string;
  mime: string;
  size: number;
}

export interface PublicCompany {
  name: string;
  legalName: string;
  logoFileId: string | null;
  brandColor: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
}

export type PassportLookup = { status: 'ok'; passport: PublicPassport } | { status: 'unpublished' } | { status: 'not-found' };

export function toPublicPassport(product: Product, documents: ProductDocument[], company: CompanySettings, today = todayISO()): PublicPassport {
  const show = company.publicDisplay;
  const w = warrantyInfo(product.warranty, today);
  const pick = (enabled: boolean, value: string) => (enabled && value.trim() ? value.trim() : null);
  return {
    token: product.token,
    publishedAt: product.passport.publishedAt,
    isDemo: Boolean(product.demo),
    product: {
      name: product.name,
      category: product.category,
      categoryLabel: CATEGORY_SHORT[product.category],
      sku: show.sku ? product.sku : null,
      serial: product.serial,
      description: product.description,
      photo: product.photo,
      manufacturer: product.manufacturer,
      model: product.model,
      material: product.material,
      dimensions: product.dimensions,
      color: product.color,
      manufacturedAt: product.manufacturedAt,
      equipment: product.equipment.filter((e) => e.trim()),
      specs: product.specs.filter((s) => s.label.trim() && s.value.trim()),
    },
    warranty: {
      months: product.warranty.months,
      startDate: w.startDate,
      endDate: w.endDate,
      status: w.status,
      remaining: w.remaining,
      terms: show.warrantyTerms && product.warranty.terms.trim() ? product.warranty.terms.trim() : null,
    },
    documents: show.documents
      ? documents
          .filter((d) => d.productId === product.id && d.isPublic)
          .map((d) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            typeLabel: DOCUMENT_TYPE_LABEL[d.type],
            fileName: d.fileName,
            mime: d.mime,
            size: d.size,
          }))
      : [],
    company: {
      name: company.name,
      legalName: company.legalName,
      logoFileId: company.logoFileId,
      brandColor: company.brandColor,
      phone: pick(show.phone, company.phone),
      email: pick(show.email, company.email),
      website: pick(show.website, company.website),
      address: pick(show.address, company.address),
    },
  };
}

export type IssueKind = 'draft' | 'withdrawn' | 'no-instruction' | 'warranty-expiring' | 'no-photo' | 'no-warranty';

export interface ProductIssue {
  kind: IssueKind;
  label: string;
}

const ISSUE_ORDER: IssueKind[] = ['draft', 'no-instruction', 'warranty-expiring', 'withdrawn', 'no-photo', 'no-warranty'];

/** Что мешает изделию иметь полноценный паспорт — для блока «Требуют внимания» */
export function productIssues(product: Product, documents: ProductDocument[], today = todayISO()): ProductIssue[] {
  const issues: ProductIssue[] = [];
  if (product.passport.status === 'draft') issues.push({ kind: 'draft', label: 'Паспорт не опубликован' });
  if (product.passport.status === 'withdrawn') issues.push({ kind: 'withdrawn', label: 'Паспорт снят с публикации' });
  if (!documents.some((d) => d.productId === product.id && d.type === 'instruction')) {
    issues.push({ kind: 'no-instruction', label: 'Нет инструкции' });
  }
  const w = warrantyInfo(product.warranty, today);
  if (w.status === 'expiring') issues.push({ kind: 'warranty-expiring', label: `Гарантия истекает ${formatDate(w.endDate)}` });
  if (w.status === 'none') issues.push({ kind: 'no-warranty', label: 'Гарантия не оформлена' });
  if (!product.photo) issues.push({ kind: 'no-photo', label: 'Нет фотографии' });
  return issues.sort((a, b) => ISSUE_ORDER.indexOf(a.kind) - ISSUE_ORDER.indexOf(b.kind));
}
