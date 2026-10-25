import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { NEW_LOOK_PREFIX } from '../redirects/engine.js';
import T from './strings.purchases';

/**
 * The decisions of the Purchases page, the Receive goods steps and the New purchase form, as plain functions (ticket P4-5):
 * the tabs, how a status, a date or a due date reads, the spreadsheet (CSV) of what is on screen, what a cancel loses, the
 * checks on a payment, on the quantities received and on a new purchase, and the requests sent to the server.
 * Nothing here draws anything or calls the server, so each rule can be tested alone.
 */

// ---------- Tabs and addresses ----------
export const TAB_KEYS = ['all', 'orders', 'returns'];
export const DEFAULT_TAB = 'all';
export const PURCHASES_PATH = `${NEW_LOOK_PREFIX}/purchases`;
export const RECEIVE_PATH = `${NEW_LOOK_PREFIX}/purchases/receive`;
export const NEW_PATH = `${NEW_LOOK_PREFIX}/purchases/new`;
export const PRODUCT_NEW_PATH = `${NEW_LOOK_PREFIX}/products/new`;

/** The tab named in the address, or All purchases when it is missing or not one of the three */
export const tabFromParam = (value) => (TAB_KEYS.includes(value) ? value : DEFAULT_TAB);

export const KIND_RECEIPTS = 'receipts';
export const KIND_BILLS = 'bills';
/** The view named in the address: goods received notes, every supplier bill, or none (the tabs decide) */
export const kindFromParam = (value) => (value === KIND_RECEIPTS || value === KIND_BILLS ? value : '');
/** The choices of the Show filter, as { value, label } */
export const kindChoices = () => [
  { value: '', label: T.filters.showTabs },
  { value: KIND_RECEIPTS, label: T.filters.showReceived },
  { value: KIND_BILLS, label: T.filters.showBills },
];

/** The tabs as { key, label } in the order they are shown */
export const purchasesTabs = () => TAB_KEYS.map((key) => ({ key, label: T.tabs[key] }));

/**
 * The address of a tab. A tab keeps the period, the supplier and the rows per page the person chose, and starts again from
 * the first page with no search and no open purchase.
 */
export const tabAddress = (base, tab, search = '') => {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  ['period', 'from', 'to', 'size', 'supplier'].forEach((key) => {
    if (current.get(key)) next.set(key, current.get(key));
  });
  if (tab !== DEFAULT_TAB) next.set('tab', tab);
  const text = next.toString();
  return text ? `${base}?${text}` : base;
};

/** The address of the Receive goods steps, with an order chosen when there is one */
export const receiveAddress = (order) => (order ? `${RECEIVE_PATH}?order=${encodeURIComponent(order)}` : RECEIVE_PATH);

/** The address of the New purchase form, with a product filled in when there is one (the Reorder links use this) */
export const newPurchaseAddress = (itemCode) => (itemCode ? `${NEW_PATH}?item=${encodeURIComponent(itemCode)}` : NEW_PATH);

/** The address of the Purchases page with one purchase open */
export const openAddress = (id) => `${PURCHASES_PATH}?open=${encodeURIComponent(id)}`;

// ---------- Dates ----------
const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parts = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return null;
  return { year: Number(m[1]), month: T.months[Number(m[2]) - 1], day: Number(m[3]) };
};

/** '2026-10-13' gives '13 Oct 2026' (day first); nothing gives a dash */
export const dayWords = (date) => {
  const p = parts(date);
  return p ? `${p.day} ${p.month} ${p.year}` : T.noValue;
};

/** 'Today' stays a date here: '13 Oct 2026' is clear and the list is not a till */
export const dateCell = (date) => dayWords(date);

// ---------- Status ----------
const STATUS_LOOK = {
  draft: { icon: 'info', tone: 'neutral' },
  ordered: { icon: 'clock', tone: 'warn' },
  received: { icon: 'truck', tone: 'neutral' },
  billed: { icon: 'receipt', tone: 'warn' },
  paid: { icon: 'check', tone: 'good' },
  returned: { icon: 'undo', tone: 'neutral' },
  cancelled: { icon: 'x', tone: 'neutral' },
};

/** An icon, a tone and a word for a status, so colour is never the only signal. An unknown status reads as it came. */
export const statusView = (status) => {
  const look = STATUS_LOOK[status] || STATUS_LOOK.draft;
  return { status, icon: look.icon, tone: look.tone, words: T.status[status] || String(status || '') };
};

