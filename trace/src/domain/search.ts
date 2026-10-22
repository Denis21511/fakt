import type { Product } from './types';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '');
/** FM-2603-0147 ищется и как «fm26030147», и как «0147» */
const compact = (s: string) => norm(s).replace(/[\s\-./_]/g, '');

export function matchesProduct(p: Product, query: string): boolean {
  const q = norm(query.trim());
  if (!q) return true;
  const qc = compact(query);
  return norm(p.name).includes(q) || norm(p.model).includes(q) || (qc.length > 0 && (compact(p.sku).includes(qc) || compact(p.serial).includes(qc)));
}

export function searchProducts(products: Product[], query: string): Product[] {
  return products.filter((p) => matchesProduct(p, query));
}
