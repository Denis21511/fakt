import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { LogoMark } from '../components/LogoMark';
import { Subtitles } from '../components/Subtitles';
import { NARRATION } from '../narration';
import { C, EASE_OUT, FONT_DISPLAY, FONT_UI, LEAD } from '../theme';

/** Заставка: монограмма, название и обещание продукта. */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = NARRATION.intro;
  const letters = 'FAKT'.split('');

  return (
    <Backdrop>
      <Sequence from={Math.round(LEAD * fps)} layout="none">
        <Audio src={staticFile('voice/intro.wav')} />
      </Sequence>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 60 }}>
        <div
          style={{
            scale: interpolate(frame, [0, 0.9 * fps], [0.6, 1], {
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 14 }),
            }),
            rotate: interpolate(frame, [0, 0.9 * fps], ['-8deg', '0deg'], { extrapolateRight: 'clamp', easing: EASE_OUT }),
            opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <LogoMark size={210} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 52 }}>
          {letters.map((l, i) => (
            <span
              key={i}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 150,
                lineHeight: 1,
                letterSpacing: '0.08em',
                color: C.text,
                opacity: interpolate(frame, [(0.6 + i * 0.1) * fps, (0.95 + i * 0.1) * fps], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                translate: interpolate(frame, [(0.6 + i * 0.1) * fps, (1.1 + i * 0.1) * fps], ['0px 40px', '0px 0px'], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: EASE_OUT,
                }),
              }}
            >
              {l}
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: FONT_UI,
            fontSize: 46,
            color: C.textDim,
            opacity: interpolate(frame, [1.5 * fps, 2.1 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          Контроль прибыли заказов для металлообработки
        </div>
        <div
          style={{
            marginTop: 26,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.lime,
            width: interpolate(frame, [1.9 * fps, 2.8 * fps], [0, 260], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: EASE_OUT,
            }),
          }}
        />
      </AbsoluteFill>
      <Subtitles text={n.text} seconds={n.seconds} />
    </Backdrop>
  );
};