/** What to say about when a bill is due: { text, overdue }. Nothing is said for a bill that is paid or has no due date. */
export const dueInfo = (row, today = new Date()) => {
  if (!row || row.status !== 'billed' || !row.due_date) return null;
  const overdue = row.due_date < isoDay(today);
  return { overdue, text: fill(overdue ? T.overdue : T.dueOn, { date: dayWords(row.due_date) }) };
};

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

/** The rows listed, as a spreadsheet file's text */
export const purchasesCsv = (rows) => {
  const C = T.csv;
  const head = [C.number, C.supplier, C.date, C.total, C.status, C.billNo, C.due, C.owed];
  return toCsv([head, ...rows.map((r) => [r.number, r.supplier, r.date, r.total, statusView(r.status).words, r.bill_no || '', r.due_date || '', r.outstanding || 0])]);
};
export const csvName = (tab, date) => fill(T.exportName, { tab, date });

// ---------- The panel ----------
/** The words of the question before a cancel, naming what is lost */
export const cancelCopy = (purchase) => {
  const total = formatMoney(purchase.totals && purchase.totals.total);
  const supplier = purchase.supplier && purchase.supplier.name;
  if (purchase.doctype === 'Purchase Order') {
    return { title: fill(T.cancel.orderTitle, { number: purchase.number }), message: fill(T.cancel.orderMessage, { supplier, total }) };
  }
  const owed = Number(purchase.totals && purchase.totals.outstanding) > 0 ? fill(T.cancel.billOwed, { amount: formatMoney(purchase.totals.outstanding) }) : '';
  return { title: fill(T.cancel.billTitle, { number: purchase.number }), message: fill(T.cancel.billMessage, { supplier, total, owed }) };
};

/** The one-line description of each bill or goods received note listed in the panel */
export const billLine = (bill) =>
  Number(bill.outstanding) > 0
    ? fill(T.panel.billLineOwed, { number: bill.number, amount: formatMoney(bill.total), owed: formatMoney(bill.outstanding) })
    : fill(T.panel.billLine, { number: bill.number, amount: formatMoney(bill.total) });

/** The system reference as it appears under Details, with the right label for the kind of document */
export const detailsFor = (purchase) => {
  const label = purchase.doctype === 'Purchase Order' ? T.panel.detailsOrder : purchase.doctype === 'Purchase Receipt' ? T.panel.detailsReceipt : T.panel.detailsBill;
  const rows = [{ label, value: purchase.reference }];
  if (purchase.return_against) rows.push({ label: T.panel.detailsAgainst, value: purchase.return_against });
  return rows;
};

// ---------- Paying a bill ----------
export const decimalOnly = (text) => {
  const cleaned = String(text || '').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot < 0 ? cleaned : `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '')}`;
};

/** A typed amount as a number; 0 when it is not one */
export const amountOf = (text) => {
  const n = Number(decimalOnly(text));
  return Number.isFinite(n) ? n : 0;
};

/** What is wrong with a payment, by field; an empty object means it can be paid */
export const payProblems = ({ amount, mode, modes = [], reference, outstanding }) => {
  const problems = {};
  const n = amountOf(amount);
  if (!(n > 0)) problems.amount = T.pay.amountRequired;
  else if (n > Number(outstanding) + 0.005) problems.amount = fill(T.pay.amountTooMuch, { owed: formatMoney(outstanding) });
  if (modes.length > 0 && !mode) problems.mode = T.pay.methodRequired;
  const chosen = modes.find((m) => m.name === mode);
  if (chosen && chosen.kind === 'mpesa') {
    const code = String(reference || '').trim();
    if (!code) problems.reference = T.pay.codeRequired;
    else if (!/^[A-Za-z0-9]{8,12}$/.test(code)) problems.reference = T.pay.codeInvalid;
  }
  return problems;
};

/** The way to offer first: the first one the shop has, cash when it is there */
export const defaultMode = (modes = []) => {
  const cash = modes.find((m) => m.kind === 'cash');
  return (cash || modes[0] || {}).name || '';
};

export const isMpesa = (modes, mode) => Boolean(modes.find((m) => m.name === mode && m.kind === 'mpesa'));

// ---------- Receive goods ----------
/** A quantity as plain digits: 6 reads 6, 2.5 reads 2.5 */
export const qtyText = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return '';
  return String(Math.round(value * 1000) / 1000);
};

/** A quantity typed: digits and one dot, as a number above 0, otherwise null */
export const parseQty = (text) => {
  const typed = String(text === null || text === undefined ? '' : text)
    .trim()
    .replace(/,/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(typed)) return null;
  const n = Number(typed);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null;
};

