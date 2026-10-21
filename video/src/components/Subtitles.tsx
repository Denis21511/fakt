import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT_UI, LEAD } from '../theme';

/** Делит реплику на короткие фразы для субтитров. */
function chunks(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= 80) {
      out.push(s);
      continue;
    }
    // Длинное предложение — режем по ближайшей к середине запятой или тире
    const mid = s.length / 2;
    const cuts = [...s.matchAll(/(, | — |: )/g)].map((m) => (m.index ?? 0) + m[0].length);
    const cut = cuts.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    if (cut && cut > 20 && cut < s.length - 15) out.push(s.slice(0, cut).trim(), s.slice(cut).trim());
    else out.push(s);
  }
  return out;
}

/** Субтитры, синхронизированные с озвучкой пропорционально длине фраз. */
export const Subtitles: React.FC<{ text: string; seconds: number }> = ({ text, seconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - LEAD;
  // Голос читает «Факт», а в субтитрах — название бренда латиницей
  const parts = chunks(text.replace(/(^|[.!?]\s)Факт(?=[\s.])/g, '$1FAKT'));
  const total = parts.reduce((a, p) => a + p.length, 0);
  let acc = 0;
  const timed = parts.map((p) => {
    const start = (acc / total) * seconds;
    acc += p.length;
    return { p, start, end: (acc / total) * seconds };
  });
  const cur = timed.find((x) => t >= x.start && t < x.end + 0.25) ?? (t < 0 ? null : timed[timed.length - 1]);
  if (!cur || t > seconds + 0.6) return null;
  const opacity = interpolate(t, [cur.start, cur.start + 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 34,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: '12px 28px',
          borderRadius: 14,
          backgroundColor: 'rgba(10,12,15,0.82)',
          color: C.text,
          fontFamily: FONT_UI,
          fontSize: 34,
          lineHeight: 1.3,
          fontWeight: 500,
          textAlign: 'center',
          opacity,
        }}
      >
        {cur.p}
      </div>
    </div>
  );
};
