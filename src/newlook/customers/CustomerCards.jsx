import React from 'react';

/**
 * Customers as cards, for phones (below 768px, Spec: Responsive table). Each card is one customer and opens the panel.
 *
 *   items       [{ key, head, aside, lines: [node], foot }]   head is the bold start of the card, aside sits on its right
 *   onOpen(key) makes each card a button that opens the customer
 *   selectedKey the open card, marked with aria-current and a bar on its left edge
 */
const CustomerCards = ({ items, label, onOpen, selectedKey }) => (
  <ul className="nl-customer-cards" aria-label={label}>
    {items.map((item) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && String(selectedKey) === String(item.key);
      return (
        <li key={item.key}>
          <button type="button" className={['nl-customer-card', selected && 'is-selected'].filter(Boolean).join(' ')} data-key={item.key} aria-current={selected ? 'true' : undefined} onClick={() => onOpen(item.key)}>
            <span className="nl-customer-card__top">
              <strong className="nl-customer-card__head">{item.head}</strong>
              {item.aside ? <span className="nl-customer-card__aside">{item.aside}</span> : null}
            </span>
            {item.lines.map((line, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span className="nl-customer-card__line" key={i}>
                {line}
              </span>
            ))}
            {item.foot ? <span className="nl-customer-card__foot">{item.foot}</span> : null}
          </button>
        </li>
      );
    })}
  </ul>
);

export default CustomerCards;
