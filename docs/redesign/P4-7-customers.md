# P4-7: Customers page, customer panel, statement and WhatsApp link, Owing tab

Front end of ticket P4-7. The back end calls are in the back end repository on branch `claude/customers-list-api`
(`docs/redesign/P4-7-contract.md`). This note says what was built, how the Done-when was checked, what was decided, and where
every old customer and loyalty action went.

## What was built

| Address | Page | Files (all in `src/newlook/customers/`) |
|---|---|---|
| `/new-look/customers` | Customers: tabs All customers and Owing, summary row, filters, table, customer panel | `CustomersPage.jsx`, `CustomerCards.jsx`, `CustomerPanel.jsx` |
| `/new-look/customers?tab=owing` and `/new-look/customers/owing` | The Owing tab (the second address redirects to the first, so the old Customer Credit address lands here) | `OwingRedirect.jsx` |
| `/new-look/customers/new` | New customer form on the shared Form page | `NewCustomerPage.jsx`, `CustomerForm.jsx` |
| `/new-look/customers/:id/edit` | Edit customer form (same fields plus Disabled) | `EditCustomerPage.jsx`, `CustomerForm.jsx` |

Panel sections: `StatementSection.jsx`, `CreditSection.jsx`, `LoyaltySection.jsx` with `LoyaltyDialogs.jsx`. The rules (tabs, dates,
phone numbers, CSV, WhatsApp text, statement period, form checks) are plain functions in `customersModel.js`. Every word is in
`strings.customers.js`. The API client is `src/api/customersListApi.js` (new calls and the current customer, credit and loyalty calls).
Styles are `customers.css`, tokens only. Routes: one import and one route line per page in `src/newlook/newLookRoutes.js`
(and `/customers`, `/customers/owing`, `/customers/new` added to `OWN_ROUTES`). `BUILT_PAGES` was not touched.

### The list (List page pattern, AC-25)

