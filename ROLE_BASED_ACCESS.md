# Role-Based Access Control (RBAC) Implementation

This document describes the role-based access control system implemented in the POS Frontend application.

## Overview

The system maps user roles to allowed routes/views, ensuring users only see and can access features appropriate for their roles.

## Components

### 1. Role Access Configuration (`src/config/roleAccessConfig.js`)

This file contains the mapping of roles to allowed routes. Each role is configured with an array of route paths they can access.

**Key Features:**
- Route groups for easier management (DASHBOARD, PRODUCTS, SALES, etc.)
- Support for exact route matches and prefix matches (for dynamic routes)
- Helper functions to check access and get allowed routes

**Example Role Configuration:**
```javascript
'Sales Manager': [
  ...combineRoutes('DASHBOARD', 'SALES', 'CUSTOMERS', 'PRODUCTS', 'REPORTS'),
  '/inventory/stock-summary',
],
```

### 2. useRoleAccess Hook (`src/hooks/useRoleAccess.js`)

A React hook that provides role-based access utilities:

- `hasAccess(routePath)` - Check if user can access a specific route
- `allowedRoutes` - Get all allowed routes for current user
- `filterRoutes(routes)` - Filter route arrays based on user access
- `hasRole(requiredRoles)` - Check if user has any of the specified roles
- `hasAllRoles(requiredRoles)` - Check if user has all specified roles
- `isAdmin` - Boolean indicating if user is an admin

### 3. Navigation Menu Filtering (`src/components/Layout/NavigationMenu.js`)

The navigation menu automatically filters routes based on user roles, showing only accessible menu items.

### 4. Protected Route Component (`src/components/ProtectedRoute.jsx`)

Enhanced to enforce role-based access:
- Automatically checks if user has access to the current route
- Redirects unauthorized users to dashboard
- Supports `requiredRoles` prop for route-level role requirements

### 5. Auth Slice Update (`src/store/authSlice.js`)

Updated `fetchCurrentUser` to store the `roles` array from the API response in the user object.

## Role Configuration

### Administrator Roles
- **Administrator** - Full access to all routes
- **System Manager** - Full access to all routes
- **All** - This role is filtered out during access checks and does not grant automatic access. Users with "All" role will only get access based on their other roles.

### Sales Roles
- **Sales Manager** - Dashboard, Sales, Customers, Products, Reports, Stock Summary
- **Sales User** - Dashboard, Sales, Sales History, Customers, Products, Stock Summary

### Purchase Roles
- **Purchase Manager** - Dashboard, Purchases, Suppliers, Inventory, Reports, Products
- **Purchase User** - Dashboard, Purchases, Purchase Receipts, Suppliers, Stock Summary, Products

### Stock/Inventory Roles
- **Stock Manager** - Dashboard, Inventory, Warehouses, Products, Reports, Purchases
- **Stock User** - Dashboard, Inventory, Warehouses, Products, Stock Summary, Low Stock, Stock Ledger

### Accounts Roles
- **Accounts Manager** - Dashboard, Customers, Suppliers, Reports, Settings (financial), Sales History, Purchases
- **Accounts User** - Dashboard, Customers, Customer Credit, Suppliers, Sales History, Purchases, Reports

### Other Roles
- **Item Manager** - Dashboard, Products, Inventory, Reports
- **Desk User** - Dashboard, Sales, Sales History, Products, Customers, Stock Summary
- **Guest** - Limited read-only access (Dashboard, Products view, Sales History view)
- **Employee** - Basic access (Dashboard, Sales, Sales History, Products, Customers, Stock Summary)
- **Employee Self Service** - Limited self-service (Dashboard, own Sales History)
- **Delivery Manager/User** - Sales and delivery-related access
- **Agent Manager/Agent** - Sales and customer management
- **Customer** - Very limited access (if they have desk access)
- **Analytics** - Read-only access to reports and data
- **Auditor** - Read-only access to financial and transaction data
- **Expense Approver** - Access to financial approvals
- **Dashboard Manager** - Dashboard and reports access

## Usage Examples

### In a Component
```javascript
import useRoleAccess from '../hooks/useRoleAccess';

function MyComponent() {
  const { hasAccess, hasRole, isAdmin } = useRoleAccess();
  
  if (!hasAccess('/settings/roles')) {
    return <div>Access Denied</div>;
  }
  
  if (hasRole(['Sales Manager', 'Administrator'])) {
    // Show manager features
  }
}
```

### In Routes
```javascript
<Route
  path="/settings/roles"
  element={
    <ProtectedRoute requiredRoles={['Administrator', 'System Manager']}>
      <RoleManagement />
    </ProtectedRoute>
  }
/>
```

## API Response Structure

The `get_current_user` API endpoint should return:
```json
{
  "message": {
    "user": { ... },
    "company": { ... },
    "roles": ["Sales Manager", "Accounts User", ...],
    ...
  }
}
```

The roles array is automatically extracted and stored in the user object in Redux state.

## Adding New Roles

To add a new role:

1. Add the role configuration to `src/config/roleAccessConfig.js`:
```javascript
'New Role': [
  '/dashboard',
  '/products',
  // ... other allowed routes
],
```

2. The system will automatically:
   - Filter navigation menu items
   - Enforce route access
   - Check permissions in components using the hook

## Dynamic Routes

The system supports dynamic routes (e.g., `/sales/invoice/:id`). Routes are matched by:
1. Exact path match
2. Prefix match (if route starts with allowed route + '/')
3. Base path match for dynamic routes (e.g., `/sales/invoice/` matches `/sales/invoice/:id`)

## Notes

- Hidden routes (marked with `hideFromMenu: true`) are not filtered from navigation but are still checked for access
- Administrator and System Manager roles have full access to all routes
- The "All" role is filtered out during access checks and does not grant automatic access. Users with "All" role will only get access based on their other roles.
- If a user has no roles (or only "All" role), they will have no access to protected routes
- The system gracefully handles missing roles or empty role arrays

