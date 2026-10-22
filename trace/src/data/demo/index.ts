import type { Workspace } from '../../domain/types';
import { DEMO_COMPANY, EMPTY_COMPANY } from './company';
import { buildDemoDocuments } from './documents';
import { buildDemoProducts } from './products';

export function createDemoWorkspace(): Workspace {
  return {
    version: 1,
    mode: 'demo',
    company: structuredClone(DEMO_COMPANY),
    products: buildDemoProducts(),
    documents: buildDemoDocuments(),
  };
}

export function createEmptyWorkspace(): Workspace {
  return { version: 1, mode: 'own', company: structuredClone(EMPTY_COMPANY), products: [], documents: [] };
}

export { DEMO_COMPANY };
