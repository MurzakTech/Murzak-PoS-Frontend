# P4-3 and P4-4: Stock levels, Stock in, Stock out or write-off, Count stock

What was built, how each Done-when was checked, the decisions made, and where every old stock action went. The server side
is in the back end repository: `docs/redesign/P4-3-contract.md` (branch `claude/stock-levels-api`).

## What was built

| Piece | File |
|---|---|
| API client (list, product picker, stock in, stock out, count sheet, submit count) | `src/api/stockLevelsApi.js` (+ test) |
| The page: Overview, Low stock, Movements, Count stock, Locations, Transfers, Expiry | `src/newlook/stock/StockLevelsPage.jsx` |
| The four tiles | `src/newlook/stock/StockTiles.jsx` |
| Stock in dialog, Stock out or write-off dialog, product picker | `StockInDialog.jsx`, `StockOutDialog.jsx`, `ProductPicker.jsx` |
| The guided count (three steps) | `CountStockFlow.jsx` |
| Icon plus word labels (In stock, Low, Out; Draft, Submitted, Cancelled; Expired; Short, Over, Matches) | `Labels.jsx` |
| Phone cards | `StockCards.jsx` |
| Rules as plain functions (tabs, addresses, units, levels, csv, form checks, count arithmetic) | `stockModel.js` |
| Every visible word | `strings.stock.js` |
| Styles (tokens only) | `stock.css` |
| Route: one line, `/new-look/stock/*`; the seven page paths added to `OWN_ROUTES` | `src/newlook/newLookRoutes.js` |

## Addresses

Tabs are part of the address, as the redirect table already says: `/new-look/stock`, `/stock/low`, `/stock/movements`,
`/stock/count`, `/stock/locations`, `/stock/transfers`, `/stock/expiry`. One route with a trailing `*` serves all of them, so moving
between tabs does not rebuild the page. `/stock/count/:id` (the three-role count details) keeps its placeholder.

* Filters live in the address (`q`, `category`, `store`, `status`, `kind`, `within`, `period`, `from`, `to`, `page`, `size`).
* `?action=in` and `?action=out` open the two dialogs (the old Material receipt and Material issue addresses already map there).
* `?item=CODE` on `/stock/count` counts only that product.
* `/stock/movements?type=...` from the redirect table: the page reads `kind` (receipt, issue, entry, ledger). The redirect table writes `type`; the lead should change those four rows to `kind` or I add `type` as an alias on request.
* `?q=CODE` on Movements is how "See movements" finds one product.

## How the Done-whens were checked

* P4-3 "Overview tiles match the list": the server counts the tiles from the very rows of the list (see the contract), and the page tests prove it on screen: the Items tile equals "Showing 20 of 45", the Low and Out of stock tiles equal the number of rows marked Low and Out across a 45-row list, the Stock value tile equals the sum of the Value column, pressing the Low tile shows exactly that many rows, and a search narrows tiles and list together. The back end tests prove the same with no database, including that Low and Out are Home's rule (`overview_calc.running_low_items`, `out_of_stock_items`).
* P4-4 / AC-27 "Count stock shows expected against counted": `CountStockFlow.test.jsx` (29 tests): expected quantities in plain units, counted boxes, Short/Over/Matches with an icon and a word, a total line, Review and Confirm, one save only.
* AC-27 "A write-off cannot be saved without a reason": the Save button stays off and the reason box shows its error beside it (an accessible description) until a reason is given; Other also needs a note; nothing is sent. The server refuses a blank or unknown reason before anything is read or written.
* AC-25 for Stock levels: filters in the address, 20 rows to a page, rows-per-page box never blank, correct "Showing x of y", Export, empty state with one action, cards below 768px.

## Decisions (and where the Spec was unclear)

