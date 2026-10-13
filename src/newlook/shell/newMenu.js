/**
 * The + New menu (Part 1, App shell and navigation): sale, product, customer, expense and purchase. Each item
 * shows only if the person may open the screen it leads to ("Items depend on the user's permissions").
 *
 *   old    the current screen it opens today; its access rule decides whether the item is shown
 *   page   the new page it will open once that page is built (an address without the transitional prefix)
 *   soon   the page does not exist yet, so the item is shown but cannot be chosen; `gate` is the screen whose access
 *          rule decides who sees it meanwhile (the same back-office roles that can add products)
 *
 * Customer has no screen of its own today (the list is where customers are added), so it opens the list.
 */
export const NEW_MENU = [
  { key: 'sale', label: 'Sale', action: 'New sale', icon: 'receipt', old: '/sales/pos', page: '/till' },
  { key: 'product', label: 'Product', action: 'Add product', icon: 'box', old: '/products/new', page: '/products/new' },
  { key: 'customer', label: 'Customer', action: 'Add customer', icon: 'users', old: '/customers', page: '/customers/new' },
  { key: 'expense', label: 'Expense', action: 'Add expense', icon: 'wallet', old: null, gate: '/products/new', page: '/expenses?action=add', soon: true },
  { key: 'purchase', label: 'Purchase', action: 'New purchase', icon: 'truck', old: '/purchases/new', page: '/purchases/new' },
];

/**
 * @param hasAccess  (oldAddress) => boolean, the app's role check
 * @param open       (address) => void, goes there
 * @param destination (item) => string, where the item goes now: the new page if it is live, else the current screen
 * @param showAll    show all five whatever the person's role (the component page's sample)
 */
export const newMenuItems = ({ hasAccess, open, destination, showAll = false }) =>
  NEW_MENU.filter((item) => showAll || hasAccess(item.old || item.gate)).map((item) => ({
    label: item.soon ? `${item.label} (coming soon)` : item.label,
    icon: item.icon,
    disabled: item.soon ? true : undefined,
    onClick: () => open(destination(item)),
  }));

/** The same five as search actions ("add product" finds it) */
export const searchActionsFor = ({ hasAccess, open, destination }) =>
  NEW_MENU.filter((item) => !item.soon && item.old && hasAccess(item.old)).map((item) => ({
    label: item.action,
    keywords: `new add create ${item.label.toLowerCase()}`,
    onSelect: () => open(destination(item)),
  }));
