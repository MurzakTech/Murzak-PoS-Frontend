# Payment Methods API Implementation Plan

## Overview

This document outlines the implementation plan for integrating the Payment Methods API into the SavvyPOS frontend application, based on the `PAYMENT_METHODS_API.md` documentation. This will enable dynamic payment method management, proper account resolution, and fix critical bugs in the current payment handling.

## Current State Analysis

### Existing Implementation
- ✅ Basic payment method selection in `NewSale.js`
- ✅ Split payment support UI
- ✅ Credit payment handling
- ✅ Payment validation (sum must equal grand total)
- ✅ Credit limit validation integration
- ✅ Redux state management (`salesSlice.js`)
- ✅ Material-UI components

### Issues and Missing Features
- ❌ **CRITICAL BUG**: Credit payment mode is incorrectly mapped to 'Cash' (line 555 in `NewSale.js`)
- ❌ Payment methods are hardcoded: `['Cash', 'Card', 'Mobile Money', 'Credit']`
- ❌ Not using `list_payment_methods` API to fetch dynamic payment methods
- ❌ Not using `get_receivable_account` API for credit payments
- ❌ Missing `account` field in payment payloads (backend auto-resolves, but explicit is better)
- ❌ Missing `base_amount` field in payment payloads
- ❌ Not using `use_receivable_account` flag for credit payments
- ❌ Payment method selector doesn't show account information
- ❌ No handling for company-specific payment method accounts

---

## Implementation Phases

### Phase 1: Redux State Management (Foundation)
**Priority: High | Estimated Time: 2-3 hours**

#### 1.1 Update `salesSlice.js`
Add new async thunks for payment methods operations:

**New Endpoints to Add:**
```javascript
const ENDPOINTS = {
  // ... existing endpoints
  listPaymentMethods: 'savanna_pos.savanna_pos.apis.sales_api.list_payment_methods',
  getReceivableAccount: 'savanna_pos.savanna_pos.apis.sales_api.get_receivable_account',
};
```

**New Async Thunks:**

1. **`listPaymentMethods`** - Fetch available payment methods
   ```javascript
   export const listPaymentMethods = createAsyncThunk(
     'sales/listPaymentMethods',
     async ({ company, only_enabled = true }, { dispatch, rejectWithValue }) => {
       // Implementation
     }
   );
   ```

2. **`getReceivableAccount`** - Get receivable account for credit payments
   ```javascript
   export const getReceivableAccount = createAsyncThunk(
     'sales/getReceivableAccount',
     async ({ customer, company }, { dispatch, rejectWithValue }) => {
       // Implementation
     }
   );
   ```

**State Updates:**
- Add `paymentMethods` array to store payment methods data
- Add `receivableAccount` string to store receivable account name
- Add loading states: `isLoadingPaymentMethods`, `isLoadingReceivableAccount`
- Add error states for payment operations

**Files to Modify:**
- `src/store/salesSlice.js`

**Implementation Details:**
- Use same error handling pattern as existing thunks
- Extract response data using existing `extractResponseData` helper
- Dispatch notifications on errors
- Handle both success and error cases properly

---

### Phase 2: Fetch Payment Methods on Component Mount
**Priority: High | Estimated Time: 1-2 hours**

#### 2.1 Update `NewSale.js` to Fetch Payment Methods

**Changes Required:**

1. **Import the new Redux actions:**
   ```javascript
   import { 
     listPaymentMethods, 
     getReceivableAccount,
     // ... existing imports
   } from '../../store/salesSlice';
   ```

2. **Add Redux selectors:**
   ```javascript
   const { 
     paymentMethods, 
     isLoadingPaymentMethods,
     receivableAccount,
     isLoadingReceivableAccount,
     // ... existing selectors
   } = useAppSelector((state) => state.sales);
   ```

3. **Add useEffect to fetch payment methods:**
   ```javascript
   useEffect(() => {
     if (userCompany) {
       dispatch(listPaymentMethods({ 
         company: userCompany,
         only_enabled: true 
       }));
     }
   }, [userCompany, dispatch]);
   ```

