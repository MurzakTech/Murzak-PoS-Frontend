# Customer Credit Limit Implementation Plan

## Overview

This document outlines the implementation plan for integrating Customer Credit Limit Management features into the SavvyPOS frontend application, based on the API documentation provided.

## Current State Analysis

### Existing Implementation
- ✅ Customer listing page (`src/pages/Customers/index.js`)
- ✅ Customer Redux slice (`src/store/customerSlice.js`)
- ✅ Basic customer CRUD operations
- ✅ Customer detail view dialog
- ✅ Material-UI components and theming
- ✅ Redux Toolkit for state management
- ✅ Axios instance with authentication interceptors

### Missing Features
- ❌ Credit limit management APIs
- ❌ Credit limit display in customer list
- ❌ Credit limit management UI components
- ❌ Credit history viewing
- ❌ Credit utilization indicators
- ❌ Over-limit warnings

---

## Implementation Phases

### Phase 1: Redux State Management (Foundation)
**Priority: High | Estimated Time: 2-3 hours**

#### 1.1 Update `customerSlice.js`
Add new async thunks for credit limit operations:

**New Endpoints to Add:**
```javascript
const ENDPOINTS = {
  // ... existing endpoints
  setCreditLimit: 'savanna_pos.savanna_pos.apis.customer_api.set_customer_credit_limit',
  getCreditLimit: 'savanna_pos.savanna_pos.apis.customer_api.get_customer_credit_limit',
  getCreditHistory: 'savanna_pos.savanna_pos.apis.customer_api.get_customer_credit_history',
  removeCreditLimit: 'savanna_pos.savanna_pos.apis.customer_api.remove_customer_credit_limit',
};
```

**New Async Thunks:**
1. `setCustomerCreditLimit` - Set/update credit limit
2. `getCustomerCreditLimit` - Fetch credit limit info
3. `getCustomerCreditHistory` - Fetch credit transaction history
4. `removeCustomerCreditLimit` - Remove customer-level credit limit

**State Updates:**
- Add `creditLimit` object to store credit limit data
- Add `creditHistory` array for transaction history
- Add loading states: `isLoadingCreditLimit`, `isLoadingCreditHistory`, `isUpdatingCreditLimit`
- Add error states for credit operations

**Files to Modify:**
- `src/store/customerSlice.js`

---

### Phase 2: Credit Limit Management Component
**Priority: High | Estimated Time: 4-5 hours**

#### 2.1 Create Credit Limit Management Component
**File:** `src/components/Customers/CreditLimitManagement.jsx`

**Features:**
- Display current credit limit information
- Form to set/update credit limit
- Bypass credit limit check toggle
- Remove credit limit button (only if limit_source === 'Customer')
- Real-time credit utilization display with color coding
- Over-limit warning banner

**UI Components:**
- Material-UI Card/Paper for summary section
- Form fields for credit limit input
- Progress bar or circular progress for utilization
- Color-coded status indicators (green/yellow/red)
- Alert banner for over-limit status

**Props:**
```javascript
{
  customer: string (required),
  company: string (required),
  onUpdate?: () => void (callback after successful update)
}
```

---

### Phase 3: Credit History Component
**Priority: Medium | Estimated Time: 3-4 hours**

#### 3.1 Create Credit History Component
**File:** `src/components/Customers/CreditHistory.jsx`

**Features:**
- Transaction table with pagination
- Date range filters (from_date, to_date)
- Transaction type badges (Sales Invoice, Payment Entry, Credit Note)
- Color-coded transaction amounts (positive/negative)
- Credit summary card (when company is provided)
- Export functionality (optional, future enhancement)

**UI Components:**
- Material-UI Table for transactions
- Date pickers for filtering
- Badges/chips for transaction types
- Summary cards for credit overview

**Props:**
```javascript
{
  customer: string (required),
  company?: string (optional),
  onClose?: () => void (if used in dialog)
}
```

---

### Phase 4: Integration with Customer List
**Priority: High | Estimated Time: 2-3 hours**

#### 4.1 Enhance Customer List Table
**File:** `src/pages/Customers/index.js`

**New Columns to Add:**
- Credit Limit (formatted with currency)
- Outstanding Amount
- Available Credit
- Utilization % (with progress bar)
- Status Badge (OK/Over Limit)

**Enhancements:**
- Color-code rows based on utilization (optional)
- Add "Credit Limit" action in menu
- Display credit info in view dialog
- Add credit limit quick view tooltip

**Data Source:**
- Use enhanced `list_customers` API response (already includes credit fields when company is provided)

---

### Phase 5: Integration with Customer Details
**Priority: Medium | Estimated Time: 2-3 hours**

#### 5.1 Enhance Customer View Dialog
**File:** `src/pages/Customers/index.js`

**Additions:**
- Credit Limits section showing all companies
- Credit summary cards for each company
- "Manage Credit Limit" button
- "View Credit History" button
- Integration with CreditLimitManagement component

