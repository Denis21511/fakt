/** Дата без времени: 'YYYY-MM-DD' */
export type ISODate = string;
/** Момент времени в ISO 8601 */
export type ISODateTime = string;

export type ProductCategory = 'entrance' | 'technical' | 'fire' | 'gate' | 'block' | 'structure' | 'hardware';

export type PassportStatus = 'draft' | 'published' | 'withdrawn';

/** Вид технической иллюстрации, которой демо-изделие представлено вместо фотографии */
export type DrawingVariant =
  'entrance' | 'technical' | 'fire' | 'fire-double' | 'double' | 'gate' | 'gate-sectional' | 'block' | 'structure' | 'hatch' | 'hardware';

export type ProductPhoto = { kind: 'drawing'; variant: DrawingVariant } | { kind: 'file'; fileId: string };

/** Габариты в миллиметрах: ширина × высота × глубина */
export interface Dimensions {
  width: number | null;
  height: number | null;
  depth: number | null;
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface Warranty {
  /** Срок в месяцах; null — гарантия не оформлена */
  months: number | null;
  startDate: ISODate | null;
  terms: string;
}

export interface PassportState {
  status: PassportStatus;
  publishedAt: ISODateTime | null;
}

export interface Product {
  id: string;
  /** Публичный идентификатор паспорта, зашит в QR-код: /p/<token> */
  token: string;
  name: string;
  category: ProductCategory;
  sku: string;
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
  /** Дополнительные характеристики: класс взломостойкости, масса, предел огнестойкости… */
  specs: SpecRow[];

  warranty: Warranty;
  passport: PassportState;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Запись из демонстрационного набора — удаляется вместе с демо-данными */
  demo?: boolean;
}

export type DocumentType = 'instruction' | 'quality' | 'certificate' | 'warranty' | 'drawing' | 'other';

export interface ProductDocument {
  id: string;
  productId: string;
  title: string;
  type: DocumentType;
  /** Ключ файла в файловом хранилище */
  fileId: string;
  fileName: string;
  mime: string;
  size: number;
  uploadedAt: ISODateTime;
  /** Показывать покупателю на публичном паспорте */
  isPublic: boolean;
  demo?: boolean;
}

export interface PublicDisplay {
  phone: boolean;
  email: boolean;
  website: boolean;
  address: boolean;
  sku: boolean;
  warrantyTerms: boolean;
  documents: boolean;
}

export interface CompanySettings {
  name: string;
  legalName: string;
  logoFileId: string | null;
  phone: string;
  email: string;
  website: string;
  address: string;
  brandColor: string;
  publicDisplay: PublicDisplay;
}

export type WorkspaceMode = 'demo' | 'own';

export interface Workspace {
  version: 1;
  /** demo — открыт демонстрационный набор «ФОРМАТ МЕТАЛЛ»; own — данные компании пользователя */
  mode: WorkspaceMode;
  company: CompanySettings;
  products: Product[];
  documents: ProductDocument[];
}
