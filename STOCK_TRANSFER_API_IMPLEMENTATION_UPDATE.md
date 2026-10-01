# Stock Transfer API Implementation Update

**Date:** January 2025  
**Status:** ✅ Completed

## Summary

Updated the React app implementation to match the new backend API documentation. All endpoints now use JSON format and follow the new response structure.

---

## Key Changes

### 1. New API Endpoints Added

#### ✅ `submit_stock_transfer_request`
- **Before:** Used Frappe's standard `frappe.client.submit` API
- **After:** Uses dedicated endpoint `techsavanna_pos.api.stock.submit_stock_transfer_request`
- **Format:** JSON request body with `{ request_id: string }`
- **Response:** `{ success: true, message: "...", data: { request_id, status, docstatus } }`

#### ✅ `cancel_stock_transfer_request` (NEW)
- **Endpoint:** `techsavanna_pos.api.stock.cancel_stock_transfer_request`
- **Format:** JSON request body with `{ request_id: string, reason?: string }`
- **Response:** `{ success: true, message: "...", data: { request_id, status: "Cancelled", docstatus: 2 } }`
- **Functionality:** Allows cancelling Draft, Submitted, or Approved requests (not In Transit)

### 2. Content-Type Updates

All endpoints now use `application/json` instead of `application/x-www-form-urlencoded`:

- ✅ `approve_stock_transfer` - Changed to JSON
- ✅ `approve_stock_transfer_workflow` - Changed to JSON  
- ✅ `dispatch_stock` - Changed to JSON (items array sent directly, not stringified)
- ✅ `receive_stock_destination` - Already using JSON
- ✅ `submit_stock_transfer_request` - Using JSON (new endpoint)
- ✅ `cancel_stock_transfer_request` - Using JSON (new endpoint)

### 3. Response Format Handling

Updated all thunks to handle the new consistent response format:
```typescript
{
  message: {
    success: true,
    message: "Success message",
    data: { ... }
  }
}
```

**Changes:**
- Updated `extractResponseData` to properly handle new format
- All thunks now extract data from `data?.data || data` pattern
- Success messages extracted from `response.data.message.message`

### 4. UI Updates

#### StockTransfersList Component
- ✅ Added "Submit" action button for Draft status
- ✅ Added "Cancel" action button for Draft, Submitted, and Approved statuses
- ✅ Updated all action handlers to use new API endpoints
- ✅ Improved loading states and error handling

#### Action Flow
- **Draft** → Submit button → `submit_stock_transfer_request`
- **Submitted** → Approve button → `approve_stock_transfer` / `approve_stock_transfer_workflow`
- **Approved** → Dispatch button → Navigate to dispatch page
- **In Transit** → Receive button → Navigate to receive page
- **Draft/Submitted/Approved** → Cancel button → `cancel_stock_transfer_request`

---

## Files Modified

### 1. `src/store/stockTransferSlice.js`

**Endpoints Updated:**
```javascript
const ENDPOINTS = {
  // ... existing endpoints
  submitStockTransferRequest: 'techsavanna_pos.api.stock.submit_stock_transfer_request', // NEW
  cancelStockTransferRequest: 'techsavanna_pos.api.stock.cancel_stock_transfer_request', // NEW
  // Removed: submitMaterialRequest: 'frappe.client.submit'
};
```

**Thunks Updated:**
- `submitMaterialRequest` - Now uses new endpoint with JSON
- `approveStockTransfer` - Changed to JSON format
- `approveStockTransferWorkflow` - Changed to JSON format
- `dispatchStock` - Changed to JSON format (items array not stringified)
- `cancelStockTransferRequest` - NEW thunk added

**Reducers Added:**
- `cancelStockTransferRequest.pending`
- `cancelStockTransferRequest.fulfilled`
- `cancelStockTransferRequest.rejected`

### 2. `src/pages/StockTransfers/StockTransfersList.js`

**New Handlers:**
- `handleSubmit` - Uses new `submit_stock_transfer_request` endpoint
- `handleCancel` - Uses new `cancel_stock_transfer_request` endpoint

**Updated Actions:**
- Added Submit action for Draft status
- Added Cancel action for Draft, Submitted, Approved statuses
- All actions now refresh list after completion

---

## API Alignment Checklist

| Endpoint | Status | Content-Type | Response Format |
|----------|--------|--------------|-----------------|
| `create_stock_transfer_request` | ✅ | JSON | ✅ Matches |
| `submit_stock_transfer_request` | ✅ | JSON | ✅ Matches |
| `approve_stock_transfer` | ✅ | JSON | ✅ Matches |
| `approve_stock_transfer_workflow` | ✅ | JSON | ✅ Matches |
| `dispatch_stock` | ✅ | JSON | ✅ Matches |
| `receive_stock_destination` | ✅ | JSON | ✅ Matches |
| `cancel_stock_transfer_request` | ✅ | JSON | ✅ Matches |
| `list_stock_transfer_requests` | ✅ | JSON | ✅ Matches |
| `get_stock_transfer_request` | ✅ | GET/POST | ✅ Matches |

---

## Breaking Changes

### ⚠️ Parameter Changes

1. **Submit Material Request:**
   - **Before:** `{ name: string, doctype: string }`
   - **After:** `{ request_id: string }`

2. **Dispatch Stock:**
   - **Before:** `items: JSON.stringify(items)` (form-urlencoded)
   - **After:** `items: items` (JSON array)

3. **Approve Stock Transfer:**
   - **Before:** `application/x-www-form-urlencoded`
   - **After:** `application/json`

### Migration Notes

- All existing code using `submitMaterialRequest({ name })` should be updated to `submitMaterialRequest({ request_id })`
- Dispatch calls no longer need to stringify the items array
- All endpoints now return consistent `{ success, message, data }` format

---

## Testing Checklist

- [ ] Create Material Request (Draft status)
- [ ] Submit Material Request (Draft → Submitted)
- [ ] Approve Request (Submitted → Approved)
- [ ] Dispatch Stock (Approved → In Transit)
- [ ] Receive Stock (In Transit → Completed)
- [ ] Cancel Request (Draft/Submitted/Approved → Cancelled)
- [ ] Verify error handling for invalid state transitions
- [ ] Test partial dispatch/receive scenarios
- [ ] Verify list refreshes after each action
- [ ] Test with workflow-enabled approval

---

## Benefits

✅ **Consistency:** All endpoints use JSON format  
✅ **Dedicated Endpoints:** No reliance on Frappe standard APIs  
✅ **Better Error Handling:** Consistent error response format  
✅ **Complete Workflow:** All status transitions supported  
✅ **Cancel Functionality:** Users can cancel requests when appropriate  
✅ **Type Safety:** Clear request/response structures  

---

**Status:** Ready for testing

