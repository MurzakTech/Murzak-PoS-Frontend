import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * The switch of the redesign: 36 by 20px, for a setting that is on or off (Part 1, Components).
 *
 * It takes effect at once and says "Saved". onChange(next) may return a promise (a save): the switch moves
 * straight away, says "Saved" when the save succeeds, and moves back with the reason when it fails. The off
 * state uses the input-border colour so it stays visible. The label is clickable.
 */
const SAVED_MS = 4000;

const Switch = ({ label, checked = false, onChange, disabled = false, id, className = '', forceState, ...rest }) => {
  const autoId = useId();
  const inputId = id || `nl-switch-${autoId}`;
  const [on, setOn] = useState(Boolean(checked));
  const [status, setStatus] = useState(null); // null | 'saved' | { error }
  const timer = useRef(null);

  useEffect(() => setOn(Boolean(checked)), [checked]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flashSaved = () => {
    setStatus('saved');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), SAVED_MS);
  };

  const handle = async (event) => {
    const next = event.target.checked;
    setOn(next);
    setStatus(null);
    if (!onChange) return;
    try {
      await onChange(next);
      flashSaved();
    } catch (e) {
      setOn(!next);
      setStatus({ error: (e && e.message) || 'That did not save. Try again.' });
    }
  };

  const classes = ['nl-switch', disabled && 'is-disabled', forceState === 'hover' && 'is-hover', className].filter(Boolean).join(' ');

  return (
    <span>
      <label className={classes} htmlFor={inputId}>
        <input id={inputId} type="checkbox" role="switch" className="nl-switch__input" checked={on} disabled={disabled} onChange={handle} {...rest} />
        <span className={['nl-switch__track', forceState === 'focus' && 'is-focus'].filter(Boolean).join(' ')} aria-hidden="true" />
        <span>{label}</span>
      </label>
      <span className={['nl-switch__status', status && status.error && 'is-error'].filter(Boolean).join(' ')} role="status" aria-live="polite">
        {status === 'saved' ? 'Saved' : status && status.error ? status.error : ''}
      </span>
    </span>
  );
};

export default Switch;
