# Multi-Level Stock Reconciliation - Implementation Plan

## Overview
This document outlines the implementation plan for the Multi-Level Stock Reconciliation feature based on the provided documentation. The implementation will follow existing codebase patterns and integrate seamlessly with the current architecture.

## Current Codebase Analysis

### Existing Patterns
- **State Management**: Redux Toolkit with async thunks
- **API Layer**: `axiosInstance` with helper functions (`extractResponseData`, `extractErrorMessage`)
- **Hooks**: Custom hooks in `src/hooks/` directory
- **Components**: Material-UI components with React Hook Form
- **Role Access**: `useRoleAccess` hook for role-based permissions
- **File Structure**: 
  - Redux slices in `src/store/`
  - Pages in `src/pages/`
  - Hooks in `src/hooks/`
  - Components in `src/components/`

### Existing Inventory Features
- Basic stock reconciliation exists (`StockReconciliation.js`)
- Inventory slice already has `createStockReconciliation` endpoint
- Warehouse management system in place
- Product/item management system available

---

## Implementation Phases

### Phase 1: Foundation & Redux Integration (Week 1)

#### 1.1 Update Redux Slice
**File**: `src/store/inventorySlice.js`

**Tasks**:
- Add new API endpoints for multi-level reconciliation:
  - `create_multi_level_stock_reconciliation`
  - `add_sales_person_stock_take`
  - `add_stock_controller_stock_take`
  - `add_stock_manager_stock_take_and_submit`
  - `get_multi_level_stock_reconciliation`

- Create async thunks:
  - `createMultiLevelReconciliation`
  - `addSalesPersonStockTake`
  - `addStockControllerStockTake`
  - `addStockManagerStockTake`
  - `getMultiLevelReconciliation`

- Add state management:
  - `multiLevelReconciliation` state
  - `workflowStatus` tracking
  - Loading states for each action

**Estimated Time**: 4-6 hours

#### 1.2 Create Type Definitions (JavaScript)
**File**: `src/types/stockReconciliation.js` (new file)

**Tasks**:
- Convert TypeScript types to JSDoc comments
- Define data structures for:
  - StockReconciliationItem
  - CreateReconciliationPayload
  - AddStockTakePayload
  - StockReconciliationRecord
  - StockReconciliationData
  - WorkflowStatus

**Estimated Time**: 1-2 hours

---

### Phase 2: Custom Hooks (Week 1-2)

#### 2.1 Main Hook
**File**: `src/hooks/useStockReconciliation.js` (new file)

**Tasks**:
- Create hook following pattern of `useRoleManagement.js`
- Implement:
  - State management (loading, error, reconciliation data)
  - API call handlers
  - Error handling
  - Auto-refresh after mutations

**Estimated Time**: 3-4 hours

#### 2.2 Role-Based Hook
**File**: `src/hooks/useStockReconciliationByRole.js` (new file)

**Tasks**:
- Create role-based wrapper hook
- Integrate with `useRoleAccess` hook
- Implement permission checks:
  - `canAddStockTake` - based on workflow status and user role
  - `canSubmit` - only for Stock Manager
- Map user roles to appropriate API calls

**Estimated Time**: 2-3 hours

---

### Phase 3: Core Components (Week 2)

#### 3.1 Create Reconciliation Component
**File**: `src/components/StockReconciliation/CreateReconciliation.js` (new file)

**Tasks**:
- Form for creating new reconciliation
- Fields:
  - Warehouse (Autocomplete/Select)
  - Posting Date
  - Posting Time (optional)
  - Purpose (Stock Reconciliation / Opening Stock)
  - Initial Items (optional, can add dynamically)
- Validation using React Hook Form
- Integration with warehouse and product slices
- Success/error handling

**Estimated Time**: 4-5 hours

#### 3.2 Stock Take Form Component
**File**: `src/components/StockReconciliation/StockTakeForm.js` (new file)

**Tasks**:
- Dynamic form for stock taking
- Features:
  - Display current quantities
  - Input fields for counted quantities
  - Comments per item
  - General comment field
  - Submit checkbox (for Stock Manager only)
- Role-based UI rendering
- Real-time validation
- Loading states

**Estimated Time**: 6-8 hours

#### 3.3 Reconciliation View Component
**File**: `src/components/StockReconciliation/ReconciliationView.js` (new file)

**Tasks**:
- Display reconciliation details
- Show stock taking records in table format
- Display audit trail with:
  - Sales User entries (name, date, qty, comment)
  - Quality Manager entries
  - Stock Manager entries
  - Final quantities
- Workflow status badge
- Document status indicator

**Estimated Time**: 4-5 hours

#### 3.4 Workflow Status Badge Component
**File**: `src/components/StockReconciliation/WorkflowStatusBadge.js` (new file)

**Tasks**:
- Color-coded status badges
- Statuses:
  - Pending Sales User (Orange)
  - Pending Quality Manager (Blue)
  - Pending Stock Manager (Purple)
  - Completed (Green)

**Estimated Time**: 1 hour

