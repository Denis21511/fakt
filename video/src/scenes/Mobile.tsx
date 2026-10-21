import { Audio } from '@remotion/media';
import { Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Subtitles } from '../components/Subtitles';
import { NARRATION } from '../narration';
import { C, EASE_OUT, FONT_DISPLAY, FONT_UI, LEAD } from '../theme';

const PHONE_H = 780;
const PHONE_W = Math.round((PHONE_H * 1170) / 2532);

const Phone: React.FC<{ src: string; delay: number; lift: number }> = ({ src, delay, lift }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <div
      style={{
        width: PHONE_W + 24,
        height: PHONE_H + 24,
        padding: 12,
        borderRadius: 64,
        backgroundColor: '#0A0B0E',
        boxShadow: '0 50px 90px -30px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.1)',
        opacity: interpolate(t, [delay, delay + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        translate: `0px ${interpolate(t, [delay, delay + 0.9], [120, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT }) + lift + Math.sin(t * 1.4 + delay) * 8}px`,
      }}
    >
      <Img src={staticFile(src)} style={{ width: PHONE_W, height: PHONE_H, borderRadius: 52, display: 'block' }} />
    </div>
  );
};

/** Мобильная версия: две «трубки» с обзором и карточкой заказа. */
export const Mobile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = NARRATION.mobile;
  return (
    <Backdrop>
      <Sequence from={Math.round(LEAD * fps)} layout="none">
        <Audio src={staticFile('voice/mobile.wav')} />
      </Sequence>
      <div style={{ position: 'absolute', left: 100, top: 300, width: 600 }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '8px 16px',
            borderRadius: 10,
            backgroundColor: C.lime,
            color: C.steel,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '0.04em',
          }}
        >
          08 · С ТЕЛЕФОНА
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 72,
            lineHeight: 1.05,
            color: C.text,
            letterSpacing: '-0.03em',
            opacity: interpolate(frame, [0.2 * fps, 0.7 * fps], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          В цеху
          <br />и на объекте
        </div>
        <div style={{ marginTop: 26, fontFamily: FONT_UI, fontSize: 32, color: C.textDim, lineHeight: 1.4 }}>
          Внести расход или проверить прибыль — за минуту с телефона.
        </div>
      </div>
      <div style={{ position: 'absolute', right: 150, top: 100, display: 'flex', gap: 56 }}>
        <Phone src="shots/mobile-overview.png" delay={0.3} lift={0} />
        <Phone src="shots/mobile-order.png" delay={0.7} lift={40} />
      </div>
      <Subtitles text={n.text} seconds={n.seconds} />
    </Backdrop>
  );
};
