import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../theme';

/** Тёмный «стальной» фон с тонкой сеткой, как на чертеже. Сетка медленно смещается. */
export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 900], [0, 60]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.steel }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.steelLine} 1px, transparent 1px), linear-gradient(90deg, ${C.steelLine} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          backgroundPosition: `${shift}px ${shift}px`,
          opacity: 0.55,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
