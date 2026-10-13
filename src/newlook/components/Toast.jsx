import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import Icon from './Icon';
import S from '../strings';

/**
 * Toast (Part 1, Components and Accessibility rules, "Messages"): a short message at the top centre.
 *
 *   success  a check and the words; says "Saved", "Sale complete, KES 100"
 *   info     an information icon and the words
 *   error    an alert icon and the words; stays until it is closed
 *
 * Success and info are announced politely (role status); an error is announced at once (role alert). A toast
 * stays at least 6 seconds and pauses while the pointer is over it or focus is inside it. It never covers the
 * Till open or Held sales buttons: mark any control a toast must keep clear of with data-toast-keepout and the
 * toasts slide down below it.
 *
 * Wrap the screens in <ToastProvider>; then useToast() gives { success, info, error, dismiss }.
 */
export const TOAST_MS = 6000;
export const KEEPOUT_ATTRIBUTE = 'data-toast-keepout';
const EDGE = 16;
const GAP = 8;

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
};

// The icon of each kind of message (a technical icon name, not a visible word)
const ICONS = new Map([
  ['success', 'check'],
  ['info', 'info'],
  ['error', 'alert'],
]);

const ToastItem = ({ toast, onDismiss, duration }) => {
  const timer = useRef(null);
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const hovered = useRef(false);
  const focused = useRef(false);
  const sticky = toast.kind === 'error';

  const start = useCallback(() => {
    if (sticky || timer.current) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current);
  }, [onDismiss, sticky, toast.id]);
  const pause = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
  };

  // Starts when it appears; the cleanup stops the clock if it is closed first
  React.useEffect(() => {
    start();
    return () => {
      clearTimeout(timer.current);
      timer.current = null;
    };
  }, [start]);

  const resumeIfIdle = () => {
    if (!hovered.current && !focused.current) start();
  };

  return (
    <div
      className={`nl-toast nl-toast--${toast.kind}`}
      onMouseEnter={() => {
        hovered.current = true;
        pause();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        resumeIfIdle();
      }}
      onFocus={() => {
        focused.current = true;
        pause();
      }}
      onBlur={() => {
        focused.current = false;
        resumeIfIdle();
      }}
    >
      <Icon name={ICONS.get(toast.kind)} />
      <p className="nl-toast__message">{toast.message}</p>
      <Button variant="ghost" size="small" icon="x" aria-label={S.components.toast.close} onClick={() => onDismiss(toast.id)} />
    </div>
  );
};

export const ToastProvider = ({ children, duration = TOAST_MS }) => {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const column = useRef(null);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((kind, message) => {
    counter.current += 1;
    const id = counter.current;
    // The same message already on screen is not stacked a second time
    setToasts((all) => (all.some((t) => t.kind === kind && t.message === message) ? all : [...all, { id, kind, message }]));
    return id;
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => show('success', message),
      info: (message) => show('info', message),
      error: (message) => show('error', message),
      dismiss,
    }),
    [show, dismiss]
  );

  // Keep clear of anything marked data-toast-keepout that the toasts would otherwise cover
  useLayoutEffect(() => {
    const el = column.current;
    if (!el) return undefined;
    const keepClear = () => {
      el.style.top = `${EDGE}px`;
      if (toasts.length === 0) return;
      const mine = el.getBoundingClientRect();
      let top = EDGE;
      document.querySelectorAll(`[${KEEPOUT_ATTRIBUTE}]`).forEach((other) => {
        const r = other.getBoundingClientRect();
        const across = r.left < mine.right && r.right > mine.left;
        const down = r.bottom > mine.top && r.top < mine.bottom;
        if (r.width > 0 && across && down) top = Math.max(top, r.bottom + GAP);
      });
      el.style.top = `${top}px`;
    };
    keepClear();
    window.addEventListener('resize', keepClear);
    return () => window.removeEventListener('resize', keepClear);
  }, [toasts]);

  const polite = toasts.filter((t) => t.kind !== 'error');
  const alerts = toasts.filter((t) => t.kind === 'error');

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div ref={column} className="nl-toasts" data-overlay-allow="">
          <div role="alert" aria-atomic="false" className="nl-toasts__list">
            {alerts.map((t) => (
              <ToastItem key={t.id} toast={t} duration={duration} onDismiss={dismiss} />
            ))}
          </div>
          <div role="status" aria-atomic="false" className="nl-toasts__list">
            {polite.map((t) => (
              <ToastItem key={t.id} toast={t} duration={duration} onDismiss={dismiss} />
            ))}
          </div>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
