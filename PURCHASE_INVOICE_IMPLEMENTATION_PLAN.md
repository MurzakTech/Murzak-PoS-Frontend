# Purchase Invoice API Implementation Plan

## Overview
This document outlines the implementation plan for integrating Purchase Invoice API endpoints into the Savanna POS React application. The implementation follows the existing codebase patterns and architecture.

## Analysis Summary

### Current State
- **Existing Purchase Order Implementation**: The codebase already has Purchase Order (LPO) functionality implemented
- **Missing Purchase Invoice Implementation**: Purchase Invoices are a separate entity from Purchase Orders and need to be implemented
- **API Endpoints Available**:
  - `GET /api/method/techsavanna_pos.api.purchase.list_purchase_invoices` - List Purchase Invoices
  - `GET /api/method/techsavanna_pos.api.purchase.get_purchase_invoice_details` - Get Purchase Invoice Details

### Key Differences: Purchase Orders vs Purchase Invoices
- **Purchase Orders (LPO)**: Documents created to order goods from suppliers (already implemented)
- **Purchase Invoices**: Documents received from suppliers for goods/services already received (to be implemented)

---

## Implementation Plan

### Phase 1: Redux Store Integration (Backend State Management)

#### 1.1 Update `purchaseSlice.js`
**File**: `src/store/purchaseSlice.js`

**Tasks**:
- [ ] Add new endpoints to `ENDPOINTS` constant:
  ```javascript
  listPurchaseInvoices: 'techsavanna_pos.api.purchase.list_purchase_invoices',
  getPurchaseInvoiceDetails: 'techsavanna_pos.api.purchase.get_purchase_invoice_details',
  ```

- [ ] Create async thunk: `listPurchaseInvoices`
  - Accepts filters: `page`, `page_size`, `supplier`, `company`, `purchase_order`, `purchase_receipt`, `from_date`, `to_date`, `docstatus`, `status`, `bill_no`
  - Uses GET method with query parameters
  - Handles response structure: `{ status, message, data[], meta: { page, page_size, total, total_pages } }`
  - Returns: `{ invoices: [], pagination: {} }`

- [ ] Create async thunk: `getPurchaseInvoiceDetails`
  - Accepts: `{ invoice_no: string }`
  - Uses GET method with query parameter
  - Handles response structure: `{ status, message, data: PurchaseInvoiceDetail }`
  - Returns: `{ invoice: PurchaseInvoiceDetail }`

- [ ] Update initial state:
  ```javascript
  purchaseInvoices: [],
  selectedPurchaseInvoice: null,
  purchaseInvoicePagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  isLoadingPurchaseInvoices: false,
  isLoadingPurchaseInvoiceDetails: false,
  purchaseInvoiceFilters: {
    supplier: '',
    company: '',
    purchase_order: '',
    purchase_receipt: '',
    from_date: '',
    to_date: '',
    docstatus: '',
    status: '',
    bill_no: '',
  },
  ```

- [ ] Add reducers:
  - `setPurchaseInvoiceFilters`
  - `resetPurchaseInvoiceFilters`
  - `setPurchaseInvoicePage`
  - `setPurchaseInvoicePageSize`
  - `clearSelectedPurchaseInvoice`

- [ ] Add extraReducers for:
  - `listPurchaseInvoices.pending/fulfilled/rejected`
  - `getPurchaseInvoiceDetails.pending/fulfilled/rejected`

**Estimated Time**: 2-3 hours

---

### Phase 2: TypeScript/JavaScript Type Definitions

#### 2.1 Create Type Definitions File
**File**: `src/types/purchaseInvoiceTypes.js` (or `.ts` if using TypeScript)

**Tasks**:
- [ ] Define `PurchaseInvoiceListItem` interface
- [ ] Define `PurchaseInvoiceDetail` interface
- [ ] Define `PurchaseInvoiceItem` interface
- [ ] Define `PurchaseInvoiceTax` interface
- [ ] Define `FileAttachment` interface
- [ ] Define `PurchaseInvoiceFilters` interface
- [ ] Define `PurchaseInvoiceListResponse` interface
- [ ] Define `PurchaseInvoiceDetailResponse` interface

**Estimated Time**: 30 minutes

---

### Phase 3: React Hooks (Optional - for reusable logic)

#### 3.1 Create Custom Hook for Purchase Invoice List
**File**: `src/hooks/usePurchaseInvoiceList.js`

**Tasks**:
- [ ] Create hook that:
  - Uses Redux dispatch to fetch invoices
  - Manages loading/error states
  - Handles pagination
  - Supports filter changes
  - Returns: `{ invoices, loading, error, pagination, refetch, fetchPage, setFilters }`

**Estimated Time**: 1 hour

