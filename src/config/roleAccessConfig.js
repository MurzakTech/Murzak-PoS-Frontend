/**
 * Role-Based Access Control Configuration
 * Maps roles to allowed routes/views in the POS application
 *
 * Each entry grants exactly that screen. '/sales' means the Sales screen only,
 * not everything under it, and '/warehouses/:id' means a store's page, not
 * '/warehouses/new'. List every screen a role needs.
 *
 * This only decides what the app shows. The server must still check every
 * request, because anything in the browser can be changed by the person using it.
 */

import { matchRoutes } from 'react-router-dom';

// Define route groups for easier management
const ROUTE_GROUPS = {
  DASHBOARD: ['/dashboard'],
  PRODUCTS: [
    '/products',
    '/products/new',
    '/products/update-price',
    '/products/variations',
    '/products/bulk-import',
    '/products/bulk-stock-import',
    '/products/price-groups',
    '/products/units',
    '/products/categories',
    '/products/brands',
    '/products/warranties',
    '/products/load-products',
  ],
  SALES: [
    '/sales',
    '/sales/pos',
    '/sales/history',
    '/sales/invoice/new',
    '/sales/pos-opening-entries',
    '/sales/invoice/:id',
    '/sales/pos-opening-entries/:name',
    '/sales/pos-invoice/:id',
    '/sales/invoice/:id/edit',
    '/sales/returns',
  ],
  WAREHOUSES: [
    '/warehouses',
    '/warehouses/new',
    '/warehouses/staff-assignment',
    '/warehouses/:id',
    '/warehouses/:id/edit',
    '/warehouses/:id/staff',
  ],
  INVENTORY: [
    '/inventory',
    '/inventory/stock-summary',
    '/inventory/low-stock',
    '/inventory/expiry-alerts',
    '/inventory/stock-ledger',
    '/inventory/item-details',
    '/inventory/stock-entries',
    '/inventory/stock-entries/:stockEntryName',
    '/inventory/material-receipts',
    '/inventory/material-issues',
    '/inventory/material-transfers',
    '/inventory/stock-entry',
    '/inventory/material-receipt',
    '/inventory/material-issue',
    '/inventory/material-transfer',
    '/inventory/stock-reconciliation',
    '/inventory/multi-level-reconciliation',
    '/inventory/multi-level-reconciliation/new',
    '/inventory/multi-level-reconciliation/:id',
    '/inventory/multi-level-reconciliation/:id/stock-take',
  ],
  CUSTOMERS: [
    '/customers',
    '/customers/credit',
  ],
  SUPPLIERS: [
    '/suppliers',
    '/suppliers/groups',
    '/suppliers/:id',
  ],
  PURCHASES: [
    '/purchases',
    '/purchases/new',
    '/purchases/create-order',
    '/purchases/submit-order',
    '/purchases/create-grn',
    '/purchases/returns',
    '/purchases/receipts',
    '/purchases/receipts/new',
    '/purchases/:id',
    '/purchases/receipts/:id',
    '/purchases/grns',
    '/purchases/grns/:id',
    '/purchases/invoices',
    '/purchases/invoices/:invoiceNo',
  ],
  STOCK_TRANSFERS: [
    '/stock-transfers',
    '/stock-transfers/list',
    '/stock-transfers/create',
    '/stock-transfers/create-request',
    '/stock-transfers/:id',
    '/stock-transfers/:id/approve',
    '/stock-transfers/:id/dispatch',
    '/stock-transfers/:id/receive',
  ],
  STAFF: ['/staff'],
  ROLES: [
    '/roles',
    '/roles/new',
    '/roles/:roleName',
    '/roles/:roleName/edit',
    '/roles/:roleName/permissions',
  ],
  REPORTS: [
    '/reports',
    '/reports/sales-analytics',
    '/reports/inventory-summary',
    '/reports/inventory-valuation',
    '/reports/inventory-valuation/value-by-category',
    '/reports/inventory-valuation/cost-method-comparison',
    '/reports/inventory-valuation/value-trends',
    '/reports/stock-movement',
    '/reports/stock-movement/turnover',
    '/reports/stock-movement/days-on-hand',
    '/reports/stock-movement/movement-patterns',
    '/reports/aging-stock',
    '/reports/aging-stock/stock-aging',
    '/reports/aging-stock/obsolescence-risk',
    '/reports/aging-stock/aging-recommendations',
    '/reports/performance-metrics',
    '/reports/performance-metrics/accuracy',
    '/reports/performance-metrics/variance',
    '/reports/performance-metrics/adjustment-trends',
    '/reports/performance-metrics/transfer-efficiency',
  ],
  SETTINGS: [
    '/settings',
    '/settings/pos-profile',
    '/settings/business',
    '/settings/etims',
    '/settings/bank-accounts',
    '/settings/account-provisioning',
    '/settings/payment-methods',
    '/settings/payment-gateways',
    '/settings/inventory-discounts',
    '/settings/inventory-discounts/new',
    '/settings/inventory-discounts/:id/edit',
    '/settings/loyalty-programs',
    '/settings/audit-trail',
    '/settings/security',
  ],
  INDUSTRY: [
    '/industry/:industryCode/products',
  ],
  // Kitchen and bar station screen (anyone who can use the till can have one on a tablet)
  KITCHEN: ['/kitchen'],
};

