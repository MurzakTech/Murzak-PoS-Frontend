import React from 'react';

/**
 * Hand-drawn style illustrations, one per kind of product. Each is drawn on a
 * 64 x 64 grid using three shades of the product's colour (main, dark, light)
 * plus white, so every product in a group looks related but not identical.
 * They are plain vector shapes: sharp at any size and only a few bytes each.
 */

const W = '#ffffff';
const GREEN = '#43a047';

const DRAWINGS = {
  dairy: ({ main, dark, light }) => (
    <>
      <rect x="27" y="7" width="10" height="6" rx="1.5" fill={dark} />
      <path d="M20 24 L26 13 H38 L44 24 Z" fill={light} />
      <rect x="20" y="24" width="24" height="33" rx="2.5" fill={main} />
      <rect x="24" y="32" width="16" height="16" rx="3" fill={W} />
      <path d="M32 35 C30 38.5 28.8 40.5 28.8 42 A3.2 3.2 0 0 0 35.2 42 C35.2 40.5 34 38.5 32 35 Z" fill={main} />
    </>
  ),
  bakery: ({ main, dark, light }) => (
    <>
      <path d="M12 34 C12 24 22 19 32 19 C42 19 52 24 52 34 C52 37 50.5 38.5 48 38.5 V50 C48 52.5 46 54.5 43.5 54.5 H20.5 C18 54.5 16 52.5 16 50 V38.5 C13.5 38.5 12 37 12 34 Z" fill={main} />
      <path d="M16 44 H48 V50 C48 52.5 46 54.5 43.5 54.5 H20.5 C18 54.5 16 52.5 16 50 Z" fill={dark} opacity="0.35" />
      <path d="M23 27 l4 7 M31 25 l4 7 M39 27 l4 7" stroke={light} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  pantry: ({ main, dark, light }) => (
    <>
      <path d="M22 17 L27 24 H37 L42 17 C38 19.5 35.5 16 32 18.5 C28.5 16 26 19.5 22 17 Z" fill={main} />
      <path d="M24 27 C17 32 15 44 18 54 C18.8 56 21 57.5 23 57.5 H41 C43 57.5 45.2 56 46 54 C49 44 47 32 40 27 Z" fill={main} />
      <rect x="24" y="23" width="16" height="5" rx="2.5" fill={dark} />
      <circle cx="32" cy="43" r="8" fill={W} />
      <ellipse cx="30.5" cy="43" rx="2.2" ry="4" fill={dark} transform="rotate(-25 30.5 43)" />
      <ellipse cx="34" cy="42" rx="2.2" ry="4" fill={light} transform="rotate(25 34 42)" />
    </>
  ),
  beverages: ({ main, dark, light }) => (
    <>
      <rect x="27.5" y="7" width="9" height="6" rx="1.5" fill={dark} />
      <path d="M28 13 H36 V18 C36 21.5 42 23.5 42 30 V54 C42 56.2 40.2 58 38 58 H26 C23.8 58 22 56.2 22 54 V30 C22 23.5 28 21.5 28 18 Z" fill={main} />
      <rect x="22" y="34" width="20" height="13" fill={W} />
      <rect x="22" y="38.5" width="20" height="4" fill={light} />
      <rect x="25" y="25" width="3" height="7" rx="1.5" fill={W} opacity="0.45" />
      <rect x="25" y="49" width="3" height="5" rx="1.5" fill={W} opacity="0.45" />
    </>
  ),
  hotDrinks: ({ main, dark, light }) => (
    <>
      <path d="M24 22 C21.5 19 26.5 17 24 13 M32 22 C29.5 19 34.5 17 32 13 M40 22 C37.5 19 42.5 17 40 13" stroke={light} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="54" rx="21" ry="4.5" fill={dark} />
      <path d="M45 31 C54 31 54 45 44 44" stroke={main} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M15 27 H47 V38 C47 46.5 40.5 53 31 53 C21.5 53 15 46.5 15 38 Z" fill={main} />
      <ellipse cx="31" cy="27" rx="16" ry="3.5" fill={dark} />
    </>
  ),
  fruit: ({ main, dark }) => (
    <>
      <path d="M32 22 C26 17 14 19 14 32 C14 44 22 55 28 55 C30 55 31 54 32 54 C33 54 34 55 36 55 C42 55 50 44 50 32 C50 19 38 17 32 22 Z" fill={main} />
      <path d="M32 22 C32 18 33 15 35.5 12.5" stroke={dark} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M35 17.5 C38 11 45 10.5 48 12.5 C45 17 40.5 19.5 35 17.5 Z" fill={GREEN} />
      <ellipse cx="22.5" cy="31" rx="3" ry="5.5" fill={W} opacity="0.45" />
    </>
  ),
  vegetables: ({ main, dark, light }) => (
    <>
      <path d="M13 51 C13 28 29 13 53 11 C53 35 37 51 13 51 Z" fill={main} />
      <path d="M15 49 C25 39 36 28 50 14" stroke={light} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M26.5 37.5 V28.5 M34.5 29.5 V21 M31 41.5 H40.5 M38.5 33 H46.5" stroke={light} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M14 50 L9 55" stroke={dark} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  meat: ({ main, dark }) => (
    <>
      <path d="M30 36 L19 47" stroke="#f3ece0" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="16.5" cy="46" r="4.3" fill="#f3ece0" />
      <circle cx="20.5" cy="50" r="4.3" fill="#f3ece0" />
      <ellipse cx="40" cy="26" rx="15.5" ry="12" fill={main} transform="rotate(-45 40 26)" />
      <ellipse cx="44" cy="22" rx="6" ry="3.5" fill={dark} opacity="0.3" transform="rotate(-45 44 22)" />
      <ellipse cx="34.5" cy="21.5" rx="4.5" ry="2.6" fill={W} opacity="0.4" transform="rotate(-45 34.5 21.5)" />
    </>
  ),
  snacks: ({ main, dark }) => (
    <>
      <path d="M18 14 L22 10 L26 14 L30 10 L34 14 L38 10 L42 14 L46 10 V54 L42 58 L38 54 L34 58 L30 54 L26 58 L22 54 L18 58 Z" fill={main} />
      <rect x="18" y="18" width="28" height="4.5" fill={dark} />
      <circle cx="32" cy="36.5" r="10.5" fill={W} />
      <ellipse cx="29" cy="37.5" rx="5.2" ry="3.6" fill="#fbc02d" transform="rotate(-20 29 37.5)" />
      <ellipse cx="35" cy="34.5" rx="5.2" ry="3.6" fill="#f9a825" transform="rotate(25 35 34.5)" />
      <rect x="18" y="49" width="28" height="2.5" fill={dark} opacity="0.5" />
    </>
  ),
  household: ({ main, dark, light }) => (
    <>
      <circle cx="13" cy="13" r="2.6" fill={light} />
      <circle cx="10.5" cy="20.5" r="1.8" fill={light} />
      <circle cx="16" cy="19" r="1.3" fill={light} />
      <rect x="17" y="11" width="9" height="4.5" rx="1.2" fill={dark} />
      <path d="M26 10 H42 C43.1 10 44 10.9 44 12 V16 C44 17.1 43.1 18 42 18 H26 Z" fill={dark} />
      <path d="M31 18 L27.5 25" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <rect x="29" y="18" width="10" height="7" fill={dark} />
      <path d="M22 30 C22 26.5 24.5 24.5 28 24.5 H38 C41.5 24.5 44 26.5 44 30 V54 C44 56.2 42.2 58 40 58 H26 C23.8 58 22 56.2 22 54 Z" fill={main} />
      <rect x="26" y="35" width="14" height="13" rx="2.5" fill={W} />
      <path d="M29.5 44 C29.5 40 33 38.5 36.5 38.5 C36.5 42.5 33.5 44 29.5 44 Z" fill={light} />
    </>
  ),
  personal: ({ main, dark, light }) => (
    <>
      <rect x="26" y="9.5" width="13" height="4.5" rx="1.8" fill={dark} />
      <rect x="38" y="10.2" width="8" height="2.8" rx="1.2" fill={dark} />
      <rect x="30" y="14" width="4" height="7" fill={dark} />
      <rect x="27" y="20" width="10" height="5.5" rx="1" fill={dark} />
      <path d="M20 30.5 C20 27.5 22.2 25.5 25 25.5 H39 C41.8 25.5 44 27.5 44 30.5 V54 C44 56.2 42.2 58 40 58 H24 C21.8 58 20 56.2 20 54 Z" fill={main} />
      <rect x="24.5" y="35" width="15" height="14" rx="7" fill={W} />
      <circle cx="32" cy="42" r="3.6" fill={light} />
      <rect x="23" y="29" width="2.6" height="22" rx="1.3" fill={W} opacity="0.35" />
    </>
  ),
  health: ({ main, dark }) => (
    <>
      <g transform="rotate(-35 30 36)">
        <rect x="12" y="28" width="36" height="16" rx="8" fill={W} stroke={main} strokeWidth="1.8" />
        <path d="M20 28 H30 V44 H20 A8 8 0 0 1 20 28 Z" fill={main} />
        <rect x="16" y="31" width="9" height="2.6" rx="1.3" fill={W} opacity="0.5" />
      </g>
      <circle cx="47" cy="17" r="9" fill={dark} />
      <path d="M47 12.5 V21.5 M42.5 17 H51.5" stroke={W} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  electronics: ({ main, dark, light }) => (
    <>
      <rect x="19" y="7" width="26" height="50" rx="5.5" fill={dark} />
      <rect x="22.5" y="12" width="19" height="37" rx="2.5" fill={light} />
      <circle cx="32" cy="53" r="1.8" fill={light} />
      <path d="M34 19 L27 32 H32.5 L30 43 L38 29 H32.5 L35 19 Z" fill={main} />
    </>
  ),
  hardware: ({ main, dark }) => (
    <>
      <rect x="28.5" y="24" width="7" height="34" rx="3.5" fill={main} />
      <rect x="28.5" y="48" width="7" height="10" rx="3.5" fill={dark} opacity="0.5" />
      <path d="M16 13 H44 C46.2 13 48 14.8 48 17 V22 C48 24.2 46.2 26 44 26 H16 C13.8 26 12 24.2 12 22 V17 C12 14.8 13.8 13 16 13 Z" fill={dark} />
      <path d="M48 16 C53 16 55.5 19 55.5 23.5" stroke={dark} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <rect x="15.5" y="15.5" width="20" height="2.6" rx="1.3" fill={W} opacity="0.35" />
    </>
  ),
  clothing: ({ main, dark, light }) => (
    <>
      <path d="M24 10 L14 14 L6 24 L14 30.5 L18 26.5 V56 H46 V26.5 L50 30.5 L58 24 L50 14 L40 10 C38 14 35.2 16 32 16 C28.8 16 26 14 24 10 Z" fill={main} />
      <path d="M24 10 C26 14 28.8 16 32 16 C35.2 16 38 14 40 10" stroke={dark} strokeWidth="2.6" fill="none" />
      <rect x="36" y="29" width="6.5" height="6.5" rx="1.2" fill={light} />
      <path d="M18 50 H46" stroke={dark} strokeWidth="2" opacity="0.35" />
    </>
  ),
  stationery: ({ main, dark }) => (
    <>
      <rect x="10" y="15" width="29" height="38" rx="3" fill={main} />
      <rect x="10" y="15" width="5.5" height="38" rx="2" fill={dark} />
      <rect x="21" y="23" width="13" height="3.2" rx="1.6" fill={W} />
      <rect x="21" y="29.5" width="9.5" height="2.6" rx="1.3" fill={W} opacity="0.7" />
      <g transform="rotate(32 47 34)">
        <rect x="43" y="9" width="8" height="5" rx="1.5" fill="#ef9a9a" />
        <rect x="43" y="13.5" width="8" height="2.2" fill="#bdbdbd" />
        <rect x="43" y="15.5" width="8" height="27" fill="#ffca28" />
        <path d="M43 42.5 H51 L47 51 Z" fill="#f5deb3" />
        <path d="M45.8 48.4 H48.2 L47 51 Z" fill="#424242" />
      </g>
    </>
  ),
  food: ({ main, dark }) => (
    <>
      <path d="M14 30 C14 20 22 14 32 14 C42 14 50 20 50 30 Z" fill={main} />
      <ellipse cx="25" cy="22" rx="1.6" ry="1" fill={W} opacity="0.85" />
      <ellipse cx="32" cy="19" rx="1.6" ry="1" fill={W} opacity="0.85" />
      <ellipse cx="39" cy="22" rx="1.6" ry="1" fill={W} opacity="0.85" />
      <path d="M12 32 Q16 36.5 20 32 Q24 36.5 28 32 Q32 36.5 36 32 Q40 36.5 44 32 Q48 36.5 52 32 V34.5 H12 Z" fill="#66bb6a" />
      <rect x="13" y="35" width="38" height="7.5" rx="3.75" fill="#6d4c41" />
      <path d="M14 44.5 H50 V46.5 C50 50 47 52.5 43.5 52.5 H20.5 C17 52.5 14 50 14 46.5 Z" fill={dark} />
    </>
  ),
  general: ({ main, dark, light }) => (
    <>
      <path d="M24 28 V20 C24 15.5 27.6 12 32 12 C36.4 12 40 15.5 40 20 V28" stroke={dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M14 24 H50 L47 56 C46.9 57.1 46 58 44.9 58 H19.1 C18 58 17.1 57.1 17 56 Z" fill={main} />
      <path d="M14 24 H50 L49.5 29.5 H14.5 Z" fill={dark} opacity="0.3" />
      <circle cx="24" cy="28" r="2.2" fill={dark} />
      <circle cx="40" cy="28" r="2.2" fill={dark} />
      <path d="M27 42 L31 46 L38 38" stroke={light} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export const ART_KEYS = Object.keys(DRAWINGS);

let uid = 0;

/**
 * One illustration on a soft coloured background.
 * shape "wide" fills a product tile; "square" fits a thumbnail.
 */
const ProductArt = ({ colors, shape = 'wide', title }) => {
  const [id] = React.useState(() => `pa${(uid += 1)}`);
  const Drawing = DRAWINGS[colors.kind] || DRAWINGS.general;
  const wide = shape === 'wide';
  const vw = wide ? 200 : 100;
  const vh = 100;
  const scale = wide ? 1.15 : 1.15;
  const tx = vw / 2 - 32 * scale;
  const ty = vh / 2 - 32 * scale - (wide ? 3 : 1);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.bg1} />
          <stop offset="100%" stopColor={colors.bg2} />
        </linearGradient>
      </defs>
      <rect width={vw} height={vh} fill={`url(#${id}-bg)`} />
      <circle cx={vw * 0.88} cy={vh * 0.12} r={vh * 0.32} fill={colors.light} opacity="0.35" />
      <circle cx={vw * 0.08} cy={vh * 0.95} r={vh * 0.22} fill={colors.light} opacity="0.3" />
      <ellipse cx={vw / 2} cy={ty + 62 * scale} rx={22 * scale} ry={3.2} fill={colors.dark} opacity="0.16" />
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        <Drawing {...colors} />
      </g>
    </svg>
  );
};

export default ProductArt;
