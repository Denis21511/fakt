import type { CompanySettings } from '../../domain/types';

/** Вымышленный производитель для демонстрации. Контакты заведомо нерабочие. */
export const DEMO_COMPANY: CompanySettings = {
  name: 'ФОРМАТ МЕТАЛЛ',
  legalName: 'ООО «Формат Металл»',
  logoFileId: null,
  phone: '+7 (343) 000-48-20',
  email: 'service@format-metall.example',
  website: 'format-metall.example',
  address: 'Екатеринбург, Промышленный проезд, 14, цех 3',
  brandColor: '#C8F169',
  publicDisplay: {
    phone: true,
    email: true,
    website: true,
    address: true,
    sku: true,
    warrantyTerms: true,
    documents: true,
  },
};

export const EMPTY_COMPANY: CompanySettings = {
  name: '',
  legalName: '',
  logoFileId: null,
  phone: '',
  email: '',
  website: '',
  address: '',
  brandColor: '#C8F169',
  publicDisplay: { ...DEMO_COMPANY.publicDisplay },
};
