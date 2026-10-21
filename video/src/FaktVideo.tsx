import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { NARRATION, type NarrationId } from './narration';
import { Intro } from './scenes/Intro';
import { Mobile } from './scenes/Mobile';
import { Outro } from './scenes/Outro';
import { Problem } from './scenes/Problem';
import { ScreenScene, type ScreenSceneProps } from './scenes/ScreenScene';
import { FPS, LEAD, TAIL, TRANSITION } from './theme';

/** Длина сцены = пауза + озвучка + хвост. */
export const sceneFrames = (id: NarrationId) => Math.ceil((LEAD + NARRATION[id].seconds + TAIL) * FPS);

/** Сцены с экранами приложения: что показываем и куда «наезжает камера» (координаты 0..1 снимка). */
export const SCREENS: ScreenSceneProps[] = [
  {
    id: 'overview',
    step: '01 · ОБЗОР',
    title: 'Прибыль видна за 5 секунд',
    points: ['Выручка и плановая прибыль', 'Фактическая прибыль по закрытым заказам', 'Отклонение от плана в рублях'],
    shot: 'overview',
    keys: [
      { t: 0, x: 0.5, y: 0.5, s: 1 },
      { t: 2.2, x: 0.5, y: 0.5, s: 1 },
      { t: 4.2, x: 0.58, y: 0.25, s: 1.45 },
      { t: 7, x: 0.58, y: 0.25, s: 1.45 },
      { t: 8.4, x: 0.78, y: 0.25, s: 2.05 },
    ],
    marks: [{ from: 8.6, to: 14, x: 0.563, y: 0.135, w: 0.226, h: 0.225 }],
  },
  {
    id: 'attention',
    step: '02 · КОНТРОЛЬ',
    title: 'Где теряются деньги',
    points: ['План и факт по месяцам', 'Заказы с перерасходом — сразу на виду', 'Причина отклонения рядом с цифрой'],
    shot: 'overview-tooltip',
    keys: [
      { t: 0, x: 0.5, y: 0.5, s: 1 },
      { t: 1.4, x: 0.44, y: 0.68, s: 1.6 },
      { t: 4.8, x: 0.44, y: 0.68, s: 1.6 },
      { t: 6.2, x: 0.83, y: 0.6, s: 1.8 },
    ],
    marks: [
      { from: 2, to: 4.8, x: 0.433, y: 0.56, w: 0.14, h: 0.14 },
      { from: 6.6, to: 12.6, x: 0.698, y: 0.474, w: 0.27, h: 0.14 },
    ],
  },
  {
    id: 'neworder',
    step: '03 · НОВЫЙ ЗАКАЗ',
    title: 'Расчёт — в одной форме',
    points: ['Цена и расходы по статьям', 'Прибыль и рентабельность — на лету', 'Проверка ошибок ввода'],
    shot: 'new-order',
    keys: [
      { t: 0, x: 0.5, y: 0.5, s: 1 },
      { t: 1.6, x: 0.5, y: 0.3, s: 1.4 },
      { t: 4, x: 0.5, y: 0.75, s: 1.45 },
      { t: 7.2, x: 0.4, y: 0.88, s: 1.9 },
    ],
    marks: [
      { from: 4.4, to: 7, x: 0.232, y: 0.73, w: 0.535, h: 0.165 },
      { from: 7.8, to: 12, x: 0.232, y: 0.898, w: 0.265, h: 0.078 },
    ],
  },
  {
    id: 'order',
    step: '04 · КАРТОЧКА ЗАКАЗА',
    title: 'План и факт — рядом',
    points: ['Перерасход виден сразу', 'Прибыль пересчитывается сама', 'Честная пометка «предварительно»'],
    shot: 'order-1041',
    keys: [
      { t: 0, x: 0.5, y: 0.5, s: 1 },
      { t: 1.6, x: 0.58, y: 0.45, s: 1.25 },
      { t: 4, x: 0.78, y: 0.42, s: 1.85 },
      { t: 7.2, x: 0.78, y: 0.42, s: 1.85 },
      { t: 8.4, x: 0.58, y: 0.63, s: 1.45 },
    ],
    marks: [
      { from: 4.5, to: 7.2, x: 0.594, y: 0.335, w: 0.368, h: 0.12 },
      { from: 8.8, to: 12, x: 0.203, y: 0.585, w: 0.765, h: 0.09 },
    ],
  },
  {
    id: 'expenses',
    step: '05 · РАСХОДЫ',
    title: 'Каждая трата — на своём месте',
    points: ['Журнал расходов по статьям', 'Отклонения по каждой статье'],
    shot: 'order-1041-full',
    keys: [
      { t: 0, x: 0.58, y: 0.5, s: 1.12 },
      { t: 3, x: 0.58, y: 0.5, s: 1.12 },
      { t: 4.2, x: 0.58, y: 0.8, s: 1.12 },
    ],
    marks: [
      { from: 0.8, to: 3, x: 0.203, y: 0.403, w: 0.765, h: 0.078 },
      { from: 4.6, to: 8, x: 0.195, y: 0.762, w: 0.777, h: 0.024 },
    ],
  },
  {
    id: 'complete',
    step: '06 · ЗАВЕРШЕНИЕ',
    title: 'Прибыль, которой можно верить',
    points: ['Проверка полноты расходов', 'Подтверждение владельца', 'Фактическая прибыль фиксируется'],
    shot: 'complete-dialog',
    keys: [
      { t: 0, x: 0.5, y: 0.5, s: 1 },
      { t: 1.4, x: 0.5, y: 0.48, s: 1.45 },
      { t: 3.8, x: 0.5, y: 0.48, s: 1.45 },
      { t: 5, x: 0.5, y: 0.6, s: 1.85 },
      { t: 7.4, x: 0.5, y: 0.6, s: 1.85 },
      { t: 8.5, x: 0.5, y: 0.37, s: 1.85 },
    ],
    marks: [
      { from: 5.2, to: 7.4, x: 0.306, y: 0.614, w: 0.388, h: 0.08 },
      { from: 8.7, to: 12, x: 0.306, y: 0.311, w: 0.388, h: 0.132 },
    ],
  },
  {
    id: 'analytics',
    step: '07 · АНАЛИТИКА',
    title: 'Картина по всему предприятию',
    points: ['Прибыль по периодам', 'Перерасход по статьям', 'Самые убыточные заказы'],
    shot: 'analytics-full',
    keys: [
      { t: 0, x: 0.58, y: 0.17, s: 1.05 },
      { t: 2.2, x: 0.58, y: 0.2, s: 1.05 },
      { t: 3.6, x: 0.58, y: 0.47, s: 1.05 },
      { t: 6.2, x: 0.58, y: 0.47, s: 1.05 },
      { t: 7.6, x: 0.58, y: 0.8, s: 1.05 },
    ],
    marks: [{ from: 4, to: 6.2, x: 0.59, y: 0.345, w: 0.383, h: 0.228 }],
  },
];

