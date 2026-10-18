import { formatMoney } from '../components/format';
import { NEW_LOOK_PREFIX } from '../redirects/engine';
import fill from '../labels/fill';
import T from './strings.suppliers';

/**
 * The decisions of the Suppliers page, as plain functions (ticket P4-6): the Owed filter and the status in the address, how a due
 * date reads (with the word that goes with its icon), the addresses of the panel, the form and the Purchases page, the spreadsheet
 * (CSV) of what is on screen, and the checks on the supplier form. Nothing here draws anything or calls the server, so each rule
 * can be tested alone.
 */
export const TYPES = ['Company', 'Individual'];
export const STATUS_KEYS = ['active', 'disabled', 'all'];
export const DEFAULT_STATUS = 'active';

/** The address of the supplier groups screen that exists today; it moves to Settings, Advanced in Phase 5 */
export const GROUPS_PATH = '/suppliers/groups';

/** Whether the Owed filter is on in the address (?owed=1). Only a person who may see what is owed gets it. */
export const owedFromParam = (value, canSeeMoney = true) => canSeeMoney && ['1', 'true', 'owed', 'yes'].includes(String(value || '').toLowerCase());

/** The status filter named in the address, or Active when it is missing or unknown */
export const statusFromParam = (value) => (STATUS_KEYS.includes(value) ? value : DEFAULT_STATUS);

/** The Owed filter's two choices as { value, label } for the Segmented control */
export const owedOptions = () => [
  { value: 'all', label: T.owedFilter.all },
  { value: 'owed', label: T.owedFilter.owed },
];

/** The address that opens the supplier's panel on the list */
export const listAddress = (base, id) => `${base}?open=${encodeURIComponent(id)}`;

/** The address of the edit form for a supplier number */
export const editAddress = (base, id) => `${base}/${encodeURIComponent(id)}/edit`;

/** The Purchases page for one supplier, and with one bill open when an invoice number is given (the Purchases page reads both) */
export const purchasesAddress = (supplier, invoice = '') => {
  const query = new URLSearchParams({ supplier });
  if (invoice) query.set('open', invoice);
  return `${NEW_LOOK_PREFIX}/purchases?${query.toString()}`;
};

// ---------- Dates and what is owed ----------
const parts = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return null;
  return { year: Number(m[1]), month: T.months[Number(m[2]) - 1], day: Number(m[3]) };
};

/** '2026-10-13' gives '13 Oct 2026' (day first); anything else gives a dash */
export const dayWords = (date) => {
  const p = parts(date);
  return p ? `${p.day} ${p.month} ${p.year}` : T.noValue;
};

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Whether a row carries an owed figure at all (a cashier's row does not) */
export const hasOwed = (row) => Boolean(row) && row.owed !== undefined && row.owed !== null;

/** Whether the shop owes this supplier something */
export const owes = (row) => hasOwed(row) && Number(row.owed) > 0;

/** The owed figure of a row as money, or a dash when nothing is owed */
export const owedText = (row) => (owes(row) ? formatMoney(row.owed) : T.noValue);

const days = (n) => Math.abs(Number(n) || 0);

/**
 * The word that goes with the due date's icon, or '' when the bill is not due soon: 'Due today', 'Due in 2 days' or '3 days late'.
 * The server says the state (overdue, soon, later) and the days; the page only words them.
 */
export const dueWords = (due) => {
  if (!due || !due.state) return '';
  const n = days(due.days);
  if (due.state === 'overdue') return n === 1 ? T.due.lateOne : fill(T.due.late, { count: n });
  if (due.state === 'soon') {
    if (n === 0) return T.due.today;
    return n === 1 ? T.due.soonOne : fill(T.due.soon, { count: n });
  }
  return '';
};

/** 'overdue' or 'soon' when the next bill needs attention, else '' */
export const dueUrgency = (due) => (due && (due.state === 'overdue' || due.state === 'soon') ? due.state : '');

/** The date of the next bill due as words, or a dash */
export const dueDateWords = (due) => (due && due.date ? dayWords(due.date) : T.noValue);

/** 'KES 12,000 on 10 Oct 2026' for the panel */
export const nextBillText = (due) => fill(T.panel.nextBillAmount, { amount: formatMoney(due.amount), date: dayWords(due.date) });

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

/** The rows listed on the page, with the money columns only for a person who may see them */
export const suppliersCsv = (rows, canSeeMoney) => {
  const C = T.csv;
  const head = [C.supplier, C.type, C.group, C.taxId, C.country, C.currency, ...(canSeeMoney ? [C.owed, C.nextDueDate, C.nextDueAmount, C.dueSoon] : []), C.status];
  return toCsv([
    head,
    ...rows.map((r) => [
      r.name,
      T.types[r.type] || r.type || '',
      r.group || '',
      r.tax_id || '',
      r.country || '',
      r.currency || '',
      ...(canSeeMoney ? [hasOwed(r) ? r.owed : '', r.next_due ? r.next_due.date : '', r.next_due ? r.next_due.amount : '', r.bills_due_soon === undefined ? '' : r.bills_due_soon] : []),
      r.disabled ? T.status.disabled : T.status.active,
    ]),
  ]);
};

export const csvName = (view, date) => fill(T.exportName, { view, date });

// ---------- The supplier form ----------

export const emptyForm = () => ({ name: '', type: 'Company', taxId: '', group: '', country: 'Kenya', currency: 'KES', internal: false, enabled: true });

/** The form's values for a supplier from the server */
export const formFromSupplier = (s) => ({
  name: s.name || '',
  type: TYPES.includes(s.type) ? s.type : 'Company',
  taxId: s.tax_id || '',
  group: s.group || '',
  country: s.country || '',
  currency: s.currency || '',
  internal: Boolean(s.internal),
  enabled: !s.disabled,
});

const CURRENCY = /^[A-Za-z]{3}$/;

/** What is wrong with the form, by field: { name, currency }. An empty object means it can be saved. */
export const formProblems = (values) => {
  const problems = {};
  if (!String(values.name || '').trim()) problems.name = T.form.nameRequired;
  const currency = String(values.currency || '').trim();
  if (currency && !CURRENCY.test(currency)) problems.currency = T.form.currencyInvalid;
  return problems;
};

/** The values the server is given: trimmed, the tax ID and the currency in capitals */
export const toServerValues = (values) => ({
  name: String(values.name || '').trim(),
  type: values.type,
  taxId: String(values.taxId || '').trim().toUpperCase(),
  group: values.group || undefined,
  country: String(values.country || '').trim() || undefined,
  currency: String(values.currency || '').trim().toUpperCase() || undefined,
  internal: Boolean(values.internal),
});

/** Whether anything in the form differs from where it started */
export const isDirty = (values, start) => Object.keys(start).some((key) => values[key] !== start[key]);
