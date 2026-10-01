# Loyalty Program Implementation Plan

## Overview

This document outlines the implementation plan for integrating Loyalty Program features into the SavvyPOS frontend application, based on the `LOYALTY_API_DOCUMENTATION.md` provided.

## Current State Analysis

### Existing Implementation
- ✅ Customer listing page (`src/pages/Customers/index.js`)
- ✅ Customer Redux slice (`src/store/customerSlice.js`)
- ✅ Basic customer CRUD operations
- ✅ Customer detail view dialog
- ✅ Material-UI components and theming
- ✅ Redux Toolkit for state management
- ✅ Axios instance with authentication interceptors
- ✅ Notification system
- ✅ Sales/Checkout flow (`src/pages/Sales/NewSale.js`)

### Missing Features
- ❌ Loyalty program management APIs
- ❌ Loyalty program Redux slice
- ❌ Loyalty balance display
- ❌ Points earning during checkout
- ❌ Points redemption functionality
- ❌ Points history viewing
- ❌ Loyalty program assignment UI
- ❌ Loyalty dashboard components

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `create_loyalty_program` | POST | No (recommended: Yes) | Create new loyalty program |
| `assign_loyalty_program` | POST | No | Assign program to customer |
| `earn_loyalty_points` | POST | **Yes** | Award points after purchase |
| `get_loyalty_balance` | GET/POST | No | Get customer's balance & recent transactions |
| `redeem_points` | POST | No | Redeem points for rewards |
| `get_points_history` | GET/POST | No | Get detailed transaction history with filters |

---

## Implementation Phases

### Phase 1: Redux State Management (Foundation)
**Priority: High | Estimated Time: 3-4 hours**

#### 1.1 Create `loyaltySlice.js`
**File:** `src/store/loyaltySlice.js`

**New Endpoints to Add:**
```javascript
const ENDPOINTS = {
  createLoyaltyProgram: 'techsavanna_pos.api.loyalty.create_loyalty_program',
  assignLoyaltyProgram: 'techsavanna_pos.api.loyalty.assign_loyalty_program',
  earnLoyaltyPoints: 'techsavanna_pos.api.loyalty.earn_loyalty_points',
  getLoyaltyBalance: 'techsavanna_pos.api.loyalty.get_loyalty_balance',
  redeemPoints: 'techsavanna_pos.api.loyalty.redeem_points',
  getPointsHistory: 'techsavanna_pos.api.loyalty.get_points_history',
};
```

**New Async Thunks:**
1. `createLoyaltyProgram` - Create new loyalty program
2. `assignLoyaltyProgram` - Assign program to customer
3. `earnLoyaltyPoints` - Award points (requires auth)
4. `getLoyaltyBalance` - Fetch balance and recent transactions
5. `redeemPoints` - Redeem customer points
6. `getPointsHistory` - Fetch detailed transaction history

**State Structure:**
```javascript
{
  // Loyalty Programs
  programs: [],
  isLoadingPrograms: false,
  
  // Customer Balance
  balance: null,
  isLoadingBalance: false,
  
  // Transaction History
  history: [],
  historyPagination: {
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  },
  historyFilters: {
    startDate: null,
    endDate: null,
    transactionType: null,
  },
  isLoadingHistory: false,
  
  // Operations
  isEarningPoints: false,
  isRedeemingPoints: false,
  isAssigningProgram: false,
  
  // Errors
  error: null,
}
```

