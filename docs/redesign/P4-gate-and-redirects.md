# Phase 4 review gate, and the redirects switched on

Phase 4 covers Products and Categories, Stock levels, Purchases and Receive goods, Suppliers and Customers (tickets P4-1 to P4-7).
This note records the owner's decision to let the new pages replace the old ones, how that was done, what was held back and why,
and how to merge the back end.

## 1. What was decided

The owner asked that the new front end replace the old one. With the New look switched on for a shop, the old address of every
finished page now opens the redesigned page. With the switch off, nothing changes: every old screen works exactly as before.

## 2. What is now live

`BUILT_PAGES` in `src/newlook/redirects/live.js` lists the finished pages:

| Area | Pages |
|---|---|
| Home | `/` |
| Sales | `/sales`, `/sales/unpaid`, `/sales/returns`, `/sales/sessions` (the last three open the matching tab) |
| Customers | `/customers`, `/customers/owing`, `/customers/new` |
| Products | `/products`, `/products/categories`, `/products/new` |
| Stock levels | `/stock`, `/stock/low`, `/stock/movements`, `/stock/count`, `/stock/expiry` |
| Purchases | `/purchases`, `/purchases/orders`, `/purchases/returns`, `/purchases/new` |
| Suppliers | `/suppliers` |

The sidebar and the + New menu follow the same list, so they open the new pages too.

## 3. What was held back, and why

| Not redirected | Why |
|---|---|
| `/sales/pos` (the till) | The till is the current screen with the New look parts inside it, not a separate page |
| `/sales/invoice/new` | The New invoice form is not redesigned |
| `/products/import` and the Load Products screens | Import is not redesigned |
| `/products/update-price`, `/products/variations` | No redesigned replacement yet (bulk price update, variations). The redirect table rows are now "keep" |
| `/inventory/stock-entry` | Manufacture and Repack entries have no redesigned form. Now "keep" |
| `/warehouses*`, `/stock-transfers*`, `/inventory/material-transfer(s)` | The Locations and Transfers tabs only link to these screens, so redirecting them would loop |
| `/settings/*`, `/reports/*`, `/expenses` | Phase 5 and later. Till and payments alone would hide POS profile, gateways and bank accounts |

## 4. How links back to current screens avoid looping

A few jobs still have no redesigned screen (a stock-only receipt, a sales return, a draft order edit, the supplier groups, the
three-role stock count, a stock entry's edit and print). Links to them carry `legacy=1`, for example
`/sales/returns?invoice=X&legacy=1`. The redirect engine leaves any address with that marker alone. The helper is `oldScreen()` in
`src/newlook/redirects/engine.js`. Without it these links would bounce straight back to the new page.

Tests: `src/newlook/redirects/liveRedirects.test.js` checks that every finished page has a real screen, that every switched-on
redirect lands on a real screen, that the held-back addresses are not redirected, and that each marked link stays put.

## 5. Added so that nothing a person can do today is lost

- **Edit product** (`/new-look/products/:code/edit`). The product panel's Edit used to open the old list, which would have bounced back.
  The form shows what the product has now and sends only what was changed, through the current `update_product` call (unchanged).
  It edits name, price, cost (owners and managers, against the default store), unit, category and whether the product is still sold.
  Barcode changes, description, brand, photo, price lists and prescription settings stay on the current Products screen, and the form
  links to it.
- **Sales tab addresses** (`/new-look/sales/unpaid|returns|sessions`) open the right tab, so the old Returns and Opening Entries
  addresses and the Unpaid link on Home land correctly.
- **Home "Pay" link** for a supplier bill now opens that bill in Purchases (`/purchases?open=<invoice>`).

## 6. Back end pull requests

All are drafts on `MurzakTech/Murzak-PoS-Backend`. PR 33 (Home overview) is already merged.

| PR | Branch | Adds |
|---|---|---|
| 34 | `claude/payment-methods-api` | Payment methods for the till and Settings |
| 35 | `claude/till-state-close-api` | Till state and close |
| 36 | `claude/sales-list-api` | Sales list, receipts, Take payment |
| 37 | `claude/customers-list-api` | Customers |
| 38 | `claude/stock-levels-api` | Stock levels |
| 39 | `claude/products-list-api` | Products |
| 40 | `claude/suppliers-list-api` | Suppliers |
| 41 | `claude/purchases-list-api` | Purchases and Receive goods |

A trial merge of all eight onto `main` in a throwaway copy (nothing pushed) gave:

- Conflicts only in `murzak_pos/translations/sw.csv` and `murzak_pos/api/test_record_access.py`. Every branch appends to the same
  place, so each pair collides. The resolution is always to keep both sides. In `test_record_access.py` the new modules are whole
  entries in `EXPECTED_GUARDS`, so the file must be checked after merging, not merged by hand line by line.
- After resolving: 2,251 back end tests pass, ruff 0.8.1 is clean and `check_changed_files.py` says all good.
- Two Swahili rows appear twice with slightly different wording ("... has no account set up for this shop ..." and "That store
  belongs to another business."). The later row wins; one of each should be deleted when merging.

Suggested order: 34, 35, 36, 37, 38, 39, 40, 41. Merge one, update the next branch from `main`, resolve the two files, run the checks.

## 7. Things to know before the demo

- Nothing has been run against a real database or the demo store. Server queries were written without a database; the assumptions
  are listed in each contract (`docs/redesign/*-contract.md` in the back end) and in the per-ticket notes in this folder.
- Receive goods, Take payment, Close shift, the Owed figures and the stock counts need the back end deployed to the demo store
  before they can be tried for real.
- Pay bill (existing `pay_purchase_invoice`) has no repeat protection; a repeated partial payment could be recorded twice.
- An order with the same product on two lines cannot be received in the guided step; it links to the earlier screen.
- Customers form leaves out default currency and price list (open question 25).

## 8. Browser check (production build, mocked server answers)

A browser run covered 28 page states at 1280, 1024, 768 and 390 pixels, the dark theme, the redirects, Edit product and the keyboard.

Found and fixed:

- Receive goods scrolled the whole page sideways on a phone and tablet; the customer panel's statement, and the Purchases panel's
  line items, ran past their panels. Cause: a single-column grid sized by its widest child. Fixed in the shared form, detail-panel
  and page grids, and the line items now scroll inside their own box.
- The Categories list on a phone hid the actions menu off the edge; its "Part of" column now gives way on a phone.
- Category names and stock-change links looked like unstyled browser links; stand-alone links are now 44px tall on a phone.
- The Stock tab strip is tighter on a phone so more of it shows (the rest scrolls sideways).

Passing: no page errors, dark theme readable, 10 of 10 old addresses move to the new page, held-back addresses and every address
with the New look off stay put, Edit product sends only the changed price, the Owed control works with the arrow keys, and Escape
returns focus to the row.

Still to look at by eye: the Stock count steps, the New customer and New supplier forms at 1280, and Home and Sales beyond layout
numbers (Home and Sales were checked in earlier phases).
