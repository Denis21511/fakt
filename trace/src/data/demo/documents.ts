import type { DocumentType, ProductDocument } from '../../domain/types';
import { demoProductId } from './products';

const at = (date: string, time = '10:00') => new Date(`${date}T${time}:00+05:00`).toISOString();

interface DemoDocInput {
  product: number;
  type: DocumentType;
  title: string;
  fileName: string;
  date: string;
  isPublic?: boolean;
}

const INPUTS: DemoDocInput[] = [
  { product: 1, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Kontur-01.pdf', date: '2026-03-15' },
  { product: 1, type: 'quality', title: 'Паспорт качества FM-2603-0147', fileName: 'Pasport_kachestva_FM-2603-0147.pdf', date: '2026-03-20' },
  { product: 2, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Kontur-02-Termo.pdf', date: '2026-04-09' },
  { product: 4, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Sektor-EI60.pdf', date: '2026-06-18' },
  { product: 4, type: 'certificate', title: 'Сертификат соответствия EI 60', fileName: 'Sertifikat_Sektor-EI60.pdf', date: '2026-06-18' },
  { product: 4, type: 'quality', title: 'Паспорт качества FM-2606-0388', fileName: 'Pasport_kachestva_FM-2606-0388.pdf', date: '2026-06-24' },
  {
    product: 4,
    type: 'other',
    title: 'Протокол заводских испытаний',
    fileName: 'Protokol_ispytaniy_FM-2606-0388.pdf',
    date: '2026-07-02',
    isPublic: false,
  },
  { product: 5, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Sektor-EI60-2.pdf', date: '2026-09-03' },
  { product: 6, type: 'instruction', title: 'Инструкция по монтажу и обслуживанию ворот', fileName: 'Instrukciya_Titan-RV.pdf', date: '2025-10-07' },
  { product: 8, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Liniya.pdf', date: '2026-02-12' },
  { product: 9, type: 'instruction', title: 'Инструкция по монтажу и эксплуатации', fileName: 'Instrukciya_Liniya-1.5.pdf', date: '2026-08-20' },
  { product: 9, type: 'quality', title: 'Паспорт качества FM-2608-0466', fileName: 'Pasport_kachestva_FM-2608-0466.pdf', date: '2026-08-26' },
  { product: 10, type: 'drawing', title: 'Монтажная схема каркаса', fileName: 'Shema_montazha_Modul-TM.pdf', date: '2026-05-13', isPublic: false },
  { product: 12, type: 'instruction', title: 'Инструкция по установке и регулировке', fileName: 'Instrukciya_DN-3.pdf', date: '2025-11-15' },
];

/**
 * Файлы демо-документов не хранятся в репозитории: PDF рисуется в браузере
 * при первом обращении (см. renderDocument.ts), размер записывается после генерации.
 */
export function buildDemoDocuments(): ProductDocument[] {
  return INPUTS.map((d, i) => {
    const id = `demo-d${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      productId: demoProductId(d.product),
      title: d.title,
      type: d.type,
      fileId: `demo-file-${id}`,
      fileName: d.fileName,
      mime: 'application/pdf',
      size: 0,
      uploadedAt: at(d.date, '11:00'),
      isPublic: d.isPublic ?? true,
      demo: true,
    };
  });
}
