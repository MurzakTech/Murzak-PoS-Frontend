import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { quantityText, unitLabel } from './unitWords';
import T from './strings.products';

/**
 * The plain rules of the Products page, the Categories tab and the New product form: no screen, no network.
 * Everything here is a function of its arguments, so each rule is tested with a few lines of data.
 */

export const TAB_KEYS = ['products', 'categories'];
export const PRODUCTS_PATH = '/new-look/products';
export const CATEGORIES_PATH = '/new-look/products/categories';
export const NEW_PRODUCT_PATH = '/new-look/products/new';

/** Which tab an address is on */
export const tabFromPath = (pathname) => (/\/products\/categories\/?$/.test(String(pathname || '')) ? 'categories' : 'products');

/** The tabs as { key, label, to } */
export const productsTabs = () => TAB_KEYS.map((key) => ({ key, label: T.tabs[key], to: key === 'categories' ? CATEGORIES_PATH : PRODUCTS_PATH }));

// ---------- Words for data ----------

/** The top category the server uses when none is chosen reads "No category" */
export const isRootCategory = (name) => name === T.rootCategory;
export const categoryLabel = (name) => (!name || isRootCategory(name) ? T.noCategory : name);

/** The Status label of a product: StatusLabel needs one of its own names, and the words */
export const statusView = (status) => {
  switch (status) {
    case 'low':
      return { status: 'unpaid', words: T.status.low };
    case 'out':
      return { status: 'overdue', words: T.status.out };
    case 'disabled':
      return { status: 'disabled', words: T.status.disabled };
    case 'not_tracked':
      return { status: 'not-counted', words: T.status.notTracked };
    default:
      return { status: 'paid', words: T.status.ok };
  }
};

/** "12 pieces", or a dash for a product that is not counted (a service) */
export const stockText = (row) => (row.stock === null || row.stock === undefined ? T.noValue : quantityText(row.stock, row.unit));

/** Does the row carry a cost price at all? (Absent for a cashier.) */
export const hasCost = (row) => Object.prototype.hasOwnProperty.call(row, 'cost_price');

/** Profit per item from the price and the cost, as numbers; null when either is missing. A negative number is a loss. */
export const profitOf = (price, cost) => {
  if (price === '' || price === null || price === undefined || cost === '' || cost === null || cost === undefined) return null;
  const p = Number(price);
  const c = Number(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0) return null;
  return Math.round((p - c) * 100) / 100;
};

/** "Profit per item: KES 40", or "Loss per item: KES 10" when the cost is above the price; '' when it cannot be worked out */
export const profitLine = (price, cost) => {
  const profit = profitOf(price, cost);
  if (profit === null) return '';
  return profit < 0 ? fill(T.form.loss, { amount: formatMoney(Math.abs(profit)) }) : fill(T.form.profit, { amount: formatMoney(profit) });
};

// ---------- The list ----------

/** The Show dropdown: the value is what goes in the address ('' is the default view) */
export const showOptions = () => ['', 'low', 'out', 'disabled', 'all'].map((value) => ({ value, label: T.show[value || 'active'] }));

/** The Category dropdown from the categories the server gave */
export const categoryOptions = (categories = []) => [
  { value: '', label: T.filters.allCategories },
  ...categories.map((c) => ({ value: c.name, label: categoryLabel(c.name) })),
];

/** A filter value that is not one the dropdown offers is the default */
export const showFromParam = (value) => (['low', 'out', 'disabled', 'all'].includes(value) ? value : '');

/** The address of the list with a category chosen */
export const categoryAddress = (name) => `${PRODUCTS_PATH}?category=${encodeURIComponent(name)}`;

/** Where Edit goes: there is no redesigned edit screen yet, so it is the current Products screen */
export const EDIT_FALLBACK = '/products';

// ---------- Export ----------