---

### Phase 4: Main Pages (Week 2-3)

#### 4.1 Reconciliation List Page
**File**: `src/pages/Inventory/MultiLevelReconciliation.js` (new file)

**Tasks**:
- List all multi-level reconciliations
- Features:
  - Search and filter
  - Status filtering
  - Warehouse filtering
  - Pagination
  - Sort by date/status
- Table columns:
  - Reconciliation Name
  - Warehouse
  - Posting Date
  - Workflow Status
  - Document Status
  - Actions (View, Edit if draft)
- Create new reconciliation button

**Estimated Time**: 5-6 hours

#### 4.2 Reconciliation Details Page
**File**: `src/pages/Inventory/MultiLevelReconciliationDetails.js` (new file)

**Tasks**:
- Full reconciliation view
- Role-based actions:
  - Sales User: Add stock take (if status = "Pending Sales User")
  - Quality Manager: Add stock take (if status = "Pending Quality Manager")
  - Stock Manager: Add stock take + Submit (if status = "Pending Stock Manager")
- Tabs or sections:
  - Overview
  - Stock Taking Records
  - Audit Trail
- Navigation breadcrumbs

**Estimated Time**: 6-8 hours

#### 4.3 Stock Take Page
**File**: `src/pages/Inventory/StockTake.js` (new file)

**Tasks**:
- Dedicated page for adding stock take
- Uses `StockTakeForm` component
- Role-based access control
- Success redirect to details page
- Cancel/back navigation

**Estimated Time**: 3-4 hours

---

### Phase 5: Integration & Routing (Week 3)

#### 5.1 Route Configuration
**File**: `src/routes/routes.js`

**Tasks**:
- Add routes:
  - `/inventory/multi-level-reconciliation` - List page
  - `/inventory/multi-level-reconciliation/:id` - Details page
  - `/inventory/multi-level-reconciliation/:id/stock-take` - Stock take page
  - `/inventory/multi-level-reconciliation/new` - Create page
- Add to navigation menu under Inventory section
- Configure role-based route protection

**Estimated Time**: 2-3 hours

#### 5.2 Navigation Menu Updates
**File**: `src/routes/routes.js` (navigation config)

**Tasks**:
- Add "Multi-Level Stock Reconciliation" menu item
- Icon: `Inventory2` or `Checklist`
- Position: Under Inventory section
- Role-based visibility

**Estimated Time**: 1 hour

---

### Phase 6: Testing & Refinement (Week 3-4)

#### 6.1 Unit Tests
**Files**: 
- `src/hooks/__tests__/useStockReconciliation.test.js`
- `src/store/__tests__/inventorySlice.test.js` (update)

**Tasks**:
- Test hook functionality
- Test Redux thunks
- Test error handling
- Test role-based permissions

**Estimated Time**: 4-6 hours

#### 6.2 Integration Testing
**Tasks**:
- Test complete workflow:
  1. Create reconciliation
  2. Sales User adds stock take
  3. Quality Manager adds stock take
  4. Stock Manager adds stock take and submits
- Test error scenarios
- Test permission boundaries

**Estimated Time**: 4-6 hours

#### 6.3 UI/UX Refinement
**Tasks**:
- Responsive design testing
- Loading state improvements
- Error message clarity
- Success feedback
- Form validation messages
- Accessibility checks

**Estimated Time**: 3-4 hours

---

## Technical Implementation Details

### API Integration Pattern

```javascript
// Following existing pattern from inventorySlice.js
export const createMultiLevelReconciliation = createAsyncThunk(
  'inventory/createMultiLevelReconciliation',
  async (payload, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...payload,
        ...(payload.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(
        ENDPOINTS.createMultiLevelReconciliation, 
        requestData
      );
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 
                            'Multi-level reconciliation created successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to create reconciliation',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);
```

### Role Mapping

```javascript
// Map user roles to workflow roles
const ROLE_MAPPING = {
  'Sales User': 'Sales User',
  'Sales Person': 'Sales User',
  'Quality Manager': 'Quality Manager',
  'Stock Controller': 'Quality Manager',
  'Stock Manager': 'Stock Manager',
  'Warehouse Manager': 'Stock Manager',
  'Administrator': 'Stock Manager', // Full access
  'System Manager': 'Stock Manager', // Full access
};
```

### Workflow Status Logic

```javascript
// Determine if user can add stock take
const canAddStockTake = (workflowStatus, userRole) => {
  const role = ROLE_MAPPING[userRole] || userRole;
  
  switch (workflowStatus) {
    case 'Pending Sales User':
      return role === 'Sales User';
    case 'Pending Quality Manager':
      return role === 'Quality Manager';
    case 'Pending Stock Manager':
      return role === 'Stock Manager';
    case 'Completed':
      return false; // No more edits allowed
    default:
      return false;
  }
};
```

---

## File Structure

