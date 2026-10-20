/**
 * What the till needs to keep selling when it is reopened without a connection:
 * the product list (names, prices, barcodes) and the cashier's open shift.
 * Saved each time they load online; cleared on sign-out with the rest of the session.
 * 
 * Uses IndexedDB for high-capacity, non-blocking storage (>100MB) to prevent
 * localStorage QuotaExceededError on large retail catalogs, with an in-memory
 * and localStorage cache for synchronous compatibility.
 */

import { idbGet, idbSet, idbDelete } from './indexedDb';

export const CATALOG_KEY = 'pos_offline_catalog';
export const SHIFT_KEY = 'pos_offline_shift';

// Only what the selling screen uses, to keep the copy small.
const PRODUCT_FIELDS = [
  'name', 'item_code', 'item_name', 'description', 'image', 'item_group',
  'price', 'standard_rate', 'stock_uom', 'barcode', 'barcodes',
];

// In-memory cache for fast synchronous access
let memoryCatalog = null;
let memoryShift = null;

const readLocalStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const writeLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full (QuotaExceededError) or unavailable: IndexedDB handles large datasets
  }
};

export const trimProduct = (product) =>
  Object.fromEntries(PRODUCT_FIELDS.filter((f) => product[f] !== undefined).map((f) => [f, product[f]]));

/**
 * Save catalog synchronously into memory & localStorage, and asynchronously into IndexedDB.
 */
export const saveCatalog = (company, products) => {
  if (!company || !Array.isArray(products) || products.length === 0) return;
  const payload = { company, savedAt: Date.now(), products: products.map(trimProduct) };
  memoryCatalog = payload;
  writeLocalStorage(CATALOG_KEY, payload);
  // Persist to IndexedDB asynchronously
  idbSet(CATALOG_KEY, payload).catch(() => {});
};

/**
 * Save catalog and return a Promise that resolves when persisted to IndexedDB.
 */
export const saveCatalogAsync = async (company, products) => {
  if (!company || !Array.isArray(products) || products.length === 0) return false;
  const payload = { company, savedAt: Date.now(), products: products.map(trimProduct) };
  memoryCatalog = payload;
  writeLocalStorage(CATALOG_KEY, payload);
  return idbSet(CATALOG_KEY, payload);
};

/**
 * Synchronous catalog loader: checks memory cache first, then localStorage.
 */
export const loadCatalog = (company) => {
  if (memoryCatalog && memoryCatalog.company === company && Array.isArray(memoryCatalog.products)) {
    return memoryCatalog.products;
  }
  const saved = readLocalStorage(CATALOG_KEY);
  if (saved && saved.company === company && Array.isArray(saved.products)) {
    memoryCatalog = saved;
    return saved.products;
  }
  return [];
};

/**
 * Asynchronous catalog loader: retrieves full catalog from IndexedDB, warms memory cache.
 */
export const loadCatalogAsync = async (company) => {
  if (memoryCatalog && memoryCatalog.company === company && Array.isArray(memoryCatalog.products)) {
    return memoryCatalog.products;
  }
  try {
    const idbSaved = await idbGet(CATALOG_KEY);
    if (idbSaved && idbSaved.company === company && Array.isArray(idbSaved.products)) {
      memoryCatalog = idbSaved;
      return idbSaved.products;
    }
  } catch {
    // fallback below
  }
  return loadCatalog(company);
};

export const saveShift = (company, user, entry) => {
  if (!company || !user || !entry?.name) return;
  const payload = {
    company,
    user,
    entry: { name: entry.name, pos_profile: entry.pos_profile, user: entry.user, status: entry.status || 'Open' },
  };
  memoryShift = payload;
  writeLocalStorage(SHIFT_KEY, payload);
  idbSet(SHIFT_KEY, payload).catch(() => {});
};

export const clearShift = () => {
  memoryShift = null;
  try {
    localStorage.removeItem(SHIFT_KEY);
  } catch {
    // nothing to do
  }
  idbDelete(SHIFT_KEY).catch(() => {});
};

/** The open shift saved for this person and business, or null. */
export const loadShift = (company, user) => {
  if (memoryShift && memoryShift.company === company && memoryShift.user === user) {
    return memoryShift.entry;
  }
  const saved = readLocalStorage(SHIFT_KEY);
  if (saved && saved.company === company && saved.user === user) {
    memoryShift = saved;
    return saved.entry;
  }
  return null;
};

/** Asynchronous shift loader from IndexedDB. */
export const loadShiftAsync = async (company, user) => {
  const sync = loadShift(company, user);
  if (sync) return sync;
  try {
    const idbSaved = await idbGet(SHIFT_KEY);
    if (idbSaved && idbSaved.company === company && idbSaved.user === user) {
      memoryShift = idbSaved;
      return idbSaved.entry;
    }
  } catch {
    // fallback to null
  }
  return null;
};

/** Clear all offline storage (catalog and shift) */
export const clearOfflineStorage = () => {
  memoryCatalog = null;
  memoryShift = null;
  try {
    localStorage.removeItem(CATALOG_KEY);
    localStorage.removeItem(SHIFT_KEY);
  } catch {
    // ignore
  }
  idbDelete(CATALOG_KEY).catch(() => {});
  idbDelete(SHIFT_KEY).catch(() => {});
};

/** Reset in-memory cache (for testing) */
export const _resetMemoryCacheForTest = () => {
  memoryCatalog = null;
  memoryShift = null;
};
