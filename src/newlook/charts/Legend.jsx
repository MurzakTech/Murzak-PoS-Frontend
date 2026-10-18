import React from 'react';

/**
 * The legend (Spec: always shown for two or more series, "because aqua and yellow are paler than the page"): a swatch,
 * the name, and optionally the amount and percentage. Identity is never colour alone, because every swatch has its
 * name beside it. Text is ink or muted, never the series colour.
 *
 *   items   [{ name, colour, value?, percent?, dashed? }]
 */
const Legend = ({ items, label }) => {
  if (!items || items.length === 0) return null;
  return (
    <ul className="nl-legend" aria-label={label}>
      {items.map((item) => (
        <li className="nl-legend__item" key={item.name}>
          <span className={['nl-legend__swatch', item.line && 'is-line'].filter(Boolean).join(' ')} style={{ background: item.colour }} aria-hidden="true" />
          <span className="nl-legend__name">{item.name}</span>
          {item.value !== undefined ? <span className="nl-legend__value">{item.value}</span> : null}
          {item.percent !== undefined ? <span className="nl-legend__percent">{item.percent}</span> : null}
        </li>
      ))}
    </ul>
  );
};

export default Legend;
