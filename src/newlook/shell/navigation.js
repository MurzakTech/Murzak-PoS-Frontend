/**
 * The sidebar menu (Part 1, App shell and navigation): Home plus nine items in four groups, Settings at the
 * bottom. The till is the top-bar button, not a menu item.
 *
 *   to      where the item goes TODAY. Until each page is redesigned, an item opens the current screen that does the
 *           same job. Ticket P1-7 replaces these with the new addresses and redirects every old address.
 *   match   address beginnings that also mean "you are in this item", so the item stays highlighted on its pages
 *   soon    the page does not exist yet (Expenses is new, ticket P5-1): the item is shown but cannot be opened
 *
 * Items are plain data, so a page's permissions can hide an item (ticket P1-8) without changing the shell.
 */
export const NAVIGATION = {
  home: { key: 'home', label: 'Home', icon: 'home', to: '/dashboard', match: ['/dashboard', '/new-look'] },
  groups: [
    {
      key: 'sell',
      label: 'Sell',
      items: [
        { key: 'sales', label: 'Sales', icon: 'receipt', to: '/sales/history', match: ['/sales'] },
        { key: 'customers', label: 'Customers', icon: 'users', to: '/customers', match: ['/customers'] },
      ],
    },
    {
      key: 'stock',
      label: 'Stock',
      items: [
        { key: 'products', label: 'Products', icon: 'box', to: '/products', match: ['/products'] },
        { key: 'stock-levels', label: 'Stock levels', icon: 'layers', to: '/inventory', match: ['/inventory'] },
      ],
    },
    {
      key: 'buy',
      label: 'Buy',
      items: [
        { key: 'purchases', label: 'Purchases', icon: 'truck', to: '/purchases', match: ['/purchases'] },
        { key: 'suppliers', label: 'Suppliers', icon: 'store', to: '/suppliers', match: ['/suppliers'] },
      ],
    },
    {
      key: 'money',
      label: 'Money',
      items: [
        { key: 'expenses', label: 'Expenses', icon: 'wallet', soon: true },
        { key: 'reports', label: 'Reports', icon: 'chart', to: '/reports', match: ['/reports'] },
      ],
    },
  ],
  settings: { key: 'settings', label: 'Settings', icon: 'settings', to: '/settings', match: ['/settings'] },
};

/** Every item in menu order, for the search box and for tests */
export const flatItems = (navigation) => [navigation.home, ...navigation.groups.flatMap((g) => g.items), navigation.settings];

/** Is the person on this item's pages? A match ends at a "/" so /sales does not claim /sales-report */
export const isActive = (item, pathname) =>
  (item.match || (item.to ? [item.to] : [])).some((base) => pathname === base || pathname.startsWith(`${base}/`));
