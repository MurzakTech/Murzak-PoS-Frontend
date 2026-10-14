import { formatMoney } from '../components/format';
import { whatsappNumber } from '../home/homeModel';
import fill from '../labels/fill';
import T from './strings.sales';

/**
 * The decisions of the Sales page, as plain functions (ticket P3-8): the tabs, how a status, a date or a cash
 * difference reads, the spreadsheet (CSV) of what is on screen, the WhatsApp message and the check on a payment.
 * Nothing here draws anything or calls the server, so each rule can be tested alone.
 */
export const TAB_KEYS = ['all', 'unpaid', 'returns', 'sessions'];
export const DEFAULT_TAB = 'all';

/** The tab named in the address, or All sales when it is missing or not one of the four */
export const tabFromParam = (value) => (TAB_KEYS.includes(value) ? value : DEFAULT_TAB);

/** The tabs as { key, label } in the order they are shown */
export const salesTabs = () => TAB_KEYS.map((key) => ({ key, label: T.tabs[key] }));

/**
 * The address of a tab. A tab keeps the period and the rows per page the person chose, and starts again from
 * the first page with no search and no open receipt.
 */
export const tabAddress = (base, tab, search = '') => {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  ['period', 'from', 'to', 'size', 'cashier', 'store'].forEach((key) => {
    if (current.get(key)) next.set(key, current.get(key));
  });
  if (tab !== DEFAULT_TAB) next.set('tab', tab);
  const text = next.toString();
  return text ? `${base}?${text}` : base;
};

export const isSessionsTab = (tab) => tab === 'sessions';

/** A sale's invoice kind from the list when it is there, otherwise from its number (a shared link has only the number) */
export const doctypeOf = (id, rows = []) => {
  const row = rows.find((r) => r.id === id);
  if (row && row.doctype) return row.doctype;
  return /PSINV/i.test(String(id)) ? 'POS Invoice' : 'Sales Invoice';
};

/**
 * What to hand to StatusLabel. The shared label knows Paid, Unpaid, Overdue and Part returned; a fully returned
 * sale uses the Part returned icon with its own word, so the icon and the word are both still there.
 */
export const statusView = (status) => (status === 'returned' ? { status: 'part-returned', words: T.status.returned } : { status, words: undefined });

/** The payment methods of a row, never missing */
export const methodsOf = (row) => (row && Array.isArray(row.methods) ? row.methods.filter(Boolean) : []);

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** '2026-10-13' gives { day: 13, month: 'Oct', year: 2026 } or null */
const parts = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return null;
  return { year: Number(m[1]), month: T.months[Number(m[2]) - 1], day: Number(m[3]) };
};

/** '13 Oct 2026' */
export const dayWords = (date) => {
  const p = parts(date);
  return p ? `${p.day} ${p.month} ${p.year}` : T.noValue;
};

/** Today, 14:05 / Yesterday, 09:10 / 12 Oct, 09:10 / 3 Dec 2025, 17:30 (day first) */
export const whenLabel = (date, time, now = new Date()) => {
  const p = parts(date);
  if (!p) return T.noValue;
  const at = time || '';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date === isoDay(now)) return fill(T.when.today, { time: at }).replace(/,\s*$/, '');
  if (date === isoDay(yesterday)) return fill(T.when.yesterday, { time: at }).replace(/,\s*$/, '');
  const text = fill(p.year === now.getFullYear() ? T.when.other : T.when.otherYear, { day: p.day, month: p.month, year: p.year, time: at });
  return text.replace(/,\s*$/, '');
};

/** The customer as shown, with a plain word for a walk-in */
export const customerName = (row) => (row && row.customer ? row.customer : T.walkIn);

/**
 * The cash difference of a till session: counted minus expected. A session that is still open has none yet.
 * Every kind has an icon and a word, so colour is never the only signal.
 */
export const differenceInfo = (difference) => {
  if (difference === null || difference === undefined || difference === '' || Number.isNaN(Number(difference))) {
    return { kind: 'none', tone: 'neutral', icon: null, words: T.noValue };
  }
  const n = Number(difference);
  if (Math.abs(n) < 0.005) return { kind: 'matches', tone: 'good', icon: 'check', words: T.difference.matches };
  if (n < 0) return { kind: 'short', tone: 'bad', icon: 'alert', words: fill(T.difference.short, { amount: formatMoney(Math.abs(n)) }) };
  return { kind: 'over', tone: 'warn', icon: 'arrowUp', words: fill(T.difference.over, { amount: formatMoney(n) }) };
};

