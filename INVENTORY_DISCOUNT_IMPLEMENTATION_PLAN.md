# Inventory Discount API Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for integrating the Inventory Discount API into the Savanna POS frontend application.

## Architecture Analysis

### Current Stack
- **State Management**: Redux Toolkit with `createSlice` and `createAsyncThunk`
- **API Client**: `axiosInstance` from `src/api/axiosInstance.js`
- **Pattern**: Consistent slice pattern with helper functions for response extraction
- **Notification System**: Integrated via `notificationSlice`
- **Routing**: React Router with protected routes

### Integration Points
1. **Sales Flow**: `NewSale.js`, `POS.js` - Apply discounts during invoice creation
2. **Product Management**: Product listing pages - Display applicable discounts
3. **Settings/Configuration**: New page for managing discount rules
4. **Inventory Management**: Show discounts in inventory views

---

## Phase 1: Core Redux Integration

### 1.1 Create Inventory Discount Slice
**File**: `src/store/inventoryDiscountSlice.js`

**Tasks**:
- [ ] Create Redux slice following existing patterns (`warehouseSlice.js`, `salesSlice.js`)
- [ ] Define all 7 async thunks for API endpoints
- [ ] Implement helper functions (`extractResponseData`, `extractErrorMessage`, `extractSuccessMessage`)
- [ ] Set up initial state with loading states, pagination, filters
- [ ] Implement reducers for all async actions
- [ ] Export actions and reducer

**Key Features**:
```javascript
// Endpoints to implement
- createInventoryDiscountRule
- updateInventoryDiscountRule
- deleteInventoryDiscountRule
- getInventoryDiscountRule
- listInventoryDiscountRules
- getInventoryDiscountForItem
- bulkGetInventoryDiscounts
```

**State Structure**:
```javascript
{
  rules: [],
  selectedRule: null,
  itemDiscounts: {}, // Cache for item-level discounts
  bulkDiscounts: [], // Results from bulk fetch
  pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
  filters: {
    rule_type: '',
    company: '',
    item_code: '',
    batch_no: '',
    item_group: '',
    warehouse: '',
    is_active: null,
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingBulk: false,
  error: null,
}
```

### 1.2 Register Slice in Store
**File**: `src/store/store.js`

**Tasks**:
- [ ] Import `inventoryDiscountReducer`
- [ ] Add to store configuration as `inventoryDiscount`

---

## Phase 2: Custom Hooks & Utilities

### 2.1 Create Custom Hook for Discount Lookup
**File**: `src/hooks/useInventoryDiscounts.js`

**Tasks**:
- [ ] Create `useInventoryDiscounts` hook (similar to API docs example)
- [ ] Support bulk discount fetching
- [ ] Handle loading and error states
- [ ] Implement caching/memoization for performance
- [ ] Auto-refetch on dependency changes

**Features**:
- Accept `items`, `company`, `warehouse`, `posting_date`
- Return `{ discounts, loading, error, refetch }`
- Use `bulkGetInventoryDiscounts` for multiple items

### 2.2 Create Hook for Single Item Discount
**File**: `src/hooks/useItemDiscount.js`

**Tasks**:
- [ ] Create hook for single item discount lookup
- [ ] Use `getInventoryDiscountForItem` API
- [ ] Cache results to avoid redundant API calls
- [ ] Return discount rule or null

### 2.3 Create Discount Calculation Utility
**File**: `src/utils/discountCalculator.js`

**Tasks**:
- [ ] Create utility functions for discount calculations
- [ ] `calculateDiscountAmount(price, discountRule)` - Calculate discount from rule
- [ ] `formatDiscountDisplay(discountRule)` - Format for UI display
- [ ] `getBestDiscountRule(rules)` - Select best rule based on priority

---

## Phase 3: UI Components

### 3.1 Discount Rules Management Page
**File**: `src/pages/Settings/InventoryDiscounts.js` (or `src/pages/Inventory/DiscountRules.js`)

**Tasks**:
- [ ] Create main listing page with table/grid
- [ ] Implement filters (rule_type, company, item_code, etc.)
- [ ] Add pagination controls
- [ ] Create/Edit/Delete actions
- [ ] Show rule details (priority, dates, warehouse, etc.)
- [ ] Status toggle (active/inactive)
- [ ] Date range validation display

**Components Needed**:
- `DiscountRulesList.jsx` - Main listing component
- `DiscountRuleForm.jsx` - Create/Edit form
- `DiscountRuleDetails.jsx` - View details modal/page
- `DiscountRuleFilters.jsx` - Filter component

**Form Fields**:
- Rule Type (Batch/Item/Item Group) - Radio/Select
- Conditional fields based on rule type
- Company (auto-filled from user)
- Discount Type (Percentage/Amount)
- Discount Value
- Priority (default: 10)
- Warehouse (optional)
- Valid From/To dates
- Description
- Active toggle

### 3.2 Discount Display Components
**File**: `src/components/Inventory/DiscountBadge.jsx`

