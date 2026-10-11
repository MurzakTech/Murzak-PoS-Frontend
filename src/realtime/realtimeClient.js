import { io } from 'socket.io-client';

/**
 * The live "something changed" messages from the server (see docs/REALTIME_EVENTS.md).
 *
 * The server only says that a payment or a kitchen ticket changed; a screen then reads the facts the
 * usual way. So a missed message costs a delay, never a wrong total, and every screen keeps polling as
 * its safety net: slowly while this connection is up, at its normal pace while it is down.
 *
 * One connection is shared by the whole app. It opens when the first screen asks for it and closes a
 * few seconds after the last one leaves, and always when the person signs out.
 */
export const EVENT_NAME = 'murzak_pos_event';

// How often a screen still polls while the live connection is up (its normal pace is used while it is down)
export const CONNECTED_POLL_MS = 15000;

// A screen that closes and another that opens straight after share one connection
const RELEASE_DELAY_MS = 5000;

let socket = null;
let openedWith = null; // the sign-in token the connection was made with
let connected = false;
let users = 0;
let closeTimer = null;
const messageHandlers = new Set();
const stateHandlers = new Set();

const storedToken = () => {
  try {
    return localStorage.getItem('access_token');
  } catch (e) {
    return null;
  }
};

const setConnected = (next) => {
  if (next === connected) return;
  connected = next;
  stateHandlers.forEach((handler) => handler());
};

const close = () => {
  if (socket) {
    const old = socket;
    socket = null;
    old.disconnect();
  }
  openedWith = null;
  setConnected(false);
};

const open = (token) => {
  // A browser cannot put an Authorization header on a WebSocket, but the polling transport can, and the
  // server checks the sign-in only when the connection starts. So start with polling and let it upgrade.
  const headers = { Authorization: `Bearer ${token}` };
  const mine = io(window.location.origin, {
    transports: ['polling', 'websocket'],
    transportOptions: { polling: { extraHeaders: headers } },
    reconnectionDelayMax: 30000,
  });
  socket = mine;
  openedWith = token;

  mine.on('connect', () => { if (socket === mine) setConnected(true); });
  mine.on('disconnect', () => { if (socket === mine) setConnected(false); });
  mine.on('connect_error', () => { if (socket === mine) setConnected(false); });
  // Each automatic retry signs in again: use the newest token, or give up if the person has signed out
  mine.io.on('reconnect_attempt', () => {
    if (socket !== mine) return;
    const latest = storedToken();
    if (!latest) {
      close();
      return;
    }
    headers.Authorization = `Bearer ${latest}`;
    openedWith = latest;
  });
  mine.on(EVENT_NAME, (message) => {
    if (socket !== mine || !message || typeof message !== 'object') return;
    messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        // one screen's trouble must not stop the others hearing the message
      }
    });
  });
};

const ensureOpen = () => {
  if (typeof window === 'undefined') return;
  const token = storedToken();
  if (!token) {
    close();
    return;
  }
  // Someone else signed in on this till: the old connection belongs to the previous person
  if (socket && openedWith !== token) close();
  // The server refused the sign-in and the connection gave up: try afresh now that a screen asks
  if (socket && !socket.connected && !socket.active) close();
  if (!socket) open(token);
};

const retain = () => {
  users += 1;
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  ensureOpen();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    users -= 1;
    if (users === 0) {
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (users === 0) close();
      }, RELEASE_DELAY_MS);
    }
  };
};

const subscribeTo = (set, handler) => {
  set.add(handler);
  const release = retain();
  return () => {
    set.delete(handler);
    release();
  };
};

/** Calls handler(message) for every message the server sends. Returns the function that stops it. */
export const subscribeMessages = (handler) => subscribeTo(messageHandlers, handler);

/** Calls handler() whenever the connection goes up or down. Returns the function that stops it. */
export const subscribeConnection = (handler) => subscribeTo(stateHandlers, handler);

export const isConnected = () => connected;

/** Ends the connection at once (when the person signs out). */
export const disconnectRealtime = () => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  close();
};
