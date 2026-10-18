# Home data contract: `dashboard.overview`

The agreement between the back end (ticket P2-1) and the Home screens (P2-3 to P2-7). The server method is `murzak_pos.api.dashboard_overview.get_overview`. Money is in KES as a number with at most 2 decimals; dates are `YYYY-MM-DD` in Africa/Nairobi; times are `HH:MM` in 24-hour form.

## Request

`get_overview(period="30d", from_date=None, to_date=None, store=None, staff=None)`

- `period`: `today`, `7d`, `30d`, `month` (this calendar month so far) or `custom` (needs `from_date` and `to_date`). A bad value is refused. Weeks start on Monday.
- The previous period is the period of the **same length immediately before** it (for `month`: the same number of days before the first of the month).
- `store`: a warehouse the caller may access (`ensure_record_access`); `staff`: a user to filter by.
- **A cashier's request is always limited to their own sales** (`staff` is forced to the caller); the profit, cost and money-owed parts are not returned to a cashier at all (see Roles).

## Response

```json
{
  "success": true,
  "data": {
    "role": "owner",
    "period": { "key": "30d", "from": "2026-09-14", "to": "2026-10-13", "days": 30, "previous_from": "2026-08-15", "previous_to": "2026-09-13", "days_of_data": 30 },
    "updated_at": "14:52",
    "cached": false,

    "hero": {
      "today_total": 12450.0,
      "same_weekday_last_week_total": 11000.0,
      "change_pct": 13.2,
      "sales_count": 9,
      "average_basket": 1383.33,
      "cash_in_till": { "amount": 9800.0, "opening_float": 2000.0 },
      "mpesa": { "amount": 4200.0, "payments": 23 },
      "till": { "state": "open", "session": "POS-OPE-2026-00010", "opened_on": "2026-10-13", "opened_at": "08:15" }
    },

    "tiles": {
      "revenue": { "value": 71000.0, "previous": 63000.0, "change_pct": 12.7, "spark": [1200.0, 900.0], "days_of_data": 30 },
      "net_profit": { "value": 18400.0, "margin_pct": 25.9, "previous": 16000.0, "change_pct": 15.0, "spark": [], "estimated": true, "uncosted_products": 12 },
      "money_owed": { "amount": 24500.0, "customers": 6, "previous": 20000.0, "change_pct": 22.5, "spark": [] },
      "low_stock": { "count": 5, "out_of_stock": 2, "previous": 4, "change_pct": 25.0, "spark": [] }
    },

    "charts": {
      "sales": [
        { "date": "2026-10-12", "revenue": 8000.0, "profit": 2100.0, "count": 6, "previous": { "revenue": 7000.0, "profit": 1800.0, "count": 5 } }
      ],
      "payments": [ { "method": "M-Pesa", "amount": 41000.0 }, { "method": "Cash", "amount": 25000.0 }, { "method": "On credit", "amount": 5000.0 } ],
      "top_products": [ { "item_code": "ITM-0001", "name": "Soap", "revenue": 9100.0 } ],
      "busiest_hours": [ { "hour": 8, "average_sales": 1.5 } ]
    },

    "attention": [
      { "type": "till_not_closed", "urgency": 1, "session": "POS-OPE-2026-00010", "opened_on": "2026-10-12" },
      { "type": "out_of_stock", "urgency": 2, "item_code": "ITM-0007", "name": "Milk 500ml" },
      { "type": "running_low", "urgency": 3, "item_code": "ITM-0003", "name": "Sugar 1kg", "qty": 4, "warning_level": 10 },
      { "type": "customer_overdue", "urgency": 4, "customer": "CUST-0004", "name": "Wanjiru Kamau", "mobile": "0712345678", "amount": 3500.0, "days_overdue": 6 },
      { "type": "supplier_bill_due", "urgency": 5, "invoice": "PINV-0009", "supplier": "Brew Ltd", "amount": 12000.0, "due_on": "2026-10-15" }
    ],
    "errors": {}
  }
}
```

## Rules

- **`hero` ignores the period** (always today). Everything else follows the period. `today_total` is revenue after returns (see Revenue below).
- **Revenue** is the net total of submitted sales, after discounts and returns, excluding cancelled, **without VAT** (Open question 3's default). Sales Invoices plus submitted POS Invoices that are not merged (never counted twice). The response also carries `gross_total` next to each revenue figure so a difference from the Sales list that shows full amounts paid can be explained.
- **Net profit** is revenue minus cost of goods sold minus running costs, including unmerged POS Invoice lines (see `P1-9-net-profit-investigation.md`). `estimated` is true when any cost came from the current valuation. `uncosted_products` is how many sold products have no cost at all. Never return 0 for a period with sales and costs because of missing data.
- **`cash_in_till`** is opening cash of the open session plus cash payments, minus cash refunds and cash paid out, or `null` when no till is open. **`mpesa.payments`** is a count of payments recorded; matching against statements does not exist yet, so there is no "matched" field.
- **`attention`** holds at most four items, most urgent first (`urgency` 1 is most urgent), by the five rules in the Spec's Needs attention table: till session from an earlier day still open; out of stock (qty 0 or less on a product that sold in the last 30 days); running low (at or below the product's low-stock warning, not disabled); customer overdue (a credit sale past its due date, 14 days after the sale unless the customer has terms); supplier bill due within 3 days.
- **`sales` points** cover the period day by day, **completed days only** (today is left out of the line unless the period is `today`, when it is a single point with `so_far: true`); days with no sales are present with zeros. `previous` holds the matching day of the previous period.
- **`busiest_hours`** is the average number of sales per hour of the day over the period, 8 to 19 inclusive.
- **`top_products`** is the five highest by revenue.

## Roles (AC-14)

Checked on the server with `role_tiers.can(...)`, not in the browser. For a **cashier**, `tiles.net_profit`, `tiles.money_owed`, every `profit` field in `charts.sales`, `hero` parts that expose cost, and `attention` items of type `customer_overdue` and `supplier_bill_due` are **absent** (not null, absent), and the data is limited to the caller's own sales. Owner and manager receive everything. The cache key includes the role tier, store, period, dates and staff, so one role's answer is never served to another.

## Failing cards (AC-15)

Each of `hero`, `tiles.*`, `charts.*` and `attention` is computed on its own. If one fails, its value is `null` and `errors` names it (`{"charts.payments": "Could not load this."}`) while the rest is returned. The response is `success: true` unless nothing could be computed.

## Cache

60 seconds, per store, period (with dates), staff and role tier, in Frappe's cache. `cached` says whether this answer came from it; `updated_at` is when it was computed.
