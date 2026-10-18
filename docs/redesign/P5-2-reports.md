# P5-2: Reports (the landing page of six questions, the reports, and the missing reports)

## What was built

| Part | Where |
|---|---|
| Landing page: six question cards, each with a one-line answer for the last 30 days when cheap, and a "More reports" list | `src/newlook/reports/ReportsPage.jsx`, `MoreReports.jsx`, route `/new-look/reports` |
| One report page for seven reports: period row, store box, figures, charts with a Chart and Table toggle, table, Export CSV in the header, loading, empty and error states | `src/newlook/reports/ReportPage.jsx`, `ReportCharts.jsx`, `Figures.jsx`, route `/new-look/reports/:name` |
| New charts built from the chart kit parts: profit waterfall, columns over time, horizontal bars, the age bar | `WaterfallChart.jsx`, `ColumnsChart.jsx`, `BarsChart.jsx`, `AgeChart.jsx` |
| Pure decisions (columns shared by table and CSV, figures, answers, More reports list) | `reportsModel.js` |
| Words | `strings.reports.js` |
| Client | `src/api/reportsApi.js` (two functions added at the end, the older ones untouched), `reportsApi.test.js` |
| Back end | branch `claude/reports-run-api`: `murzak_pos/api/reports_api.py`, `reports_calc.py`, `test_reports_api.py`, contract `docs/redesign/P5-2-contract.md` |

Small additive change to the chart kit: `ChartCard` takes optional `emptyTitle` (default unchanged), because its empty title said "No sales to show yet", which is wrong for running costs. `NEW_PAGES` gained `/reports/profit`, `/reports/owed`, `/reports/running-costs`. No old-address row was needed (the three reports are new). Nothing was added to `BUILT_PAGES`; nothing is live.

## The six questions

Default from the brief, kept as it was.

| # | Question | Opens | Who | Back end it reads |
|---|---|---|---|---|
| 1 | How much did I sell? | `/reports/sales` | everyone (a cashier: own sales only) | New call, using the Home readers and functions (sales by day, payments, top products). The current `sales_analytics_report` is not used, so the figures match Home |
| 2 | What is my profit? (new) | `/reports/profit` | owner, manager | Home's profit rows and `summarize_profit` (same as the Net profit tile) plus the general ledger for running costs |
| 3 | Who owes me money? (new) | `/reports/owed` | owner, manager | Home's unpaid-sales filter (same as the Money owed tile), by customer and by age |
| 4 | Where did my money go? (new) | `/reports/running-costs` | owner, manager | General ledger expense accounts, the rule of `dashboard_api._get_operating_expenses` with the account and day kept |
| 5 | What is in stock, and what is it worth? | `/reports/stock-summary` and `/reports/stock-value` (two tabs) | owner, manager | Current `reports.inventory_summary_report` and `reports.inventory_value_by_category_report`, called as they are |
| 6 | What is not selling? | `/reports/aging-stock` | owner, manager | Current `reports.stock_aging_report`, plus Home's "sold in the last 30 days" read so till sales not yet merged count as selling |

Reasons for departures from the brief's wording: question 5 is one question with two views (In stock, What it is worth) so Inventory Summary and Inventory Valuation each keep a page; the stock reports are owner and manager only (the brief says a cashier gets only the sales report).

## Old action, where it is now

"Current screen" means the screen under `src/pages/Reports/`, opened from "More reports" or from the report's own "Open the detailed report" link with `oldScreen()` (carries `legacy=1`, so it does not bounce back once redirects are on).

| Old action | Where it is now |
|---|---|
| Sales Analytics: see daily sales, revenue by category, summaries (`/reports/sales-analytics`) | Reports, How much did I sell? (`/reports/sales`): sales by day, how customers paid, top products. Redirect `/reports/sales-analytics` goes to it |
| Sales Analytics: filter by store | Store box on the report (shown with two or more stores) |
| Sales Analytics: filter by dates | Period row: Today, 7 days, 30 days, Custom |
| Sales Analytics: filter by category or customer, group by category or customer | Current screen, link "Open the detailed report" on the sales report, and More reports, Sales analysis |
| Sales Analytics: Refresh | Not needed, the report opens ready |
| Sales Analytics: Export as CSV | Export CSV in the header |
| Sales Analytics: Export as Excel, Export as PDF | Current screen (same two links) |
| Inventory Summary (`/reports/inventory-summary`) | Reports, What is in stock (`/reports/stock-summary`), In stock tab. Redirect goes to it. Current screen: More reports, Stock summary |
| Inventory Valuation hub (`/reports/inventory-valuation`) | Reports, What it is worth (`/reports/stock-value`). Redirect goes to it. Current screen: More reports, Stock value |
| Inventory Valuation, Value by Category | The What it is worth tab (value by category). Current screen: More reports, Stock value, Value by category |
| Inventory Valuation, Cost Method Comparison | Current screen: More reports, Stock value, Cost method comparison |
| Inventory Valuation, Value Trends | Current screen: More reports, Stock value, Value trends |
| Stock Movement hub (`/reports/stock-movement`) | More reports, Stock movement (current screen; the New look address shows the "being rebuilt" notice with a link to it) |
| Stock Movement, Turnover | More reports, Stock movement, Turnover |
| Stock Movement, Days on Hand | More reports, Stock movement, Days on hand |
| Stock Movement, Movement Patterns | More reports, Stock movement, Movement patterns |
| Aging Stock hub (`/reports/aging-stock`) | Reports, What is not selling (`/reports/aging-stock`). Current screen: More reports, Aging stock |
| Aging Stock, Stock Aging | The new report lists products with the money tied up, by age. Current screen: More reports, Aging stock, Stock aging |
| Aging Stock, Obsolescence Risk | Current screen: More reports, Aging stock, Risk of stock going out of date |
| Aging Stock, Aging Recommendations | Current screen: More reports, Aging stock, What to do with old stock |
| Performance Metrics hub (`/reports/performance-metrics`) | More reports, Performance (current screen) |
| Performance Metrics, Accuracy | More reports, Performance, Count accuracy |
| Performance Metrics, Variance | More reports, Performance, Count differences |
| Performance Metrics, Adjustment Trends | More reports, Performance, Stock adjustments over time |
| Performance Metrics, Transfer Efficiency | More reports, Performance, Transfer efficiency |
| Reports overview page (`/reports`) | Reports landing page (`/new-look/reports`) |
| (new) Profit, Who owes you, Running costs | The three new reports, all with Export CSV |

