# Stock Transfer API - Complete Implementation Plan

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Decisions](#architecture--design-decisions)
3. [File Structure](#file-structure)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Integration Checklist](#integration-checklist)
8. [Future Enhancements](#future-enhancements)

---

## Overview

This implementation plan provides a comprehensive guide for integrating the Stock Transfer API into the Savanna POS frontend application. The implementation follows existing codebase patterns and conventions.

### Key Features to Implement

1. **Direct Stock Transfer** - Immediate transfer between warehouses
2. **Request-Based Transfer** - Multi-stage workflow with approval, dispatch, and receive
3. **Transfer Management** - List, view, and track transfer requests
4. **Status Tracking** - Real-time status updates and progress indicators
5. **Error Handling** - Comprehensive error management and user feedback

### Technology Stack

- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI (MUI)
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios (via axiosInstance)
- **Routing**: React Router v6
- **Language**: JavaScript (with JSDoc type annotations)

---

## Architecture & Design Decisions

### 1. State Management Pattern

Following the existing pattern:
- **Redux Slice**: `stockTransferSlice.js` for centralized state
- **Async Thunks**: All API calls via `createAsyncThunk`
- **Selectors**: Memoized selectors for derived state
- **Notifications**: Integrated with `notificationSlice`

### 2. Component Architecture

```
Pages (Route Components)
  ├── StockTransfersList.js       # Main listing page
  ├── CreateStockTransfer.js       # Direct transfer form
  ├── StockTransferDetails.js      # View transfer details
  ├── CreateTransferRequest.js     # Material Request creation
  ├── ApproveTransferRequest.js    # Approval workflow
  ├── DispatchStock.js             # Dispatch form
  └── ReceiveStock.js              # Receive form

Components (Reusable)
  ├── TransferRequestCard.jsx      # Card component for list
  ├── TransferStatusBadge.jsx      # Status indicator
  ├── TransferItemsTable.jsx       # Items display table
  ├── TransferWorkflowStepper.jsx  # Progress stepper
  └── TransferFilters.jsx          # Filter component
```

### 3. Custom Hooks

- `useStockTransfer.js` - Main hook for transfer operations
- `useTransferRequests.js` - Hook for listing and filtering
- `useTransferWorkflow.js` - Hook for workflow management

### 4. API Service Layer

All API calls will be in the Redux slice following the existing pattern:
- Endpoint constants
- Response extraction helpers
- Error extraction helpers
- Success message extraction

---

## File Structure

```
src/
├── store/
│   └── stockTransferSlice.js          # Redux slice for stock transfers
│
├── hooks/
│   ├── useStockTransfer.js            # Main transfer operations hook
│   ├── useTransferRequests.js         # Transfer requests listing hook
│   └── useTransferWorkflow.js         # Workflow management hook
│
├── pages/
│   └── StockTransfers/
│       ├── index.js                    # Stock transfers landing page
│       ├── StockTransfersList.js       # List all transfers
│       ├── CreateStockTransfer.js      # Direct transfer form
│       ├── StockTransferDetails.js     # View transfer details
│       ├── CreateTransferRequest.js    # Create Material Request
│       ├── ApproveTransferRequest.js   # Approval page
│       ├── DispatchStock.js            # Dispatch form
│       └── ReceiveStock.js             # Receive form
│
├── components/
│   └── StockTransfers/
│       ├── TransferRequestCard.jsx     # Transfer card component
│       ├── TransferStatusBadge.jsx     # Status badge
│       ├── TransferItemsTable.jsx      # Items table
│       ├── TransferWorkflowStepper.jsx # Workflow progress
│       ├── TransferFilters.jsx         # Filter component
│       └── TransferItemForm.jsx        # Item input form
│
└── utils/
    └── stockTransferHelpers.js         # Helper functions
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Create Redux slice with all async thunks
- [ ] Create custom hooks
- [ ] Set up TypeScript/JSDoc types
- [ ] Create utility helpers

### Phase 2: Core Components (Days 3-4)
- [ ] Build reusable UI components
- [ ] Create form components
- [ ] Implement status indicators
- [ ] Build filter components

### Phase 3: Pages & Routes (Days 5-6)
- [ ] Create all page components
- [ ] Implement routing
- [ ] Add navigation
- [ ] Integrate with existing layout

### Phase 4: Workflow Implementation (Days 7-8)
- [ ] Direct transfer flow
- [ ] Request-based workflow
- [ ] Approval workflow
- [ ] Dispatch and receive flows

### Phase 5: Testing & Refinement (Days 9-10)
- [ ] Unit tests for hooks
- [ ] Component tests
- [ ] Integration tests
- [ ] Bug fixes and refinements

---

## Detailed Implementation Steps

### Step 1: Redux Slice (`src/store/stockTransferSlice.js`)

#### Endpoints Configuration

```javascript
const ENDPOINTS = {
  createStockTransfer: 'techsavanna_pos.api.stock.create_stock_transfer',
  listStockTransferRequests: 'techsavanna_pos.api.stock.list_stock_transfer_requests',
  getStockTransferRequest: 'techsavanna_pos.api.stock.get_stock_transfer_request',
  approveStockTransfer: 'techsavanna_pos.api.stock.approve_stock_transfer',
  approveStockTransferWorkflow: 'techsavanna_pos.api.stock.approve_stock_transfer_workflow',
  dispatchStock: 'techsavanna_pos.api.stock.dispatch_stock',
  receiveStockDestination: 'techsavanna_pos.api.stock.receive_stock_destination',
  confirmReceiveTransfer: 'techsavanna_pos.api.stock.confirm_receive_transfer',
};
```

#### Async Thunks to Implement

1. **createStockTransfer**
   - Input: `{ company, posting_date, posting_time, from_warehouse, to_warehouse, items, notes? }`
   - Output: `{ stock_entry: string }`
   - Content-Type: `application/x-www-form-urlencoded`

2. **listStockTransferRequests**
   - Input: `{ status?, origin_warehouse?, destination_warehouse?, from_date?, to_date? }`
   - Output: `{ requests: Array, count: number }`
   - Content-Type: `application/json`

3. **getStockTransferRequest**
   - Input: `{ request_id: string }`
   - Output: `{ request: Object, items: Array }`
   - Method: GET/POST

4. **approveStockTransfer**
   - Input: `{ request_id, approved_by, approval_notes? }`
   - Output: `{ request_id, status, approved_by }`
   - Content-Type: `application/x-www-form-urlencoded`

5. **approveStockTransferWorkflow**
   - Input: `{ request_id, approved_by, approval_notes? }`
   - Output: `{ request_id, workflow_state }`
   - Content-Type: `application/x-www-form-urlencoded`

6. **dispatchStock**
   - Input: `{ request_id, origin_warehouse, items, dispatched_by, dispatch_notes? }`
   - Output: `{ status, stock_entry }`
   - Content-Type: `application/x-www-form-urlencoded`

7. **receiveStockDestination**
   - Input: `{ request_id, destination_warehouse, items, received_by, receive_notes?, goods_received_note? }`
   - Output: `{ status, stock_entry, goods_received_note }`
   - Content-Type: `application/json`

8. **confirmReceiveTransfer**
   - Input: `{ stock_entry_name: string }`
   - Output: `{ stock_entry_name, transfer_status }`
   - Method: POST (query param)

#### State Structure

```javascript
const initialState = {
  // Direct transfers
  stockEntries: [],
  
  // Transfer requests
  transferRequests: [],
  selectedTransferRequest: null,
  
  // Pagination
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  
  // Filters
  filters: {
    status: '',
    origin_warehouse: '',
    destination_warehouse: '',
    from_date: '',
    to_date: '',
  },
  
  // Loading states
  isLoading: false,
  isLoadingDetails: false,
  isLoadingList: false,
  isCreating: false,
  isApproving: false,
  isDispatching: false,
  isReceiving: false,
  
  // Error state
  error: null,
  
  // Workflow state
  currentWorkflowStep: null,
};
```

#### Reducers

- `clearSelectedTransferRequest`
- `setFilters`
- `resetFilters`
- `setPage`
- `clearError`
- `setWorkflowStep`

### Step 2: Custom Hooks

#### `useStockTransfer.js`

```javascript
/**
 * Main hook for stock transfer operations
 * @returns {Object} Transfer operations and state
 */
export const useStockTransfer = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error, ... } = useAppSelector(state => state.stockTransfer);
  
  const createTransfer = useCallback(async (data) => {
    return dispatch(createStockTransfer(data));
  }, [dispatch]);
  
  const approveTransfer = useCallback(async (requestId, approvedBy, notes) => {
    return dispatch(approveStockTransfer({ request_id: requestId, approved_by: approvedBy, approval_notes: notes }));
  }, [dispatch]);
  
  // ... other operations
  
  return {
    createTransfer,
    approveTransfer,
    dispatchStock,
    receiveStock,
    loading: isLoading,
    error,
  };
};
```

#### `useTransferRequests.js`

```javascript
/**
 * Hook for managing transfer requests list
 * @param {Object} filters - Filter options
 * @param {boolean} autoFetch - Auto-fetch on mount
 */
export const useTransferRequests = (filters = {}, autoFetch = true) => {
  const dispatch = useAppDispatch();
  const { transferRequests, pagination, isLoadingList } = useAppSelector(
    state => state.stockTransfer
  );
  
  const fetchRequests = useCallback(async () => {
    return dispatch(listStockTransferRequests(filters));
  }, [dispatch, filters]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchRequests();
    }
  }, [autoFetch, fetchRequests]);
  
  return {
    requests: transferRequests,
    pagination,
    loading: isLoadingList,
    refetch: fetchRequests,
  };
};
```

#### `useTransferWorkflow.js`

```javascript
/**
 * Hook for managing transfer workflow state
 * @param {string} requestId - Transfer request ID
 */
