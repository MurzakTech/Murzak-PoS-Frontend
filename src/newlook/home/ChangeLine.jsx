import React from 'react';
import Icon from '../components/Icon';

/**
 * A change figure: an arrow and words ("Up 13% on last Tuesday"). Green and red only mean good and bad, and always sit
 * beside an arrow and words, never alone. `goodWhen` says which way is good: more revenue is good, more debt is not.
 */
const ChangeLine = ({ direction, text, goodWhen = 'up' }) => {
  const mood = direction === 'up' || direction === 'down' ? (direction === goodWhen ? 'good' : 'bad') : 'neutral';
  return (
    <p className={`nl-change is-${mood}`}>
      {direction === 'up' || direction === 'down' ? <Icon name={direction === 'up' ? 'arrowUp' : 'arrowDown'} /> : null}
      <span>{text}</span>
    </p>
  );
};

export default ChangeLine;
