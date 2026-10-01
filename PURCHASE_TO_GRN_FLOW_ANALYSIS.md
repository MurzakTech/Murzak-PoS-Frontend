# Purchase Order Flow Analysis: From Purchase Creation to GRN

## Overview
This document analyzes the complete order flow from creating a purchase order to receiving goods (GRN) as implemented in `purchase.py`.

---

## Flow Diagram

```
1. create_purchase_order() 
   ↓ (Creates PO in Draft state: docstatus = 0)
   
2. submit_purchase_order()
   ↓ (Submits PO: docstatus = 1)
   
3. create_grn() OR create_grn_full()
   ↓ (Creates & Submits Purchase Receipt: docstatus = 1)
   ↓ (Stock Ledger updated automatically on PR submission)
   
4. grn_to_inventory() [OPTIONAL]
   ↓ (Additional inventory application step - seems redundant)
```

---

## Step-by-Step Flow Analysis

### **Step 1: Create Purchase Order (Draft)**

**Function:** `create_purchase_order()` (Lines 69-283)
**Endpoint:** `@frappe.whitelist(allow_guest=True)`

**Process:**
1. **Input Validation:**
   - Validates `company` exists
   - Validates `supplier` exists
   - Validates `items` is a non-empty list

2. **Item Processing (for each item):**
   - Validates `item_code` exists in system
   - Validates `qty > 0`
   - **Warehouse Resolution Priority:**
     1. Material Request warehouse (if `material_request` provided)
     2. Item's explicit `warehouse` parameter
     3. Item Default warehouse for company
     4. Company's `custom_default_warehouse`
   - Validates warehouse belongs to the same company
   - Appends item to PO items list with: `item_code`, `qty`, `rate`, `schedule_date`, `warehouse`

3. **Purchase Order Creation:**
   - Creates `PurchaseOrder` document with:
     - `company`, `supplier`, `transaction_date`
     - `items` array
     - `idempotency_key` (if provided)
   - Calls `po.insert()` (creates as DRAFT - `docstatus = 0`)
   - Returns PO name (LPO number) and details

**Key Points:**
- PO is created in **DRAFT** state (`docstatus = 0`)
- No stock movement happens at this stage
- Warehouse is mandatory for stock items

**Response Structure:**
```json
{
  "status": "success",
  "code": "PO_CREATED",
  "lpo_no": "<PO_NAME>",
  "message": "Purchase order created successfully",
  "data": {
    "docstatus": 0,
    "grand_total": <amount>,
    "company": "<company>",
    "supplier": "<supplier>",
    "items_count": <count>
  }
}
```

---

### **Step 2: Submit Purchase Order**

**Function:** `submit_purchase_order()` (Lines 287-360)
**Endpoint:** `@frappe.whitelist(methods=["POST"])`

**Process:**
1. **Input Validation:**
   - Requires `lpo_no` (or `purchase_order`) parameter
   - Validates PO exists in database

2. **Permission Check:**
   - Checks user has permission to submit Purchase Order

3. **State Validation:**
   - Rejects if `docstatus == 1` (already submitted)
   - Rejects if `docstatus == 2` (cancelled)

4. **Submission:**
   - Starts database transaction (`frappe.db.begin()`)
   - Calls `po.submit()` (changes `docstatus` to `1`)
   - Commits transaction (`frappe.db.commit()`)

**Key Points:**
- PO must be in DRAFT state to submit
- Once submitted (`docstatus = 1`), PO can be used to create GRN
- Submission triggers ERPNext's standard PO submission hooks
- Cannot submit if already submitted or cancelled

**Response Structure:**
```json
{
  "status": "success",
  "code": "PO_SUBMITTED",
  "lpo_no": "<PO_NAME>",
  "message": "LPO submitted successfully",
  "data": {
    "docstatus": 1,
    "grand_total": <amount>,
    "company": "<company>",
    "supplier": "<supplier>",
    "items_count": <count>
  }
}
```

---

### **Step 3: Create GRN (Goods Receipt Note)**

**Functions:** 
- `create_grn()` (Lines 521-674)
- `create_grn_full()` (Lines 678-832) - Identical logic, possibly legacy

**Endpoint:** `@frappe.whitelist(methods=["POST"])`

**Process:**
1. **Input Validation:**
   - Requires `lpo_no`
   - Requires `items` array with `item_code` and `qty`
   - Requires `warehouse`

2. **Purchase Order Validation:**
   - Validates PO exists
   - **CRITICAL:** Validates `po.docstatus == 1` (must be submitted)
   - Validates warehouse belongs to PO's company