export const useTransferWorkflow = (requestId) => {
  const dispatch = useAppDispatch();
  const { selectedTransferRequest, currentWorkflowStep } = useAppSelector(
    state => state.stockTransfer
  );
  
  useEffect(() => {
    if (requestId) {
      dispatch(getStockTransferRequest({ request_id: requestId }));
    }
  }, [dispatch, requestId]);
  
  const getCurrentStep = useMemo(() => {
    if (!selectedTransferRequest) return null;
    
    const status = selectedTransferRequest.status;
    if (status === 'Draft') return 'create';
    if (status === 'Submitted') return 'approve';
    if (status === 'Approved') return 'dispatch';
    if (status === 'In Transit' || status === 'Partially In Transit') return 'receive';
    if (status === 'Completed') return 'complete';
    return null;
  }, [selectedTransferRequest]);
  
  return {
    request: selectedTransferRequest,
    currentStep: getCurrentStep,
    workflowStep: currentWorkflowStep,
  };
};
```

### Step 3: Utility Helpers (`src/utils/stockTransferHelpers.js`)

```javascript
/**
 * Format date for API (YYYY-MM-DD)
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
};

/**
 * Format time for API (HH:MM:SS)
 */
export const formatTimeForAPI = (time) => {
  if (!time) return null;
  if (typeof time === 'string') {
    // Ensure HH:MM:SS format
    const parts = time.split(':');
    if (parts.length === 2) return `${time}:00`;
    return time;
  }
  return time;
};

