import React from 'react';

/**
 * Rows as cards, for phones (below 768px, Spec: Responsive table). Each card is one sale or one till session.
 *
 *   items       [{ key, head, aside, lines: [node], foot }]   head is the bold start of the card, aside sits on its right
 *   onOpen(key) makes each card a button that opens the receipt; leave it out for cards that only show facts
 *   selectedKey the open card, marked with aria-current and a bar on its left edge
 */
const CardList = ({ items, label, onOpen, selectedKey }) => (
  <ul className="nl-sales-cards" aria-label={label}>
    {items.map((item) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && String(selectedKey) === String(item.key);
      const content = (
        <>
          <span className="nl-sales-card__top">
            <strong className="nl-sales-card__head">{item.head}</strong>
            {item.aside ? <span className="nl-sales-card__aside">{item.aside}</span> : null}
          </span>
          {item.lines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span className="nl-sales-card__line" key={i}>
              {line}
            </span>
          ))}
          {item.foot ? <span className="nl-sales-card__foot">{item.foot}</span> : null}
        </>
      );
      return (
        <li key={item.key}>
          {onOpen ? (
            <button type="button" className={['nl-sales-card', 'is-button', selected && 'is-selected'].filter(Boolean).join(' ')} data-key={item.key} aria-current={selected ? 'true' : undefined} onClick={() => onOpen(item.key)}>
              {content}
            </button>
          ) : (
            <div className="nl-sales-card" data-key={item.key}>
              {content}
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

export default CardList;
