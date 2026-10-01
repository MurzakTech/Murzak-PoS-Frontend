# Role-Based Access Control (RBAC) Analysis

## Overview
This document analyzes how role-based access control is implemented in the SavvyPOS application, specifically focusing on the `roleAccessConfig.js` file and its integration with the side menu navigation.

---

## 1. Configuration Structure (`roleAccessConfig.js`)

### 1.1 Route Groups
The configuration uses a **route grouping system** to organize routes by functional area:

```javascript
const ROUTE_GROUPS = {
  DASHBOARD: ['/dashboard'],
  PRODUCTS: ['/products', '/products/new', ...],
  SALES: ['/sales', '/sales/history', ...],
  WAREHOUSES: [...],
  INVENTORY: [...],
  // ... etc
}
```

**Benefits:**
- **Maintainability**: Routes are grouped logically, making updates easier
- **Reusability**: Route groups can be combined for different roles
- **Consistency**: Ensures all related routes are included together

### 1.2 Role Configuration
Each role is mapped to an array of allowed routes:

```javascript
export const ROLE_ACCESS_CONFIG = {
  'Administrator': [...combineRoutes('DASHBOARD', 'PRODUCTS', ...)],
  'Sales Manager': [...combineRoutes('DASHBOARD', 'SALES', ...)],
  // ... etc
}
```

**Key Features:**
- **Hierarchical Access**: Administrator and System Manager have full access
- **Granular Control**: Each role has specific route permissions
- **Dynamic Routes**: Supports routes with parameters (e.g., `/sales/invoice/:id`)

### 1.3 Helper Functions

#### `combineRoutes(...groups)`
Combines multiple route groups into a single array.

#### `isRouteAllowed(routePath, allowedRoutes)`
Checks if a route path matches any allowed route pattern:
- **Exact match**: `/dashboard` matches `/dashboard`
- **Prefix match**: `/sales` matches `/sales/history`
- **Dynamic routes**: `/sales/invoice/:id` matches `/sales/invoice/123`