// Smaller bundles for roles that should not get a whole area
const ROUTE_BUNDLES = {
  // Ring up sales at the till and look back at them; no returns, edits or price changes
  SALES_TILL: ['/sales', '/sales/pos', '/sales/history', '/sales/invoice/:id', '/sales/pos-invoice/:id'],
  // Look at past sales only
  SALES_VIEW: ['/sales/history', '/sales/invoice/:id', '/sales/pos-invoice/:id'],
  // Look at purchases, receipts, goods received and supplier invoices only
  PURCHASES_VIEW: [
    '/purchases',
    '/purchases/:id',
    '/purchases/receipts',
    '/purchases/receipts/:id',
    '/purchases/grns',
    '/purchases/grns/:id',
    '/purchases/invoices',
    '/purchases/invoices/:invoiceNo',
  ],
  SUPPLIERS_VIEW: ['/suppliers', '/suppliers/:id'],
  INVENTORY_VIEW: ['/inventory', '/inventory/stock-summary', '/inventory/low-stock', '/inventory/stock-ledger', '/inventory/item-details'],
  // Take part in a multi-level stock count when it reaches this role
  RECONCILIATION_STEP: [
    '/inventory/multi-level-reconciliation',
    '/inventory/multi-level-reconciliation/:id',
    '/inventory/multi-level-reconciliation/:id/stock-take',
  ],
};

// Helper function to combine route groups
const combineRoutes = (...groups) => {
  return groups.flatMap(group => ROUTE_GROUPS[group] || ROUTE_BUNDLES[group] || []);
};

/**
 * Role-based access configuration
 * Each role maps to an array of allowed route paths
 * Routes can be specified individually or by using route groups
 */
