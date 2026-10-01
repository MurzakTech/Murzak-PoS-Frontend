# Reports Endpoints Requirements

## Overview

This document lists all endpoints required to have both **Inventory Reports** and **Sales Analytics Reports** fully functional.

---

## Endpoint Status Legend

- ✅ **Available** - Endpoint exists and is ready to use
- ⚠️ **Partial** - Endpoint exists but needs enhancement
- ❌ **Required** - New endpoint needs to be created
- 🔵 **Optional** - Recommended for better performance/features

---

## Sales Analytics Reports Endpoints

### Currently Available (✅)

1. **List Sales Invoices**
   - Endpoint: `techsavanna_pos.api.sales_api.list_sales_invoices`
   - Status: ✅ Available
   - Parameters: `company`, `customer`, `from_date`, `to_date`, `status`, `limit`, `offset`, `search_term`
   - Used for: Frontend aggregation of sales data

2. **List POS Invoices**
   - Endpoint: `techsavanna_pos.api.sales_api.list_pos_invoices`
   - Status: ✅ Available
   - Parameters: `company`, `customer`, `from_date`, `to_date`, `status`, `limit`, `offset`, `search_term`, `pos_profile`
   - Used for: Frontend aggregation of POS sales data

### Required for Full Functionality (❌)

3. **Sales Analytics Report** 🔵 Recommended
   - Endpoint: `techsavanna_pos.api.reports.sales_analytics_report` (NEW)
   - Status: ❌ Required
   - Method: `GET`
   - Parameters:
     ```json
     {
       "company": "string (required)",
       "start_date": "YYYY-MM-DD (optional)",
       "end_date": "YYYY-MM-DD (optional)",
       "warehouse": "string (optional)",
       "item_group": "string (optional)",
       "customer": "string (optional)",
       "group_by": "date|item_group|customer (optional, default: date)"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "daily_sales": [
           {
             "date": "2024-01-01",
             "total_amount": 15000.00,
             "total_qty": 45,
             "invoice_count": 12,
             "average_order_value": 1250.00
           }
         ],
         "revenue_by_item_group": [
           {
             "item_group": "Electronics",
             "total_revenue": 50000.00,
             "total_qty": 120,
             "item_count": 25,
             "percentage": 33.33
           }
         ],
         "summary": {
           "total_revenue": 150000.00,
           "total_quantity": 450,
           "total_invoices": 150,
           "average_order_value": 1000.00
         },
         "table_data": [
           {
             "invoice_no": "SINV-00001",
             "posting_date": "2024-01-01",
             "customer": "Customer A",
             "item_group": "Electronics",
             "total_amount": 5000.00,
             "total_qty": 10
           }
         ]
       }
     }
     ```
   - Purpose: Aggregated sales data for analytics (better performance than frontend aggregation)

4. **Export Sales Analytics Report** 🔵 Optional
   - Endpoint: `techsavanna_pos.api.reports.export_sales_analytics_report` (NEW)
   - Status: ❌ Required (for PDF/Excel export)
   - Method: `GET` or `POST`
   - Parameters: Same as `sales_analytics_report` + `format` (pdf/excel/csv)
   - Response: File download (binary)
   - Purpose: Server-side export generation (better than client-side)

---

## Inventory Reports Endpoints

### Currently Available (✅)

5. **Inventory Summary Report**
   - Endpoint: `techsavanna_pos.api.reports.inventory_summary_report`
   - Status: ✅ Available
   - Parameters: None
   - Response: Array of `{ warehouse, total_qty, total_value }`
   - Purpose: Total stock quantity and value by warehouse

6. **Inventory Movement Report**
   - Endpoint: `techsavanna_pos.api.reports.inventory_movement_report`
   - Status: ✅ Available
   - Parameters: `start_date` (required), `end_date` (required)
   - Response: Array of `{ item_code, received_qty, issued_qty, transferred_qty }`
   - Purpose: Stock movement details (received, issued, transferred)