/** The lines of an order as the Receive goods table holds them: all with something to arrive start ticked, at the full quantity still to arrive */
export const receiveLines = (purchase) =>
  (purchase.lines || []).map((l) => ({
    item_code: l.item_code,
    name: l.item_name || l.item_code,
    unit: l.unit,
    ordered: Number(l.ordered),
    received: Number(l.received),
    toArrive: Number(l.to_arrive),
    rate: Number(l.rate),
    ticked: Number(l.to_arrive) > 0,
    qty: Number(l.to_arrive) > 0 ? qtyText(l.to_arrive) : '',
    spoilt: '',
    reason: SPOILT_REASONS[0],
  }));

/** Why goods are spoilt; the first is the one offered. These words go on the return note to the supplier. */
export const SPOILT_REASONS = ['Damaged', 'Expired', 'Wrong item', 'Poor quality', 'Other'];

/** A spoilt quantity typed: blank or 0 is none (0), a number above 0 is itself, anything else is null */
export const parseSpoilt = (text) => {
  if (String(text === null || text === undefined ? '' : text).trim() === '') return 0;
  const n = parseQty(text);
  if (n !== null) return n;
  return /^0*\.?0*$/.test(String(text).trim()) ? 0 : null;
};

/** Item codes that appear on more than one line of the order (the server receives those in the current screen only) */
export const duplicateCodes = (lines) => {
  const seen = {};
  lines.forEach((l) => {
    seen[l.item_code] = (seen[l.item_code] || 0) + 1;
  });
  return Object.keys(seen).filter((code) => seen[code] > 1);
};

/** What is wrong with the quantities, by item code, and the general problem (nothing ticked) if any */
export const receiveProblems = (lines) => {
  const problems = {};
  const dupes = duplicateCodes(lines);
  const ticked = lines.filter((l) => l.ticked && l.toArrive > 0);
  ticked.forEach((l) => {
    if (dupes.includes(l.item_code)) {
      problems[l.item_code] = fill(T.receive.problems.duplicate, { name: l.name });
      return;
    }
    const n = parseQty(l.qty);
    if (String(l.qty || '').trim() === '') problems[l.item_code] = fill(T.receive.problems.qtyRequired, { name: l.name });
    else if (n === null) problems[l.item_code] = fill(T.receive.problems.qtyBad, { name: l.name });
    else if (n > l.toArrive + 1e-9) problems[l.item_code] = fill(T.receive.problems.qtyTooMuch, { name: l.name, left: qtyText(l.toArrive) });
  });
  ticked.forEach((l) => {
    if (dupes.includes(l.item_code)) return;
    const spoilt = parseSpoilt(l.spoilt);
    const arrived = parseQty(l.qty);
    if (spoilt === null) problems[`${SPOILT_PREFIX}${l.item_code}`] = fill(T.receive.problems.spoiltBad, { name: l.name });
    else if (arrived !== null && spoilt > arrived + 1e-9) problems[`${SPOILT_PREFIX}${l.item_code}`] = fill(T.receive.problems.spoiltTooMuch, { name: l.name, arrived: qtyText(arrived) });
  });
  if (ticked.length === 0) problems.general = T.receive.problems.noneTicked;
  return problems;
};

/** The key a spoilt problem is held under, beside the quantity problem of the same line */
export const SPOILT_PREFIX = 'spoilt:';

/** The lines sent to the server: only the ticked ones, with their quantity as a number */
export const receiveItems = (lines) => lines.filter((l) => l.ticked && l.toArrive > 0 && parseQty(l.qty) !== null).map((l) => ({ item_code: l.item_code, qty_received: parseQty(l.qty) }));

/** The lines being received, with their amounts and what part is spoilt, for the review step */
export const reviewLines = (lines) =>
  receiveItems(lines).map((item) => {
    const line = lines.find((l) => l.item_code === item.item_code);
    const spoilt = Math.min(parseSpoilt(line.spoilt) || 0, item.qty_received);
    return {
      item_code: line.item_code,
      name: line.name,
      unit: line.unit,
      qty: item.qty_received,
      spoilt,
      good: Math.round((item.qty_received - spoilt) * 1000) / 1000,
      rate: line.rate,
      amount: Math.round(item.qty_received * line.rate * 100) / 100,
      spoiltAmount: Math.round(spoilt * line.rate * 100) / 100,
    };
  });

