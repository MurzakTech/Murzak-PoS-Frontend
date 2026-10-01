# Sales Analytics & Stock Movement Reports - Requirements Analysis

## Executive Summary

This document analyzes the requirements for **Sales Analytics Report** and **Stock Movement Report** interfaces, mapping them to existing APIs and identifying implementation requirements.

**Status**: Requirements analyzed with detailed implementation plan.

---

## 1. Sales Analytics Report

### Requirements & Acceptance Criteria

#### User Stories
- User can filter by date, branch, item group, customer
- Bar chart showing sales per day
- Pie chart for revenue by item group
- Table is searchable and sortable
- Export buttons for PDF/Excel work
- Loading states and empty states implemented

### Existing API Coverage

✅ **Partially Covered**:
- `listSalesInvoices` - Lists sales invoices with filters (customer, date range, status)
- `listPOSInvoices` - Lists POS invoices with filters
- Both APIs support: `company`, `customer`, `from_date`, `to_date`, `status`, `limit`, `offset`, `search_term`

⚠️ **Limitations**:
- No aggregation/summarization endpoints for analytics
- Data must be aggregated on frontend
- No revenue breakdown by item group endpoint
- No sales per day aggregation endpoint

### Gaps Identified

❌ **Missing APIs/Features Required**:

1. **Sales Analytics API** (RECOMMENDED - Backend Aggregation)
   - Endpoint needed: `sales_analytics_report`
   - Returns: Aggregated sales data for analytics
   - Parameters: 
     - `company` (required)
     - `start_date`, `end_date` (optional)
     - `warehouse`/`branch` (optional)
     - `item_group` (optional)
     - `customer` (optional)
   - Returns: 
     ```json
     {
       "daily_sales": [
         { "date": "2024-01-01", "total_amount": 15000.00, "total_qty": 45, "invoice_count": 12 }
       ],
       "revenue_by_item_group": [
         { "item_group": "Electronics", "total_revenue": 50000.00, "total_qty": 120 }
       ],
       "summary": {
         "total_revenue": 150000.00,
         "total_quantity": 450,
         "total_invoices": 150,
         "average_order_value": 1000.00
       }
     }
     ```

2. **Alternative: Frontend Aggregation** (Fallback)
   - Use existing `listSalesInvoices` and `listPOSInvoices` APIs
   - Fetch all invoices in date range
   - Aggregate data in frontend (performance concerns with large datasets)
   - Requires invoice items data (may need additional API calls)

3. **PDF/Excel Export API** (RECOMMENDED)
   - Endpoint needed: `export_sales_analytics_report`
   - Parameters: Same as analytics API + `format` (pdf/excel)
   - Returns: File download
   - Alternative: Client-side export using libraries (jsPDF, xlsx)

### Implementation Strategy

#### Option A: Backend API (Recommended)
**Pros**:
- Better performance (aggregation on server)
- Handles large datasets efficiently
- Can optimize queries
- Consistent with backend architecture

**Cons**:
- Requires backend development
- Timeline dependency

#### Option B: Frontend Aggregation (Fallback)
**Pros**:
- Can start immediately
- No backend dependency
- Uses existing APIs

**Cons**:
- Performance issues with large datasets
- May need multiple API calls
- Complex frontend logic
- May need invoice item details (additional API calls)

**Recommendation**: Implement Option B for MVP, plan migration to Option A.

### UI Component Structure

```
SalesAnalytics/
├── SalesAnalyticsReport.js (Main container)
├── components/
│   ├── ReportFilters.jsx
│   │   ├── DateRangePicker
│   │   ├── Branch/Warehouse Select
│   │   ├── ItemGroup Select
│   │   └── Customer Select
│   ├── SalesPerDayChart.jsx (Bar Chart)
│   ├── RevenueByItemGroupChart.jsx (Pie Chart)
│   ├── SalesAnalyticsTable.jsx (Searchable, Sortable, Paginated)
│   ├── ExportButtons.jsx (PDF/Excel)
│   ├── LoadingState.jsx
│   └── EmptyState.jsx
```

### Data Flow

```
User selects filters
    ↓
Fetch invoices (listSalesInvoices + listPOSInvoices)
    ↓
Process & aggregate data:
  - Group by date → daily_sales
  - Group by item_group → revenue_by_item_group
  - Calculate summary metrics
    ↓
Display:
  - Bar chart (daily sales)
  - Pie chart (revenue by item group)
  - Table (detailed invoice data)
    ↓
Export (CSV/Excel/PDF)
```

