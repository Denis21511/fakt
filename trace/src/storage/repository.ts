import type { PassportLookup } from '../domain/passport';
import type { CompanySettings, Product, ProductDocument, Workspace } from '../domain/types';
import type { FileStore, StoredFile } from './fileStore';

/**
 * Граница между интерфейсом и хранилищем. Сейчас реализована локально
 * (localStorage + IndexedDB, см. localRepository.ts); серверная реализация
 * должна повторить этот контракт — экраны и store менять не придётся.
 */
export interface TraceRepository {
  /** 'local' — данные живут в этом браузере и не видны с других устройств */
  readonly kind: 'local' | 'remote';
  readonly files: FileStore;

  load(): Promise<Workspace>;
  saveProduct(product: Product): Promise<Product>;
  /** Удаляет изделие вместе с документами и файлами */
  deleteProduct(id: string): Promise<void>;
  saveDocument(doc: ProductDocument): Promise<ProductDocument>;
  deleteDocument(id: string): Promise<void>;
  saveCompany(company: CompanySettings): Promise<CompanySettings>;
  /** Полная замена рабочего пространства: восстановление демо или чистый старт */
  replaceWorkspace(next: Workspace): Promise<Workspace>;

  /** Файл документа для кабинета производителя */
  getDocumentFile(doc: ProductDocument): Promise<StoredFile | null>;

  /** Публичное API: только опубликованные паспорта и разрешённые к показу поля */
  getPassport(token: string): Promise<PassportLookup>;
  getPassportFile(token: string, documentId: string): Promise<StoredFile | null>;
  getPublicAsset(token: string, fileId: string): Promise<StoredFile | null>;

  /** Изменения из другой вкладки или другого клиента */
  subscribe(listener: () => void): () => void;
}

export class RepositoryError extends Error {}