/** The ticked lines that have spoilt goods, as the return note to the supplier takes them: [{ item_code, item_name, qty, rate, reason }] */
export const spoiltItems = (lines) =>
  reviewLines(lines)
    .filter((l) => l.spoilt > 0)
    .map((l) => ({ item_code: l.item_code, item_name: l.name, qty: l.spoilt, rate: l.rate, reason: lines.find((x) => x.item_code === l.item_code).reason }));

/** The value of the spoilt goods (what the return note takes off the bill) */
export const spoiltTotal = (lines) => Math.round(reviewLines(lines).reduce((sum, l) => sum + l.spoiltAmount, 0) * 100) / 100;

/** The words on the return note: each reason with its products ('Damaged: Sugar 2, Rice 1. Expired: Salt 3.'), then the person's own note */
export const returnRemarks = (items, note = '') => {
  const groups = [];
  items.forEach((i) => {
    const group = groups.find((g) => g.reason === i.reason);
    if (group) group.names.push(`${i.item_name} ${qtyText(i.qty)}`);
    else groups.push({ reason: i.reason, names: [`${i.item_name} ${qtyText(i.qty)}`] });
  });
  const text = groups.map((g) => `${g.reason}: ${g.names.join(', ')}.`).join(' ');
  return [text, String(note || '').trim()].filter(Boolean).join(' ').slice(0, 140);
};

export const reviewTotal = (lines) => Math.round(reviewLines(lines).reduce((sum, l) => sum + l.amount, 0) * 100) / 100;

/** What will still be to arrive after this delivery, as 'Sugar 4, Rice 5' ('' when the order is complete) */
export const leftAfter = (lines) => {
  const got = {};
  receiveItems(lines).forEach((i) => {
    got[i.item_code] = i.qty_received;
  });
  return lines
    .map((l) => ({ name: l.name, left: Math.round((l.toArrive - (got[l.item_code] || 0)) * 1000) / 1000 }))
    .filter((l) => l.left > 0)
    .map((l) => `${l.name} ${qtyText(l.left)}`)
    .join(', ');
};

/** The check on the bill details of the review step. The Field gives an empty date until a real one is typed, so a blank date is left to the supplier terms. */
export const reviewFieldProblems = ({ billDate, dueDate }) => {
  const problems = {};
  if (billDate && dueDate && dueDate < billDate) problems.dueDate = T.receive.problems.dueBefore;
  return problems;
};

/** The words of one line of the stock result: 'Sugar: 10 before, 16 now' */
export const stockLine = (entry, names = {}) => fill(T.receive.stockLine, { name: names[entry.item_code] || entry.item_code, before: qtyText(entry.before), after: qtyText(entry.after) });

/** The sentence for a failed delivery; the server often says "nothing was changed" itself, so it is not said twice */
export const failedWords = (reason) => fill(/nothing was changed/i.test(String(reason || '')) ? T.receive.failedShort : T.receive.failed, { reason });

/** An id made once per page and sent with every try, so a repeat never records a delivery twice */
export const newRequestId = (prefix = 'req') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ---------- The New purchase form ----------
export const FIELD_IDS = {
  supplier: 'np-supplier',
  date: 'np-date',
  items: 'np-items',
  billNo: 'np-bill-no',
  billDate: 'np-bill-date',
  dueDate: 'np-due-date',
  paidAmount: 'np-paid-amount',
  paidHow: 'np-paid-how',
  paidCode: 'np-paid-code',
};
export const FIELD_ORDER = ['supplier', 'date', 'items', 'billDate', 'dueDate', 'paidAmount', 'paidHow', 'paidCode'];
export const MORE_FIELDS = ['billDate', 'dueDate', 'paidAmount', 'paidHow', 'paidCode'];

/** A blank form for a day (ISO), with the bill date at the same day */
export const freshForm = (today) => ({
  supplier: '',
  date: today,
  notes: '',
  warehouse: '',
  haveBill: false,
  billNo: '',
  billDate: today,
  dueDate: '',
  paid: false,
  paidAmount: '',
  paidHow: '',
  paidCode: '',
});

let lineCounter = 0;
/** A line of the form from a product: quantity 1 and the cost on record (blank when none) */
export const lineFrom = (product, qty = '1') => {
  lineCounter += 1;
  return {
    key: `l${lineCounter}`,
    item_code: product.item_code,
    name: product.item_name || product.item_code,
    unit: product.unit || '',
    qty,
    cost: product.cost === null || product.cost === undefined ? '' : String(product.cost),
  };
};