**Tasks**:
- [ ] Create badge component to display discount
- [ ] Show percentage or amount
- [ ] Color coding (e.g., green for active discounts)
- [ ] Tooltip with rule details

**File**: `src/components/Inventory/DiscountInfo.jsx`

**Tasks**:
- [ ] Create info component showing discount details
- [ ] Display rule type, value, priority
- [ ] Show date validity
- [ ] Warehouse information

### 3.3 Product List Integration
**Files**: `src/pages/Products/index.js`, Product cards/components

**Tasks**:
- [ ] Integrate discount display in product listings
- [ ] Use `useInventoryDiscounts` hook to fetch discounts
- [ ] Show discount badges on product cards
- [ ] Update when discounts change

---

## Phase 4: Sales Flow Integration

### 4.1 NewSale.js Integration
**File**: `src/pages/Sales/NewSale.js`

**Tasks**:
- [ ] Import discount hooks and utilities
- [ ] Fetch discounts when items are added to cart
- [ ] Display applicable discounts in cart items
- [ ] Allow manual discount override (if POS profile allows)
- [ ] Pass discount info to invoice creation (or omit for auto-apply)
- [ ] Show discount summary in totals section

**Key Changes**:
```javascript
// When adding item to cart
- Fetch discount using useItemDiscount or bulkGetInventoryDiscounts
- Store discount info with cart item
- Display discount in item row
- Calculate discounted price

// When creating invoice
- Include discount_percentage/discount_amount if manually set
- Omit discount fields to let backend auto-apply rules
```

### 4.2 POS.js Integration
**File**: `src/pages/Sales/POS.js`

**Tasks**:
- [ ] Similar integration as NewSale.js
- [ ] Real-time discount display as items are scanned/added
- [ ] Show discount in cart summary
- [ ] Handle bulk discount fetching for product grid

### 4.3 Invoice Details Display
**Files**: `src/pages/Sales/SalesInvoiceDetails.js`, `src/pages/Sales/NewSalesInvoice.js`

**Tasks**:
- [ ] Display applied discounts in invoice details
- [ ] Show which rule was applied (if available from backend)
- [ ] Display discount breakdown

---

## Phase 5: Advanced Features

### 5.1 Discount Preview in Product Selection
**Tasks**:
- [ ] Show discount preview when hovering/selecting products
- [ ] Display applicable discount before adding to cart
- [ ] Use `getInventoryDiscountForItem` for quick lookups

### 5.2 Bulk Discount Management
**Tasks**:
- [ ] Create bulk import/export for discount rules
- [ ] Bulk activate/deactivate rules
- [ ] Bulk delete functionality

### 5.3 Discount Analytics/Reporting
**Tasks**:
- [ ] Track discount usage (if backend provides)
- [ ] Show discount impact on sales
- [ ] Report on active/past discounts

### 5.4 Discount Validation
**Tasks**:
- [ ] Client-side validation for discount rules
- [ ] Date range validation
- [ ] Percentage range validation (0-100)
- [ ] Priority conflict warnings

---

## Phase 6: Performance Optimization

### 6.1 Caching Strategy
**Tasks**:
- [ ] Implement caching for discount lookups
- [ ] Cache bulk discount results
- [ ] Invalidate cache on rule updates
- [ ] Use Redux state for caching

### 6.2 Batch Operations
**Tasks**:
- [ ] Batch discount lookups for product lists
- [ ] Debounce discount fetching during cart updates
- [ ] Pre-fetch discounts for visible products

### 6.3 Memoization
**Tasks**:
- [ ] Memoize discount calculations
- [ ] Memoize filtered rule lists
- [ ] Use React.memo for discount display components

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. ✅ Create `inventoryDiscountSlice.js` (Phase 1.1)
2. ✅ Register slice in store (Phase 1.2)
3. ✅ Create custom hooks (Phase 2.1, 2.2)
4. ✅ Create utility functions (Phase 2.3)

### Week 2: Management UI
5. ✅ Create discount rules management page (Phase 3.1)
6. ✅ Implement CRUD operations
7. ✅ Add routing for discount management

### Week 3: Display Components
8. ✅ Create discount display components (Phase 3.2)
9. ✅ Integrate into product listings (Phase 3.3)

### Week 4: Sales Integration
10. ✅ Integrate into NewSale.js (Phase 4.1)
11. ✅ Integrate into POS.js (Phase 4.2)
12. ✅ Update invoice details display (Phase 4.3)

### Week 5: Polish & Optimization
13. ✅ Add advanced features (Phase 5)
14. ✅ Performance optimization (Phase 6)
15. ✅ Testing and bug fixes

---

## File Structure

```
src/
├── store/
│   └── inventoryDiscountSlice.js          [NEW]
├── hooks/
│   ├── useInventoryDiscounts.js          [NEW]
│   └── useItemDiscount.js                [NEW]
├── utils/
│   └── discountCalculator.js              [NEW]
├── components/
│   └── Inventory/
│       ├── DiscountBadge.jsx              [NEW]
│       ├── DiscountInfo.jsx               [NEW]
│       └── DiscountRuleForm.jsx           [NEW]
├── pages/
│   ├── Settings/
│   │   └── InventoryDiscounts.js          [NEW]
│   └── Sales/
│       ├── NewSale.js                      [MODIFY]
│       └── POS.js                          [MODIFY]
└── routes/
    └── routes.js                           [MODIFY - add discount route]
```

