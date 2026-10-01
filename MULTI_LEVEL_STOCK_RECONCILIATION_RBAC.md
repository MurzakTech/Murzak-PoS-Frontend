# Multi-Level Stock Reconciliation - RBAC (Role-Based Access Control)

## Overview

This document outlines the Role-Based Access Control (RBAC) implementation for the Multi-Level Stock Reconciliation feature. The system maps POS system roles to workflow roles that determine what actions users can perform at each stage of the reconciliation process.

---

## Workflow Roles

The multi-level stock reconciliation workflow has three distinct roles:

1. **Sales User** - Performs initial stock count
2. **Quality Manager** - Verifies and adjusts stock counts
3. **Stock Manager** - Finalizes stock counts and submits reconciliation

---

## POS Role Mappings

### Sales User Roles

These roles can add stock take when workflow status is **"Pending Sales User"**:

| POS Role | Mapped To | Description |
|----------|-----------|-------------|
| `Sales User` | Sales User | Primary sales role |
| `Sales Person` | Sales User | Alternative sales role name |
| `Sales Manager` | Sales User | Sales managers can perform sales user functions |
| `Sales Master Manager` | Sales User | Senior sales managers |
| `Stock User` | Sales User | General stock users can perform initial stock take |

**Capabilities:**
- ✅ Add stock take at "Pending Sales User" stage
- ❌ Cannot add stock take at other stages
- ❌ Cannot submit reconciliation

---

### Quality Manager Roles

These roles can add stock take when workflow status is **"Pending Quality Manager"**:

| POS Role | Mapped To | Description |
|----------|-----------|-------------|
| `Quality Manager` | Quality Manager | Primary quality control role |
| `Stock Controller` | Quality Manager | Alternative quality control role |

**Capabilities:**
- ✅ Add stock take at "Pending Quality Manager" stage
- ❌ Cannot add stock take at other stages
- ❌ Cannot submit reconciliation

---

### Stock Manager Roles

These roles can add stock take when workflow status is **"Pending Stock Manager"** and can **submit** the reconciliation:

| POS Role | Mapped To | Description |
|----------|-----------|-------------|
| `Stock Manager` | Stock Manager | Primary stock management role |
| `Warehouse Manager` | Stock Manager | Warehouse management role |
| `Item Manager` | Stock Manager | Item/inventory management role |
| `Purchase Manager` | Stock Manager | Purchase management with stock oversight |
| `Purchase Master Manager` | Stock Manager | Senior purchase management |

**Capabilities:**
- ✅ Add stock take at "Pending Stock Manager" stage
- ✅ Submit reconciliation (when workflow status is "Pending Stock Manager")
- ✅ Can perform all stock take functions

---

### Administrative Roles (Full Access)

These roles have **full access** with Stock Manager privileges:

| POS Role | Mapped To | Description |
|----------|-----------|-------------|
| `Administrator` | Stock Manager | System administrator - full access |
| `System Manager` | Stock Manager | System manager - full access |
| `All` | Stock Manager | Super admin role - full access to all functions |

**Capabilities:**
- ✅ Can add stock take at **any stage** (except Completed)
- ✅ Can submit reconciliation
- ✅ Full workflow control

**Note:** Users with the `All` role can perform stock take functions at any workflow stage, not just their designated stage.

---

## Role Detection Priority

When a user has multiple roles, the system uses the following priority order (highest to lowest):

1. **Stock Manager** roles (highest privilege)
2. **Quality Manager** roles
3. **Sales User** roles (lowest privilege)

This ensures users with multiple roles get the highest appropriate privilege level.

---

## Workflow Status Permissions

### Pending Sales User
- ✅ **Sales User** roles can add stock take
- ✅ **All** role can add stock take
- ❌ Other roles cannot add stock take

### Pending Quality Manager
- ✅ **Quality Manager** roles can add stock take
- ✅ **All** role can add stock take
- ❌ Other roles cannot add stock take

### Pending Stock Manager
- ✅ **Stock Manager** roles can add stock take
- ✅ **All** role can add stock take
- ✅ **Stock Manager** roles can submit reconciliation
- ❌ Other roles cannot add stock take or submit

### Completed
- ❌ No roles can add stock take (reconciliation is finalized)
- ✅ All roles can view the completed reconciliation

---

## Implementation Details

### Role Detection

The role detection logic in `useStockReconciliationByRole.js`:

1. Checks for `All` role first (grants Stock Manager privileges)
2. Checks for Stock Manager roles (highest privilege)
3. Checks for Quality Manager roles
4. Checks for Sales User roles
5. Defaults to Sales User if no match found

### Permission Checks

- `canAddStockTake`: Determines if user can add stock take at current workflow stage
- `canSubmit`: Determines if user can submit reconciliation (Stock Manager only)
- `addStockTake`: Returns the appropriate stock take function based on user role

---

## Examples

### Example 1: Sales User
```javascript
User Roles: ['Sales User']
Detected Role: 'Sales User'
Can Add Stock Take: ✅ (when status is "Pending Sales User")
Can Submit: ❌
```

### Example 2: Quality Manager
```javascript
User Roles: ['Quality Manager']
Detected Role: 'Quality Manager'
Can Add Stock Take: ✅ (when status is "Pending Quality Manager")
Can Submit: ❌
```

### Example 3: Stock Manager
```javascript
User Roles: ['Stock Manager']
Detected Role: 'Stock Manager'
Can Add Stock Take: ✅ (when status is "Pending Stock Manager")
Can Submit: ✅ (when status is "Pending Stock Manager")
```

### Example 4: Multiple Roles
```javascript
User Roles: ['Sales User', 'Quality Manager', 'Stock Manager']
Detected Role: 'Stock Manager' (highest privilege)
Can Add Stock Take: ✅ (when status is "Pending Stock Manager")
Can Submit: ✅ (when status is "Pending Stock Manager")
```

### Example 5: All Role
```javascript
User Roles: ['All']
Detected Role: 'Stock Manager' (full access)
Can Add Stock Take: ✅ (at any stage except Completed)
Can Submit: ✅ (when status is "Pending Stock Manager")
```

---

## Adding New Roles

To add a new role to the mapping:

1. **Add to ROLE_MAPPING object** in `useStockReconciliationByRole.js`:
   ```javascript
   'New Role Name': 'Sales User', // or 'Quality Manager' or 'Stock Manager'
   ```

2. **Add to role detection logic** in the `detectedRole` useMemo:
   ```javascript
   if (hasRole(['New Role Name', 'Other Role'])) {
     return 'Sales User'; // or appropriate workflow role
   }
   ```

3. **Update this documentation** with the new role mapping

---

## Testing Roles

To test role-based access:

1. Assign test user with specific role(s)
2. Create a reconciliation (status: "Pending Sales User")
3. Verify user can/cannot add stock take based on role
4. Progress through workflow stages
5. Verify permissions at each stage

---

## Notes

- Role detection is case-sensitive and must match exact role names from the POS system
- Users with multiple roles get the highest privilege level
- The `All` role grants full access to all workflow functions
- Role permissions are enforced at both the UI level and API level
- Workflow status determines which roles can perform actions

---

## Summary

The RBAC system ensures that:
- ✅ Only authorized roles can perform stock take at each workflow stage
- ✅ Workflow progression is controlled and sequential
- ✅ Administrative roles have full access
- ✅ Role detection is automatic and transparent
- ✅ Multiple roles are handled with appropriate privilege escalation