export const SCENE_ORDER: NarrationId[] = [
  'intro',
  'problem',
  'overview',
  'attention',
  'neworder',
  'order',
  'expenses',
  'complete',
  'analytics',
  'mobile',
  'outro',
];

export const TOTAL_FRAMES = SCENE_ORDER.reduce((a, id) => a + sceneFrames(id), 0) - TRANSITION * (SCENE_ORDER.length - 1);

function renderScene(id: NarrationId) {
  if (id === 'intro') return <Intro />;
  if (id === 'problem') return <Problem />;
  if (id === 'mobile') return <Mobile />;
  if (id === 'outro') return <Outro />;
  const cfg = SCREENS.find((s) => s.id === id)!;
  return <ScreenScene {...cfg} />;
}

/** Полный ролик: 11 сцен с мягкими переходами. */
export const FaktVideo: React.FC = () => (
  <TransitionSeries>
    {SCENE_ORDER.flatMap((id, i) => {
      const seq = (
        <TransitionSeries.Sequence key={id} name={id} durationInFrames={sceneFrames(id)}>
          {renderScene(id)}
        </TransitionSeries.Sequence>
      );
      return i === 0
        ? [seq]
        : [<TransitionSeries.Transition key={`${id}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
    })}
  </TransitionSeries>
);
