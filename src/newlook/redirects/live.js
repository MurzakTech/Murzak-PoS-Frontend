import { useSyncExternalStore } from 'react';

/**
 * Which redesigned pages are real, and the owner's "preview the redirects" switch.
 *
 * A redirect from an old address to a new page is switched on only when the new page is a finished screen
 * (BUILT_PAGES), so turning the New look on never takes anyone from a working screen to an empty one. Each
 * ticket that finishes a page adds its address here, in the same change. Until then the old screen keeps
 * working at its old address and the sidebar keeps opening it.
 *
 * The preview switch lets the owner see every redirect working now: with it on, every old address redirects to
 * its new page, and a page that is not finished yet shows a "being rebuilt" notice with a way back to the
 * current screen. It is stored on this device only and never changes anything for other people.
 */
// Finished pages. With the New look on, their old addresses open them. Held back on purpose:
//   /till                        the till is the current screen with the New look parts inside it, not a separate page
//   /sales/new                   the New invoice form is not redesigned yet
//   /stock/locations, /transfers they only link to the current Stores and Stock transfers screens, so redirecting those would loop
//   /reports/stock-movement, /reports/performance  they only link to the current screens
export const BUILT_PAGES = [
  '/',
  // Sales (P3-8)
  '/sales',
  '/sales/unpaid',
  '/sales/returns',
  '/sales/sessions',
  // Customers (P4-7)
  '/customers',
  '/customers/owing',
  '/customers/new',
  // Products (P4-1, P4-2)
  '/products',
  '/products/categories',
  '/products/new',
  '/products/import',
  // Stock levels (P4-3, P4-4)
  '/stock',
  '/stock/low',
  '/stock/movements',
  '/stock/count',
  '/stock/expiry',
  // Purchases (P4-5)
  '/purchases',
  '/purchases/orders',
  '/purchases/returns',
  '/purchases/new',
  // Suppliers (P4-6)
  '/suppliers',
  // Expenses (P5-1)
  '/expenses',
  // Reports (P5-2); Stock movement and Performance only link to the current screens, so they stay out
  '/reports',
  '/reports/sales',
  '/reports/profit',
  '/reports/owed',
  '/reports/running-costs',
  '/reports/stock-summary',
  '/reports/stock-value',
  '/reports/aging-stock',
  // Settings (P5-3, P7-3): the six sections
  '/settings/business',
  '/settings/till',
  '/settings/tax',
  '/settings/team',
  '/settings/advanced',
  '/settings/brand',
];
export const PREVIEW_KEY = 'murzak_new_look:preview-redirects';

const listeners = new Set();
const read = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY) === '1';
  } catch (e) {
    return false;
  }
};
let preview = read();

export const getPreview = () => preview;
export const setPreview = (on) => {
  preview = Boolean(on);
  try {
    localStorage.setItem(PREVIEW_KEY, preview ? '1' : '0');
  } catch (e) {
    // Not critical; the choice just lasts until the page closes
  }
  listeners.forEach((l) => l());
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
/** Re-reads the stored choice (used by tests, and when another tab changes it) */
export const resyncPreview = () => {
  preview = read();
  listeners.forEach((l) => l());
};

export const usePreviewRedirects = () => useSyncExternalStore(subscribe, getPreview, () => false);

/** Is this new page a finished screen, or is the preview on? `path` is the unprefixed address, such as '/sales'. */
export const isPageLive = (path, previewOn = preview, built = BUILT_PAGES) => previewOn || built.includes(path.split('?')[0]);