#### `getAllowedRoutes(roles)`
Returns all allowed routes for a set of roles:
- Filters out "All" role (doesn't grant automatic access)
- Combines routes from all user roles
- Returns unique routes using a Set

#### `canAccessRoute(routePath, roles)`
Main access check function:
- Administrator and System Manager always return `true`
- Otherwise checks against `getAllowedRoutes(roles)`

---

## 2. Hook Implementation (`useRoleAccess.js`)

### 2.1 Role Extraction
```javascript
const roles = useMemo(() => {
  // Handles both user.roles (array) and user.role (string)
  if (Array.isArray(user.roles)) return user.roles;
  if (typeof user.role === 'string') return [user.role];
  return [];
}, [user]);
```

**Flexibility**: Supports both array and single role formats.

### 2.2 Access Control Methods

#### `hasAccess(routePath)`
Checks if user can access a specific route using `canAccessRoute()`.

#### `allowedRoutes`
Returns all allowed routes for the current user.

#### `isAllowed(routePath)`
Checks if route matches any allowed route pattern.

#### `filterRoutes(routes)`
Filters an array of route objects based on access:
- Checks main route access
- Recursively filters children routes
- Handles `hideFromMenu` flag
- Only shows routes with accessible main route OR visible accessible children

#### `hasRole(requiredRoles)` / `hasAllRoles(requiredRoles)`
Role checking utilities for component-level access control.

---

## 3. Side Menu Integration (`NavigationMenu.js`)

### 3.1 Route Filtering Flow

```
getNavigationRoutes() 
  → Returns protectedRoutes array
  → filterRoutes(allNavigationRoutes) 
  → Filters based on user roles
  → filterRouteAccess() 
  → Final check before rendering
```

### 3.2 Implementation Details

```javascript
const { filterRoutes, hasAccess } = useRoleAccess();
const navigationRoutes = useMemo(() => {
  return filterRoutes(allNavigationRoutes).filter((route) => !route.hideFromMenu);
}, [allNavigationRoutes, filterRoutes]);
```

**Process:**
1. **Get all routes**: `getNavigationRoutes()` returns `protectedRoutes`
2. **Filter by access**: `filterRoutes()` removes inaccessible routes
3. **Filter hidden routes**: Removes routes with `hideFromMenu: true`
4. **Separate main/bottom**: Splits routes into main menu and bottom-fixed (Settings)
5. **Final access check**: `filterRouteAccess()` before rendering each item

### 3.3 Route Selection Logic

```javascript
const isRouteSelected = useCallback((route) => {
  // Exact match
  if (location.pathname === route.path) return true;
  // Prefix match for nested pages
  if (location.pathname.startsWith(route.path + '/')) return true;
  // Check pageChildren
  // Check children (backwards compatibility)
}, [location.pathname]);
```

**Features:**
- Handles exact matches
- Supports nested routes
- Checks both `pageChildren` and `children` for compatibility

---

## 4. Route Protection (`ProtectedRoute.jsx`)

### 4.1 Protection Levels

1. **Authentication Check**: Redirects to `/login` if not authenticated
2. **Onboarding Check**: Redirects to `/onboarding` if required
3. **Role-Based Access**: Two modes:
   - **Specific roles**: `requiredRoles` prop checks if user has one of the roles
   - **Route-based**: Uses `hasAccess(location.pathname)` to check route access

### 4.2 Access Denied Handling

```javascript
if (!hasAccess(location.pathname)) {
  return <Navigate to="/dashboard" replace />;
}
```

**Behavior:**
- Redirects to dashboard if user lacks access
- Shows "Access Denied" message if `requiredRoles` are specified

---

## 5. Data Flow Diagram

```
User Login
  ↓
User Roles (from Redux auth state)
  ↓
useRoleAccess Hook
  ↓
  ├─→ hasAccess(routePath) → canAccessRoute() → ROLE_ACCESS_CONFIG
  ├─→ allowedRoutes → getAllowedRoutes() → ROLE_ACCESS_CONFIG
  └─→ filterRoutes() → Filters navigation routes
  ↓
NavigationMenu Component
  ↓
  ├─→ filterRoutes(allNavigationRoutes)
  ├─→ filterRouteAccess() (final check)
  └─→ Render menu items
  ↓
ProtectedRoute Component
  ↓
  ├─→ hasAccess(location.pathname)
  └─→ Allow/Deny access to route
```

---

## 6. Key Design Patterns

### 6.1 Separation of Concerns
- **Configuration** (`roleAccessConfig.js`): Pure data/logic
- **Hook** (`useRoleAccess.js`): React integration
- **Components** (`NavigationMenu.js`, `ProtectedRoute.jsx`): UI implementation

### 6.2 Memoization
- `useMemo` for expensive computations (role extraction, route filtering)
- `useCallback` for event handlers
- Prevents unnecessary re-renders

### 6.3 Flexibility
- Supports both array and single role formats
- Handles dynamic routes with parameters
- Supports nested routes and children
- `hideFromMenu` flag for routes accessible via links but not shown in menu

---

## 7. Potential Improvements

### 7.1 Current Limitations
1. **Static Configuration**: Routes are hardcoded in `roleAccessConfig.js`
2. **No Permission Granularity**: Can only control route access, not specific actions
3. **"All" Role Handling**: Currently filtered out, but might need different handling

### 7.2 Suggested Enhancements
1. **Dynamic Role Loading**: Load role configurations from API
2. **Permission Levels**: Add CRUD permissions (Create, Read, Update, Delete)
3. **Route Caching**: Cache filtered routes to improve performance
4. **Audit Logging**: Log access attempts for security auditing

---

## 8. Usage Examples

### 8.1 In Components
```javascript
const { hasAccess, hasRole } = useRoleAccess();

// Check route access
if (hasAccess('/products/new')) {
  // Show "Add Product" button
}

// Check role
if (hasRole(['Administrator', 'System Manager'])) {
  // Show admin features
}
```

### 8.2 In Routes
```javascript
<Route 
  path="/staff" 
  element={
    <ProtectedRoute>
      <Staff />
    </ProtectedRoute>
  } 
/>
```

### 8.3 In Navigation
Routes are automatically filtered in `NavigationMenu.js` based on user roles.

---

## 9. Security Considerations

### 9.1 Client-Side Only
⚠️ **Important**: This is **client-side** access control. It provides UX improvements but should **NOT** be the only security measure.

### 9.2 Server-Side Validation Required
- All API endpoints must validate user roles/permissions
- Never trust client-side role checks for sensitive operations
- Use JWT tokens with role claims verified server-side

### 9.3 Best Practices
- Always validate permissions on the backend
- Use HTTPS for all communications
- Implement rate limiting on sensitive endpoints
- Log access attempts and permission changes

---

## 10. Summary

The role-based access control system is well-structured with:

✅ **Clear separation** between configuration, logic, and UI  
✅ **Flexible route matching** supporting exact, prefix, and dynamic routes  
✅ **Efficient filtering** with memoization  
✅ **Comprehensive coverage** of all major routes  
✅ **Easy to maintain** with route groups  

The system effectively controls what users can see in the navigation menu and what routes they can access, providing a solid foundation for role-based access control in the application.


