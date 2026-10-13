import React, { useId } from 'react';
import Icon from './Icon';

/**
 * The checkbox of the redesign: an 18px box for ticking items (Part 1, Components, "Switch and checkbox").
 * The label is part of the control, so clicking the words ticks the box. The unticked border uses the
 * input-border colour so it stays visible. States: unticked, ticked, focus ring, disabled, error.
 */
const Checkbox = ({ label, checked, defaultChecked, onChange, disabled = false, error, id, className = '', forceState, ...rest }) => {
  const autoId = useId();
  const inputId = id || `nl-check-${autoId}`;
  const classes = ['nl-check', disabled && 'is-disabled', error && 'is-error', forceState === 'hover' && 'is-hover', className].filter(Boolean).join(' ');

  return (
    <label className={classes} htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        className="nl-check__input"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange && onChange(event.target.checked, event)}
        {...rest}
      />
      <span className={['nl-check__box', forceState === 'focus' && 'is-focus'].filter(Boolean).join(' ')} aria-hidden="true">
        <Icon name="check" />
      </span>
      <span className="nl-check__label">{label}</span>
    </label>
  );
};

export default Checkbox;
