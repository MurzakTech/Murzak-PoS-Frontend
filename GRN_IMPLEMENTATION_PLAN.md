# GRN (Goods Receipt Note) API Implementation Plan

## Overview

This document outlines the implementation plan for integrating GRN (Goods Receipt Note) API endpoints into the Savanna POS frontend application. The implementation will follow existing patterns in the codebase and provide comprehensive GRN listing and detail views with filtering, pagination, and detailed item-level information.

---

## 1. API Endpoints Summary

Based on `GRN_API_DOCUMENTATION.md`, the following endpoints need to be implemented:

### 1.1 List GRNs
- **Endpoint**: `GET /api/method/techsavanna_pos.api.reports.grn_list_report`
- **Purpose**: Retrieve paginated list of GRNs with optional filtering
- **Query Parameters**:
  - `company` (optional, defaults to user's company)
  - `supplier` (optional)
  - `purchase_order` (optional)
  - `warehouse` (optional)
  - `start_date` (optional, YYYY-MM-DD)
  - `end_date` (optional, YYYY-MM-DD)
  - `status` (optional, e.g., "Received", "To Bill", "Completed")
  - `docstatus` (optional, 0=Draft, 1=Submitted, 2=Cancelled)
  - `page` (optional, default: 1)
  - `page_size` (optional, default: 20, max: 100)

### 1.2 Get GRN Details
- **Endpoint**: `GET /api/method/techsavanna_pos.api.reports.grn_detail_report`
- **Purpose**: Retrieve detailed information for a specific GRN
- **Query Parameters**:
  - `grn_no` (required) - GRN number (Purchase Receipt name)

---

## 2. Implementation Structure

### 2.1 File Organization

```
src/
├── api/
│   └── reportsApi.js                    # ADD: GRN API functions
├── store/
│   └── grnSlice.js                      # NEW: Redux slice for GRN state management
├── pages/
│   └── Purchases/
│       ├── GRNList.js                   # NEW: GRN list page component
│       └── GRNDetails.js                # NEW: GRN detail page component
├── components/
│   └── GRN/                             # NEW: Reusable GRN components (optional)
│       └── GRNFilters.jsx               # NEW: Filter component (optional)
└── routes/
    └── routes.js                         # UPDATE: Add GRN routes
```

---

## 3. Implementation Steps

### Phase 1: API Integration Layer

#### Step 1.1: Add GRN API Functions to `reportsApi.js`

**File**: `src/api/reportsApi.js`

**Add the following functions**:

```javascript
/**
 * Fetch GRN List Report
 * @param {Object} params - Query parameters
 * @param {string} params.company - Company name (optional)
 * @param {string} params.supplier - Supplier name filter (optional)
 * @param {string} params.purchase_order - Purchase Order number filter (optional)
 * @param {string} params.warehouse - Warehouse name filter (optional)
 * @param {string} params.start_date - Start date filter (YYYY-MM-DD, optional)
 * @param {string} params.end_date - End date filter (YYYY-MM-DD, optional)
 * @param {string} params.status - GRN status filter (optional)
 * @param {number} params.docstatus - Document status (optional, 0=Draft, 1=Submitted, 2=Cancelled)
 * @param {number} params.page - Page number (optional, default: 1)
 * @param {number} params.page_size - Records per page (optional, default: 20, max: 100)
 * @returns {Promise<Object>} { success: boolean, data: GRN[], meta: PaginationMeta }
 */
export const fetchGRNList = async (params) => {
  try {
    const response = await axiosInstance.get(
      buildEndpoint('grn_list_report'),
      { params }
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch GRN Detail Report
 * @param {Object} params - Query parameters
 * @param {string} params.grn_no - GRN number (required)
 * @returns {Promise<Object>} { success: boolean, data: GRNDetail }
 */
export const fetchGRNDetails = async (params) => {
  try {
    const response = await axiosInstance.get(
      buildEndpoint('grn_detail_report'),
      { params }
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};
```

**Dependencies**: 
- Uses existing `buildEndpoint`, `extractResponseData`, and `extractErrorMessage` helpers
- Uses existing `axiosInstance` from `axiosInstance.js`

**Validation**:
- Ensure `grn_no` is provided for detail endpoint
- Validate date formats (YYYY-MM-DD)
- Validate `page_size` doesn't exceed 100

---

### Phase 2: Redux State Management

#### Step 2.1: Create GRN Redux Slice

**File**: `src/store/grnSlice.js`

**Implementation Details**:

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchGRNList, fetchGRNDetails } from '../api/reportsApi';
import { showNotification } from './notificationSlice';