### Technical Implementation Details

#### Filters
Based on existing `SalesHistory.js` pattern:
- **Date Range**: Material-UI DatePicker or native HTML5 date inputs
- **Branch/Warehouse**: Select dropdown (from `warehouseSlice`)
- **Item Group**: Select dropdown (from `productSlice.getItemGroups`)
- **Customer**: Select dropdown (autocomplete/searchable - from `customerSlice`)

#### Charts (Recharts - Already in dependencies)
- **Bar Chart**: `BarChart` from recharts (see Dashboard/index.js for example)
- **Pie Chart**: `PieChart` from recharts

#### Table (Material-UI)
- Searchable: Client-side search on invoice fields
- Sortable: Material-UI Table with sort handlers
- Paginated: Using existing pagination pattern (Redux state)

#### Export Functionality

**CSV Export** (Already implemented in codebase):
- Pattern from `StockSummary.js`, `StockLedger.js`
- Client-side CSV generation using Blob API

**Excel Export**:
- Option 1: Use `xlsx` library (not in dependencies - need to add)
- Option 2: Generate CSV and rename (works but not true Excel)

**PDF Export**:
- Option 1: Use `jspdf` + `jspdf-autotable` (not in dependencies - need to add)
- Option 2: Use browser print to PDF (limited formatting)
- Option 3: Backend API for PDF generation (recommended for production)

#### Loading States
- `CircularProgress` component (Material-UI)
- Skeleton loaders for charts/table

#### Empty States
- Material-UI `Alert` or custom empty state component
- Show helpful message when no data

### Redux State Structure

```javascript
// src/store/salesAnalyticsSlice.js
const salesAnalyticsSlice = createSlice({
  name: 'salesAnalytics',
  initialState: {
    dailySales: [],
    revenueByItemGroup: [],
    summary: null,
    tableData: [],
    loading: false,
    error: null,
    filters: {
      start_date: null,
      end_date: null,
      warehouse: null,
      item_group: null,
      customer: null,
    },
    pagination: {
      page: 1,
      page_size: 25,
      total: 0,
    },
    sort: {
      field: 'posting_date',
      order: 'desc',
    },
  },
  reducers: {
    setFilters: (state, action) => { ... },
    setSort: (state, action) => { ... },
    setPage: (state, action) => { ... },
  },
  extraReducers: (builder) => {
    // Handle async thunks for fetching analytics data
  }
});
```

### File Structure

```
src/
├── pages/
│   └── Reports/
│       ├── SalesAnalytics.js
├── components/
│   └── Reports/
│       └── SalesAnalytics/
│           ├── ReportFilters.jsx
│           ├── SalesPerDayChart.jsx
│           ├── RevenueByItemGroupChart.jsx
│           ├── SalesAnalyticsTable.jsx
│           ├── ExportButtons.jsx
│           ├── LoadingState.jsx
│           └── EmptyState.jsx
├── hooks/
│   └── useSalesAnalytics.js
└── store/
    └── salesAnalyticsSlice.js
```

---

## 2. Stock Movement Report

### Requirements

Based on inventory reports analysis, Stock Movement Report should include:
- In/out movement summary
- Turnover rates
- Days of stock on hand
- Movement patterns

### Existing API Coverage

✅ **Partially Available**:
- `inventory_movement_report` - Returns received, issued, transferred quantities by item
  - Parameters: `start_date`, `end_date`
  - Returns: `item_code`, `received_qty`, `issued_qty`, `transferred_qty`

### Implementation Status

**Basic Stock Movement Report** can be built using existing API:
- ✅ In/out movement summary - Available via `inventory_movement_report`
- ❌ Turnover rates - Needs new API
- ❌ Days of stock on hand - Needs new API
- ❌ Movement patterns - Needs new API

### UI Component Structure

```
StockMovementReport/
├── StockMovementReport.js (Main container)
├── components/
│   ├── ReportFilters.jsx (Date range, warehouse, item group)
│   ├── MovementSummary.jsx (In/Out summary cards)
│   ├── MovementTable.jsx (Searchable, sortable, paginated table)
│   ├── TurnoverRates.jsx (Turnover metrics - if API available)
│   ├── DaysOnHand.jsx (Days on hand metrics - if API available)
│   ├── MovementPatterns.jsx (Pattern charts - if API available)
│   ├── ExportButtons.jsx (PDF/Excel)
│   ├── LoadingState.jsx
│   └── EmptyState.jsx
```