const csvCell = (value) => `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;

export const csvName = (isoDay) => fill(T.exportName, { date: isoDay });

export const isoDay = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** The rows on screen as a spreadsheet file. The cost column is there only when the rows carry a cost (never for a cashier). */
export const csvFor = (rows, withCost = false) => {
  const head = [T.csv.code, T.csv.name, T.csv.category, T.csv.price, ...(withCost ? [T.csv.cost] : []), T.csv.stock, T.csv.unit, T.csv.status, T.csv.barcode];
  const lines = rows.map((r) => [
    r.item_code,
    r.item_name,
    categoryLabel(r.category),
    r.price,
    ...(withCost ? [r.cost_price] : []),
    r.stock === null || r.stock === undefined ? '' : r.stock,
    r.unit ? unitLabel(r.unit) : '',
    statusView(r.status).words,
    r.barcode,
  ]);
  return [head, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n');
};

// ---------- The New product form ----------

export const EMPTY_FORM = { name: '', price: '', cost: '', stock: '', warning: '', unit: T.defaultUnit, category: '', barcode: '' };

/** A new form: everything blank, with the category and unit kept when asked */
export const freshForm = (keep = {}) => ({ ...EMPTY_FORM, unit: keep.unit || EMPTY_FORM.unit, category: keep.category || '' });

/** Has anything been typed or chosen that the blank form does not have? */
export const isDirty = (values, baseline = EMPTY_FORM) => Object.keys(EMPTY_FORM).some((key) => String(values[key] || '') !== String(baseline[key] || ''));

/** A quantity as typed: digits and one decimal point */
export const cleanQuantity = (text) => {
  const only = String(text || '').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = only.split('.');
  return rest.length ? `${whole}.${rest.join('')}` : whole;
};

/** The ids of the fields (the summary links to them) in the order they appear */
export const FIELD_IDS = {
  name: 'np-name',
  price: 'np-price',
  cost: 'np-cost',
  stock: 'np-stock',
  warning: 'np-warning',
  unit: 'np-unit',
  category: 'np-category',
  barcode: 'np-barcode',
  general: 'np-top',
};
export const FIELD_ORDER = ['name', 'price', 'cost', 'stock', 'warning', 'unit', 'category', 'barcode', 'general'];
/** The fields that live under More options */
export const MORE_FIELDS = ['cost', 'stock', 'warning', 'unit', 'category', 'barcode'];

/** What is wrong with the form before it is sent: { name?, price? }. Only the name and the price are required. */
export const checkForm = (values) => {
  const problems = {};
  const name = String(values.name || '').trim();
  if (!name) problems.name = T.form.nameRequired;
  else if (name.length > 140) problems.name = T.form.nameTooLong;
  if (String(values.price === undefined || values.price === null ? '' : values.price).trim() === '') problems.price = T.form.priceRequired;
  return problems;
};

/** The problems as the form summary wants them: [{ id, message }] in the order of the form */
export const summaryOf = (problems) =>
  FIELD_ORDER.filter((key) => problems[key]).map((key) => ({ id: FIELD_IDS[key], message: problems[key] }));

/** What is sent to the server. Cost only goes when the person may see it. */
export const requestFrom = (values, { canSeeCost = false } = {}) => ({
  name: String(values.name || '').trim(),
  price: values.price,
  unit: values.unit,
  category: values.category,
  barcode: String(values.barcode || '').trim(),
  stock: values.stock,
  warning: values.warning,
  ...(canSeeCost ? { cost: values.cost } : {}),
});

/** The units to offer: the common ones first, then the rest A to Z, each in plain words. The default is always there. */
export const unitOptions = (uoms = []) => {
  const names = new Set(uoms.map((u) => u.name));
  names.add(T.defaultUnit);
  const rank = (name) => {
    const at = T.commonUnits.indexOf(name);
    return at === -1 ? T.commonUnits.length : at;
  };
  // Two stored names with the same plain word (Ltr and Litre) are one choice for the person: keep the first
  const seen = new Set();
  return [...names]
    .sort((a, b) => rank(a) - rank(b) || unitLabel(a).localeCompare(unitLabel(b)))
    .filter((name) => {
      const label = unitLabel(name).toLowerCase();
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .map((name) => ({ value: name, label: unitLabel(name) }));
};

/** The category chips: every category except the top one, with the chosen one always among the first `limit` */
export const chipCategories = (categories = [], chosen = '', { showAll = false, limit = 12 } = {}) => {
  const all = categories.filter((c) => !isRootCategory(c.name));
  if (showAll || all.length <= limit) return all;
  const first = all.slice(0, limit);
  if (!chosen || first.some((c) => c.name === chosen)) return first;
  const picked = all.find((c) => c.name === chosen);
  return picked ? [...first.slice(0, limit - 1), picked] : first;
};

// ---------- Categories ----------

/** The parent choices for a category: the top level, then the others (not the category itself) */
export const parentOptions = (categories = [], self = '') => [
  { value: T.rootCategory, label: T.categories.topLevel },
  ...categories.filter((c) => !isRootCategory(c.name) && c.name !== self).map((c) => ({ value: c.name, label: c.name })),
];

/** Can this category be deleted from here? Not the top one, and not while products sit in it. */
export const canDeleteCategory = (category) => !isRootCategory(category.name) && !Number(category.product_count);
