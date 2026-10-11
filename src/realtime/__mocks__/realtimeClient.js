// A stand-in for the live connection in tests: a test decides when the connection is up and when a
// message arrives. (Plain functions, because the test setup resets jest.fn implementations.)
const messages = new Set();
const states = new Set();
let up = false;
let opened = 0;

export const EVENT_NAME = 'murzak_pos_event';
export const CONNECTED_POLL_MS = 15000;

export const subscribeMessages = (handler) => {
  opened += 1;
  messages.add(handler);
  return () => messages.delete(handler);
};
export const subscribeConnection = (handler) => {
  opened += 1;
  states.add(handler);
  return () => states.delete(handler);
};
export const isConnected = () => up;
export const disconnectRealtime = () => {};

// test controls
export const emit = (message) => [...messages].forEach((handler) => handler(message));
export const setConnected = (value) => {
  up = value;
  [...states].forEach((handler) => handler());
};
export const listenerCount = () => messages.size;
export const timesOpened = () => opened;
export const resetRealtime = () => {
  messages.clear();
  states.clear();
  up = false;
  opened = 0;
};