That is the 6 current reports and all 13 sub-reports. `reportsModel.test.js` checks that "More reports" holds exactly these 19 links, that each is a real old address in the redirect table, and that each carries `legacy=1`.

## How AC-31 was checked

"The landing page shows six questions. Each report opens ready for the last 30 days without pressing Refresh. Profit, who owes you and running costs reports exist and export."

| Point | Check |
|---|---|
| Six questions | `ReportsPage.test.jsx`: an owner sees the six links in order with the right addresses; a cashier sees one |
| Opens ready, last 30 days, no Refresh | `ReportPage.test.jsx`: the report is asked for once on open with `period: '30d'`, nothing pressed, and there is no Refresh button; the back end default is 30 days with the 30 days before it for comparison (`test_reports_api.py`) |
| Profit, owed and running costs exist | Back end tests of each, front end tests of each page |
| They export | "every report can be exported": for each of the seven reports the CSV has one line per table row plus the headings; the sales CSV adds up to the revenue |
| Agrees with Home | `TestReportsAgreeWithHome`: revenue, payments, top products, net profit with margin and the count of products without a cost price, money owed, and the sales and profit by day equal Home's for the same period, run on the same fixed data |
| Profit maths | Build Pack example (revenue 100,000, cost of goods 62,000, running costs 15,000 gives 23,000 and 23%) in both back end and front end tests |
| Roles | A cashier is refused every report but sales before anything is read, and the sales report holds no profit, cost or owed word (back end tests); the cache is separate per report, role, store, period and cashier; an owner's cached answer cannot reach a cashier |
| Chart rules (AC-16, AC-17) | Each new chart has a one-sentence name stating the finding, a Chart and Table toggle with the same numbers, a legend with amounts for the age bar, and only tokens for colour |

Test counts: back end 116 new tests (1046 in the full no-database run); front end 139 in `src/newlook/reports` and `src/api/reportsApi`, 2,952 across `src/newlook`. Lint, word scanner, colour ratchet and token tests pass.

## Decisions and anything unclear

- **Not caching a partial answer.** As on Home, an answer with a failed part is returned but not kept.
- **The age colours.** The Spec's indigo scale (`#a7a3f2`, `#7f79ea`, `#5a52e0`, `#3a30b8`) cannot be added as colour tokens: the token test fixes the set at 23. `reports.css` makes four steps from series-1 with `color-mix` against the card colour and the ink colour (`--age-1` to `--age-4`), pale to deep, in both themes. If the owner wants the exact Spec hexes, the token set must change first. The legend always names each part with its amount, so age is never read from colour alone.
- **Waterfall labels.** The Spec says label only the peak and the latest value, but a waterfall has four marks that are the answer, so all four carry their amount.
- **Profit and products without a cost price.** The headline Revenue is all sales (Home's Revenue tile); the waterfall and the table use "sales counted", which leaves out products with no cost price, so the maths always adds up. A note says how many products and how many shillings are left out, with the Add the costs list from Home.
- **Age of debt** is the days since the sale (0 to 7, 8 to 14, 15 to 30, over 30), as in the Spec; Home's "overdue" uses the due date, which is a different question.
- **Previews.** The landing list is asked for first (no database work), then the answers; a failed answer leaves the card with its question. "What is not selling?" has no answer line because it scans a month of stock movements.
- **Aging stock** uses the current report, which measures the age of stock by the age of the Bin record, so "not selling" is reliable and "how old" is approximate. Say so if the owner wants real receipt dates.
- **WhatsApp reminders** on the owed table reuse Home's message and link; the app sends nothing itself.
- **Home's Net profit tile** still links to `/reports`; pointing it at `/reports/profit` is a one-line change in `HomePage.jsx` for the lead (not done, not in this ticket).
- **Redirects**: after the lead adds `/reports` and the report paths to `BUILT_PAGES`, the old `/reports/sub-report` addresses go to their parent report. The More reports links carry `legacy=1` so they still open the current sub-report screens. `/reports/stock-movement` and `/reports/performance` stay placeholders and must not be added to `BUILT_PAGES` while they only link back.

## Needs browser check (lead)

1. `/new-look/reports` at 1277px, 1024px and 390px: six cards, no sideways scroll; More reports in one column on a phone with 44px links.
2. Each report in light and dark: the age bar (owed and not selling) shows four steps that get deeper, and `color-mix` renders in the target browsers (Chrome 111 and later, Safari 16.2 and later).
3. The waterfall: costs float down from the sales column; with a loss the last column sits below the line and its label is under it.
4. Net profit by day with 30 columns: bars at most 24px, labels not touching, today lighter.
5. The Chart and Table toggle on every chart, and the keyboard (arrow keys move the tooltip on the sales chart).
6. Custom period: choosing it shows two date boxes and the report waits for both dates.
7. As a cashier: Reports shows one question, and typing `/new-look/reports/profit` shows "This report is for owners and managers".
8. The Network panel for a cashier: `run_report` for anything but `sales` answers 403.
