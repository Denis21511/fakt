// Снимает скриншоты приложения FAKT для ролика.
// Требует запущенный dev-сервер приложения: http://localhost:5180
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.FAKT_URL ?? 'http://localhost:5180';
const OUT = path.resolve('public/shots');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fakt-shots-'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: profile,
  args: ['--hide-scrollbars', '--lang=ru-RU', '--font-render-hinting=none'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

async function open(url, wait = 1600) {
  await page.goto(BASE + url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(wait); // анимации графиков и появление страницы
}

async function shot(name, opts = {}) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
  console.log('✓', name);
}

// Длинная страница целиком: растягиваем окно на всю высоту (а не fullPage),
// чтобы боковая панель шла до низа, а графики успели доиграть анимацию.
async function fullShot(name) {
  await page.addStyleTag({ content: '.sidebar{position:static!important;height:auto!important}' });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 2 });
  await sleep(1800);
  await shot(name);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
}

// Чистые демо-данные
await open('/');
await page.evaluate(() => localStorage.clear());
await open('/');
const ids = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('fakt:data:v1')).state;
  return Object.fromEntries(s.orders.map((o) => [o.number, o.id]));
});

await shot('overview');
await fullShot('overview-full');
await open('/');

// Подсказка графика: наводим курсор на середину области графика
const chart = await page.$('.chart .recharts-wrapper');
const cbox = chart && (await chart.boundingBox());
if (cbox) {
  await page.mouse.move(cbox.x + cbox.width * 0.5, cbox.y + cbox.height * 0.55);
  await sleep(500);
  await shot('overview-tooltip');
  await page.mouse.move(5, 5);
}

await open('/orders');
await shot('orders');

await open(`/orders/${ids[1041]}`);
await shot('order-1041');
await fullShot('order-1041-full');
await open(`/orders/${ids[1041]}`);

// Диалог завершения: сначала вносим оставшиеся расходы, как перед сдачей заказа
await page.evaluate((id) => {
  const raw = JSON.parse(localStorage.getItem('fakt:data:v1'));
  const order = raw.state.orders.find((o) => o.id === id);
  const today = new Date().toISOString().slice(0, 10);
  const add = (categoryId, name, rub) =>
    order.expenses.push({ id: crypto.randomUUID(), categoryId, name, amount: rub * 100, date: today, comment: '' });
  add('labor', 'Расчёт со сварщиками', 26000);
  add('paint', 'Порошковая покраска каркаса', 14300);
  add('contractors', 'Ступени из дуба, монтаж', 34000);
  add('delivery', 'Доставка и подъём', 4000);
  localStorage.setItem('fakt:data:v1', JSON.stringify(raw));
}, ids[1041]);
await open(`/orders/${ids[1041]}`);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Завершить заказ'))?.click());
await sleep(600);
await page.evaluate(() => document.querySelector('.modal .checkbox')?.click());
await sleep(300);
await shot('complete-dialog');

// Форма нового заказа
await open('/');
await page.evaluate(() => [...document.querySelectorAll('.page-head button')].find((b) => b.innerText.includes('Новый заказ'))?.click());
await sleep(500);
await page.type('#f-title', 'Ворота распашные с калиткой', { delay: 0 });
await page.type('#f-client', 'Алексей Смирнов', { delay: 0 });
await page.type('#f-price', '168000', { delay: 0 });
const amounts = await page.$$('.plan-row .input-money input');
const values = ['52000', '38000', '12500'];
for (let i = 0; i < Math.min(amounts.length, values.length); i++) await amounts[i].type(values[i]);
await page.type('#f-desc', 'Каркас из профтрубы 60×40, заполнение профлистом, порошковая покраска', { delay: 0 });
await page.click('.form-section__title');
await sleep(800);
await shot('new-order');

await open('/analytics');
await shot('analytics');
await fullShot('analytics-full');

// Мобильная версия
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await open('/');
await shot('mobile-overview');
await open(`/orders/${ids[1040]}`);
await shot('mobile-order');

await browser.close();
fs.rmSync(profile, { recursive: true, force: true });
