# Stock Transfer API - Quick Start Guide

## Quick Reference

### API Endpoints

| Endpoint | Method | Content-Type | Purpose |
|----------|--------|--------------|---------|
| `create_stock_transfer` | POST | `application/x-www-form-urlencoded` | Direct transfer |
| `list_stock_transfer_requests` | POST | `application/json` | List requests |
| `get_stock_transfer_request` | GET/POST | - | Get details |
| `approve_stock_transfer` | POST | `application/x-www-form-urlencoded` | Approve (no workflow) |
| `approve_stock_transfer_workflow` | POST | `application/x-www-form-urlencoded` | Approve (with workflow) |
| `dispatch_stock` | POST | `application/x-www-form-urlencoded` | Dispatch stock |
| `receive_stock_destination` | POST | `application/json` | Receive stock |
| `confirm_receive_transfer` | POST | - | Confirm receive |

### Status Flow

```
Draft → Submitted → Approved → In Transit → Completed
```

### Two Transfer Types

1. **Direct Transfer** (1 API call)
   - Use: `create_stock_transfer`
   - Immediate stock movement
   - No approval needed

2. **Request-Based** (4-5 API calls)
   - Create Material Request (outside this API)
   - Approve: `approve_stock_transfer` or `approve_stock_transfer_workflow`
   - Dispatch: `dispatch_stock`
   - Receive: `receive_stock_destination`

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `stockTransferSlice.js`
- [ ] Create `useStockTransfer.js` hook
- [ ] Create `useTransferRequests.js` hook
- [ ] Create `useTransferWorkflow.js` hook
- [ ] Create `stockTransferHelpers.js` utilities

### Phase 2: Components
- [ ] `TransferStatusBadge.jsx`
- [ ] `TransferRequestCard.jsx`
- [ ] `TransferWorkflowStepper.jsx`
- [ ] `TransferItemsTable.jsx`
- [ ] `TransferFilters.jsx`

### Phase 3: Pages
- [ ] `StockTransfersList.js`
- [ ] `CreateStockTransfer.js`
- [ ] `StockTransferDetails.js`
- [ ] `ApproveTransferRequest.js`
- [ ] `DispatchStock.js`
- [ ] `ReceiveStock.js`

### Phase 4: Integration
- [ ] Add routes to `routes.js`
- [ ] Add navigation menu item
- [ ] Connect to notification system
- [ ] Add error handling

## Code Snippets

### Basic Redux Thunk Pattern

```javascript
export const createStockTransfer = createAsyncThunk(
  'stockTransfer/createStockTransfer',
  async (transferData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        ENDPOINTS.createStockTransfer,
        new URLSearchParams({
          company: transferData.company,
          posting_date: transferData.posting_date,
          posting_time: transferData.posting_time,
          from_warehouse: transferData.from_warehouse,
          to_warehouse: transferData.to_warehouse,
          items: JSON.stringify(transferData.items),
          notes: transferData.notes || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock transfer created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { stock_entry: data.stock_entry };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to create stock transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);
```

### Using the Hook

```javascript
import { useStockTransfer } from '../../hooks/useStockTransfer';

const MyComponent = () => {
  const { createTransfer, loading, error } = useStockTransfer();
  
  const handleSubmit = async (data) => {
    try {
      const result = await createTransfer({
        company: 'Savanna Ltd',
        posting_date: '2025-01-20',
        posting_time: '10:00:00',
        from_warehouse: 'Stores - HO',
        to_warehouse: 'Stores - Branch',
        items: [
          { item_code: 'ITEM-001', qty: 10 }
        ],
        notes: 'Transfer notes'
      });
      console.log('Transfer created:', result.stock_entry);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return (
    <Button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Creating...' : 'Create Transfer'}
    </Button>
  );
};
```

### Form Validation

```javascript
import { validateTransferItems } from '../../utils/stockTransferHelpers';

const validateForm = (data) => {
  const errors = {};
  
  if (!data.company) errors.company = 'Company is required';
  if (!data.posting_date) errors.posting_date = 'Posting date is required';
  if (!data.from_warehouse) errors.from_warehouse = 'Source warehouse is required';
  if (!data.to_warehouse) errors.to_warehouse = 'Destination warehouse is required';
  if (data.from_warehouse === data.to_warehouse) {
    errors.to_warehouse = 'Source and destination must be different';
  }
  
  const itemsValidation = validateTransferItems(data.items);
  if (!itemsValidation.valid) {
    errors.items = itemsValidation.error;
  }
  
  return errors;
};
```

## Common Patterns

### Response Extraction

```javascript
const extractResponseData = (response) => {
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};
```

### Error Extraction

```javascript
const extractErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.exc_type) {
    return error.response.data.exc_type;
  }
  return error.message || 'An error occurred';
};
```

## Testing Quick Reference

### Test Redux Thunk

```javascript
import { createStockTransfer } from '../stockTransferSlice';
import { store } from '../store';

test('creates stock transfer', async () => {
  const result = await store.dispatch(createStockTransfer({
    company: 'Test Company',
    posting_date: '2025-01-20',
    posting_time: '10:00:00',
    from_warehouse: 'Warehouse A',
    to_warehouse: 'Warehouse B',
    items: [{ item_code: 'ITEM-001', qty: 10 }]
  }));
  
  expect(result.type).toBe('stockTransfer/createStockTransfer/fulfilled');
});
```

## Troubleshooting

### Issue: API returns 401 Unauthorized
**Solution**: Check authentication token/session

### Issue: Content-Type mismatch
**Solution**: Verify correct Content-Type header for each endpoint

### Issue: User mismatch error (403)
**Solution**: Ensure `approved_by`/`dispatched_by` matches logged-in user

### Issue: State not updating
**Solution**: Check Redux reducer logic and action types

## Key Files to Create

```
src/store/stockTransferSlice.js
src/hooks/useStockTransfer.js
src/hooks/useTransferRequests.js
src/hooks/useTransferWorkflow.js
src/utils/stockTransferHelpers.js
src/pages/StockTransfers/StockTransfersList.js
src/pages/StockTransfers/CreateStockTransfer.js
src/pages/StockTransfers/StockTransferDetails.js
src/components/StockTransfers/TransferStatusBadge.jsx
src/components/StockTransfers/TransferRequestCard.jsx
```

## Next Steps

1. Read the full [Implementation Plan](./STOCK_TRANSFER_IMPLEMENTATION_PLAN.md)
2. Review existing code patterns (e.g., `purchaseSlice.js`)
3. Start with Phase 1: Foundation
4. Test each phase before moving to next
5. Follow existing code style and patterns

---

**Quick Links:**
- [Full Implementation Plan](./STOCK_TRANSFER_IMPLEMENTATION_PLAN.md)
- [API Documentation](./STOCK_TRANSFER_API_DOCUMENTATION.md)

