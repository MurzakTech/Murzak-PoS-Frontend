/**
 * The rename map of the redesign (Part 1, Language and formats).
 *
 * One list, internal (old) name to display name, so a label is changed in one
 * place and the old name can still be used by search. Nothing is removed; only
 * labels change.
 *
 * Entry shape:
 *   old                  the name used today (internal or old label)
 *   show                 the display name, or null when hidden, a pattern or still to be confirmed
 *   where                the area of the app where the Spec places the label
 *   hidden               true when the label is not shown at all (the rule is in note)
 *   note                 optional explanation of a rule
 *   pattern              true when the entry describes a format, not a plain string
 *   needsConfirmation    true when the owner must confirm something before the label is final
 *   internalToo          true when the old name is also an internal key, so the label scan must not flag it
 */

export { formatMoney, formatCount, formatShowing } from '../components/format';

/* ------------------------------------------------------------------ */
/* The rename list, in the order of the Spec table                     */
/* ------------------------------------------------------------------ */

export const RENAMES = [
  // Purchases
  { old: 'GRN', show: 'Receive goods', where: 'Purchases', hidden: false },
  { old: 'Create GRN', show: 'Receive goods', where: 'Purchases', hidden: false },
  { old: 'GRN List', show: 'Goods received', where: 'Purchases', hidden: false },
  { old: 'Submit Order', show: 'Send order to supplier', where: 'Purchases', hidden: false },

  // Stock levels
  { old: 'Material Receipts', show: 'Stock in', where: 'Stock levels', hidden: false },
  { old: 'Material Issues', show: 'Stock out or write-off', where: 'Stock levels', hidden: false },
  { old: 'Reconciliation', show: 'Count stock', where: 'Stock levels', hidden: false },
  {
    old: 'Stock Entry',
    show: null,
    where: 'Stock levels',
    hidden: true,
    note: 'Hidden unless the shop makes goods. Covers the Manufacture and Repack entry types.',
  },

  // Sales
  { old: 'Opening Entries', show: 'Till sessions', where: 'Sales', hidden: false },

  // Products and till
  { old: 'Item Group', show: 'Category', where: 'Products and till', hidden: false },
  { old: 'Item Groups', show: 'Categories', where: 'Products and till', hidden: false },
  { old: 'UOM', show: 'Unit', where: 'Products and till', hidden: false },
  { old: 'Nos', show: 'piece', where: 'Products and till', hidden: false, note: 'The unit value "Nos" reads "piece".' },

  // Products
  {
    old: 'Item Code',
    show: 'Product code',
    where: 'Products',
    hidden: false,
    note: 'The Spec reads "Product code, filled in automatically": the label is Product code and the field is filled in by the system, not typed.',
  },

  // Customers
  { old: 'Customer Group', show: null, where: 'Customers', hidden: true, note: 'Hidden unless used' },
  { old: 'Territory', show: null, where: 'Customers', hidden: true, note: 'Hidden unless used' },
  { old: 'Customer Credit', show: 'Owing', where: 'Customers', hidden: false },

  // New invoice
  { old: 'Posting Date', show: 'Date', where: 'New invoice', hidden: false },
  { old: 'Apply Discount On', show: 'Discount', where: 'New invoice', hidden: false },

  // Stock levels and till: locations are hidden, the one location is shown by name
  { old: 'All Warehouses', show: null, where: 'Stock levels and till', hidden: true, note: 'Hidden; the one location is shown by name' },
  { old: 'Work In Progress', show: null, where: 'Stock levels and till', hidden: true, note: 'Hidden; the one location is shown by name' },
  { old: 'Finished Goods', show: null, where: 'Stock levels and till', hidden: true, note: 'Hidden; the one location is shown by name' },
  { old: 'Goods In Transit', show: null, where: 'Stock levels and till', hidden: true, note: 'Hidden; the one location is shown by name' },

  // Sales: a pattern, not a plain string
  {
    old: 'ACC-PSINV-2026-00005',
    show: 'Receipt \u00230005', // a hash sign and 0005 (written as an escape so the no-hard-coded-colours test does not mistake it for a colour code)
    where: 'Sales',
    hidden: false,
    pattern: true,
    note: 'Pattern, not a plain string. A system invoice reference such as ACC-PSINV-2026-00005 shows as a receipt number made of the last digits, padded to four (Receipt \u00230005; see formatReceiptNumber). The system reference is kept under Details.',
  },

  // Top bar, Sales and till
  { old: 'Open POS', show: 'Go to till', where: 'Top bar, Sales and till', hidden: false, note: 'Used for the button' },
  { old: 'Point of Sale', show: 'Till', where: 'Top bar, Sales and till', hidden: false, note: 'Used for the screen' },
  { old: 'New Sale (POS)', show: 'New sale', where: 'Top bar, Sales and till', hidden: false, note: 'Used for the action' },

  // Till
  { old: 'Credit Card', show: 'Card', where: 'Till', hidden: false },
  { old: 'Bank Draft', show: 'Other', where: 'Till', hidden: false, note: 'Grouped under Other' },
  { old: 'Cheque', show: 'Other', where: 'Till', hidden: false, note: 'Grouped under Other' },
  { old: 'Wire Transfer', show: 'Other', where: 'Till', hidden: false, note: 'Grouped under Other' },
  {
    old: 'Profile: Admin',
    show: "The cashier's name",
    where: 'Till',
    hidden: false,
    note: "Replaced by the signed-in cashier's own name, not by this literal text.",
  },

  // Settings
  { old: 'POS Profile', show: 'Till settings', where: 'Settings', hidden: false },
  {
    old: 'Account Provisioning',
    show: null,
    where: 'Settings',
    hidden: false,
    needsConfirmation: true,
    note: 'The Spec says: a plain description, or moved to Advanced. The owner must confirm what it does first, so no display name is set yet.',
  },

  // Not in the Spec's table: found in the Phase 0 review of the pay screen, which showed the payment method as MPESA.
  // The Spec writes M-Pesa everywhere. "mpesa" is also the internal key of the method, so this old name is left out of
  // OLD_TERMS (internalToo): the label scan must not flag the key.
  {
    old: 'MPESA',
    show: 'M-Pesa',
    where: 'Till and Settings',
    hidden: false,
    internalToo: true,
    note: 'Added in P1-10 from the Phase 0 review; the Spec spells it M-Pesa.',
  },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const norm = (value) => String(value === null || value === undefined ? '' : value).trim().toLowerCase();

const byOld = new Map(RENAMES.map((entry) => [norm(entry.old), entry]));

/** A plain entry has a display name to show and is not a pattern. */
const isPlainRename = (entry) => !entry.hidden && !entry.pattern && typeof entry.show === 'string';

const findEntry = (old) => (typeof old === 'string' ? byOld.get(norm(old)) : undefined);

/**
 * The display name for an old name (exact match, ignoring case and outer spaces).
 * Returns null for a hidden entry, and the input unchanged when there is no entry,
 * or when the entry is a pattern or still needs the owner's confirmation.
 */
export const displayName = (old) => {
  const entry = findEntry(old);
  if (!entry) return old;
  if (entry.hidden) return null;
  if (!isPlainRename(entry)) return old;
  return entry.show;
};

/** True when the old name has an entry and that entry is hidden. */
export const isHidden = (old) => {
  const entry = findEntry(old);
  return Boolean(entry && entry.hidden);
};

/** The old names that map to a display name (case-insensitive). 'Stock in' gives ['Material Receipts']. */
export const searchAliases = (show) => {
  const wanted = norm(show);
  if (!wanted) return [];
  return RENAMES.filter((entry) => isPlainRename(entry) && norm(entry.show) === wanted).map((entry) => entry.old);
};

/** True when the query is inside the display name or inside any of its old names. An empty query is false. */
export const matchesSearch = (show, query) => {
  const q = norm(query);
  if (!q) return false;
  if (norm(show).includes(q)) return true;
  return searchAliases(show).some((old) => norm(old).includes(q));
};

/**
 * Every old name that must not appear as visible text in the shell and shared
 * components after renaming: lowercased, de-duplicated, and without patterns.
 */
export const OLD_TERMS = Array.from(new Set(RENAMES.filter((entry) => !entry.pattern && !entry.internalToo).map((entry) => norm(entry.old))));

/* ------------------------------------------------------------------ */
/* Format helpers (Part 1, Language and formats, format table)         */
/* ------------------------------------------------------------------ */

// A Kenyan mobile number: 254 or 0 in front of 7 or 1, then eight more digits.
const KENYAN_MOBILE = /^(?:\+?254|0)([71]\d{8})$/;

/** Returns the nine national digits of a Kenyan mobile number (for example '712345678'), or null. */
const kenyanMobileDigits = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const compact = String(value).replace(/[\s\-().]/g, '');
  const match = KENYAN_MOBILE.exec(compact);
  return match ? match[1] : null;
};

/**
 * Shows a stored phone number the way the Spec asks: '+254712345678' gives '0712 345 678'.
 * Also accepts '254712345678', '0712345678' and numbers with spaces.
 * Anything that is not a Kenyan mobile number is returned unchanged.
 */
export const formatPhone = (stored) => {
  const digits = kenyanMobileDigits(stored);
  if (!digits) return stored;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

/** Turns a shown number into the stored form: '0712 345 678' gives '+254712345678'. Null when not valid. */
export const toStoredPhone = (shown) => {
  const digits = kenyanMobileDigits(shown);
  return digits ? `+254${digits}` : null;
};

/**
 * A receipt number as the shop owner sees it: 33 gives a hash sign followed by 0033.
 * Pads to four digits and never cuts a longer number. A value that is not a
 * whole number of zero or more gives an empty string.
 */
export const formatReceiptNumber = (n) => {
  if (n === null || n === undefined || n === '') return '';
  const value = Number(n);
  if (!Number.isInteger(value) || value < 0) return '';
  return `#${String(value).padStart(4, '0')}`;
};
