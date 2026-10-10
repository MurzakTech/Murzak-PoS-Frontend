import { useCallback, useEffect, useState } from 'react';

// Minutes without a tap, click or key press before a till signs itself out.
// Set REACT_APP_IDLE_TIMEOUT_MINUTES=0 at build time to turn it off.
const configured = Number(process.env.REACT_APP_IDLE_TIMEOUT_MINUTES);
export const IDLE_TIMEOUT_MS = (Number.isFinite(configured) && configured >= 0 ? configured : 15) * 60 * 1000;
export const WARNING_MS = 60 * 1000;

// Shared between tabs, so a quiet tab does not sign out someone busy in another
export const LAST_ACTIVITY_KEY = 'lastActivity';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
const CHECK_EVERY_MS = 5 * 1000;
const WRITE_EVERY_MS = 10 * 1000;

const readLastActivity = () => {
  const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : Date.now();
};

const recordActivity = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

/**
 * Watches for activity while someone is signed in. A minute before the limit
 * it reports secondsLeft so the screen can warn; at the limit it calls onTimeout.
 */
const useIdleSignOut = ({ enabled, onTimeout }) => {
  const [secondsLeft, setSecondsLeft] = useState(null);

  const stayActive = useCallback(() => {
    recordActivity();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled || IDLE_TIMEOUT_MS === 0) {
      setSecondsLeft(null);
      return undefined;
    }

    recordActivity();
    let lastWrite = Date.now();
    const onActivity = () => {
      if (Date.now() - lastWrite >= WRITE_EVERY_MS) {
        lastWrite = Date.now();
        recordActivity();
      }
    };

    const check = () => {
      const remaining = readLastActivity() + IDLE_TIMEOUT_MS - Date.now();
      if (remaining <= 0) {
        onTimeout();
      } else if (remaining <= WARNING_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setSecondsLeft(null);
      }
    };

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      clearInterval(timer);
    };
  }, [enabled, onTimeout]);

  return { secondsLeft, stayActive };
};

export default useIdleSignOut;