```
src/
├── store/
│   └── inventorySlice.js (update with new thunks)
├── hooks/
│   ├── useStockReconciliation.js (new)
│   └── useStockReconciliationByRole.js (new)
├── components/
│   └── StockReconciliation/
│       ├── CreateReconciliation.js (new)
│       ├── StockTakeForm.js (new)
│       ├── ReconciliationView.js (new)
│       └── WorkflowStatusBadge.js (new)
├── pages/
│   └── Inventory/
│       ├── MultiLevelReconciliation.js (new)
│       ├── MultiLevelReconciliationDetails.js (new)
│       └── StockTake.js (new)
└── routes/
    └── routes.js (update with new routes)
```

---

## Dependencies

### Existing Dependencies (Already Installed)
- `@reduxjs/toolkit` - State management
- `react-redux` - React bindings
- `axios` - HTTP client
- `@mui/material` - UI components
- `react-hook-form` - Form handling
- `react-router-dom` - Routing

### No New Dependencies Required
All required packages are already in the project.

---

## Key Considerations

### 1. Backward Compatibility
- Keep existing `StockReconciliation.js` component intact
- New feature is separate and doesn't affect existing functionality

### 2. Role-Based Access
- Integrate with existing `useRoleAccess` hook
- Use existing role configuration system
- Respect permission boundaries

### 3. Error Handling
- Follow existing error handling patterns
- Use notification system for user feedback
- Log errors appropriately

### 4. Loading States
- Show loading indicators during API calls
- Disable forms during submission
- Provide clear feedback

### 5. Data Refresh
- Auto-refresh reconciliation data after mutations
- Optimistic updates where appropriate
- Handle stale data scenarios

### 6. Form Validation
- Client-side validation using React Hook Form
- Server-side error handling
- Clear validation messages

---

## Testing Checklist

### Functional Tests
- [ ] Create reconciliation with required fields
- [ ] Create reconciliation with optional items
- [ ] Sales User can add stock take when status is "Pending Sales User"
- [ ] Quality Manager can add stock take when status is "Pending Quality Manager"
- [ ] Stock Manager can add stock take when status is "Pending Stock Manager"
- [ ] Stock Manager can submit reconciliation
- [ ] Users cannot add stock take when workflow status doesn't match their role
- [ ] Completed reconciliations cannot be edited
- [ ] Error handling for API failures
- [ ] Form validation works correctly

### UI/UX Tests
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Loading states display correctly
- [ ] Error messages are clear and actionable
- [ ] Success notifications appear
- [ ] Navigation flows work correctly
- [ ] Forms are accessible (keyboard navigation, screen readers)

### Integration Tests
- [ ] Complete workflow from creation to submission
- [ ] Multiple users can work on same reconciliation (sequential)
- [ ] Warehouse selection works correctly
- [ ] Product/item selection works correctly
- [ ] Company context is applied correctly

---

## Estimated Timeline

| Phase | Duration | Total Hours |
|-------|----------|------------|
| Phase 1: Foundation | 1 week | 5-8 hours |
| Phase 2: Hooks | 1 week | 5-7 hours |
| Phase 3: Components | 1 week | 15-19 hours |
| Phase 4: Pages | 1 week | 14-18 hours |
| Phase 5: Integration | 3 days | 3-4 hours |
| Phase 6: Testing | 1 week | 11-16 hours |
| **Total** | **4-5 weeks** | **53-72 hours** |

---

## Risk Mitigation

### Potential Risks
1. **API Changes**: Backend API might differ from documentation
   - *Mitigation*: Test API endpoints early, adapt as needed

2. **Role Mapping**: User roles might not match exactly
   - *Mitigation*: Create flexible role mapping, test with actual user roles

3. **Performance**: Large item lists might cause performance issues
   - *Mitigation*: Implement pagination, virtual scrolling if needed

4. **Concurrent Edits**: Multiple users editing same reconciliation
   - *Mitigation*: Backend should handle this, but add optimistic locking if needed

---

## Success Criteria

1. ✅ Users can create multi-level stock reconciliations
2. ✅ Sales Users can add stock takes at appropriate workflow stage
3. ✅ Quality Managers can add stock takes at appropriate workflow stage
4. ✅ Stock Managers can add stock takes and submit reconciliations
5. ✅ Workflow status updates correctly after each action
6. ✅ Audit trail displays all stock taking records correctly
7. ✅ Role-based access control works as expected
8. ✅ Error handling provides clear feedback
9. ✅ UI is responsive and accessible
10. ✅ Integration with existing inventory system is seamless

---

## Next Steps

1. **Review & Approval**: Review this plan with stakeholders
2. **Setup**: Create branch for feature development
3. **Phase 1 Start**: Begin with Redux slice updates
4. **Iterative Development**: Follow phases sequentially
5. **Testing**: Continuous testing throughout development
6. **Documentation**: Update user documentation as feature is built

---

## Notes

- This implementation follows existing codebase patterns
- All code will be in JavaScript (not TypeScript)
- Material-UI components will be used for consistency
- Redux Toolkit patterns will be followed
- Existing hooks patterns will be maintained
- Role access system will be integrated