7. **Stock Aging Report**
   - Endpoint: `techsavanna_pos.api.reports.stock_aging_report`
   - Status: ✅ Available
   - Parameters: None
   - Response: Object with age brackets `{ "0-30": [...], "31-60": [...], "61-90": [...], "90+": [...] }`
   - Purpose: Stock categorized by age brackets

8. **Inventory Value Report**
   - Endpoint: `techsavanna_pos.api.reports.inventory_value_report`
   - Status: ✅ Available
   - Parameters: None
   - Response: Array of `{ warehouse, total_value }`
   - Purpose: Total inventory value by warehouse

### Required for Full Functionality (❌)

#### Inventory Valuation Report Endpoints

9. **Inventory Value by Category Report**
   - Endpoint: `techsavanna_pos.api.reports.inventory_value_by_category_report` (NEW)
   - Status: ❌ Required
   - Method: `GET`
   - Parameters:
     ```json
     {
       "company": "string (required)",
       "warehouse": "string (optional)",
       "item_group": "string (optional)"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "data": [
         {
           "item_group": "Electronics",
           "total_value": 50000.00,
           "total_qty": 120,
           "item_count": 25,
           "percentage": 33.33
         }
       ]
     }
     ```
   - Purpose: Value breakdown by item category/group

10. **Inventory Cost Method Comparison Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_cost_method_comparison_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "warehouse": "string (optional)",
        "cost_methods": ["FIFO", "LIFO", "Weighted Average"] (optional, default: all)
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": {
          "FIFO": {
            "total_value": 150000.00,
            "item_count": 100
          },
          "LIFO": {
            "total_value": 145000.00,
            "item_count": 100
          },
          "Weighted Average": {
            "total_value": 147500.00,
            "item_count": 100
          }
        }
      }
      ```
    - Purpose: Compare inventory valuation using different cost methods

11. **Inventory Value Trends Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_value_trends_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (required)",
        "end_date": "YYYY-MM-DD (required)",
        "warehouse": "string (optional)",
        "period": "daily|weekly|monthly (optional, default: daily)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "period": "2024-01-01",
            "total_value": 150000.00,
            "change": 0.00,
            "change_percentage": 0.00
          }
        ]
      }
      ```
    - Purpose: Historical inventory values over time

#### Stock Movement Analysis Endpoints

12. **Inventory Turnover Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_turnover_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (required)",
        "end_date": "YYYY-MM-DD (required)",
        "warehouse": "string (optional)",
        "item_group": "string (optional)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "item_code": "ITEM-001",
            "item_name": "Product 1",
            "average_stock": 100.00,
            "cost_of_sales": 5000.00,
            "turnover_rate": 50.00,
            "turnover_days": 7.30
          }
        ]
      }
      ```
    - Purpose: Calculate turnover rates for inventory items

13. **Inventory Days on Hand Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_days_on_hand_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "warehouse": "string (optional)",
        "item_group": "string (optional)",
        "period_days": "integer (optional, default: 30)" // Days to calculate average consumption
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "item_code": "ITEM-001",
            "item_name": "Product 1",
            "current_stock": 100.00,
            "avg_daily_sales": 10.00,
            "days_on_hand": 10.00,
            "status": "normal|low|critical"
          }
        ]
      }
      ```
    - Purpose: Days of stock remaining based on current stock and average consumption