#### 3.2 Create Custom Hook for Purchase Invoice Details
**File**: `src/hooks/usePurchaseInvoiceDetails.js`

**Tasks**:
- [ ] Create hook that:
  - Accepts `invoiceNo` parameter
  - Fetches invoice details when `invoiceNo` changes
  - Manages loading/error states
  - Returns: `{ invoice, loading, error, refetch }`

**Estimated Time**: 30 minutes

---

### Phase 4: UI Components

#### 4.1 Purchase Invoice List Page
**File**: `src/pages/Purchases/PurchaseInvoicesList.js`

**Tasks**:
- [ ] Create component similar to existing `Purchases/index.js`
- [ ] Implement:
  - Filter bar with filters: supplier, company, purchase_order, purchase_receipt, date range, docstatus, status, bill_no
  - Data table with columns:
    - Invoice No (name)
    - Supplier
    - Posting Date
    - Due Date
    - Bill No
    - Grand Total
    - Outstanding Amount
    - Status
    - Actions (View, etc.)
  - Pagination controls
  - Search functionality
  - Status chips/badges
  - Action menu (View Details, etc.)

**Estimated Time**: 4-5 hours

#### 4.2 Purchase Invoice Details Page
**File**: `src/pages/Purchases/PurchaseInvoiceDetails.js`

**Tasks**:
- [ ] Create component similar to existing `PurchaseDetails.js`
- [ ] Implement sections:
  - **Header Section**: Invoice number, supplier, dates, status, amounts
  - **Items Table**: Item code, name, description, qty, rate, amount, warehouse, UOM
  - **Taxes Section**: Tax details table
  - **Linked Documents Section**: Purchase Orders, Purchase Receipts (GRNs)
  - **Attachments Section**: File list with download links
  - **Summary Section**: Net total, taxes, grand total, outstanding amount, paid amount

**Estimated Time**: 4-5 hours

#### 4.3 Update Main Purchases Page (Optional)
**File**: `src/pages/Purchases/index.js`

**Tasks**:
- [ ] Add navigation option to Purchase Invoices list
- [ ] Update menu/routing to include Purchase Invoices

**Estimated Time**: 30 minutes

---

### Phase 5: Routing Integration

#### 5.1 Update Routes Configuration
**File**: `src/routes/routes.js`

**Tasks**:
- [ ] Add lazy imports:
  ```javascript
  const PurchaseInvoicesList = lazy(() => import('../pages/Purchases/PurchaseInvoicesList'));
  const PurchaseInvoiceDetails = lazy(() => import('../pages/Purchases/PurchaseInvoiceDetails'));
  ```

- [ ] Add routes:
  ```javascript
  {
    path: '/purchases/invoices',
    element: PurchaseInvoicesList,
    label: 'Purchase Invoices',
  },
  {
    path: '/purchases/invoices/:invoiceNo',
    element: PurchaseInvoiceDetails,
    label: 'Purchase Invoice Details',
  },
  ```

- [ ] Update navigation menu to include Purchase Invoices link

**Estimated Time**: 30 minutes

---

### Phase 6: Error Handling & Edge Cases

#### 6.1 Error Handling
**Tasks**:
- [ ] Implement error handling for:
  - `INVALID_REQUEST` - Missing/invalid parameters
  - `LPO_NOT_FOUND` - Invoice not found (note: API uses LPO_NOT_FOUND code)
  - `PERMISSION_DENIED` - Access denied
  - Network errors
  - Empty states

- [ ] Add user-friendly error messages
- [ ] Add loading states and skeletons
- [ ] Add empty state components

**Estimated Time**: 1-2 hours

#### 6.2 Edge Cases
**Tasks**:
- [ ] Handle null/undefined values in response data
- [ ] Handle missing optional fields (bill_no, due_date, etc.)
- [ ] Handle empty arrays (items, taxes, attachments)
- [ ] Handle pagination edge cases (no results, single page, etc.)
- [ ] Handle date formatting and display

**Estimated Time**: 1 hour

---

### Phase 7: Testing & Validation

#### 7.1 Manual Testing Checklist
**Tasks**:
- [ ] Test list endpoint with various filters
- [ ] Test pagination (next, previous, page size changes)
- [ ] Test search functionality
- [ ] Test details page with valid invoice number
- [ ] Test error handling (invalid invoice number, network errors)
- [ ] Test empty states
- [ ] Test responsive design
- [ ] Test date formatting
- [ ] Test currency formatting
- [ ] Test file attachment downloads

**Estimated Time**: 2-3 hours

#### 7.2 Integration Testing
**Tasks**:
- [ ] Verify Redux state updates correctly
- [ ] Verify navigation between list and details
- [ ] Verify filters persist/reset correctly
- [ ] Verify pagination state management

**Estimated Time**: 1 hour

---

## File Structure

