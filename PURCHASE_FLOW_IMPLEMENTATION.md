# Purchase Order Flow Implementation

This document describes the implementation of the Purchase Order to GRN flow with role-based access control, based on the `PURCHASE_API_DOCUMENTATION.md` and `PURCHASE_TO_GRN_FLOW_ANALYSIS.md`.

---

## Overview

The purchase flow has been implemented as three separate stages, each with its own form and role-based access control:

1. **Stage 1: Create Purchase Order (Draft)** - `CreatePurchaseOrder.js`
2. **Stage 2: Submit Purchase Order** - `SubmitPurchaseOrder.js`
3. **Stage 3: Create GRN (Goods Receipt Note)** - `CreateGRN.js`

---

## Files Created/Modified

### New Components

1. **`src/pages/Purchases/CreatePurchaseOrder.js`**
   - Creates Purchase Orders in Draft state (docstatus = 0)
   - Role requirement: `Purchase Manager`, `Purchase User`, `Administrator`, or `System Manager`
   - Route: `/purchases/create-order`
   - Uses: `createPurchaseInvoice` action (maps to `create_purchase_order` API)

2. **`src/pages/Purchases/SubmitPurchaseOrder.js`**
   - Lists and submits Draft Purchase Orders
   - Role requirement: `Purchase Manager`, `Purchase User`, `Administrator`, or `System Manager`
   - Route: `/purchases/submit-order`
   - Uses: `submitPurchaseOrder` action (maps to `submit_purchase_order` API)

3. **`src/pages/Purchases/CreateGRN.js`**
   - Creates GRN from submitted Purchase Orders
   - Role requirement: `Purchase Manager`, `Warehouse Manager`, `Administrator`, or `System Manager`
   - Route: `/purchases/create-grn`
   - Uses: `createGRN` action (maps to `create_grn` API)

### Modified Files

1. **`src/store/purchaseSlice.js`**
   - Added `createGRN` endpoint configuration
   - Added `createGRN` async thunk action
   - Added reducer cases for `createGRN` pending/fulfilled/rejected states

2. **`src/routes/routes.js`**
   - Added lazy imports for the three new components
   - Added routes for the three new pages under `/purchases`

---

## Role-Based Access Control

Each form checks for role-based access using the `useRoleAccess` hook:

### Create Purchase Order
```javascript
const canCreatePO = hasRole(['Purchase Manager', 'Purchase User', 'Administrator', 'System Manager']) || 
                    hasAccess('/purchases/new');
```

### Submit Purchase Order
```javascript
const canSubmitPO = hasRole(['Purchase Manager', 'Purchase User', 'Administrator', 'System Manager']) || 
                    hasAccess('/purchases/submit');
```

### Create GRN
```javascript
const canCreateGRN = hasRole(['Purchase Manager', 'Warehouse Manager', 'Administrator', 'System Manager']) || 
                     hasAccess('/purchases/grn/new');
```

If a user doesn't have the required role, they see an access denied message with a link back to the purchases list.

---

## Workflow

### Stage 1: Create Purchase Order (Draft)

1. User navigates to `/purchases/create-order`
2. Form validates user has permission to create POs
3. User fills in:
   - Supplier (required)
   - Transaction Date (required)
   - Default Warehouse (optional)
   - Items (at least one required):
     - Item Code (required)
     - Quantity (required, > 0)
     - Rate (optional)
     - Warehouse (optional, uses default if not provided)
     - Schedule Date (optional)
4. On submit, calls `createPurchaseInvoice` which creates a PO in Draft state (docstatus = 0)
5. Redirects to purchase details page or purchases list

### Stage 2: Submit Purchase Order

1. User navigates to `/purchases/submit-order`
2. Form validates user has permission to submit POs
3. Lists all Purchase Orders with `docstatus === 0` (Draft state)
4. User clicks "Submit" button on a draft PO
5. Confirmation dialog appears
6. On confirm, calls `submitPurchaseOrder` which changes PO to Submitted state (docstatus = 1)
7. List refreshes automatically

### Stage 3: Create GRN

1. User navigates to `/purchases/create-grn` (optionally with `?lpo_no=PUR-ORD-2024-00001`)
2. Form validates user has permission to create GRN
3. User enters Purchase Order number (required)
4. System loads the PO and validates it's submitted (docstatus === 1)
5. Form displays available items with:
   - Ordered Quantity
   - Received Quantity
   - Pending Quantity (Ordered - Received)
6. User selects items and specifies quantities to receive (cannot exceed pending quantity)
7. User selects warehouse (required)
8. On submit, calls `createGRN` which:
   - Creates Purchase Receipt
   - Submits it immediately
   - Automatically updates stock
9. Redirects to purchase receipt details page or receipts list

---

## API Integration

### Endpoints Used

1. **Create Purchase Order**
   - Endpoint: `techsavanna_pos.api.purchase.create_purchase_order`
   - Method: POST
   - Auth: Guest allowed (but form requires auth for consistency)
   - Returns: `{ status: "success", lpo_no: "PUR-ORD-...", data: {...} }`