### Implementation Plan

#### Phase 1: Basic Movement Report (Can Start Now)
- Use existing `inventory_movement_report` API
- Display movement summary (received, issued, transferred)
- Searchable, sortable, paginated table
- CSV export
- Date range filters

#### Phase 2: Enhanced Features (Requires New APIs)
- Turnover rates
- Days of stock on hand
- Movement patterns/trends
- Enhanced export (PDF/Excel)

### File Structure

```
src/
├── pages/
│   └── Reports/
│       └── StockMovement.js (Reuse from inventory reports analysis)
├── components/
│   └── Reports/
│       └── StockMovement/
│           ├── ReportFilters.jsx
│           ├── MovementSummary.jsx
│           ├── MovementTable.jsx
│           ├── ExportButtons.jsx
│           ├── LoadingState.jsx
│           └── EmptyState.jsx
├── hooks/
│   └── useInventoryReports.js (Extend existing)
└── store/
    └── reportsSlice.js (Extend existing)
```

---

## Implementation Checklist

### Sales Analytics Report

#### Phase 1: Basic Implementation (Using Existing APIs)
- [ ] Create `SalesAnalytics.js` page component
- [ ] Create `ReportFilters.jsx` component (date, branch, item group, customer)
- [ ] Create `SalesPerDayChart.jsx` (Bar chart using Recharts)
- [ ] Create `RevenueByItemGroupChart.jsx` (Pie chart using Recharts)
- [ ] Create `SalesAnalyticsTable.jsx` (Searchable, sortable, paginated)
- [ ] Create `ExportButtons.jsx` (CSV export - Excel/PDF if libraries added)
- [ ] Create `LoadingState.jsx` component
- [ ] Create `EmptyState.jsx` component
- [ ] Create `useSalesAnalytics.js` hook
- [ ] Create `salesAnalyticsSlice.js` Redux slice
- [ ] Integrate with existing sales APIs (`listSalesInvoices`, `listPOSInvoices`)
- [ ] Implement data aggregation logic (frontend)
- [ ] Add route in `routes.js`
- [ ] Test with real data

#### Phase 2: Enhanced Features
- [ ] Add Excel export (xlsx library)
- [ ] Add PDF export (jspdf library or backend API)
- [ ] Optimize data aggregation for large datasets
- [ ] Add caching for better performance

#### Phase 3: Backend API Integration (When Available)
- [ ] Update hook to use `sales_analytics_report` API
- [ ] Remove frontend aggregation logic
- [ ] Update export to use backend export API

### Stock Movement Report

#### Phase 1: Basic Implementation
- [ ] Create/Update `StockMovement.js` page component
- [ ] Create `MovementSummary.jsx` component
- [ ] Create `MovementTable.jsx` (using existing pattern)
- [ ] Integrate with `inventory_movement_report` API
- [ ] Add filters (date range, warehouse, item group)
- [ ] Add CSV export
- [ ] Add loading/empty states
- [ ] Add route in `routes.js`
- [ ] Test with real data

#### Phase 2: Enhanced Features (When APIs Available)
- [ ] Add turnover rates section
- [ ] Add days on hand section
- [ ] Add movement patterns charts
- [ ] Add PDF/Excel export

---

## Dependencies to Add

### Required for Sales Analytics (Phase 2)
```json
{
  "xlsx": "^0.18.5",  // For Excel export
  "jspdf": "^2.5.1",  // For PDF export
  "jspdf-autotable": "^3.5.31"  // For PDF tables
}
```

### Already Available
- ✅ `recharts` - For charts
- ✅ `@mui/material` - For UI components
- ✅ `axios` - For API calls
- ✅ `@reduxjs/toolkit` - For state management

---

## Code Patterns to Follow

### 1. Filter Component Pattern
Reference: `SalesHistory.js` (lines 139-145)
```javascript
const handleFilterChange = (key, value) => {
  dispatch(setFilters({ [key]: value || undefined }));
};
```

### 2. Chart Pattern
Reference: `Dashboard/index.js` (lines 1183-1260)
```javascript
<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="total_amount" fill="#8884d8" />
</BarChart>
```

