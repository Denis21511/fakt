import { Audio } from '@remotion/media';
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { LogoMark } from '../components/LogoMark';
import { Subtitles } from '../components/Subtitles';
import { NARRATION } from '../narration';
import { C, EASE_OUT, FONT_DISPLAY, FONT_UI, LEAD } from '../theme';

const BENEFITS = ['План и факт по каждому заказу', 'Перерасход виден сразу', 'Фактическая прибыль без догадок'];

/** Финал: обещание продукта и призыв к внедрению. */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const n = NARRATION.outro;
  const show = (at: number) => ({
    opacity: interpolate(t, [at, at + 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    translate: interpolate(t, [at, at + 0.6], ['0px 26px', '0px 0px'], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT }),
  });

  return (
    <Backdrop>
      <Sequence from={Math.round(LEAD * fps)} layout="none">
        <Audio src={staticFile('voice/outro.wav')} />
      </Sequence>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 90 }}>
        <div style={{ ...show(0), display: 'flex', alignItems: 'center', gap: 34 }}>
          <LogoMark size={128} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 120, letterSpacing: '0.08em', color: C.text }}>FAKT</span>
        </div>
        <div style={{ ...show(1.2), marginTop: 34, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 64, color: C.text, letterSpacing: '-0.02em' }}>
          Каждый заказ в цифрах.
        </div>
        <div style={{ marginTop: 46, display: 'flex', gap: 18 }}>
          {BENEFITS.map((b, i) => (
            <div
              key={b}
              style={{
                ...show(2.2 + i * 0.35),
                padding: '16px 26px',
                borderRadius: 14,
                backgroundColor: C.steel2,
                border: '1px solid rgba(255,255,255,0.08)',
                color: C.text,
                fontFamily: FONT_UI,
                fontSize: 30,
              }}
            >
              <span style={{ color: C.lime, marginRight: 12 }}>✓</span>
              {b}
            </div>
          ))}
        </div>
        <div
          style={{
            ...show(4.6),
            marginTop: 64,
            padding: '24px 44px',
            borderRadius: 18,
            backgroundColor: C.cobalt,
            color: '#fff',
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 42,
            boxShadow: '0 24px 60px -20px rgba(47,79,240,0.8)',
          }}
        >
          Внедрим под ваше производство →
        </div>
      </AbsoluteFill>
      <Subtitles text={n.text} seconds={n.seconds} />
    </Backdrop>
  );
};
