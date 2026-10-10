/**
 * What the till needs to keep selling when it is reopened without a connection:
 * the product list (names, prices, barcodes) and the cashier's open shift.
 * Saved each time they load online; cleared on sign-out with the rest of the session.
 */

export const CATALOG_KEY = 'pos_offline_catalog';
export const SHIFT_KEY = 'pos_offline_shift';

// Only what the selling screen uses, to keep the copy small.
const PRODUCT_FIELDS = [
  'name', 'item_code', 'item_name', 'description', 'image', 'item_group',
  'price', 'standard_rate', 'stock_uom', 'barcode', 'barcodes',
];

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the till still works online.
  }
};

export const trimProduct = (product) =>
  Object.fromEntries(PRODUCT_FIELDS.filter((f) => product[f] !== undefined).map((f) => [f, product[f]]));

export const saveCatalog = (company, products) => {
  if (!company || !Array.isArray(products) || products.length === 0) return;
  write(CATALOG_KEY, { company, savedAt: Date.now(), products: products.map(trimProduct) });
};

/** The saved product list for this business, or [] when none. */
export const loadCatalog = (company) => {
  const saved = read(CATALOG_KEY);
  return saved && saved.company === company && Array.isArray(saved.products) ? saved.products : [];
};

export const saveShift = (company, user, entry) => {
  if (!company || !user || !entry?.name) return;
  write(SHIFT_KEY, {
    company,
    user,
    entry: { name: entry.name, pos_profile: entry.pos_profile, user: entry.user, status: entry.status || 'Open' },
  });
};

export const clearShift = () => {
  try {
    localStorage.removeItem(SHIFT_KEY);
  } catch {
    // nothing to do
  }
};

/** The open shift saved for this person and business, or null. */
export const loadShift = (company, user) => {
  const saved = read(SHIFT_KEY);
  return saved && saved.company === company && saved.user === user ? saved.entry : null;
};
