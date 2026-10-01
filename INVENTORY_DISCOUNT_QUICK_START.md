# Inventory Discount API - Quick Start Guide

## Implementation Summary

This guide provides a quick reference for implementing the Inventory Discount API integration.

## 🎯 Key Integration Points

### 1. Redux Store (`src/store/inventoryDiscountSlice.js`)
- **7 API endpoints** to implement as async thunks
- Follow pattern from `warehouseSlice.js`
- State: rules list, selected rule, item discounts cache, pagination, filters

### 2. Custom Hooks
- `useInventoryDiscounts` - Bulk discount fetching for multiple items
- `useItemDiscount` - Single item discount lookup
- Location: `src/hooks/`

### 3. UI Components
- **Management Page**: `src/pages/Settings/InventoryDiscounts.js`
- **Display Components**: `src/components/Inventory/DiscountBadge.jsx`
- **Form Component**: `src/components/Inventory/DiscountRuleForm.jsx`

### 4. Sales Integration
- **NewSale.js**: Fetch and display discounts in cart
- **POS.js**: Real-time discount display
- **Invoice Details**: Show applied discounts

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `inventoryDiscountSlice.js`
- [ ] Register in `store.js`
- [ ] Create `useInventoryDiscounts` hook
- [ ] Create `useItemDiscount` hook
- [ ] Create `discountCalculator.js` utility

### Phase 2: Management UI (Week 2)
- [ ] Create discount rules listing page
- [ ] Create discount rule form (Create/Edit)
- [ ] Add routing
- [ ] Implement filters and pagination

### Phase 3: Display (Week 3)
- [ ] Create `DiscountBadge` component
- [ ] Create `DiscountInfo` component
- [ ] Integrate into product listings

### Phase 4: Sales Flow (Week 4)
- [ ] Integrate into `NewSale.js`
- [ ] Integrate into `POS.js`
- [ ] Update invoice details display

## 🔑 Key API Endpoints

```javascript
const ENDPOINTS = {
  createInventoryDiscountRule: 'savanna_pos.savanna_pos.apis.inventory_api.create_inventory_discount_rule',
  updateInventoryDiscountRule: 'savanna_pos.savanna_pos.apis.inventory_api.update_inventory_discount_rule',
  deleteInventoryDiscountRule: 'savanna_pos.savanna_pos.apis.inventory_api.delete_inventory_discount_rule',
  getInventoryDiscountRule: 'savanna_pos.savanna_pos.apis.inventory_api.get_inventory_discount_rule',
  listInventoryDiscountRules: 'savanna_pos.savanna_pos.apis.inventory_api.list_inventory_discount_rules',
  getInventoryDiscountForItem: 'savanna_pos.savanna_pos.apis.inventory_api.get_inventory_discount_for_item',
  bulkGetInventoryDiscounts: 'savanna_pos.savanna_pos.apis.inventory_api.bulk_get_inventory_discounts',
};
```

## 🎨 State Structure

```javascript
{
  rules: [],                    // All discount rules
  selectedRule: null,           // Currently selected rule
  itemDiscounts: {},           // Cache: { item_code: rule }
  bulkDiscounts: [],           // Bulk fetch results
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
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

## 🔄 Priority System

Discounts are applied in this order (most specific first):
1. **Batch** rules (highest priority)
2. **Item** rules (medium priority)
3. **Item Group** rules (lowest priority)

Within same type: Lower `priority` number wins.

## 💡 Usage Examples

### Fetch Discount for Single Item
```javascript
import { useItemDiscount } from '../hooks/useItemDiscount';

const { discount, loading } = useItemDiscount({
  item_code: 'ITEM-001',
  company: 'My Company',
  warehouse: 'Main Warehouse',
});
```

### Fetch Discounts for Multiple Items
```javascript
import { useInventoryDiscounts } from '../hooks/useInventoryDiscounts';

const { discounts, loading } = useInventoryDiscounts({
  company: 'My Company',
  warehouse: 'Main Warehouse',
  items: [
    { item_code: 'ITEM-001' },
    { item_code: 'ITEM-002' },
  ],
});
```

### Create Discount Rule
```javascript
import { useAppDispatch } from '../store/hooks';
import { createInventoryDiscountRule } from '../store/inventoryDiscountSlice';

const dispatch = useAppDispatch();

dispatch(createInventoryDiscountRule({
  rule_type: 'Item Group',
  item_group: 'Beverages',
  company: 'My Company',
  discount_type: 'Percentage',
  discount_value: 10,
  priority: 5,
  is_active: 1,
}));
```

## 🚀 Quick Start Steps

1. **Create Redux Slice**
   ```bash
   # Copy warehouseSlice.js as template
   # Create inventoryDiscountSlice.js
   # Implement all 7 async thunks
   ```

2. **Register in Store**
   ```javascript
   // src/store/store.js
   import inventoryDiscountReducer from './inventoryDiscountSlice';
   
   // Add to reducer object:
   inventoryDiscount: inventoryDiscountReducer,
   ```

3. **Create Hooks**
   ```bash
   # Create src/hooks/useInventoryDiscounts.js
   # Create src/hooks/useItemDiscount.js
   ```

4. **Build Management UI**
   ```bash
   # Create src/pages/Settings/InventoryDiscounts.js
   # Add route in routes.js
   ```

5. **Integrate into Sales**
   ```javascript
   // In NewSale.js or POS.js
   import { useInventoryDiscounts } from '../hooks/useInventoryDiscounts';
   
   // Fetch discounts when items change
   // Display in cart
   // Pass to invoice creation (or omit for auto-apply)
   ```

## ⚠️ Important Notes

1. **Auto-Application**: Backend automatically applies discounts if `discount_percentage` and `discount_amount` are omitted from invoice items
2. **Manual Override**: Include discount fields in invoice items to override auto-application
3. **Priority**: Backend handles priority logic, frontend just displays
4. **Caching**: Cache discount lookups to avoid redundant API calls
5. **Error Handling**: Always check `success` flag in API responses

## 📚 Reference Files

- **API Documentation**: `INVENTORY_DISCOUNT_API.md`
- **Full Implementation Plan**: `INVENTORY_DISCOUNT_IMPLEMENTATION_PLAN.md`
- **Template Slice**: `src/store/warehouseSlice.js`
- **Template Hook**: `src/hooks/useDefaultWarehouse.js`

## 🐛 Common Issues

1. **Discounts not showing**: Check company and warehouse match
2. **Wrong discount applied**: Verify priority and rule type
3. **Date validation**: Ensure `posting_date` is within `valid_from`/`valid_upto`
4. **Performance**: Use bulk endpoints for multiple items

---

*For detailed implementation, see `INVENTORY_DISCOUNT_IMPLEMENTATION_PLAN.md`*

