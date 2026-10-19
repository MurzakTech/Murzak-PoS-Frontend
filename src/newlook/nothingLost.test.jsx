/**
 * Ticket P6-5, acceptance check AC-40 (nothing lost): every action found by the Phase 0 audit (docs/redesign/P0-2-screen-audit.md,
 * section 4) is still reachable from the menu or a page button, and every old menu item has a place.
 *
 * What this file proves (it reads the real route list, the real redirect table and the real words):
 *   1. ACTIONS, the table of section 4. Each row names its home and the home is checked:
 *        page    a New look page that is a real screen (not a "being rebuilt" notice)
 *        words   a control whose label exists in the strings files (the browser run, docs/redesign/P6-5, presses each one)
 *        link    a link to a current screen: it carries the legacy marker, so the redirects leave it alone, and it is a real route
 *   2. Every route of the current app either opens a live New look page (resolveRedirect) or is linked from a New look screen.
 *   3. Every item of the old menu (the sidebar and the page sub-menus) has a place in the New look or in Settings, Advanced.
 */
import fs from 'fs';
import path from 'path';
import { matchPath } from 'react-router-dom';
import { protectedRoutes } from '../routes/routes';
import { oldScreen, resolveRedirect, NEW_LOOK_PREFIX } from './redirects/engine';
import { BUILT_PAGES } from './redirects/live';
import { newLookRoutes } from './newLookRoutes';
import { NAVIGATION, flatItems } from './shell/navigation';
import { ADVANCED_CARDS, OLD } from './settings/settingsModel';
import { MORE_SCREENS } from './products/productsModel';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: {} }));

const NEWLOOK = __dirname;

// ---------- Helpers: the words, the links, the routes ----------
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const sourceFiles = walk(NEWLOOK).filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\./.test(f) && !/redirects\/redirectTable\.js$/.test(f));
const stringsFiles = sourceFiles.filter((f) => /strings(\.[a-z]+)?\.js$/.test(f));

const collect = (value, out) => {
  if (typeof value === 'string') out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collect(v, out));
  return out;
};
// eslint-disable-next-line global-require, import/no-dynamic-require
const WORDS = stringsFiles.reduce((set, f) => collect(require(f).default, set), new Set());

