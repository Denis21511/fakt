import { CATEGORY_SHORT, DOCUMENT_TYPE_LABEL } from '../../domain/catalog';
import type { CompanySettings, Product, ProductCategory, ProductDocument } from '../../domain/types';
import { warrantyEnd } from '../../domain/warranty';
import { formatDate, monthsLabel } from '../../lib/dates';
import { formatDimensions } from '../../lib/format';
import { canvasesToPdf } from '../../lib/pdf';

/** A4 при 150 dpi */
const W = 1240;
const H = 1754;
const M = 110;
const BOTTOM = H - 150;

const INK = '#20221F';
const MUTED = '#777B72';
const RULE = '#D9DBD1';

const SANS = '"Inter Variable", "Segoe UI", Arial, sans-serif';
const DISPLAY = '"Manrope Variable", "Segoe UI", Arial, sans-serif';
const MONO = '"JetBrains Mono Variable", Consolas, monospace';

class PageWriter {
  pages: HTMLCanvasElement[] = [];
  ctx!: CanvasRenderingContext2D;
  y = 0;

  constructor(
    private header: (ctx: CanvasRenderingContext2D) => number,
    private footer: (ctx: CanvasRenderingContext2D, page: number) => void,
  ) {
    this.newPage();
  }

  newPage() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, W, H);
    this.pages.push(canvas);
    this.y = this.header(this.ctx);
  }

  ensure(space: number) {
    if (this.y + space > BOTTOM) this.newPage();
  }

  finish() {
    this.pages.forEach((p, i) => this.footer(p.getContext('2d')!, i + 1));
    return this.pages;
  }

  text(str: string, { font = `400 26px ${SANS}`, color = INK, lineHeight = 38, maxWidth = W - M * 2, x = M, gapAfter = 0 } = {}) {
    const ctx = this.ctx;
    ctx.font = font;
    const lines = wrap(ctx, str, maxWidth);
    for (const line of lines) {
      this.ensure(lineHeight);
      this.ctx.font = font;
      this.ctx.fillStyle = color;
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText(line, x, this.y + lineHeight * 0.75);
      this.y += lineHeight;
    }
    this.y += gapAfter;
  }

  section(num: string, title: string) {
    this.ensure(120);
    this.y += 24;
    const ctx = this.ctx;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M, this.y);
    ctx.lineTo(W - M, this.y);
    ctx.stroke();
    this.y += 20;
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(num, M, this.y + 26);
    ctx.font = `700 32px ${DISPLAY}`;
    ctx.fillStyle = INK;
    ctx.fillText(title, M + 70, this.y + 28);
    this.y += 64;
  }

  list(items: string[], { numbered = false } = {}) {
    items.forEach((item, i) => {
      this.ensure(40);
      const ctx = this.ctx;
      ctx.font = `500 24px ${numbered ? MONO : SANS}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(numbered ? String(i + 1).padStart(2, '0') : '—', M + 70, this.y + 28);
      this.text(item, { x: M + 130, maxWidth: W - M * 2 - 130, gapAfter: 8 });
    });
  }

  rows(rows: [string, string][], { valueFont = `500 25px ${SANS}` } = {}) {
    for (const [label, value] of rows) {
      const ctx = this.ctx;
      ctx.font = valueFont;
      const lines = wrap(ctx, value, W - M * 2 - 470);
      const h = Math.max(1, lines.length) * 36 + 22;
      this.ensure(h);
      ctx.font = `400 24px ${SANS}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(label, M + 70, this.y + 34);
      ctx.font = valueFont;
      ctx.fillStyle = INK;
      lines.forEach((line, i) => ctx.fillText(line, M + 470, this.y + 34 + i * 36));
      this.y += h;
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(M + 70, this.y - 4);
      ctx.lineTo(W - M, this.y - 4);
      ctx.stroke();
    }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`700 32px ${DISPLAY}`),
      document.fonts.load(`800 60px ${DISPLAY}`),
      document.fonts.load(`400 26px ${SANS}`),
      document.fonts.load(`600 26px ${SANS}`),
      document.fonts.load(`500 24px ${MONO}`),
    ]);
  } catch {
    // Без веб-шрифтов документ отрисуется системными — это допустимо
  }
}