2. **Submit Purchase Order**
   - Endpoint: `techsavanna_pos.api.purchase.submit_purchase_order`
   - Method: POST
   - Auth: Required
   - Body: `{ lpo_no: "PUR-ORD-..." }`
   - Returns: `{ status: "success", lpo_no: "PUR-ORD-...", data: {...} }`

3. **Get Purchase Order**
   - Endpoint: `techsavanna_pos.api.purchase.get_purchase_order`
   - Method: GET
   - Query: `?po_name=PUR-ORD-...`
   - Returns: `{ status: "success", purchase_order: {...} }`

4. **List Purchase Orders**
   - Endpoint: `techsavanna_pos.api.purchase.list_purchase_orders`
   - Method: GET
   - Query: `?filters={"docstatus":0}&company=...`
   - Returns: `{ status: "success", purchase_orders: [...], total_count: N }`

5. **Create GRN**
   - Endpoint: `techsavanna_pos.api.purchase.create_grn`
   - Method: POST
   - Auth: Required
   - Body: `{ lpo_no: "...", warehouse: "...", items: [{ item_code: "...", qty: N }] }`
   - Returns: `{ status: "success", grn_no: "PUR-REC-...", lpo_no: "...", data: {...} }`

---

## Validation Rules

### Create Purchase Order
- ✅ Supplier is required
- ✅ Transaction date is required
- ✅ At least one item is required
- ✅ Each item must have item_code and qty > 0
- ✅ Warehouse must belong to company (handled by API)

### Submit Purchase Order
- ✅ PO must exist
- ✅ PO must be in Draft state (docstatus === 0)
- ✅ User must have submit permission (handled by API)
- ❌ Cannot submit if already submitted
- ❌ Cannot submit if cancelled

### Create GRN
- ✅ PO number is required
- ✅ PO must exist
- ✅ PO must be submitted (docstatus === 1)
- ✅ Warehouse is required
- ✅ Warehouse must belong to PO's company (handled by API)
- ✅ At least one item with quantity > 0 is required
- ✅ Quantity cannot exceed pending quantity (Ordered - Received)

---

## Error Handling

All forms use consistent error handling:

1. **Client-side validation** - Shows inline error messages
2. **API errors** - Displayed via notification system using `showNotification`
3. **Role access errors** - Shows access denied alert with back button
4. **Loading states** - Buttons show loading spinners during API calls

Error messages follow the API error response format:
```json
{
  "status": "error",
  "code": "PO_NOT_SUBMITTED",
  "message": "Purchase Order must be submitted",
  "lpo_no": "PUR-ORD-..."
}
```

---

## Navigation Flow

```
Purchases List (/purchases)
  ├── Create Purchase Order → /purchases/create-order
  │   └── Submit → Purchase Details (/purchases/:id)
  ├── Submit Purchase Order → /purchases/submit-order
  │   └── Submit → Refresh List
  └── Create GRN → /purchases/create-grn
      ├── Enter PO number → Load PO
      └── Submit → Purchase Receipt Details (/purchases/receipts/:id)
```

---

## Role Configuration

To enable access for specific roles, ensure users have one of these roles:

- **Purchase Manager** - Full access to all purchase operations
- **Purchase User** - Can create and submit POs
- **Warehouse Manager** - Can create GRNs (goods receipt)
- **Administrator** - Full access
- **System Manager** - Full access

You can also use route-based access control via `hasAccess('/purchases/new')` etc.

---

## Testing Checklist

- [ ] Create Purchase Order with valid data
- [ ] Create Purchase Order without required fields (should show validation errors)
- [ ] Submit Purchase Order that's in Draft state
- [ ] Try to submit already-submitted PO (should show error)
- [ ] Create GRN from submitted PO
- [ ] Create GRN with quantity exceeding pending (should show error)
- [ ] Create GRN from Draft PO (should show error)
- [ ] Test role-based access - user without permission should see access denied
- [ ] Test navigation between forms
- [ ] Test warehouse validation
- [ ] Test partial receipt (multiple GRNs for same PO)

---

## Future Enhancements

1. **Material Request Integration**
   - Add support for material_request and material_request_item fields
   - Pre-populate PO from Material Request

2. **PO Selection in Create GRN**
   - Add autocomplete/dropdown for PO selection instead of manual entry
   - Filter to show only submitted POs with pending items

3. **Bulk Operations**
   - Bulk submit multiple draft POs
   - Bulk create GRNs

4. **Enhanced Validation**
   - Real-time quantity validation against pending qty
   - Warehouse availability checks

5. **Status Indicators**
   - Visual indicators for PO status (Draft/Submitted/Cancelled)
   - Progress indicators for partial receipts

---

## Notes

- The forms follow the existing codebase patterns (Material-UI, react-hook-form, Redux)
- Error handling uses the existing notification system
- Role-based access uses the existing `useRoleAccess` hook
- All API calls go through Redux thunks for consistent state management
- Stock updates happen automatically on GRN submission (handled by backend)