export const ROLE_ACCESS_CONFIG = {
  // Administrator - Full access to everything
  Administrator: [
    ...combineRoutes(
      'DASHBOARD',
      'PRODUCTS',
      'SALES',
      'WAREHOUSES',
      'INVENTORY',
      'CUSTOMERS',
      'SUPPLIERS',
      'PURCHASES',
      'STOCK_TRANSFERS',
      'STAFF',
      'ROLES',
      'REPORTS',
      'SETTINGS',
      'INDUSTRY',
      'KITCHEN'
    ),
  ],

  // System Manager - Full access similar to Administrator
  'System Manager': [
    ...combineRoutes(
      'DASHBOARD',
      'PRODUCTS',
      'SALES',
      'WAREHOUSES',
      'INVENTORY',
      'CUSTOMERS',
      'SUPPLIERS',
      'PURCHASES',
      'STOCK_TRANSFERS',
      'STAFF',
      'ROLES',
      'REPORTS',
      'SETTINGS',
      'INDUSTRY',
      'KITCHEN'
    ),
  ],

  // All - Full access (catch-all role)
  All: [
    ...combineRoutes(
      'DASHBOARD',
      'PRODUCTS',
      'SALES',
      'WAREHOUSES',
      'INVENTORY',
      'CUSTOMERS',
      'SUPPLIERS',
      'PURCHASES',
      'STOCK_TRANSFERS',
      'STAFF',
      'ROLES',
      'REPORTS',
      'SETTINGS',
      'INDUSTRY',
      'KITCHEN'
    ),
  ],

  // Sales roles
  'Sales Manager': [
    ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'PRODUCTS', 'REPORTS', 'KITCHEN'),
    '/inventory/stock-summary', // View stock for sales
  ],

  'Sales User': [
    '/dashboard',
    ...combineRoutes('SALES_TILL', 'RECONCILIATION_STEP'),
    '/sales/invoice/new',
    '/kitchen', // station screen on a tablet
    '/customers',
    '/products', // View products for sales
    '/inventory', // Access to inventory section
    '/inventory/stock-summary', // Check stock availability
  ],

  // Purchase roles
  'Purchase Manager': [
    ...combineRoutes('DASHBOARD', 'PURCHASES', 'SUPPLIERS', 'INVENTORY', 'REPORTS'),
    '/products', // View products
    '/purchases/create-order',
    '/purchases/submit-order',
    '/purchases/create-grn',
  ],

  'Purchase User': [
    '/dashboard',
    ...combineRoutes('PURCHASES_VIEW', 'SUPPLIERS_VIEW'),
    '/purchases/new',
    '/purchases/create-order',
    '/purchases/submit-order',
    '/purchases/receipts/new',
    '/inventory/stock-summary',
    '/products', // View products
  ],

  // Stock/Inventory roles
  'Stock Manager': [
    ...combineRoutes('DASHBOARD', 'INVENTORY', 'WAREHOUSES', 'PRODUCTS', 'REPORTS', 'STOCK_TRANSFERS'),
    ...combineRoutes('PURCHASES_VIEW'), // View purchases for stock management
    '/inventory/multi-level-reconciliation/new',
  ],

  // Everyday stock work; creating stores and starting stock-count rounds stays with Stock Managers
  'Stock User': [
    '/dashboard',
    ...combineRoutes('INVENTORY', 'WAREHOUSES', 'STOCK_TRANSFERS').filter(
      (route) => !['/warehouses/new', '/inventory/multi-level-reconciliation/new'].includes(route)
    ),
    '/products', // View products
    '/inventory/stock-summary',
    '/inventory/low-stock',
    '/inventory/expiry-alerts',
    '/inventory/stock-ledger',
    '/inventory/item-details',
  ],

  // Quality Manager - Can perform quality checks and stock takes in multi-level reconciliation
  'Quality Manager': [
    '/dashboard',
    '/inventory/stock-summary', // View stock for quality checks
    '/products', // View products
    // Multi-level reconciliation access (can add stock take when status is "Pending Quality Manager")
    '/inventory/multi-level-reconciliation',
    '/inventory/multi-level-reconciliation/:id',
    '/inventory/multi-level-reconciliation/:id/stock-take',
  ],

  // Accounts roles
  'Accounts Manager': [
    ...combineRoutes('DASHBOARD', 'CUSTOMERS', 'SUPPLIERS', 'REPORTS', 'SALES_VIEW', 'PURCHASES_VIEW'),
    '/sales/returns',
    // Finance settings only; payment gateways, eTIMS and business settings stay with admins
    '/settings',
    '/settings/bank-accounts',
    '/settings/payment-methods',
    '/settings/account-provisioning',
    '/settings/loyalty-programs',
    '/settings/audit-trail',
  ],

  'Accounts User': [
    '/dashboard',
    '/customers',
    '/customers/credit',
    ...combineRoutes('SUPPLIERS_VIEW', 'SALES_VIEW', 'PURCHASES_VIEW', 'REPORTS'),
  ],

  // Item/Product roles
  'Item Manager': [
    ...combineRoutes('DASHBOARD', 'PRODUCTS', 'INVENTORY', 'REPORTS'),
    '/inventory/stock-summary',
    '/inventory/low-stock',
    '/inventory/expiry-alerts',
  ],

  // Desk User - POS operations
  'Desk User': [
    '/dashboard',
    ...combineRoutes('SALES_TILL'),
    '/kitchen', // station screen on a tablet
    '/products', // View products for POS
    '/customers', // View customers
    '/inventory/stock-summary', // Check stock
  ],

  // Guest - Limited read-only access
  Guest: [
    '/dashboard',
    '/products', // View only
    '/sales/history', // View only
  ],

  // Employee - Basic access
  Employee: [
    '/dashboard',
    ...combineRoutes('SALES_TILL'),
    '/kitchen', // station screen on a tablet
    '/products',
    '/customers',
    '/inventory/stock-summary',
  ],

  // Employee Self Service - Limited self-service access
  'Employee Self Service': [
    '/dashboard',
    '/sales/history', // View own sales
  ],

  // Delivery roles
  'Delivery Manager': [
    ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'REPORTS'),
    '/sales/history',
    '/inventory/stock-summary',
  ],

  'Delivery User': [
    '/dashboard',
    ...combineRoutes('SALES_VIEW'),
    '/customers',
  ],

  // Agent roles
  'Agent Manager': [
    ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'REPORTS'),
    '/products',
  ],

  Agent: [
    '/dashboard',
    ...combineRoutes('SALES_TILL'),
    '/kitchen', // station screen on a tablet
    '/customers',
    '/products',
  ],

  // Customer - Very limited access (if they have desk access)
  Customer: [
    '/dashboard',
    '/products', // View products
    '/sales/history', // View own orders
  ],

  // Analytics - Read-only access to reports and data
  Analytics: [
    '/dashboard',
    ...combineRoutes('REPORTS', 'SALES_VIEW', 'PURCHASES_VIEW', 'INVENTORY_VIEW'),
    '/products',
  ],

  // Auditor - Read-only access to financial and transaction data
  Auditor: [
    '/dashboard',
    '/customers',
    ...combineRoutes('SALES_VIEW', 'PURCHASES_VIEW', 'SUPPLIERS_VIEW', 'REPORTS'),
    '/settings/audit-trail',
  ],

  // Expense Approver - Access to financial approvals
  'Expense Approver': [
    '/dashboard',
    ...combineRoutes('PURCHASES_VIEW'),
    '/reports',
    '/settings/payment-methods',
  ],

  // Dashboard Manager - Access to dashboard and reports
  'Dashboard Manager': [
    '/dashboard',
    ...combineRoutes('REPORTS', 'SALES_VIEW', 'PURCHASES_VIEW'),
    '/inventory/stock-summary',
  ],

  // Agriculture roles (if applicable)
  'Agriculture Manager': [
    ...combineRoutes('DASHBOARD', 'PRODUCTS', 'INVENTORY', 'PURCHASES', 'REPORTS'),
  ],

  'Agriculture User': [
    '/dashboard',
    '/products',
    '/inventory/stock-summary',
    ...combineRoutes('PURCHASES_VIEW'),
  ],

  // Academics roles (if applicable)
  'Academics User': [
    '/dashboard',
    '/products',
    ...combineRoutes('SALES_TILL'),
  ],

  // Blogger - Limited content access
  Blogger: [
    '/dashboard',
    '/products', // View products for content
  ],
};

