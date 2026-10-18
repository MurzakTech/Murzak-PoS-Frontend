import React from 'react';
import { Line, LineChart } from 'recharts';
import { COLOUR, MARKS } from './chartTheme';
import ChartFrame from './ChartFrame';

/**
 * A sparkline (Spec: "A 2px line in compare grey, no axes. Decorative, hidden from screen readers; the number beside it
 * carries the meaning"). `values` is a list of numbers. With no `width` it fills the space it is given (a stat tile).
 */
const Sparkline = ({ values, width, height = 32 }) => {
  const data = (values || []).map((value, i) => ({ i, value }));
  if (data.length < 2) return null;
  return (
    <span className="nl-spark" aria-hidden="true" style={{ width: width || '100%', height }}>
      <ChartFrame width={width} height={height}>
        {({ width: w, height: h }) => (
          <LineChart {...(w ? { width: w, height: h } : {})} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }} accessibilityLayer={false}>
            <Line type="monotone" dataKey="value" stroke={COLOUR.other} strokeWidth={MARKS.lineWidth} strokeLinecap="round" strokeLinejoin="round" dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ChartFrame>
    </span>
  );
};

export default Sparkline;
