/**
 * Where every old page address goes in the New look.
 *
 * This file is data only. The redirect engine reads it; it holds no logic.
 *
 * Addresses in `to` are written without the transitional prefix: the engine adds '/new-look'. A bare '/'
 * means the New look Home. The rules for the address scheme are:
 *   - A page's tabs are part of its address, for example /sales/unpaid.
 *   - A row or record opens in the page's detail panel through the query key `open`, for example /sales?open=0033.
 *   - A header button that opens a short form is the parent page plus `?action=<name>`.
 *   - Something that moves into Settings, Advanced is /settings/advanced?section=<name>.
 *   - A ':name' token in `from` is copied to the same ':name' token in `to`.
 *
 * Status of each entry:
 *   'sure'    the Spec clearly says where the old page goes.
 *   'unclear' the Spec does not say, so a choice was made. `note` says what was assumed and why. The product
 *             owner is shown these notes.
 *   'keep'    the page is outside the redesign and stays as it is. `to` is null.
 *
 * The order follows the old menu: Home, Sales, Customers, Products, Stock, Purchases, Suppliers, Reports,
 * Staff and Roles, Settings, then the pages that stay.
 */

export const REDIRECTS = [
  // Home
  { from: '/dashboard', to: '/', status: 'sure', note: 'The old Dashboard is replaced by Home.' },

  // Sales
  { from: '/sales', to: '/sales', status: 'sure', note: 'The old address opened Sales History, which is now All sales.' },
  { from: '/sales/pos', to: '/till', status: 'sure' },
  { from: '/sales/history', to: '/sales', status: 'sure' },
  { from: '/sales/invoice/new', to: '/sales/new', status: 'sure' },
  { from: '/sales/pos-opening-entries', to: '/sales/sessions', status: 'sure', note: 'Opening Entries are now Till sessions.' },
  { from: '/sales/pos-opening-entries/:name', to: '/sales/sessions?open=:name', status: 'sure' },
  { from: '/sales/returns', to: '/sales/returns', status: 'sure' },
  { from: '/sales/invoice/:id', to: '/sales?open=:id', status: 'sure' },
  { from: '/sales/pos-invoice/:id', to: '/sales?open=:id', status: 'sure', note: 'POS invoices and sales invoices share one list, so both open the same receipt panel.' },
  {
    from: '/sales/invoice/:id/edit',
    to: '/sales?open=:id',
    status: 'unclear',
    note: 'The Spec has no edit screen for a sale. Assumed the receipt panel is the closest place, because a sale is changed there by taking payment or returning items.',
  },

  // Customers
  { from: '/customers', to: '/customers', status: 'sure' },
  { from: '/customers/credit', to: '/customers/owing', status: 'sure', note: 'Customer Credit is now Owing.' },

  // Products
  { from: '/products', to: '/products', status: 'sure' },
  { from: '/products/new', to: '/products/new', status: 'sure' },
  { from: '/products/load-products', to: '/products/import', status: 'sure', note: 'Load Products is now the Import button.' },
  { from: '/products/categories', to: '/products/categories', status: 'sure' },
  { from: '/products/brands', to: '/settings/advanced?section=brands', status: 'sure' },
  { from: '/products/units', to: '/settings/advanced?section=units', status: 'sure' },
  { from: '/products/warranties', to: '/settings/advanced?section=warranties', status: 'sure' },
  { from: '/products/price-groups', to: '/settings/advanced?section=price-groups', status: 'sure' },
  { from: '/products/update-price', to: null, status: 'keep', note: 'Bulk price update has no redesigned screen yet, so the current screen stays at this address until it has one.' },
  { from: '/products/variations', to: null, status: 'keep', note: 'Product variations have no redesigned screen yet, so the current screen stays at this address until it has one.' },
  {
    from: '/products/bulk-import',
    to: '/products/import',
    status: 'unclear',
    note: 'The Spec only names one Import button. Assumed a bulk product import is the same Import page.',
  },
  {
    from: '/products/bulk-stock-import',
    to: '/products/import',
    status: 'unclear',
    note: 'The Spec does not say where an opening stock import goes. Assumed it is a choice on the same Import page, because Stock in is a single short form, not a bulk import.',
  },
  {
    from: '/industry/:industryCode/products',
    to: '/products/import',
    status: 'unclear',
    note: 'This is the industry starter catalogue opened from the old Dashboard. The Spec names no screen for it. Assumed it is part of Import, and the first-time set-up wizard may replace it.',
  },

  // Stock levels (old Inventory)
  { from: '/inventory', to: '/stock', status: 'sure' },
  { from: '/inventory/stock-summary', to: '/stock', status: 'sure', note: 'The old Stock List is the list on the Overview tab.' },
  { from: '/inventory/low-stock', to: '/stock/low', status: 'sure' },
  {
    from: '/inventory/expiry-alerts',
    to: '/stock/expiry',
    status: 'unclear',
    note: 'The Spec says both that Expiry Alerts become a filter on Low stock and that Expiry is a tab for shops that track expiry dates. Assumed the Expiry tab, which only appears for those shops.',
  },
  { from: '/inventory/stock-ledger', to: '/stock/movements?kind=ledger', status: 'sure' },
  {
    from: '/inventory/item-details',
    to: '/stock',
    status: 'unclear',
    note: 'The old page showed one item but its address carries no item reference. Assumed the Overview, where a row opens the item in the detail panel.',
  },
  { from: '/inventory/stock-entries', to: '/stock/movements?kind=entry', status: 'sure' },
  { from: '/inventory/stock-entries/:stockEntryName', to: '/stock/movements?kind=entry&open=:stockEntryName', status: 'sure' },
  { from: '/inventory/material-receipts', to: '/stock/movements?kind=receipt', status: 'sure', note: 'Material Receipts are now Stock in.' },
  { from: '/inventory/material-issues', to: '/stock/movements?kind=issue', status: 'sure', note: 'Material Issues are now Stock out or write-off.' },
  { from: '/inventory/material-receipt', to: '/stock?action=in', status: 'sure', note: 'A new material receipt is the Stock in button.' },
  { from: '/inventory/material-issue', to: '/stock?action=out', status: 'sure', note: 'A new material issue is the Stock out or write-off button.' },
  {
    from: '/inventory/material-transfers',
    to: '/stock/transfers',
    status: 'unclear',
    note: 'The Spec does not mention Material Transfers. Assumed they are the same thing as Transfers, which only appears with a second location.',
  },
  {
    from: '/inventory/material-transfer',
    to: '/stock/transfers',
    status: 'unclear',
    note: 'The Spec does not mention a new Material Transfer form. Assumed it is the Transfers tab, which only appears with a second location.',
  },
  { from: '/inventory/stock-entry', to: null, status: 'keep', note: 'Manufacture and Repack stock entries have no redesigned form yet, so the current screen stays at this address until it has one.' },
  { from: '/inventory/stock-reconciliation', to: '/stock/count', status: 'sure', note: 'Reconciliation is now Count stock.' },
  { from: '/inventory/multi-level-reconciliation', to: '/stock/count', status: 'sure' },
  { from: '/inventory/multi-level-reconciliation/new', to: '/stock/count', status: 'sure', note: 'Count stock is a guided count, so starting a new count is the same page.' },
  { from: '/inventory/multi-level-reconciliation/:id', to: '/stock/count/:id', status: 'sure' },
  {
    from: '/inventory/multi-level-reconciliation/:id/stock-take',
    to: '/stock/count/:id',
    status: 'unclear',
    note: 'The Spec does not mention the separate Add Stock Take step. Assumed it is a step inside the guided count for the same id.',
  },

  // Stock transfers (a module of its own in the old app, Transfers under Stock levels in the new one)
  { from: '/stock-transfers', to: '/stock/transfers', status: 'sure', note: 'Transfers only appears when the shop has a second location.' },
  { from: '/stock-transfers/list', to: '/stock/transfers', status: 'sure' },
  {
    from: '/stock-transfers/create',
    to: '/stock/transfers',
    status: 'unclear',
    note: 'The Spec gives no address for a new transfer. Assumed the Transfers tab, where the new transfer form is opened.',
  },
  {
    from: '/stock-transfers/create-request',
    to: '/stock/transfers',
    status: 'unclear',
    note: 'The Spec gives no address for a transfer request. Assumed the Transfers tab, where the request form is opened.',
  },
  { from: '/stock-transfers/:id', to: '/stock/transfers?open=:id', status: 'sure' },
  {
    from: '/stock-transfers/:id/approve',
    to: '/stock/transfers?open=:id',
    status: 'unclear',
    note: 'The Spec does not say how a transfer is approved. Assumed approving is an action in the transfer panel.',
  },
  {
    from: '/stock-transfers/:id/dispatch',
    to: '/stock/transfers?open=:id',
    status: 'unclear',
    note: 'The Spec does not say how a transfer is dispatched. Assumed dispatching is an action in the transfer panel.',
  },
  {
    from: '/stock-transfers/:id/receive',
    to: '/stock/transfers?open=:id',
    status: 'unclear',
    note: 'The Spec does not say how a transfer is received. Assumed receiving is an action in the transfer panel.',
  },

  // Warehouses (now Locations under Stock levels)
  { from: '/warehouses', to: '/stock/locations', status: 'sure', note: 'Locations only appears when the shop has a second location.' },
  {
    from: '/warehouses/new',
    to: '/stock/locations',
    status: 'unclear',
    note: 'The Spec gives no address for adding a location. Assumed the Locations tab, where the add form is opened.',
  },
  { from: '/warehouses/:id', to: '/stock/locations?open=:id', status: 'sure' },
  {
    from: '/warehouses/:id/edit',
    to: '/stock/locations?open=:id',
    status: 'unclear',
    note: 'The Spec has no edit page for a location. Assumed editing happens in the location panel.',
  },
  {
    from: '/warehouses/:id/staff',
    to: '/stock/locations?open=:id',
    status: 'unclear',
    note: 'The Spec does not say where store staff is managed. Assumed the location panel, with people themselves managed under Team.',
  },
  {
    from: '/warehouses/staff-assignment',
    to: '/settings/team',
    status: 'unclear',
    note: 'The Spec has no staff assignment page. Assumed it belongs to Team, which covers people, role and till access.',
  },

  // Purchases
  { from: '/purchases', to: '/purchases', status: 'sure' },
  { from: '/purchases/new', to: '/purchases/new', status: 'sure' },
  { from: '/purchases/:id', to: '/purchases?open=:id', status: 'sure' },
  { from: '/purchases/returns', to: '/purchases/returns', status: 'sure' },
  { from: '/purchases/create-grn', to: '/purchases?action=receive', status: 'sure', note: 'Create GRN is now the Receive goods button.' },
  {
    from: '/purchases/create-order',
    to: '/purchases/new',
    status: 'unclear',
    note: 'The Spec lists Create Order only under what the Purchases tabs replace. Assumed an order is started from the New purchase form, and the Orders tab lists it.',
  },
  {
    from: '/purchases/submit-order',
    to: '/purchases/orders',
    status: 'unclear',
    note: 'Submit Order is now Send order to supplier, but the Spec does not say where. Assumed it is an action on an order in the Orders tab.',
  },
  {
    from: '/purchases/grns',
    to: '/purchases',
    status: 'unclear',
    note: 'The Spec has no Goods received list among the three tabs. Assumed received goods show in All purchases, because the bill and the stock update together.',
  },
  {
    from: '/purchases/grns/:id',
    to: '/purchases?open=:id',
    status: 'unclear',
    note: 'Assumed a goods received note opens in the purchase panel, as there is no separate Goods received page.',
  },
  {
    from: '/purchases/receipts',
    to: '/purchases',
    status: 'unclear',
    note: 'The Spec lists Purchase Receipts as replaced but names no tab for them. Assumed All purchases.',
  },
  {
    from: '/purchases/receipts/new',
    to: '/purchases?action=receive',
    status: 'unclear',
    note: 'Assumed a new purchase receipt is the same job as the Receive goods button.',
  },
  {
    from: '/purchases/receipts/:id',
    to: '/purchases?open=:id',
    status: 'unclear',
    note: 'Assumed a purchase receipt opens in the purchase panel, as there is no separate receipts page.',
  },
  {
    from: '/purchases/invoices',
    to: '/purchases',
    status: 'unclear',
    note: 'The Spec lists Purchase Invoices as replaced but names no tab for them. Assumed All purchases, because a purchase invoice is the bill.',
  },
  {
    from: '/purchases/invoices/:invoiceNo',
    to: '/purchases?open=:invoiceNo',
    status: 'unclear',
    note: 'Assumed a purchase invoice opens in the purchase panel. The panel must accept an invoice number as well as a purchase id.',
  },

  // Suppliers
  { from: '/suppliers', to: '/suppliers', status: 'sure' },
  { from: '/suppliers/groups', to: '/settings/advanced?section=supplier-groups', status: 'sure' },
  { from: '/suppliers/:id', to: '/suppliers?open=:id', status: 'sure' },

  // Reports. The Spec gives no per-report names, so each report gets a short name from its old name.
  { from: '/reports', to: '/reports', status: 'sure' },
  { from: '/reports/sales-analytics', to: '/reports/sales', status: 'sure' },
  { from: '/reports/inventory-summary', to: '/reports/stock-summary', status: 'sure' },
  { from: '/reports/inventory-valuation', to: '/reports/stock-value', status: 'sure' },
  { from: '/reports/stock-movement', to: '/reports/stock-movement', status: 'sure' },
  { from: '/reports/aging-stock', to: '/reports/aging-stock', status: 'sure' },
  { from: '/reports/performance-metrics', to: '/reports/performance', status: 'sure' },
  {
    from: '/reports/inventory-valuation/value-by-category',
    to: '/reports/stock-value',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/inventory-valuation/cost-method-comparison',
    to: '/reports/stock-value',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/inventory-valuation/value-trends',
    to: '/reports/stock-value',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/stock-movement/turnover',
    to: '/reports/stock-movement',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/stock-movement/days-on-hand',
    to: '/reports/stock-movement',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/stock-movement/movement-patterns',
    to: '/reports/stock-movement',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/aging-stock/stock-aging',
    to: '/reports/aging-stock',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/aging-stock/obsolescence-risk',
    to: '/reports/aging-stock',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/aging-stock/aging-recommendations',
    to: '/reports/aging-stock',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/performance-metrics/accuracy',
    to: '/reports/performance',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/performance-metrics/variance',
    to: '/reports/performance',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/performance-metrics/adjustment-trends',
    to: '/reports/performance',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report.',
  },
  {
    from: '/reports/performance-metrics/transfer-efficiency',
    to: '/reports/performance',
    status: 'unclear',
    note: 'The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report, and it only matters with a second location.',
  },

  // Staff and Roles (both move into Settings, Team)
  { from: '/staff', to: '/settings/team', status: 'sure', note: 'Staff moves into Settings as Team. This is the default for open question 1, not yet confirmed.' },
  { from: '/roles', to: '/settings/team', status: 'sure' },
  { from: '/roles/:roleName', to: '/settings/team?open=:roleName', status: 'sure' },
  {
    from: '/roles/new',
    to: '/settings/team',
    status: 'unclear',
    note: 'The Spec gives Team three fixed roles (Owner, Manager, Cashier) and no screen for creating one. Assumed the Team page until it is decided whether custom roles continue.',
  },
  {
    from: '/roles/:roleName/edit',
    to: '/settings/team?open=:roleName',
    status: 'unclear',
    note: 'The Spec has no role edit page. Assumed editing happens in the role panel on Team.',
  },
  {
    from: '/roles/:roleName/permissions',
    to: '/settings/team?open=:roleName',
    status: 'unclear',
    note: 'The Spec has no role permissions page. Assumed permissions are shown in the role panel on Team.',
  },

  // Settings
  {
    from: '/settings',
    to: '/settings/business',
    status: 'unclear',
    note: 'The Spec does not say which of the five sections opens first. Assumed Business, the first in the list.',
  },
  { from: '/settings/business', to: '/settings/business', status: 'sure' },
  { from: '/settings/pos-profile', to: '/settings/till', status: 'sure', note: 'POS Profile is now Till settings, in the Till and payments section.' },
  { from: '/settings/payment-methods', to: '/settings/till', status: 'sure', note: 'Payment methods become plain switches in the Till and payments section.' },
  {
    from: '/settings/payment-gateways',
    to: '/settings/till',
    status: 'unclear',
    note: 'The Spec does not mention payment gateways. Assumed they sit with payment methods in Till and payments.',
  },
  {
    from: '/settings/bank-accounts',
    to: '/settings/till',
    status: 'unclear',
    note: 'The Spec does not mention bank accounts. Assumed Till and payments, because Add expense takes a bank as a place to pay from.',
  },
  {
    from: '/settings/etims',
    to: '/settings/tax',
    status: 'unclear',
    note: 'The Spec does not mention eTIMS. Assumed it belongs in the Tax section, as it is the tax authority integration.',
  },
  {
    from: '/settings/account-provisioning',
    to: '/settings/advanced?section=account-provisioning',
    status: 'unclear',
    note: 'The Spec says to describe it plainly or move it to Advanced, after confirming what it does. Assumed Advanced until that is confirmed.',
  },
  {
    from: '/settings/inventory-discounts',
    to: '/settings/advanced?section=inventory-discounts',
    status: 'unclear',
    note: 'The Spec does not mention inventory discounts. Assumed Advanced, since no other section fits.',
  },
  {
    from: '/settings/inventory-discounts/new',
    to: '/settings/advanced?section=inventory-discounts',
    status: 'unclear',
    note: 'The Spec gives no address for a new discount rule. Assumed the discounts card in Advanced, where the form is opened.',
  },
  {
    from: '/settings/inventory-discounts/:id/edit',
    to: '/settings/advanced?section=inventory-discounts',
    status: 'unclear',
    note: 'The Spec gives no address for editing a discount rule. Assumed the discounts card in Advanced. The id is dropped because that card has no panel for one rule.',
  },
  {
    from: '/settings/loyalty-programs',
    to: '/settings/advanced?section=loyalty-programs',
    status: 'unclear',
    note: 'The Spec does not mention loyalty programs. Assumed Advanced, since no other section fits.',
  },
  {
    from: '/settings/audit-trail',
    to: '/settings/team',
    status: 'unclear',
    note: 'The Spec does not mention the audit trail. Assumed Team and security, because it records who did what.',
  },
  {
    from: '/settings/security',
    to: '/settings/team',
    status: 'unclear',
    note: 'The Spec names the section Team and security but lists no Security page. Assumed the security settings sit on that section.',
  },

  // Outside the redesign
  { from: '/', to: null, status: 'keep', note: 'Landing or sign-in, not part of the redesign.' },
  { from: '/login', to: null, status: 'keep' },
  { from: '/register', to: null, status: 'keep' },
  { from: '/forgot-password', to: null, status: 'keep' },
  { from: '/terms-of-service', to: null, status: 'keep' },
  { from: '/privacy-policy', to: null, status: 'keep' },
  { from: '/contact-us', to: null, status: 'keep' },
  { from: '/kitchen', to: null, status: 'keep', note: 'The Spec does not mention the kitchen station screen, so it stays as it is.' },
  { from: '/settings/new-look', to: null, status: 'keep', note: 'This is the New look switch itself.' },
  // Screens added after the redesign was planned. They have no redesigned page, so they stay as they are; Settings, Advanced lists each one.
  { from: '/settings/approvals', to: null, status: 'keep', note: 'Money approvals are not redesigned yet. Settings, Advanced links to the current screen.' },
  { from: '/settings/payment-matching', to: null, status: 'keep', note: 'Payment matching is not redesigned yet. Settings, Advanced links to the current screen.' },
  { from: '/settings/sales-people', to: null, status: 'keep', note: 'Sales people are not redesigned yet. Settings, Advanced links to the current screen.' },
  { from: '/inventory/recipes', to: null, status: 'keep', note: 'Recipes are not redesigned yet. Settings, Advanced links to the current screen.' },
  { from: '/inventory/recipes/new', to: null, status: 'keep', note: 'A new recipe stays on the current screen.' },
  { from: '/inventory/recipes/:dish', to: null, status: 'keep', note: 'A recipe stays on the current screen.' },
  { from: '/inventory/wastage', to: null, status: 'keep', note: 'Wastage is not redesigned yet. Settings, Advanced links to the current screen.' },
  { from: '*', to: null, status: 'keep', note: 'The not found page.' },
];

