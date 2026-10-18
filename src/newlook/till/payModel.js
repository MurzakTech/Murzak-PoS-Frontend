/**
 * The decisions of the pay screen, as pure functions (no React, no words): which choices to show, which quick-cash
 * buttons to offer, what the Change line says, and whether an M-Pesa confirmation code is good enough.
 * The words themselves live in strings.pay.js; this file only returns codes the screen turns into words.
 */
import { paymentKey } from '../components/Chip';
import { displayName } from '../labels/renameMap';

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Rounds to the cent so floating point noise never shows or decides anything. */
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ------------------------------------------------------------------ */
/* The five choices                                                    */
/* ------------------------------------------------------------------ */

/** The order of the choices on screen: Cash and M-Pesa first. */
export const CHOICE_ORDER = ['cash', 'mpesa', 'card', 'credit', 'other'];

/** The choice (cash, mpesa, card, credit or other) an ERPNext Mode of Payment name belongs to. */
export const choiceOf = (mode) => {
  const shown = displayName(mode);
  return paymentKey(shown === null || shown === undefined ? mode : shown);
};

/**
 * Groups the mode names into the choices, in order, keeping only choices that have at least one mode.
 * ['Credit', 'Cash', 'Bank Draft', 'Cheque'] gives [{ key: 'cash', modes: ['Cash'] }, { key: 'credit', ... }, { key: 'other', modes: ['Bank Draft', 'Cheque'] }]
 */
export const groupChoices = (modes = []) => {
  const groups = CHOICE_ORDER.map((key) => ({ key, modes: [] }));
  const seen = new Set();
  modes.forEach((mode) => {
    if (typeof mode !== 'string' || !mode.trim() || seen.has(mode)) return;
    seen.add(mode);
    groups.find((g) => g.key === choiceOf(mode)).modes.push(mode);
  });
  return groups.filter((g) => g.modes.length > 0);
};

/** The mode to use when the person picks a choice: the mode already chosen if it belongs to it, else the first one. */
export const modeForChoice = (group, currentMode) => (group.modes.includes(currentMode) ? currentMode : group.modes[0]);

/** True when the mode name is an M-Pesa mode. */
export const isMpesaMode = (mode) => choiceOf(mode) === 'mpesa';

/* ------------------------------------------------------------------ */
/* Quick cash                                                          */
/* ------------------------------------------------------------------ */

/** The notes of the quick-cash buttons. 2,000 is the largest note and is always offered (AC-19). */
export const NOTES = [50, 100, 200, 500, 1000, 2000];
export const TOP_NOTE = 2000;
export const MAX_QUICK_BUTTONS = 8;

/**
 * Round-ups a cashier expects for a total: the next multiple of 50, 100, 500 and 1,000 (the old panel's rule).
 * 1284 gives [1300, 1500, 2000]; a total that is already a multiple adds nothing new.
 */
const roundUps = (total) => [50, 100, 500, 1000].map((step) => Math.ceil(total / step) * step);

/**
 * The quick-cash buttons for a total. Each button sets "Customer gives" to its value (it does not add).
 *
 * The rule, in order of importance:
 *   1. Exact: the total itself (always first).
 *   2. 2,000: always offered, even for a small total, and even when the total is above 2,000.
 *   3. Every note at or above the total (50, 100, 200, 500, 1,000, 2,000), so a small total shows the notes that cover it.
 *   4. The round-ups of the total (next 50, 100, 500, 1,000), so a total of 1,284 offers 1,300 and 1,500.
 * At most MAX_QUICK_BUTTONS buttons are shown, taken in that order and then listed smallest first, with Exact first.
 * A total of zero or less gives no Exact button, only 2,000.
 *
 * Returns [{ kind: 'exact' | 'amount', value }].
 */
export const quickCash = (total) => {
  const t = round2(total);
  const picked = [];
  const add = (value) => {
    if (picked.length < MAX_QUICK_BUTTONS && !picked.includes(value)) picked.push(value);
  };
  if (t > 0) add(t);
  add(TOP_NOTE);
  if (t > 0) {
    NOTES.filter((n) => n >= t).forEach(add);
    roundUps(t).forEach(add);
  }
  const exact = t > 0 ? [{ kind: 'exact', value: t }] : [];
  const rest = picked
    .filter((v) => !(t > 0 && v === t))
    .sort((a, b) => a - b)
    .map((value) => ({ kind: 'amount', value }));
  return [...exact, ...rest];
};

/* ------------------------------------------------------------------ */
/* Number pad                                                          */
/* ------------------------------------------------------------------ */

/**
 * What the Customer gives display holds after a pad key. At most two decimals and nine digits, no leading zeros.
 * ('', '5') gives '5'; ('5', '00') gives '500'; ('1.5', '00') gives '1.50'; ('', '.') gives '0.'
 */
export const nextBuffer = (buffer, key) => {
  if (key === 'clear') return '';
  if (key === 'back') return buffer.slice(0, -1);
  if (key === '.') return buffer.includes('.') ? buffer : buffer === '' ? '0.' : `${buffer}.`;
  let next = buffer;
  for (const digit of key) {
    if (/\.\d{2}$/.test(next) || next.replace('.', '').length >= 9) break;
    next = next === '0' ? digit : next + digit;
  }
  return next;
};

