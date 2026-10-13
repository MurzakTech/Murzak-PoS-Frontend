import { formatMoney } from '../components/format';
import T from './strings.shift';
import fill from '../labels/fill';

/**
 * Small decisions of the shift-end count, kept apart from the screens so they can be tested alone. The server does the
 * arithmetic (expected, counted, difference); nothing here works a difference out except the pure display helper below,
 * which turns a number into a word, an icon and a tone.
 */

const VIEWS = {
  short: { icon: 'alert', tone: 'bad' },
  over: { icon: 'info', tone: 'warn' },
  matches: { icon: 'check', tone: 'good' },
};

/** The word the sign of a difference gives. Half a cent or less counts as a match. */
export const wordFor = (difference) => {
  const n = Math.round(Number(difference) * 100);
  if (!Number.isFinite(n) || n === 0) return 'matches';
  return n < 0 ? 'short' : 'over';
};

/**
 * How a difference is shown: { word, icon, tone, amount, text }. The server's word is used when it is one of the three;
 * otherwise the sign decides. text is "Short by KES 100", "Over by KES 100" or "Matches".
 */
export const differenceView = (difference, serverWord) => {
  const word = VIEWS[serverWord] ? serverWord : wordFor(difference);
  const amount = formatMoney(Math.abs(Number(difference) || 0));
  const text = word === 'matches' ? T.close.matches : fill(T.close[word], { amount });
  return { word, ...VIEWS[word], amount, text };
};

/** The hint under the difference, in words */
export const differenceHint = (word) => T.close[`${word}Hint`] || '';

const isCashRow = (row) => row && (row.key === 'cash' || row.counts_cash === true);

/** The expected row of the payment method that is counted by hand (cash), or null */
export const cashRow = (state) => (state && Array.isArray(state.expected) ? state.expected.find(isCashRow) || null : null);

/** The expected rows that are only information: M-Pesa, card and so on */
export const otherRows = (state) => (state && Array.isArray(state.expected) ? state.expected.filter((row) => !isCashRow(row)) : []);

/** The opening float: the cash row's opening, else the cash part of the session's opening, else all of it */
export const openingFloat = (session, state) => {
  const row = cashRow(state);
  if (row) return Number(row.opening) || 0;
  const opening = session && Array.isArray(session.opening) ? session.opening : [];
  const cash = opening.filter((o) => /^cash$/i.test(String(o.mode || '')));
  return (cash.length ? cash : opening).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
};

/** The session name, whether the parent passed a name or the session record */
export const sessionName = (session) => (typeof session === 'string' ? session : (session && session.name) || '');

/** The count as the server wants it: only Cash is counted by hand */
export const countedFor = (state, digits) => [{ mode: (cashRow(state) || {}).mode || 'Cash', amount: Number(digits) }];

/** True when something was typed (0 counts) */
export const hasCount = (digits) => /^\d+$/.test(String(digits ?? ''));

/** "Opened by Wanjiru at 08:15", with whatever part is known */
export const openedLine = (session) => {
  if (!session) return '';
  const cashier = session.cashier_name || session.cashier || '';
  const time = session.opened_at || '';
  if (cashier && time) return fill(T.panel.openedBy, { cashier, time });
  if (cashier) return fill(T.panel.openedByOnly, { cashier });
  if (time) return fill(T.panel.openedAtOnly, { time });
  return '';
};
