# P6-4: Language and format sweep (AC-34)

Checked on a production build of this tree with mocked server answers (no real store was reachable). Nothing here has been seen
on the real test store.

## Method

1. Static side. `src/newlook/labels/labelsInOnePlace.test.js` scans every component folder, but it skips every `strings.*.js`
   file, so only the shared `strings.js` was ever read for old terms. New file `src/newlook/labels/stringsFiles.test.js` reads all
   17 strings files for the old names of the rename map, and checks that the component scan reaches every folder (auth, setup,
   settings, expenses, reports, shell, till, and the Phase 4 folders) and that no component file on disk is skipped by accident. Three
   internal values are allowed with a stated reason (the top category name, the stored unit value, the expense record-type key);
   "Account provisioning" is allowed because the rename map places it in Settings, Advanced.
2. Rendered side. A Playwright run (Chromium, light theme, made-up data) opened 73 page states of the New look: every page, tab,
   panel, report, Settings section and set-up step; empty lists; a cashier's view; the phone layout of the six list pages; the till.
   From each page it pressed every button, tab, link and menu item inside the page, and the main button of each dialog (so empty
   forms show their errors): 1,416 states in all, then 171 states again after the fixes. A separate pass drove the till (open,
   store menu, More options, Till open panel, shift count, add item, over-stock, discount, customer, hold, held list, pay screen
   with each method, split, receipt). A third pass made every server call fail five ways (no network, 500 with a traceback, 417
   with a server message, 403 permission, `success: false` with "Error 417") on 25 pages. A fourth drove Sign-in: empty form, bad
   id, wrong password, locked (14 minutes and 1 minute), network, 500, disabled account, two-step code.
   For each state it collected every visible text node, `aria-label`, `title`, `placeholder`, `alt`, input values, the names of all
   controls and all alerts, and applied these rules: old terms (case-insensitive whole words, the rename map plus wider jargon),
   money (`KES 2,350`: prefix, space, comma, no `$`, `Ksh`, `.00`, shortened only in chart SVG text), dates (no ISO, no month
   first, no 12-hour), emails, phone shape, percentages (more than one decimal), counts ("1 days", "0 item", "(s)"), codes in
   messages, generic button names, `Name - XX` company suffixes, em dashes. Pages reached by pressing a link to a current screen
   were left out of the New look results (they are the earlier screens).
3. Plural strings were also checked in the source: every `{count}`, `{days}`, `{points}`, `{minutes}` template in the strings
   files was traced to its caller to see that a count of one is handled.

## Results

| Rule | Result |
|---|---|
| Old terms outside Settings, Advanced | Found and fixed: till store menu listed Work In Progress, Finished Goods, Goods In Transit, All Warehouses; till said "per Nos", "1 Nos", "Exit point of sale", "Point of sale"; the old Done and Apply buttons. Left: see below |
| Money | Pass on every New look page. Found and fixed in the till: the total printed `KES800` (no space). Shortened figures (1.5K) appear only in chart axis text |
| Dates and times | Pass: no ISO date, no month-first date, no 12-hour time in any New look page (the native date input exists only on earlier screens) |
| Names, not emails | Pass for every list and panel after the Sales fixture was made like the real server (the server already sends the name). Left: Settings, Team shows the login email under the name |
| Phone numbers | Found and fixed: Sales receipt panel (`+254712345678`), Reports, Who owes me money (`0712345678`), Settings Business (3 fields) and the Team person dialog showed the stored form |
| Percentages | Found by reading the code: the profit margin, report shares and the product margin printed whatever decimals the server sent. Fixed |
| Counts with their noun | Found and fixed: "Saved 1 rows" (8 pages), "1 sales" (Till sessions cards), "1 days" (Who owes me money, oldest stock), "Cart now has 1 items", "item(s)" in the offline sales list |
| Buttons | Found and fixed: till "Apply" (now Apply discount), "Remove" (Remove discount), "Done" (Close). "More", "Back", "Next" are menu and paging controls and stay |
| Messages | Found and fixed: a bare "frappe.exceptions.PermissionError" reached the screen; "Error 417: ..." reached the screen; field names "item code" and "unit of measure" in missing-information messages; the 404 page printed "404" |
| Sign-in errors | Pass: every case shows our own sentence. Known: the old sign-in code also raises its own "Login Failed" pop-up (P5-5 follow-up); with the fix to `friendlyError` its text no longer carries "Error 500" |

