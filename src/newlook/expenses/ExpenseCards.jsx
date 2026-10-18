import React from 'react';

/**
 * Expenses as cards, for phones (below 768px, Spec: Responsive table). Each card is one expense and opens the panel.
 *
 *   items       [{ key, head, aside, lines: [node], foot }]   head is the bold start of the card, aside sits on its right
 *   onOpen(key) makes each card a button that opens the expense
 *   selectedKey the open card, marked with aria-current and a bar on its left edge
 */
const ExpenseCards = ({ items, label, onOpen, selectedKey }) => (
  <ul className="nl-expense-cards" aria-label={label}>
    {items.map((item) => {
      const selected = selectedKey !== undefined && selectedKey !== '' && String(selectedKey) === String(item.key);
      return (
        <li key={item.key}>
          <button type="button" className={['nl-expense-card', selected && 'is-selected'].filter(Boolean).join(' ')} data-key={item.key} aria-current={selected ? 'true' : undefined} onClick={() => onOpen(item.key)}>
            <span className="nl-expense-card__top">
              <strong className="nl-expense-card__head">{item.head}</strong>
              {item.aside ? <span className="nl-expense-card__aside">{item.aside}</span> : null}
            </span>
            {item.lines.map((line, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span className="nl-expense-card__line" key={i}>
                {line}
              </span>
            ))}
            {item.foot ? <span className="nl-expense-card__foot">{item.foot}</span> : null}
          </button>
        </li>
      );
    })}
  </ul>
);

export default ExpenseCards;
