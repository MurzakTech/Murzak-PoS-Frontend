import React from 'react';

/**
 * The tooltip of every chart (Spec: "Value first in bold, then the name; one tooltip shows every series at that
 * date; shown on hover, focus and tap"). `describe(point)` returns { heading, rows: [{ value, name, swatch? }] }.
 * The text is always ink, ink-2 or muted; a small swatch carries the series colour.
 */
const ChartTooltip = ({ active, payload, describe }) => {
  if (!active || !payload || payload.length === 0) return null;
  const info = describe(payload[0].payload, payload);
  if (!info) return null;
  return (
    <div className="nl-tooltip-card" role="status">
      {info.heading ? <p className="nl-tooltip-card__heading">{info.heading}</p> : null}
      {info.rows.map((row, i) => (
        <p className="nl-tooltip-card__row" key={`${row.name}-${i}`}>
          {row.swatch ? <span className="nl-tooltip-card__swatch" style={{ background: row.swatch }} aria-hidden="true" /> : null}
          <strong>{row.value}</strong>
          <span>{row.name}</span>
        </p>
      ))}
    </div>
  );
};

export default ChartTooltip;
