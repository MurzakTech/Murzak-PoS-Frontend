import fill from '../labels/fill';
import { NEW_LOOK_PREFIX } from '../redirects/engine.js';
import T from './strings.expenses';

/**
 * The decisions of the Expenses page and the Add expense form, as plain functions (ticket P5-1): how a row, a date or a source reads,
 * the spreadsheet (CSV) of what is on screen, what the form checks before it asks the server, and how a photo is checked. Nothing here
 * draws anything or calls the server, so each rule can be tested alone.
 */
export const MAX_NOTE = 140;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// What the photo chooser accepts: picture files only (the server checks the real contents again)
export const RECEIPT_INPUT = { type: 'file', accept: RECEIPT_TYPES.join(',') };

export const LIST_PATH = `${NEW_LOOK_PREFIX}/expenses`;
export const ADD_PATH = `${NEW_LOOK_PREFIX}/expenses/new`;

export const FIELD_IDS = Object.fromEntries([
  ['amount', 'amount'],
  ['category', 'category'],
  ['paidFrom', 'paid-from'],
  ['date', 'date'],
  ['note', 'note'],
  ['receipt', 'receipt'],
].map(([key, id]) => [key, `ex-${id}`]));
export const ROW_KEY = 'key';
// Fields that sit under More options
export const MORE_FIELDS = ['receipt'];

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** One id per form, kept for a retry: sending the same id twice never saves the expense twice */
export const newRequestId = () => `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** '2026-10-13' gives '13 Oct 2026', or a dash */
export const dayWords = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return T.noValue;
  return `${Number(m[3])} ${T.months[Number(m[2]) - 1]} ${m[1]}`;
};

/** The paid-from choice to start with: the first one the shop can use (Cash comes first) */
export const defaultPaidFrom = (paidFrom = []) => {
  const first = paidFrom.find((p) => p.available);
  return first ? first.key : '';
};

/** Why a paid-from choice cannot be used, in plain words (empty when it can) */
export const reasonWords = (option) => {
  if (!option || option.available) return '';
  return fill(T.form.reasons[option.reason] || T.form.reasons.other, { label: option.label });
};

/** The paid-from choices for the dropdown: one that cannot be used says so and cannot be chosen */
export const paidFromChoices = (paidFrom = []) => paidFrom.map((p) => ({ value: p.key, label: p.available ? p.label : fill(T.form.paidFromNotSet, { label: p.label }), disabled: !p.available }));

/** The categories for the form's dropdown */
export const categoryChoices = (categories = []) => categories.map((c) => ({ value: c.id, label: c.label }));

/**
 * The categories for the filter: the ones the form offers, plus any category that appears in the rows on screen or is already chosen
 * (an expense booked by someone else may sit on an account the form does not offer), by name.
 */
export const filterCategories = (categories = [], rows = [], chosen = '') => {
  const seen = new Map(categories.map((c) => [c.id, c.label]));
  rows.forEach((r) => r.category && !seen.has(r.category.id) && seen.set(r.category.id, r.category.label));
  if (chosen && !seen.has(chosen)) seen.set(chosen, chosen.replace(/ - [A-Z0-9]+$/, ''));
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
};

// ---------- The list ----------

/** Where a row came from, in plain words: added on this page, or the kind of record behind it */
export const sourceWords = (row) => {
  if (!row) return T.noValue;
  if (row.kind === 'expense') return T.addedHere;
  return T.sources[row.reference_type] || T.sources.other;
};

/** What a row was paid from: the choice's name, the account's name, or a dash for an entry made another way */
export const paidFromWords = (row) => {
  if (!row || !row.paid_from) return T.noValue;
  return row.paid_from.key === 'other' ? row.paid_from.label || T.paidFromOther : row.paid_from.label;
};

export const isRefund = (row) => Number(row && row.amount) < 0;

/** Short words for the period in a file name */
export const periodName = (period) => T.periods[period] || T.periods['30d'];

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

export const expensesCsv = (rows) => {
  const C = T.csv;
  return toCsv([
    [C.date, C.category, C.note, C.paidFrom, C.amount, C.addedBy, C.source],
    ...rows.map((r) => [r.date, r.category ? r.category.label : '', r.note || '', r.paid_from ? paidFromWords(r) : '', r.amount, r.added_by || '', sourceWords(r)]),
  ]);
};
export const csvName = (period, date) => fill(T.exportName, { period: periodName(period), date });

// ---------- The Add expense form ----------

/** A form to start with. Date is today; category and paid from can be carried over for the next expense. */
export const freshForm = ({ today, category = '', paidFrom = '' } = {}) => ({ amount: '', category, paidFrom, date: today || '', note: '', receipt: null });

/** Has anything been changed since the form was last saved or opened? */
export const isDirty = (values, base) =>
  values.amount !== base.amount ||
  values.category !== base.category ||
  values.paidFrom !== base.paidFrom ||
  values.date !== base.date ||
  values.note !== base.note ||
  (values.receipt ? values.receipt.dataUrl : '') !== (base.receipt ? base.receipt.dataUrl : '');

/** What is wrong with the form, as { field: sentence }. `today` is the latest date allowed. */
export const checkExpense = (values, today) => {
  const P = T.form.problems;
  const found = {};
  if (!String(values.amount).trim()) found.amount = P.amount;
  else if (!/^\d+$/.test(values.amount)) found.amount = P.amountNumber;
  else if (Number(values.amount) <= 0) found.amount = P.amountZero;
  if (!values.category) found.category = P.category;
  if (!values.paidFrom) found.paidFrom = P.paidFrom;
  if (!values.date) found.date = P.date;
  else if (today && values.date > today) found.date = P.dateFuture;
  if (values.note.trim().length > MAX_NOTE) found.note = fill(P.noteLong, { max: MAX_NOTE });
  return found;
};

/** The problems as the list at the top of the form wants them: [{ id, message }], top to bottom */
export const summaryOf = (problems) =>
  ['amount', 'category', 'paidFrom', 'date', 'note', 'receipt']
    .filter((key) => problems[key])
    .map((key) => ({ id: FIELD_IDS[key], message: problems[key] }));

/** The first field to take the keyboard to, top to bottom */
export const firstProblem = (problems) => ['amount', 'category', 'paidFrom', 'date', 'note', 'receipt'].find((key) => problems[key]) || 'amount';

/** What createExpense is given */
export const expenseRequest = (values, requestId, company) => ({
  amount: values.amount,
  category: values.category,
  paidFrom: values.paidFrom,
  date: values.date,
  note: values.note.trim(),
  receipt: values.receipt ? values.receipt.dataUrl : undefined,
  company,
  requestId,
});

// The names the server uses for the fields, and ours
const SERVER_FIELDS = Object.fromEntries([['amount'], ['category'], ['paid_from', 'paidFrom'], ['date'], ['note'], ['receipt']].map(([server, ours]) => [server, ours || server]));

/** A refusal from the server as { field, message } so it can sit beside the field it is about; field is '' when it is about the whole form */
export const serverProblem = (error) => ({ field: SERVER_FIELDS[error && error.field] || '', message: (error && error.message) || T.form.failed });

// ---------- The receipt photo ----------
export const megabytes = (bytes) => {
  const value = Math.round((Number(bytes) / (1024 * 1024)) * 10) / 10;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

/** What is wrong with a chosen file, in plain words; empty when it is fine */
export const receiptProblem = (file) => {
  if (!file) return '';
  if (!RECEIPT_TYPES.includes(file.type)) return T.form.receiptBadType;
  if (file.size > MAX_RECEIPT_BYTES) return fill(T.form.receiptTooBig, { size: megabytes(file.size), max: megabytes(MAX_RECEIPT_BYTES) });
  return '';
};

/** Reads a file as a data URL (the text the server takes). Resolves to the text; rejects when the file cannot be read. */
export const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(T.form.receiptUnreadable));
    reader.readAsDataURL(file);
  });
