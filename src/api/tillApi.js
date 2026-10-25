import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The till panel and the shift-end count (ticket P3-6).
 *
 *   getTillState   the open session, what the drawer should hold by payment method, the held-sales count and the
 *                  last sales of the session (for the Till open panel and the count step)
 *   previewClose   the server works out expected, counted and the difference for a count; nothing is closed
 *   closeTill      the same call with confirm: true; this is the only call that closes the session
 *
 * The server does all the arithmetic. The exact shape is in docs/redesign/P3-6-contract.md of the back end; the
 * shape is kept in this one file, so a change on the server touches only this file.
 */
const TILL = 'murzak_pos.api.till_api';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));

const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const list = (value) => (Array.isArray(value) ? value : []);

/** The counted amounts as the server wants them: [{ mode, amount }], one per payment method that was counted */
export const countedList = (counted) =>
  list(counted)
    .filter((c) => c && c.mode && c.amount !== '' && c.amount !== null && c.amount !== undefined && Number.isFinite(Number(c.amount)))
    .map((c) => ({ mode: c.mode, amount: Number(c.amount) }));

const normalizeState = (data) => ({
  state: data.state === 'open' ? 'open' : 'closed',
  session: data.session || null,
  expected: list(data.expected).map((row) => ({
    ...row,
    opening: number(row.opening),
    sales: number(row.sales),
    paid_in: number(row.paid_in),
    refunds: number(row.refunds),
    paid_out: number(row.paid_out),
    expected: number(row.expected),
  })),
  // null means the server could not count the held sales: the panel then shows what the till itself knows
  held_count: data.held_count === null ? null : number(data.held_count),
  recent_sales: list(data.recent_sales),
});

export const normalizeClose = (data) => ({
  closed: data.closed === true,
  lines: list(data.lines).map((line) => ({
    ...line,
    expected: number(line.expected),
    counted: line.counted === null || line.counted === undefined ? null : number(line.counted),
    difference: line.difference === null || line.difference === undefined ? null : number(line.difference),
  })),
  total_expected: number(data.total_expected),
  total_counted: number(data.total_counted),
  difference: number(data.difference),
  word: data.word,
  closing_entry: data.closing_entry || null,
  // 'closed', or 'closing' when the server is finishing the close in the background
  outcome: data.outcome || null,
});

/** The state of the till: { state, session, expected, held_count, recent_sales }. Both parameters are optional. */
export const getTillState = async ({ pos_profile, warehouse } = {}) => {
  let response;
  try {
    response = await axiosInstance.get(`${TILL}.get_till_state`, { params: compact({ pos_profile, warehouse }) });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return normalizeState(reply.data);
};

const callClose = async (session, counted, confirm) => {
  let response;
  try {
    // A refusal (for example "Count the cash first") is shown in the dialog, not as a pop-up
    response = await axiosInstance.post(`${TILL}.close_till`, { session, counted: countedList(counted), confirm }, { allowRefusal: true });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return normalizeClose(reply.data);
};

/** counted is [{ mode: 'Cash', amount: 5000 }]. Nothing is closed: the answer holds the lines and the difference. */
export const previewClose = ({ session, counted }) => callClose(session, counted, false);

/** Same as previewClose, but confirms: the session closes. Call it only after the cashier has said yes. */
export const closeTill = ({ session, counted }) => callClose(session, counted, true);
