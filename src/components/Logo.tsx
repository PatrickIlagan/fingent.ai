import { useId } from 'react';

export type LogoAccent = 'emerald' | 'ocean' | 'violet' | 'sunset';

// Gradient stops for each accent, matching the Tailwind gradients used in the layout.
export const LOGO_COLORS: Record<LogoAccent, [string, string]> = {
  emerald: ['#34d399', '#0d9488'],
  ocean: ['#3b82f6', '#06b6d4'],
  violet: ['#8b5cf6', '#d946ef'],
  sunset: ['#f43f5e', '#fb923c'],
};

// The mark on a 64×64 grid: an "F" whose arms rise to the right like a trend line,
// with a small spark in the open corner.
const STEM = 'M21.5 46V20';
const TOP_ARM = 'M21.5 20L42 15.5';
const MIDDLE_ARM = 'M21.5 33L35 30';
const SPARK = 'M45 35Q45 43 53 43Q45 43 45 51Q45 43 37 43Q45 43 45 35Z';

/** The logo as a standalone SVG document, for the favicon and generated app icons. */
export function logoSvg(accent: LogoAccent = 'emerald', options: { shape?: 'tile' | 'circle' | 'square' | 'none'; size?: number; markScale?: number } = {}) {
  const { shape = 'tile', size = 64, markScale = 1 } = options;
  const [from, to] = LOGO_COLORS[accent] || LOGO_COLORS.emerald;
  const background = shape === 'none' ? '' : shape === 'circle' ? '<circle cx="32" cy="32" r="32" fill="url(#g)"/>' : `<rect width="64" height="64" rx="${shape === 'tile' ? 15 : 0}" fill="url(#g)"/>`;
  const offset = 32 - 32 * markScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>${background}<g transform="translate(${offset} ${offset}) scale(${markScale})"><g fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"><path d="${STEM}"/><path d="${TOP_ARM}"/><path d="${MIDDLE_ARM}"/></g><path d="${SPARK}" fill="#fff" opacity="0.92"/></g></svg>`;
}

export function Logo({ accent = 'emerald', size = 32, className = '' }: { accent?: LogoAccent; size?: number; className?: string }) {
  const id = `fg-logo-${useId().replace(/:/g, '')}`;
  const [from, to] = LOGO_COLORS[accent] || LOGO_COLORS.emerald;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="FinGent" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={STEM} />
        <path d={TOP_ARM} />
        <path d={MIDDLE_ARM} />
      </g>
      <path d={SPARK} fill="#fff" opacity="0.92" />
    </svg>
  );
}
