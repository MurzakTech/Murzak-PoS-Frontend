/**
 * Role-Based Access Control Configuration
 * Maps roles to allowed routes/views in the POS application
 */

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
  ],
  INDUSTRY: [
    '/industry/:industryCode/products',
  ],
};

// Helper function to combine route groups
const combineRoutes = (...groups) => {
  return groups.flatMap(group => ROUTE_GROUPS[group] || []);
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
      'INDUSTRY'
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
      'INDUSTRY'
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
      'INDUSTRY'
    ),
  ],

  // Sales roles
  'Sales Manager': [
    ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'PRODUCTS', 'REPORTS'),
    '/inventory/stock-summary', // View stock for sales
  ],

  'Sales User': [
    '/dashboard',
    '/sales',
    '/sales/history',
    '/customers',
    '/products', // View products for sales
    '/inventory', // Access to inventory section
    '/inventory/stock-summary', // Check stock availability
    // Stock reconciliation access
    '/inventory/stock-reconciliation',
    // Multi-level reconciliation access (can add stock take when status is "Pending Sales User")
    '/inventory/multi-level-reconciliation',
    '/inventory/multi-level-reconciliation/:id',
    '/inventory/multi-level-reconciliation/:id/stock-take',
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
    '/purchases',
    '/purchases/receipts',
    '/purchases/receipts/new',
    '/suppliers',
    '/inventory/stock-summary',
    '/products', // View products
  ],

  // Stock/Inventory roles
  'Stock Manager': [
    ...combineRoutes('DASHBOARD', 'INVENTORY', 'WAREHOUSES', 'PRODUCTS', 'REPORTS', 'STOCK_TRANSFERS'),
    '/purchases', // View purchases for stock management
    '/purchases/receipts',
    '/inventory/multi-level-reconciliation/new',
  ],

  'Stock User': [
    '/dashboard',
    ...combineRoutes('INVENTORY', 'WAREHOUSES', 'STOCK_TRANSFERS'),
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
    ...combineRoutes('DASHBOARD', 'CUSTOMERS', 'SUPPLIERS', 'REPORTS', 'SETTINGS'),
    '/sales/history',
    '/sales/returns',
    '/purchases',
    '/purchases/receipts',
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
    '/suppliers',
    '/sales/history',
    '/purchases',
    '/purchases/receipts',
    ...combineRoutes('REPORTS'),
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
    '/sales',
    '/sales/history',
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
    '/sales',
    '/sales/history',
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
    '/sales/history',
    '/customers',
  ],

  // Agent roles
  'Agent Manager': [
    ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'REPORTS'),
    '/products',
  ],

  Agent: [
    '/dashboard',
    '/sales',
    '/sales/history',
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
    ...combineRoutes('REPORTS', 'SALES', 'PURCHASES', 'INVENTORY'),
    '/sales/history',
    '/purchases',
    '/inventory/stock-summary',
    '/products',
  ],

  // Auditor - Read-only access to financial and transaction data
  Auditor: [
    '/dashboard',
    '/sales/history',
    '/purchases',
    '/purchases/receipts',
    ...combineRoutes('CUSTOMERS', 'SUPPLIERS', 'REPORTS'),
    '/settings/bank-accounts',
    '/settings/audit-trail',
  ],

  // Expense Approver - Access to financial approvals
  'Expense Approver': [
    '/dashboard',
    '/purchases',
    '/purchases/receipts',
    '/reports',
    '/settings/payment-methods',
  ],

  // Dashboard Manager - Access to dashboard and reports
  'Dashboard Manager': [
    '/dashboard',
    ...combineRoutes('REPORTS'),
    '/sales/history',
    '/purchases',
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
    '/purchases',
  ],

  // Academics roles (if applicable)
  'Academics User': [
    '/dashboard',
    '/products',
    '/sales',
    '/sales/history',
  ],

  // Blogger - Limited content access
  Blogger: [
    '/dashboard',
    '/products', // View products for content
  ],
};

/**
 * Check if a route path matches any allowed route pattern
 * Supports exact matches and prefix matches for dynamic routes
 */
export const isRouteAllowed = (routePath, allowedRoutes) => {
  // Return false if routePath is not a valid string
  if (!routePath || typeof routePath !== 'string') {
    return false;
  }

  if (!allowedRoutes || allowedRoutes.length === 0) {
    return false;
  }

  // Normalize route path (remove trailing slash)
  const normalizedPath = routePath.replace(/\/$/, '');

  // Check for exact match
  if (allowedRoutes.includes(normalizedPath)) {
    return true;
  }

  // Check for prefix match (for dynamic routes like /sales/invoice/:id)
  return allowedRoutes.some((allowedRoute) => {
    // Ensure allowedRoute is also a valid string
    if (!allowedRoute || typeof allowedRoute !== 'string') {
      return false;
    }

    // Normalize allowed route
    const normalizedAllowed = allowedRoute.replace(/\/$/, '');

    // Exact match (already checked above, but keep for consistency)
    if (normalizedPath === normalizedAllowed) {
      return true;
    }

    // If allowed route is a prefix of the current route
    // e.g., '/sales' matches '/sales/history'
    if (normalizedPath.startsWith(normalizedAllowed + '/')) {
      return true;
    }

    // Handle dynamic routes - if allowed route contains :, check base path
    // e.g., '/sales/invoice/:id' matches '/sales/invoice/123'
    // or '/inventory/multi-level-reconciliation/:id' matches '/inventory/multi-level-reconciliation/123/stock-take'
    if (normalizedAllowed.includes(':')) {
      // Split on ':' to get the base path before the first parameter
      const basePath = normalizedAllowed.split(':')[0];
      // Remove trailing slash from base path for comparison
      const normalizedBase = basePath.replace(/\/$/, '');
      
      // Check if the route path starts with the base path
      // This handles cases like:
      // - '/inventory/multi-level-reconciliation/:id' matching '/inventory/multi-level-reconciliation/123'
      // - '/inventory/multi-level-reconciliation/:id/stock-take' matching '/inventory/multi-level-reconciliation/123/stock-take'
      if (normalizedPath.startsWith(normalizedBase + '/') || normalizedPath === normalizedBase) {
        return true;
      }
    }

    return false;
  });
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