/** The number a buffer stands for ('' gives 0). */
export const bufferAmount = (buffer) => Math.max(0, parseFloat(buffer) || 0);

/** '1250.5' gives '1,250.5' while typing (a trailing '.' stays visible). */
export const formatBuffer = (buffer) => {
  if (buffer === '') return '';
  const [whole, cents] = buffer.split('.');
  const body = Number(whole || 0).toLocaleString('en-US');
  return cents === undefined ? body : `${body}.${cents}`;
};

/* ------------------------------------------------------------------ */
/* The Change line                                                     */
/* ------------------------------------------------------------------ */

/**
 * What the Change line shows: { state, change, short }.
 *   idle   nothing given yet
 *   short  the customer gave less than the total (short is how much is still to pay)
 *   give   more than the total (change is what to hand back)
 *   exact  the same as the total
 */
export const changeState = (total, given) => {
  const g = round2(given);
  if (g <= 0) return { state: 'idle', change: 0, short: 0 };
  const short = round2(total - g);
  if (short > 0) return { state: 'short', change: 0, short };
  const change = round2(g - total);
  return change > 0 ? { state: 'give', change, short: 0 } : { state: 'exact', change: 0, short: 0 };
};

/* ------------------------------------------------------------------ */
/* M-Pesa confirmation code                                            */
/* ------------------------------------------------------------------ */

export const CODE_MIN = 8;
export const CODE_MAX = 12;

/** What is kept as the person types: capitals, and no spaces at all. */
export const cleanCode = (typed) => String(typed === null || typed === undefined ? '' : typed).replace(/\s+/g, '').toUpperCase();

/**
 * Checks a confirmation code. M-Pesa codes are 10 characters, but 8 to 12 letters and digits are accepted.
 * Returns { valid, code, problem } where problem is null, 'blank', 'chars' (not only letters and digits),
 * 'short' or 'long'.
 */
export const checkCode = (typed) => {
  const code = cleanCode(typed);
  if (!code) return { valid: false, code, problem: 'blank' };
  if (!/^[A-Z0-9]+$/.test(code)) return { valid: false, code, problem: 'chars' };
  if (code.length < CODE_MIN) return { valid: false, code, problem: 'short' };
  if (code.length > CODE_MAX) return { valid: false, code, problem: 'long' };
  return { valid: true, code, problem: null };
};

/** The gateway value saved on the payment for a typed code (the checkout writes reference_no from reference). label is the word M-Pesa from the strings file. */
export const manualGateway = (code, label) => ({ confirmed: true, reference: code, label, manual: true });

/** True when a gateway value was entered by hand (not collected through a gateway). */
export const isManual = (gateway) => Boolean(gateway && gateway.manual);

/**
 * The state of the M-Pesa code for one payment line.
 *   gateway   the line's gateway value ({ confirmed, reference, transactionId, manual } or nothing)
 *   typed     what was typed in the code field
 * A payment the gateway has confirmed counts as done, and shows its reference as the code. Otherwise the typed code decides.
 * Returns { valid, code, problem, fromGateway }.
 */
export const mpesaCodeState = (gateway, typed) => {
  if (gateway && gateway.confirmed && !gateway.manual) {
    return { valid: true, code: gateway.reference ? String(gateway.reference) : '', problem: null, fromGateway: true };
  }
  return { ...checkCode(typed), fromGateway: false };
};

/**
 * Every M-Pesa line that still needs a code: lines whose mode is M-Pesa, whose amount is above zero, and whose code is not valid.
 * lines: [{ mode, amount, gateway }], codes: { [index]: typed }. Returns the indexes.
 */
export const linesNeedingCode = (lines, codes = {}) =>
  lines.reduce((out, line, index) => {
    if (!isMpesaMode(line.mode) || !(Number(line.amount) > 0)) return out;
    return mpesaCodeState(line.gateway, codes[index]).valid ? out : [...out, index];
  }, []);

/* ------------------------------------------------------------------ */
/* Split payments and decimals                                         */
/* ------------------------------------------------------------------ */

/** What a decimal money field keeps as it is typed: digits and one point, at most two decimals. */
export const cleanDecimal = (typed) => {
  const raw = String(typed === null || typed === undefined ? '' : typed).replace(/[^0-9.]/g, '');
  const [whole, ...rest] = raw.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
};

/**
 * The name the screen shows for a mode. "Credit" reads On credit and "Mpesa" reads M-Pesa; Credit Card reads Card
 * (the rename map); the method names the owner made up are shown as they are. When two modes would read the same,
 * the real name is shown so they can be told apart.
 */
export const modeName = (mode, allModes = [], words = {}) => {
  const shown = displayName(mode);
  let name = shown === null || shown === undefined ? mode : shown;
  if (/^credit$/i.test(name) && words.credit) name = words.credit;
  else if (isMpesaMode(name) && /^m-?pesa$/i.test(name) && words.mpesa) name = words.mpesa;
  const clash = allModes.filter((m) => m !== mode && modeName(m, [], words) === name).length > 0;
  return clash ? mode : name;
};
