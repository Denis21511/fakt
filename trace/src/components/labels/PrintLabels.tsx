import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CompanySettings, Product } from '../../domain/types';
import { Label, LABEL_FORMATS, type LabelFormat } from './Label';
import '../../styles/print.css';

export type PrintMode = 'roll' | 'a4';

export interface PrintJob {
  products: Product[];
  format: LabelFormat;
  mode: PrintMode;
  copies: number;
  company: Pick<CompanySettings, 'name'>;
  logoHref: string | null;
}

/**
 * Печать через системный диалог браузера. Термопринтер — по одной этикетке
 * на страницу точного размера; A4 — сетка этикеток с линиями реза.
 */
export function usePrintLabels() {
  const [job, setJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    if (!job) return;
    const f = LABEL_FORMATS.find((x) => x.id === job.format)!;
    const style = document.createElement('style');
    style.textContent = job.mode === 'roll' ? `@page { size: ${f.w}mm ${f.h}mm; margin: 0; }` : '@page { size: A4; margin: 10mm; }';
    document.head.appendChild(style);
    const done = () => setJob(null);
    window.addEventListener('afterprint', done);
    // Даём браузеру отрисовать этикетки и шрифты до открытия диалога
    const timer = window.setTimeout(() => {
      void document.fonts.ready.then(() => window.print());
    }, 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', done);
      style.remove();
    };
  }, [job]);

  const node = job
    ? createPortal(
        <div className={`print-root print-root--${job.mode}`} aria-hidden>
          {job.products.flatMap((p) =>
            Array.from({ length: job.copies }, (_, i) => (
              <div key={`${p.id}-${i}`} className="print-label">
                <Label format={job.format} product={p} company={job.company} logoHref={job.logoHref} />
              </div>
            )),
          )}
        </div>,
        document.body,
      )
    : null;

  return { print: setJob, printing: Boolean(job), node };
}
