import React from 'react';
import { Button } from '../components';
import T from './strings.pay';

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '.'];

/**
 * The number pad of the pay screen: twelve keys, Backspace and Clear, each at least 44px high (the till size, from the
 * tokens). It only reports the key pressed: onKey('7'), onKey('00'), onKey('.'), onKey('back'), onKey('clear').
 * The keys are marked data-pad so the screen can tell a pad key from any other button when Enter is pressed.
 */
const NumberPad = ({ onKey }) => (
  <div className="nlp-pad" role="group" aria-label={T.pad.group}>
    {KEYS.map((k) => (
      <Button key={k} variant="secondary" size="till" className="nlp-key" data-pad="" aria-label={k === '.' ? T.pad.point : undefined} onClick={() => onKey(k)}>
        {k}
      </Button>
    ))}
    <Button variant="secondary" size="till" className="nlp-key nlp-key--back" data-pad="" icon="chevronLeft" aria-label={T.pad.backspace} onClick={() => onKey('back')} />
    <Button variant="secondary" size="till" className="nlp-key nlp-key--clear" data-pad="" onClick={() => onKey('clear')}>
      {T.pad.clear}
    </Button>
  </div>
);

export default NumberPad;