## Fixes

| Change | Files |
|---|---|
| Rows, percentages helpers | `src/newlook/components/format.js` (`formatPercent`, `percentNumber`, `rowsWords`), `src/newlook/strings.js` (`rowNoun`, `notFound`) |
| "Saved 1 row" | eight `strings.*.js` files (`exportDone`) and `SalesPage`, `PurchasesPage`, `CustomersPage`, `ExpensesPage`, `ProductsPage`, `ReportPage`, `SuppliersPage`, `StockLevelsPage` |
| "1 sale" in Till sessions | `sales/SalesPage.jsx`, `sales/strings.sales.js` |
| Phone in the receipt panel | `sales/ReceiptPanel.jsx` |
| Phones, days, percentages in reports | `reports/reportsModel.js`, `reports/strings.reports.js` |
| Home and Products margin | `home/HomePage.jsx`, `products/ProductPanel.jsx` |
| Phones in Settings (an untouched number is saved exactly as stored) | `settings/businessModel.js`, `settings/PersonDialog.jsx` |
| 404 page without a number (New look only) | `src/pages/NotFound.js` |
| Error text | `src/utils/friendlyError.js` |
| Till, New look only (the old till is unchanged) | `src/pages/Sales/NewSale.js`, `pos/PosHeader.jsx`, `pos/ProductPanel.jsx`, `pos/OrderPanel.jsx`, `pos/ReceiptDialog.jsx`, `pos/HeldSalesDialog.jsx`, `pos/OfflineSalesBar.jsx`, `newlook/till/strings.till.js` |
| Context exported for tests | `newlook/NewLookProvider.jsx` (`export` on `NewLookContext`) |

Tests added: `components/formatSweep.test.js` (24 cases with the reports file), `reports/languageSweep.test.js`,
`labels/stringsFiles.test.js` (39), `utils/friendlyError.test.js` (4 new), `settings/businessModel.test.js` (4 new),
`settings/TeamPeople.test.jsx` (1), `sales/SalesPage.test.jsx` (3), `pages/Sales/pos/tillWords.test.jsx` (14, New look and old
look side by side). Two tests changed to the new phone display (`0711 000 000`).

## What remains, and why

| Item | Why |
|---|---|
| Payment method names "Bank Draft", "Wire Transfer", "Cheque" in Settings, Till and payments and inside the till's Other group | They are the shop's own payment method names; the cashier and the owner need them to say which one was used. They appear only inside the Other group |
| Server wording ("Sales Invoice", "Purchase Order", "Item ... is mandatory", record names such as `MAT-STE-2026-00012`) | Sentences and references come from the server. Stock Movements keeps the system reference as its Reference column and link |
| The printed and on-screen sale receipt after a sale shows the system invoice number as "Receipt no." | It is the legal document number (eTIMS); changing it is an owner decision. Sales, the list and panel already use `#0045` with the reference under Details |
| Settings, Team shows each person's login email under their name | Two people can share a name, and this list is where logins are managed. Decision for the owner |
| Supplier form says "Supplier group"; toasts "Could not load warehouses" / "staff users" come from older store code | Not in the rename table; wording of older shared code |
| An en dash marks an empty value | The brief forbids em dashes; the en dash is not one. Change if you want a word |
| Current screens opened by link (Roles, Payment gateways, Import, the earlier Purchases screens...) | Out of scope: earlier screens |
| The redirect preview page (`/new-look/redirects`) lists the old names on purpose | Owner tool |
| Chart axis labels use 1.5K, 25K | Allowed by the format table |

## Needs the real test store

Real server wording (what the server says on a refusal), real names in the Sales cashier column, the real shape of customer
and company phone numbers, receipts printed on a real printer, and Swahili text.