// Pages that only exist in some shops. Everything else is always available.
const SECOND_LOCATION = 'second-location';
const TRACKS_EXPIRY = 'tracks-expiry';

const PAGES = [
  { path: '/', title: 'Home' },
  { path: '/till', title: 'Till' },

  { path: '/sales', title: 'Sales' },
  { path: '/sales/unpaid', title: 'Unpaid' },
  { path: '/sales/returns', title: 'Returns' },
  { path: '/sales/sessions', title: 'Till sessions' },
  { path: '/sales/new', title: 'New invoice' },

  { path: '/customers', title: 'Customers' },
  { path: '/customers/owing', title: 'Owing' },
  { path: '/customers/new', title: 'New customer' },

  { path: '/products', title: 'Products' },
  { path: '/products/categories', title: 'Categories' },
  { path: '/products/new', title: 'New product' },
  { path: '/products/import', title: 'Import products' },

  { path: '/stock', title: 'Stock levels' },
  { path: '/stock/low', title: 'Low stock' },
  { path: '/stock/movements', title: 'Movements' },
  { path: '/stock/count', title: 'Count stock' },
  { path: '/stock/count/:id', title: 'Count stock' },
  { path: '/stock/locations', title: 'Locations', onlyWhen: SECOND_LOCATION },
  { path: '/stock/transfers', title: 'Transfers', onlyWhen: SECOND_LOCATION },
  { path: '/stock/expiry', title: 'Expiry', onlyWhen: TRACKS_EXPIRY },

  { path: '/purchases', title: 'Purchases' },
  { path: '/purchases/orders', title: 'Orders' },
  { path: '/purchases/returns', title: 'Returns' },
  { path: '/purchases/new', title: 'New purchase' },

  { path: '/suppliers', title: 'Suppliers' },
  { path: '/expenses', title: 'Expenses' },

  { path: '/reports', title: 'Reports' },
  { path: '/reports/sales', title: 'Sales' },
  { path: '/reports/profit', title: 'Profit' },
  { path: '/reports/owed', title: 'Money owed' },
  { path: '/reports/running-costs', title: 'Running costs' },
  { path: '/reports/stock-summary', title: 'Stock summary' },
  { path: '/reports/stock-value', title: 'Stock value' },
  { path: '/reports/stock-movement', title: 'Stock movement' },
  { path: '/reports/aging-stock', title: 'Aging stock' },
  { path: '/reports/performance', title: 'Performance' },

  { path: '/settings/business', title: 'Business' },
  { path: '/settings/till', title: 'Till and payments' },
  { path: '/settings/tax', title: 'Tax' },
  { path: '/settings/team', title: 'Team and security' },
  { path: '/settings/advanced', title: 'Advanced' },
];

/** Every page in the New look, de-duplicated and sorted by path. Paths carry no query; ':tokens' are allowed. */
export const NEW_PAGES = [...new Map(PAGES.map((page) => [page.path, page])).values()].sort((a, b) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0
);