4. **Derive payment mode options from Redux state:**
   ```javascript
   const paymentModes = paymentMethods.length > 0
     ? paymentMethods.map(pm => pm.name)
     : ['Cash', 'Card', 'Mobile Money', 'Credit']; // Fallback to hardcoded if API fails
   ```

**Files to Modify:**
- `src/pages/Sales/NewSale.js`

**Error Handling:**
- If payment methods API fails, fall back to hardcoded list
- Show warning notification if API fails (non-blocking)

---

### Phase 3: Fix Credit Payment Handling
**Priority: Critical | Estimated Time: 2-3 hours**

#### 3.1 Fetch Receivable Account for Credit Payments

**Changes Required:**

1. **Add useEffect to fetch receivable account when customer changes and credit is used:**
   ```javascript
   useEffect(() => {
     if (customer && 
         customer.toLowerCase() !== 'walk-in customer' && 
         userCompany &&
         (paymentMode === 'Credit' || payments.some(p => p.mode === 'Credit'))) {
       dispatch(getReceivableAccount({ 
         customer, 
         company: userCompany 
       }));
     }
   }, [customer, userCompany, paymentMode, payments, dispatch]);
   ```

2. **Update payment payload construction (FIX CRITICAL BUG):**
   
   **Current (BUGGY) code (lines 554-557):**
   ```javascript
   const paymentsPayload = paymentLines.map((p) => ({
     mode_of_payment: p.mode === 'Credit' ? 'Cash' : p.mode, // ❌ BUG!
     amount: Number(p.amount) || 0,
   }));
   ```
   
   **New (CORRECT) code:**
   ```javascript
   const paymentsPayload = paymentLines.map((p) => {
     const basePayload = {
       mode_of_payment: p.mode, // ✅ Use actual mode
       amount: Number(p.amount) || 0,
       base_amount: Number(p.amount) || 0, // ✅ Add base_amount
     };
     
     // Handle credit payments
     if (p.mode === 'Credit') {
       // Option 1: Use the receivable account flag (recommended)
       basePayload.use_receivable_account = true;
       
       // Option 2: Explicitly set account if we have it
       if (receivableAccount) {
         basePayload.account = receivableAccount;
       }
     }
     
     return basePayload;
   });
   ```

3. **Add account information to payment method selector (optional enhancement):**
   - Show account name in dropdown helper text or tooltip
   - Display currency information if available

**Files to Modify:**
- `src/pages/Sales/NewSale.js`

**Validation:**
- Ensure receivable account is available before allowing credit payments
- Show error if customer is selected but receivable account fetch fails
- Validate that credit payments use proper account

---

### Phase 4: Enhance Payment Method UI
**Priority: Medium | Estimated Time: 3-4 hours**

#### 4.1 Improve Payment Method Selector

**Enhancements:**

1. **Show Payment Method Details:**
   - Display account name for each payment method
   - Show currency if different from base currency
   - Indicate which methods are enabled
   - Group by payment type if applicable

2. **Add Payment Method Loading State:**
   - Show loading indicator while fetching payment methods
   - Disable selector until payment methods are loaded

3. **Handle Payment Method Accounts:**
   - When a payment method has multiple accounts (different companies), show the one for current company
   - Display default account clearly

**UI Component Structure:**
```javascript
<FormControl fullWidth size="medium">
  <InputLabel id="payment-method-label">Payment Method</InputLabel>
  <Select
    labelId="payment-method-label"
    id="payment-method-select"
    value={paymentMode}
    label="Payment Method"
    onChange={handlePaymentModeChange}
    disabled={isLoadingPaymentMethods}
  >
    {isLoadingPaymentMethods ? (
      <MenuItem disabled>
        <CircularProgress size={20} sx={{ mr: 1 }} />
        Loading payment methods...
      </MenuItem>
    ) : (
      paymentModes.map((mode) => {
        const method = paymentMethods.find(pm => pm.name === mode);
        const account = method?.accounts?.find(a => a.company === userCompany);
        return (
          <MenuItem key={mode} value={mode}>
            <Box>
              <Typography variant="body1">{mode}</Typography>
              {account && (
                <Typography variant="caption" color="text.secondary">
                  {account.default_account} ({account.currency})
                </Typography>
              )}
            </Box>
          </MenuItem>
        );
      })
    )}
  </Select>
</FormControl>
```

