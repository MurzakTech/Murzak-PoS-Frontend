# Loyalty Points Redemption Implementation Plan

## Overview
This document outlines the implementation plan for integrating Loyalty Points Redemption functionality into the POS system based on `LOYALTY_POINTS_REDEMPTION_API_DOCUMENTATION.md`.

## Analysis Summary

### Existing Implementation
- ✅ **Loyalty Slice** (`src/store/loyaltySlice.js`) - Has basic loyalty operations (earn, redeem, balance)
- ✅ **Loyalty Hook** (`src/hooks/useLoyalty.js`) - Provides reusable hook for loyalty operations
- ✅ **NewSale Component** (`src/pages/Sales/NewSale.js`) - Main POS interface with customer selection and payment
- ✅ **Sales Slice** (`src/store/salesSlice.js`) - Handles POS invoice creation

### New Requirements
- 🔴 **Two New API Endpoints** (from documentation):
  1. `get_customer_loyalty_details` - Get loyalty info for redemption
  2. `calculate_loyalty_redemption` - Calculate discount for points redemption
- 🔴 **Loyalty Redemption UI Component** - Interface for selecting/displaying points to redeem
- 🔴 **Integration with POS Invoice Creation** - Support `redeem_loyalty_points` and `loyalty_points` parameters

---

## Implementation Plan

### Phase 1: Redux Store Enhancements (loyaltySlice.js)

#### 1.1 Add New API Endpoints
**File:** `src/store/loyaltySlice.js`

Add new endpoints to `ENDPOINTS` object:
```javascript
const ENDPOINTS = {
  // ... existing endpoints ...
  getCustomerLoyaltyDetails: 'techsavanna_pos.api.loyalty.get_customer_loyalty_details',
  calculateLoyaltyRedemption: 'techsavanna_pos.api.loyalty.calculate_loyalty_redemption',
};
```

#### 1.2 Create New Async Thunks

**a) `getCustomerLoyaltyDetails`**
- **Purpose:** Fetch customer's loyalty program details, available points, conversion factor, and max redeemable
- **Parameters:** `customer_id`, `invoice_amount` (optional), `company` (optional)
- **Response Structure:**
  ```javascript
  {
    status: 'success' | 'error',
    has_loyalty_program: boolean,
    customer: string,
    loyalty_program: string,
    loyalty_program_name: string,
    loyalty_points: number,
    conversion_factor: number,
    max_redeemable_amount: number,
    max_redeemable_points: number,
    expense_account: string,
    cost_center: string,
    tier_name: string,
    total_spent: number,
    message?: string
  }
  ```
- **State Updates:** Add to state:
  ```javascript
  loyaltyDetails: null,
  isLoadingLoyaltyDetails: false,
  loyaltyDetailsError: null,
  ```

**b) `calculateLoyaltyRedemption`**
- **Purpose:** Calculate discount amount for redeeming specific number of points
- **Parameters:** `customer_id`, `points_to_redeem`, `invoice_amount` (optional), `company` (optional)
- **Response Structure:**
  ```javascript
  {
    status: 'success' | 'error',
    points_to_redeem?: number,
    discount_amount?: number,
    conversion_factor?: number,
    remaining_points?: number,
    expense_account?: string,
    cost_center?: string,
    loyalty_program?: string,
    message?: string,
    available_points?: number,
    requested_points?: number,
    invoice_amount?: number,
    max_redeemable_points?: number
  }
  ```
- **State Updates:** Add to state:
  ```javascript
  redemptionCalculation: null,
  isCalculatingRedemption: false,
  redemptionError: null,
  ```

#### 1.3 Update Reducer
- Add cases for pending/fulfilled/rejected for both new thunks
- Add reducer actions: `clearLoyaltyDetails()`, `clearRedemptionCalculation()`

---

### Phase 2: Custom Hooks Enhancement

#### 2.1 Update `useLoyalty.js` Hook
**File:** `src/hooks/useLoyalty.js`

Add new hook functions:
- `getLoyaltyDetails(invoiceAmount?)` - Fetch customer loyalty details
- `calculateRedemption(pointsToRedeem, invoiceAmount?)` - Calculate redemption

**Optional:** Create dedicated hook `useLoyaltyRedemption.js` following the pattern in API documentation:
- `useCustomerLoyalty({ customerId, invoiceAmount, autoFetch })`
- `useLoyaltyRedemption()`

---

### Phase 3: UI Component Creation