**Display:**
- Show `credit_limits` array from `get_customer` API response
- Display limit source (Customer/Group/Company)
- Show bypass status
- Show over-limit status

---

### Phase 6: Standalone Credit Limit Page (Optional)
**Priority: Low | Estimated Time: 3-4 hours**

#### 6.1 Create Dedicated Credit Limit Management Page
**File:** `src/pages/Customers/CreditLimit.jsx` or `src/pages/Customers/CreditLimitManagement.jsx`

**Features:**
- Full-page credit limit management
- Customer search/select
- Company selector (if multi-company)
- Combined view of credit limit + history
- Bulk operations (future enhancement)

**Routing:**
- Add route: `/customers/credit-limit` or `/customers/:customerId/credit-limit`

---

## Component Structure

```
src/
├── components/
│   └── Customers/
│       ├── CreditLimitManagement.jsx    (Phase 2)
│       ├── CreditHistory.jsx            (Phase 3)
│       └── CreditUtilizationBar.jsx     (Reusable component)
├── pages/
│   └── Customers/
│       ├── index.js                      (Phase 4 - Enhanced)
│       └── CreditLimit.jsx              (Phase 6 - Optional)
└── store/
    └── customerSlice.js                  (Phase 1 - Enhanced)
```

---

## API Integration Details

### 1. Set Customer Credit Limit
- **Endpoint:** `savanna_pos.savanna_pos.apis.customer_api.set_customer_credit_limit`
- **Method:** POST
- **Required Fields:** `customer`, `company`, `credit_limit`
- **Optional Fields:** `bypass_credit_limit_check`
- **Response:** Includes updated credit info with utilization

### 2. Get Customer Credit Limit
- **Endpoint:** `savanna_pos.savanna_pos.apis.customer_api.get_customer_credit_limit`
- **Method:** GET or POST
- **Required Fields:** `customer`
- **Optional Fields:** `company` (if not provided, returns all companies)
- **Response:** Single company object or array of companies

### 3. Get Customer Credit History
- **Endpoint:** `savanna_pos.savanna_pos.apis.customer_api.get_customer_credit_history`
- **Method:** GET or POST
- **Required Fields:** `customer`
- **Optional Fields:** `company`, `from_date`, `to_date`, `limit`, `offset`
- **Response:** Array of transactions with pagination info

### 4. Remove Customer Credit Limit
- **Endpoint:** `savanna_pos.savanna_pos.apis.customer_api.remove_customer_credit_limit`
- **Method:** POST
- **Required Fields:** `customer`, `company`
- **Response:** Updated credit info (falls back to group/company limit)

---

## UI/UX Considerations

### Color Coding
- **Green:** Utilization < 50%, Available credit > 0
- **Yellow/Orange:** Utilization 50-80%
- **Red:** Utilization > 80% or Over Limit
- **Gray:** Unlimited credit (0 limit)

### User Feedback
- Success notifications on credit limit updates
- Error messages for validation failures
- Loading states during API calls
- Confirmation dialogs for destructive actions (remove credit limit)

### Accessibility
- Proper ARIA labels for form fields
- Keyboard navigation support
- Screen reader friendly status messages
- Color contrast compliance

### Responsive Design
- Mobile-friendly forms and tables
- Collapsible sections for smaller screens
- Touch-friendly buttons and controls

---

## Data Flow

### Setting Credit Limit
```
User Input → Form Validation → Redux Action → API Call → 
Response Processing → State Update → UI Refresh → Notification
```

### Viewing Credit History
```
Component Mount → Redux Action → API Call → 
Response Processing → State Update → Table Rendering
```

### Credit Limit Display in List
```
List Load → Enhanced API Call (with company) → 
Response includes credit fields → Table Display with Credit Columns
```

---

## Error Handling

### Validation Errors
- Negative credit limit → Show error message
- Missing required fields → Highlight fields
- Customer not found → Show error notification

### API Errors
- Network errors → Retry mechanism or error message
- 401 Unauthorized → Redirect to login (handled by interceptor)
- 404 Not Found → Show "Customer not found" message
- 500 Server Error → Show generic error with retry option

### Edge Cases
- Unlimited credit (0) → Display as "Unlimited"
- No transactions → Show empty state message
- Over limit → Highlight prominently with warning
- Multiple companies → Show per-company credit info

---

## Testing Considerations

### Unit Tests
- Redux thunks and reducers
- Component rendering
- Form validation
- Utility functions

### Integration Tests
- API call flows
- State management
- Component interactions

### E2E Tests (Future)
- Complete credit limit workflow
- Credit history viewing
- Error scenarios

---

## Implementation Checklist

### Phase 1: Redux State Management
- [ ] Add credit limit endpoints to ENDPOINTS
- [ ] Create `setCustomerCreditLimit` async thunk
- [ ] Create `getCustomerCreditLimit` async thunk
- [ ] Create `getCustomerCreditHistory` async thunk
- [ ] Create `removeCustomerCreditLimit` async thunk
- [ ] Add credit limit state to initial state
- [ ] Add loading states for credit operations
- [ ] Add error handling for credit operations
- [ ] Update reducers for credit limit actions