**Files to Modify:**
- `src/pages/Sales/NewSale.js`

---

### Phase 5: Update Split Payment UI
**Priority: Medium | Estimated Time: 2-3 hours**

#### 5.1 Enhance Split Payment Component

**Changes Required:**

1. **Use Dynamic Payment Methods in Split Payment Selector:**
   - Replace hardcoded `paymentModes` array with Redux state
   - Show account information for each payment method option

2. **Add Account Display in Payment Rows:**
   - Show which account will be used for each payment method
   - Display currency information

3. **Handle Credit Payments in Split Payments:**
   - When Credit is selected in split payments, ensure receivable account is fetched
   - Show warning if receivable account is not available
   - Validate credit limit for credit portions

**Enhanced Split Payment Row:**
```javascript
{payments.map((p, idx) => {
  const method = paymentMethods.find(pm => pm.name === p.mode);
  const account = method?.accounts?.find(a => a.company === userCompany);
  
  return (
    <Grid container spacing={1} key={`payment-${idx}`}>
      {/* Payment method selector */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="small">
          <InputLabel id={`payment-mode-${idx}`}>Method</InputLabel>
          <Select
            labelId={`payment-mode-${idx}`}
            value={p.mode}
            label="Method"
            onChange={(e) => updatePaymentField(idx, 'mode', e.target.value)}
          >
            {paymentModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
          {account && (
            <FormHelperText>
              Account: {account.default_account}
            </FormHelperText>
          )}
        </FormControl>
      </Grid>
      {/* Amount input */}
      {/* ... */}
    </Grid>
  );
})}
```

**Files to Modify:**
- `src/pages/Sales/NewSale.js`

---

### Phase 6: Testing and Validation
**Priority: High | Estimated Time: 3-4 hours**

#### 6.1 Test Scenarios

1. **Payment Methods API Integration:**
   - ✅ Verify payment methods are fetched on component mount
   - ✅ Verify fallback to hardcoded list if API fails
   - ✅ Test with different companies (different accounts)
   - ✅ Test with disabled payment methods (should not appear)

2. **Credit Payment Fix:**
   - ✅ Verify Credit mode is NOT mapped to Cash
   - ✅ Verify receivable account is fetched when credit is used
   - ✅ Test credit payment with single payment method
   - ✅ Test credit payment in split payments
   - ✅ Verify outstanding balance is correctly calculated

3. **Account Resolution:**
   - ✅ Verify accounts are correctly resolved from payment methods
   - ✅ Test with payment methods that have no accounts (should use backend auto-resolution)
   - ✅ Verify `use_receivable_account` flag is set for credit payments

4. **Payment Validation:**
   - ✅ Verify payment sum equals grand total validation still works
   - ✅ Verify credit limit validation still works
   - ✅ Test partial payments (should create outstanding balance)

5. **Edge Cases:**
   - ✅ Test with Walk-in Customer (no receivable account needed)
   - ✅ Test with customer that has no receivable account configured
   - ✅ Test when payment methods API returns empty array
   - ✅ Test when receivable account API fails

#### 6.2 Error Handling Tests

- Test network failures for payment methods API
- Test network failures for receivable account API
- Test invalid customer/company combinations
- Test payment methods with missing account configurations

**Files to Review:**
- `src/pages/Sales/NewSale.js`
- `src/store/salesSlice.js`
- Test with actual backend API endpoints

---

## Implementation Checklist

### Phase 1: Redux State Management
- [ ] Add `listPaymentMethods` endpoint to ENDPOINTS
- [ ] Add `getReceivableAccount` endpoint to ENDPOINTS
- [ ] Create `listPaymentMethods` async thunk
- [ ] Create `getReceivableAccount` async thunk
- [ ] Add `paymentMethods` to initial state
- [ ] Add `receivableAccount` to initial state
- [ ] Add loading states for payment operations
- [ ] Add error handling in thunks
- [ ] Add reducers for fulfilled/pending/rejected cases
- [ ] Test Redux actions independently

