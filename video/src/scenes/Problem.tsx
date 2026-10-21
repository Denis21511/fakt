import { Audio } from '@remotion/media';
import { interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Subtitles } from '../components/Subtitles';
import { NARRATION } from '../narration';
import { C, EASE_OUT, FONT_DISPLAY, FONT_UI, LEAD } from '../theme';

const COSTS = [
  { label: 'Металл подорожал у поставщика', value: '+6 500 ₽', at: 3.6 },
  { label: 'Лишняя смена сварщика', value: '+12 000 ₽', at: 4.6 },
  { label: 'Автовышка на второй день', value: '+6 000 ₽', at: 5.6 },
];

/** Проблема: заказ посчитан в плюс, но расходы «расползаются». */
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = NARRATION.problem;
  const t = frame / fps;
  const show = (at: number) => ({
    opacity: interpolate(t, [at, at + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    translate: interpolate(t, [at, at + 0.6], ['0px 30px', '0px 0px'], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT }),
  });
  // Плановая прибыль «тает» по мере появления расходов
  const profit = Math.round(
    interpolate(t, [3.6, 6.4], [59000, 34500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT }) / 100,
  ) * 100;
  const hl = interpolate(t, [8.2, 9], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });

  return (
    <Backdrop>
      <Sequence from={Math.round(LEAD * fps)} layout="none">
        <Audio src={staticFile('voice/problem.wav')} />
      </Sequence>

      <div style={{ position: 'absolute', left: 140, top: 150, width: 920, fontFamily: FONT_UI }}>
        <div style={{ ...show(0.3), color: C.textDim, fontSize: 34 }}>Лестница на металлокаркасе</div>
        <div style={{ ...show(0.6), marginTop: 18, color: C.text, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 74, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
          Посчитали заранее —
          <br />
          заказ в плюсе.
        </div>
        <div style={{ ...show(1.6), marginTop: 46, display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <span style={{ color: C.textDim, fontSize: 32 }}>Ожидаемая прибыль</span>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 72,
              color: profit < 59000 ? C.neg : C.pos,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {profit.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>

      <div style={{ position: 'absolute', right: 140, top: 210, width: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {COSTS.map((c) => (
          <div
            key={c.label}
            style={{
              ...show(c.at),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '26px 30px',
              borderRadius: 18,
              backgroundColor: C.steel2,
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: FONT_UI,
            }}
          >
            <span style={{ color: C.text, fontSize: 32 }}>{c.label}</span>
            <span style={{ color: C.neg, fontSize: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 24 }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ ...show(7.6), position: 'absolute', left: 140, right: 140, top: 700, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 76, color: C.text, letterSpacing: '-0.02em' }}>
        Сколько вы заработали{' '}
        <span style={{ position: 'relative', display: 'inline-block', marginLeft: 12 }}>
          <span>на самом деле?</span>
          {/* Лаймовый маркер «прорисовывается» слева направо */}
          <span
            style={{
              position: 'absolute',
              left: -14,
              right: -14,
              top: -2,
              bottom: -6,
              padding: '2px 14px 6px',
              borderRadius: 10,
              backgroundColor: C.lime,
              color: C.steel,
              clipPath: `inset(0 ${100 - hl}% 0 0 round 10px)`,
              whiteSpace: 'nowrap',
            }}
          >
            на самом деле?
          </span>
        </span>
      </div>

      <Subtitles text={n.text} seconds={n.seconds} />
    </Backdrop>
  );
};
