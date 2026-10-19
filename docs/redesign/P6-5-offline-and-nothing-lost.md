# P6-5: Offline check (AC-39) and nothing-lost check (AC-40)

Both were checked on a production build of this tree in Chromium, with mocked server answers and made-up data. No real store was
reachable, so the real server, a real printer and a real flaky network have not been tried.

## AC-39: the till offline

### How

Playwright, the till at `/sales/pos`, once with the New look on and once off, with the same steps. The till loaded online first
(products from the server, an open shift, payment methods), the service worker became ready, the page was reloaded once so the
worker controlled it, and then `context.setOffline(true)` was set. From then on every `/api/method` request was recorded and
aborted, so a request that was attempted is on record even though it could not succeed. Each step has its own list of requests, and
the two runs are compared. Script: `scratchpad/phase6-language/offline.js`.

### Results (the audit's offline list, section 5)

| Item of the list | New look on | New look off |
|---|---|---|
| 1. The app itself opens with no network, including after a reload (service worker) | Pass | Pass |
| 2. Search and sell from the saved product list | Pass (search narrows to one product) | Pass |
| 3. Keep the open shift and carry on | Pass (reload offline lands back on the till with the shift) | Pass |
| 4. Add items, change quantity | Pass (2 items, quantity 2) | Pass |
| 5. Complete a cash sale, queued on the device | Pass (queue 1, receipt shown); after the reload a second cash sale also queues (queue 2) | Pass |
| 6. Hold a sale | Pass (cart cleared, "Held sales (1)", kept on the device) | Pass |
| 7. The offline bar: status, count of waiting sales | Pass ("Offline. Cash sales are saved ... 1 waiting.", still there after reload) | Pass |
| Reconnect | The waiting sales upload by themselves (two `create_pos_invoice` calls) and the queue is empty | Same |
| After the reload offline, the pay screen still offers Cash (saved payment methods) | Pass | Pass |

### Requests made, step by step

| Step | New look on | New look off |
|---|---|---|
| Go offline, search | none | none |
| Add items, change quantity | none | none |
| Hold a sale | `held_sales_api.save_held_sale` (fails offline, the till keeps the sale on the device) | the same |
| Complete a cash sale | `sales_person_api.list_sales_persons` (asked when the pay screen opens) | the same |
| Bring back a held sale | background retries of `list_held_sales` and the 30 second upload retry | the same calls (the order differs with timing) |
| Reload while offline | the till's load calls, plus `setup_api.get_business_features` and `payment_methods_api.get_till_payment_modes` | the same without those two |