### Phase 2: Fetch Payment Methods
- [ ] Import new Redux actions in `NewSale.js`
- [ ] Add payment methods selectors
- [ ] Add useEffect to fetch payment methods on mount
- [ ] Derive payment modes from Redux state
- [ ] Add fallback to hardcoded list
- [ ] Test payment methods loading

### Phase 3: Fix Credit Payment Handling
- [ ] Add useEffect to fetch receivable account for credit
- [ ] Fix payment payload construction (remove Credit → Cash bug)
- [ ] Add `base_amount` to payment payloads
- [ ] Add `use_receivable_account` flag for credit payments
- [ ] Add account field when available
- [ ] Test credit payment creation
- [ ] Verify outstanding balance calculation

### Phase 4: Enhance Payment Method UI
- [ ] Update payment method selector to show account info
- [ ] Add loading state to selector
- [ ] Display currency information
- [ ] Handle multiple accounts per payment method
- [ ] Test UI with different payment methods

### Phase 5: Update Split Payment UI
- [ ] Use dynamic payment methods in split payments
- [ ] Show account information in split payment rows
- [ ] Handle credit in split payments
- [ ] Test split payment with credit

### Phase 6: Testing and Validation
- [ ] Test all payment method scenarios
- [ ] Test credit payment scenarios
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Manual testing in browser
- [ ] Integration testing with backend
- [ ] Code review

---

## API Integration Details

### Payment Methods Response Structure
```typescript
interface PaymentMethod {
  name: string;
  type: string;
  enabled: number; // 1 = enabled, 0 = disabled
  accounts: Array<{
    company: string;
    default_account: string;
    currency: string;
  }>;
}
```

### Receivable Account Response Structure
```typescript
interface ReceivableAccountResponse {
  account: string; // Account name to use
}
```

### Payment Payload Structure
```typescript
interface PaymentPayload {
  mode_of_payment: string; // Required
  amount: number; // Required
  base_amount?: number; // Optional, defaults to amount
  account?: string; // Optional, auto-resolved if omitted
  use_receivable_account?: boolean; // Optional, for credit payments
}
```

---

## Migration Notes

### Breaking Changes
- None expected - this is an enhancement, not a breaking change

### Backward Compatibility
- If payment methods API fails, fallback to hardcoded list
- Existing payment payloads will work (backend auto-resolves accounts)
- Credit payments will now work correctly (bug fix)

### Rollout Strategy
1. Deploy backend changes first (if any)
2. Deploy frontend changes
3. Monitor for errors in payment methods API calls
4. Monitor credit payment creation for issues

---

## Future Enhancements (Post-Implementation)

1. **Payment Method Management UI:**
   - Allow admins to enable/disable payment methods from frontend
   - Configure payment method accounts from UI

2. **Payment Method Validation:**
   - Validate payment methods are enabled before allowing selection
   - Show warnings for disabled payment methods

3. **Multi-Currency Support:**
   - Handle payment methods with different currencies
   - Show currency conversion in payment UI

4. **Payment Method Analytics:**
   - Track which payment methods are used most
   - Show payment method usage statistics

5. **Offline Support:**
   - Cache payment methods for offline use
   - Store receivable accounts in cache

---

## Estimated Total Time

- **Phase 1:** 2-3 hours
- **Phase 2:** 1-2 hours
- **Phase 3:** 2-3 hours
- **Phase 4:** 3-4 hours
- **Phase 5:** 2-3 hours
- **Phase 6:** 3-4 hours

**Total: 13-19 hours**

---

## Success Criteria

1. ✅ Payment methods are fetched dynamically from API
2. ✅ Credit payment bug is fixed (no longer maps to Cash)
3. ✅ Receivable accounts are properly resolved for credit payments
4. ✅ Payment payloads include all required fields (`base_amount`, `account` when needed)
5. ✅ UI shows account information for payment methods
6. ✅ Split payments work correctly with credit
7. ✅ All existing functionality continues to work
8. ✅ Error handling is robust with proper fallbacks

---

## Notes

- The critical bug fix (Phase 3) should be prioritized and can be implemented independently if needed
- Payment methods API integration can be done incrementally
- UI enhancements (Phases 4-5) can be done after core functionality is working
- Testing should be thorough, especially for credit payments, as this is a critical business flow