14. **Inventory Movement Patterns Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_movement_patterns_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (required)",
        "end_date": "YYYY-MM-DD (required)",
        "warehouse": "string (optional)",
        "analysis_type": "seasonal|trend|forecast (optional, default: trend)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": {
          "trends": [
            {
              "item_code": "ITEM-001",
              "item_name": "Product 1",
              "trend": "increasing|decreasing|stable",
              "change_percentage": 15.5
            }
          ],
          "time_series": [
            {
              "date": "2024-01-01",
              "received": 100.00,
              "issued": 80.00,
              "net_movement": 20.00
            }
          ]
        }
      }
      ```
    - Purpose: Movement trends and patterns over time

#### Aging Stock Report Endpoints

15. **Stock Aging Report Enhancement** ⚠️
    - Endpoint: `techsavanna_pos.api.reports.stock_aging_report` (ENHANCE)
    - Status: ⚠️ Partial (needs enhancement)
    - Current: Returns age brackets
    - Enhancement Needed: Add `slow_moving_threshold` parameter and movement rate data
    - Enhanced Response:
      ```json
      {
        "success": true,
        "data": {
          "0-30": [
            {
              "item_code": "ITEM-001",
              "warehouse": "Main Warehouse",
              "actual_qty": 100.00,
              "age_days": 15,
              "movement_rate": 10.00,
              "is_slow_moving": false
            }
          ]
        }
      }
      ```

16. **Inventory Obsolescence Risk Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_obsolescence_risk_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "warehouse": "string (optional)",
        "risk_level": "low|medium|high (optional, default: all)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "item_code": "ITEM-001",
            "item_name": "Product 1",
            "age_days": 120,
            "last_movement_date": "2024-01-01",
            "current_stock": 50.00,
            "risk_score": 85.5,
            "risk_level": "high",
            "risk_factors": ["high_age", "no_recent_movement"]
          }
        ]
      }
      ```
    - Purpose: Identify items with high obsolescence risk

17. **Inventory Aging Recommendations Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_aging_recommendations_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "warehouse": "string (optional)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "item_code": "ITEM-001",
            "item_name": "Product 1",
            "age_bracket": "90+",
            "age_days": 120,
            "current_stock": 50.00,
            "recommended_action": "discount|transfer|dispose",
            "priority": "high|medium|low",
            "reason": "Item has not moved in 120 days"
          }
        ]
      }
      ```
    - Purpose: Recommended actions for aging stock items

#### Performance Metrics Endpoints

18. **Inventory Accuracy Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_accuracy_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (optional)",
        "end_date": "YYYY-MM-DD (optional)",
        "warehouse": "string (optional)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": {
          "warehouse": "Main Warehouse",
          "total_items_counted": 100,
          "items_with_variance": 5,
          "accuracy_rate": 95.00,
          "variance_count": 5,
          "total_variance_value": 500.00
        }
      }
      ```
    - Purpose: Stock accuracy metrics (book vs actual)

19. **Inventory Variance Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_variance_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (optional)",
        "end_date": "YYYY-MM-DD (optional)",
        "warehouse": "string (optional)",
        "variance_threshold": "decimal (optional)" // Minimum variance to include
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "item_code": "ITEM-001",
            "item_name": "Product 1",
            "book_qty": 100.00,
            "counted_qty": 95.00,
            "variance_qty": -5.00,
            "variance_value": -250.00,
            "variance_percentage": -5.00,
            "reconciliation_date": "2024-01-15"
          }
        ]
      }
      ```
    - Purpose: Detailed variance analysis from stock counts

20. **Inventory Adjustment Trends Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_adjustment_trends_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (required)",
        "end_date": "YYYY-MM-DD (required)",
        "warehouse": "string (optional)",
        "adjustment_type": "increase|decrease|all (optional, default: all)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": [
          {
            "period": "2024-01-01",
            "adjustment_count": 5,
            "total_adjusted_qty": 25.00,
            "total_adjusted_value": 1250.00,
            "increase_count": 3,
            "decrease_count": 2
          }
        ]
      }
      ```
    - Purpose: Trends in stock adjustments over time

