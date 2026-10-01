# Stock Transfer Endpoints - API Documentation Alignment

## Summary of Updates

This document outlines the updates made to align the Stock Transfer implementation with the API documentation.

## Response Structure Updates

### Frappe API Response Pattern

Frappe APIs typically return responses in this format:
```json
{
  "message": {
    "success": true,
    "data": { ... }
  }
}
```

Or for some endpoints:
```json
{
  "message": {
    "status": "success",
    "message": "...",
    "stock_entry": "..."
  }
}
```

### Updated Response Extraction

The `extractResponseData` helper function has been updated to properly handle:
1. `{ message: { success: true, data: {...} } }` - Returns `data`
2. `{ message: { status: "success", ... } }` - Returns the message object
3. `{ message: {...} }` - Returns the message object if it's a plain object
4. Direct response structures as fallback

## Endpoint-Specific Updates

### 1. list_stock_transfer_requests

**Response Structure:**
```json
{
  "success": true,
  "message": "5 requests found",
  "data": {
    "requests": [...]
  }
}
```

**Updated Implementation:**
- Properly extracts `data.requests` from the nested structure
- Handles both `data.requests` and array responses

### 2. get_stock_transfer_request

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "name": "...",
    "items": [...]
  }
}
```

**Updated Implementation:**
- Extracts `data` which contains the request object
- Properly handles nested `data.data` structure

### 3. create_stock_transfer

**Response Structure:**
```json
{
  "status": "success",
  "message": "...",
  "stock_entry": "..."
}
```

**Updated Implementation:**
- Extracts message object which contains `status`, `message`, and `stock_entry`
- Returns `stock_entry` from the extracted data

### 4. approve_stock_transfer

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "request_id": "...",
    "status": "Approved",
    "approved_by": "..."
  }
}
```

**Updated Implementation:**
- Extracts `data` which contains the approval result
- Returns `request_id`, `status`, and `approved_by` from extracted data

### 5. approve_stock_transfer_workflow

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "request_id": "...",
    "workflow_state": "Approved"
  }
}
```

**Updated Implementation:**
- Extracts `data` which contains workflow state
- Returns `request_id` and `workflow_state` from extracted data

### 6. dispatch_stock

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "status": "In Transit",
    "stock_entry": "..."
  }
}
```

**Updated Implementation:**
- Extracts `data` which contains dispatch result
- Returns `status` and `stock_entry` from extracted data

### 7. receive_stock_destination

**Response Structure:**
```json
{
  "success": true,
  "message": "...",
  "data": {
    "status": "Completed",
    "stock_entry": "...",
    "goods_received_note": "..."
  }
}
```

**Updated Implementation:**
- Extracts `data` which contains receive result
- Returns `status`, `stock_entry`, and `goods_received_note` from extracted data

### 8. confirm_receive_transfer

**Response Structure:**
```json
{
  "status": "success",
  "message": "...",
  "data": {
    "stock_entry_name": "...",
    "transfer_status": "Received"
  }
}
```

**Updated Implementation:**
- Handles nested structure with `status` at message level
- Extracts `data` from message or uses message object directly
- Returns `stock_entry_name` and `transfer_status`

## Material Request Creation

### Added Functionality

1. **createMaterialRequest** thunk
   - Uses Frappe's standard `frappe.client.insert` API
   - Creates Material Request with type "Material Transfer"
   - Stores destination warehouse in notes (workaround until custom field is available)
   - Supports auto-submit option

2. **submitMaterialRequest** thunk
   - Uses Frappe's standard `frappe.client.submit` API
   - Submits Material Request to change status from Draft to Submitted

## Direct Transfers Integration

### Added Functionality

1. **listDirectStockTransfers** thunk
   - Fetches Stock Entries of type "Material Transfer" from inventory API
   - Formats them to match Material Request structure for unified display
   - Marks them with `is_direct_transfer: true` flag

2. **listAllStockTransfers** thunk
   - Combines Material Requests and Direct Transfers
   - Sorts by date (newest first)
   - Provides unified list view

## Key Changes Made

1. ✅ Updated response extraction to handle Frappe's nested message structure
2. ✅ Fixed all endpoint response parsing to match API documentation
3. ✅ Added Material Request creation functionality
4. ✅ Added Direct Transfers listing and integration
5. ✅ Updated all thunks to properly extract data from nested responses
6. ✅ Ensured consistent error handling across all endpoints

## Testing Recommendations

1. Test `list_stock_transfer_requests` returns Material Requests correctly
2. Test `get_stock_transfer_request` returns full request details with items
3. Test `create_stock_transfer` returns stock_entry name
4. Test approval endpoints return correct status updates
5. Test dispatch and receive endpoints update status correctly
6. Test Material Request creation and submission
7. Test that both Material Requests and Direct Transfers appear in the list

## Notes

- Material Request creation uses Frappe's standard API, which may require proper permissions
- Destination warehouse for Material Requests is currently stored in notes field (may need custom field in future)
- Direct transfers are fetched from inventory API and formatted to match Material Request structure
- All response structures now properly handle the `{ message: {...} }` wrapper pattern