3. **Item Processing:**
   - For each item in request:
     - Validates item exists in Purchase Order
     - Calculates `pending_qty = item.qty - item.received_qty`
     - **Validates:** `row["qty"] <= pending_qty` (cannot receive more than ordered)
     - Appends item to Purchase Receipt with:
       - `item_code`, `qty` (received qty)
       - `rate` from PO item
       - `warehouse`, `purchase_order`, `purchase_order_item` (links)

4. **Purchase Receipt Creation:**
   - Creates `PurchaseReceipt` document:
     - Links to `purchase_order`
     - Sets `supplier`, `company` from PO
     - Sets `set_warehouse`
   - Inserts document (`pr.insert()`)
   - **Submits immediately** (`pr.submit()`)
   - Commits transaction

**Key Points:**
- PO **MUST** be submitted (`docstatus = 1`) to create GRN
- Can receive partial quantities (multiple GRNs per PO)
- Cannot receive more than ordered quantity
- GRN is created and submitted in single operation
- **On submission, ERPNext automatically:**
  - Updates Stock Ledger Entries (adds stock to warehouse)
  - Updates Purchase Order's `received_qty` for each item
  - Creates GL Entries for inventory valuation
  - Updates Bin quantities

**Response Structure:**
```json
{
  "status": "success",
  "code": "GRN_CREATED",
  "message": "Goods received successfully",
  "lpo_no": "<PO_NAME>",
  "grn_no": "<PR_NAME>",
  "data": {
    "docstatus": 1,
    "received_items": <count>
  }
}
```

---

### **Step 4: Apply GRN to Inventory (Optional - Appears Redundant)**

**Function:** `grn_to_inventory()` (Lines 836-951)
**Endpoint:** `@frappe.whitelist(methods=["POST"])`

**Process:**
1. **Input Validation:**
   - Requires `grn_no`
   - Validates Purchase Receipt exists

2. **Status Validation:**
   - Validates `grn.docstatus == 1` (submitted)
   - Validates `grn.status == "Received"`
   - Prevents duplicate application (checks `grn.status != "APPLIED_TO_STOCK"`)

3. **Stock Application Logic:**
   - Loops through GRN items
   - For each item:
     - Gets `accepted_qty` from `item.received_qty`
     - Creates/updates Stock Ledger Entry (seems redundant - already done on PR submission)
     - Calls `update_stock_valuation()` helper (incomplete implementation - line 45-52)
     - Creates Stock Ledger Entry manually (duplicate of what PR submission does)
   - Marks GRN status as `"APPLIED_TO_STOCK"`

4. **PO Status Update:**
   - Calls `update_po_status_if_last_delivery()` (lines 55-64)
   - Checks if all items fully received
   - Marks PO as "Closed" if complete

**Key Points:**
- ⚠️ **This function appears REDUNDANT** because:
  - Purchase Receipt submission already updates Stock Ledger
  - ERPNext handles stock updates automatically on PR submission
  - The Stock Ledger Entry creation here duplicates what happens on PR submission
  
- The function may be legacy code or intended for a custom workflow
- PO status update logic is useful but could be handled by hooks

**Response Structure:**
```json
{
  "status": "success",
  "code": "GRN_APPLIED",
  "message": "Goods received and stock updated successfully",
  "grn_no": "<PR_NAME>",
  "lpo_no": "<PO_NAME>",
  "data": {
    "docstatus": 1,
    "received_items": <count>
  }
}
```

---

## Document Status Values (docstatus)

| Status | Value | Description |
|--------|-------|-------------|
| Draft | 0 | Document is saved but not submitted |
| Submitted | 1 | Document is submitted and active |
| Cancelled | 2 | Document is cancelled |

---

## Key Business Rules

### Purchase Order Rules:
1. ✅ Warehouse is mandatory for stock items
2. ✅ Warehouse must belong to the same company as PO
3. ✅ PO must be in Draft state to submit
4. ✅ Cannot submit PO if already submitted or cancelled
5. ✅ PO must be submitted (`docstatus = 1`) before creating GRN

### GRN Rules:
1. ✅ Can receive partial quantities (multiple GRNs per PO)
2. ✅ Cannot receive more than ordered quantity
3. ✅ Received quantity cannot exceed: `item.qty - item.received_qty`
4. ✅ Warehouse must belong to PO's company
5. ✅ GRN is auto-submitted (creates and submits in one operation)

