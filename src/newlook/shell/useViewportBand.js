import { useEffect, useState } from 'react';

/**
 * Which of the shell's three widths the window is in (Part 1, App shell and navigation, Responsive):
 *
 *   wide    1024px and up       the sidebar is 240px, or 72px if the person collapsed it
 *   medium  768px to 1023px     the sidebar is 72px, icons only
 *   narrow  below 768px         the sidebar is a drawer opened from a menu button
 */
export const DRAWER_BELOW = 768;
export const ICONS_BELOW = 1024;

export const bandFor = (width) => (width < DRAWER_BELOW ? 'narrow' : width < ICONS_BELOW ? 'medium' : 'wide');

export default function useViewportBand() {
  const [band, setBand] = useState(() => bandFor(window.innerWidth));
  useEffect(() => {
    const update = () => setBand(bandFor(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return band;
}
