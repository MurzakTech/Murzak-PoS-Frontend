# P1-9: Why the demo store shows Net profit of KES 0 (Open question 7)

Recorded 13 October 2026. **Status: the cause is established by reading the code; the live confirmation on the demo store is still to do** (the second session, which needs the demo store, has not been able to run it yet). Because the Phase 2 work depends on the answer, I read the code first. The cause below is a finding from the code, not yet a measurement on the shop.

## What was observed

On the demo store, Home showed revenue of KES 3,450 beside Net profit of KES 0, and the Sales Invoices tab was empty beside two POS invoices.

## What the code does

All of this is in `murzak_pos/api/dashboard_api.py` (the call `get_dashboard_metrics`) and `profit_calc.py`.

1. A sale made at the till is saved as a **POS Invoice**. ERPNext turns POS Invoices into ordinary **Sales Invoices** only when a till is **closed** (the POS Closing Entry merges them). Until then the Sales Invoices list is empty, which matches what was seen.
2. The dashboard's **sales figures** read Sales Invoices, and then `_add_pos_invoice_sales` adds the POS Invoices that have not been merged yet, so the shop's sales show up (the KES 3,450).
3. The dashboard's **profit figures** (`_get_profit_stats`) read **submitted Sales Invoice lines only**. Nothing adds the unmerged POS Invoices to profit or to cost of goods. With every sale still sitting in an open till, there are no Sales Invoice lines, so sales are 0, cost is 0 and profit is 0.
4. **Operating expenses** are read from the general ledger, which also does not hold POS Invoices until they are merged, so expenses are unaffected by this.

## The cause

**The profit figure ignores POS Invoices that have not been merged into Sales Invoices, while the sales figure includes them.** Revenue and profit are therefore computed from different sets of documents. Profit stays at KES 0 until a till is closed and merged, and then jumps. This confirms the leading guess in Open question 7.

## The approach (the Spec's default, Open question 7)

Home computes revenue, cost of goods and profit **straight from invoice lines, both kinds together**: Sales Invoices, plus POS Invoices that are submitted and not merged (a merged POS Invoice is already inside its Sales Invoice, so it is never counted twice; the existing `_add_pos_invoice_sales` already follows that rule). **No change to the accounts.**

- **Cost of goods for an unmerged POS Invoice line.** A POS Invoice has not moved stock yet, so no cost has been recorded on its lines. Use the product's current valuation rate (the store's first, then the product's), as `summarize_profit` already does when a Sales Invoice line has no recorded cost, and count the line as **estimated**. A product with no valuation or cost price at all is **not counted**, and the tile says how many ("Profit not counted for 12 products without a cost price"). It never shows 0% as if it were known.
- This is built into the new `dashboard.overview` call (ticket P2-1) and into `get_profit_summary` (P1-8), so the Home page, the profit call and the Sales list agree. The old dashboard call is **not** changed.

## Still to confirm on the demo store (the live part)

1. Open the dashboard's network call and confirm the sales figure includes the two POS Invoices while the profit figure is 0.
2. Check that the two POS Invoices are unmerged (no Sales Invoices exist; the open till session POS-OPE-2026-00010 holds them). **Do not close that till session; its owner closes it.**
3. After the owner closes the till, confirm profit rises, which proves the merge is the trigger.

## Decisions for you

- Is it acceptable that profit on Home is an **estimate** for sales still in an open till (cost taken from the current valuation), and exact once the till is closed? The alternative is to close and merge the till automatically each day; the Spec's default is the estimate, so I used it.