### Stock Updates:
1. ✅ Stock Ledger automatically updated on Purchase Receipt submission
2. ✅ Purchase Order's `received_qty` updated automatically
3. ✅ Bin quantities updated automatically
4. ✅ GL Entries created for inventory valuation

---

## Helper Functions

### `update_po_status_if_last_delivery()` (Lines 55-64)
- Checks if all items in PO are fully received
- Marks PO status as "Closed" if `total_qty_received == total_qty_ordered`

### `update_stock_valuation()` (Lines 45-52)
- ⚠️ **INCOMPLETE IMPLEMENTATION**
- References undefined `current_stock_qty` and `current_rate`
- Intended to update item valuation rate using weighted average

### `resolve_warehouse()` (Lines 495-517)
- Warehouse resolution helper
- Falls back to company default warehouse
- Used for warehouse resolution in PO creation

---

## Error Handling

All functions use `handle_pos_exception()` wrapper for consistent error responses.

**Common Error Codes:**
- `INVALID_COMPANY` - Company doesn't exist
- `INVALID_SUPPLIER` - Supplier doesn't exist
- `INVALID_ITEMS` - Items list is empty/invalid
- `INVALID_ITEM` - Item doesn't exist
- `INVALID_WAREHOUSE` - Warehouse missing/invalid/wrong company
- `INVALID_QTY` - Quantity is zero or negative
- `LPO_NOT_FOUND` - Purchase Order doesn't exist
- `PO_NOT_SUBMITTED` - PO must be submitted to create GRN
- `PO_ALREADY_SUBMITTED` - PO already submitted
- `LPO_CANCELLED` - PO is cancelled
- `QTY_EXCEEDS_ORDERED` - Received qty exceeds ordered qty
- `GRN_NOT_FOUND` - Purchase Receipt doesn't exist
- `GRN_NOT_RECEIVED` - GRN not in Received status
- `GRN_ALREADY_APPLIED` - GRN already applied to stock

---

## Data Flow Summary

```
Purchase Order (Draft)
  ├── docstatus: 0
  ├── items[].qty: Ordered quantity
  └── items[].received_qty: 0

Purchase Order (Submitted)
  ├── docstatus: 1
  ├── items[].qty: Ordered quantity
  └── items[].received_qty: 0 (initially)

Purchase Receipt (GRN) - After Submission
  ├── docstatus: 1
  ├── status: "Received"
  ├── items[].qty: Received quantity
  ├── items[].received_qty: Same as qty
  └── Automatically updates:
      ├── PO.items[].received_qty (incremented)
      ├── Stock Ledger Entry (stock added)
      ├── Bin (quantity updated)
      └── GL Entry (inventory valuation)
```

---

## Recommendations

1. **Remove or Refactor `grn_to_inventory()`:**
   - This function duplicates stock update logic that ERPNext handles automatically
   - Consider using ERPNext hooks instead (e.g., `Purchase Receipt.on_submit`)

2. **Complete `update_stock_valuation()` Implementation:**
   - Currently incomplete with undefined variables
   - Either complete it or remove it

3. **Consider Consolidating `create_grn()` and `create_grn_full()`:**
   - Both functions have identical logic
   - Remove one or clarify the difference

4. **Use ERPNext Standard Hooks:**
   - PO status updates on full receipt could be handled via `Purchase Receipt.on_submit`
   - Reduces duplicate code and follows ERPNext best practices

5. **Add Warehouse Validation:**
   - Consider validating warehouse exists before using it
   - Add checks for warehouse status (disabled warehouses)

---

## API Endpoints Summary

| Endpoint | Method | Function | Purpose |
|----------|--------|----------|---------|
| `/api/method/techsavanna_pos.api.purchase.create_purchase_order` | POST | `create_purchase_order()` | Create PO (Draft) |
| `/api/method/techsavanna_pos.api.purchase.submit_purchase_order` | POST | `submit_purchase_order()` | Submit PO |
| `/api/method/techsavanna_pos.api.purchase.get_purchase_order` | GET | `get_purchase_order()` | Get PO details |
| `/api/method/techsavanna_pos.api.purchase.list_purchase_orders` | GET | `list_purchase_orders()` | List POs |
| `/api/method/techsavanna_pos.api.purchase.create_grn` | POST | `create_grn()` | Create & Submit GRN |
| `/api/method/techsavanna_pos.api.purchase.create_grn_full` | POST | `create_grn_full()` | Create & Submit GRN (duplicate) |
| `/api/method/techsavanna_pos.api.purchase.grn_to_inventory` | POST | `grn_to_inventory()` | Apply GRN to inventory (redundant) |

