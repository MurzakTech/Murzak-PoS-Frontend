# Inventory Reports Requirements Analysis

## Executive Summary

This document analyzes the requirements for the Inventory Reports interface, mapping them to existing APIs and identifying gaps that need to be addressed.

**Status**: Requirements analyzed and mapped to implementation strategy.

---

## 1. Inventory Valuation Report

### Requirements
- Current inventory value
- By category/value breakdown
- Cost method comparison
- Historical value trends

### Existing API Coverage
✅ **Partially Covered**:
- `inventory_value_report` - Returns total inventory value by warehouse
- `inventory_summary_report` - Returns stock quantity and value by warehouse

### Gaps Identified
❌ **Missing APIs Required**:
1. **Category/Value Breakdown API**
   - Endpoint needed: `inventory_value_by_category_report`
   - Returns: Value breakdown by item category/group
   - Parameters: `company`, `warehouse` (optional), `item_group` (optional)

2. **Cost Method Comparison API**
   - Endpoint needed: `inventory_cost_method_comparison_report`
   - Returns: Inventory valuation using different cost methods (FIFO, LIFO, Weighted Average)
   - Parameters: `company`, `warehouse` (optional), `cost_methods[]`

3. **Historical Value Trends API**
   - Endpoint needed: `inventory_value_trends_report`
   - Returns: Historical inventory values over time
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional), `period` (daily/weekly/monthly)

### UI Component Structure
```
InventoryValuationReport/
├── ValuationOverview.jsx (Current total value cards)
├── CategoryBreakdown.jsx (Chart + Table by category)
├── CostMethodComparison.jsx (Comparison table/chart)
└── ValueTrends.jsx (Line chart with date range selector)
```

---

## 2. Stock Movement Analysis

### Requirements
- In/out movement summary
- Turnover rates
- Days of stock on hand
- Movement patterns

### Existing API Coverage
✅ **Partially Covered**:
- `inventory_movement_report` - Returns received, issued, transferred quantities by item
  - Parameters: `start_date`, `end_date`
  - Returns: `item_code`, `received_qty`, `issued_qty`, `transferred_qty`

### Gaps Identified
❌ **Missing APIs Required**:
1. **Enhanced Movement Summary API**
   - Enhancement needed: Add warehouse grouping, category grouping
   - Current API: Only provides item-level data
   - Suggested enhancement: Add optional `group_by` parameter (warehouse, category, item)

2. **Turnover Rates API** (NEW)
   - Endpoint needed: `inventory_turnover_report`
   - Returns: Turnover rate calculations for items
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional), `item_group` (optional)
   - Returns: `item_code`, `item_name`, `average_stock`, `cost_of_sales`, `turnover_rate`, `turnover_days`

3. **Days of Stock on Hand API** (NEW)
   - Endpoint needed: `inventory_days_on_hand_report`
   - Returns: Days of stock remaining based on current stock and average consumption
   - Parameters: `company`, `warehouse` (optional), `item_group` (optional)
   - Returns: `item_code`, `item_name`, `current_stock`, `avg_daily_sales`, `days_on_hand`

4. **Movement Patterns API** (NEW)
   - Endpoint needed: `inventory_movement_patterns_report`
   - Returns: Movement trends and patterns (seasonal, trending items, etc.)
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional), `analysis_type` (seasonal/trend/forecast)
   - Returns: Time-series data for pattern analysis

### UI Component Structure
```
StockMovementAnalysis/
├── MovementSummary.jsx (In/Out summary cards and table)
├── TurnoverRates.jsx (Turnover rate table with filters)
├── DaysOnHand.jsx (Days of stock on hand dashboard)
└── MovementPatterns.jsx (Charts showing patterns over time)
```

---

## 3. Aging Stock Report

### Requirements
- Stock by age brackets
- Slow-moving items
- Obsolescence risk
- Action recommendations

### Existing API Coverage
✅ **Fully Covered (Basic)**:
- `stock_aging_report` - Returns stock categorized by age brackets (0-30, 31-60, 61-90, 90+ days)
  - Returns: Age brackets with item details (`item_code`, `warehouse`, `actual_qty`, `age_days`)

### Gaps Identified
⚠️ **Enhancements Needed**:
1. **Slow-Moving Items Enhancement**
   - Current API: Provides age brackets but doesn't identify slow-moving items
   - Enhancement needed: Add `slow_moving_threshold` parameter and flag items
   - Suggested: Add `movement_rate` field to identify items with low movement

2. **Obsolescence Risk API** (NEW)
   - Endpoint needed: `inventory_obsolescence_risk_report`
   - Returns: Items with high obsolescence risk based on age, movement, and business rules
   - Parameters: `company`, `warehouse` (optional), `risk_level` (low/medium/high)
   - Returns: `item_code`, `item_name`, `age_days`, `last_movement_date`, `risk_score`, `risk_level`

