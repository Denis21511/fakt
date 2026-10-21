import { useId } from 'react';

const PLATE = 'M10 0H30A10 10 0 0 1 40 10V33L33 40H10A10 10 0 0 1 0 30V10A10 10 0 0 1 10 0Z';

/** Монограмма FAKT — та же, что в приложении. */
export const LogoMark: React.FC<{ size: number; plate?: string; ink?: string }> = ({
  size,
  plate = '#D5F36A',
  ink = '#14171C',
}) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
      <defs>
        <clipPath id={`${id}a`}>
          <rect x="22" y="8" width="10" height="10" />
        </clipPath>
        <clipPath id={`${id}k`}>
          <rect x="8" y="22" width="10" height="10" />
        </clipPath>
      </defs>
      <path d={PLATE} fill={plate} />
      <g fill="none" stroke={ink} strokeWidth="2.8" strokeLinejoin="miter" strokeLinecap="butt">
        <path d="M9.4 18V9.4H18M9.4 14H16.4" />
        <path d="M22.96 20L26.74 6M31.04 20L27.26 6M24.5 14.2H29.5" clipPath={`url(#${id}a)`} />
        <path d="M9.4 22V32M9.4 28.4L18.6 21.1M12.4 26L18.2 33" clipPath={`url(#${id}k)`} />
        <path d="M22 23.4H32M27 22V32" />
      </g>
    </svg>
  );
};
