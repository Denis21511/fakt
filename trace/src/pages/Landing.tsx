import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  DoorClosed,
  Factory,
  FileStack,
  Layers,
  Palette,
  Printer,
  QrCode as QrIcon,
  ScanLine,
  ShieldCheck,
  Sofa,
  ToggleRight,
  Wrench,
} from 'lucide-react';
import { CornerMarks, Logo, LogoMark } from '../components/brand/Logo';
import { Label, LABEL_FORMATS } from '../components/labels/Label';
import { PassportView } from '../components/passport/PassportView';
import { PhoneFrame } from '../components/passport/PhoneFrame';
import { ProductDrawing } from '../components/product/ProductDrawing';
import { QrCode } from '../components/product/QrCode';
import { createDemoWorkspace } from '../data/demo';
import { toPublicPassport } from '../domain/passport';
import { warrantyEnd } from '../domain/warranty';
import { useDocumentTitle } from '../hooks/misc';
import { cx } from '../lib/cx';
import { formatDate } from '../lib/dates';
import { groupToken } from '../lib/id';
import { passportPath, passportUrl } from '../lib/qr';
import '../styles/passport.css';
import '../styles/landing.css';

/** Фото: Bernd Dittrich, Unsplash (лицензия Unsplash). При недоступности — техническая иллюстрация. */
const HERO_PHOTO = 'https://images.unsplash.com/photo-1659385399205-3568e65a246e?auto=format&fit=crop&w=1100&q=80';

const SHOWCASE_IDS = ['demo-p01', 'demo-p04', 'demo-p06'];

