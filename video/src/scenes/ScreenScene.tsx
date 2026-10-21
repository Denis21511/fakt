import { Audio } from '@remotion/media';
import { interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { BrowserFrame, Shot, type CamKey, type Mark } from '../components/Shot';
import { Subtitles } from '../components/Subtitles';
import { NARRATION, type NarrationId } from '../narration';
import type { ShotName } from '../shots';
import { C, EASE_OUT, FONT_DISPLAY, FONT_UI, LEAD } from '../theme';

export type ScreenSceneProps = {
  id: NarrationId;
  step: string;
  title: string;
  points: string[];
  shot: ShotName;
  keys: CamKey[];
  marks?: Mark[];
};

const WIN_W = 1260;
const WIN_H = 788;

/** Сцена-демонстрация экрана: слева заголовок и тезисы, справа окно приложения с наездом камеры. */
export const ScreenScene: React.FC<ScreenSceneProps> = ({ id, step, title, points, shot, keys, marks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = NARRATION[id];
  const appear = (delay: number) => ({
    opacity: interpolate(frame, [delay * fps, (delay + 0.5) * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    translate: interpolate(frame, [delay * fps, (delay + 0.6) * fps], ['0px 24px', '0px 0px'], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_OUT,
    }),
  });

  return (
    <Backdrop>
      <Sequence from={Math.round(LEAD * fps)} layout="none">
        <Audio src={staticFile(`voice/${id}.wav`)} />
      </Sequence>

      <div style={{ position: 'absolute', left: 100, top: 150, width: 440, fontFamily: FONT_UI }}>
        <div
          style={{
            ...appear(0.1),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
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
          {step}
        </div>
        <div
          style={{
            ...appear(0.25),
            marginTop: 26,
            color: C.text,
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 60,
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {points.map((p, i) => (
            <div key={p} style={{ ...appear(0.9 + i * 0.9), display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ width: 12, height: 12, marginTop: 13, borderRadius: 3, backgroundColor: C.cobalt, flex: 'none' }} />
              <span style={{ color: C.textDim, fontSize: 30, lineHeight: 1.35 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 580,
          top: 92,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [0, 0.8 * fps], ['60px 0px', '0px 0px'], { extrapolateRight: 'clamp', easing: EASE_OUT }),
        }}
      >
        <BrowserFrame width={WIN_W}>
          <Shot name={shot} width={WIN_W} height={WIN_H} keys={keys} marks={marks} />
        </BrowserFrame>
      </div>

      <Subtitles text={n.text} seconds={n.seconds} />
    </Backdrop>
  );
};
