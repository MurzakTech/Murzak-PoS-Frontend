import React from 'react';

/**
 * Small line-art pictures for the "nothing here yet" screens (sales, products, customers). They are drawn in the shop's accent colour
 * and the page colours, so they follow the accent and the dark theme, and they are decoration only (the headline and sentence beside
 * them say everything). Plain SVG, no file to load.
 */
const COMMON = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ART = {
  // A receipt with lines and a check
  sales: (
    <>
      <circle cx="60" cy="60" r="52" className="nl-art__wash" />
      <path d="M38 24h44v72l-8-5-7 5-7-5-7 5-8-5-7 5z" className="nl-art__paper" />
      <path d="M48 42h24M48 54h24M48 66h14" className="nl-art__line" {...COMMON} />
      <circle cx="82" cy="82" r="12" className="nl-art__badge" />
      <path d="M76 82l4 4 7-8" className="nl-art__tick" {...COMMON} />
    </>
  ),
  // A box on a shelf
  products: (
    <>
      <circle cx="60" cy="60" r="52" className="nl-art__wash" />
      <path d="M30 88h60" className="nl-art__line" {...COMMON} />
      <path d="M44 50l16-9 16 9v22l-16 9-16-9z" className="nl-art__paper" />
      <path d="M44 50l16 9 16-9M60 59v22" className="nl-art__line" {...COMMON} />
      <path d="M86 36v10M81 41h10" className="nl-art__line" {...COMMON} />
    </>
  ),
  // Two people
  customers: (
    <>
      <circle cx="60" cy="60" r="52" className="nl-art__wash" />
      <circle cx="49" cy="48" r="10" className="nl-art__paper" />
      <path d="M31 84c0-11 8-18 18-18s18 7 18 18" className="nl-art__paper" />
      <circle cx="76" cy="52" r="8" className="nl-art__badge" />
      <path d="M64 84c1-9 6-14 13-14s11 4 13 14" className="nl-art__badge" />
    </>
  ),
};

const EmptyArt = ({ name }) => {
  if (!ART[name]) return null;
  return (
    <svg className="nl-art" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false">
      {ART[name]}
    </svg>
  );
};

export default EmptyArt;