Tabs All customers and Owing (a cashier has no Owing tab). Summary row: Customers, Owing, Customers who owe (a cashier gets
Customers only). Filters in the address: search by name, number, email or mobile; Type; Status (Active, Disabled, All; not on the
Owing tab). Columns: Customer, Mobile (0712 345 678), Balance owed (owner and manager only), Last purchase (5 Oct 2026, or "No
purchases yet"), Status (icon and word). "Showing x of y" with the server's exact count, rows per page never blank (20), Export CSV
and Add customer in the header, one-action empty states, cards below 768px behind a Filters button, a link past the last page goes
to the last page. The first question is not asked until the server has said who the person is, so an owner never fires a cashier's
question first.

The Owing tab lists exactly the customers with a balance above zero, most owed first. Its rows add up to the Owing figure in the
summary, which is the figure on Home (same rows, same code on the server). Tested in `CustomersPage.test.jsx`.

### The panel (AC-28)

Name with Active or Disabled, type, mobile, email, KRA PIN (group and area only if the shop uses them), Balance owed, Last purchase
(date and amount), the customer number under Details. WhatsApp: the footer button opens a `wa.me` link built with `whatsappNumber`
and a ready message; when they owe, the message is Home's reminder wording (`S.home.attention.reminder`), otherwise a hello. The
message is an editable field; nothing is sent by the app. With no usable mobile there is no button and a reason with a way to add a
number. Statement: Last 30 days, Last 90 days (first), This month or Custom (From and To); a table Date, Document (Sale #S0004,
Return #S0006, Payment #P0003), Debit, Credit, Balance; the balance at the start and at the end; Send statement on WhatsApp (a link
with the balance and the latest five lines), Print (print-only block through `window.print()`, same pattern as the receipt), and
Export (CSV). Credit: limit, owes, available, "Over the limit" with an icon, a field to set the limit, Remove limit (asks first), and
the credit history with From and To. Loyalty: programme, points, Assign programme, Redeem points, Points history (dialogs rebuilt
here, calling the current loyalty calls). Edit and Disable (asks first, names what happens); a disabled customer shows Enable.

### The forms (AC-26)

Name (required), Mobile (required; 0712 345 678, +254 712 345 678, 254712345678 and 712345678 are accepted and saved as
+254712345678), Type (Individual, Company, Partnership as the till has), under More options: Email and KRA PIN, and Group and Area
only when the server's `features` say the shop uses them. Errors beside each field and in the summary at the top; "Not saved yet"
until a save, then "Saved"; Cancel and links ask first when there are changes; Save and add another (New only); More options opens
by itself when the error is inside it; a name the shop already has is explained beside the name.

## How the Done-when was checked

"The customer half of AC-28 passes": the customer panel shows balance owed, last purchase, a WhatsApp button and a statement; the
Owing tab lists the same people as the balances.

- Balance owed, last purchase, WhatsApp button and statement in the panel: `CustomerPanel.test.jsx` (53 tests).
- The Owing tab lists the same people as the balances: `CustomersPage.test.jsx` ("the balances shown add up to the Owing figure in
  the summary", "lists exactly the customers who owe, most owed first"), and on the server `test_customers_list_api.py` (the Owing tab
  total equals the summary and the sum of the balances; the summary equals Home's money-owed figure; the statement's closing balance
  equals the balance in the list).
- A cashier sees no balances: tests for the list, the cards, the CSV and the panel; on the server the balance keys are absent.
- Forms: `CustomerForm.test.jsx` (37 tests). Model: `customersModel.test.js` (36). Client: `customersListApi.test.js` (24).
  Routes: `routes.test.jsx` (4). Total 191 front end tests, all passing, plus 149 back end tests.
- Lint with `--ext .js,.jsx` is clean for `src/newlook/customers`, `src/api` and `newLookRoutes.js`. The word scanner, colour ratchet and
  token tests pass for these files. (The word scanner currently fails for `products/` and `stock/` files of other helpers, on
  `rowKey`, `aria-required` and an old address in `CountStockFlow.jsx`; nothing in `customers/` is flagged.)

## Decisions

1. **Disabled is a checkbox, not a switch.** The shared Switch takes effect at once and says "Saved", which would be false on a form
   that has not been saved. The shared Checkbox keeps the page's own "Not saved yet" honest. Disable and Enable in the panel act at
   once and ask first.
2. **Type keeps Partnership** (the brief said Individual or Company). The till's quick add and the current form both offer it, and
   nothing may be lost.
3. **Mobile is required on New.** On Edit it is required unless the customer had none, and an unchanged number is never checked again
   (an old record may hold a number from elsewhere).
4. **Dialogs are drawn beside the detail card, not inside it.** The card closes itself on Escape; a dialog inside it loses its own
   Escape to the card and the whole panel closes. The panel therefore owns the Disable, Remove limit and the three loyalty dialogs.
5. **Loyalty dialogs were rebuilt** (assign, redeem, history, with the balance in the block); they call the current loyalty calls
   unchanged. Loyalty programmes themselves stay in Settings (open question 16).
6. **The statement's balance is worked back from what is owed now** (server contract): a statement that runs to today always ends at the
   list's balance. The opening balance can therefore be negative if the customer was ahead.
7. **Status filter**: the old list had "Include disabled"; the new list has Status (Active, Disabled, All) on the All customers tab.
   The Owing tab always includes disabled customers who owe.
8. **Search** covers name, customer number, email and mobile, as the old list did.
9. The customer panel `Group` and `Area` words replace the old terms Customer Group and Territory (rename map).

## Old action, where it is now

| Old action | Where it was | Where it is now |
|---|---|---|
| Add customer | Customers, header button | Customers, header button **Add customer**, and + New, Customer: `/new-look/customers/new` (the till's quick add is unchanged) |
| Edit customer | Customers, row menu | Panel, **Edit**: `/new-look/customers/:id/edit` |
| Disable a customer | Edit form, Disabled switch | Panel, **Disable** (asks first) and **Enable**; also the **Disabled** box on the edit form |
| View details | Row menu | Click a row: the panel (a full page below 1100px) |
| Search by name, number, email or mobile | List filter | Search box (same fields), in the address |
| Filter by Customer type | List filter | **Type** choice, in the address |
| Include disabled | List filter | **Status** choice (Active, Disabled, All) |
| Filter by Customer group or Territory | List filters | **Not placed.** Hidden because most shops do not use them; the list has two choices only (Type, Status). Still on the current Customers screen. Follow-up if a shop with groups needs it |
| Header stats Total, Active, Over limit | List header | Summary row: Customers (active), Owing, Customers who owe. "Over limit" is shown per customer in the panel's Credit section |
| List columns Credit limit, Available credit, Utilization | List | Panel, **Credit** section: limit, owes, available, "Over the limit" |
| Customer group and Territory on a customer | Customer form | Edit and New forms, **More options**, only when the shop uses them (server `features`) |
| Default currency and Default price list on a customer | Customer form | **Not placed.** Not in the till's quick-add fields or the brief's field list, and there is no source for the choices yet. Still editable on the current Customers screen (`/customers`, Edit). Needs an owner decision (new open question below) |
| Set or remove a credit limit | Row menu, `/customers/credit` | Panel, **Credit**: field, **Save limit**, **Remove limit** (asks first) |
| Credit history with From and To | Row menu, `/customers/credit#history` | Panel, **Credit**: **Credit history** with **History from** and **History to** |
| The Customer Credit page (`/customers/credit`) | Menu | Redirect table sends it to `/customers/owing`, which opens the **Owing** tab (a `customer` in the address opens that customer's panel) |
| Assign loyalty program | Row menu | Panel, **Loyalty**, **Assign programme** (dialog; marks programmes that are not active) |
| Redeem points | Row menu | Panel, **Loyalty**, **Redeem points** (dialog; refuses more than the balance) |
| Loyalty balance | Row menu / details | Panel, **Loyalty**: **Points** |
| Loyalty (points) history | Row menu | Panel, **Loyalty**, **Points history** (dialog with From, To and kind) |
| Loyalty programs: create, edit, filter | Settings | **Not in this ticket.** Stays in Settings (current screen) until the Settings phase; open question 16 default |
| Statement, last purchase, WhatsApp | Did not exist | Panel (new) |

## New or changed assumptions

- The existing credit history call lists Sales Invoices, credit notes and payment entries only, so a credit sale still sitting in an
  open till (an unmerged POS invoice) is in the panel's Statement but not in its Credit history. The existing call was not changed.
- The existing `get_customer_credit_limit` and `get_customer_credit_history` calls are not limited by role on the server; the page hides
  the Credit section from a cashier but those two old calls are as they were.

## New open question

| No. | Question | Default |
|---|---|---|
| 25 | Do shops still need to set a customer's default currency and default price list from the customer form? | Keep them on the current Customers screen until an owner says otherwise; add a Price list choice under More options only for shops that have more than one price list |

## Needs browser check

1. `/new-look/customers` at 1280, 1024, 768 and 375 px: the table with the panel open (the table scrolls sideways inside itself), the
   panel as a full page below 1100px, cards and the Filters button on a phone, 44px buttons in the panel on a phone.
2. The panel in light and dark: the section dividers, the Statement table in a narrow panel, the Credit and Loyalty buttons wrapping.
3. Printing: open a customer with a statement, press Print: only the statement shows in the print preview (A4), numbers right-aligned.
4. The WhatsApp links open WhatsApp with the message ready (a phone with WhatsApp, and WhatsApp Web on a computer).
5. Escape in each dialog (Disable, Remove limit, Assign, Redeem, Points history) closes only that dialog and returns the keyboard to
   its button; Escape on the panel closes the panel and returns the keyboard to its row.
6. The New customer form at 375 px: one column, sticky footer above the on-screen keyboard.