/** A till session's time span: '13 Oct, 08:15' and the closing time or 'Still open' */
export const sessionOpened = (row, now = new Date()) => whenLabel(row.opened_on, row.opened_at, now);
export const sessionClosed = (row) => (row.closed_at ? row.closed_at : T.stillOpen);

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

const statusWord = (status) => {
  const view = statusView(status);
  if (view.words) return view.words;
  return status;
};

/** The rows listed for All sales, Unpaid or Returns */
export const salesCsv = (rows) => {
  const C = T.csv;
  const head = [C.receipt, C.date, C.time, C.customer, C.cashier, C.methods, C.total, C.paid, C.outstanding, C.status];
  return toCsv([
    head,
    ...rows.map((r) => [r.receipt, r.date, r.time, r.customer || '', r.cashier || '', methodsOf(r).join(C.methodsJoin), r.total, r.paid, r.outstanding, statusWord(r.status)]),
  ]);
};

/** The rows listed for Till sessions */
export const sessionsCsv = (rows) => {
  const C = T.csv;
  const head = [C.cashier, C.opened, C.openedAt, C.closedAt, C.sessionStatus, C.salesCount, C.expected, C.counted, C.difference];
  return toCsv([
    head,
    ...rows.map((r) => [r.cashier_name || r.cashier || '', r.opened_on, r.opened_at, r.closed_at || '', T.sessionStatus[r.status] || r.status, r.sales_count, r.expected, r.counted === null ? '' : r.counted, r.difference === null ? '' : r.difference]),
  ]);
};

export const csvFor = (tab, rows) => (isSessionsTab(tab) ? sessionsCsv(rows) : salesCsv(rows));
export const csvName = (tab, date) => fill(T.exportName, { tab, date });

// ---------- The receipt ----------
const MAX_LINES_IN_MESSAGE = 8;

/** The message the owner sends from WhatsApp. It carries the short receipt number only, never a system reference. */
export const receiptText = (sale) => {
  const name = (sale.customer && sale.customer.name) || T.whatsapp.fallbackName;
  const outstanding = Number(sale.totals && sale.totals.outstanding) > 0 ? fill(T.whatsapp.owing, { outstanding: formatMoney(sale.totals.outstanding) }) : '';
  const lines = (sale.lines || []).slice(0, MAX_LINES_IN_MESSAGE).map((l) => fill(T.whatsapp.itemLine, { qty: l.qty, name: l.item_name, amount: formatMoney(l.amount) }));
  const values = {
    name,
    receipt: sale.receipt,
    date: dayWords(sale.date),
    total: formatMoney(sale.totals && sale.totals.total),
    paid: formatMoney(sale.totals && sale.totals.paid),
    owing: outstanding,
    items: lines.join('\n'),
  };
  return fill(lines.length ? T.whatsapp.withItems : T.whatsapp.text, values);
};

/** https://wa.me/254712345678?text=... or '' when the customer has no usable mobile number. The app sends nothing itself. */
export const whatsappLink = (sale) => {
  const number = whatsappNumber(sale.customer && sale.customer.mobile);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(receiptText(sale))}` : '';
};

/** The document title / facts a receipt needs, with the system reference as the one value that goes under Details */
export const detailsFor = (sale) => {
  const rows = [{ label: sale.doctype === 'POS Invoice' ? T.panel.detailsPos : T.panel.detailsSales, value: sale.reference }];
  if (sale.return_against) rows.push({ label: T.panel.detailsOriginal, value: sale.return_against });
  return rows;
};

// ---------- Taking a payment ----------
export const PAYMENT_MODES = ['cash', 'mpesa', 'card'];

/** Whole shillings or shillings and cents, typed digits only (Field kind="money" passes digits) */
export const paymentAmount = (text) => {
  const n = Number(String(text || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** What is wrong with a payment, by field; an empty object means it can be saved */
export const paymentProblems = ({ amount, mode, reference, outstanding }) => {
  const problems = {};
  const n = paymentAmount(amount);
  if (!(n > 0)) problems.amount = T.payment.amountRequired;
  else if (n > Number(outstanding) + 0.005) problems.amount = fill(T.payment.amountTooMuch, { outstanding: formatMoney(outstanding) });
  if (mode === 'mpesa') {
    const code = String(reference || '').trim();
    if (!code) problems.reference = T.payment.codeRequired;
    else if (!/^[A-Za-z0-9]{8,12}$/.test(code)) problems.reference = T.payment.codeInvalid;
  }
  return problems;
};

/** Which empty state to show: a list with filters, or an empty tab with its one next step */
export const emptyKind = (tab, hasFilters) => {
  if (hasFilters) return 'noMatch';
  return tab;
};