---

## API Integration Details

### Endpoint Base
All endpoints use: `/api/method/savanna_pos.savanna_pos.apis.inventory_api.<method>`

### Authentication
- Uses existing `axiosInstance` which handles JWT tokens
- No additional authentication setup needed

### Response Handling
- Follow existing pattern from `warehouseSlice.js`
- Use `extractResponseData`, `extractErrorMessage`, `extractSuccessMessage`
- Handle `ApiResponse<T>` wrapper structure

### Error Handling
- Show notifications for errors (via `notificationSlice`)
- Handle validation errors gracefully
- Provide user-friendly error messages

---

## Testing Checklist

### Unit Tests
- [ ] Test discount calculation utilities
- [ ] Test Redux slice reducers
- [ ] Test custom hooks
- [ ] Test form validation

### Integration Tests
- [ ] Test discount fetching in sales flow
- [ ] Test bulk discount operations
- [ ] Test rule creation/update/delete
- [ ] Test discount display in product lists

### E2E Tests
- [ ] Create discount rule → Apply in sale
- [ ] Update discount rule → Verify in cart
- [ ] Delete discount rule → Verify removal
- [ ] Test priority system (Batch > Item > Item Group)

---

## Dependencies

### Existing Dependencies (No new installs needed)
- `@reduxjs/toolkit` - State management
- `axios` - API calls
- `react` - UI framework
- `@mui/material` - UI components (if used)

### Optional Enhancements
- `date-fns` - Better date handling (if not already used)
- `react-query` - Advanced caching (optional, Redux can handle)

---

## Configuration

### Environment Variables
- No new environment variables needed
- Uses existing `REACT_APP_API_URL` or `REACT_APP_API_BASE_URL`

### Settings Integration
- Check `POSProfileSettings.js` for `allow_discount_change` setting
- Respect this setting when allowing manual discount overrides

---

## Migration Notes

### Backward Compatibility
- Existing sales/invoices without discount rules will continue to work
- Discount fields are optional in invoice creation
- Backend auto-applies discounts if fields are omitted

### Data Migration
- No data migration needed (rules stored on backend)
- Frontend only needs to fetch and display

---

## Success Criteria

1. ✅ Users can create, read, update, delete discount rules
2. ✅ Discounts automatically apply during invoice creation
3. ✅ Discounts display correctly in product listings
4. ✅ Manual discount overrides work when allowed
5. ✅ Priority system works correctly (Batch > Item > Item Group)
6. ✅ Date validation works for time-limited discounts
7. ✅ Warehouse-specific discounts apply correctly
8. ✅ Performance is acceptable (no lag in sales flow)
9. ✅ Error handling is user-friendly
10. ✅ UI is consistent with existing design patterns

---

## Future Enhancements (Post-MVP)

1. **Discount Templates**: Save common discount configurations
2. **Discount Scheduling**: Schedule discounts to activate/deactivate
3. **Discount Analytics Dashboard**: Visualize discount impact
4. **Customer-Specific Discounts**: Extend to customer-level rules
5. **Discount Combinations**: Support multiple discounts per item
6. **Discount Approval Workflow**: Require approval for certain discounts
7. **Export/Import**: CSV import/export for bulk discount management
8. **Discount History**: Track changes to discount rules
9. **A/B Testing**: Test different discount strategies
10. **Mobile Optimization**: Optimize discount management for mobile

---

## Notes

- Follow existing code patterns and conventions
- Maintain consistency with other slices (warehouseSlice, salesSlice)
- Use TypeScript types from API documentation as JSDoc comments
- Ensure accessibility in UI components
- Add loading states for all async operations
- Provide clear error messages
- Test with various discount scenarios (percentage, amount, dates, warehouses)

---

## Questions to Resolve

1. **Routing**: Where should discount management be accessible?
   - Option A: Under Settings (`/settings/inventory-discounts`)
   - Option B: Under Inventory (`/inventory/discount-rules`)
   - Option C: Standalone section (`/discounts`)

2. **Permissions**: Who can manage discount rules?
   - Check if backend has permission checks
   - Add UI permission checks if needed

3. **Real-time Updates**: Should discount changes reflect immediately in open sales?
   - Consider WebSocket updates (if available)
   - Or refresh on focus/interval

4. **Discount Display**: How prominent should discounts be in UI?
   - Subtle badges vs. prominent displays
   - User preference setting?

---

## Getting Started

1. Start with Phase 1 (Redux slice) - Foundation
2. Test API connectivity with simple GET request
3. Build management UI incrementally
4. Integrate into sales flow last (most critical)
5. Test thoroughly before production deployment

---

*Last Updated: [Current Date]*
*Version: 1.0*

