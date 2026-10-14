import { formatMoney } from '../components/format';
import { whatsappNumber, money } from '../home/homeModel';
import { formatPhone, toStoredPhone } from '../labels/renameMap';
import fill from '../labels/fill';
import S from '../strings';
import T from './strings.customers';

/**
 * The decisions of the Customers page, as plain functions (ticket P4-7): the tabs, how a date, a phone number or a status reads,
 * the spreadsheet (CSV) of what is on screen, the WhatsApp messages and links, the statement period, and the checks on the
 * customer form. Nothing here draws anything or calls the server, so each rule can be tested alone.
 */
export const TAB_KEYS = ['all', 'owing'];
export const DEFAULT_TAB = 'all';
export const TYPES = ['Individual', 'Company', 'Partnership'];
export const STATUS_KEYS = ['active', 'disabled', 'all'];
export const DEFAULT_STATUS = 'active';

/** The tab named in the address; the Owing tab only for a person who may see balances. Anything else is All customers. */
export const tabFromParam = (value, canSeeMoney = true) => (value === 'owing' && canSeeMoney ? 'owing' : DEFAULT_TAB);

/** The tabs as { key, label } in the order they are shown; a cashier has no Owing tab */
export const customerTabs = (canSeeMoney = true) => TAB_KEYS.filter((key) => key !== 'owing' || canSeeMoney).map((key) => ({ key, label: T.tabs[key] }));

/** The status filter named in the address, or Active when it is missing or unknown */
export const statusFromParam = (value) => (STATUS_KEYS.includes(value) ? value : DEFAULT_STATUS);
export const typeFromParam = (value) => (TYPES.includes(value) ? value : '');

/**
 * The address of a tab. A tab keeps the rows per page the person chose, and starts again from the first page with no search,
 * no filters and no open customer.
 */
export const tabAddress = (base, tab, search = '') => {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  ['size'].forEach((key) => {
    if (current.get(key)) next.set(key, current.get(key));
  });
  if (tab !== DEFAULT_TAB) next.set('tab', tab);
  const text = next.toString();
  return text ? `${base}?${text}` : base;
};

/** The address that opens the customer's panel on the list */
export const listAddress = (base, id) => `${base}?open=${encodeURIComponent(id)}`;

/** The address of the edit form for a customer number */
export const editAddress = (base, id) => `${base}/${encodeURIComponent(id)}/edit`;

// ---------- Dates and phone numbers ----------
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

/** '2026-10-13' gives '13/10/2026' for a table; anything else gives a dash */
export const dayNumbers = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : T.noValue;
};

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A stored phone number as it is shown: 0712 345 678. Nothing gives a dash. */
export const shownPhone = (mobile) => (mobile ? formatPhone(mobile) : T.noValue);

/** The last purchase for a table cell: the date, or a plain word when there is none */
export const lastPurchaseWords = (row) => (row && row.last_purchase && row.last_purchase.date ? dayWords(row.last_purchase.date) : T.never);

/** The date and, for a person who may see it, the amount: '13 Oct 2026, KES 250' */
export const lastPurchaseDetail = (purchase) => {
  if (!purchase || !purchase.date) return T.never;
  if (purchase.amount === undefined || purchase.amount === null) return dayWords(purchase.date);
  return fill(T.panel.lastPurchaseWith, { date: dayWords(purchase.date), amount: formatMoney(purchase.amount) });
};

/** The balance of a row as money, or nothing for a row that has no balance field (a cashier's list) */
export const hasBalance = (row) => row && row.balance !== undefined && row.balance !== null;

/**
 * The short number of a document, as the server writes it for the Sales list: the last digits of the name, at least four, after a
 * hash, with a letter in front for some kinds ('S' for a Sales Invoice). The system reference itself is never shown in a list.
 */
const AMENDED = /^(.*\d{5,})-\d{1,2}$/;
export const shortNumber = (name, letter = '') => {
  const text = String(name || '').trim();
  const found = /(\d+)$/.exec(text.replace(AMENDED, '$1'));
  return found ? `#${letter}${String(Number(found[1])).padStart(4, '0')}` : text;
};

// ---------- The spreadsheet of what is on screen ----------
// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so it gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const toCsv = (rows) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;

/** The rows listed on the page, with the balance columns only for a person who may see them */
export const customersCsv = (rows, canSeeMoney) => {
  const C = T.csv;
  const head = [C.customer, C.mobile, C.email, C.type, ...(canSeeMoney ? [C.balance] : []), C.lastPurchase, ...(canSeeMoney ? [C.lastAmount] : []), C.status];
  return toCsv([
    head,
    ...rows.map((r) => [
      r.name,
      shownPhone(r.mobile) === T.noValue ? '' : shownPhone(r.mobile),
      r.email || '',
      T.types[r.type] || r.type || '',
      ...(canSeeMoney ? [hasBalance(r) ? r.balance : ''] : []),
      r.last_purchase ? r.last_purchase.date : '',
      ...(canSeeMoney ? [r.last_purchase && r.last_purchase.amount !== undefined ? r.last_purchase.amount : ''] : []),
      r.disabled ? T.status.disabled : T.status.active,
    ]),
  ]);
};

export const csvName = (tab, date) => fill(T.exportName, { tab, date });

// ---------- WhatsApp (the app only prepares the link; the owner sends the message) ----------

const link = (mobile, text) => {
  const number = whatsappNumber(mobile);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '';
};

