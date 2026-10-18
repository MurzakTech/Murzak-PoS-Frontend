import React, { useEffect, useState } from 'react';
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

const ChartFrame = ({ height, width, children }) => {
  const reduced = usePrefersReducedMotion();
  const render = (w, h) => children({ width: w, height: h, animate: !reduced });
  if (width) return <div className="nl-chart__frame">{render(width, height)}</div>;
  return (
    <div className="nl-chart__frame" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children({ animate: !reduced })}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartFrame;