// Every screen the app knows, so a web address can be traced to the one screen it opens
const KNOWN_ROUTES = Array.from(new Set(Object.values(ROUTE_GROUPS).flat())).map((path) => ({ path }));

/**
 * Work out which screen a web address opens, the same way the router does:
 * '/warehouses/new' is the New Store screen, not a store called "new".
 * Returns the screen's pattern (e.g. '/sales/invoice/:id'), or null.
 */
export const resolveRoutePattern = (routePath) => {
  if (!routePath || typeof routePath !== 'string') {
    return null;
  }
  const normalizedPath = routePath.length > 1 ? routePath.replace(/\/+$/, '') : routePath;
  const matches = matchRoutes(KNOWN_ROUTES, normalizedPath);
  return matches ? matches[matches.length - 1].route.path : null;
};

/**
 * Check if a route path is one of the allowed screens.
 * A screen must be listed itself: allowing '/sales' does not allow '/sales/returns'.
 * Accepts a real address ('/sales/invoice/ACC-001') or a pattern ('/sales/invoice/:id').
 */
export const isRouteAllowed = (routePath, allowedRoutes) => {
  if (!allowedRoutes || allowedRoutes.length === 0) {
    return false;
  }
  const pattern = resolveRoutePattern(routePath);
  return pattern !== null && allowedRoutes.includes(pattern);
};

/**
 * Get all allowed routes for a set of roles
 */
export const getAllowedRoutes = (roles) => {
  if (!roles || roles.length === 0) {
    return [];
  }

  // Filter out "All" role as it should not grant automatic access
  // Users with "All" role will only get access based on their other roles
  const effectiveRoles = roles.filter(role => role !== 'All');

  if (effectiveRoles.length === 0) {
    return [];
  }

  // Combine all routes from all user roles
  const allowedRoutesSet = new Set();
  
  effectiveRoles.forEach((role) => {
    const roleRoutes = ROLE_ACCESS_CONFIG[role] || [];
    roleRoutes.forEach((route) => allowedRoutesSet.add(route));
  });

  return Array.from(allowedRoutesSet);
};

/**
 * Sensitive pages open only to the roles named here (plus Administrator and System Manager).
 * Frappe gives every signed-in user the "All" role, and a parent route such as '/sales'
 * covers every page under it, so these pages cannot rely on the route lists above.
 */
export const RESTRICTED_ROUTES = {
  '/sales/returns': ['Sales Manager', 'Accounts Manager'],
  '/settings/audit-trail': ['Accounts Manager', 'Auditor'],
};

const restrictedRolesFor = (routePath) => {
  const path = (routePath || '').replace(/\/$/, '');
  const key = Object.keys(RESTRICTED_ROUTES).find((r) => path === r || path.startsWith(`${r}/`));
  return key ? RESTRICTED_ROUTES[key] : null;
};

/**
 * Check if user with given roles can access a specific route
 */
export const canAccessRoute = (routePath, roles) => {
  if (!roles || roles.length === 0) {
    return false;
  }

  // Administrator and System Manager roles have full access
  // Note: "All" role is treated as a normal role and only grants access to explicitly configured routes
  if (roles.some(role => ['Administrator', 'System Manager'].includes(role))) {
    return true;
  }

  const restrictedTo = restrictedRolesFor(routePath);
  if (restrictedTo) {
    return roles.some((role) => restrictedTo.includes(role));
  }

  const allowedRoutes = getAllowedRoutes(roles);
  return isRouteAllowed(routePath, allowedRoutes);
};