// Every address of a current screen that the New look source writes down (a string starting with "/")
const LINKED = new Set();
sourceFiles.forEach((f) => {
  const text = fs.readFileSync(f, 'utf8');
  (text.match(/['"`]\/[A-Za-z0-9/_\-:]+/g) || []).forEach((m) => LINKED.add(m.slice(1)));
});
// A written address counts for a route when it is that route, or starts with the fixed part of it (a route with an :id)
const isLinked = (address) => {
  const fixed = address.replace(/\/:[A-Za-z0-9_]+.*$/, '');
  return LINKED.has(address) || [...LINKED].some((a) => a === fixed || a.startsWith(`${fixed}/`) || a.startsWith(address));
};

const flat = (list) => list.flatMap((r) => [r, ...flat(r.children || [])]);
const ROUTES = [...new Set(flat(protectedRoutes).map((r) => r.path))];

const live = (page) => BUILT_PAGES.includes(page.split('?')[0]);
const realNewRoutes = newLookRoutes.filter((r) => !r.element.name || r.element.name !== 'PagePlaceholder').map((r) => r.path);
const isRealNewPage = (page) => {
  const full = page === '/' ? NEW_LOOK_PREFIX : `${NEW_LOOK_PREFIX}${page}`;
  return realNewRoutes.some((route) => matchPath({ path: route, end: true }, full));
};
const goes = (address) => {
  const [p, q] = address.split('?');
  return resolveRedirect(p, q ? `?${q}` : '', '', { isLive: live });
};

// ---------- 1. The action list of section 4 ----------
// kind: page (ref = New look page), words (ref = a label), link (ref = current screen address), decision (ref = what the owner chooses)
const ACTIONS = [
  { n: 1, action: 'Add, edit, disable a customer', home: 'Customers: Add customer, panel Edit and Disable', kind: 'words', ref: ['Add customer', 'Disable customer', 'Edit'] },
  { n: 2, action: 'Set or remove a credit limit; view credit history', home: 'Customer panel, Credit section', kind: 'words', ref: ['Save limit', 'Remove limit'] },
  { n: 3, action: 'Assign loyalty program; redeem points; balance and history', home: 'Customer panel, Loyalty section', kind: 'words', ref: ['Assign programme', 'Redeem points', 'Points history'] },
  { n: 4, action: 'Customer group, territory, price list on a customer', home: 'Hidden unless used (customer form shows them when the shop uses them)', kind: 'words', ref: ['Add customer'] },
  { n: 5, action: 'Add, edit, enable or disable a supplier; supplier detail', home: 'Suppliers: Add supplier, panel, Disable supplier', kind: 'words', ref: ['Add supplier', 'Disable supplier'] },
  { n: 6, action: 'Supplier groups (list, create, edit)', home: 'Suppliers menu and Settings, Advanced', kind: 'link', ref: '/suppliers/groups' },
  { n: 7, action: 'Stock list with filters and CSV export', home: 'Stock levels, Overview, Export', kind: 'page', ref: '/stock' },
  { n: 8, action: 'Stock adjustment; stock reconciliation per item', home: 'Count stock tab and row menu', kind: 'words', ref: ['Count this product'] },
  { n: 9, action: 'Create a discount rule for an item', home: 'Stock row menu, and Settings, Till and payments', kind: 'words', ref: ['Create a discount rule'] },
  { n: 10, action: 'Low stock, Create receipt', home: 'Stock levels, Low stock, Reorder (opens a new purchase)', kind: 'words', ref: ['Reorder'] },
  { n: 11, action: 'Expiry alerts (batch, expiring within)', home: 'Stock levels, Expiry tab', kind: 'page', ref: '/stock/expiry' },
  { n: 12, action: 'Stock ledger (filters, export)', home: 'Stock levels, Movements', kind: 'page', ref: '/stock/movements' },
  { n: 13, action: 'Stock entries: create, edit, submit, cancel, print, additional costs', home: 'Movements lists them; Open goes to the entry on the current screen', kind: 'link', ref: '/inventory/stock-entries/:stockEntryName' },
  { n: 14, action: 'Material receipt, issue, transfer', home: 'Stock in and Stock out or write-off buttons; transfers: Transfers tab and Settings, Advanced', kind: 'words', ref: ['Stock in', 'Stock out or write-off'] },
  { n: 15, action: 'Edit price, SKU, unit, expiry, batch per item and store', home: 'Stock row menu opens the current Inventory Details', kind: 'link', ref: '/inventory/item-details' },
  { n: 16, action: 'Multi-level stock count (three roles)', home: 'Count stock step 1, "Count in three steps by role"', kind: 'link', ref: '/inventory/multi-level-reconciliation' },
  { n: 17, action: 'Stores: add, edit, staff, default store, staff assignment', home: 'Stock levels, Locations tab (second store); Settings, Business, Stores (any shop); Products, More, Stores (second store)', kind: 'link', ref: '/warehouses' },
  { n: 18, action: 'Stock transfers: request, approve, dispatch, receive, cancel', home: 'Transfers tab (second store) and Products, More, Stock transfers (second store)', kind: 'link', ref: '/stock-transfers' },
  { n: 19, action: 'Purchase order: create, edit draft, submit, cancel', home: 'New purchase; panel: Edit draft, Send order to supplier, Cancel', kind: 'words', ref: ['Save and send order', 'Edit draft', 'Send order to supplier', 'Cancel'] },
  { n: 20, action: 'Receive goods (GRN), then create purchase invoice', home: 'Receive goods button; panel: Make the bill', kind: 'words', ref: ['Receive goods', 'Make the bill'] },
  { n: 21, action: 'Direct bill: CSV upload, mark as paid, update stock, skip eTIMS, create product inline', home: 'New purchase, More options, "I already have the bill"', kind: 'words', ref: ['I already have the bill'] },
  { n: 22, action: 'Purchase receipt (stock only)', home: 'Purchases, More purchase screens (earlier screen), and Stock in', kind: 'link', ref: '/purchases/receipts/new' },
  { n: 23, action: 'Pay a supplier invoice; cancel invoice; print', home: 'Purchase panel: Pay bill, Cancel, Print', kind: 'words', ref: ['Pay bill', 'Print'] },
  { n: 24, action: 'Purchase return', home: 'Returns tab; panel: Create return (opens the current return screen)', kind: 'link', ref: '/purchases/returns' },
  { n: 25, action: 'Print on each purchase document', home: 'Purchase panel, Print', kind: 'words', ref: ['Print'] },
  { n: 26, action: 'POS profile switches', home: 'Settings, Till and payments, Till options', kind: 'page', ref: '/settings/till' },
  { n: 27, action: 'Create or enable credit payment', home: 'Settings, Till and payments, On credit', kind: 'link', ref: '/settings/payment-methods' },
  { n: 28, action: 'M-Pesa, Pesapal, PayPal setup and test', home: 'Settings, Till and payments, Payment gateways (current screen, keys only there)', kind: 'link', ref: '/settings/payment-gateways' },
  { n: 29, action: 'Inventory discount rules (create, edit, delete)', home: 'Settings, Till and payments, Inventory discounts', kind: 'link', ref: '/settings/inventory-discounts' },
  { n: 30, action: 'Loyalty programs (create, edit, filter)', home: 'Settings, Till and payments, Loyalty programmes', kind: 'link', ref: '/settings/loyalty-programs' },
  { n: 31, action: 'Business details; bank accounts', home: 'Settings, Business (bank accounts: link to current screen)', kind: 'link', ref: '/settings/bank-accounts' },
  { n: 32, action: 'eTIMS settings', home: 'Settings, Tax', kind: 'link', ref: '/settings/etims' },
  { n: 33, action: 'Two-factor on or off; idle sign-out info', home: 'Settings, Team and security, Security', kind: 'link', ref: '/settings/security' },
  { n: 34, action: 'Audit trail with export', home: 'Settings, Team and security, Audit trail', kind: 'link', ref: '/settings/audit-trail' },
  { n: 35, action: 'Account provisioning', home: 'Settings, Advanced', kind: 'link', ref: '/settings/account-provisioning' },
  { n: 36, action: 'Staff create, edit, roles, enable or disable', home: 'Settings, Team and security: Add a person, Change details or role, Deactivate', kind: 'words', ref: ['Add a person', 'Change details or role', 'Deactivate'] },
  { n: 37, action: 'Roles and permissions create, edit', home: 'Settings, Team and security, Roles and permissions (current screen)', kind: 'link', ref: '/roles' },
  { n: 38, action: 'Station screen (kitchen board)', home: 'Settings, Advanced, Station screen settings', kind: 'link', ref: '/kitchen' },
  { n: 39, action: 'Industry starter products: tick, edit, download, upload, save', home: 'Settings, Advanced, Industry starter products; the set-up wizard', kind: 'link', ref: '/industry/:industryCode/products' },
  { n: 40, action: 'Reports: 6 reports and 13 sub-reports, sales export', home: 'Reports landing, seven report pages, More reports links for the rest', kind: 'page', ref: '/reports' },
  { n: 41, action: 'Register, Onboarding, Getting started checklist', home: 'First-time set-up wizard, reached from Set up now on Home', kind: 'words', ref: ['Set up now'] },
  { n: 42, action: 'Sign-in with two-factor; forgot password', home: 'New Sign-in page (same steps)', kind: 'words', ref: ['Forgot password?'] },
  { n: 43, action: 'Till: every item in section 3.9', home: 'Till (current screen with New look parts); Sales page "Go to till"', kind: 'link', ref: '/sales/pos' },
];

describe('1. Every action of the audit (section 4) has a home', () => {
  test('the table covers all 43 rows (41 rows of section 4, with Sign-in and Register listed on their own)', () => {
    expect(ACTIONS.map((a) => a.n)).toEqual(Array.from({ length: 43 }, (_, i) => i + 1));
  });

  test.each(ACTIONS.filter((a) => a.kind === 'page'))('$n. $action: the New look page $ref is a real screen', ({ ref }) => {
    expect(isRealNewPage(ref)).toBe(true);
  });

  test.each(ACTIONS.filter((a) => a.kind === 'words'))('$n. $action: the control labels exist', ({ ref }) => {
    ref.forEach((label) => expect(WORDS.has(label)).toBe(true));
  });

  test.each(ACTIONS.filter((a) => a.kind === 'link'))('$n. $action: $ref is a real current screen that a New look screen links to, and it stays put', ({ ref }) => {
    // A real route of the current app
    expect(ROUTES).toContain(ref);
    // Written down in a New look screen (a link, a card, or a menu item)
    expect(isLinked(ref)).toBe(true);
    // Followed from a New look page it carries the marker, so the redirect engine leaves it alone
    const sample = ref.replace(/:[A-Za-z0-9_]+/g, 'x1');
    expect(oldScreen(sample)).toMatch(/legacy=1$/);
    expect(goes(oldScreen(sample))).toBeNull();
  });
});

// ---------- 2. Every route of the current app ----------
// Routes that stay on their current screen. `from` is the New look screen that reaches it (a link written in the source), or
// `inside` names the current screen it is opened from.
const STAYS = {
  '/kitchen': { from: '/kitchen', where: 'Settings, Advanced, Station screen settings' },
  '/industry/:industryCode/products': { from: '/industry/', where: 'Settings, Advanced, Industry starter products; set-up wizard' },
  '/products/update-price': { from: '/products/update-price', where: 'Products, More, Update many prices' },
  '/products/variations': { from: '/products/variations', where: 'Settings, Advanced, Product variations' },
  '/products/bulk-import': { from: '/products/bulk-import', where: 'Products, Import' },
  '/products/bulk-stock-import': { from: '/products/bulk-stock-import', where: 'Set-up wizard and Settings, Advanced, Import opening stock' },
  '/products/load-products': { from: '/products/load-products', where: 'Settings, Advanced, Load products' },
  '/sales/pos': { from: '/sales/pos', where: 'Go to till (top bar), Sales, + New, Sale' },
  '/sales/invoice/new': { from: '/sales/invoice/new', where: 'Sales, More sales screens, New invoice (earlier screen)' },
  '/warehouses': { from: '/warehouses', where: 'Stock levels, Locations; Settings, Business, Stores; Products, More, Stores (second store)' },
  '/warehouses/new': { inside: '/warehouses', where: 'New Store button on the current Stores screen' },
  '/warehouses/:id': { inside: '/warehouses', where: 'a row of the current Stores screen' },
  '/warehouses/:id/edit': { inside: '/warehouses', where: 'Edit on the current store screen' },
  '/warehouses/:id/staff': { inside: '/warehouses', where: 'Staff on the current store screen' },
  '/inventory/recipes': { from: '/inventory/recipes', where: 'Settings, Advanced, Recipes' },
  '/inventory/recipes/new': { inside: '/inventory/recipes', where: 'New recipe button on the current Recipes screen' },
  '/inventory/recipes/:dish': { inside: '/inventory/recipes', where: 'a row of the current Recipes screen' },
  '/inventory/wastage': { from: '/inventory/wastage', where: 'Settings, Advanced, Wastage' },
  '/inventory/material-transfers': { from: '/inventory/material-transfers', where: 'Products, More, Move stock between stores (second store)' },
  '/inventory/material-transfer': { inside: '/inventory/material-transfers', where: 'New button on the current Material Transfers list' },
  '/inventory/stock-entry': { from: '/inventory/stock-entry', where: 'Settings, Advanced, Make or repack goods' },
  '/inventory/multi-level-reconciliation/:id': { from: '/inventory/multi-level-reconciliation', where: 'Count stock, Count in three steps by role, then a row of that list' },
  '/inventory/multi-level-reconciliation/:id/stock-take': { from: '/inventory/multi-level-reconciliation', where: 'Add stock take on a current count' },
  '/stock-transfers': { from: '/stock-transfers', where: 'Stock levels, Transfers; Products, More, Stock transfers (second store)' },
  '/stock-transfers/list': { inside: '/stock-transfers', where: 'All Transfers on the current Stock transfers screen' },
  '/stock-transfers/create': { inside: '/stock-transfers', where: 'Direct Transfer on the current Stock transfers screen' },
  '/stock-transfers/create-request': { inside: '/stock-transfers', where: 'Transfer Request on the current Stock transfers screen' },
  '/stock-transfers/:id': { inside: '/stock-transfers', where: 'a row of the current transfers list' },
  '/stock-transfers/:id/approve': { inside: '/stock-transfers', where: 'Approve on a current transfer' },
  '/stock-transfers/:id/dispatch': { inside: '/stock-transfers', where: 'Dispatch on a current transfer' },
  '/stock-transfers/:id/receive': { inside: '/stock-transfers', where: 'Receive on a current transfer' },
  '/settings/approvals': { from: '/settings/approvals', where: 'Settings, Advanced, Approvals' },
  '/settings/payment-matching': { from: '/settings/payment-matching', where: 'Settings, Advanced, Payment matching' },
  '/settings/sales-people': { from: '/settings/sales-people', where: 'Settings, Advanced, Sales people' },
  '/settings/new-look': { from: '/settings/new-look', where: 'Settings, Advanced, New look' },
  '/reports/stock-movement': { from: '/reports/stock-movement', where: 'Reports, More reports' },
  '/reports/stock-movement/turnover': { from: '/reports/stock-movement/turnover', where: 'Reports, More reports' },
  '/reports/stock-movement/days-on-hand': { from: '/reports/stock-movement/days-on-hand', where: 'Reports, More reports' },
  '/reports/stock-movement/movement-patterns': { from: '/reports/stock-movement/movement-patterns', where: 'Reports, More reports' },
  '/reports/performance-metrics': { from: '/reports/performance-metrics', where: 'Reports, More reports' },
  '/reports/performance-metrics/accuracy': { from: '/reports/performance-metrics/accuracy', where: 'Reports, More reports' },
  '/reports/performance-metrics/variance': { from: '/reports/performance-metrics/variance', where: 'Reports, More reports' },
  '/reports/performance-metrics/adjustment-trends': { from: '/reports/performance-metrics/adjustment-trends', where: 'Reports, More reports' },
  '/reports/performance-metrics/transfer-efficiency': { from: '/reports/performance-metrics/transfer-efficiency', where: 'Reports, More reports' },
};

describe('2. Every screen of the current app opens a live New look page, or is reached from one', () => {
  const sampleOf = (route) => route.replace(/:[A-Za-z0-9_]+/g, 'x1');

  test('the route list was read (there are many routes)', () => {
    expect(ROUTES.length).toBeGreaterThan(100);
  });

  // Where a route goes: { kind: 'page', page } for a live New look page, or { kind: 'stays', stay } for a current screen
  const homeOf = (route) => {
    const hit = goes(sampleOf(route));
    if (hit) return { kind: 'page', real: isRealNewPage(hit.to.replace(NEW_LOOK_PREFIX, '').split('?')[0] || '/'), alsoListedAsStaying: Boolean(STAYS[route]) };
    const stay = STAYS[route];
    if (!stay) return { kind: 'none' };
    return { kind: 'stays', reached: stay.from ? isLinked(stay.from) : Boolean(STAYS[stay.inside]) && ROUTES.includes(stay.inside) };
  };

  test.each(ROUTES)('%s', (route) => {
    const home = homeOf(route);
    expect(home.kind).not.toBe('none'); // a screen with no home would fail here
    expect(home.kind === 'page' ? home.real && !home.alsoListedAsStaying : home.reached).toBe(true);
  });

  test('the table of staying screens has no row for a screen that is gone', () => {
    Object.keys(STAYS).forEach((route) => expect(ROUTES).toContain(route));
  });
});

// ---------- 3. The old menu ----------
describe('3. Every item of the old menu has a place', () => {
  const top = protectedRoutes.filter((r) => !r.hideFromMenu);
  // The top-level menu entries and where each lives in the New look
  const MENU_HOME = {
    '/dashboard': 'home',
    '/products': 'products',
    '/sales': 'sales',
    '/warehouses': 'stock-levels',
    '/inventory': 'stock-levels',
    '/customers': 'customers',
    '/suppliers': 'suppliers',
    '/purchases': 'purchases',
    '/stock-transfers': 'stock-levels',
    '/staff': 'settings',
    '/roles': 'settings',
    '/settings': 'settings',
    '/reports': 'reports',
  };
  const items = flatItems(NAVIGATION);
  const claimed = (item, address) => (item.matchExact || []).includes(address) || (item.match || []).some((base) => address === base || address.startsWith(`${base}/`)) || item.old === address;

  test.each(top.map((r) => [r.path, r.label]))('%s (%s) belongs to a New look menu item', (route) => {
    const key = MENU_HOME[route];
    expect(key).toBeDefined();
    const item = items.find((i) => i.key === key);
    expect(item).toBeDefined();
    expect(claimed(item, route)).toBe(true);
  });

  test('the hidden screens (Station screen, Industry products) are reached from Settings, Advanced', () => {
    const sections = ADVANCED_CARDS.map((c) => c.section);
    expect(sections).toEqual(expect.arrayContaining(['station-screen', 'industry-products']));
  });

  test('the second-level menus: every sub-menu entry opens a live page or a screen reached from the New look', () => {
    const entries = protectedRoutes.flatMap((r) => (r.pageChildren || []).map((c) => c.path));
    expect(entries.length).toBeGreaterThan(50);
    const homeless = entries.filter((address) => {
      const hit = goes(address);
      return hit ? !isRealNewPage(hit.to.replace(NEW_LOOK_PREFIX, '').split('?')[0] || '/') : !STAYS[address];
    });
    expect(homeless).toEqual([]);
  });

  test('every old sub-menu entry that is not redirected is a card or link in Settings, Advanced or on a page', () => {
    // Update many prices and the two transfer screens are buttons in the Products header's More menu instead of Advanced cards
    const advanced = new Set([...ADVANCED_CARDS.map((c) => c.to).filter(Boolean), ...Object.values(MORE_SCREENS)]);
    ['/products/load-products', '/inventory/recipes', '/inventory/wastage', '/settings/approvals', '/settings/payment-matching', '/settings/sales-people', '/settings/new-look', '/warehouses', '/stock-transfers', '/inventory/material-transfers', '/inventory/stock-entry', '/products/update-price', '/products/variations', '/products/bulk-stock-import', '/kitchen'].forEach((address) => {
      expect(advanced.has(address)).toBe(true);
    });
  });

  test('Advanced covers the screens named in OLD', () => {
    const advanced = new Set([...ADVANCED_CARDS.map((c) => c.to), ...Object.values(MORE_SCREENS)]);
    ['stores', 'stockTransfers', 'materialTransfers', 'stockEntry', 'updatePrices', 'variations', 'loadProducts', 'openingStock'].forEach((key) => expect(advanced.has(OLD[key])).toBe(true));
  });
});
