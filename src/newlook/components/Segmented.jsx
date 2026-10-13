import React, { useRef } from 'react';

/**
 * The segmented control (Part 1, Components): a short exclusive choice such as Today, 7 days, 30 days.
 * The selected segment uses the soft fill and brand-text at 600 weight; the arrow keys move between segments
 * (and choose the one they land on, as radio buttons do). Home and End jump to the first and last.
 *
 *   options  [{ value, label }]
 *   label    what the choice is, read aloud with the group ("Period")
 */
const Segmented = ({ label, options, value, onChange, size = 'default', className = '' }) => {
  const refs = useRef([]);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const go = (index) => {
    const i = (index + options.length) % options.length;
    onChange(options[i].value);
    if (refs.current[i]) refs.current[i].focus();
  };

  const onKeyDown = (event, index) => {
    const moves = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      go(moves[event.key]);
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={['nl-segmented', size === 'small' && 'nl-segmented--small', className].filter(Boolean).join(' ')}>
      {options.map((option, i) => {
        const on = i === selected;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={['nl-segmented__item', on && 'is-selected'].filter(Boolean).join(' ')}
            data-label={option.label}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, i)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default Segmented;
