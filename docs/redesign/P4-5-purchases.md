# P4-5: Purchases page and the guided Receive goods step

Front end of ticket P4-5. The back end calls are in the back end repository on branch `claude/purchases-list-api`
(`docs/redesign/P4-5-contract.md`). This note says what was built, how the Done-when ("AC-29 passes") was checked, what was
decided, and where every old purchase action went.

## What was built

| Address | Page | Files (all in `src/newlook/purchases/`) |
|---|---|---|
| `/new-look/purchases` | Purchases: tabs All purchases, Orders and Returns, summary row, filters, table, purchase panel | `PurchasesPage.jsx`, `PurchaseCards.jsx`, `PurchasePanel.jsx`, `PurchaseStatus.jsx` |
| `/new-look/purchases/receive` (also `?order=<id>`) | Receive goods: the three guided steps | `ReceiveGoodsPage.jsx` |
| `/new-look/purchases/new` (also `?item=<product code>`) | New purchase form on the shared Form page | `NewPurchasePage.jsx`, `PurchaseProductPicker.jsx` |
| `/new-look/purchases/orders`, `/new-look/purchases/returns` | Redirect to the Orders and Returns tabs (where the old Submit Order and Purchase Returns addresses go) | `TabRedirect.jsx` |

Dialogs: `PayBillDialog.jsx`, `MakeBillDialog.jsx`, `NoteDialog.jsx`. The rules are plain functions in `purchasesModel.js`. Every
word is in `strings.purchases.js`. The API client is `src/api/purchasesListApi.js` (the new calls plus the current save order,
send order, pay invoice, cancel and bill-a-note calls). Data hooks: `usePurchasesData.js`. Styles: `purchases.css`, tokens only.
Routes: one import and one route line per page in `src/newlook/newLookRoutes.js`; `/purchases`, `/purchases/new`,
`/purchases/orders` and `/purchases/returns` were added to `OWN_ROUTES`. `BUILT_PAGES` was not touched.

### The list (List page pattern, AC-25)

Tabs All purchases, Orders and Returns. Summary row: Orders open, Bills unpaid (KES), Returned (all numbers from the server; the
first two are "open now", the third follows the period). Filters in the address: period presets, search (short number, supplier or
the supplier's bill number), Supplier and Show. Columns: Purchase (short number such as #O0012 for an order, #B0007 for a bill,
#R0009 for a return, #G0004 for goods received, with the supplier's bill number under it), Supplier, Date, Total (KES), Status (icon
and word: Draft, Ordered, Received, Billed, Paid, Returned, Cancelled; a bill also says when it is due or "Overdue since"; an order
part received says "Part received"). "Showing x of y" with the server's exact count, rows per page never blank (20), Export (CSV),
one-action empty states, cards below 768px behind a Filters button, a link past the last page goes to the last page. System
references (PUR-ORD-..., ACC-PINV-...) appear only under Details in the panel.

Header: Export, More purchase screens (menu), Receive goods, New purchase.

### The panel

Header with the short number and the status; supplier, date, bill number and date, due date (flagged when overdue), what is still
owed; lines (an order shows ordered, received so far and still to arrive), totals, the goods received notes, bills, returns and
orders it is linked to (each opens its own panel), notes. Buttons shown only when the server says they are allowed (`can`): one main
action and up to three more, in this order: **Receive goods** (an order with items still to arrive), **Pay bill** (a bill with an
amount outstanding; short dialog with amount, how it was paid and the M-Pesa code when the way is M-Pesa), **Make the bill** (goods
received and not billed yet), **Send order to supplier** (a draft order; asks first), **Print** (the browser print window with a
print-only block that has no system reference), **Create return** (a link to the current returns screen with the purchase),
**Edit draft** (a link to the current New Purchase screen), **Cancel** (asks first and names what is lost: an order that nothing has
arrived on, or a bill, whose stock comes out again and whose owed amount is removed). Add a note is a small button inside the panel.
`?open=<number>` opens a purchase by its number (an order, a bill or a goods received note), so every old address the redirect table
sends to `/purchases?open=:id` lands on a panel.

