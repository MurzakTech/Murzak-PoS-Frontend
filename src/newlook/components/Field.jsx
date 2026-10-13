import React, { useId, useState, useEffect } from 'react';
import Icon from './Icon';
import { formatDate, maskDate, parseDate } from './dates';

/**
 * The one text field of the redesign (Part 1, Components): a label above, a 40px input, a helper caption, and
 * error text with an icon. States: default, hover and focus (the focus ring), error, disabled, read-only.
 *
 *   kind="text" (default)   any text; onChange(value)
 *   kind="money"            shows KES in front and takes digits only; onChange(digits)
 *   kind="date"             shows and asks for dd/mm/yyyy (day first); onChange(isoDate) with "" while the
 *                           typed date is not a real one. The value passed in is an ISO date (yyyy-mm-dd).
 *
 * Every field has a visible label (not only a placeholder). The helper and the error are tied to the input
 * with aria-describedby, and an error also marks the input invalid. When there is an error it replaces the helper.
 */
const Field = ({
  label,
  helper,
  error,
  kind = 'text',
  value = '',
  onChange,
  disabled = false,
  readOnly = false,
  icon, // an icon shown inside the box before the text, such as "search"
  id,
  className = '',
  forceState, // 'hover' | 'focus': used only by the component page to show a state at rest
  ...rest
}) => {
  const autoId = useId();
  const inputId = id || `nl-field-${autoId}`;
  const noteId = `${inputId}-note`;

  // A date field keeps what the person is typing, and tells the screen only when it is a real date
  const [typed, setTyped] = useState(kind === 'date' ? formatDate(value) : '');
  useEffect(() => {
    if (kind === 'date' && parseDate(typed) !== value) setTyped(formatDate(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, kind]);

  const handle = (event) => {
    const raw = event.target.value;
    if (!onChange) return;
    if (kind === 'money') {
      onChange(raw.replace(/\D/g, ''));
    } else if (kind === 'date') {
      const masked = maskDate(raw);
      setTyped(masked);
      onChange(parseDate(masked));
    } else {
      onChange(raw);
    }
  };

  const shown = kind === 'date' ? typed : value;
  const inputProps =
    kind === 'money'
      ? { inputMode: 'numeric', autoComplete: 'off' }
      : kind === 'date'
      ? { inputMode: 'numeric', autoComplete: 'off', placeholder: 'dd/mm/yyyy', maxLength: 10 }
      : {};

  const classes = ['nl-field', error && 'is-error', disabled && 'is-disabled', readOnly && 'is-readonly', forceState === 'hover' && 'is-hover', className].filter(Boolean).join(' ');
  const wrapClasses = ['nl-input-wrap', forceState === 'focus' && 'is-focus'].filter(Boolean).join(' ');
  const note = error || helper;

  return (
    <div className={classes}>
      <label className="nl-label" htmlFor={inputId}>
        {label}
      </label>
      <div className={wrapClasses}>
        {icon ? (
          <span className="nl-input-icon">
            <Icon name={icon} />
          </span>
        ) : null}
        {kind === 'money' ? <span className="nl-affix">KES</span> : null}
        <input
          id={inputId}
          className="nl-input"
          type="text"
          value={shown}
          onChange={handle}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          {...inputProps}
          {...rest}
        />
      </div>
      {error ? (
        <p id={noteId} className="nl-error">
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={noteId} className="nl-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
};

export default Field;