3. **Action Recommendations API** (NEW)
   - Endpoint needed: `inventory_aging_recommendations_report`
   - Returns: Recommended actions for aging stock items
   - Parameters: `company`, `warehouse` (optional)
   - Returns: `item_code`, `item_name`, `age_bracket`, `recommended_action` (discount/transfer/dispose), `priority`

### UI Component Structure
```
AgingStockReport/
├── AgeBrackets.jsx (Existing - Tabs/Tables by age bracket)
├── SlowMovingItems.jsx (Table of slow-moving items)
├── ObsolescenceRisk.jsx (Risk dashboard with color coding)
└── Recommendations.jsx (Actionable recommendations list)
```

---

## 4. Performance Metrics

### Requirements
- Stock accuracy rate
- Count variances
- Adjustment trends
- Transfer efficiency

### Existing API Coverage
❌ **Not Covered**:
- No existing APIs for performance metrics

### Gaps Identified
❌ **All APIs Required (NEW)**:
1. **Stock Accuracy Rate API**
   - Endpoint needed: `inventory_accuracy_report`
   - Returns: Stock accuracy metrics (book vs actual)
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional)
   - Returns: `warehouse`, `total_items_counted`, `items_with_variance`, `accuracy_rate`, `variance_count`

2. **Count Variances API**
   - Endpoint needed: `inventory_variance_report`
   - Returns: Detailed variance analysis from stock counts
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional), `variance_threshold` (optional)
   - Returns: `item_code`, `item_name`, `book_qty`, `counted_qty`, `variance_qty`, `variance_value`, `variance_percentage`

3. **Adjustment Trends API**
   - Endpoint needed: `inventory_adjustment_trends_report`
   - Returns: Trends in stock adjustments over time
   - Parameters: `company`, `start_date`, `end_date`, `warehouse` (optional), `adjustment_type` (optional)
   - Returns: Time-series data of adjustments (quantity, value, count)

4. **Transfer Efficiency API**
   - Endpoint needed: `inventory_transfer_efficiency_report`
   - Returns: Metrics on stock transfer performance
   - Parameters: `company`, `start_date`, `end_date`, `from_warehouse` (optional), `to_warehouse` (optional)
   - Returns: `total_transfers`, `completed_transfers`, `pending_transfers`, `average_completion_time`, `transfer_accuracy`

### UI Component Structure
```
PerformanceMetrics/
├── AccuracyDashboard.jsx (Accuracy rate cards and chart)
├── VarianceReport.jsx (Variance table with filters)
├── AdjustmentTrends.jsx (Trend charts over time)
└── TransferEfficiency.jsx (Transfer metrics dashboard)
```

---

## Implementation Strategy

### Phase 1: Foundation (Use Existing APIs)
**Timeline**: Immediate
**Components to Build**:
1. Reports landing page with navigation
2. Basic Inventory Valuation Report (using `inventory_value_report`)
3. Basic Stock Movement Analysis (using `inventory_movement_report`)
4. Basic Aging Stock Report (using `stock_aging_report`)

**Files to Create**:
- `src/pages/Reports/index.js` (Update - add navigation)
- `src/pages/Reports/InventoryValuation.js`
- `src/pages/Reports/StockMovement.js`
- `src/pages/Reports/AgingStock.js`
- `src/hooks/useInventoryReports.js`
- `src/store/reportsSlice.js`

### Phase 2: Enhanced Features (New APIs Required)
**Timeline**: After backend APIs are ready
**Components to Add**:
1. Enhanced valuation features (category breakdown, cost comparison, trends)
2. Enhanced movement analysis (turnover rates, days on hand, patterns)
3. Enhanced aging report (slow-moving, obsolescence, recommendations)
4. Performance metrics dashboard (all new APIs)

### Phase 3: Advanced Features
**Timeline**: Future
- Export to PDF/Excel
- Scheduled reports
- Report templates
- Custom date ranges and filters
- Dashboard widgets

---

## UI/UX Recommendations

### Layout Structure
```
Reports/
├── Sidebar Navigation (Report Categories)
│   ├── Inventory Valuation
│   ├── Stock Movement
│   ├── Aging Stock
│   └── Performance Metrics
├── Main Content Area
│   ├── Report Filters (Date range, Warehouse, Category, etc.)
│   ├── Report Controls (Export, Refresh, Print)
│   ├── Report Content (Charts, Tables, Cards)
│   └── Report Footer (Generated date, filters applied)
```

### Design Patterns (Based on Existing Codebase)
- Use Material-UI components (consistent with codebase)
- Use Redux for state management (follow existing patterns)
- Use Recharts for data visualization (already in dependencies)
- Follow the card-based layout pattern seen in `StockSummary.js`
- Use consistent filtering UI (Date pickers, Select dropdowns, Search)

### Key Features
1. **Date Range Selectors**: Standard date pickers for time-based reports
2. **Warehouse Filtering**: Multi-select or dropdown (like in StockSummary)
3. **Export Functionality**: CSV/Excel export (like in StockSummary)
4. **Loading States**: CircularProgress indicators
5. **Error Handling**: Alert components for errors
6. **Empty States**: Helpful messages when no data
7. **Responsive Design**: Mobile-friendly layouts

