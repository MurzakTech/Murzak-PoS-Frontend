import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';
import { countedList, normalizeClose } from './tillApi';

/**
 * Cash in and out of the till during a shift, and the shift report (shift management, parts 1 and 2).
 *
 *   recordCashMovement   put cash into the drawer, take cash out of it, or move notes to the safe
 *   listCashMovements    what was recorded in a shift, with the total of each kind
 *   getShiftReport       the X report (figures so far, shift still open) or the Z report (shift closed)
 *
 * The server does all the arithmetic and the checks (who may, an amount the drawer holds). The shape is in
 * docs/SHIFTS.md of the back end and is kept in this one file, so a change on the server touches only this file.
 */
const SHIFT = 'murzak_pos.api.shift_api';
const HANDOVER = 'murzak_pos.api.handover_api';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const orNull = (value) => (value === null || value === undefined ? null : number(value));
const list = (value) => (Array.isArray(value) ? value : []);

const movement = (row) => ({ ...row, amount: number(row.amount) });

const normalizeList = (data) => ({
  session: data.session || '',
  movements: list(data.movements).map(movement),
  totals: {
    'Paid In': number(data.totals?.['Paid In']),
    'Paid Out': number(data.totals?.['Paid Out']),
    'Safe Drop': number(data.totals?.['Safe Drop']),
  },
  // the reasons the server offers for each kind: { 'Paid In': [...], ... }
  reasons: data.reasons && typeof data.reasons === 'object' ? data.reasons : {},
});

const normalizeReport = (data) => ({
  ...data,
  sales: {
    count: number(data.sales?.count),
    gross: number(data.sales?.gross),
    net: number(data.sales?.net),
    tax: number(data.sales?.tax),
    discounts: number(data.sales?.discounts),
    average: number(data.sales?.average),
  },
  returns: { count: number(data.returns?.count), total: number(data.returns?.total) },
  credit_sales: number(data.credit_sales),
  by_method: list(data.by_method).map((row) => ({
    ...row,
    sales: number(row.sales),
    refunds: number(row.refunds),
    expected: number(row.expected),
    counted: orNull(row.counted),
    difference: orNull(row.difference),
  })),
  cash: data.cash
    ? {
        ...data.cash,
        opening: number(data.cash.opening),
        sales: number(data.cash.sales),
        paid_in: number(data.cash.paid_in),
        paid_out: number(data.cash.paid_out),
        safe_drops: number(data.cash.safe_drops),
        refunds: number(data.cash.refunds),
        expected: number(data.cash.expected),
        counted: orNull(data.cash.counted),
        difference: orNull(data.cash.difference),
      }
    : null,
  totals: {
    ...data.totals,
    expected: number(data.totals?.expected),
    counted: orNull(data.totals?.counted),
    difference: orNull(data.totals?.difference),
  },
  movements: list(data.movements).map(movement),
  movement_totals: normalizeList({ totals: data.movement_totals }).totals,
});

const run = async (call) => {
  let response;
  try {
    response = await call();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply;
};

/**
 * Record cash. `clientId` is this till's own id for the movement: sending it again after a dropped connection records
 * it once. Answers { movement, duplicate, cash_in_till }. A refusal from the server (for example "more than the till
 * holds") comes back as an Error with the server's words.
 */
export const recordCashMovement = async ({ session, kind, amount, reason, note, clientId }) => {
  const reply = await run(() =>
    axiosInstance.post(
      `${SHIFT}.record_cash_movement`,
      { session, kind, amount: Number(amount), reason, note: note || undefined, client_id: clientId || undefined },
      { allowRefusal: true }
    )
  );
  return {
    movement: movement(reply.data.movement),
    duplicate: reply.data.duplicate === true,
    cash_in_till: orNull(reply.data.cash_in_till),
  };
};

/** What was recorded in a shift: { session, movements, totals, reasons } */
export const listCashMovements = async (session) => {
  const reply = await run(() => axiosInstance.get(`${SHIFT}.list_cash_movements`, { params: { session } }));
  return normalizeList(reply.data);
};

/** The report of a shift: kind 'X' while it is open, 'Z' once it is closed */
export const getShiftReport = async (session) => {
  const reply = await run(() => axiosInstance.get(`${SHIFT}.get_shift_report`, { params: { session } }));
  return normalizeReport(reply.data);
};

/** The colleagues the till can be handed to: [{ user, name }] */
export const listHandoverPeople = async (session) => {
  const reply = await run(() => axiosInstance.get(`${HANDOVER}.list_handover_people`, { params: { session } }));
  return list(reply.data.people).map((p) => ({ user: p.user, name: p.name || p.user }));
};

const handOver = async ({ session, toUser, counted, note }, confirm) => {
  const reply = await run(() =>
    axiosInstance.post(
      `${HANDOVER}.hand_over_till`,
      { session, to_user: toUser, counted: countedList(counted), confirm, note: note || undefined },
      { allowRefusal: true }
    )
  );
  const next = reply.data.next_shift;
  return {
    ...normalizeClose(reply.data),
    handoverTo: reply.data.handover_to || null,
    // null when the old shift is still closing, or the next one could not be opened (then `float` says what to open it with)
    nextShift: next ? { ...next, float: number(next.float) } : null,
    float: reply.data.float === undefined ? null : number(reply.data.float),
    message: reply.message || '',
  };
};

/** The count against what should be there, and who would take over. Nothing is closed. */
export const previewHandover = (args) => handOver(args, false);

/** Closes the shift with the count and opens the next person's shift with the counted cash. Call it only after a yes. */
export const handOverTill = (args) => handOver(args, true);