/**
 * Get status color for Material Request status
 */
export const getStatusColor = (status) => {
  const statusColors = {
    'Draft': 'default',
    'Submitted': 'info',
    'Approved': 'success',
    'In Transit': 'warning',
    'Partially In Transit': 'warning',
    'Completed': 'success',
    'Partially Received': 'info',
    'Cancelled': 'error',
  };
  return statusColors[status] || 'default';
};

/**
 * Validate transfer items
 */
export const validateTransferItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  
  for (const item of items) {
    if (!item.item_code) {
      return { valid: false, error: 'Item code is required for all items' };
    }
    if (!item.qty || item.qty <= 0) {
      return { valid: false, error: 'Quantity must be greater than 0' };
    }
  }
  
  return { valid: true };
};

/**
 * Calculate transfer progress percentage
 */
export const calculateTransferProgress = (request) => {
  if (!request || !request.items) return 0;
  
  const totalRequested = request.items.reduce((sum, item) => sum + (item.requested_qty || 0), 0);
  const totalReceived = request.items.reduce((sum, item) => sum + (item.received_qty || 0), 0);
  
  if (totalRequested === 0) return 0;
  return Math.round((totalReceived / totalRequested) * 100);
};
```

### Step 4: Reusable Components

#### `TransferStatusBadge.jsx`

```javascript
import { Chip } from '@mui/material';
import { getStatusColor } from '../../utils/stockTransferHelpers';

