import { uid } from '../lib/id';

export interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface StorageUsage {
  files: number;
  bytes: number;
  /** Квота, которую браузер выделил сайту, если он её сообщает */
  quota: number | null;
}

/** Хранилище файлов: фотографии, документы, логотип */
export interface FileStore {
  put(blob: Blob, name: string, id?: string): Promise<StoredFile>;
  get(id: string): Promise<StoredFile | null>;
  remove(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  usage(): Promise<StorageUsage>;
}

export class FileStoreError extends Error {}

const DB_NAME = 'trace-files';
const STORE = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new FileStoreError('Браузер не поддерживает хранение файлов (IndexedDB)'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new FileStoreError('Хранилище файлов недоступно: браузер запретил IndexedDB (например, в приватном режиме)'));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onabort = t.onerror = () => {
          const err = t.error;
          reject(
            new FileStoreError(
              err?.name === 'QuotaExceededError'
                ? 'В хранилище браузера закончилось место. Удалите ненужные документы.'
                : 'Не удалось записать файл в хранилище браузера',
            ),
          );
        };
      }),
  );
}

export const indexedDbFileStore: FileStore = {
  async put(blob, name, id = uid()) {
    const file: StoredFile = { id, blob, name, type: blob.type, size: blob.size, createdAt: new Date().toISOString() };
    await tx('readwrite', (s) => s.put(file));
    return file;
  },
  async get(id) {
    const file = await tx<StoredFile>('readonly', (s) => s.get(id));
    return file ?? null;
  },
  async remove(ids) {
    if (ids.length === 0) return;
    await tx('readwrite', (s) => {
      for (const id of ids) s.delete(id);
    });
  },
  async clear() {
    await tx('readwrite', (s) => s.clear());
  },
  async usage() {
    const all = (await tx<StoredFile[]>('readonly', (s) => s.getAll() as IDBRequest<StoredFile[]>)) ?? [];
    let quota: number | null = null;
    try {
      const est = await navigator.storage?.estimate?.();
      quota = est?.quota ?? null;
    } catch {
      quota = null;
    }
    return { files: all.length, bytes: all.reduce((sum, f) => sum + f.size, 0), quota };
  },
};
