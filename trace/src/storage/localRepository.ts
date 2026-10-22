import { createDemoWorkspace } from '../data/demo';
import { toPublicPassport } from '../domain/passport';
import type { Product, ProductDocument, Workspace } from '../domain/types';
import { indexedDbFileStore, type FileStore, type StoredFile } from './fileStore';
import { RepositoryError, type TraceRepository } from './repository';

const KEY = 'trace:workspace:v1';

/**
 * Демо-хранилище: метаданные — в localStorage, файлы — в IndexedDB.
 * Данные видны только в этом браузере; это не production-бэкенд.
 * При первом открытии на любом устройстве создаётся одинаковый демо-набор,
 * поэтому QR-коды демо-изделий открываются и с телефона.
 */
export function createLocalRepository(files: FileStore = indexedDbFileStore): TraceRepository {
  const generating = new Map<string, Promise<StoredFile | null>>();

  function read(): Workspace | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      throw new RepositoryError('Браузер запретил доступ к локальному хранилищу');
    }
    if (!raw) return null;
    try {
      const ws = JSON.parse(raw) as Workspace;
      if (ws?.version !== 1 || !Array.isArray(ws.products) || !Array.isArray(ws.documents) || !ws.company) return null;
      return ws;
    } catch {
      return null;
    }
  }

  function write(ws: Workspace) {
    try {
      localStorage.setItem(KEY, JSON.stringify(ws));
    } catch (err) {
      const quota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
      throw new RepositoryError(quota ? 'Хранилище браузера заполнено — изменения не сохранены' : 'Не удалось сохранить данные в браузере');
    }
  }

  function ensure(): Workspace {
    const existing = read();
    if (existing) return existing;
    const seeded = createDemoWorkspace();
    write(seeded);
    return seeded;
  }

  function fileIdsOf(ws: Workspace): Set<string> {
    const ids = new Set<string>();
    for (const d of ws.documents) ids.add(d.fileId);
    for (const p of ws.products) if (p.photo?.kind === 'file') ids.add(p.photo.fileId);
    if (ws.company.logoFileId) ids.add(ws.company.logoFileId);
    return ids;
  }

  /** Демо-PDF рисуется при первом обращении и сохраняется в IndexedDB */
  async function materializeDemoFile(doc: ProductDocument): Promise<StoredFile | null> {
    const pending = generating.get(doc.fileId);
    if (pending) return pending;
    const job = (async () => {
      const ws = ensure();
      const product = ws.products.find((p) => p.id === doc.productId);
      if (!product) return null;
      const { renderDemoDocument } = await import('../data/demo/renderDocument');
      const blob = await renderDemoDocument(doc, product, ws.company);
      const stored = await files.put(blob, doc.fileName, doc.fileId);
      const fresh = read();
      const target = fresh?.documents.find((d) => d.id === doc.id);
      if (fresh && target && target.size !== stored.size) {
        target.size = stored.size;
        write(fresh);
      }
      return stored;
    })();
    generating.set(doc.fileId, job);
    try {
      return await job;
    } finally {
      generating.delete(doc.fileId);
    }
  }

  async function documentFile(doc: ProductDocument): Promise<StoredFile | null> {
    const file = await files.get(doc.fileId);
    if (file) return file;
    return doc.demo ? materializeDemoFile(doc) : null;
  }

  function publishedProduct(ws: Workspace, token: string): Product | null {
    const t = token.trim().toUpperCase();
    const product = ws.products.find((p) => p.token === t);
    return product && product.passport.status === 'published' ? product : null;
  }

  return {
    kind: 'local',
    files,

    async load() {
      return ensure();
    },

    async saveProduct(product) {
      const ws = ensure();
      const i = ws.products.findIndex((p) => p.id === product.id);
      if (i >= 0) ws.products[i] = product;
      else ws.products.unshift(product);
      write(ws);
      return product;
    },

    async deleteProduct(id) {
      const ws = ensure();
      const product = ws.products.find((p) => p.id === id);
      if (!product) return;
      const docs = ws.documents.filter((d) => d.productId === id);
      ws.products = ws.products.filter((p) => p.id !== id);
      ws.documents = ws.documents.filter((d) => d.productId !== id);
      write(ws);
      const fileIds = docs.map((d) => d.fileId);
      if (product.photo?.kind === 'file') fileIds.push(product.photo.fileId);
      await files.remove(fileIds).catch(() => undefined);
    },

    async saveDocument(doc) {
      const ws = ensure();
      if (!ws.products.some((p) => p.id === doc.productId)) throw new RepositoryError('Изделие для документа не найдено');
      const i = ws.documents.findIndex((d) => d.id === doc.id);
      if (i >= 0) ws.documents[i] = doc;
      else ws.documents.unshift(doc);
      write(ws);
      return doc;
    },

    async deleteDocument(id) {
      const ws = ensure();
      const doc = ws.documents.find((d) => d.id === id);
      if (!doc) return;
      ws.documents = ws.documents.filter((d) => d.id !== id);
      write(ws);
      await files.remove([doc.fileId]).catch(() => undefined);
    },

    async saveCompany(company) {
      const ws = ensure();
      const previousLogo = ws.company.logoFileId;
      ws.company = company;
      write(ws);
      if (previousLogo && previousLogo !== company.logoFileId) await files.remove([previousLogo]).catch(() => undefined);
      return company;
    },

    async replaceWorkspace(next) {
      const current = read();
      write(next);
      if (current) {
        const keep = fileIdsOf(next);
        const drop = [...fileIdsOf(current)].filter((id) => !keep.has(id));
        await files.remove(drop).catch(() => undefined);
      }
      return next;
    },

    getDocumentFile: documentFile,

    async getPassport(token) {
      const ws = ensure();
      const t = token.trim().toUpperCase();
      const product = ws.products.find((p) => p.token === t);
      if (!product) return { status: 'not-found' };
      if (product.passport.status !== 'published') return { status: 'unpublished' };
      return { status: 'ok', passport: toPublicPassport(product, ws.documents, ws.company) };
    },

    async getPassportFile(token, documentId) {
      const ws = ensure();
      const product = publishedProduct(ws, token);
      if (!product || !ws.company.publicDisplay.documents) return null;
      const doc = ws.documents.find((d) => d.id === documentId && d.productId === product.id && d.isPublic);
      return doc ? documentFile(doc) : null;
    },

    async getPublicAsset(token, fileId) {
      const ws = ensure();
      const product = publishedProduct(ws, token);
      if (!product) return null;
      const allowed = (product.photo?.kind === 'file' && product.photo.fileId === fileId) || ws.company.logoFileId === fileId;
      return allowed ? files.get(fileId) : null;
    },

    subscribe(listener) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY || e.key === null) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}
