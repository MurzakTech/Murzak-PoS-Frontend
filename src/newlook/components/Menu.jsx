import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import Icon from './Icon';

/**
 * Menu (Part 1, Components): a list of actions opened from a button, such as a row's three dots or "+ New".
 *
 *   label    the button's name for screen readers ("More actions for sale 0134"); needed when the button has no words
 *   children the button's visible words, if any ("New"); without them the button is the three dots
 *   items    [{ label, onClick, icon?, destructive?, disabled? }]
 *
 * Keyboard: Enter, Space or the Down arrow opens it and focuses the first action (the Up arrow, the last); the
 * arrow keys move, Home and End jump, typing a letter jumps to a match, Escape closes and puts focus back on the
 * button, Tab closes. A destructive action always comes last, after a divider, and is red.
 *
 * The list is drawn above everything else, so a table or a card never clips it, and it flips upward when there
 * is no room below.
 */
const GAP = 4;
const EDGE = 8;
const TYPE_AHEAD_RESET_MS = 700;

const Menu = ({ label, items, children, icon, variant = 'ghost', size = 'small', align = 'end', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const itemRefs = useRef([]);
  const buffer = useRef({ text: '', timer: null });
  const pendingFocus = useRef(null);
  const base = useId();

  // Actions in the order given, the destructive ones last
  const ordered = [...items.filter((i) => !i.destructive), ...items.filter((i) => i.destructive)];
  const firstDestructive = ordered.findIndex((i) => i.destructive);
  const enabled = (i) => ordered[i] && !ordered[i].disabled;

  const focusItem = (index) => {
    const el = itemRefs.current[index];
    if (el) el.focus();
  };
  const move = (from, direction) => {
    for (let n = 1; n <= ordered.length; n += 1) {
      const i = (from + direction * n + ordered.length * n) % ordered.length;
      if (enabled(i)) return i;
    }
    return from;
  };
  const edge = (last) => {
    const list = ordered.map((_, i) => i).filter(enabled);
    return list.length ? list[last ? list.length - 1 : 0] : 0;
  };

  const openMenu = (focus = 'first') => {
    setPosition(null);
    pendingFocus.current = focus; // focus moves in once the list is in place
    setOpen(true);
  };
  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus && trigger.current) trigger.current.focus();
  }, []);

  const place = useCallback(() => {
    const t = trigger.current;
    const p = popup.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
    let top = r.bottom + GAP;
    if (top + h > vh - EDGE && r.top - h - GAP >= EDGE) top = r.top - h - GAP;
    setPosition({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (open && position && pendingFocus.current) {
      focusItem(pendingFocus.current === 'last' ? edge(true) : edge(false));
      pendingFocus.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      const t = event.target;
      if ((trigger.current && trigger.current.contains(t)) || (popup.current && popup.current.contains(t))) return;
      close(false);
    };
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, close, place]);

  useEffect(() => () => clearTimeout(buffer.current.timer), []);

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu('last');
    }
  };

  const activeIndex = () => itemRefs.current.findIndex((el) => el === document.activeElement);

  const typeAhead = (char) => {
    const b = buffer.current;
    clearTimeout(b.timer);
    b.text += char.toLowerCase();
    b.timer = setTimeout(() => {
      b.text = '';
    }, TYPE_AHEAD_RESET_MS);
    const start = b.text.length === 1 ? activeIndex() + 1 : 0;
    const order = ordered.map((_, i) => i);
    const hit = [...order.slice(start), ...order.slice(0, start)].find((i) => enabled(i) && ordered[i].label.toLowerCase().startsWith(b.text));
    if (hit !== undefined) focusItem(hit);
  };

  const onPopupKeyDown = (event) => {
    const at = activeIndex();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(move(at < 0 ? -1 : at, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(move(at < 0 ? 0 : at, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(edge(false));
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(edge(true));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(true); // focus returns to the button and the Tab key carries on from there
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
      typeAhead(event.key);
    }
  };

  const choose = (item) => {
    if (item.disabled) return;
    close(true);
    if (item.onClick) item.onClick();
  };

  const iconOnly = !children;
  return (
    <>
      <Button
        ref={trigger}
        variant={variant}
        size={size}
        icon={icon || (iconOnly ? 'more' : undefined)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${base}-menu` : undefined}
        className={className}
        onClick={() => (open ? close(true) : openMenu('first'))}
        onKeyDown={onTriggerKeyDown}
      >
        {children}
      </Button>
      {open
        ? createPortal(
            <div
              ref={popup}
              id={`${base}-menu`}
              role="menu"
              aria-label={label}
              data-overlay-allow=""
              className="nl-menu"
              style={position ? { top: position.top, left: position.left } : { visibility: 'hidden', top: 0, left: 0 }}
              onKeyDown={onPopupKeyDown}
            >
              {ordered.map((item, i) => (
                <React.Fragment key={item.label}>
                  {i === firstDestructive && i > 0 ? <div role="separator" className="nl-menu__divider" /> : null}
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.disabled}
                    className={['nl-menu__item', item.destructive && 'is-destructive'].filter(Boolean).join(' ')}
                    onClick={() => choose(item)}
                  >
                    {item.icon ? <Icon name={item.icon} /> : null}
                    <span>{item.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default Menu;