1. **Header buttons.** The shared `PageHeader` allows two actions. Stock in and Stock out or write-off are the two header buttons. **Count stock is a tab** (the Spec's tab list names it: "Overview, Low stock, Movements, Count stock"). **Export sits in the toolbar just above the list**, not in the header, because a third header action is reported as an error by the shared component. If the lead wants Export in the header the header limit must change.
2. **Low stock lists low and out of stock together**, out first. It is what you reorder. Its total is therefore the Low tile plus the Out of stock tile.
3. **The Low and Out of stock tiles are also filters** (press to show only those, press again to show all). The Items and Stock value tiles are plain.
4. **Low and out follow Home.** Low: stock above 0 at or below a store's warning level. Out: nothing left, for a product that has stock or sold in the last 30 days.
5. **Dropdowns (at most two).** Overview and Low stock: Category, and Store when there are two or more stores. Movements: Type, and Store when two or more stores, otherwise Status (the server and the address support all four filters; with two stores the status filter is reachable by address only).
6. **Locations and Transfers** show when `showsWarehouseMenu(warehouses)` is true or the server reports two or more selling locations. The business owner also sees **Locations** with one store, because that is where a second store is added; nobody sees Transfers with one store. Both are real screens now (see "Warehousing" below), no longer links to the old Stores and Stock transfers screens.
7. **Expiry** shows only when the server says `features.expiry` (the shop has a batch or a stock-loading record with an expiry date). The app has no other expiry flag. The Spec says both "a filter on Low stock" and "an Expiry tab"; the redirect table already chose the tab and so did I.
8. **Reorder** opens `/new-look/purchases/new?item=<code>` when that page is live, else `/purchases/new` (the same `go()` rule as Home). The current New Purchase screen does not read `item`, so until the new page is live the product is not filled in.
9. **Movements** joins the stock ledger (sales, purchases, stock in and out, counts, submitted or cancelled) with **draft** stock entries, which are not in the ledger yet. Entries link to the current stock entry screen, where Edit, Submit, Cancel, Print and Additional costs still live.
10. **A cashier** gets no value anywhere (tile, column, export, expiry value), no Stock in, Stock out, Count stock or Reorder; the server enforces the same.
11. **Who may change stock** is the rule the current stock screens already use (the stock roles); the server tells the page through `can.change_stock`.
12. **Cost per unit** on Stock in is offered only to people who may see cost.
13. Edited a shared test: `src/newlook/NewLookGate.test.jsx` expected the route `/new-look/stock`; it now expects `/new-look/stock/*`.

## Old action, where it is now (section 4 of the screen audit: stock, inventory, stores and transfers rows)

| Old action | Where it was | Where it is now |
|---|---|---|
| Stock list with filters and CSV export | Stock List | Stock levels, Overview: search, Category, Store filters, the Low and Out tiles as level filters, Export |
| Stock adjustment; stock reconciliation per item | Stock List | Count stock tab (whole store or one category), and the row menu item "Count this product" |
| Create a discount rule for an item | Stock List row menu | Row menu item "Create a discount rule" (people who may change stock) opens the current `/settings/inventory-discounts/new?item_code=...`. Still **not placed** in the new Settings; the Spec has no home for discount rules |
| Low stock, Create receipt | Low Stock | Low stock tab, Reorder (a new purchase, open question 18). The no-supplier receipt is the Stock in header button |
| Expiry alerts (batch, expiring within) | Expiry Alerts | Expiry tab (shops that track expiry): batch column, "Expiring within" box (30 days to 1 year), urgency filter, search, Export |
| Stock ledger (filters, export) | Stock Ledger | Movements: period presets, search, Type "Stock ledger", status, Export |
| Stock entries: create | Entries, New Stock Entry | Stock in and Stock out or write-off buttons. **Manufacture and Repack entries** (Spec: hidden unless the shop makes goods) keep the current `/inventory/stock-entry` form, not linked from the page |
| Stock entries: edit, submit, cancel, print, additional costs | Entries, entry details | Movements lists entries with Draft, Submitted, Cancelled and an Open link to the current entry screen (`/inventory/stock-entries/:name`), where those actions stay |
| Material receipt | Material Receipts | Stock in (header button, `?action=in`) |
| Material issue (with its per-line reason) | Material Issues | Stock out or write-off (header button, `?action=out`); the reason is now required and is shown in Movements |
| Material transfer | Material Transfers | **Move stock** (header button with two or more stores, `?action=move`): one step, the stock leaves one store and arrives in the other. The Transfers tab lists past moves |
| Edit price, SKU, unit, expiry, batch per item and store | Inventory Details | Row menu item "Edit price, unit, expiry and batch" opens the current `/inventory/item-details`. Still **not placed** in the new design (Products or Stock levels is the owner's call) |
| Multi-level stock count (three roles) | Multi-level reconciliation | Link "Count in three steps by role" in step 1 of Count stock (open question 17); its list, details and stock-take pages stay as they are |
| Stores: add, edit, default store, staff assignment | Stores | Locations tab: the owner adds a store (`?action=store`), and anyone who may change stock can make a store the main one. The owner and stock managers edit a store's name, town and address (`?action=edit&item=<store>`). The owner chooses who works at a store (`?action=people&item=<store>`) |
| Stock transfers: request, approve, dispatch, receive, cancel | Stock Transfers | The approval flow stays on the current `/stock-transfers`; the Transfers tab links to it ("Need someone to approve and receive the goods?") |
| Repost stock | Store code only, no screen | No screen today and none added |

## Warehousing: Locations, Transfers and Move stock

- **Move stock** needs two different stores and at least one product with a quantity. Each quantity is checked against what the first store holds (the product shows that stock when chosen), and the server checks again and moves nothing if any product falls short. Changing the "Move from" store clears the product list, because the stock shown belongs to the store it was read from.
- **Transfers** is the Movements list asking the server for `kind=transfer`. Each move shows as two lines, one leaving a store (negative) and one arriving in another (positive), with the store named on each.
- **Locations** lists the shop's real stores (not the folders and production warehouses a new business comes with), marks the main store, and lets the owner add a store. Only the owner may add one; the server refuses anyone else.
- **Who works here**: a tick for each person of the business. A person with no store chosen can use every store, so ticking such a person limits them, and unticking the only store of a limited person frees them again; the form says so before saving and again afterwards. Only the owner sees it.
- Back end: `store_admin_api.edit_store`, `get_store_people`, `set_store_people`, and `stock_levels_api.move_stock`, `stock_levels_api.add_store`, and `kind=transfer` on `get_stock_levels`.

## Needs browser check

1. Overview at 1280px: four tiles in a row, then toolbar, filter row, table, "Showing 20 of N". Tile Low or Out pressed state (soft fill and a bar under it).
2. Phone width (500px): tiles two to a row, rows as cards, the Filters button, the Export button, dialogs usable at 44px targets.
3. Stock out dialog: with a product and quantity chosen and no reason, the reason box shows its error and the Save button is off; choose a reason and both change.
4. Count stock: the Counted boxes in the table (their labels are hidden visually, the column heading carries them), Short, Over and Matches labels, the total strip, the step list.
5. Movements: the Draft, Submitted and Cancelled labels, the Open link to the current entry screen.
6. Both themes, keyboard order in the tab row, the row "More" menu, and Escape in each dialog.
7. The `/new-look/stock/*` route inside the shell (tab links keep the page mounted).
