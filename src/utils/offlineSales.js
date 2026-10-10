/**
 * Selling while offline: cash sales are kept on this device and uploaded when the
 * connection returns.
 *
 * Rules agreed with the business:
 * - Cash only. M-Pesa, cards and "pay later" need the server to confirm them.
 * - At most 200 sales, and none older than 24 hours, may wait on the device; after
 *   that the till asks for a connection before selling more.
 * - A sale the server refuses on upload (for example the stock ran out) is kept and
 *   flagged for a manager instead of being lost or blocking the cashier.
 *
 * Each sale keeps the till's own id (client_reference). The server records a sale
 * with a given id only once, so uploading the same sale twice is harmless.
 * The queue is deliberately NOT cleared on sign-out: these are real sales.
 */
import { MESSAGES } from './friendlyError';

export const QUEUE_KEY = 'pos_offline_sales';
export const MAX_QUEUED_SALES = 200;
export const MAX_QUEUE_AGE_HOURS = 24;
export const QUEUE_CHANGED_EVENT = 'murzak:offline-sales-changed';

export const STATUS = {
  PENDING: 'pending', // waiting for a connection
  NEEDS_ATTENTION: 'needs_attention', // the server refused it; a manager must look
};

const HOUR_MS = 60 * 60 * 1000;

const readStorage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadQueue = () => readStorage();

export const saveQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  try {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
  } catch {
    // no window (tests)
  }
};

/** Local time as "YYYY-MM-DD HH:MM:SS", the way the server expects the sale time. */
export const localTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** Messages our request layer gives when the server could not be reached at all. */
export const isConnectionProblem = (message) =>
  [MESSAGES.offline, MESSAGES.network, MESSAGES.timeout].includes(message)
  || (typeof navigator !== 'undefined' && navigator.onLine === false);

/**
 * Why this sale cannot be kept offline, or null when it can.
 * `sale` is { paymentLines, loyaltyPoints, creditUsed }.
 */
export const offlineBlocker = (sale) => {
  const lines = (sale.paymentLines || []).filter((p) => Number(p.amount) > 0);
  if (lines.some((p) => p.mode !== 'Cash')) {
    return 'Only cash sales can be made while offline. M-Pesa, card and pay-later need a connection.';
  }
  if (sale.loyaltyPoints > 0) return 'Loyalty points cannot be redeemed while offline.';
  return null;
};

/** Whether another sale may be queued, given the queue and the time now. */
export const queueRoom = (queue, now = Date.now()) => {
  const waiting = queue.filter((s) => s.status === STATUS.PENDING || s.status === STATUS.NEEDS_ATTENTION);
  if (waiting.length >= MAX_QUEUED_SALES) {
    return { ok: false, reason: `${MAX_QUEUED_SALES} sales are already waiting to upload. Connect to the internet before selling more.` };
  }
  const oldest = waiting.reduce((min, s) => Math.min(min, s.queuedAt), Infinity);
  if (oldest !== Infinity && now - oldest > MAX_QUEUE_AGE_HOURS * HOUR_MS) {
    return { ok: false, reason: `Sales have been waiting more than ${MAX_QUEUE_AGE_HOURS} hours. Connect to the internet to upload them before selling more.` };
  }
  return { ok: true, reason: null };
};

/** Add a sale; returns the stored entry. */
export const enqueueSale = ({ payload, receipt, company, user }, now = new Date()) => {
  const entry = {
    id: payload.client_reference,
    company,
    user,
    queuedAt: now.getTime(),
    soldAt: localTimestamp(now),
    payload: { ...payload, offline_sold_at: localTimestamp(now) },
    receipt,
    status: STATUS.PENDING,
    attempts: 0,
    error: null,
  };
  const queue = loadQueue().filter((s) => s.id !== entry.id);
  saveQueue([...queue, entry]);
  return entry;
};

export const removeSale = (id) => saveQueue(loadQueue().filter((s) => s.id !== id));

export const retrySale = (id) =>
  saveQueue(loadQueue().map((s) => (s.id === id ? { ...s, status: STATUS.PENDING, error: null } : s)));

/**
 * Upload waiting sales for `company`, oldest first.
 * `send(payload)` resolves to { ok: true, invoice } or { ok: false, connection, message }.
 * Stops at the first connection problem (try again later); a refusal flags that sale
 * and moves on. Returns { uploaded, flagged, stoppedOffline }.
 */
export const syncQueue = async (company, send) => {
  const result = { uploaded: 0, flagged: 0, stoppedOffline: false };
  const pending = loadQueue()
    .filter((s) => s.company === company && s.status === STATUS.PENDING)
    .sort((a, b) => a.queuedAt - b.queuedAt);

  for (const sale of pending) {
    // eslint-disable-next-line no-await-in-loop
    const reply = await send(sale.payload);
    if (reply.ok) {
      removeSale(sale.id);
      result.uploaded += 1;
      continue;
    }
    if (reply.connection) {
      result.stoppedOffline = true;
      break;
    }
    saveQueue(loadQueue().map((s) => (s.id === sale.id
      ? { ...s, status: STATUS.NEEDS_ATTENTION, error: reply.message, attempts: s.attempts + 1 }
      : s)));
    result.flagged += 1;
  }
  return result;
};