21. **Inventory Transfer Efficiency Report**
    - Endpoint: `techsavanna_pos.api.reports.inventory_transfer_efficiency_report` (NEW)
    - Status: ❌ Required
    - Method: `GET`
    - Parameters:
      ```json
      {
        "company": "string (required)",
        "start_date": "YYYY-MM-DD (required)",
        "end_date": "YYYY-MM-DD (required)",
        "from_warehouse": "string (optional)",
        "to_warehouse": "string (optional)"
      }
      ```
    - Response:
      ```json
      {
        "success": true,
        "data": {
          "total_transfers": 50,
          "completed_transfers": 48,
          "pending_transfers": 2,
          "cancelled_transfers": 0,
          "average_completion_time_hours": 24.5,
          "transfer_accuracy": 98.00,
          "on_time_rate": 95.00
        }
      }
      ```
    - Purpose: Metrics on stock transfer performance

---

## Summary

### Endpoint Count

| Category | Available | Partial | Required | Total |
|----------|-----------|---------|----------|-------|
| **Sales Analytics** | 2 | 0 | 2 | 4 |
| **Inventory Valuation** | 2 | 0 | 3 | 5 |
| **Stock Movement** | 1 | 0 | 3 | 4 |
| **Aging Stock** | 1 | 1 | 2 | 4 |
| **Performance Metrics** | 0 | 0 | 4 | 4 |
| **TOTAL** | **6** | **1** | **14** | **21** |

### Priority Classification

#### High Priority (Required for Core Functionality)
1. Sales Analytics Report (#3)
2. Inventory Value by Category Report (#9)
3. Inventory Turnover Report (#12)
4. Inventory Days on Hand Report (#13)
5. Inventory Obsolescence Risk Report (#16)
6. Inventory Accuracy Report (#18)
7. Inventory Variance Report (#19)

#### Medium Priority (Required for Enhanced Features)
8. Export Sales Analytics Report (#4)
9. Inventory Cost Method Comparison Report (#10)
10. Inventory Value Trends Report (#11)
11. Inventory Movement Patterns Report (#14)
12. Inventory Aging Recommendations Report (#17)
13. Inventory Adjustment Trends Report (#20)
14. Inventory Transfer Efficiency Report (#21)
15. Stock Aging Report Enhancement (#15)

#### Low Priority (Nice to Have)
- Server-side export endpoints (can use client-side as fallback)

---

## Implementation Roadmap

### Phase 1: Core Reports (MVP)
**Endpoints Needed**: 7
- Sales Analytics Report (#3)
- Inventory Value by Category Report (#9)
- Inventory Turnover Report (#12)
- Inventory Days on Hand Report (#13)
- Inventory Obsolescence Risk Report (#16)
- Inventory Accuracy Report (#18)
- Inventory Variance Report (#19)

**Timeline**: Can start with existing endpoints, add new ones as ready

### Phase 2: Enhanced Features
**Endpoints Needed**: 8 additional
- All remaining endpoints from Medium Priority

**Timeline**: After Phase 1 is complete

### Phase 3: Advanced Features
**Endpoints Needed**: Optional export endpoints
- Server-side export generation

**Timeline**: Future enhancement

---

## Notes

1. **Backward Compatibility**: All endpoints should follow existing API patterns from `REPORTS_API_DOCUMENTATION.md`
2. **Authentication**: All endpoints should use Bearer token authentication
3. **Response Format**: All endpoints should return `{ success: boolean, data: {...} }` format
4. **Error Handling**: Follow existing error response format
5. **Pagination**: For list endpoints, support `limit` and `offset` parameters
6. **Filtering**: Support common filters (company, warehouse, date range, item_group, customer)

---

## Quick Reference

- **Total Endpoints Available**: 6
- **Total Endpoints Required**: 14
- **Total Endpoints with Enhancements**: 1
- **Total Endpoints for Full Functionality**: 21

For detailed implementation details, see:
- `INVENTORY_REPORTS_ANALYSIS.md`
- `SALES_ANALYTICS_REPORTS_ANALYSIS.md`
- `REPORTS_API_DOCUMENTATION.md`