// Async thunks
export const listGRNs = createAsyncThunk(
  'grn/listGRNs',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetchGRNList(params);
      
      // Handle API response structure: { success: true, data: [...], meta: {...} }
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch GRNs');
      }
      
      return {
        grns: response.data || [],
        meta: response.meta || {
          page: params.page || 1,
          page_size: params.page_size || 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch GRNs';
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Error',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getGRNDetails = createAsyncThunk(
  'grn/getGRNDetails',
  async ({ grn_no }, { dispatch, rejectWithValue }) => {
    try {
      if (!grn_no) {
        throw new Error('GRN number is required');
      }
      
      const response = await fetchGRNDetails({ grn_no });
      
      // Handle API response structure: { success: true, data: {...} }
      if (!response.success) {
        throw new Error(response.message || 'GRN not found');
      }
      
      return {
        grn: response.data,
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch GRN details';
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Error',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Initial state
const initialState = {
  grns: [],
  selectedGRN: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    company: '',
    supplier: '',
    purchase_order: '',
    warehouse: '',
    start_date: '',
    end_date: '',
    status: '',
    docstatus: undefined, // undefined = exclude cancelled by default
  },
  isLoading: false,
  isLoadingDetails: false,
  error: null,
};

// Slice
const grnSlice = createSlice({
  name: 'grn',
  initialState,
  reducers: {
    clearSelectedGRN: (state) => {
      state.selectedGRN = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    setPageSize: (state, action) => {
      state.pagination.page_size = action.payload;
      state.pagination.page = 1; // Reset to first page when page size changes
    },
  },
  extraReducers: (builder) => {
    builder
      // List GRNs
      .addCase(listGRNs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listGRNs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.grns = action.payload.grns || [];
        state.pagination = {
          ...state.pagination,
          ...action.payload.meta,
        };
      })
      .addCase(listGRNs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get GRN Details
      .addCase(getGRNDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getGRNDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedGRN = action.payload.grn || null;
      })
      .addCase(getGRNDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedGRN,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} = grnSlice.actions;

export default grnSlice.reducer;
```

**Dependencies**:
- Import from `reportsApi.js`
- Use `showNotification` from `notificationSlice`
- Follow patterns from `purchaseSlice.js`

#### Step 2.2: Register GRN Slice in Store

**File**: `src/store/store.js` (or wherever the store is configured)

**Action**: Add `grnReducer` to the store configuration:

```javascript
import grnReducer from './grnSlice';

const store = configureStore({
  reducer: {
    // ... existing reducers
    grn: grnReducer,
  },
});
```

---

### Phase 3: UI Components

#### Step 3.1: Create GRN List Page

**File**: `src/pages/Purchases/GRNList.js`

**Implementation Details**:
- Follow the pattern from `PurchaseReceiptsList.js`
- Include:
  - Header with title and "New GRN" button (if applicable)
  - Filter section with:
    - Supplier search/autocomplete
    - Purchase Order filter
    - Warehouse filter
    - Date range (start_date, end_date)
    - Status dropdown
    - Document status filter
  - Data table showing:
    - GRN Number (name)
    - Supplier Name
    - Posting Date
    - Warehouse
    - Purchase Order (if linked)
    - Grand Total
    - Status
    - Items Count
    - Total Quantity
    - Actions column (View, etc.)
  - Pagination component
  - Loading states
  - Empty states
  - Error handling

**Key Features**:
- Real-time filtering
- Debounced search inputs (use `useDebounce` hook if available)
- Responsive design (mobile-friendly)
- Sortable columns (optional)
- Export functionality (optional, future enhancement)

**Dependencies**:
- Material-UI components (Table, Paper, TextField, etc.)
- React Router for navigation
- Redux hooks (`useAppDispatch`, `useAppSelector`)
- User company from auth state

#### Step 3.2: Create GRN Details Page

**File**: `src/pages/Purchases/GRNDetails.js`

**Implementation Details**:
- Follow the pattern from `PurchaseReceiptDetails.js`
- Include:
  - Header with back button and GRN number
  - GRN Summary Card:
    - Supplier information
    - Company
    - Posting date and time
    - Warehouse
    - Purchase Order (if linked)
    - Status and document status
    - Grand total and net total
    - Percentages (received, billed)
    - Total quantity
  - Items Table:
    - Item code
    - Item name
    - Description
    - Quantity (qty, received_qty, rejected_qty)
    - Rate and amount
    - Warehouse
    - UOM
    - Purchase order link
    - Stock application status (applied_to_stock indicator)
    - Stock entry number and date (if applied)
  - Purchase Order Details Card (if linked):
    - PO number
    - Transaction date
    - Status
    - Grand total
  - Action buttons:
    - Print (optional)
    - Export (optional)

**Key Features**:
- Clean, organized layout
- Color-coded status chips
- Visual indicators for stock application status
- Responsive design
- Loading and error states

**Dependencies**:
- Material-UI components
- React Router (`useParams`, `useNavigate`)
- Redux hooks

---

### Phase 4: Routing Configuration

#### Step 4.1: Update Routes Configuration

**File**: `src/routes/routes.js`

**Actions**:
1. Import the new components:
```javascript
const GRNList = lazy(() => import('../pages/Purchases/GRNList'));
const GRNDetails = lazy(() => import('../pages/Purchases/GRNDetails'));
```

2. Add routes under the Purchases section:
```javascript
{
  path: '/purchases',
  element: Purchases,
  label: 'Purchases',
  icon: 'ShoppingCart',
  children: [
    // ... existing routes
    {
      path: '/purchases/grns',
      element: GRNList,
      label: 'GRN List',
      icon: 'Receipt',
    },
    {
      path: '/purchases/grns/:id',
      element: GRNDetails,
      label: 'GRN Details',
      hideFromMenu: true,
    },
  ],
}
```

---

### Phase 5: TypeScript Types (Optional)

#### Step 5.1: Add TypeScript Type Definitions

If the project uses TypeScript or plans to migrate:

**File**: `src/types/grn.ts` (or add to existing types file)

```typescript
export interface GRN {
  name: string;
  supplier: string;
  supplier_name: string;
  company: string;
  posting_date: string;
  posting_time: string;
  set_warehouse: string;
  purchase_order: string | null;
  grand_total: number;
  status: string;
  docstatus: number;
  is_return: number;
  per_received: number;
  per_billed: number;
  items_count: number;
  total_qty: number;
}

export interface GRNItem {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  received_qty: number;
  rejected_qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  uom: string;
  purchase_order: string | null;
  purchase_order_item: string | null;
  applied_to_stock: boolean;
  stock_entry: string | null;
  stock_entry_date: string | null;
}

export interface GRNDetail extends GRN {
  grn_no: string;
  net_total: number;
  items: GRNItem[];
  purchase_order_details?: {
    po_no: string;
    transaction_date: string;
    status: string;
    grand_total: number;
  };
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface GRNListResponse {
  success: boolean;
  data: GRN[];
  meta: PaginationMeta;
}

export interface GRNDetailResponse {
  success: boolean;
  data: GRNDetail;
}

export interface GRNFilters {
  company?: string;
  supplier?: string;
  purchase_order?: string;
  warehouse?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  docstatus?: number;
  page?: number;
  page_size?: number;
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests

**Files to Test**:
- `src/api/reportsApi.js` - GRN API functions
- `src/store/grnSlice.js` - Redux actions and reducers
- Component logic (if using custom hooks)

**Test Cases**:
- API function error handling
- Redux state updates
- Filter application
- Pagination logic
- Date validation

### 4.2 Integration Tests

**Test Scenarios**:
- Fetch GRN list with filters
- Fetch GRN details
- Navigate from list to details
- Pagination navigation
- Filter changes trigger API calls
- Error states display correctly
- Loading states work properly

### 4.3 Manual Testing Checklist

- [ ] GRN list loads successfully
- [ ] All filters work correctly
- [ ] Pagination works (next, previous, page numbers)
- [ ] Clicking a GRN navigates to details page
- [ ] GRN details page displays all information correctly
- [ ] Stock application status is visible
- [ ] Date filters validate format
- [ ] Empty states display when no data
- [ ] Error messages display on API failures
- [ ] Loading states show during API calls
- [ ] Responsive design works on mobile/tablet
- [ ] Back navigation works correctly

---

## 5. Implementation Checklist

### Phase 1: API Integration
- [ ] Add `fetchGRNList` function to `reportsApi.js`
- [ ] Add `fetchGRNDetails` function to `reportsApi.js`
- [ ] Test API functions with sample requests
- [ ] Verify error handling

### Phase 2: Redux State Management
- [ ] Create `grnSlice.js`
- [ ] Implement `listGRNs` async thunk
- [ ] Implement `getGRNDetails` async thunk
- [ ] Add reducers and actions
- [ ] Register slice in store
- [ ] Test Redux actions and state updates

### Phase 3: UI Components
- [ ] Create `GRNList.js` component
- [ ] Implement filter UI
- [ ] Implement data table
- [ ] Implement pagination
- [ ] Add loading and error states
- [ ] Create `GRNDetails.js` component
- [ ] Implement summary section
- [ ] Implement items table
- [ ] Implement purchase order details section
- [ ] Add navigation and actions

### Phase 4: Routing
- [ ] Add route imports
- [ ] Configure routes in `routes.js`
- [ ] Test navigation flows
- [ ] Verify menu integration (if applicable)

### Phase 5: Polish & Testing
- [ ] Add TypeScript types (if applicable)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform manual testing
- [ ] Fix bugs and issues
- [ ] Code review
- [ ] Documentation updates

---

## 6. Future Enhancements

### 6.1 Short-term Enhancements
- Export GRN list to CSV/Excel
- Print GRN details
- Advanced search with multiple criteria
- Bulk actions (if supported by API)
- Sortable columns in list view

### 6.2 Long-term Enhancements
- Real-time updates using WebSocket
- GRN creation/edit UI (if API supports)
- GRN approval workflow UI
- Integration with purchase order creation flow
- Analytics dashboard for GRN metrics

---

## 7. Dependencies & Prerequisites

### 7.1 Existing Dependencies (Already in Project)
- `react` - React library
- `react-redux` - Redux bindings for React
- `@reduxjs/toolkit` - Redux Toolkit
- `react-router-dom` - React Router
- `@mui/material` - Material-UI components
- `axios` - HTTP client
- `date-fns` or similar - Date manipulation (if needed)

### 7.2 New Dependencies (If Needed)
- `use-debounce` - For debouncing filter inputs (optional)
- TypeScript types for Material-UI (if using TypeScript)

---

## 8. API Response Handling

### 8.1 Expected Response Structure

**List GRNs Response**:
```json
{
  "success": true,
  "data": [/* GRN objects */],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**GRN Details Response**:
```json
{
  "success": true,
  "data": {
    "grn_no": "MAT-PRE-2026-00001",
    /* ... GRN detail fields ... */
    "items": [/* item objects */],
    "purchase_order_details": {/* optional */}
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error message"
}
```

### 8.2 Error Handling Strategy

- Check `success` field before using `data`
- Display user-friendly error messages
- Log errors for debugging
- Show retry options for failed requests
- Handle network errors gracefully

---

## 9. Performance Considerations

### 9.1 Optimization Strategies
- Implement debouncing for filter inputs (500ms delay)
- Use pagination to limit data transfer
- Implement caching for frequently accessed GRNs (future)
- Lazy load details page
- Optimize re-renders with React.memo where appropriate

### 9.2 Best Practices
- Avoid fetching all data at once
- Use proper loading states
- Implement virtual scrolling for large lists (if needed)
- Optimize API calls (combine filters when possible)

---

## 10. Security Considerations

### 10.1 API Authentication
- GRN endpoints use `allow_guest=True`, but if authentication is required:
  - Ensure `axiosInstance` includes proper auth headers
  - Handle 401 errors and redirect to login
  - Store tokens securely

### 10.2 Data Validation
- Validate user inputs (dates, page numbers, etc.)
- Sanitize filter inputs
- Handle edge cases (empty strings, null values)

---

## 11. Documentation Updates

### 11.1 Code Documentation
- Add JSDoc comments to all functions
- Document component props and state
- Update README if needed

### 11.2 User Documentation
- Document GRN list features
- Document filtering options
- Document navigation flow

---

## 12. Rollout Plan

### 12.1 Development Environment
1. Implement and test in development
2. Code review
3. Unit and integration tests

### 12.2 Staging Environment
1. Deploy to staging
2. User acceptance testing
3. Bug fixes

### 12.3 Production Environment
1. Deploy to production
2. Monitor for errors
3. Gather user feedback
4. Iterate based on feedback

---

## 13. Success Criteria

### 13.1 Functional Requirements
- ✅ Users can view a list of GRNs
- ✅ Users can filter GRNs by multiple criteria
- ✅ Users can paginate through GRN list
- ✅ Users can view detailed GRN information
- ✅ Users can navigate between list and details
- ✅ Loading and error states work correctly

### 13.2 Non-Functional Requirements
- ✅ Performance: List loads in < 2 seconds
- ✅ Responsive: Works on mobile and desktop
- ✅ Accessibility: Keyboard navigation works
- ✅ User Experience: Intuitive and easy to use
- ✅ Code Quality: Follows existing patterns

---

## 14. Risk Assessment

### 14.1 Potential Risks
1. **API Changes**: API response structure may differ from documentation
   - **Mitigation**: Test with real API early, handle both structures
2. **Performance Issues**: Large datasets may cause slow loading
   - **Mitigation**: Implement pagination, optimize queries
3. **Data Inconsistency**: GRN data may be incomplete
   - **Mitigation**: Handle null/undefined values gracefully
4. **User Confusion**: Complex filters may confuse users
   - **Mitigation**: Clear labels, tooltips, help text

---

## 15. Timeline Estimate

### Estimated Development Time

- **Phase 1 (API Integration)**: 2-4 hours
- **Phase 2 (Redux State)**: 3-5 hours
- **Phase 3 (UI Components)**: 8-12 hours
- **Phase 4 (Routing)**: 1-2 hours
- **Phase 5 (Testing & Polish)**: 4-6 hours

**Total Estimated Time**: 18-29 hours

---

## 16. Notes

### 16.1 Integration with Existing Features
- GRN list can be integrated into the Purchases section
- Link from Purchase Orders to related GRNs (future enhancement)
- Link from GRNs to Purchase Receipts (if they're the same)

### 16.2 Design Consistency
- Follow existing Material-UI theme
- Use consistent spacing and typography
- Match existing table and filter patterns
- Use same status chip colors as other pages

---

## 17. Conclusion

This implementation plan provides a comprehensive roadmap for integrating GRN API endpoints into the Savanna POS frontend. The plan follows existing codebase patterns, ensures maintainability, and provides a solid foundation for future enhancements.

**Next Steps**:
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular check-ins and progress updates

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-XX  
**Author**: AI Assistant  
**Status**: Draft for Review
