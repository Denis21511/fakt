import { create } from 'zustand';
import { createDemoWorkspace } from '../data/demo';
import { EMPTY_COMPANY } from '../data/demo/company';
import { ACCEPTED_DOCUMENT_TYPES, ACCEPTED_IMAGE_TYPES, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from '../domain/catalog';
import type {
  CompanySettings,
  DocumentType,
  DrawingVariant,
  PassportStatus,
  Product,
  ProductDocument,
  Workspace,
  WorkspaceMode,
} from '../domain/types';
import { parseIntOrNull, type ProductFormValues } from '../domain/validation';
import { formatBytes } from '../lib/format';
import { uid } from '../lib/id';
import { downscaleImage } from '../lib/image';
import { repository } from '../storage';

export interface NewDocumentInput {
  file: File;
  title: string;
  type: DocumentType;
  productId: string;
  isPublic: boolean;
}

export type PhotoChange =
  { action: 'keep' } | { action: 'remove' } | { action: 'replace'; file: File } | { action: 'drawing'; variant: DrawingVariant };

export interface SaveProductInput {
  id: string | null;
  token: string;
  values: ProductFormValues;
  photo: PhotoChange;
  newDocuments: Omit<NewDocumentInput, 'productId'>[];
  removedDocumentIds: string[];
}

interface WorkspaceState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  mode: WorkspaceMode;
  company: CompanySettings;
  products: Product[];
  documents: ProductDocument[];

  init(): Promise<void>;
  reload(): Promise<void>;
  saveProduct(input: SaveProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  setPassportStatus(id: string, status: PassportStatus): Promise<Product>;
  addDocument(input: NewDocumentInput): Promise<ProductDocument>;
  updateDocument(id: string, patch: Partial<Pick<ProductDocument, 'title' | 'type' | 'isPublic'>>): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  saveCompany(company: CompanySettings, logo?: { action: 'keep' } | { action: 'remove' } | { action: 'replace'; file: File }): Promise<void>;
  restoreDemo(): Promise<void>;
  removeDemoData(): Promise<void>;
  /** Дорисовывает файлы демо-документов, чтобы в библиотеке были реальные размеры */
  prepareDemoFiles(): Promise<void>;
}

const now = () => new Date().toISOString();

export function validateDocumentFile(file: File): string | null {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) return 'Поддерживаются PDF, JPG, PNG и WEBP';
  if (file.size > MAX_DOCUMENT_BYTES) return `Файл больше ${formatBytes(MAX_DOCUMENT_BYTES)}`;
  if (file.size === 0) return 'Файл пустой';
  return null;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Поддерживаются JPG, PNG и WEBP';
  if (file.size > MAX_IMAGE_BYTES) return `Изображение больше ${formatBytes(MAX_IMAGE_BYTES)}`;
  return null;
}

function applyWorkspace(ws: Workspace) {
  return { mode: ws.mode, company: ws.company, products: ws.products, documents: ws.documents, status: 'ready' as const, error: null };
}