#### 3.1 Create Loyalty Redemption Component
**File:** `src/components/Sales/LoyaltyRedemption.jsx` (new file)

**Features:**
- Display customer's available loyalty points
- Show conversion factor (1 point = X currency)
- Display max redeemable points/amount
- Input field for points to redeem
- "Use Max" button to redeem maximum allowed
- Real-time discount calculation preview
- Error handling and validation messages
- Display:
  - Discount amount
  - Remaining amount to pay
  - Remaining points after redemption

**Props:**
```javascript
{
  customerId: string,
  invoiceTotal: number,
  onRedemptionChange: (points: number, discountAmount: number) => void,
  disabled?: boolean
}
```

**Design Considerations:**
- Material-UI components (matching existing design system)
- Responsive layout
- Accessible (ARIA labels, keyboard navigation)
- Loading states during API calls
- Validation feedback

---

### Phase 4: Integration with NewSale Component

#### 4.1 State Management in NewSale.js
**File:** `src/pages/Sales/NewSale.js`

Add new state variables:
```javascript
const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
const [loyaltyDiscountAmount, setLoyaltyDiscountAmount] = useState(0);
const [isLoadingLoyaltyDetails, setIsLoadingLoyaltyDetails] = useState(false);
```

#### 4.2 Fetch Loyalty Details on Customer Selection
**Location:** In `useEffect` that watches `customerId`

Add logic to:
- Fetch loyalty details when customer is selected (non-walk-in)
- Clear loyalty redemption when customer changes or is walk-in
- Re-fetch when invoice total changes (to update max redeemable)

#### 4.3 Display Loyalty Redemption Component
**Location:** In the checkout/payment section UI

- Show `LoyaltyRedemption` component only if:
  - Customer is not walk-in
  - Customer has loyalty program enrolled
  - Cart has items
- Position it above or alongside payment method selection

#### 4.4 Update Invoice Total Calculation
**Location:** `calculateSubtotal()` or similar functions

Modify to subtract loyalty discount:
```javascript
const grandTotal = calculateSubtotal() - loyaltyDiscountAmount;
```

#### 4.5 Update `handleCheckout()` Function
**Location:** Around line 722-900

Add loyalty redemption to invoice payload:
```javascript
const invoiceData = {
  // ... existing fields ...
  
  // Add loyalty redemption if points are being redeemed
  ...(loyaltyPointsToRedeem > 0 && {
    redeem_loyalty_points: true,
    loyalty_points: loyaltyPointsToRedeem,
  }),
};
```

**Important Notes:**
- Loyalty discount is NOT a payment method - it reduces invoice total
- Customer must still pay remaining amount via regular payment methods
- Ensure payment amounts equal the discounted grand total

#### 4.6 Update Balance/Change Calculation
**Location:** `calculateBalance()` function

Ensure loyalty discount is accounted for when calculating change/balance.

---

### Phase 5: Sales Slice Verification

#### 5.1 Verify `createPOSInvoice` Supports Loyalty Parameters
**File:** `src/store/salesSlice.js`

**Action Required:**
- Verify that the `createPOSInvoice` thunk passes all fields from `invoiceData` to the API
- The API endpoint should already support `redeem_loyalty_points` and `loyalty_points` parameters (per documentation)

**No changes needed** if the thunk already forwards all fields - it should work automatically.

---

### Phase 6: Error Handling & Edge Cases

#### 6.1 Handle Error Scenarios
- Customer not enrolled in loyalty program → Hide redemption UI or show message
- Insufficient points → Show error, suggest max redeemable
- Redemption exceeds invoice amount → Auto-adjust to max or show error
- API failures → Show user-friendly error messages
- Customer changed during checkout → Clear redemption state

#### 6.2 Validation Logic
- Points must be positive integer
- Points cannot exceed available balance
- Redemption amount cannot exceed invoice total
- Cannot redeem points for walk-in customers

---

### Phase 7: UI/UX Enhancements

#### 7.1 Visual Indicators
- Show loyalty points badge/icon when customer has program
- Highlight discount amount in a distinct color
- Show "Points available" indicator in customer selection
- Display tier name if available (Gold, Silver, Bronze)

#### 7.2 User Flow
1. User selects customer
2. System fetches loyalty details (in background)
3. If customer has program, show redemption section
4. User can input points or click "Use Max"
5. System calculates discount in real-time
6. Invoice total updates to show discounted amount
7. User proceeds with payment selection
8. On checkout, loyalty redemption is included in invoice

