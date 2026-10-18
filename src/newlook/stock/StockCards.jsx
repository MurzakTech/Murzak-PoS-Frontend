import React from 'react';

/**
 * Rows as cards, for phones (below 768px, Spec: Responsive table). Each card is one product, movement or expiring line.
 *
 *   items  [{ key, head, aside, lines: [node], foot }]   head is the bold start of the card, aside sits on its right
 *   label  what the list is, read aloud
 */
const StockCards = ({ items, label }) => (
  <ul className="nl-stock-cards" aria-label={label}>
    {items.map((item) => (
      <li key={item.key}>
        <div className="nl-stock-card" data-key={item.key}>
          <span className="nl-stock-card__top">
            <strong className="nl-stock-card__head">{item.head}</strong>
            {item.aside ? <span className="nl-stock-card__aside">{item.aside}</span> : null}
          </span>
          {item.lines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span className="nl-stock-card__line" key={i}>
              {line}
            </span>
          ))}
          {item.foot ? <span className="nl-stock-card__foot">{item.foot}</span> : null}
        </div>
      </li>
    ))}
  </ul>
);

export default StockCards;