/** The ready message for a customer: a reminder when they owe (the wording of Home's reminder), a hello when they do not */
export const defaultMessage = ({ name, balance, shop }) => {
  const place = shop || T.whatsapp.shopFallback;
  if (Number(balance) > 0) return fill(S.home.attention.reminder, { name, amount: money(balance), shop: place });
  return fill(T.whatsapp.hello, { name, shop: place });
};

/** https://wa.me/254712345678?text=... or '' when the customer has no usable mobile number */
export const whatsappLink = (mobile, text) => link(mobile, text);

const LATEST_LINES = 5;

/** The short statement text: the balance and the last few lines. Money, dates and receipt numbers as everywhere else. */
export const statementText = ({ name, shop, balance, lines }) => {
  const place = shop || T.whatsapp.shopFallback;
  const latest = (lines || []).slice(-LATEST_LINES).reverse();
  const items = latest.length
    ? T.statement.itemsHead +
      latest
        .map((l) =>
          fill(T.statement.itemLine, {
            date: dayNumbers(l.date),
            what: T.statement.kinds[l.kind] || l.kind,
            receipt: l.receipt,
            amount: formatMoney(l.kind === 'sale' ? l.debit : l.credit),
          })
        )
        .join('')
    : '';
  const template = Number(balance) > 0 ? T.statement.message : T.statement.messageClear;
  return fill(template, { name, shop: place, balance: formatMoney(balance), items });
};

// ---------- The statement ----------

/** Last 30 days, last 90 days, this month: { from, to } as yyyy-mm-dd, for today's date */
export const statementRange = (preset, today = new Date()) => {
  const to = isoDay(today);
  if (preset === 'month') return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  const days = preset === '30d' ? 30 : 90;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  return { from: isoDay(start), to };
};

/** The spreadsheet of a statement: one line per row, with the balance at the start and the end */
export const statementCsv = (statement) => {
  const S2 = T.statement;
  const rows = [
    [S2.columns.date, S2.columns.document, S2.columns.debit, S2.columns.credit, S2.columns.balance],
    [statement.from, S2.opening, '', '', statement.opening_balance],
    ...statement.lines.map((l) => [l.date, `${S2.kinds[l.kind] || l.kind} ${l.receipt}`, l.debit || '', l.credit || '', l.balance]),
    [statement.to, S2.closing, '', '', statement.closing_balance],
  ];
  return toCsv(rows);
};

/** A file name part from a customer name: letters, digits and dashes only */
export const fileSafe = (name) => String(name || 'customer').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';

// ---------- The customer form ----------

/**
 * A typed Kenyan mobile number in its stored form (+254712345678), or null. Accepts 0712 345 678, +254 712 345 678, 254712345678
 * and the nine digits without the zero (712345678).
 */
export const storedMobile = (text) => {
  let compact = String(text || '').replace(/[\s\-().]/g, '');
  if (/^[17]\d{8}$/.test(compact)) compact = `0${compact}`;
  return toStoredPhone(compact);
};

export const emptyForm = () => ({ name: '', mobile: '', email: '', taxId: '', type: 'Individual', group: '', area: '', disabled: false });

/** The form's values for a customer from the server (the stored phone number is shown as 0712 345 678) */
export const formFromCustomer = (c) => ({
  name: c.name || '',
  mobile: c.mobile ? formatPhone(c.mobile) : '',
  email: c.email || '',
  taxId: c.tax_id || '',
  type: TYPES.includes(c.type) ? c.type : 'Individual',
  group: c.group || '',
  area: c.territory || '',
  disabled: Boolean(c.disabled),
});

const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const KRA_PIN = /^[A-Z]\d{9}[A-Z]$/i;

/**
 * What is wrong with the form, by field: { name, mobile, email, taxId }. An empty object means it can be saved.
 * The mobile number must be a Kenyan number, except when editing a customer whose number is not changed (an old record may have
 * none, or a number from elsewhere, and must still be editable).
 */
export const formProblems = (values, original = null) => {
  const problems = {};
  if (!String(values.name || '').trim()) problems.name = T.form.nameRequired;
  const mobile = String(values.mobile || '').trim();
  const unchanged = original && mobile === String(original.mobile || '').trim();
  if (!mobile) {
    if (!(original && !String(original.mobile || '').trim())) problems.mobile = T.form.mobileRequired;
  } else if (!unchanged && !storedMobile(mobile)) {
    problems.mobile = T.form.mobileInvalid;
  }
  const email = String(values.email || '').trim();
  if (email && !EMAIL.test(email)) problems.email = T.form.emailInvalid;
  const pin = String(values.taxId || '').trim();
  if (pin && !KRA_PIN.test(pin)) problems.taxId = T.form.pinInvalid;
  return problems;
};

/** The values the server is given: the mobile number in its stored form (+254712345678), the PIN in capitals */
export const toServerValues = (values, original = null) => {
  const mobile = String(values.mobile || '').trim();
  const keep = original && mobile === String(original.mobile || '').trim();
  return {
    name: String(values.name || '').trim(),
    mobile: keep ? undefined : storedMobile(mobile) || mobile,
    email: String(values.email || '').trim(),
    taxId: String(values.taxId || '').trim().toUpperCase(),
    type: values.type,
    group: values.group || undefined,
    territory: values.area || undefined,
  };
};

/** Whether anything in the form differs from where it started */
export const isDirty = (values, start) => Object.keys(start).some((key) => values[key] !== start[key]);
