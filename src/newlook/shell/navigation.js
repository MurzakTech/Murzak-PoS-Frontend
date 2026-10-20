import S from '../strings';

/**
 * The sidebar menu (Part 1, App shell and navigation): Home plus nine items in four groups, Settings at the
 * bottom. The till is the top-bar button, not a menu item.
 *
 *   page    the new page (an address without the transitional prefix; see redirects/engine.js)
 *   old     the current screen that does the same job
 *   to      where it goes now, worked out by resolveNavigation: the new page once it is live, otherwise the old screen
 *   match   address beginnings that mean "you are in this item", so it stays highlighted on its pages (old and new);
 *           matchExact lists whole addresses (Home must not claim every New look page)
 *   soon    the page does not exist yet: the item is shown but cannot be opened (no item is marked so now: Expenses, the last one, is built)
 *
 * An item with no `old` screen (Expenses is new: nothing existed before) always opens its new page, live or not, because there is no
 * current screen to fall back to.
 *
 * Items are plain data, so a page's permissions can hide an item (ticket P1-8) without changing the shell.
 */
export const NAVIGATION = {
  home: { key: 'home', label: S.shell.nav.home, icon: 'home', page: '/', old: '/dashboard', match: [], matchExact: ['/', '/dashboard', '/components', '/redirects', '/new-look', '/new-look/components', '/new-look/redirects'] },
  groups: [
    {
      key: 'sell',
      label: S.shell.nav.groups.sell,
      items: [
        { key: 'sales', label: S.shell.nav.items.sales, icon: 'receipt', page: '/sales', old: '/sales/history', match: ['/sales', '/new-look/sales'] },
        { key: 'customers', label: S.shell.nav.items.customers, icon: 'users', page: '/customers', old: '/customers', match: ['/customers', '/new-look/customers'] },
      ],
    },
    {
      key: 'stock',
      label: S.shell.nav.groups.stock,
      items: [
        { key: 'products', label: S.shell.nav.items.products, icon: 'box', page: '/products', old: '/products', match: ['/products', '/new-look/products'] },
        // Stores and Stock transfers are tabs under Stock levels (only with a second location), so they keep it highlighted
        { key: 'stock-levels', label: S.shell.nav.items.stockLevels, icon: 'layers', page: '/stock', old: '/inventory', match: ['/inventory', '/warehouses', '/stock-transfers', '/new-look/stock'] },
      ],
    },
    {
      key: 'buy',
      label: S.shell.nav.groups.buy,
      items: [
        { key: 'purchases', label: S.shell.nav.items.purchases, icon: 'truck', page: '/purchases', old: '/purchases', match: ['/purchases', '/new-look/purchases'] },
        { key: 'suppliers', label: S.shell.nav.items.suppliers, icon: 'store', page: '/suppliers', old: '/suppliers', match: ['/suppliers', '/new-look/suppliers'] },
      ],
    },
    {
      key: 'money',
      label: S.shell.nav.groups.money,
      items: [
        { key: 'expenses', label: S.shell.nav.items.expenses, icon: 'wallet', page: '/expenses', match: ['/expenses', '/new-look/expenses'] },
        { key: 'reports', label: S.shell.nav.items.reports, icon: 'chart', page: '/reports', old: '/reports', match: ['/reports', '/new-look/reports'] },
      ],
    },
  ],
  // Staff and Roles are reached only through Settings, under Team, so they keep Settings highlighted
  settings: { key: 'settings', label: S.shell.nav.settings, icon: 'settings', page: '/settings/business', old: '/settings', match: ['/settings', '/staff', '/roles', '/new-look/settings'] },
};

/**
 * Gives every item its `to`: the new page once that page is live, otherwise the current screen that does the same
 * job (see redirects/live.js). `toNew` turns an unprefixed page address into the real one.
 */
export const resolveNavigation = (navigation, { isLive, toNew }) => {
  const resolve = (item) => ({ ...item, to: item.soon ? undefined : item.page && (isLive(item.page) || !item.old) ? toNew(item.page) : item.old });
  return { home: resolve(navigation.home), groups: navigation.groups.map((g) => ({ ...g, items: g.items.map(resolve) })), settings: resolve(navigation.settings) };
};

/** Every item in menu order, for the search box and for tests */
export const flatItems = (navigation) => [navigation.home, ...navigation.groups.flatMap((g) => g.items), navigation.settings];

/** Is the person on this item's pages? A match ends at a "/" so /sales does not claim /sales-report */
export const isActive = (item, pathname) =>
  (item.matchExact || []).includes(pathname) || (item.match || (item.to ? [item.to] : [])).some((base) => pathname === base || pathname.startsWith(`${base}/`));
