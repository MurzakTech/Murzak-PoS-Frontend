import { useEffect, useRef } from 'react';

/**
 * What every overlay (Dialog, Drawer) needs, written once (Part 1, Accessibility rules: "Focus moves into the
 * dialog and returns to the button that opened it. Escape closes. Focus is trapped inside while open."):
 *
 *   - focus moves in: to the element marked data-autofocus, else the first control, else the box itself;
 *   - Tab and Shift+Tab stay inside, and focus that strays outside is pulled back;
 *   - Escape closes, but only the overlay on top (a confirm over a form closes alone);
 *   - focus returns to the button that opened it when the overlay closes;
 *   - the page behind does not scroll.
 *
 * Parts that belong with an overlay but live outside its box (a menu list, a toast) carry data-overlay-allow
 * so focus may go to them.
 */
const stack = [];
let scrollLocks = 0;
let savedOverflow = '';

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export const focusableIn = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');

const lockScroll = () => {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
};
const unlockScroll = () => {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
};

export const useOverlay = ({ containerRef, onClose, closeOnEscape = true }) => {
  const closeRef = useRef(onClose);
  const escapeRef = useRef(closeOnEscape);
  closeRef.current = onClose;
  escapeRef.current = closeOnEscape;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const token = {};
    stack.push(token);
    const opener = document.activeElement;
    lockScroll();

    const first = root.querySelector('[data-autofocus]') || focusableIn(root)[0] || root;
    first.focus();

    const onKeyDown = (event) => {
      if (stack[stack.length - 1] !== token || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        if (escapeRef.current && closeRef.current) {
          event.preventDefault();
          closeRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableIn(root);
      if (items.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && (active === firstItem || active === root)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    const onFocusIn = (event) => {
      if (stack[stack.length - 1] !== token) return;
      const target = event.target;
      if (root.contains(target) || (target.closest && target.closest('[data-overlay-allow]'))) return;
      const items = focusableIn(root);
      (items[0] || root).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      const at = stack.indexOf(token);
      if (at >= 0) stack.splice(at, 1);
      unlockScroll();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
    // The box is mounted only while the overlay is open, so this runs once per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