```
src/
├── store/
│   └── purchaseSlice.js (MODIFY - add Purchase Invoice endpoints)
├── types/
│   └── purchaseInvoiceTypes.js (NEW - type definitions)
├── hooks/
│   ├── usePurchaseInvoiceList.js (NEW - optional)
│   └── usePurchaseInvoiceDetails.js (NEW - optional)
├── pages/
│   └── Purchases/
│       ├── PurchaseInvoicesList.js (NEW)
│       ├── PurchaseInvoiceDetails.js (NEW)
│       └── index.js (MODIFY - add navigation)
└── routes/
    └── routes.js (MODIFY - add routes)
```

---

## Implementation Order

1. **Phase 1**: Redux Store Integration (Foundation)
2. **Phase 2**: Type Definitions (Data Structure)
3. **Phase 3**: React Hooks (Reusable Logic) - Optional
4. **Phase 4**: UI Components (User Interface)
5. **Phase 5**: Routing Integration (Navigation)
6. **Phase 6**: Error Handling (Robustness)
7. **Phase 7**: Testing (Quality Assurance)

---

## Key Considerations

### API Response Handling
- The API returns data in format: `{ status: "success"|"error", message: string, data: {...}, meta: {...} }`
- Need to extract `data` and `meta` from response
- Handle error responses with appropriate error codes

### Authentication
- All endpoints require authentication (not guest accessible)
- JWT token is automatically added by `axiosInstance` interceptor
- No need to manually add auth headers

### Company Filtering
- Company should be automatically included from user's company data
- Similar to how it's done in `purchaseSlice.js` for Purchase Orders

### Date Formatting
- API expects dates in `YYYY-MM-DD` format
- Display dates in user-friendly format (e.g., "Jan 15, 2026")
- Use date formatting utilities if available

### Currency Formatting
- All monetary values are numbers
- Format using `toLocaleString()` or currency formatting library
- Display currency code (e.g., "KES")

### Pagination
- Default page size: 20
- Maximum page size: 100
- Calculate total pages: `Math.ceil(total / page_size)`

### Status Values
- Common statuses: "Draft", "Unpaid", "Paid", "Partly Paid", "Overdue", "Cancelled"
- Use StatusChip component for consistent styling

### Document Status
- `0` = Draft
- `1` = Submitted
- `2` = Cancelled
- `"all"` = All statuses

---

## Dependencies

### Existing Dependencies (Already in Project)
- `@reduxjs/toolkit` - Redux state management
- `axios` - HTTP client
- `react-router-dom` - Routing
- `@mui/material` - UI components
- `react-hook-form` - Form handling (if needed)

### No New Dependencies Required
All necessary dependencies are already available in the project.

---

## Estimated Total Time

- **Phase 1**: 2-3 hours
- **Phase 2**: 30 minutes
- **Phase 3**: 1.5 hours (optional)
- **Phase 4**: 8-10 hours
- **Phase 5**: 30 minutes
- **Phase 6**: 2-3 hours
- **Phase 7**: 3-4 hours

**Total Estimated Time**: 18-23 hours (with optional hooks: 19.5-24.5 hours)

---

## Notes

1. **Naming Convention**: Use "Purchase Invoice" terminology consistently (not "Purchase Order" or "LPO")

2. **Code Reusability**: Leverage existing components:
   - `DataTable` component
   - `FilterBar` component
   - `StatusChip` component
   - `PageHeader` component

3. **Consistency**: Follow existing patterns from:
   - `purchaseSlice.js` for Redux structure
   - `Purchases/index.js` for list page structure
   - `PurchaseDetails.js` for details page structure

4. **API Endpoint Naming**: Note that the API uses `list_purchase_invoices` and `get_purchase_invoice_details`, which are different from Purchase Order endpoints

5. **Error Code Note**: The API documentation shows `LPO_NOT_FOUND` error code, but this is for Purchase Invoices. This might be a documentation inconsistency - handle accordingly.

---

## Success Criteria

✅ Purchase Invoices can be listed with filtering and pagination
✅ Purchase Invoice details can be viewed with all information displayed
✅ Error states are handled gracefully
✅ Loading states provide good UX
✅ Code follows existing patterns and conventions
✅ All TypeScript/JavaScript types are properly defined
✅ Routing is properly integrated
✅ UI is responsive and user-friendly

---

## Next Steps After Implementation

1. **Documentation**: Update any internal documentation
2. **User Training**: Prepare user guide if needed
3. **Performance Optimization**: Monitor and optimize if needed
4. **Feature Enhancements**: Consider additional features:
   - Export to PDF/Excel
   - Print functionality
   - Bulk operations
   - Advanced filtering
   - Search improvements

---

**Last Updated**: 2026-01-15
**Version**: 1.0