export async function renderDemoDocument(doc: ProductDocument, product: Product, company: CompanySettings): Promise<Blob> {
  await loadFonts();
  const companyName = company.name || product.manufacturer;

  const header = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = INK;
    ctx.font = `800 30px ${DISPLAY}`;
    ctx.fillText(companyName, M, M + 26);
    ctx.font = `400 22px ${SANS}`;
    ctx.fillStyle = MUTED;
    if (company.legalName) ctx.fillText(company.legalName, M, M + 60);
    ctx.textAlign = 'right';
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText(product.serial, W - M, M + 26);
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(DOCUMENT_TYPE_LABEL[doc.type], W - M, M + 60);
    ctx.textAlign = 'left';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(M, M + 92);
    ctx.lineTo(W - M, M + 92);
    ctx.stroke();
    return M + 140;
  };

  const footer = (ctx: CanvasRenderingContext2D, page: number) => {
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(M, H - 110);
    ctx.lineTo(W - M, H - 110);
    ctx.stroke();
    ctx.font = `400 20px ${SANS}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('Демонстрационный документ TRACE. Сформирован для примера и не является официальным документом.', M, H - 72);
    ctx.textAlign = 'right';
    ctx.font = `500 20px ${MONO}`;
    ctx.fillText(`${page}`, W - M, H - 72);
    ctx.textAlign = 'left';
  };

  const w = new PageWriter(header, footer);

  w.text(doc.title, { font: `800 54px ${DISPLAY}`, lineHeight: 64, gapAfter: 10 });
  w.text(`${CATEGORY_SHORT[product.category]} · ${product.name}`, { font: `500 28px ${SANS}`, color: MUTED, lineHeight: 40, gapAfter: 34 });
  nameplate(w, product);

  switch (doc.type) {
    case 'instruction':
      instruction(w, product);
      break;
    case 'quality':
      quality(w, product);
      break;
    case 'certificate':
      certificate(w, product);
      break;
    case 'drawing':
      schematic(w, product);
      break;
    default:
      protocol(w, product);
  }

  return canvasesToPdf(w.finish(), `${doc.title} — ${product.name}`);
}

function nameplate(w: PageWriter, p: Product) {
  const cells: [string, string][] = [
    ['Модель', p.model || '—'],
    ['Артикул', p.sku],
    ['Серийный номер', p.serial],
    ['Дата изготовления', formatDate(p.manufacturedAt)],
  ];
  const ctx = w.ctx;
  const cellW = (W - M * 2) / cells.length;
  const top = w.y;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(M, top, W - M * 2, 104);
  cells.forEach(([label, value], i) => {
    const x = M + i * cellW;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + 104);
      ctx.stroke();
    }
    ctx.font = `400 20px ${SANS}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(label, x + 22, top + 38);
    ctx.font = `600 25px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(value, x + 22, top + 80, cellW - 40);
  });
  w.y = top + 104 + 30;
}

function mountingSteps(category: ProductCategory, sectional: boolean): string[] {
  switch (category) {
    case 'gate':
      return sectional
        ? [
            'Проверьте проём: перемычка над проёмом — не менее 300 мм, боковые простенки — не менее 100 мм.',
            'Закрепите вертикальные направляющие по уровню, отклонение по диагоналям — не более 3 мм.',
            'Соберите панели снизу вверх, установите роликовые кронштейны и петли.',
            'Смонтируйте торсионный вал и натяните пружины по таблице из приложения.',
            'Проверьте ручной подъём: полотно должно оставаться неподвижным в среднем положении.',
          ]
        : [
            'Подготовьте опорные столбы или закладные в проёме, проверьте вертикаль.',
            'Навесьте створки на усиленные петли, выставьте зазор по низу 40–60 мм.',
            'Отрегулируйте притвор створок: зазор между ними — 8–12 мм по всей высоте.',
            'Установите вертикальные ригели и ответные гнёзда в основании.',
            'Проверьте работу калитки и фиксаторов створок в открытом положении.',
          ];
    case 'structure':
      return [
        'Подготовьте основание: перепад высот под опорами — не более 5 мм.',
        'Установите закладные пластины и соберите секции каркаса по монтажной схеме.',
        'Затяните болты М12 с моментом 80 Н·м, проверьте геометрию по диагоналям.',
        'Восстановите покрытие в местах повреждений грунт-эмалью в течение 7 дней.',
      ];
    case 'hardware':
      return [
        'Приложите монтажный шаблон к полотну и коробке, отметьте отверстия.',
        'Закрепите корпус доводчика на полотне, а башмак рычага — на коробке.',
        'Соедините рычаг под прямым углом к полотну в закрытом положении.',
        'Отрегулируйте скорость закрывания и дотяжку клапанами на торце корпуса.',
      ];
    case 'fire':
      return [
        'Монтаж выполняет организация, имеющая лицензию МЧС на установку противопожарных конструкций.',
        'Проверьте проём: зазор между коробкой и стеной — 15–25 мм с каждой стороны.',
        'Установите коробку по уровню и закрепите анкерами через все монтажные отверстия.',
        'Заполните шов негорючим материалом: минеральной ватой или огнестойкой монтажной пеной.',
        'Отрегулируйте доводчик: полотно должно закрываться до срабатывания замка из любого положения.',
      ];
    default:
      return [
        'Проверьте проём: он должен быть на 20–30 мм шире и выше коробки с каждой стороны.',
        'Установите коробку по уровню, выставьте вертикаль и диагонали — расхождение не более 2 мм.',
        'Закрепите коробку анкерами через монтажные отверстия, не перетягивая крепёж.',
        'До заполнения шва проверьте ход полотна и работу всех замков.',
        'Заполните монтажный шов пеной, после высыхания установите наличники.',
      ];
  }
}

function careRules(category: ProductCategory): string[] {
  switch (category) {
    case 'gate':
      return [
        'Раз в 6 месяцев очищайте и смазывайте петли и ригели.',
        'Зимой очищайте зону открывания створок от снега и льда.',
        'Не оставляйте створки открытыми при порывистом ветре без фиксаторов.',
      ];
    case 'fire':
      return [
        'Не фиксируйте дверь в открытом положении посторонними предметами.',
        'Раз в год проверяйте терморасширяющуюся ленту и работу доводчика.',
        'Не сверлите полотно и не меняйте фурнитуру на несертифицированную.',
      ];
    case 'hardware':
      return [
        'Раз в 6 месяцев проверяйте затяжку крепёжных винтов.',
        'Не открывайте дверь с усилием против хода доводчика.',
        'При подтёках масла прекратите эксплуатацию и обратитесь к производителю.',
      ];
    case 'structure':
      return ['Раз в год осматривайте сварные швы и покрытие.', 'Не нагружайте каркас сверх расчётной нагрузки из монтажной схемы.'];
    default:
      return [
        'Протирайте полотно мягкой влажной тканью без абразивных средств.',
        'Раз в 6 месяцев смазывайте петли и ригели замков силиконовой смазкой.',
        'Не закрывайте дверь, если ригели замка выдвинуты.',
        'Установите ограничитель, чтобы полотно не ударялось о стену.',
      ];
  }
}

function instruction(w: PageWriter, p: Product) {
  w.section('01', 'Назначение');
  w.text(p.description || `${CATEGORY_SHORT[p.category]} ${p.model}.`, { gapAfter: 6 });
  const specs: [string, string][] = [];
  const dims = formatDimensions(p.dimensions);
  if (dims) specs.push(['Габариты', dims]);
  if (p.material) specs.push(['Материал', p.material]);
  if (p.color) specs.push(['Цвет и отделка', p.color]);
  for (const s of p.specs) specs.push([s.label, s.value]);
  w.rows(specs);

  if (p.equipment.length) {
    w.section('02', 'Комплект поставки');
    w.list(p.equipment);
  }
  w.section('03', 'Монтаж');
  w.list(mountingSteps(p.category, p.photo?.kind === 'drawing' && p.photo.variant === 'gate-sectional'), { numbered: true });
  w.section('04', 'Эксплуатация и уход');
  w.list(careRules(p.category));
  w.section('05', 'Гарантия');
  const end = warrantyEnd(p.warranty);
  if (p.warranty.months && end) {
    w.rows([
      ['Срок', monthsLabel(p.warranty.months)],
      ['Действует', `с ${formatDate(p.warranty.startDate)} по ${formatDate(end)}`],
    ]);
    if (p.warranty.terms) w.text(p.warranty.terms, { font: `400 24px ${SANS}`, color: MUTED, lineHeight: 36 });
  } else {
    w.text('Условия гарантии указываются в договоре поставки.', { color: MUTED });
  }
}

function quality(w: PageWriter, p: Product) {
  w.section('01', 'Результаты выходного контроля');
  w.rows(
    [
      ['Геометрия и диагонали', 'Соответствует, отклонение ≤ 2 мм'],
      ['Зазоры в притворе', 'Соответствует, 3–4 мм'],
      ['Сварные швы', 'Без дефектов, визуальный контроль 100 %'],
      ['Лакокрасочное покрытие', 'Толщина 70–90 мкм, адгезия 1 балл'],
      ['Запирающие устройства', 'Работают без заеданий'],
      ['Комплектность', 'Соответствует спецификации'],
    ],
    { valueFont: `500 25px ${SANS}` },
  );
  w.section('02', 'Заключение');
  w.text(`Изделие ${p.name}, серийный номер ${p.serial}, изготовлено ${formatDate(p.manufacturedAt)} и признано годным к эксплуатации.`, {
    gapAfter: 40,
  });
  w.ensure(120);
  w.rows([
    ['Контролёр ОТК', 'подпись и печать в оригинале'],
    ['Дата контроля', formatDate(p.manufacturedAt)],
  ]);
}

function certificate(w: PageWriter, p: Product) {
  w.section('01', 'Сведения о сертификации');
  w.text(
    'В рабочем паспорте здесь размещается скан действующего сертификата соответствия. Этот файл — образец, показывающий, как документ выглядит для покупателя.',
    { color: MUTED, gapAfter: 10 },
  );
  w.rows([
    ['Объект', `${CATEGORY_SHORT[p.category]} ${p.model}`],
    ['Показатель', p.specs.find((s) => /огнестойк/i.test(s.label))?.value ?? '—'],
    ['Нормативный документ', 'ГОСТ Р 53307-2009'],
    ['Номер сертификата', 'указывается в оригинале'],
  ]);
}

function protocol(w: PageWriter, p: Product) {
  w.section('01', 'Испытания');
  w.rows([
    ['Циклы открывания', '500 000 — без отказов'],
    ['Усилие открывания', '≤ 70 Н'],
    ['Время закрывания доводчиком', '4–6 с'],
    ['Герметичность притвора', 'Без просветов'],
  ]);
  w.section('02', 'Результат');
  w.text(`Изделие ${p.serial} прошло заводские испытания. Документ внутренний и не показывается покупателю.`);
}

function schematic(w: PageWriter, p: Product) {
  w.section('01', 'Схема каркаса');
  w.ensure(700);
  const ctx = w.ctx;
  const x0 = M + 120;
  const y0 = w.y + 40;
  const bw = 760;
  const bh = 560;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(x0, y0, bw, bh);
  ctx.lineWidth = 4;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + (bw / 4) * i, y0);
    ctx.lineTo(x0 + (bw / 4) * i, y0 + bh);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + (bw / 4) * i, y0 + bh);
    ctx.lineTo(x0 + (bw / 4) * (i + 1), y0);
    ctx.stroke();
  }
  ctx.strokeStyle = MUTED;
  ctx.fillStyle = MUTED;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + bh + 50);
  ctx.lineTo(x0 + bw, y0 + bh + 50);
  ctx.stroke();
  ctx.font = `500 24px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${p.dimensions.width ?? '—'} мм`, x0 + bw / 2, y0 + bh + 90);
  ctx.textAlign = 'left';
  w.y = y0 + bh + 130;
  w.rows([
    ['Секции', '4 шт., соединение на болтах М12'],
    ['Момент затяжки', '80 Н·м'],
  ]);
}
