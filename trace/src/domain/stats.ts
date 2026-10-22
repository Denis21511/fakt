import { todayISO } from '../lib/dates';
import { CATEGORIES } from './catalog';
import { productIssues, type ProductIssue } from './passport';
import type { Product, ProductCategory, ProductDocument } from './types';
import { warrantyInfo, type WarrantyStatus } from './warranty';

export interface WorkspaceStats {
  total: number;
  published: number;
  drafts: number;
  withdrawn: number;
  unpublished: number;
  warranty: Record<WarrantyStatus, number>;
  byCategory: { id: ProductCategory; label: string; count: number }[];
  attention: { product: Product; issues: ProductIssue[] }[];
}

export function workspaceStats(products: Product[], documents: ProductDocument[], today = todayISO()): WorkspaceStats {
  const warranty: Record<WarrantyStatus, number> = { none: 0, pending: 0, active: 0, expiring: 0, expired: 0 };
  for (const p of products) warranty[warrantyInfo(p.warranty, today).status]++;
  const published = products.filter((p) => p.passport.status === 'published').length;
  const drafts = products.filter((p) => p.passport.status === 'draft').length;
  const withdrawn = products.filter((p) => p.passport.status === 'withdrawn').length;
  return {
    total: products.length,
    published,
    drafts,
    withdrawn,
    unpublished: products.length - published,
    warranty,
    byCategory: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: products.filter((p) => p.category === c.id).length }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
    attention: products
      .map((product) => ({ product, issues: productIssues(product, documents, today) }))
      // Только то, что требует действия: отсутствие фото или гарантии само по себе не блокирует паспорт
      .filter((x) => x.issues.some((i) => i.kind !== 'no-photo' && i.kind !== 'no-warranty'))
      .sort((a, b) => b.issues.length - a.issues.length || b.product.updatedAt.localeCompare(a.product.updatedAt)),
  };
}
