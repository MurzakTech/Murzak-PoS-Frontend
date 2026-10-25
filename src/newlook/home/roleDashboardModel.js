import { FULL_ACCESS_ROLES } from '../../config/roleAccessConfig';

/**
 * What each person's Home holds, decided from the modules their roles open (not from the role's name), so a new role or a person with
 * two roles gets the right Home without any new code. `hasAccess(address)` is the app's own role check (useRoleAccess); `can(name)` is the
 * server's answer about protected figures (profit, money owed). Both only choose what to draw: the server still refuses a figure the person
 * may not see. Nothing here draws anything, so each rule can be tested alone.
 */

/** The modules, in the order they are listed. `gate` is the current address that must be open to the person; any one is enough. */
export const MODULES = [
  { key: 'till', icon: 'till', gate: ['/till'], page: '/till', old: '/sales/pos' },
  { key: 'sales', icon: 'receipt', gate: ['/sales', '/sales/history'], page: '/sales', old: '/sales/history' },
  { key: 'customers', icon: 'users', gate: ['/customers'], page: '/customers', old: '/customers' },
  { key: 'products', icon: 'box', gate: ['/products'], page: '/products', old: '/products' },
  { key: 'stock', icon: 'layers', gate: ['/inventory', '/inventory/stock-summary', '/stock'], page: '/stock', old: '/inventory' },
  { key: 'purchases', icon: 'truck', gate: ['/purchases'], page: '/purchases', old: '/purchases' },
  { key: 'suppliers', icon: 'store', gate: ['/suppliers'], page: '/suppliers', old: '/suppliers' },
  { key: 'expenses', icon: 'wallet', gate: ['/expenses'], page: '/expenses' },
  { key: 'reports', icon: 'chart', gate: ['/reports'], page: '/reports', old: '/reports' },
  { key: 'team', icon: 'settings', gate: ['/settings/team'], page: '/settings/team', old: '/staff' },
];

/** The keys of the modules the person may open, in list order */
export const openModules = (hasAccess) => MODULES.filter((m) => m.gate.some((address) => hasAccess(address))).map((m) => m.key);

/** The roles of a signed-in user, as the app's role check reads them */
export const rolesOf = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  return typeof user.role === 'string' ? [user.role] : [];
};

/**
 * Does this person keep the full Home (every chart and tile)? Owners and the roles that open every page do. So does anyone whose roles we
 * cannot read: showing the usual Home is the same as before, and the server still decides which figures come back.
 */
export const usesFullHome = ({ tier, roles }) => tier === 'owner' || roles.length === 0 || roles.some((r) => FULL_ACCESS_ROLES.includes(r));

/** The order the panels are drawn in; the first one present names the person's workspace */
export const PANEL_ORDER = ['sell', 'buy', 'stock', 'money', 'insight'];

/**
 * The panels this person's Home holds, from the modules they open and what the server says they may see:
 *   sell     today's till figures and sales (a till or the sales history)
 *   buy      orders waiting, bills to pay, receive goods (purchases)
 *   stock    low and out of stock, count and transfers (stock levels)
 *   money    what customers owe, supplier bills due, expenses (customers, suppliers, expenses or purchases, with the money figures allowed)
 *   insight  charts and reports (reports, with sales to chart)
 * plus the flags the page needs: which actions to offer and which attention items belong here.
 */
export const dashboardFor = ({ hasAccess, can }) => {
  const modules = openModules(hasAccess);
  const has = (key) => modules.includes(key);
  const canOwed = can('money_owed');
  const sell = has('till') || has('sales');
  const buy = has('purchases');
  const stock = has('stock');
  const money = (canOwed && (has('customers') || has('suppliers') || buy)) || has('expenses');
  const insight = has('reports') && sell;
  const present = { sell, buy, stock, money, insight };
  const panels = PANEL_ORDER.filter((key) => present[key]);
  return {
    modules,
    panels,
    focus: panels[0] || 'modules',
    actions: {
      sale: has('till') && hasAccess('/till'),
      receive: buy && hasAccess('/purchases/receive'),
      order: buy && (hasAccess('/purchases/new') || hasAccess('/purchases/create-order')),
      count: stock && hasAccess('/stock/count'),
      transfers: stock && hasAccess('/stock-transfers'),
      expiry: stock && hasAccess('/inventory/expiry-alerts'),
      expense: has('expenses') && hasAccess('/expenses/new'),
      owing: canOwed && has('customers'),
    },
    // The Needs attention card: a till to close, stock to reorder, bills to pay or customers to remind
    attention: has('till') || stock || buy || (canOwed && has('customers')),
    canOwed,
    canProfit: can('profit'),
  };
};

const ATTENTION_FOR = {
  till_not_closed: (d) => d.modules.includes('till'),
  out_of_stock: (d) => d.panels.includes('stock') || d.panels.includes('buy'),
  running_low: (d) => d.panels.includes('stock') || d.panels.includes('buy'),
  customer_overdue: (d) => d.canOwed && d.modules.includes('customers'),
  supplier_bill_due: (d) => d.canOwed && d.panels.includes('buy'),
};

/** The attention items that belong to this person's modules (a stock keeper is not shown customer debts) */
export const attentionFor = (items, dashboard) => (items || []).filter((item) => (ATTENTION_FOR[item.type] || (() => false))(dashboard));
