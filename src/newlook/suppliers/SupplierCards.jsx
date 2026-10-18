import React from 'react';

/**
 * Suppliers as cards, for phones (below 768px, Spec: Responsive table). Each card is one supplier and opens the panel.
 *
 *   items       [{ key, head, aside, lines: [node], foot }]   head is the bold start of the card, aside sits on its right
 *   onOpen(key) makes each card a button that opens the supplier
 *   selectedKey the open card, marked with aria-current and a bar on its left edge
 */
const SupplierCards = ({ items, label, onOpen, selectedKey }) => (
  <ul className="nl-supplier-cards" aria-label={label}>
    {items.map((item) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && String(selectedKey) === String(item.key);
      return (
        <li key={item.key}>
          <button type="button" className={['nl-supplier-card', selected && 'is-selected'].filter(Boolean).join(' ')} data-key={item.key} aria-current={selected ? 'true' : undefined} onClick={() => onOpen(item.key)}>
            <span className="nl-supplier-card__top">
              <strong className="nl-supplier-card__head">{item.head}</strong>
              {item.aside ? <span className="nl-supplier-card__aside">{item.aside}</span> : null}
            </span>
            {item.lines.map((line, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span className="nl-supplier-card__line" key={i}>
                {line}
              </span>
            ))}
            {item.foot ? <span className="nl-supplier-card__foot">{item.foot}</span> : null}
          </button>
        </li>
      );
    })}
  </ul>
);

export default SupplierCards;