/** Adds a product; one already on the list gets one more instead of a second line. Returns { lines, merged }. */
export const addProductLine = (lines, product) => {
  const index = lines.findIndex((l) => l.item_code === product.item_code);
  if (index < 0) return { lines: [...lines, lineFrom(product)], merged: false };
  const next = lines.map((l, i) => (i === index ? { ...l, qty: qtyText((parseQty(l.qty) || 0) + 1) } : l));
  return { lines: next, merged: true };
};

export const lineAmount = (line) => Math.round((parseQty(line.qty) || 0) * amountOf(line.cost) * 100) / 100;
export const linesTotal = (lines) => Math.round(lines.reduce((sum, l) => sum + lineAmount(l), 0) * 100) / 100;

/** What is wrong with the form, by field; 'qty:<key>' and 'cost:<key>' name a line. An empty object means it can be saved. */
export const checkPurchase = (values, lines, { modes = [] } = {}) => {
  const P = T.form.problems;
  const problems = {};
  if (!values.supplier) problems.supplier = P.supplier;
  if (!values.date) problems.date = P.date;
  if (lines.length === 0) problems.items = P.noItems;
  lines.forEach((l) => {
    if (parseQty(l.qty) === null) problems[`qty:${l.key}`] = fill(P.qty, { name: l.name });
    if (String(l.cost).trim() === '') problems[`cost:${l.key}`] = fill(P.cost, { name: l.name });
  });
  if (values.haveBill) {
    if (values.billDate && values.dueDate && values.dueDate < values.billDate) problems.dueDate = P.dueBefore;
    if (values.paid) {
      const total = linesTotal(lines);
      const paid = amountOf(values.paidAmount);
      if (!(paid > 0)) problems.paidAmount = P.paid;
      else if (paid > total + 0.005) problems.paidAmount = fill(P.paidTooMuch, { total: formatMoney(total) });
      if (modes.length > 0 && !values.paidHow) problems.paidHow = P.paidHow;
      if (isMpesa(modes, values.paidHow) && !/^[A-Za-z0-9]{8,12}$/.test(String(values.paidCode || '').trim())) problems.paidCode = P.paidCode;
    }
  }
  return problems;
};

/** The problems as the list at the top of the form: [{ id, message }] in the order the fields appear */
export const summaryOf = (problems, lines = []) => {
  const out = [];
  FIELD_ORDER.forEach((key) => {
    if (key === 'items') {
      if (problems.items) out.push({ id: FIELD_IDS.items, message: problems.items });
      lines.forEach((l) => {
        if (problems[`qty:${l.key}`]) out.push({ id: `np-qty-${l.key}`, message: problems[`qty:${l.key}`] });
        if (problems[`cost:${l.key}`]) out.push({ id: `np-cost-${l.key}`, message: problems[`cost:${l.key}`] });
      });
    } else if (problems[key]) out.push({ id: FIELD_IDS[key], message: problems[key] });
  });
  if (problems.general) out.push({ id: FIELD_IDS.supplier, message: problems.general });
  return out;
};

/** Has anything been typed or chosen that would be lost on leaving? */
export const isDirty = (values, lines, baseline, baselineLines = []) =>
  JSON.stringify([values, lines.map((l) => [l.item_code, l.qty, l.cost])]) !== JSON.stringify([baseline, baselineLines.map((l) => [l.item_code, l.qty, l.cost])]);

/** The lines as the server takes them for an order or a bill */
export const serverLines = (lines) => lines.map((l) => ({ item_code: l.item_code, qty: parseQty(l.qty), rate: amountOf(l.cost) }));

/** Which save this is: a direct bill (stock goes up at once) when the person holds the bill, otherwise an order */
export const isDirectBill = (values) => Boolean(values.haveBill);

/** The request for a direct bill */
export const billRequest = (values, lines, requestId) => ({
  supplier: values.supplier,
  items: serverLines(lines),
  billNo: values.billNo.trim() || undefined,
  billDate: values.billDate || undefined,
  dueDate: values.dueDate || undefined,
  warehouse: values.warehouse || undefined,
  paidAmount: values.paid ? amountOf(values.paidAmount) : undefined,
  mode: values.paid ? values.paidHow || undefined : undefined,
  reference: values.paid && values.paidCode.trim() ? values.paidCode.trim() : undefined,
  notes: values.notes.trim() || undefined,
  requestId,
});

/** The request for an order */
export const orderRequest = (values, lines, requestId) => ({
  supplier: values.supplier,
  items: serverLines(lines),
  date: values.date || undefined,
  warehouse: values.warehouse || undefined,
  requestId,
});