### Phase 2: Credit Limit Management Component
- [ ] Create `CreditLimitManagement.jsx` component
- [ ] Implement credit summary display
- [ ] Implement credit limit form
- [ ] Add bypass toggle functionality
- [ ] Add remove credit limit functionality
- [ ] Implement utilization display with color coding
- [ ] Add over-limit warning banner
- [ ] Add loading and error states
- [ ] Style component with Material-UI

### Phase 3: Credit History Component
- [ ] Create `CreditHistory.jsx` component
- [ ] Implement transaction table
- [ ] Add date range filters
- [ ] Implement pagination
- [ ] Add transaction type badges
- [ ] Add credit summary card
- [ ] Style component with Material-UI
- [ ] Add empty state handling

### Phase 4: Customer List Integration
- [ ] Add credit limit columns to table
- [ ] Update `listCustomers` to include company parameter
- [ ] Add credit limit data to table rows
- [ ] Add utilization progress bars
- [ ] Add status badges (OK/Over Limit)
- [ ] Add "Manage Credit Limit" to action menu
- [ ] Update view dialog with credit info
- [ ] Add color coding for high utilization

### Phase 5: Customer Details Integration
- [ ] Add credit limits section to view dialog
- [ ] Display credit limits for all companies
- [ ] Add "Manage Credit Limit" button
- [ ] Add "View Credit History" button
- [ ] Integrate CreditLimitManagement component
- [ ] Integrate CreditHistory component
- [ ] Update `getCustomer` to fetch credit limits

### Phase 6: Standalone Page (Optional)
- [ ] Create dedicated credit limit page
- [ ] Add route configuration
- [ ] Implement customer selection
- [ ] Implement company selection
- [ ] Combine credit limit + history views
- [ ] Add navigation from customer list

---

## Dependencies

### Existing Dependencies (Already Installed)
- `@reduxjs/toolkit` - State management
- `react-redux` - React bindings for Redux
- `@mui/material` - UI components
- `axios` - HTTP client
- `react-hook-form` - Form handling

### No New Dependencies Required
All required packages are already available in the project.

---

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading:** Load credit history only when requested
2. **Caching:** Cache credit limit data in Redux state
3. **Pagination:** Implement proper pagination for credit history
4. **Debouncing:** Debounce search/filter inputs
5. **Memoization:** Use React.memo for expensive components

### API Call Optimization
- Batch credit limit requests when possible
- Use GET for read operations (lighter than POST)
- Implement request cancellation for unmounted components

---

## Security Considerations

### Data Validation
- Validate credit limit values on frontend (>= 0)
- Sanitize user inputs
- Validate date ranges for history queries

### Authorization
- Credit limit APIs require authentication (handled by interceptor)
- Ensure user has permissions to manage credit limits
- Validate company access before displaying credit info

---

## Future Enhancements

### Phase 7: Advanced Features (Future)
- [ ] Credit limit alerts/notifications
- [ ] Credit limit approval workflow
- [ ] Bulk credit limit updates
- [ ] Credit limit templates
- [ ] Credit limit reports and analytics
- [ ] Export credit history to CSV/PDF
- [ ] Credit limit change history/audit log
- [ ] Credit limit forecasting

---

## Timeline Estimate

| Phase | Priority | Estimated Time | Dependencies |
|-------|----------|----------------|--------------|
| Phase 1 | High | 2-3 hours | None |
| Phase 2 | High | 4-5 hours | Phase 1 |
| Phase 3 | Medium | 3-4 hours | Phase 1 |
| Phase 4 | High | 2-3 hours | Phase 1, Phase 2 |
| Phase 5 | Medium | 2-3 hours | Phase 1, Phase 2, Phase 3 |
| Phase 6 | Low | 3-4 hours | Phase 1-5 |

**Total Estimated Time:** 16-22 hours (excluding Phase 6)

---

## Notes

1. **API Response Format:** The API returns `{ success: true, data: {...} }` format. Ensure proper data extraction in Redux thunks.

2. **Company Parameter:** Most credit limit operations require a `company` parameter. Extract from user profile in Redux state.

3. **Credit Limit Hierarchy:** Display the source of credit limit (Customer/Group/Company) to help users understand where limits come from.

4. **Unlimited Credit:** A credit limit of `0` means unlimited. Handle this case in UI appropriately.

5. **Real-time Updates:** Consider implementing real-time updates or refresh mechanisms for credit limit changes.

6. **Error Messages:** Use user-friendly error messages from API responses or provide fallback messages.

---

## Getting Started

1. Start with **Phase 1** to establish the foundation
2. Implement **Phase 2** for the core credit limit management UI
3. Add **Phase 3** for credit history viewing
4. Integrate with existing pages in **Phase 4** and **Phase 5**
5. Optionally add **Phase 6** for a dedicated page

Each phase builds upon the previous one, ensuring a systematic and testable implementation approach.