export const TransferStatusBadge = ({ status, size = 'small' }) => {
  const color = getStatusColor(status);
  return <Chip label={status} color={color} size={size} />;
};
```

#### `TransferRequestCard.jsx`

```javascript
import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import { TransferStatusBadge } from './TransferStatusBadge';
import { calculateTransferProgress } from '../../utils/stockTransferHelpers';
import { LinearProgress } from '@mui/material';

export const TransferRequestCard = ({ request, onView, onApprove, onDispatch, onReceive }) => {
  const progress = calculateTransferProgress(request);
  const canApprove = request.status === 'Submitted';
  const canDispatch = request.status === 'Approved';
  const canReceive = request.status === 'In Transit' || request.status === 'Partially In Transit';
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{request.name}</Typography>
          <TransferStatusBadge status={request.status} />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          From: {request.origin_warehouse}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          To: {request.destination_warehouse}
        </Typography>
        
        {progress > 0 && progress < 100 && (
          <Box mt={2}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              {progress}% Complete
            </Typography>
          </Box>
        )}
        
        <Box mt={2} display="flex" gap={1}>
          <Button size="small" onClick={() => onView(request.name)}>
            View Details
          </Button>
          {canApprove && (
            <Button size="small" variant="contained" onClick={() => onApprove(request.name)}>
              Approve
            </Button>
          )}
          {canDispatch && (
            <Button size="small" variant="contained" onClick={() => onDispatch(request.name)}>
              Dispatch
            </Button>
          )}
          {canReceive && (
            <Button size="small" variant="contained" onClick={() => onReceive(request.name)}>
              Receive
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

#### `TransferWorkflowStepper.jsx`

```javascript
import { Stepper, Step, StepLabel, Box } from '@mui/material';

const steps = ['Create Request', 'Approve', 'Dispatch', 'Receive', 'Complete'];

export const TransferWorkflowStepper = ({ currentStep, status }) => {
  const getActiveStep = () => {
    if (status === 'Draft') return 0;
    if (status === 'Submitted') return 1;
    if (status === 'Approved') return 2;
    if (status === 'In Transit' || status === 'Partially In Transit') return 3;
    if (status === 'Completed') return 4;
    return 0;
  };
  
  return (
    <Box sx={{ width: '100%', py: 3 }}>
      <Stepper activeStep={getActiveStep()} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};
```

### Step 5: Page Components

#### `StockTransfersList.js`

Key features:
- List all transfer requests with filters
- Search functionality
- Status filtering
- Date range filtering
- Warehouse filtering
- Pagination
- Action buttons (View, Approve, Dispatch, Receive)

#### `CreateStockTransfer.js`

Key features:
- Form for direct transfer
- Warehouse selection (from/to)
- Item selection with quantity
- Date and time pickers
- Notes field
- Validation
- Submit handler

#### `StockTransferDetails.js`

Key features:
- Display full transfer request details
- Items table with quantities
- Status timeline/workflow stepper
- Action buttons based on status
- Print functionality
- History/audit trail

#### `CreateTransferRequest.js`

Note: This may need to integrate with Material Request API if not in stock module.

#### `ApproveTransferRequest.js`

Key features:
- Display request details
- Approval form
- Notes field
- Submit approval

#### `DispatchStock.js`

Key features:
- Display request items
- Quantity input for each item
- Warehouse selection
- Dispatch notes
- Validation (check stock availability)
- Submit dispatch

#### `ReceiveStock.js`

Key features:
- Display dispatched items
- Quantity input for received items
- GRN number input
- Receive notes
- Validation
- Submit receive

### Step 6: Routing Integration

Add routes to `src/routes/routes.js`:

```javascript
const StockTransfers = lazy(() => import('../pages/StockTransfers'));
const StockTransfersList = lazy(() => import('../pages/StockTransfers/StockTransfersList'));
const CreateStockTransfer = lazy(() => import('../pages/StockTransfers/CreateStockTransfer'));
const StockTransferDetails = lazy(() => import('../pages/StockTransfers/StockTransferDetails'));
const CreateTransferRequest = lazy(() => import('../pages/StockTransfers/CreateTransferRequest'));
const ApproveTransferRequest = lazy(() => import('../pages/StockTransfers/ApproveTransferRequest'));
const DispatchStock = lazy(() => import('../pages/StockTransfers/DispatchStock'));
const ReceiveStock = lazy(() => import('../pages/StockTransfers/ReceiveStock'));
```

Add to protected routes:

```javascript
{
  path: '/stock-transfers',
  element: StockTransfers,
  label: 'Stock Transfers',
  children: [
    { path: '', element: StockTransfersList },
    { path: 'create', element: CreateStockTransfer },
    { path: 'create-request', element: CreateTransferRequest },
    { path: ':id', element: StockTransferDetails },
    { path: ':id/approve', element: ApproveTransferRequest },
    { path: ':id/dispatch', element: DispatchStock },
    { path: ':id/receive', element: ReceiveStock },
  ],
}
```

### Step 7: Navigation Integration

Add to navigation menu (likely in `src/components/Layout/`):

```javascript
{
  label: 'Stock Transfers',
  path: '/stock-transfers',
  icon: <SwapHorizIcon />,
}
```

---

## Testing Strategy

### Unit Tests

1. **Redux Slice Tests**
   - Test all async thunks
   - Test reducers
   - Test state updates
   - Test error handling

2. **Hook Tests**
   - Test `useStockTransfer`
   - Test `useTransferRequests`
   - Test `useTransferWorkflow`

3. **Utility Tests**
   - Test helper functions
   - Test validation functions
   - Test formatting functions

### Component Tests

1. **Component Rendering**
   - Test component renders correctly
   - Test props handling
   - Test conditional rendering

2. **User Interactions**
   - Test form submissions
   - Test button clicks
   - Test filter changes

### Integration Tests

1. **Workflow Tests**
   - Test complete direct transfer flow
   - Test complete request-based flow
   - Test approval workflow
   - Test dispatch and receive flow

2. **API Integration**
   - Test API calls with mock data
   - Test error scenarios
   - Test success scenarios

### Test Files Structure

```
src/
├── __tests__/
│   ├── store/
│   │   └── stockTransferSlice.test.js
│   ├── hooks/
│   │   ├── useStockTransfer.test.js
│   │   ├── useTransferRequests.test.js
│   │   └── useTransferWorkflow.test.js
│   ├── utils/
│   │   └── stockTransferHelpers.test.js
│   └── components/
│       └── StockTransfers/
│           ├── TransferStatusBadge.test.jsx
│           └── TransferRequestCard.test.jsx
```

---

## Integration Checklist

### Pre-Implementation

- [ ] Review API documentation thoroughly
- [ ] Verify API endpoints are accessible
- [ ] Check authentication requirements
- [ ] Verify environment variables are set
- [ ] Review existing code patterns

### Implementation

- [ ] Create Redux slice with all thunks
- [ ] Create custom hooks
- [ ] Create utility helpers
- [ ] Create reusable components
- [ ] Create page components
- [ ] Add routes
- [ ] Add navigation menu items
- [ ] Integrate with notification system
- [ ] Add error boundaries

### Testing

- [ ] Write unit tests for slice
- [ ] Write unit tests for hooks
- [ ] Write unit tests for utilities
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Manual testing of all flows
- [ ] Test error scenarios
- [ ] Test edge cases

### Documentation

- [ ] Document component props
- [ ] Document hook usage
- [ ] Add JSDoc comments
- [ ] Update README if needed
- [ ] Document API integration points

### Deployment

- [ ] Code review
- [ ] Performance testing
- [ ] Security review
- [ ] User acceptance testing
- [ ] Production deployment

---

## Future Enhancements

### Phase 2 Features

1. **Bulk Operations**
   - Bulk approve transfers
   - Bulk dispatch
   - Bulk receive

2. **Advanced Filtering**
   - Saved filter presets
   - Advanced search
   - Export filtered results

3. **Notifications**
   - Real-time status updates
   - Email notifications
   - Push notifications

4. **Reporting**
   - Transfer history reports
   - Transfer analytics
   - Warehouse movement reports

5. **Mobile Optimization**
   - Responsive design improvements
   - Mobile-specific workflows
   - Touch-optimized interactions

6. **Integration Enhancements**
   - Barcode scanning for items
   - QR code generation for transfers
   - Integration with external systems

---

## API Request Format Notes

### Important Implementation Details

1. **Content-Type Variations**
   - `create_stock_transfer`: `application/x-www-form-urlencoded`
   - `list_stock_transfer_requests`: `application/json`
   - `receive_stock_destination`: `application/json`
   - Others: `application/x-www-form-urlencoded`

2. **Response Structure**
   - Most APIs return: `{ message: { success: true, data: {...} } }`
   - Some return: `{ status: "success", message: "..." }`
   - Need to handle both formats

3. **Error Handling**
   - HTTP status codes: 400, 401, 403, 404, 409, 422, 500
   - Error format: `{ success: false, message: "..." }`
   - Some errors include `exc_type` and `exc` fields

4. **Authentication**
   - Most endpoints require authentication
   - `confirm_receive_transfer` allows guest (not recommended)
   - Use session cookies or API key

5. **User Matching**
   - `approve_stock_transfer_workflow`: API user must match `approved_by`
   - `dispatch_stock`: `dispatched_by` should match logged-in user

---

## Code Quality Standards

### Code Style

- Follow existing codebase patterns
- Use ESLint configuration
- Use Prettier for formatting
- Follow React best practices

### Performance

- Use React.memo for expensive components
- Use useMemo/useCallback appropriately
- Implement pagination for large lists
- Lazy load routes

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers

### Security

- Validate all inputs
- Sanitize user inputs
- Handle authentication errors
- Protect sensitive data

---

## Support & Maintenance

### Troubleshooting

Common issues and solutions:
1. **API Authentication Errors**: Check token/session
2. **CORS Issues**: Verify API configuration
3. **State Not Updating**: Check Redux reducer logic
4. **Form Validation**: Verify validation rules

### Monitoring

- Log API errors
- Track user actions
- Monitor performance
- Track error rates

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating the Stock Transfer API into the Savanna POS application. Follow the phases sequentially, ensuring each phase is complete before moving to the next. Regular testing and code reviews are essential for maintaining code quality.

**Estimated Timeline**: 10-12 days for complete implementation
**Team Size**: 1-2 developers
**Priority**: High (Core inventory management feature)

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Ready for Implementation