**Key Considerations:**
- Handle authentication for `earnLoyaltyPoints` (add to interceptor's authenticated endpoints)
- Support both GET and POST for `getLoyaltyBalance` and `getPointsHistory`
- Extract data from nested `response.data.message` structure
- Handle debug arrays in responses (useful for development)
- Implement proper error handling with user-friendly messages

**Files to Create:**
- `src/store/loyaltySlice.js`

---

### Phase 2: Custom Hook for Loyalty Operations
**Priority: High | Estimated Time: 2-3 hours**

#### 2.1 Create `useLoyalty.js` Hook
**File:** `src/hooks/useLoyalty.js`

**Features:**
- Convenience methods wrapping Redux actions
- Loading and error state management
- Customer ID parameter handling
- Auto-fetch balance on mount (optional)
- Refetch capabilities

**Hook Interface:**
```javascript
const {
  // State
  balance,
  history,
  loading,
  error,
  
  // Actions
  createProgram,
  assignProgram,
  earnPoints,
  getBalance,
  redeemPoints,
  getHistory,
  refetchBalance,
  refetchHistory,
} = useLoyalty({
  customerId: string,
  autoFetchBalance?: boolean,
  autoFetchHistory?: boolean,
});
```

**Files to Create:**
- `src/hooks/useLoyalty.js`

---

### Phase 3: Loyalty Balance Component
**Priority: High | Estimated Time: 3-4 hours**

#### 3.1 Create Loyalty Balance Display Component
**File:** `src/components/Customers/LoyaltyBalance.jsx`

**Features:**
- Display current points balance prominently
- Show recent transactions (last 5 by default)
- Visual points indicator (badge, card, or card design)
- Empty state when no program assigned
- Loading states
- Refresh button

**UI Components:**
- Material-UI Card for balance summary
- List/Table for recent transactions
- Badges for transaction types (Earn/Redeem)
- Date formatting
- Empty state message

**Props:**
```javascript
{
  customerId: string (required),
  onRefresh?: () => void,
  showRecentTransactions?: boolean (default: true),
  limit?: number (default: 5)
}
```

---

### Phase 4: Points History Component
**Priority: Medium | Estimated Time: 4-5 hours**

#### 4.1 Create Points History Component
**File:** `src/components/Customers/LoyaltyHistory.jsx`

**Features:**
- Transaction table with pagination
- Date range filters (start_date, end_date)
- Transaction type filter (earn, redeem, expire, adjust)
- Pagination controls
- Export functionality (optional, future enhancement)
- Detailed transaction information

**UI Components:**
- Material-UI Table for transactions
- Date pickers for filtering
- Select dropdown for transaction type
- Pagination component
- Filter chips/badges
- Empty state handling

**Props:**
```javascript
{
  customerId: string (required),
  onClose?: () => void (if used in dialog),
  defaultFilters?: {
    startDate?: string,
    endDate?: string,
    transactionType?: string,
  }
}
```

---

### Phase 5: Points Redemption Component
**Priority: High | Estimated Time: 3-4 hours**

#### 5.1 Create Points Redemption Dialog/Form
**File:** `src/components/Customers/RedeemPoints.jsx`

**Features:**
- Points input field with validation
- Current balance display
- Available points check
- Reference document input (optional)
- Confirmation before redemption
- Success/error handling
- Refresh balance after redemption

**UI Components:**
- Dialog/Modal wrapper
- Form with react-hook-form
- Input field with helper text
- Balance display
- Action buttons
- Error message display

**Props:**
```javascript
{
  customerId: string (required),
  currentBalance: number (required),
  open: boolean (required),
  onClose: () => void (required),
  onSuccess?: () => void (callback after successful redemption)
}
```

---

### Phase 6: Loyalty Program Management Components
**Priority: Medium | Estimated Time: 5-6 hours**

#### 6.1 Create Loyalty Program List Page
**File:** `src/pages/Settings/LoyaltyPrograms.jsx`

**Features:**
- List all loyalty programs
- Create new program dialog
- Program details (points per unit, type, active status)
- Edit program (if supported by API)
- Activate/Deactivate toggle

#### 6.2 Create Program Assignment Component
**File:** `src/components/Customers/AssignLoyaltyProgram.jsx`

**Features:**
- Program selector dropdown
- List of available programs
- Assign program to customer
- Show currently assigned program
- Unassign option (if supported)

**UI Components:**
- Dialog/Modal
- Select dropdown with search
- Program cards/list
- Current assignment indicator

**Props:**
```javascript
{
  customerId: string (required),
  currentProgram?: string (optional),
  open: boolean (required),
  onClose: () => void (required),
  onSuccess?: () => void
}
```

---

### Phase 7: Integration with Customer Pages
**Priority: High | Estimated Time: 3-4 hours**

#### 7.1 Enhance Customer List Page
**File:** `src/pages/Customers/index.js`

**Additions:**
- Loyalty balance column (optional, can be hidden)
- Loyalty program column
- "View Loyalty" action in menu
- Quick balance display in customer card

#### 7.2 Enhance Customer Details Dialog
**File:** `src/pages/Customers/index.js` (view dialog)

**Additions:**
- Loyalty section/tab
- Display current balance
- Display assigned program
- "View History" button
- "Redeem Points" button
- "Assign Program" button (if admin)
- Integration with LoyaltyBalance, LoyaltyHistory, RedeemPoints components

---

### Phase 8: Integration with Sales/Checkout Flow
**Priority: High | Estimated Time: 4-5 hours**

#### 8.1 Integrate Points Earning in Checkout
**File:** `src/pages/Sales/NewSale.js`

**Additions:**
- Earn points after successful sale completion
- Display points earned notification
- Show customer's current balance in checkout
- Toggle to enable/disable points earning (if needed)
- Handle cases where customer has no program assigned

**Implementation Details:**
- Call `earnLoyaltyPoints` after invoice creation (in success callback)
- Only call if customer is selected and not "Walk-in Customer"
- Display success notification with points earned
- Handle errors gracefully (don't block checkout if points earning fails)

**Flow:**
```
Sale Completion → Invoice Created → 
Check if customer has loyalty program → 
Calculate points → Earn points → 
Show notification → Update balance display
```

---

### Phase 9: Loyalty Dashboard Page (Optional)
**Priority: Low | Estimated Time: 5-6 hours**

#### 9.1 Create Dedicated Loyalty Dashboard
**File:** `src/pages/Settings/LoyaltyDashboard.jsx` or `src/pages/Customers/LoyaltyDashboard.jsx`

**Features:**
- Customer search/selection
- Combined view of balance + history
- Points summary statistics
- Top customers by points (if API supports)
- Recent activity feed
- Quick actions (assign, redeem, view history)

**Routing:**
- Add route: `/settings/loyalty` or `/customers/loyalty`

---

## Component Structure

```
src/
├── components/
│   └── Customers/
│       ├── LoyaltyBalance.jsx          (Phase 3)
│       ├── LoyaltyHistory.jsx          (Phase 4)
│       ├── RedeemPoints.jsx            (Phase 5)
│       └── AssignLoyaltyProgram.jsx    (Phase 6.2)
├── pages/
│   ├── Customers/
│   │   ├── index.js                     (Phase 7 - Enhanced)
│   │   └── LoyaltyDashboard.jsx        (Phase 9 - Optional)
│   └── Settings/
│       └── LoyaltyPrograms.jsx         (Phase 6.1)
├── store/
│   └── loyaltySlice.js                  (Phase 1)
└── hooks/
    └── useLoyalty.js                    (Phase 2)
```

---

## API Integration Details

### 1. Create Loyalty Program
- **Endpoint:** `techsavanna_pos.api.loyalty.create_loyalty_program`
- **Method:** POST
- **Required Fields:** `loyalty_program_name`, `points_per_unit`, `program_type`
- **Optional Fields:** `active`, `tier_name`
- **Response:** `{ status: "success", loyalty_program: {...} }`
- **Note:** Add to interceptor's authenticated endpoints for production

### 2. Assign Loyalty Program
- **Endpoint:** `techsavanna_pos.api.loyalty.assign_loyalty_program`
- **Method:** POST
- **Required Fields:** `customer_id`, `loyalty_program_name`
- **Response:** `{ status: "success", customer: {...} }`
- **Note:** Guest access allowed

### 3. Earn Loyalty Points
- **Endpoint:** `techsavanna_pos.api.loyalty.earn_loyalty_points`
- **Method:** POST
- **Authentication:** **Required** (`allow_guest=False`)
- **Required Fields:** `customer_id`, `purchase_amount`
- **Response:** `{ status: "success", points_earned: number, total_points: number }`
- **Note:** Must add to axios interceptor's authenticated endpoints list
- **Points Calculation:** `purchase_amount / collection_factor` (integer division)

### 4. Get Loyalty Balance
- **Endpoint:** `techsavanna_pos.api.loyalty.get_loyalty_balance`
- **Method:** GET or POST
- **Required Fields:** `customer_id`
- **Optional Fields:** `limit` (default: 5)
- **Response:** `{ status: "success", points_balance: number, recent_transactions: [...] }`
- **Note:** Support both GET and POST methods

### 5. Redeem Points
- **Endpoint:** `techsavanna_pos.api.loyalty.redeem_points`
- **Method:** POST
- **Required Fields:** `customer_id`, `points_to_redeem`
- **Optional Fields:** `reference_document`
- **Response:** `{ status: "success", redeemed_points: number, remaining_points: number }`
- **Validation:** Must check balance before allowing redemption

### 6. Get Points History
- **Endpoint:** `techsavanna_pos.api.loyalty.get_points_history`
- **Method:** GET or POST
- **Required Fields:** `customer_id`
- **Optional Fields:** `start_date`, `end_date`, `transaction_type`, `limit`, `page`
- **Response:** `{ status: "success", transactions: [...], pagination: {...} }`
- **Note:** Support both GET and POST, implement pagination

---

## UI/UX Considerations

### Design Guidelines
- **Points Display:** Use large, prominent numbers for balance
- **Color Coding:**
  - Green: Positive transactions (Earn)
  - Red/Orange: Negative transactions (Redeem)
  - Neutral: Adjust/Expire transactions
- **Visual Hierarchy:** Balance > Recent Transactions > Full History
- **Loading States:** Skeleton loaders or spinners for all async operations
- **Empty States:** Friendly messages when no program/data available

### User Feedback
- Success notifications on points earned/redeemed
- Error messages for validation failures (insufficient points, etc.)
- Loading states during API calls
- Confirmation dialogs for redemption actions
- Clear error messages from API responses

### Accessibility
- Proper ARIA labels for form fields
- Keyboard navigation support
- Screen reader friendly status messages
- Color contrast compliance
- Semantic HTML structure

### Responsive Design
- Mobile-friendly forms and tables
- Collapsible sections for smaller screens
- Touch-friendly buttons and controls
- Responsive table layouts (scroll on mobile)

---

## Data Flow

### Earning Points (Checkout Flow)
```
User completes sale → Invoice created → 
Check customer has program → 
Calculate points (purchase_amount / collection_factor) → 
API call earnLoyaltyPoints → 
Success: Update balance, show notification → 
Error: Log error, show notification (don't block checkout)
```

### Viewing Balance
```
Component Mount → Redux Action → API Call → 
Response Processing → State Update → UI Rendering
```

### Redeeming Points
```
User enters points → Validation (check balance) → 
API Call redeemPoints → 
Success: Update balance, show notification, refresh history → 
Error: Show error message
```

### Viewing History
```
Component Mount/Filter Change → Redux Action → API Call → 
Response Processing → State Update → Table Rendering with Pagination
```

---

## Error Handling

### Validation Errors
- Negative points redemption → Show error message
- Insufficient points → Show available points and error
- Missing required fields → Highlight fields
- Invalid date range → Show validation message
- Customer not found → Show error notification

### API Errors
- Network errors → Retry mechanism or error message
- 401 Unauthorized → Redirect to login (handled by interceptor)
- 404 Not Found → Show "Customer/Program not found" message
- 500 Server Error → Show generic error with retry option

### Edge Cases
- No loyalty program assigned → Show "No program assigned" message
- Zero balance → Allow redemption attempt (will fail with proper message)
- No transactions → Show empty state message
- Invalid transaction type filter → Handle gracefully
- Pagination edge cases → Handle last page, empty results

---

## Authentication Considerations

### Update Axios Interceptor
**File:** `src/api/axiosInstance.js`

Add loyalty endpoints that require authentication:
```javascript
const publicEndpoints = [
  // ... existing endpoints
  // Note: earn_loyalty_points requires authentication
  // Other loyalty endpoints allow guest access but may need auth in production
];
```

**Important:** `earn_loyalty_points` requires authentication. Ensure it's NOT in the publicEndpoints array.

---

## Testing Considerations

### Unit Tests
- Redux thunks and reducers
- Component rendering
- Form validation
- Utility functions (points calculation)
- Hook behavior

### Integration Tests
- API call flows
- State management
- Component interactions
- Error scenarios

### E2E Tests (Future)
- Complete loyalty workflow (assign → earn → redeem → view history)
- Checkout integration with points earning
- Error scenarios
- Pagination and filtering

---

## Implementation Checklist

### Phase 1: Redux State Management
- [ ] Create `loyaltySlice.js`
- [ ] Add all 6 endpoint constants
- [ ] Create `createLoyaltyProgram` async thunk
- [ ] Create `assignLoyaltyProgram` async thunk
- [ ] Create `earnLoyaltyPoints` async thunk (with auth)
- [ ] Create `getLoyaltyBalance` async thunk (support GET & POST)
- [ ] Create `redeemPoints` async thunk
- [ ] Create `getPointsHistory` async thunk (support GET & POST, pagination)
- [ ] Add initial state structure
- [ ] Add loading states for all operations
- [ ] Add error handling
- [ ] Implement reducers for all actions
- [ ] Add helper functions for response extraction
- [ ] Update axios interceptor for `earnLoyaltyPoints` authentication

### Phase 2: Custom Hook
- [ ] Create `useLoyalty.js` hook
- [ ] Implement convenience methods for all operations
- [ ] Add loading and error state management
- [ ] Implement auto-fetch options
- [ ] Add refetch capabilities
- [ ] Add proper TypeScript/JSDoc documentation

### Phase 3: Loyalty Balance Component
- [ ] Create `LoyaltyBalance.jsx` component
- [ ] Implement balance display
- [ ] Implement recent transactions list
- [ ] Add loading states
- [ ] Add empty state handling
- [ ] Add refresh functionality
- [ ] Style with Material-UI
- [ ] Add transaction type badges

### Phase 4: Points History Component
- [ ] Create `LoyaltyHistory.jsx` component
- [ ] Implement transaction table
- [ ] Add date range filters
- [ ] Add transaction type filter
- [ ] Implement pagination
- [ ] Add empty state handling
- [ ] Style with Material-UI
- [ ] Add export functionality (optional)

### Phase 5: Points Redemption Component
- [ ] Create `RedeemPoints.jsx` component
- [ ] Implement points input form
- [ ] Add balance validation
- [ ] Add reference document input
- [ ] Implement confirmation flow
- [ ] Add success/error handling
- [ ] Style with Material-UI

### Phase 6: Loyalty Program Management
- [ ] Create `LoyaltyPrograms.jsx` page
- [ ] Implement program list display
- [ ] Create program creation dialog
- [ ] Add program details display
- [ ] Create `AssignLoyaltyProgram.jsx` component
- [ ] Implement program assignment flow
- [ ] Add route for programs page

### Phase 7: Customer Page Integration
- [ ] Add loyalty balance column to customer list (optional)
- [ ] Add loyalty section to customer details dialog
- [ ] Integrate LoyaltyBalance component
- [ ] Integrate LoyaltyHistory component
- [ ] Integrate RedeemPoints component
- [ ] Integrate AssignLoyaltyProgram component
- [ ] Add "View Loyalty" action in customer menu

### Phase 8: Checkout Integration
- [ ] Add points earning to checkout flow
- [ ] Display customer balance in checkout
- [ ] Call `earnLoyaltyPoints` after invoice creation
- [ ] Show points earned notification
- [ ] Handle errors gracefully (don't block checkout)
- [ ] Add toggle to enable/disable earning (if needed)

### Phase 9: Loyalty Dashboard (Optional)
- [ ] Create dedicated loyalty dashboard page
- [ ] Implement customer search/selection
- [ ] Combine balance + history views
- [ ] Add statistics/summary cards
- [ ] Add route configuration
- [ ] Add navigation links

---

## Dependencies

### Existing Dependencies (Already Installed)
- `@reduxjs/toolkit` - State management
- `react-redux` - React bindings for Redux
- `@mui/material` - UI components
- `axios` - HTTP client
- `react-hook-form` - Form handling
- `@mui/icons-material` - Icons
- `date-fns` or similar (if needed for date formatting)

### No New Dependencies Required
All required packages are already available in the project.

---

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading:** Load history only when requested
2. **Caching:** Cache balance data in Redux state
3. **Pagination:** Implement proper pagination for history
4. **Debouncing:** Debounce filter inputs
5. **Memoization:** Use React.memo for expensive components
6. **Selective Updates:** Only refresh balance when needed

### API Call Optimization
- Use GET for read operations when possible (lighter than POST)
- Implement request cancellation for unmounted components
- Batch operations when possible
- Cache program list (rarely changes)

---

## Security Considerations

### Data Validation
- Validate points redemption amount (positive integer, <= balance)
- Sanitize user inputs
- Validate date ranges for history queries
- Validate customer IDs before API calls

### Authorization
- `earnLoyaltyPoints` requires authentication (handled by interceptor)
- Consider adding permission checks for program management
- Validate customer access before displaying loyalty data

---

## Future Enhancements

### Phase 10: Advanced Features (Future)
- [ ] Points expiration tracking and notifications
- [ ] Tier-based loyalty programs
- [ ] Points conversion to currency/discounts
- [ ] Loyalty program analytics and reports
- [ ] Bulk program assignment
- [ ] Points adjustment/admin override
- [ ] Loyalty program templates
- [ ] Customer loyalty program comparison
- [ ] Export loyalty data to CSV/PDF
- [ ] Points forecasting/predictions
- [ ] Integration with marketing campaigns

---

## Timeline Estimate

| Phase | Priority | Estimated Time | Dependencies |
|-------|----------|----------------|--------------|
| Phase 1 | High | 3-4 hours | None |
| Phase 2 | High | 2-3 hours | Phase 1 |
| Phase 3 | High | 3-4 hours | Phase 1, Phase 2 |
| Phase 4 | Medium | 4-5 hours | Phase 1, Phase 2 |
| Phase 5 | High | 3-4 hours | Phase 1, Phase 2 |
| Phase 6 | Medium | 5-6 hours | Phase 1, Phase 2 |
| Phase 7 | High | 3-4 hours | Phase 1-5 |
| Phase 8 | High | 4-5 hours | Phase 1, Phase 2, Phase 7 |
| Phase 9 | Low | 5-6 hours | Phase 1-7 |

**Total Estimated Time:** 32-41 hours (excluding Phase 9)

---

## Notes

1. **API Response Format:** The API returns `{ status: "success|failure", message: "...", ... }` format. Ensure proper data extraction in Redux thunks.

2. **Points Calculation:** Points use integer division. Example: purchase_amount=25, collection_factor=10 → 2 points (not 2.5).

3. **Balance Calculation:** The balance is calculated from the `Loyalty Transaction Log` ledger. The `customer.loyalty_points` field is cached and should not be the primary source of truth.

4. **Authentication:** `earn_loyalty_points` requires authentication. Update axios interceptor accordingly.

5. **Guest Access:** Most endpoints allow guest access, but production should consider requiring authentication for security.

6. **Debug Messages:** The `debug` array in responses contains detailed information. Consider hiding these in production UIs or showing only in development mode.

7. **Date Format:** All dates should be in `YYYY-MM-DD` format when passed as parameters.

8. **Transaction Types:** Supported types are "Earn", "Redeem", "Expire", "Adjust".

9. **Pagination:** The `get_points_history` endpoint supports pagination. Use the `pagination` object in the response to implement pagination controls.

10. **Error Handling:** Always check `status === "failure"` in responses and display appropriate error messages to users.

---

## Getting Started

1. Start with **Phase 1** to establish the Redux foundation
2. Implement **Phase 2** for convenient hook-based access
3. Build **Phase 3, 4, 5** for core UI components
4. Add **Phase 6** for program management
5. Integrate with existing pages in **Phase 7**
6. Add checkout integration in **Phase 8**
7. Optionally add **Phase 9** for a dedicated dashboard

Each phase builds upon the previous one, ensuring a systematic and testable implementation approach.

---

## Key Implementation Priorities

### Must-Have (MVP)
1. Phase 1: Redux state management
2. Phase 2: Custom hook
3. Phase 3: Balance display
4. Phase 5: Points redemption
5. Phase 7: Customer page integration
6. Phase 8: Checkout integration (points earning)

### Should-Have
1. Phase 4: Points history
2. Phase 6: Program management

### Nice-to-Have
1. Phase 9: Loyalty dashboard

---

## Success Criteria

- ✅ Users can view their loyalty points balance
- ✅ Points are automatically earned after purchase completion
- ✅ Users can redeem points with proper validation
- ✅ Transaction history is viewable with filtering and pagination
- ✅ Loyalty programs can be created and assigned to customers
- ✅ All API endpoints are properly integrated
- ✅ Error handling is comprehensive and user-friendly
- ✅ UI/UX is consistent with existing application design
- ✅ Performance is optimized (loading states, caching, pagination)