---

## API Integration Pattern

### Recommended Hook Structure
Based on existing patterns (`useInventoryDiscounts`, `useStockTransfer`):

```javascript
// src/hooks/useInventoryReports.js
export const useInventoryReports = () => {
  // Valuation reports
  const getValuationReport = async (params) => { ... }
  const getCategoryBreakdown = async (params) => { ... }
  const getCostMethodComparison = async (params) => { ... }
  const getValueTrends = async (params) => { ... }
  
  // Movement reports
  const getMovementReport = async (params) => { ... }
  const getTurnoverRates = async (params) => { ... }
  const getDaysOnHand = async (params) => { ... }
  const getMovementPatterns = async (params) => { ... }
  
  // Aging reports
  const getAgingReport = async (params) => { ... }
  const getSlowMovingItems = async (params) => { ... }
  const getObsolescenceRisk = async (params) => { ... }
  const getAgingRecommendations = async (params) => { ... }
  
  // Performance metrics
  const getAccuracyReport = async (params) => { ... }
  const getVarianceReport = async (params) => { ... }
  const getAdjustmentTrends = async (params) => { ... }
  const getTransferEfficiency = async (params) => { ... }
  
  return { ... }
}
```

### Redux Slice Structure
Based on existing `inventorySlice.js` pattern:

```javascript
// src/store/reportsSlice.js
const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    valuation: { data: null, loading: false, error: null },
    movement: { data: null, loading: false, error: null },
    aging: { data: null, loading: false, error: null },
    performance: { data: null, loading: false, error: null },
    filters: { start_date: null, end_date: null, warehouse: null },
  },
  reducers: { ... },
  extraReducers: (builder) => { ... }
})
```

---

## Data Visualization Requirements

### Charts Needed
1. **Bar Charts**: Category breakdowns, comparison data
2. **Line Charts**: Trends over time, historical data
3. **Pie/Donut Charts**: Value distribution, category shares
4. **Tables**: Detailed data views (with sorting, filtering, pagination)
5. **KPI Cards**: Summary metrics (total value, turnover rate, accuracy, etc.)

### Library
- **Recharts** (already in dependencies) - Recommended for all chart types
- Material-UI Table components for data tables
- Material-UI Card components for KPI displays

---

## File Structure Recommendation

```
src/
├── pages/
│   └── Reports/
│       ├── index.js (Main reports landing page)
│       ├── InventoryValuation.js
│       ├── StockMovement.js
│       ├── AgingStock.js
│       └── PerformanceMetrics.js
├── components/
│   └── Reports/
│       ├── ReportFilters.jsx (Reusable filter component)
│       ├── ReportHeader.jsx (Title, actions, export buttons)
│       ├── Valuation/
│       │   ├── ValuationOverview.jsx
│       │   ├── CategoryBreakdown.jsx
│       │   ├── CostMethodComparison.jsx
│       │   └── ValueTrends.jsx
│       ├── Movement/
│       │   ├── MovementSummary.jsx
│       │   ├── TurnoverRates.jsx
│       │   ├── DaysOnHand.jsx
│       │   └── MovementPatterns.jsx
│       ├── Aging/
│       │   ├── AgeBrackets.jsx
│       │   ├── SlowMovingItems.jsx
│       │   ├── ObsolescenceRisk.jsx
│       │   └── Recommendations.jsx
│       └── Performance/
│           ├── AccuracyDashboard.jsx
│           ├── VarianceReport.jsx
│           ├── AdjustmentTrends.jsx
│           └── TransferEfficiency.jsx
├── hooks/
│   └── useInventoryReports.js
└── store/
    └── reportsSlice.js
```

---

## Summary

### Coverage Status
- ✅ **1 API Fully Available**: Stock Aging Report (basic)
- ⚠️ **2 APIs Partially Available**: Inventory Valuation, Stock Movement (basic features)
- ❌ **13+ APIs Needed**: Enhanced features and performance metrics

### Next Steps
1. **Immediate**: Build Phase 1 components using existing APIs
2. **Short-term**: Coordinate with backend team for new API development
3. **Implementation**: Follow existing codebase patterns (Redux, Material-UI, hooks)
4. **Testing**: Test with real data once APIs are available

### Risk Assessment
- **Low Risk**: Phase 1 implementation (using existing APIs)
- **Medium Risk**: Backend API development timeline dependencies
- **Mitigation**: Build UI components with mock data structure matching expected API responses

---

## Questions for Clarification

1. **API Development Timeline**: When will new APIs be available?
2. **Priority**: Which report type should be prioritized?
3. **Permissions**: Are there role-based access controls for reports?
4. **Export Format**: CSV only or also PDF/Excel?
5. **Historical Data**: How far back should historical trends go?
6. **Real-time vs Scheduled**: Should reports show real-time data or allow scheduled generation?

