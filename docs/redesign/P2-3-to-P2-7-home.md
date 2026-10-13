# Phase 2: the Home page (P2-3 to P2-7)

Home is at `/new-look` (owner, manager and cashier, while the shop's New look is on). It is built from the chart kit (P2-2) and the one server call `get_overview` (P2-1, back-end pull request 33). The old Dashboard is untouched.

## What was built

| Ticket | What | Where |
|---|---|---|
| P2-3 | Greeting and date, hero band (Today so far, change on the same weekday last week, sales, average basket, cash in the till with the float, M-Pesa received with the number of payments), the filter row (period in the address, store only with 2 or more locations, staff, Export to CSV), four tiles (each a link, with change and a grey sparkline or "Day 12 of 31") | `src/newlook/home/HeroBand.jsx`, `HomeFilters.jsx`, `StatTile.jsx`, `HomePage.jsx` |
| P2-4 | Needs attention: up to four items, most urgent first, one button each (Close, Reorder, Remind, Pay), "See all alerts", empty state "Nothing needs you right now" | `NeedsAttention.jsx` |
| P2-5 | The four charts on Home: Sales (with Revenue, Profit and Sales count), How customers paid, Top products (a bar opens that product search), Busiest hours | `HomePage.jsx` using `src/newlook/charts` |
| P2-6 | Loading (skeleton shapes after 200ms, space reserved before that), a card that fails shows its own Try again, a whole-page error, the first-time panel, a warning banner for a till left open, and the layout at 1100px and 768px | `HomePage.jsx`, `FirstTimePanel.jsx`, `home.css` |
| P2-7 | "Profit not counted for N products without a cost price" under Net profit, and the list it opens | `MissingCostList.jsx` |

The numbers come only from the server. The page never works out profit, debt or a total itself, except the small sums the Spec asks for in words (a percentage shown, "Day 12 of 31").

## How each Done-when was checked

Unit tests: `src/newlook/home/home.test.jsx` (31) and `src/api/overviewApi.test.js`. Browser check: a script that runs the built app in Chromium with the server's answers replaced by made-up ones (owner, cashier, failing card, no sales, stale till, under 7 days, slow load, 1280px, 1000px and 390px, light and dark).

| Check | Result |
|---|---|
| AC-08 Today so far, tiles and charts draw the figures the server gives | Pass on made-up answers. **Not yet checked against the demo store's real Sales list**; that needs the back-end pull request deployed (see "Still to do"). |
| AC-09 Cash in the till shows the opening float beneath it | Pass ("Includes KES 2,000 float"); "No till is open" and a dash when none is open. |
| AC-10 M-Pesa shows "23 payments recorded", never a "matches" line, never zero when payments exist | Pass. |
| AC-11 Period: five choices; the address carries it; a refresh keeps it; change compares with the previous period | Pass: choosing 7 days sets `?period=7d`, the server is asked for `7d`, and a reload keeps it. |
| AC-12 Each of the five Needs attention rules shows and opens its action; most urgent first; empty state | Pass for all five on made-up data. The rules themselves run on the server (back-end tests). Remind opens WhatsApp with a ready message in a new tab and sends nothing. |
| AC-13 Net profit is never KES 0 when the server gives a figure; the line says how many products are not counted | Pass. |
| AC-14 A cashier sees no Net profit, Money owed, cost, profit switch, overdue or supplier items | Pass, in two ways: the server leaves them out, and the page also refuses to draw them for a cashier even if one were sent. |
| AC-15 One failing card shows its own retry, the rest still draws | Pass: with Payments forced to fail, three charts, four tiles and the hero still draw. |
| AC-16 to AC-18 on Home | Pass (marks measured in the browser; payment colours from one table). |
| Responsive | At 1000px the Sales chart is full width with Needs attention below it. At 390px: one column in the Spec's order (hero, tiles two by two, Needs attention, Sales chart, then the three cards) and nothing scrolls sideways. |

## Decisions I took, and what was unclear

1. **Revenue without VAT.** Open question 3's default. The Revenue tile shows "Without VAT; KES x with VAT" so a difference from the Sales list (which shows full amounts) can be explained. Please confirm this is the wanted rule.
2. **Cashier sees own sales only.** Home for a cashier is limited to their own sales, and has two tiles (Revenue, Low on stock).
3. **Profit and money owed are drawn only when both the server sent them and the person's role allows them.**
4. **"See all alerts"** has no alerts page yet; it opens the current Low stock screen for now.
5. **Where the buttons go.** Each button opens the redesigned page once it is live, and the current screen until then. "Reorder" will fill the product in only once the redesigned New purchase page (Phase 4) reads it; today it opens the current New purchase screen.
6. **Spec versus server on two tiles.** Money owed and Low on stock have no change figure or sparkline, because past debts and stock levels are not stored day by day. The tiles say nothing rather than invent one.
7. **First-time checklist.** The Spec says to reuse the app's existing getting-started list. I built the four steps as links (add products, open the till, make a first sale, add payment methods) without the old list's "done" ticks. Ticking them needs that list's data; say if you want it.
8. **Store and staff boxes** read the existing store and staff lists. A cashier gets no staff box.
9. **Export** downloads the visible numbers (tiles, daily sales, payments, top products, hours) and leaves out profit and money owed for a cashier.
10. **Home is not yet the live Home.** The redirect from the old Dashboard is switched on only when `BUILT_PAGES` lists `/` (it is not listed yet). The owner can see Home now through the preview switch or by opening `/new-look`.

## Still to do before Phase 2 is closed

- Deploy back-end pull request 33 to the demo store and compare the Revenue tile with the Sales list total for the same period (AC-08), and confirm the unmerged-POS-invoice profit (P1-9) there.
- The owner's demo and sign-off of Phase 2.

## Owner decisions on Phase 2 (recorded)

- **Revenue is shown without VAT**, with the figure with VAT in small print under it. Accepted.
- **A cashier's Home is limited to their own sales.** Accepted.
- **The redirect is switched on.** With the New look on for a shop, the old Dashboard address opens the new Home (`BUILT_PAGES` now lists `/`). Shops with the New look off see no change. Home reads the back end's `get_overview` call, so the back-end pull request 33 must be merged and deployed before a shop turns the New look on; until then Home shows "We could not load Home" with a Try again button.