### 3. CSV Export Pattern
Reference: `StockSummary.js` (lines 108-141)
```javascript
const exportToCSV = () => {
  const headers = ['Column1', 'Column2'];
  const rows = data.map(item => [item.field1, item.field2]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  // ... Blob creation and download
};
```

### 4. Table with Pagination Pattern
Reference: `StockSummary.js`, `SalesHistory.js`
- Use Material-UI Table
- Use Redux for pagination state
- Client-side sorting (or API-based if supported)

### 5. Loading State Pattern
Reference: Multiple files
```javascript
{isLoading ? (
  <Box display="flex" justifyContent="center" p={3}>
    <CircularProgress />
  </Box>
) : (
  // Content
)}
```

### 6. Empty State Pattern
Reference: Multiple files
```javascript
{data.length === 0 && !isLoading ? (
  <Alert severity="info">No data available</Alert>
) : (
  // Content
)}
```

---

## API Integration Examples

### Fetching Sales Analytics Data (Frontend Aggregation)

```javascript
// useSalesAnalytics.js
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { listSalesInvoices, listPOSInvoices } from '../store/salesSlice';

export const useSalesAnalytics = (filters) => {
  const dispatch = useAppDispatch();
  const [aggregatedData, setAggregatedData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      
      // Fetch both sales and POS invoices
      const salesParams = {
        company: filters.company,
        from_date: filters.start_date,
        to_date: filters.end_date,
        customer: filters.customer,
        limit: 1000, // Fetch all for aggregation
      };
      
      const [salesResult, posResult] = await Promise.all([
        dispatch(listSalesInvoices(salesParams)),
        dispatch(listPOSInvoices(salesParams)),
      ]);
      
      // Aggregate data
      const dailySales = aggregateDailySales(salesResult.payload, posResult.payload);
      const revenueByItemGroup = aggregateByItemGroup(salesResult.payload, posResult.payload);
      
      setAggregatedData({ dailySales, revenueByItemGroup });
      setLoading(false);
    };
    
    if (filters.company && filters.start_date && filters.end_date) {
      fetchAnalytics();
    }
  }, [filters, dispatch]);
  
  return { data: aggregatedData, loading };
};
```

### Using Stock Movement API

```javascript
// Already documented in REPORTS_API_DOCUMENTATION.md
const response = await axiosInstance.get(
  '/api/method/techsavanna_pos.api.reports.inventory_movement_report',
  {
    params: {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }
  }
);
```

---

## Testing Considerations

### Unit Tests
- Data aggregation functions
- Filter logic
- Sort functionality
- Export functions

### Integration Tests
- API integration
- Redux state updates
- Component rendering with data

### User Acceptance Tests
- Filter combinations
- Chart rendering with various data sizes
- Export functionality
- Loading and empty states
- Responsive design

---

## Performance Considerations

### Frontend Aggregation Limitations
- Large datasets (>1000 invoices) may cause performance issues
- Consider pagination or chunking for data processing
- Use React.memo for chart components
- Debounce filter changes

### Optimization Strategies
1. **Caching**: Cache aggregated data for same filter combinations
2. **Virtualization**: Use react-window for large tables
3. **Lazy Loading**: Load charts only when visible
4. **Backend API**: Eventually move aggregation to backend (recommended)

---

## Accessibility Considerations

- Ensure charts are accessible (ARIA labels)
- Keyboard navigation for filters
- Screen reader support for tables
- Color contrast for charts (WCAG AA)

---

## Summary

### Sales Analytics Report
- **Status**: Can start implementation using existing APIs (frontend aggregation)
- **Dependencies**: None for Phase 1, xlsx/jspdf for Phase 2
- **Timeline**: Phase 1 can be completed immediately
- **Risk**: Low for Phase 1, Medium for performance with large datasets

### Stock Movement Report
- **Status**: Basic implementation available, enhanced features need APIs
- **Dependencies**: None for Phase 1
- **Timeline**: Phase 1 can be completed immediately
- **Risk**: Low

### Next Steps
1. Start with Sales Analytics Phase 1 (basic implementation)
2. Start with Stock Movement Phase 1 (basic implementation)
3. Coordinate with backend team for enhanced APIs
4. Plan migration to backend aggregation when APIs are ready

