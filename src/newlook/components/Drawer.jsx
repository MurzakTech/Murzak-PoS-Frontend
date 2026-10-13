import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { useOverlay } from './overlay';
import S from '../strings';

/**
 * The drawer (Part 1, Components): the sidebar on screens narrower than 768px. It opens from a menu button,
 * holds focus while open, and closes with Escape, a tap outside, or its Close button; focus then returns to
 * the menu button.
 *
 *   label         the drawer's name, read aloud ("Main menu")
 *   closeAtWidth  close by itself when the window grows to this width or more. The app shell passes 768, because
 *                 from there the sidebar is shown in place; the component page leaves it out so the drawer can
 *                 be tried on a wide screen.
 */
export const DRAWER_BREAKPOINT = 768;

const Drawer = ({ open, onClose, label, children, closeLabel = S.components.drawer.close, closeAtWidth, className = '' }) => {
  if (!open) return null;
  return (
    <DrawerBox onClose={onClose} label={label} closeLabel={closeLabel} closeAtWidth={closeAtWidth} className={className}>
      {children}
    </DrawerBox>
  );
};

const DrawerBox = ({ onClose, label, closeLabel, closeAtWidth, className, children }) => {
  const panel = useRef(null);
  const base = useId();
  useOverlay({ containerRef: panel, onClose });

  useEffect(() => {
    if (!closeAtWidth || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(`(min-width: ${closeAtWidth}px)`);
    const check = () => query.matches && onClose && onClose();
    check();
    query.addEventListener('change', check);
    return () => query.removeEventListener('change', check);
  }, [onClose, closeAtWidth]);

  return createPortal(
    <div className="nl-overlay nl-overlay--drawer" onClick={(event) => event.target === event.currentTarget && onClose && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${base}-label`} tabIndex={-1} className={`nl-drawer ${className}`.trim()}>
        <div className="nl-drawer__header">
          <span id={`${base}-label`} className="nl-drawer__label">
            {label}
          </span>
          <Button variant="ghost" size="small" icon="x" aria-label={closeLabel} onClick={onClose} />
        </div>
        <div className="nl-drawer__body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Drawer;