export default function Landing() {
  useDocumentTitle('');
  const demo = useMemo(() => createDemoWorkspace(), []);
  const hero = demo.products[0];
  const heroEnd = warrantyEnd(hero.warranty);
  const showcase = SHOWCASE_IDS.map((id) => demo.products.find((p) => p.id === id)!);
  const [current, setCurrent] = useState(showcase[0].id);
  const shown = showcase.find((p) => p.id === current)!;
  const passport = toPublicPassport(shown, demo.documents, demo.company);
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <header className="l-top">
        <div className="l-wrap l-top__inner">
          <Link to="/" className="l-top__logo" aria-label="TRACE — на главную">
            <Logo size={30} />
          </Link>
          <nav className="l-nav" aria-label="Разделы">
            <a href="#features">Возможности</a>
            <a href="#how">Как работает</a>
            <a href="#makers">Для производителей</a>
          </nav>
          <Link to="/app" className="btn btn--primary">
            Попробовать демо
          </Link>
        </div>
      </header>

      <main id="main">
        {/* ───────── Первый экран ───────── */}
        <section className="l-hero">
          <div className="l-wrap l-hero__grid">
            <div className="l-hero__copy">
              <p className="l-tagline">
                <LogoMark size={18} />
                Каждое изделие. Вся история. Один код.
              </p>
              <h1 className="l-hero__title">У каждого изделия должна быть своя история</h1>
              <p className="l-hero__lead">
                TRACE выдаёт каждой двери, воротам или конструкции цифровой паспорт: характеристики, гарантия и инструкции открываются по QR-коду с
                наклейки. Покупателю не нужно приложение, вам — звонки с вопросом «а где инструкция?».
              </p>
              <div className="l-hero__cta">
                <Link to="/app" className="btn btn--dark btn--lg">
                  Открыть демо
                  <ArrowRight aria-hidden />
                </Link>
                <a href="#how" className="btn btn--secondary btn--lg">
                  Как это работает
                </a>
              </div>
              <dl className="l-hero__spec">
                <div>
                  <dt>Изделие</dt>
                  <dd>{hero.name}</dd>
                </div>
                <div>
                  <dt>Серийный номер</dt>
                  <dd className="mono">{hero.serial}</dd>
                </div>
                <div>
                  <dt>Гарантия до</dt>
                  <dd className="mono">{formatDate(heroEnd)}</dd>
                </div>
              </dl>
            </div>

            <figure className="l-hero__visual">
              <div className="l-photo">
                {photoFailed ? (
                  <div className="l-photo__fallback">
                    <ProductDrawing variant="technical" dims={hero.dimensions} />
                  </div>
                ) : (
                  <img src={HERO_PHOTO} alt="Металлическая дверь в кирпичной стене" className="l-photo__img" onError={() => setPhotoFailed(true)} />
                )}
                <CornerMarks inset={14} size={22} color="#C8F169" />
                <div className="l-sticker">
                  <Label format="compact" product={hero} company={demo.company} displayWidth={250} className="l-sticker__svg" />
                </div>
                <ul className="l-callouts" aria-hidden>
                  <li style={{ top: '13%' }}>
                    <span className="l-callouts__k">Паспорт</span>
                    <span className="mono">{groupToken(hero.token)}</span>
                  </li>
                  <li style={{ top: '25%' }}>
                    <span className="l-callouts__k">Изготовлено</span>
                    <span className="mono">{formatDate(hero.manufacturedAt)}</span>
                  </li>
                  <li style={{ top: '37%' }}>
                    <span className="l-callouts__k">Статус</span>
                    <span>Опубликован</span>
                  </li>
                </ul>
              </div>
              <figcaption className="l-photo__caption">
                Наклейка 50 × 25 мм на коробке двери. Код ведёт на постоянный адрес паспорта — данные можно обновлять после монтажа.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ───────── Как работает ───────── */}
        <section className="l-section" id="how" aria-labelledby="how-title">
          <div className="l-wrap">
            <header className="l-head">
              <h2 className="l-h2" id="how-title">
                Три шага от цеха до покупателя
              </h2>
              <p className="l-lead">
                Паспорт создаётся один раз при выпуске изделия и живёт вместе с ним: с монтажа до последнего гарантийного обращения.
              </p>
            </header>
            <ol className="l-steps">
              <li className="l-step">
                <span className="l-step__n mono">01</span>
                <h3 className="l-step__title">Внесите изделие</h3>
                <p className="l-step__text">
                  Серийный номер, характеристики, гарантия и инструкция — пять коротких шагов в кабинете. Обязательных полей семь.
                </p>
                <div className="l-step__ui" aria-hidden>
                  <div className="mini-field">
                    <span>Серийный номер</span>
                    <strong className="mono">{hero.serial}</strong>
                  </div>
                  <div className="mini-field">
                    <span>Гарантия</span>
                    <strong>5 лет · до {formatDate(heroEnd)}</strong>
                  </div>
                </div>
              </li>
              <li className="l-step">
                <span className="l-step__n mono">02</span>
                <h3 className="l-step__title">Наклейте QR-код</h3>
                <p className="l-step__text">Этикетка печатается на термопринтере или листе A4. Три макета — от технической наклейки до шильда.</p>
                <div className="l-step__ui l-step__ui--label" aria-hidden>
                  <Label format="compact" product={hero} company={demo.company} displayWidth={210} />
                </div>
              </li>
              <li className="l-step">
                <span className="l-step__n mono">03</span>
                <h3 className="l-step__title">Покупатель открывает паспорт</h3>
                <p className="l-step__text">
                  Камера телефона — и на экране паспорт: гарантия, документы, контакты сервиса. Без приложений и регистрации.
                </p>
                <div className="l-step__ui" aria-hidden>
                  <div className="mini-pass">
                    <span className="mini-pass__tag">Цифровой паспорт изделия</span>
                    <strong>{hero.name}</strong>
                    <span className="mini-pass__ok">Гарантия действует</span>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ───────── Интерактивный паспорт ───────── */}
        <section className="l-section l-section--dark" aria-labelledby="demo-title">
          <div className="l-wrap l-demo">
            <div className="l-demo__copy">
              <h2 className="l-h2" id="demo-title">
                Так выглядит паспорт на телефоне покупателя
              </h2>
              <p className="l-lead">Это не макет: справа — живая страница паспорта из демо-данных. Выберите изделие и пролистайте паспорт.</p>
              <div className="l-demo__tabs" role="tablist" aria-label="Изделие для примера">
                {showcase.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={p.id === current}
                    className={cx('l-demo__tab', p.id === current && 'is-active')}
                    onClick={() => setCurrent(p.id)}
                  >
                    <span className="l-demo__tab-name">{p.name}</span>
                    <span className="l-demo__tab-serial mono">{p.serial}</span>
                  </button>
                ))}
              </div>
              <div className="l-demo__scan">
                <div className="l-demo__qr">
                  <QrCode value={passportUrl(shown.token)} margin={1} title={`QR-код паспорта ${shown.serial}`} />
                </div>
                <p>
                  Наведите камеру телефона на код, чтобы открыть этот паспорт, или{' '}
                  <a href={passportPath(shown.token)} target="_blank" rel="noopener">
                    откройте его в браузере
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="l-demo__phone" role="tabpanel" aria-label={`Паспорт: ${shown.name}`}>
              <PhoneFrame>
                <PassportView passport={passport} compact />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* ───────── Возможности ───────── */}
        <section className="l-section" id="features" aria-labelledby="features-title">
          <div className="l-wrap">
            <header className="l-head">
              <h2 className="l-h2" id="features-title">
                Что получает производитель
              </h2>
              <p className="l-lead">Рабочий кабинет на каждый день, а не ещё одна таблица. Всё, что нужно, чтобы паспорт был у каждого изделия.</p>
            </header>
            <ul className="l-features">
              {[
                {
                  icon: Layers,
                  title: 'Каталог с серийными номерами',
                  text: 'Поиск по названию, артикулу и номеру. Фильтры по категории и статусу паспорта.',
                },
                {
                  icon: QrIcon,
                  title: 'QR-коды и этикетки',
                  text: 'Три макета наклеек, скачивание в PNG и SVG, пакетная печать на термопринтере и A4.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Гарантийный учёт',
                  text: 'Сроки считаются автоматически. Видно, какие гарантии истекают в ближайшие 60 дней.',
                },
                {
                  icon: FileStack,
                  title: 'Документы',
                  text: 'Инструкции, сертификаты, паспорта качества. Публичные — в паспорте, внутренние — только в кабинете.',
                },
                { icon: Palette, title: 'Ваш фирменный стиль', text: 'Логотип, цвет и контакты компании на каждой странице паспорта.' },
                {
                  icon: ToggleRight,
                  title: 'Публикация под контролем',
                  text: 'Черновик, публикация, снятие с публикации. Код на наклейке при этом не меняется.',
                },
              ].map((f) => (
                <li key={f.title} className="l-feature">
                  <f.icon aria-hidden className="l-feature__icon" />
                  <h3 className="l-feature__title">{f.title}</h3>
                  <p className="l-feature__text">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── Наклейка ───────── */}
        <section className="l-section l-section--rule" aria-labelledby="label-title">
          <div className="l-wrap l-labels">
            <header className="l-head l-head--side">
              <h2 className="l-h2" id="label-title">
                Наклейка, которая переживёт монтаж
              </h2>
              <p className="l-lead">
                Код печатается с коррекцией ошибок уровня M: читается, даже если часть наклейки поцарапана. Размеры — под типичные места: торец
                полотна, коробка, рама ворот, паспорт в коробке.
              </p>
              <ul className="l-checks">
                <li>
                  <Printer aria-hidden />
                  Термопринтер или обычный лист A4
                </li>
                <li>
                  <ScanLine aria-hidden />
                  Ведёт на постоянный адрес паспорта
                </li>
              </ul>
            </header>
            <div className="l-labels__board">
              {LABEL_FORMATS.map((f) => (
                <figure key={f.id} className={cx('l-label', `l-label--${f.id}`)}>
                  <div className="l-label__dim l-label__dim--w mono" aria-hidden>
                    {f.w} мм
                  </div>
                  <div className="l-label__row">
                    <div className="l-label__dim l-label__dim--h mono" aria-hidden>
                      {f.h} мм
                    </div>
                    <Label format={f.id} product={hero} company={demo.company} displayWidth={f.w * 5} className="l-label__svg" />
                  </div>
                  <figcaption>
                    <strong>{f.title}</strong>
                    <span>{f.text}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Для производителей ───────── */}
        <section className="l-section" id="makers" aria-labelledby="makers-title">
          <div className="l-wrap">
            <header className="l-head">
              <h2 className="l-h2" id="makers-title">
                Для производителей
              </h2>
              <p className="l-lead">TRACE рассчитан на небольшие и средние производства, где каждое изделие уходит к конкретному покупателю.</p>
            </header>
            <ul className="l-makers">
              {[
                {
                  icon: DoorClosed,
                  title: 'Металлические двери',
                  text: 'Паспорт с классом взломостойкости, комплектом ключей и инструкцией по регулировке петель.',
                },
                { icon: Sofa, title: 'Мебель', text: 'Схема сборки, уход за материалами и гарантия на фурнитуру — по коду на обратной стороне.' },
                {
                  icon: Building2,
                  title: 'Окна и конструкции',
                  text: 'Профиль, стеклопакет, сервисное обслуживание. Монтажник оставляет заказчику документ, а не бумажку.',
                },
                {
                  icon: Wrench,
                  title: 'Мастерские',
                  text: 'Изделия на заказ получают такой же паспорт, как у большого завода — без отдельного сайта.',
                },
                {
                  icon: Factory,
                  title: 'Оборудование на заказ',
                  text: 'Технические данные, регламент ТО и контакты сервиса привязаны к серийному номеру.',
                },
              ].map((m) => (
                <li key={m.title} className="l-maker">
                  <m.icon aria-hidden />
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── Призыв ───────── */}
        <section className="l-cta" aria-labelledby="cta-title">
          <div className="l-wrap l-cta__inner">
            <div>
              <h2 className="l-cta__title" id="cta-title">
                Выпустите первый паспорт за пять минут
              </h2>
              <p className="l-cta__text">
                В демо уже есть 12 изделий вымышленного производителя «ФОРМАТ МЕТАЛЛ» — двери, ворота, конструкции. Создайте своё, напечатайте
                этикетку и откройте паспорт.
              </p>
            </div>
            <div className="l-cta__actions">
              <Link to="/app" className="btn btn--primary btn--lg">
                Открыть демо
                <ArrowRight aria-hidden />
              </Link>
              <Link to="/app/products/new" className="btn btn--lg l-cta__ghost">
                Создать изделие
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="l-foot">
        <div className="l-wrap l-foot__inner">
          <Logo size={24} />
          <p>Каждое изделие. Вся история. Один код.</p>
          <p className="l-foot__note">Демо-версия: данные хранятся в браузере. Фото на первом экране — Bernd Dittrich, Unsplash. © 2026 TRACE</p>
        </div>
      </footer>
    </div>
  );
}
