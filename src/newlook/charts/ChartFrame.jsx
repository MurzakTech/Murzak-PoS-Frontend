import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Gives a chart its size. Normally it fills the width of its card at a fixed height; tests and fixed layouts pass
 * `width` too. Also tells the chart whether to animate: a chart draws in over 300ms, but with reduced motion
 * switched on on the device, nothing animates.
 */
export const usePrefersReducedMotion = () => {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [reduced, setReduced] = useState(Boolean(query && query.matches));
  useEffect(() => {
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    update();
    if (query.addEventListener) query.addEventListener('change', update);
    return () => query.removeEventListener && query.removeEventListener('change', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return reduced;
};

/**
 * The chart library draws each layer into a group that the browser treats as a Tab stop with no name. Only the chart itself
 * (the one svg that moves its tooltip with the arrow keys) should be a stop, so every group is taken out of the Tab order.
 */
const useQuietGroups = (frame) => {
  useEffect(() => {
    const el = frame.current;
    if (!el) return undefined;
    // The chart takes its name from the one-sentence summary on its figure, so the Tab stop is read aloud with the finding
    const name = () => {
      const figure = el.closest('figure[aria-label]');
      const surface = el.querySelector('svg.recharts-surface[tabindex="0"]');
      if (figure && surface && surface.getAttribute('aria-label') !== figure.getAttribute('aria-label')) surface.setAttribute('aria-label', figure.getAttribute('aria-label'));
    };
    const quiet = () => {
      el.querySelectorAll('svg g:not([tabindex])').forEach((g) => g.setAttribute('tabindex', '-1'));
      name();
    };
    quiet();
    if (typeof MutationObserver === 'undefined') return undefined;
    const watcher = new MutationObserver(quiet);
    watcher.observe(el, { childList: true, subtree: true });
    return () => watcher.disconnect();
  }, [frame]);
};

const ChartFrame = ({ height, width, children }) => {
  const reduced = usePrefersReducedMotion();
  const frame = useRef(null);
  useQuietGroups(frame);
  const render = (w, h) => children({ width: w, height: h, animate: !reduced });
  if (width) return <div ref={frame} className="nl-chart__frame">{render(width, height)}</div>;
  return (
    <div ref={frame} className="nl-chart__frame" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children({ animate: !reduced })}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartFrame;
