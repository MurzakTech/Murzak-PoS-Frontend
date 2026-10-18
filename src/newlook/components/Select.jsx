import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import S from '../strings';

/**
 * The one choice box of the redesign (Part 1, Components): a closed 40px box with a chevron that opens a menu
 * of options. Same outline and focus ring as a Field.
 *
 * Keyboard: arrow keys move (Home and End jump), Enter or Space picks, Escape closes and keeps focus on the
 * box, and typing letters jumps to the first option that starts with them. A click outside closes it.
 *
 * options: [{ value, label, disabled? }]. onChange(value) is called with the chosen option's value.
 */
const TYPE_AHEAD_RESET_MS = 700;

const Select = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = S.components.select.placeholder,
  helper,
  error,
  disabled = false,
  id,
  className = '',
  size = 'default', // 'small' is 32px, for toolbars such as the rows-per-page choice
  inline = false, // the label sits beside the box instead of above it
  forceState, // 'hover' | 'focus' | 'open': used only by the component page to show a state at rest
}) => {
  const autoId = useId();
  const baseId = id || `nl-select-${autoId}`;
  const listId = `${baseId}-list`;
  const noteId = `${baseId}-note`;
  const labelId = `${baseId}-label`;

  const [open, setOpen] = useState(forceState === 'open');
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const button = useRef(null);
  const buffer = useRef({ text: '', timer: null });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const enabled = (i) => options[i] && !options[i].disabled;

  const step = (from, direction) => {
    let i = from;
    for (let n = 0; n < options.length; n += 1) {
      i += direction;
      if (i < 0 || i >= options.length) return from;
      if (enabled(i)) return i;
    }
    return from;
  };
  const firstEnabled = () => options.findIndex((_, i) => enabled(i));
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i -= 1) if (enabled(i)) return i;
    return -1;
  };

  const openMenu = (index) => {
    if (disabled) return;
    setOpen(true);
    setActive(index !== undefined ? index : selectedIndex >= 0 ? selectedIndex : firstEnabled());
  };
  const closeMenu = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = (index) => {
    if (!enabled(index)) return;
    if (onChange) onChange(options[index].value);
    closeMenu();
    if (button.current) button.current.focus();
  };

  // Close when the person clicks or taps outside
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (root.current && !root.current.contains(event.target)) closeMenu();
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (!open || active < 0) return;
    const el = document.getElementById(`${baseId}-opt-${active}`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [open, active, baseId]);

  const typeAhead = (char) => {
    const b = buffer.current;
    clearTimeout(b.timer);
    b.text += char.toLowerCase();
    b.timer = setTimeout(() => {
      b.text = '';
    }, TYPE_AHEAD_RESET_MS);
    const from = b.text.length === 1 && active >= 0 ? active + 1 : 0;
    const order = [...options.keys()];
    const rotated = [...order.slice(from), ...order.slice(0, from)];
    const hit = rotated.find((i) => enabled(i) && String(options[i].label).toLowerCase().startsWith(b.text));
    if (hit !== undefined) {
      if (!open) setOpen(true);
      setActive(hit);
    }
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    const { key } = event;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault();
        openMenu();
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typeAhead(key);
      }
      return;
    }
    if (key === 'ArrowDown') {
      event.preventDefault();
      setActive((a) => (a < 0 ? firstEnabled() : step(a, 1)));
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => (a < 0 ? lastEnabled() : step(a, -1)));
    } else if (key === 'Home') {
      event.preventDefault();
      setActive(firstEnabled());
    } else if (key === 'End') {
      event.preventDefault();
      setActive(lastEnabled());
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (active >= 0) pick(active);
    } else if (key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (key === 'Tab') {
      closeMenu();
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeAhead(key);
    }
  };

  const note = error || helper;
  const classes = ['nl-field', 'nl-select', size === 'small' && 'nl-select--small', inline && 'nl-select--inline', error && 'is-error', disabled && 'is-disabled', forceState === 'hover' && 'is-hover', className].filter(Boolean).join(' ');

  return (
    <div className={classes} ref={root}>
      <span id={labelId} className="nl-label" onClick={() => button.current && button.current.focus()}>
        {label}
      </span>
      <button
        ref={button}
        id={baseId}
        type="button"
        role="combobox"
        className={['nl-select__button', forceState === 'focus' && 'is-focus'].filter(Boolean).join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${baseId}`}
        aria-activedescendant={open && active >= 0 ? `${baseId}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={['nl-select__value', !selected && 'is-placeholder'].filter(Boolean).join(' ')}>{selected ? selected.label : placeholder}</span>
        <Icon name="chevronDown" />
      </button>

      {open ? (
        <ul id={listId} role="listbox" aria-labelledby={labelId} className="nl-select__menu">
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${baseId}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={['nl-select__option', i === active && 'is-active'].filter(Boolean).join(' ')}
              onMouseEnter={() => enabled(i) && setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
            >
              <span>{o.label}</span>
              {o.value === value ? <Icon name="check" /> : null}
            </li>
          ))}
        </ul>
      ) : null}

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

export default Select;
