/**
 * Минимальный PDF из растровых страниц: каждая страница — JPEG (DCTDecode) на весь лист A4.
 * Используется для демо-документов, которые рисуются в canvas.
 */
const A4 = { w: 595.28, h: 841.89 };

export async function canvasesToPdf(pages: HTMLCanvasElement[], title: string): Promise<Blob> {
  const jpegs = await Promise.all(pages.map((c) => canvasJpeg(c)));
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  // 1 — каталог, 2 — дерево страниц, 3 — сведения; далее по три объекта на страницу
  const pageObj = (i: number) => 4 + i * 3;
  const total = 3 + pages.length * 3;

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  object(3, () => push(`<< /Title ${pdfUtf16(title)} /Producer (TRACE) >>`));

  jpegs.forEach((jpeg, i) => {
    const p = pageObj(i);
    const content = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im0 Do Q`;
    object(p, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`,
      ),
    );
    object(p + 1, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${pages[i].width} /Height ${pages[i].height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      );
      push(jpeg);
      push('\nendstream');
    });
    object(p + 2, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  });

  const xref = length;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= total; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

async function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Страница не отрисована'))), 'image/jpeg', 0.9),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** Строка метаданных PDF в UTF-16BE — иначе кириллица в заголовке превращается в мусор */
function pdfUtf16(text: string): string {
  let hex = 'FEFF';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) continue;
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}