---

## File Structure Summary

### New Files
```
src/components/Sales/LoyaltyRedemption.jsx  (new)
```

### Modified Files
```
src/store/loyaltySlice.js                  (add new thunks & state)
src/hooks/useLoyalty.js                    (optional: add new functions)
src/pages/Sales/NewSale.js                 (integrate redemption UI & logic)
src/store/salesSlice.js                    (verify - likely no changes needed)
```

---

## Implementation Order

1. **Phase 1** - Add Redux thunks (foundation)
2. **Phase 2** - Update hooks (optional enhancement)
3. **Phase 3** - Create UI component (testable in isolation)
4. **Phase 4** - Integrate into NewSale (main integration)
5. **Phase 5** - Verify sales slice (quick check)
6. **Phase 6** - Add error handling (robustness)
7. **Phase 7** - Polish UI/UX (refinement)

---

## Testing Checklist

### Unit Tests
- [ ] Loyalty thunks handle success/error responses correctly
- [ ] Redemption calculation validates points correctly
- [ ] Component handles edge cases (no program, insufficient points, etc.)

### Integration Tests
- [ ] Loyalty details fetch when customer selected
- [ ] Discount updates invoice total correctly
- [ ] Redemption included in invoice payload
- [ ] Payment validation accounts for discount
- [ ] Error messages display appropriately

### User Acceptance Tests
- [ ] Walk-in customer: No loyalty UI shown
- [ ] Registered customer with program: UI displays correctly
- [ ] Redeeming points reduces invoice total
- [ ] "Use Max" button works correctly
- [ ] Change/balance calculation correct with discount
- [ ] Invoice created successfully with loyalty redemption

---

## Important Notes

### Key Concepts
1. **Loyalty Points are NOT a Payment Method**
   - They reduce the invoice total (discount)
   - Customer must still pay remaining amount
   - Payment methods handle the actual payment

2. **Redemption Happens at Invoice Creation**
   - Points are deducted when invoice is submitted
   - Cannot redeem after invoice creation
   - Validation happens server-side

3. **Invoice Amount Limits Redemption**
   - Cannot redeem more than invoice total
   - API calculates max redeemable based on invoice amount
   - Frontend should respect this limit

4. **Walk-in Customers**
   - No loyalty program enrollment
   - No redemption available
   - UI should hide redemption section

---

## API Endpoint Details

### Get Customer Loyalty Details
- **Method:** GET
- **Endpoint:** `/api/method/techsavanna_pos.api.loyalty.get_customer_loyalty_details`
- **Params:** `customer_id`, `invoice_amount` (optional), `company` (optional)
- **Guest Accessible:** Yes

### Calculate Loyalty Redemption
- **Method:** GET
- **Endpoint:** `/api/method/techsavanna_pos.api.loyalty.calculate_loyalty_redemption`
- **Params:** `customer_id`, `points_to_redeem`, `invoice_amount` (optional), `company` (optional)
- **Guest Accessible:** Yes

### Create POS Invoice (with redemption)
- **Method:** POST
- **Endpoint:** `/api/method/techsavanna_pos.api.sales.create_pos_invoice`
- **Additional Fields:**
  ```javascript
  {
    redeem_loyalty_points: true,
    loyalty_points: 3000  // Points to redeem
  }
  ```

---

## Estimated Effort

- **Phase 1:** 2-3 hours (Redux thunks)
- **Phase 2:** 1 hour (Hooks - optional)
- **Phase 3:** 4-5 hours (UI Component)
- **Phase 4:** 3-4 hours (NewSale Integration)
- **Phase 5:** 0.5 hours (Verification)
- **Phase 6:** 2-3 hours (Error Handling)
- **Phase 7:** 2-3 hours (UI Polish)

**Total:** ~15-20 hours

---

## Success Criteria

✅ Customer loyalty details fetched when customer selected
✅ Loyalty redemption UI displays for enrolled customers
✅ Points redemption calculates discount correctly
✅ Discount reduces invoice total
✅ Redemption included in invoice creation
✅ Payment validation accounts for discount
✅ Error handling covers all edge cases
✅ UI matches existing design system
✅ Feature works end-to-end without blocking issues

---

## Future Enhancements (Out of Scope)

- Points expiry display
- Loyalty tier progress indicator
- Loyalty points earned preview (before checkout)
- Bulk redemption rules
- Loyalty program selection for customers with multiple programs