### Receive goods (AC-29)

Built on the shared Form page (errors beside the field and in the summary at the top, "Not saved yet", the leave question), with a
step list in words.

1. **Choose the order**: a table of the orders still waiting for goods (any date), optionally narrowed by Supplier. Choosing a row
   and Next opens the order.
2. **Tick what arrived**: every line with something still to arrive starts ticked with the full quantity still to arrive; untick what
   did not come, change the quantity if only part of it came. A line with nothing left cannot be ticked. A quantity must be above 0
   and not above what is still to arrive (over-receipt is NOT allowed, said on screen and enforced by the server). Tick all and
   Untick all help. A product that is on the order on two lines cannot be received here (the existing helper cannot split a quantity
   over two lines): the page says so and links to the earlier screen.
3. **Check and confirm**: supplier, order, what will be received with its value, what is still to arrive afterwards (the order stays
   open for the rest), Bill number, Bill date, Due date (blank means the supplier's terms), and the store when the shop has two
   or more. **Confirm** makes ONE call (`receive_goods`): the goods received note, the stock and the supplier bill together, or nothing.

A failure keeps the page and everything typed and says "Nothing was changed". The request id is made once for the page and sent with
every try, so a double tap, a retry after a lost answer, or a second click cannot add the stock or the bill twice (the page also
ignores a click while a call is running). On success: "Stock raised and bill created", the stock before and now for each product,
links to the bill, the goods received note and the order, and Receive the rest (when part is still to come) or Receive another order.

### New purchase

Supplier (required), Date, the items (search the shop's products and pick one: quantity 1 and the cost on record; the same product
twice raises the quantity of the one line; quantity and cost each; remove), the total, and under More options: Notes, the store
(only with two or more), "I already have the bill" (bill number, bill date, due date, "I have already paid this bill" with amount,
how and the M-Pesa code), and a link to the earlier New Purchase screen for what is not rebuilt. Without a held bill it **saves an
order and sends it to the supplier** (stock is raised later by Receive goods); with one it saves a **bill and the stock goes up at
once**. `?item=<code>` starts with that product (the Reorder links of Stock levels and Home use
`/new-look/purchases/new?item=<code>`). A product is created in the New product form (link, after the leave question), not inside
this form.

## How the Done-when was checked

AC-29 ("Receiving goods in the guided steps creates the bill and raises stock together. Stock afterwards equals stock before plus
the quantity received") is checked in two layers, both with no database:

- **Back end** (`test_purchases_list_api.py`, `test_purchases_list_calc.py`, 274 tests): `receive_goods` returns the stock before and
  after for each product received and the tests assert `after = before + received`; the receipt and the bill are made in one
  transaction with a single commit; when the bill step (or the receipt step, or reading the stock afterwards, or the commit)
  fails, `frappe.db.rollback()` is called and `frappe.db.commit()` is not, so no receipt is left behind; a repeat with the same
  request id returns the first result and touches nothing; quantities above 0 and not above what is still to arrive; a partly
  delivered order stays open; a cashier is refused before anything is read.
- **Front end** (`ReceiveGoodsPage.test.jsx`, 39 tests): the step flow, quantities capped, Confirm calls the server once (a triple
  click is one call), a failure keeps the page and the typed quantities, a retry sends the same request id, the success words and
  links, and the stock lines.

A run against a real site with a test store (the AC-29 table in the Spec) is still needed: see "needs browser check".

AC-25 (list) and AC-26 (form) are checked in `PurchasesPage.test.jsx` and `NewPurchasePage.test.jsx`.

## Tests and checks

- Front end: 261 tests for this ticket (API client 35, model 64, Purchases page and panel 69, Receive goods 39, New purchase 47,
  routes 7), lint with `--ext .js,.jsx`, the word scanner, the colour ratchet and token tests, and the redirect tests all pass.
- Back end: the no-database runner passes (1204 tests, 274 new), ruff 0.8.1 format and check on the changed files, and
  `check_changed_files.py` pass.

## Decisions (open questions answered with the defaults)

- **Open question 19**: the guided Receive goods uses order, then goods received note, then bill, for orders; the direct bill stays
  under New purchase ("I already have the bill").
- **Open question 18**: Reorder opens a new purchase with the product filled in (`/new-look/purchases/new?item=<code>`); Stock in
  stays on Stock levels for no-supplier receipts.
- **Over-receipt**: not allowed. The quantity received can be anything above 0 up to what is still to arrive.
- **Starting state of step 2**: every line with something to arrive starts ticked at the full quantity (the usual case is that
  everything came); step 3 shows exactly what will be raised before Confirm.
- **Purchase Receipts and GRN have no tab** (Spec): they are the **Show** filter of the Purchases page ("Goods received notes" lists
  every goods received note, with or without an order, so stock-only receipts too; "All supplier bills" lists every bill, including
  those made from an order that the All list folds into the order). Both are also in the More purchase screens menu, and both
  open in the panel with `?open=`.
- **One purchase, one row**: a bill made from an order is shown inside the order's panel, not as a second row; a bill with no order
  (a direct bill) is a row of its own; returns are always rows.
- **Pay bill** feeds the Home item "supplier bill due": the item carries the invoice number, and `?open=<invoice>` opens it in this
  panel where Pay bill is one button away. Home's link (`links.pay` in `HomePage.jsx`) still goes to the plain list (`/purchases`):
  the lead should make it `/purchases?open=<item.invoice>`.
- **Notes**: the New purchase form's Notes are saved as a comment on the purchase (a new small call), and the panel lists them.
- **Over the direct bill**: the current New Purchase screen only ever saved a draft order (its bill number, update stock and mark as
  paid fields were not sent to the server), so a bill that raises stock at once is a new back end call (`create_direct_bill`).
- **Status words** are derived from the data: Draft (not submitted), Ordered (goods still to come, including part received), Received
  (all arrived, not billed), Billed (a bill with money owed; an order fully received and billed), Paid, Returned, Cancelled.

## Old action, where it is now

Rows of section 4 of `P0-2-screen-audit.md` (Action list for AC-40) for purchases, orders, GRN, receipts, invoices and returns, with
the details of section 3.4.

| Old action | Where it is now |
|---|---|
| Purchase order: create | New purchase (saves the order and sends it to the supplier) |
| Purchase order: edit a draft | Panel of a draft order, Edit draft: opens the current New Purchase screen with the draft (`/purchases/new?draft=<id>`) |
| Purchase order: submit (Submit Order) | Panel of a draft order, Send order to supplier (asks first). New purchase sends the order when it saves |
| Purchase order: cancel | Panel, Cancel (asks first; offered for an order nothing has arrived on) |
| Purchase order: view, list, filters Supplier, Status, From, To | Orders tab and the All list: Supplier filter, period presets, search; the status is the Status column |
| Receive goods (Create GRN) against an order | Receive goods button and page (steps: choose, tick, confirm); also the panel's Receive goods. The old `/purchases/create-grn` address is `?action=receive` |
| Create the purchase invoice from a GRN | Receive goods makes the bill in the same step. A goods received note made earlier and not billed: its panel, Make the bill |
| GRN list (filters Supplier, Purchase order, Warehouse, dates, Status, Document status) | Show: Goods received notes (Supplier, period and search; Warehouse and the document status filters are not rebuilt) |
| GRN details and Print | Panel of the goods received note (`?open=<id>`), Print |
| Purchase Receipts (stock only): list and details | Show: Goods received notes, and the panel |
| Purchase Receipts (stock only): create | Not rebuilt. More purchase screens, "Record goods with no order (earlier screen)", or Stock in for a receipt with no supplier |
| Direct bill: supplier, date, items, warehouse, bill number and date | New purchase, More options, "I already have the bill" |
| Direct bill: Update stock on submission | Always on for "I already have the bill" (the stock goes up at once) |
| Direct bill: Mark as paid with amount, account and mode of payment | New purchase, "I have already paid this bill" (amount and how; the account comes from the way of paying) |
| Direct bill: CSV upload of lines with template, Missing flag | Not rebuilt. New purchase, More options, link to the earlier New Purchase screen |
| Direct bill: create a product inside the form | Not rebuilt. New purchase, "Create a new product" opens the New product form (after the leave question) |
| Direct bill: Currency, Prevent eTIMS submission | Not rebuilt. Link to the earlier New Purchase screen |
| eTIMS registration check (`check_etims_registration_status`) | Not rebuilt (it ran after a save in the old flow) |
| Purchase invoices: list (Invoice no, Supplier, Posting date, Due date, Bill no, Grand total, Outstanding, Status) | All purchases (direct bills) and Show: All supplier bills (every bill): Purchase, Supplier, Date, Total, Status with Due; the owed amount is in the panel and in the summary row |
| Purchase invoice: Pay Invoice | Panel, Pay bill |
| Purchase invoice: cancel | Panel, Cancel (asks first, names what is lost) |
| Purchase invoice: Print | Panel, Print |
| Purchase invoice: Edit (update the invoice) | Not rebuilt (the Spec places no edit). The earlier screen still has it until the redirects go live |
| Purchase return: create | Panel of a bill (or of an order that has a bill), Create return: opens the current returns screen with the purchase |
| Purchase return: list | Returns tab |
| Print on each purchase document | Panel, Print (orders, bills and goods received notes) |
| Supplier payment feeding "supplier bill due" on Home | Panel, Pay bill (Home's item opens the bill with `?open=<invoice>`) |

## For the lead

- **Redirects**: the redirect table sends `/purchases/new`, `/purchases/returns`, `/purchases/grns`, `/purchases/receipts` and
  `/purchases/invoices` to new pages. When redirects go live, the links this ticket keeps to the earlier screens (`/purchases/new`
  with `?draft=` and for spreadsheet upload, `/purchases/returns?purchase=`, `/purchases/receipts/new`, `/purchases/create-grn`)
  would be sent back to the new pages. Decide which of those old addresses stay out of the redirects (at least `/purchases/returns`
  for Create return, `/purchases/new` for Edit draft and CSV upload, `/purchases/receipts/new` for a stock-only receipt).
- `BUILT_PAGES` was not touched; add `/purchases` when the redirects for purchases go live.
- Stock levels and Home "Reorder" should link to `/new-look/purchases/new?item=<item_code>` (`newPurchaseAddress` in
  `purchasesModel.js` builds it).

## Assumptions

See the back end contract for the ERPNext fields. On the front end: a product's cost on record comes from the Products list
(`cost_price`, owner and manager only, which is who may use Purchases); suppliers come from the current `get_suppliers` (the first
200).

## Needs browser check (lead)

Not run in a browser by this ticket. Look at: the header on a 1280px screen with four items (Export, More purchase screens, Receive
goods, New purchase) and on a phone (they wrap); the Receive goods step 2 table with the quantity fields on a tablet and a phone (the
shared table scrolls sideways there); the quantity field labels are read aloud ("Quantity received of Sugar 1kg") but not drawn on
each row; the status chips (icons: clock for Ordered, truck for Received, receipt for Billed, check for Paid, undo for Returned, x for
Cancelled, info for Draft); the print block of the panel; the panel at 1100px and below (full page); and a full run of AC-29 against
a test store: order, receive part, confirm, check Stock levels (before plus received), open the bill, pay it, receive the rest.
