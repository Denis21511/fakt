import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { SHOTS, type ShotName } from '../shots';
import { C, EASE, EASE_OUT, FONT_UI } from '../theme';

/** Положение «камеры»: точка фокуса (0..1 по ширине и высоте снимка) и масштаб (1 = по ширине окна). */
export type CamKey = { t: number; x: number; y: number; s: number };
/** Подсветка области снимка (координаты 0..1) в интервале времени, сек. */
export type Mark = { from: number; to: number; x: number; y: number; w: number; h: number };

function camAt(keys: CamKey[], t: number) {
  const times = keys.map((k) => k.t);
  const pick = (f: (k: CamKey) => number) =>
    keys.length === 1
      ? f(keys[0])
      : interpolate(t, times, keys.map(f), { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { x: pick((k) => k.x), y: pick((k) => k.y), s: pick((k) => k.s) };
}

/**
 * Скриншот в окне браузера с плавным наездом камеры.
 * Масштаб меняется через реальные размеры картинки, поэтому рамки подсветки не «толстеют».
 */
export const Shot: React.FC<{
  name: ShotName;
  width: number;
  height: number;
  keys: CamKey[];
  marks?: Mark[];
  delay?: number;
}> = ({ name, width, height, keys, marks = [], delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - delay;
  const { w: iw, h: ih } = SHOTS[name];
  const cam = camAt(keys, t);
  const dispW = width * cam.s;
  const dispH = (dispW * ih) / iw;
  const left = Math.min(0, Math.max(width - dispW, width / 2 - cam.x * dispW));
  const top = Math.min(0, Math.max(height - dispH, height / 2 - cam.y * dispH));

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', backgroundColor: C.paper }}>
      <div style={{ position: 'absolute', left, top, width: dispW, height: dispH }}>
        <Img src={staticFile(`shots/${name}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {marks.map((m, i) => {
          const fadeIn = interpolate(t, [m.from, m.from + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
          const fadeOut = interpolate(t, [m.to - 0.3, m.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const pop = interpolate(t, [m.from, m.from + 0.45], [1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                width: `${m.w * 100}%`,
                height: `${m.h * 100}%`,
                border: `5px solid ${C.lime}`,
                borderRadius: 16,
                boxShadow: '0 0 0 9999px rgba(20,23,28,0.28)',
                opacity: Math.min(fadeIn, fadeOut),
                scale: pop,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/** Рамка окна браузера вокруг снимка. */
export const BrowserFrame: React.FC<{ width: number; children: React.ReactNode; label?: string }> = ({
  width,
  children,
  label = 'FAKT — контроль прибыли заказов',
}) => (
  <div
    style={{
      width,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#0E1014',
      boxShadow: '0 40px 90px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)',
    }}
  >
    <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px' }}>
      {['#F0675B', '#E8B93E', '#3FBF86'].map((c) => (
        <span key={c} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, opacity: 0.85 }} />
      ))}
      <span
        style={{
          marginLeft: 18,
          padding: '5px 16px',
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.07)',
          color: 'rgba(243,244,247,0.6)',
          fontFamily: FONT_UI,
          fontSize: 15,
        }}
      >
        {label}
      </span>
    </div>
    {children}
  </div>
);
