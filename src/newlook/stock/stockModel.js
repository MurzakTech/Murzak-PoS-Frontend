import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { isoDay, whenLabel } from '../sales/salesModel';
import T from './strings.stock';

/**
 * The decisions of the Stock levels page and its forms, as plain functions (tickets P4-3 and P4-4): the tabs and
 * their addresses, how a level, a quantity, a unit, a movement and an expiry date read, the spreadsheet of what is
 * on screen, the address of Reorder, and the rules of the short forms and the guided count. Nothing here draws
 * anything or calls the server, so each rule can be tested alone.
 */
export const LIST_TABS = ['overview', 'low', 'movements', 'expiry'];
export const DEFAULT_TAB = 'overview';
const PAGE_TABS = ['overview', 'low', 'movements', 'count', 'locations', 'transfers', 'expiry'];

/** The page's own address up to and including /stock, whatever prefix it is mounted under */
export const stockRoot = (pathname) => String(pathname || '').replace(/\/stock(\/.*)?$/, '/stock');

/** The tab named by the address: /new-look/stock/low gives 'low'; anything else gives Overview */
export const tabFromPath = (pathname) => {
  const match = /\/stock\/([^/?#]+)/.exec(String(pathname || ''));
  return match && PAGE_TABS.includes(match[1]) ? match[1] : DEFAULT_TAB;
};

/**
 * The tabs shown, in order. Count stock is for people who may change stock. Locations and Transfers appear only with
 * two or more selling locations, and Expiry only for a shop that tracks expiry dates. The tab that is open is always
 * kept, so a link never opens a page with no tab selected.
 */
export const visibleTabs = ({ locations = false, expiry = false, canChange = false, current = DEFAULT_TAB } = {}) =>
  PAGE_TABS.filter((key) => {
    if (key === current) return true;
    if (key === 'count') return canChange;
    if (key === 'locations' || key === 'transfers') return locations;
    if (key === 'expiry') return expiry;
    return true;
  }).map((key) => ({ key, label: T.tabs[key] }));

/**
 * The address of a tab. A tab keeps the chosen store and rows per page, and starts again from the first page with no
 * search; movements keep their period.
 */
export const tabAddress = (root, tab, search = '') => {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  ['store', 'size'].forEach((key) => {
    if (current.get(key)) next.set(key, current.get(key));
  });
  if (tab === 'movements') ['period', 'from', 'to'].forEach((key) => current.get(key) && next.set(key, current.get(key)));
  const text = next.toString();
  const path = tab === DEFAULT_TAB ? root : `${root}/${tab}`;
  return text ? `${path}?${text}` : path;
};

// ---------- Quantities, units and levels ----------
/** 25.5 gives '25.5'; 4 gives '4'; 1200 gives '1,200'; never more than three decimals */
export const formatQty = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return T.noValue;
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
};

/** The unit in plain words, matched to the number: 'Nos' reads 'pieces' (or 'piece' for one), 'Kg' reads 'kilograms' */
export const unitWords = (unit, qty) => {
  const code = String(unit || '').trim();
  if (!code) return '';
  const known = T.units[code.toLowerCase()];
  if (known) return Number(qty) === 1 ? known[0] : known[1];
  return code.toLowerCase();
};

/** '4 pieces', '25.5 kilograms'; the number alone when the unit is not known */
export const qtyWithUnit = (qty, unit) => {
  const words = unitWords(unit, qty);
  return words ? fill(T.quantityWithUnit, { qty: formatQty(qty), unit: words }) : formatQty(qty);
};

/** The label of a level: an icon and a word, so colour is never the only signal */
export const levelView = (level) => {
  if (level === 'out') return { level: 'out', tone: 'bad', icon: 'alert', words: T.levels.out };
  if (level === 'low') return { level: 'low', tone: 'warn', icon: 'arrowDown', words: T.levels.low };
  return { level: 'ok', tone: 'good', icon: 'check', words: T.levels.ok };
};

/** The life-cycle label of an entry: Draft, Submitted or Cancelled, each with an icon */
export const statusView = (status) => {
  if (status === 'draft') return { status: 'draft', tone: 'neutral', icon: 'clock', words: T.statuses.draft };
  if (status === 'cancelled') return { status: 'cancelled', tone: 'bad', icon: 'x', words: T.statuses.cancelled };
  return { status: 'submitted', tone: 'good', icon: 'check', words: T.statuses.submitted };
};

/** Expired, within 7 days, or soon; each with an icon */
export const expiryView = (state) => {
  if (state === 'expired') return { state, tone: 'bad', icon: 'alert', words: T.expiryStates.expired };
  if (state === 'critical') return { state, tone: 'warn', icon: 'clock', words: T.expiryStates.critical };
  return { state: 'soon', tone: 'neutral', icon: 'clock', words: T.expiryStates.soon };
};

/** '3 days left', 'Expires today', 'Expired 2 days ago' */
export const daysLeftWords = (days) => {
  const n = Number(days);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return T.expiry.today;
  if (n === 1) return T.expiry.oneDayLeft;
  if (n > 1) return fill(T.expiry.daysLeft, { days: n });
  return n === -1 ? T.expiry.oneDayAgo : fill(T.expiry.daysAgo, { days: Math.abs(n) });
};

// ---------- Movements ----------
export const movementKindWords = (kind) => T.movementKinds[kind] || T.movementKinds.other;

/** '+12' for stock that came in and '-3' for stock that left (a plain sign, so it reads the same everywhere) */
export const changeText = (change) => {
  const n = Number(change);
  if (!Number.isFinite(n)) return T.noValue;
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatQty(Math.abs(n))}`;
};

/** The address of a stock change on the current screen, where it can still be edited, submitted, cancelled and printed */
export const entryAddress = (entry) => `/inventory/stock-entries/${encodeURIComponent(entry)}`;

export const whenWords = (row, now) => whenLabel(row.date, row.time, now);

/**
 * The dates a movements period covers, as yyyy-mm-dd: Today, 7 days, 30 days (today included) or a custom range.
 * Returns {} for a custom range that is incomplete, so the server uses its own last 30 days.
 */
export const periodDates = (period, from, to, now = new Date()) => {
  const day = (offset) => isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset));
  if (period === 'today') return { from: day(0), to: day(0) };
  if (period === '7d') return { from: day(6), to: day(0) };
  if (period === 'custom') return from && to ? { from, to } : {};
  return { from: day(29), to: day(0) };
};

// ---------- Where things go ----------
/** The address of Reorder: a new purchase with the product filled in */
export const reorderPath = (itemCode) => `/purchases/new?item=${encodeURIComponent(itemCode || '')}`;

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

/** The rows listed on Overview or Low stock; the value column only when the person may see value */
export const stockCsv = (rows, showValue) => {
  const C = T.csv;
  const head = [C.product, C.code, C.category, C.inStock, C.unit, ...(showValue ? [C.value] : []), C.level, C.warning];
  return toCsv([
    head,
    ...rows.map((r) => [
      r.item_name,
      r.item_code,
      r.category,
      r.qty,
      unitWords(r.unit, r.qty),
      ...(showValue ? [r.value] : []),
      levelView(r.level).words,
      r.warning_level === null || r.warning_level === undefined ? '' : r.warning_level,
    ]),
  ]);
};

export const movementsCsv = (rows) => {
  const C = T.csv;
  return toCsv([
    [C.date, C.time, C.product, C.code, C.store, C.type, C.change, C.after, C.status, C.reason, C.reference],
    ...rows.map((r) => [
      r.date,
      r.time,
      r.item_name,
      r.item_code,
      r.warehouse,
      movementKindWords(r.kind),
      r.qty_change,
      r.qty_after === null || r.qty_after === undefined ? '' : r.qty_after,
      statusView(r.status).words,
      r.reason ? T.reasons[r.reason] || '' : '',
      r.reference,
    ]),
  ]);
};

export const expiryCsv = (rows, showValue) => {
  const C = T.csv;
  return toCsv([
    [C.product, C.code, C.batch, C.store, C.inStock, C.unit, C.expires, C.daysLeft, C.status, ...(showValue ? [C.value] : [])],
    ...rows.map((r) => [r.item_name, r.item_code, r.batch_no, r.warehouse, r.qty, unitWords(r.unit, r.qty), r.expiry_date, r.days_left, expiryView(r.state).words, ...(showValue ? [r.value] : [])]),
  ]);
};

export const csvFor = (tab, rows, showValue) => {
  if (tab === 'movements') return movementsCsv(rows);
  if (tab === 'expiry') return expiryCsv(rows, showValue);
  return stockCsv(rows, showValue);
};
export const csvName = (tab, date) => fill(T.exportName, { tab, date });

// ---------- Money ----------
export const valueText = (value) => (value === null || value === undefined ? T.noValue : formatMoney(value));

// ---------- The short forms ----------
export const REASONS = ['damaged', 'expired', 'lost', 'used_in_shop', 'other'];

/** The reasons as options for the choice box, in the order of the Spec */
export const reasonOptions = () => REASONS.map((value) => ({ value, label: T.stockOutDialog.reasonOptions[value] }));

/** A typed quantity as a number: digits with an optional decimal point; 0 when it is not a number */
export const parseQty = (text) => {
  const clean = String(text === null || text === undefined ? '' : text).replace(/,/g, '').trim();
  if (!/^\d*\.?\d*$/.test(clean) || clean === '' || clean === '.') return 0;
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

/** What is wrong with a Stock in form, by field; an empty object means it can be saved */
export const stockInProblems = ({ product, qty }) => {
  const problems = {};
  if (!product) problems.product = T.picker.required;
  if (!(parseQty(qty) > 0)) problems.qty = T.stockInDialog.quantityRequired;
  return problems;
};

/**
 * What is wrong with a Stock out or write-off form, by field; an empty object means it can be saved. A reason is
 * always needed (acceptance check AC-27), and the reason Other also needs a note.
 */
export const stockOutProblems = ({ product, qty, reason, note }) => {
  const problems = {};
  if (!product) problems.product = T.picker.required;
  const n = parseQty(qty);
  if (!(n > 0)) problems.qty = T.stockOutDialog.quantityRequired;
  else if (product && n > Number(product.qty)) problems.qty = fill(T.stockOutDialog.tooMany, { qty: formatQty(product.qty) });
  if (!reason) problems.reason = T.stockOutDialog.reasonRequired;
  else if (reason === 'other' && !String(note || '').trim()) problems.note = T.stockOutDialog.noteRequired;
  return problems;
};

// ---------- The guided count ----------
/** The number typed in a Counted box: null when empty, NaN when it is not a number, else the number */
export const countedValue = (text) => {
  const clean = String(text === null || text === undefined ? '' : text).replace(/,/g, '').trim();
  if (clean === '') return null;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(clean)) return Number.NaN;
  return Number(clean);
};

/**
 * The difference of one line: counted minus expected, in words with an icon (Short, Over or Matches), and nothing
 * until the product has been counted.
 */
export const differenceInfo = (expected, counted) => {
  if (counted === null || counted === undefined || Number.isNaN(counted)) return { kind: 'none', tone: 'neutral', icon: null, amount: 0, words: T.count.notCounted };
  const diff = Math.round((Number(counted) - Number(expected)) * 1000) / 1000;
  if (diff === 0) return { kind: 'matches', tone: 'good', icon: 'check', amount: 0, words: T.count.matches };
  if (diff < 0) return { kind: 'short', tone: 'bad', icon: 'alert', amount: diff, words: fill(T.count.short, { amount: formatQty(Math.abs(diff)) }) };
  return { kind: 'over', tone: 'warn', icon: 'arrowUp', amount: diff, words: fill(T.count.over, { amount: formatQty(diff) }) };
};

/** The lines that were counted (a valid number typed), with their differences, in the order of the sheet */
export const countedLines = (rows, typed) =>
  rows
    .map((row) => {
      const counted = countedValue(typed[row.item_code]);
      return { row, counted, info: differenceInfo(row.expected, counted) };
    })
    .filter((line) => line.counted !== null && !Number.isNaN(line.counted));

/** Lines counted, short, over and matching, and the net difference in units */
export const countTotals = (lines) => ({
  counted: lines.length,
  short: lines.filter((l) => l.info.kind === 'short').length,
  over: lines.filter((l) => l.info.kind === 'over').length,
  matches: lines.filter((l) => l.info.kind === 'matches').length,
  net: Math.round(lines.reduce((sum, l) => sum + l.info.amount, 0) * 1000) / 1000,
});

/** The net difference as words, with a sign: '+2', '-1' or 'Matches' */
export const netWords = (net) => (net === 0 ? T.count.matches : changeText(net));

/** What the page sends: the counted lines as { item_code, counted } */
export const countPayload = (lines) => lines.map((l) => ({ item_code: l.row.item_code, counted: l.counted }));

/** Is a typed value something a Counted box cannot take? (not empty, but not a number) */
export const countedInvalid = (text) => Number.isNaN(countedValue(text));
