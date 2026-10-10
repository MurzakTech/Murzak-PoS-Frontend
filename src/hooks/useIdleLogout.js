import { useCallback, useEffect, useState } from 'react';

/**
 * Signs a person out after a stretch with no keyboard, mouse or touch activity,
 * so an unattended till cannot be used under their name. A warning appears one
 * minute before. The time of the last activity is shared between browser tabs,
 * so working in one tab keeps the others signed in.
 */

export const IDLE_MINUTES = 30;
export const WARNING_SECONDS = 60;
export const LAST_ACTIVITY_KEY = 'last_activity_at';

const IDLE_MS = IDLE_MINUTES * 60 * 1000;
const WARNING_MS = WARNING_SECONDS * 1000;
const CHECK_EVERY_MS = 5 * 1000;
// Writing to storage on every mouse move is wasteful; once every few seconds is enough.
const RECORD_EVERY_MS = 5 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];

/** 'active', 'warning' (with seconds left) or 'expired', for a last-activity time. */
export const idleState = (lastActivity, now) => {
  const idleFor = now - (Number(lastActivity) || now);
  if (idleFor >= IDLE_MS) return { status: 'expired', secondsLeft: 0 };
  if (idleFor >= IDLE_MS - WARNING_MS) {
    return { status: 'warning', secondsLeft: Math.ceil((IDLE_MS - idleFor) / 1000) };
  }
  return { status: 'active', secondsLeft: null };
};

const readLastActivity = () => {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || null;
  } catch {
    return null;
  }
};

const writeLastActivity = (at) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // Storage can be unavailable (private mode); the timer still works in this tab.
  }
};

export default function useIdleLogout({ enabled, onExpire }) {
  const [state, setState] = useState({ status: 'active', secondsLeft: null });

  const stayActive = useCallback(() => {
    writeLastActivity(Date.now());
    setState({ status: 'active', secondsLeft: null });
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    // A device that was asleep past the limit signs out straight away; otherwise start fresh.
    const stored = readLastActivity();
    if (!stored || idleState(stored, Date.now()).status !== 'expired') writeLastActivity(Date.now());

    let lastRecorded = 0;
    const onActivity = () => {
      const now = Date.now();
      // While the warning is showing, only the "Stay signed in" button counts.
      if (idleState(readLastActivity(), now).status === 'warning') return;
      if (now - lastRecorded >= RECORD_EVERY_MS) {
        lastRecorded = now;
        writeLastActivity(now);
      }
    };

    const check = () => {
      const next = idleState(readLastActivity(), Date.now());
      setState((prev) => (prev.status === next.status && prev.secondsLeft === next.secondsLeft ? prev : next));
      if (next.status === 'expired') onExpire();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = setInterval(check, CHECK_EVERY_MS);
    // While the warning shows, update the countdown every second.
    const fast = setInterval(() => {
      if (idleState(readLastActivity(), Date.now()).status !== 'active') check();
    }, 1000);
    check();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(timer);
      clearInterval(fast);
    };
  }, [enabled, onExpire]);

  return { ...state, stayActive };
}