So: adding an item and searching make no request at all. Holding a sale and opening the pay screen each make one request, in both
modes, and both are the old till's own calls (it tries the server first and falls back to the device). Completing a cash sale offline
makes no request of its own. The New look adds no request to any of the three actions; it adds two read requests when the till
first loads (the shop's payment method switches, which it keeps on the device for exactly this case, and the business features),
and both fail quietly offline.

### Different with the New look on

Nothing that blocks selling. The New look shows "per piece" for the unit, "Held sales" and the pay screen's own layout; the
steps and the numbers are the same. The two extra load requests above are the only difference in requests.

### Defects found

None in offline behaviour. While building the check, the seeded test user had no roles, which sends a reload offline to the
dashboard; real signed-in users keep their roles on the device, so this was a fixture fault.

### Needs the real test store

A real network drop and recovery (flaky signal, not a clean switch-off), a sale made offline refused by the real server on
upload ("need a manager"), the service worker after a real deploy, and a device that was never online with the New look on.

## AC-40: nothing lost

### How

1. `src/newlook/nothingLost.test.jsx` (189 tests) reads the real route list of the current app (`src/routes/routes.js`), the real
   redirect table and live list, the real New look routes, and every strings file and source file of the New look. It checks:
   the 43 action rows below (a page is a real screen; a control's label exists; a link carries `legacy=1`, resolves to a real route
   and is not redirected away); every one of the 135 routes of the current app either opens a live New look page or is a current
   screen that a New look screen links to (or sits inside one that is); every top-level menu item and all second-level menu entries
   have a place. A route added later with no home fails the test.
2. `scratchpad/phase6-language/ac40.js` presses each control in the browser (made-up data) and follows each link to a current
   screen: 58 checks, all pass.

### Homes added because there was none

| Gap | Home added |
|---|---|
| First store, store staff, staff assignment (a one-store shop has no Locations tab) | Settings, Advanced, **Stores** (opens the current Stores screen) |
| Stock transfers for any shop | Settings, Advanced, **Stock transfers** |
| Material transfer list and form | Settings, Advanced, **Move stock between stores** |
| Manufacture and Repack stock entry | Settings, Advanced, **Make or repack goods** |
| Bulk price update | Settings, Advanced, **Update many prices** |
| Product variations | Settings, Advanced, **Product variations** |
| Load Products | Settings, Advanced, **Load products** |
| Bulk opening stock import | Settings, Advanced, **Import opening stock** (also linked from the set-up wizard) |
| New sales invoice (old Sales menu: New Invoice) | Sales, **More sales screens**, New invoice (earlier screen); not offered to a cashier |

Files: `settings/settingsModel.js`, `settings/strings.settings.js`, `sales/SalesPage.jsx`, `sales/strings.sales.js`.

### The table (audit section 4)

"Browser" means the control or link was found in the live page in the browser run. "Test" is `nothingLost.test.jsx`.

| No. | Action today | Where it is now | Checked |
|---|---|---|---|
| 1 | Add, edit, disable a customer | Customers: Add customer; panel Edit, Disable | Browser, test |
| 2 | Credit limit set or remove; credit history | Customer panel, Credit section (Save limit, Remove limit, history) | Browser, test |
| 3 | Loyalty assign, redeem, balance, history | Customer panel, Loyalty (Assign programme, Redeem points, Points history) | Browser, test |
| 4 | Customer group, territory, price list | Customer form, More options (hidden unless used) | Browser |
| 5 | Add, edit, enable or disable a supplier; detail | Suppliers: Add supplier; panel Edit, Disable | Browser, test |
| 6 | Supplier groups | Suppliers, More actions, Supplier groups; Settings, Advanced | Browser (opens `/suppliers/groups?legacy=1`), test |
| 7 | Stock list with filters and CSV export | Stock levels, Overview, Export | Browser, test |
| 8 | Stock adjustment; reconciliation per item | Count stock tab; row menu Count this product | Browser, test |
| 9 | Discount rule for an item | Row menu Create a discount rule; Settings, Till and payments | Browser, test |
| 10 | Low stock, Create receipt | Low stock tab, Reorder (opens a new purchase) | Browser, test |
| 11 | Expiry alerts | Expiry tab (shops that track expiry) | Browser, test |
| 12 | Stock ledger | Movements tab (filters, Export) | Browser, test |
| 13 | Stock entries: edit, submit, cancel, print, costs | Movements row link to the entry on the current screen (`legacy=1`) | Browser, test |
| 14 | Material receipt, issue, transfer | Stock in, Stock out or write-off; transfers: Transfers tab, Advanced | Browser, test |
| 15 | Edit price, SKU, unit, expiry, batch per item and store | Row menu, opens the current Inventory Details | Browser (opens it), test |
| 16 | Multi-level stock count (three roles) | Count stock step 1, "Count in three steps by role" | Browser, test |
| 17 | Stores: add, edit, staff, default, assignment | Locations tab (second store); Advanced, Stores (first store) | Browser (both open `/warehouses`), test |
| 18 | Stock transfers | Transfers tab (second store); Advanced, Stock transfers | Browser, test |
| 19 | Purchase order: create, edit draft, submit, cancel | New purchase (Save and send order); order panel: Edit draft, Send order to supplier, Cancel | Browser, test |
| 20 | Receive goods (GRN), then purchase invoice | Receive goods button; panel Make the bill | Browser, test |
| 21 | Direct bill | New purchase, More options, "I already have the bill" | Browser, test |
| 22 | Purchase receipt (stock only) | Purchases, More purchase screens, Record goods with no order (earlier screen) | Browser (opens `/purchases/receipts/new?legacy=1`), test |
| 23 | Pay a supplier invoice; cancel; print | Bill panel: Pay bill, Cancel, Print | Test, browser (see note) |
| 24 | Purchase return | Returns tab; bill panel Create return (current return screen) | Browser, test |
| 25 | Print on each purchase document | Panel, Print | Browser, test |
| 26 | POS profile switches | Settings, Till and payments, Till options | Browser, test |
| 27 | Create or enable credit payment | Till and payments, On credit (current screen) | Browser, test |
| 28 | M-Pesa, Pesapal, PayPal setup and test | Till and payments, Payment gateways (current screen; keys only there) | Browser, test |
| 29 | Inventory discount rules | Till and payments, Inventory discounts | Browser, test |
| 30 | Loyalty programs | Till and payments, Loyalty programmes | Browser, test |
| 31 | Business details; bank accounts | Settings, Business; bank accounts card | Browser, test |
| 32 | eTIMS settings | Settings, Tax | Browser, test |
| 33 | Two-factor; idle sign-out | Team and security, Security | Browser, test |
| 34 | Audit trail with export | Team and security, Audit trail | Browser, test |
| 35 | Account provisioning | Settings, Advanced | Browser, test |
| 36 | Staff create, edit, roles, enable or disable | Team: Add a person; row menu Change details or role, Deactivate | Browser, test |
| 37 | Roles and permissions | Team and security, Roles and permissions (current screen) | Browser, test |
| 38 | Station screen | Settings, Advanced, Station screen settings | Browser, test |
| 39 | Industry starter products | Settings, Advanced; set-up wizard | Browser, test |
| 40 | Reports: 6 reports, 13 sub-reports, export | Reports landing, seven report pages, More reports | Browser, test |
| 41 | Register, Onboarding, Getting started | Set-up wizard from "Set up now" on Home | Browser, test |
| 42 | Sign-in with two-factor; forgot password | New Sign-in (same steps, Forgot password link) | Browser, test |
| 43 | Till (section 3.9) | Go to till (top bar); the till is the current screen with New look parts | Browser, test |

Note on 23: the first browser run opened the wrong fixture record; after correcting it the bill panel shows Pay bill and Print.
Every row now passes.

### The old menu

All 13 top-level entries and all second-level entries have a place (tested):

| Old menu | New look |
|---|---|
| Dashboard | Home |
| Products (All, New, Categories) | Products, tabs, New product; Brands, Units, Warranties, Price Groups, Load Products, Update Price, Variations, Bulk stock import: Settings, Advanced |
| Sales (Point of Sale, Sales History, Opening Entries, Returns) | Go to till; Sales with tabs All sales, Returns, Till sessions; New Invoice: Sales, More sales screens |
| Stores | Stock levels, Locations; Settings, Advanced, Stores |
| Inventory (Overview ... Wastage, Recipes) | Stock levels tabs; Recipes, Wastage: Advanced |
| Customers (All, Credit) | Customers, Owing tab |
| Suppliers (All, Groups) | Suppliers; groups in the More menu and Advanced |
| Purchases (all eight entries) | Purchases tabs, Receive goods, More purchase screens |
| Stock Transfers | Transfers tab; Advanced |
| Staff, Roles | Settings, Team and security |
| Settings (14 entries) | Five sections; the rest as Advanced cards |
| Reports | Reports |
| Station screen, Industry products (hidden) | Settings, Advanced |

### Needs a decision from the owner

1. A stock transfer for a one-store shop has nothing to transfer; the Advanced cards give it a home anyway. Say if you would rather hide them for one-store shops.
2. Whether the printed sale receipt should show `#0045` instead of the system invoice number (see P6-4).
3. Whether the Advanced list is the right long-term home for Stores, Stock transfers and bulk price update, or whether any of them should become a button on Stock levels or Products.

### Needs the real test store

Each link opens the current screen in the browser here, but whether a given role may open it (a cashier, a manager) depends on
the real role setup; the current screens apply their own checks as before.