function buildProduct(input: SaveProductInput, base: Product | null, photo: Product['photo']): Product {
  const v = input.values;
  const timestamp = now();
  const months = parseIntOrNull(v.warrantyMonths);
  const status = v.passportStatus;
  const wasPublished = base?.passport.status === 'published';
  return {
    id: base?.id ?? uid(),
    token: base?.token ?? input.token,
    name: v.name.trim(),
    category: v.category || 'entrance',
    sku: v.sku.trim(),
    serial: v.serial.trim(),
    description: v.description.trim(),
    photo,
    manufacturer: v.manufacturer.trim(),
    model: v.model.trim(),
    material: v.material.trim(),
    dimensions: { width: parseIntOrNull(v.width), height: parseIntOrNull(v.height), depth: parseIntOrNull(v.depth) },
    color: v.color.trim(),
    manufacturedAt: v.manufacturedAt,
    equipment: v.equipment.map((e) => e.trim()).filter(Boolean),
    specs: v.specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value),
    warranty: {
      months: months && months > 0 ? months : null,
      startDate: months ? v.warrantyStart || null : null,
      terms: v.warrantyTerms.trim(),
    },
    passport: {
      status,
      publishedAt: status === 'published' && !wasPublished ? timestamp : (base?.passport.publishedAt ?? null),
    },
    createdAt: base?.createdAt ?? timestamp,
    updatedAt: timestamp,
    demo: base?.demo,
  };
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  status: 'idle',
  error: null,
  mode: 'demo',
  company: EMPTY_COMPANY,
  products: [],
  documents: [],

  async init() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      set(applyWorkspace(await repository.load()));
      repository.subscribe(() => void get().reload());
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : 'Не удалось загрузить данные' });
    }
  },

  async reload() {
    set(applyWorkspace(await repository.load()));
  },

  async saveProduct(input) {
    const base = input.id ? (get().products.find((p) => p.id === input.id) ?? null) : null;
    if (input.id && !base) throw new Error('Изделие не найдено — возможно, его удалили в другой вкладке');

    for (const d of input.newDocuments) {
      const problem = validateDocumentFile(d.file);
      if (problem) throw new Error(`«${d.file.name}»: ${problem}`);
    }

    // Файлы пишутся до метаданных: запись изделия не должна ссылаться на несохранённый файл
    let photo: Product['photo'] = base?.photo ?? null;
    let newPhotoFileId: string | null = null;
    if (input.photo.action === 'replace') {
      const problem = validateImageFile(input.photo.file);
      if (problem) throw new Error(problem);
      const blob = await downscaleImage(input.photo.file);
      const stored = await repository.files.put(blob, input.photo.file.name);
      newPhotoFileId = stored.id;
      photo = { kind: 'file', fileId: stored.id };
    } else if (input.photo.action === 'remove') {
      photo = null;
    } else if (input.photo.action === 'drawing') {
      photo = { kind: 'drawing', variant: input.photo.variant };
    }

    const product = buildProduct(input, base, photo);
    const storedDocs: ProductDocument[] = [];
    try {
      await repository.saveProduct(product);
      for (const d of input.newDocuments) {
        const file = await repository.files.put(d.file, d.file.name);
        storedDocs.push(
          await repository.saveDocument({
            id: uid(),
            productId: product.id,
            title: d.title.trim() || d.file.name,
            type: d.type,
            fileId: file.id,
            fileName: d.file.name,
            mime: d.file.type,
            size: file.size,
            uploadedAt: now(),
            isPublic: d.isPublic,
          }),
        );
      }
    } catch (err) {
      if (newPhotoFileId) await repository.files.remove([newPhotoFileId]).catch(() => undefined);
      await get().reload();
      throw err;
    }
    for (const id of input.removedDocumentIds) await repository.deleteDocument(id);
    const oldPhoto = base?.photo;
    if (oldPhoto?.kind === 'file' && (photo?.kind !== 'file' || photo.fileId !== oldPhoto.fileId)) {
      await repository.files.remove([oldPhoto.fileId]).catch(() => undefined);
    }
    await get().reload();
    return product;
  },

  async deleteProduct(id) {
    await repository.deleteProduct(id);
    await get().reload();
  },

  async setPassportStatus(id, status) {
    const base = get().products.find((p) => p.id === id);
    if (!base) throw new Error('Изделие не найдено');
    const timestamp = now();
    const product: Product = {
      ...base,
      passport: { status, publishedAt: status === 'published' ? timestamp : base.passport.publishedAt },
      updatedAt: timestamp,
    };
    await repository.saveProduct(product);
    await get().reload();
    return product;
  },

  async addDocument(input) {
    const problem = validateDocumentFile(input.file);
    if (problem) throw new Error(problem);
    if (!get().products.some((p) => p.id === input.productId)) throw new Error('Выберите изделие, к которому относится документ');
    const file = await repository.files.put(input.file, input.file.name);
    try {
      const doc = await repository.saveDocument({
        id: uid(),
        productId: input.productId,
        title: input.title.trim() || input.file.name,
        type: input.type,
        fileId: file.id,
        fileName: input.file.name,
        mime: input.file.type,
        size: file.size,
        uploadedAt: now(),
        isPublic: input.isPublic,
      });
      await get().reload();
      return doc;
    } catch (err) {
      await repository.files.remove([file.id]).catch(() => undefined);
      throw err;
    }
  },

  async updateDocument(id, patch) {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) throw new Error('Документ не найден');
    await repository.saveDocument({ ...doc, ...patch });
    await get().reload();
  },

  async deleteDocument(id) {
    await repository.deleteDocument(id);
    await get().reload();
  },

  async saveCompany(company, logo = { action: 'keep' }) {
    let logoFileId = company.logoFileId;
    if (logo.action === 'replace') {
      const problem = validateImageFile(logo.file);
      if (problem) throw new Error(problem);
      const blob = await downscaleImage(logo.file, { maxSide: 512, type: 'image/png' });
      logoFileId = (await repository.files.put(blob, logo.file.name)).id;
    } else if (logo.action === 'remove') {
      logoFileId = null;
    }
    await repository.saveCompany({ ...company, logoFileId });
    await get().reload();
  },

  async restoreDemo() {
    await repository.replaceWorkspace(createDemoWorkspace());
    await get().reload();
  },

  async removeDemoData() {
    const s = get();
    const products = s.products.filter((p) => !p.demo);
    const ids = new Set(products.map((p) => p.id));
    const next: Workspace = {
      version: 1,
      mode: 'own',
      company: s.mode === 'demo' ? { ...EMPTY_COMPANY, publicDisplay: { ...EMPTY_COMPANY.publicDisplay } } : s.company,
      products,
      documents: s.documents.filter((d) => !d.demo && ids.has(d.productId)),
    };
    await repository.replaceWorkspace(next);
    await get().reload();
  },

  async prepareDemoFiles() {
    const pending = get().documents.filter((d) => d.demo && d.size === 0);
    if (pending.length === 0) return;
    for (const doc of pending) {
      try {
        await repository.getDocumentFile(doc);
      } catch {
        // Отрисуется при открытии документа
      }
    }
    await get().reload();
  },
}));

export const selectProduct = (id: string | undefined) => (s: WorkspaceState) => s.products.find((p) => p.id === id);
