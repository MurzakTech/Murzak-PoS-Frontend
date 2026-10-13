# P1-7: + New menu, rename map and redirects

Recorded 13 October 2026. Ticket P1-7 of the Murzak POS redesign (Done when: AC-05 and AC-06 pass).

## What was built

| Part | What it does |
|---|---|
| **Redirect table** (`src/newlook/redirects/redirectTable.js`) | Every one of the 127 old addresses in the app, once each, with the new page it leads to: 60 clear in the Spec, 57 where the Spec is silent and I had to choose (each with a note), and 10 outside the redesign (sign-in, the public pages, the kitchen screen, the New look switch itself) |
| **Redirect engine** (`engine.js`) | Sends an old address to its new page, keeps the record the person had open (`/sales/invoice/ACC-PSINV-2026-00005` becomes `/new-look/sales?open=ACC-PSINV-2026-00005`), their page number and filters, and replaces the old address in the browser history so Back does not bounce. When two entries match, the more specific wins |
| **Switched on page by page** (`live.js`) | A redirect works only when its new page is a finished screen. **No new page is finished yet, so today nothing is redirected and every old screen works exactly as before.** Each later ticket adds its page to one list when it builds the page |
| **Placeholders** | Every new address already exists and shows a "being rebuilt" notice that names the page and has an **Open the current screen** button, so no redirect can end on "not found" |
| **Old addresses page** (`/new-look/redirects`) | The whole table for you to review, with a filter for the 57 that need a decision, a "Try it" link on each and the **Preview the redirects** switch |
| **Sidebar** | The nine items use the new names and open the current screen until their new page is built (the new page once it is). Staff and Roles have no item: they keep Settings highlighted, so Staff is reached only through Settings, Team. Stores and Stock transfers keep Stock levels highlighted |
| **+ New menu** | Sale, Product, Customer, Expense, Purchase. Each shows only if the person's role may open the screen it leads to (the app's existing role check). Expense shows as "Expense (coming soon)" and cannot be chosen until its page exists. The same actions are found by search ("add product", "add customer") |
| **Rename map** (`src/newlook/labels/renameMap.js`) | One list of old name to display name from the Spec's table (34 entries: 25 renames, 7 hidden, the receipt number pattern, and Account Provisioning awaiting your confirmation), plus lookups so a search for an old name ("GRN") still finds the new one ("Receive goods"), and the phone and receipt-number formats |

## The Preview switch (please read)

AC-06 says every old address redirects to its new page and none shows "not found". The new pages do not exist yet, so a real redirect today would send people from a working screen to an empty one. I therefore built it so that nothing changes for anyone until a page is finished, and added a **Preview the redirects** switch (on the Old addresses page and in the App shell card on the component page). It is stored on your device only. With it on:

- every old address redirects to its new page, and a page not built yet shows the "being rebuilt" notice with a way back to the current screen;
- the sidebar and + New open the new pages.

With it off (the normal state), the sidebar and + New open today's screens, and old addresses open as they always did. This is a design decision the Spec does not make; if you would rather the redirects work for everyone from now on, I can switch them on, but then the demo store's Sales, Products and so on would show the placeholder until each page is built.

## Address scheme (please read)

The new pages live under `/new-look` for now (for example `/new-look/sales/unpaid`), because the old screens still occupy `/sales`, `/products` and so on. The prefix is one constant and is dropped when the old screens are removed (rollout stage 5). The Spec gives only one example address (`/sales/unpaid`); the rest of the scheme is mine, in the table's header comment:

- tabs are part of the address (`/stock/low`, `/purchases/orders`);
- a record opens in the detail panel through `?open=` (`/sales?open=0033`);
- a header button that opens a short form is the parent page plus `?action=` (`/stock?action=in`, `/purchases?action=receive`);
- something moving into Settings, Advanced is `/settings/advanced?section=...`.

## How it was checked

- **Automated tests:** the whole suite is 59 files and 1,109 tests, all passing. New tests cover the engine (specific beats general, record and filters kept, nothing happens for unknown, kept or not-live addresses), the preview switch, the redirect gate (off, on but not built, preview on), the placeholder, the menu (old and new pages, Home not claiming every page, Staff and Roles under Settings), the + New menu (role filtering) and the rename map. One test walks **all 117 redirectable old addresses** (the other ten are outside the redesign) through the engine with the preview on and checks each lands on a New look page; another checks every page the table sends people to exists.
- **Real browser, 26 checks, all passing:** with the preview **off**, four sample old addresses stay put; the Old addresses page lists all 127 and its filter shows the 57; with it **on**, all 117 redirectable addresses (the remaining ten are outside the redesign) land on a New look page and none shows "not found"; a sale link keeps its record and page; Material Receipts becomes Stock levels, Movements; Back does not bounce; Staff goes to Settings, Team with Settings highlighted; every sidebar item opens a New look page and highlights correctly; + New lists the five and Expense cannot be chosen; + New, Product and the search action "Add customer" open the right pages; switching the preview off sends the sidebar and + New back to today's screens.
- The earlier shell, overlay and data browser checks (66, 59 and 40) still pass.

## Entries that need your decision (57)

The Spec says where about half of the old pages go. For the rest I chose the closest place and wrote down why. Please look at these; the same list, with a filter, is on the Old addresses page. Anything you change is one line in the table.

### Sales and products

| Old address | Goes to | What I assumed |
|---|---|---|
| `/sales/invoice/:id/edit` | `/sales?open=:id` | The Spec has no edit screen for a sale. Assumed the receipt panel is the closest place, because a sale is changed there by taking payment or returning items. |
| `/products/update-price` | `/products` | The Spec does not mention a bulk price update. Assumed prices are changed from the product list and its detail panel. |
| `/products/variations` | `/products` | The Spec does not mention product variations. Assumed they are handled inside the product form and panel. |
| `/products/bulk-import` | `/products/import` | The Spec only names one Import button. Assumed a bulk product import is the same Import page. |
| `/products/bulk-stock-import` | `/products/import` | The Spec does not say where an opening stock import goes. Assumed it is a choice on the same Import page, because Stock in is a single short form, not a bulk import. |
| `/industry/:industryCode/products` | `/products/import` | This is the industry starter catalogue opened from the old Dashboard. The Spec names no screen for it. Assumed it is part of Import, and the first-time set-up wizard may replace it. |

### Stock levels and the old transfers and stores pages

| Old address | Goes to | What I assumed |
|---|---|---|
| `/inventory/expiry-alerts` | `/stock/expiry` | The Spec says both that Expiry Alerts become a filter on Low stock and that Expiry is a tab for shops that track expiry dates. Assumed the Expiry tab, which only appears for those shops. |
| `/inventory/item-details` | `/stock` | The old page showed one item but its address carries no item reference. Assumed the Overview, where a row opens the item in the detail panel. |
| `/inventory/material-transfers` | `/stock/transfers` | The Spec does not mention Material Transfers. Assumed they are the same thing as Transfers, which only appears with a second location. |
| `/inventory/material-transfer` | `/stock/transfers` | The Spec does not mention a new Material Transfer form. Assumed it is the Transfers tab, which only appears with a second location. |
| `/inventory/stock-entry` | `/stock/movements?type=entry` | The Spec hides Stock Entry (Manufacture, Repack) unless the shop makes goods and gives no new form for it. Assumed the list of entries in Movements. |
| `/inventory/multi-level-reconciliation/:id/stock-take` | `/stock/count/:id` | The Spec does not mention the separate Add Stock Take step. Assumed it is a step inside the guided count for the same id. |
| `/stock-transfers/create` | `/stock/transfers` | The Spec gives no address for a new transfer. Assumed the Transfers tab, where the new transfer form is opened. |
| `/stock-transfers/create-request` | `/stock/transfers` | The Spec gives no address for a transfer request. Assumed the Transfers tab, where the request form is opened. |
| `/stock-transfers/:id/approve` | `/stock/transfers?open=:id` | The Spec does not say how a transfer is approved. Assumed approving is an action in the transfer panel. |
| `/stock-transfers/:id/dispatch` | `/stock/transfers?open=:id` | The Spec does not say how a transfer is dispatched. Assumed dispatching is an action in the transfer panel. |
| `/stock-transfers/:id/receive` | `/stock/transfers?open=:id` | The Spec does not say how a transfer is received. Assumed receiving is an action in the transfer panel. |
| `/warehouses/new` | `/stock/locations` | The Spec gives no address for adding a location. Assumed the Locations tab, where the add form is opened. |
| `/warehouses/:id/edit` | `/stock/locations?open=:id` | The Spec has no edit page for a location. Assumed editing happens in the location panel. |
| `/warehouses/:id/staff` | `/stock/locations?open=:id` | The Spec does not say where store staff is managed. Assumed the location panel, with people themselves managed under Team. |
| `/warehouses/staff-assignment` | `/settings/team` | The Spec has no staff assignment page. Assumed it belongs to Team, which covers people, role and till access. |

### Purchases

| Old address | Goes to | What I assumed |
|---|---|---|
| `/purchases/create-order` | `/purchases/new` | The Spec lists Create Order only under what the Purchases tabs replace. Assumed an order is started from the New purchase form, and the Orders tab lists it. |
| `/purchases/submit-order` | `/purchases/orders` | Submit Order is now Send order to supplier, but the Spec does not say where. Assumed it is an action on an order in the Orders tab. |
| `/purchases/grns` | `/purchases` | The Spec has no Goods received list among the three tabs. Assumed received goods show in All purchases, because the bill and the stock update together. |
| `/purchases/grns/:id` | `/purchases?open=:id` | Assumed a goods received note opens in the purchase panel, as there is no separate Goods received page. |
| `/purchases/receipts` | `/purchases` | The Spec lists Purchase Receipts as replaced but names no tab for them. Assumed All purchases. |
| `/purchases/receipts/new` | `/purchases?action=receive` | Assumed a new purchase receipt is the same job as the Receive goods button. |
| `/purchases/receipts/:id` | `/purchases?open=:id` | Assumed a purchase receipt opens in the purchase panel, as there is no separate receipts page. |
| `/purchases/invoices` | `/purchases` | The Spec lists Purchase Invoices as replaced but names no tab for them. Assumed All purchases, because a purchase invoice is the bill. |
| `/purchases/invoices/:invoiceNo` | `/purchases?open=:invoiceNo` | Assumed a purchase invoice opens in the purchase panel. The panel must accept an invoice number as well as a purchase id. |

### Reports

| Old address | Goes to | What I assumed |
|---|---|---|
| `/reports/inventory-valuation/value-by-category` | `/reports/stock-value` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/inventory-valuation/cost-method-comparison` | `/reports/stock-value` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/inventory-valuation/value-trends` | `/reports/stock-value` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/stock-movement/turnover` | `/reports/stock-movement` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/stock-movement/days-on-hand` | `/reports/stock-movement` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/stock-movement/movement-patterns` | `/reports/stock-movement` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/aging-stock/stock-aging` | `/reports/aging-stock` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/aging-stock/obsolescence-risk` | `/reports/aging-stock` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/aging-stock/aging-recommendations` | `/reports/aging-stock` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/performance-metrics/accuracy` | `/reports/performance` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/performance-metrics/variance` | `/reports/performance` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/performance-metrics/adjustment-trends` | `/reports/performance` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report. |
| `/reports/performance-metrics/transfer-efficiency` | `/reports/performance` | The Spec gives Reports no tabs or sub-pages. Assumed each sub-report is a section of its parent report, and it only matters with a second location. |

### Staff, roles and Settings

| Old address | Goes to | What I assumed |
|---|---|---|
| `/roles/new` | `/settings/team` | The Spec gives Team three fixed roles (Owner, Manager, Cashier) and no screen for creating one. Assumed the Team page until it is decided whether custom roles continue. |
| `/roles/:roleName/edit` | `/settings/team?open=:roleName` | The Spec has no role edit page. Assumed editing happens in the role panel on Team. |
| `/roles/:roleName/permissions` | `/settings/team?open=:roleName` | The Spec has no role permissions page. Assumed permissions are shown in the role panel on Team. |
| `/settings` | `/settings/business` | The Spec does not say which of the five sections opens first. Assumed Business, the first in the list. |
| `/settings/payment-gateways` | `/settings/till` | The Spec does not mention payment gateways. Assumed they sit with payment methods in Till and payments. |
| `/settings/bank-accounts` | `/settings/till` | The Spec does not mention bank accounts. Assumed Till and payments, because Add expense takes a bank as a place to pay from. |
| `/settings/etims` | `/settings/tax` | The Spec does not mention eTIMS. Assumed it belongs in the Tax section, as it is the tax authority integration. |
| `/settings/account-provisioning` | `/settings/advanced?section=account-provisioning` | The Spec says to describe it plainly or move it to Advanced, after confirming what it does. Assumed Advanced until that is confirmed. |
| `/settings/inventory-discounts` | `/settings/advanced?section=inventory-discounts` | The Spec does not mention inventory discounts. Assumed Advanced, since no other section fits. |
| `/settings/inventory-discounts/new` | `/settings/advanced?section=inventory-discounts` | The Spec gives no address for a new discount rule. Assumed the discounts card in Advanced, where the form is opened. |
| `/settings/inventory-discounts/:id/edit` | `/settings/advanced?section=inventory-discounts` | The Spec gives no address for editing a discount rule. Assumed the discounts card in Advanced. The id is dropped because that card has no panel for one rule. |
| `/settings/loyalty-programs` | `/settings/advanced?section=loyalty-programs` | The Spec does not mention loyalty programs. Assumed Advanced, since no other section fits. |
| `/settings/audit-trail` | `/settings/team` | The Spec does not mention the audit trail. Assumed Team and security, because it records who did what. |
| `/settings/security` | `/settings/team` | The Spec names the section Team and security but lists no Security page. Assumed the security settings sit on that section. |

## Gaps and contradictions in the Spec

1. **Expiry Alerts.** The page table says it becomes a filter on Low stock; Module by module says it is an Expiry tab for shops that track expiry. I used the Expiry tab, and the "about 22 places" count assumes two conditional tabs, not three.
2. **Reports.** The page table says "the seven current reports"; Module by module says "a landing page of six questions". The app has an overview plus six reports, each with sub-pages, and the Spec gives Reports no tabs. I sent every sub-page to its parent report and invented no section address.
3. **Settings sections.** eTIMS, Bank accounts, Payment gateways, Inventory discounts, Loyalty programs, Audit trail and Security are not placed in any of the five sections. I made the assumptions listed above.
4. **Staff.** Open question 1 says "to confirm" while the page table already treats Staff as moved. I used the default (Yes).
5. **Custom roles.** The Spec has three fixed roles and no screen to create, edit or set permissions on a role; the old Roles pages are sent to the Team panel.
6. **Stock transfers and Material Transfers** have no entry in the Spec.
7. **Receipt numbers.** The Spec shows short numbers (a hash sign and 0033), but old addresses carry full references such as ACC-PSINV-2026-00005. The panel behind `?open=` must accept both; the Sales page (P3-8) has to handle that. Purchase invoices use an invoice number in the same way.
8. **"New invoice".** The Language table keeps a "New invoice" form, but the + New menu has only "sale". I sent the old New Invoice address to `/sales/new` and made + New, Sale open the till. Tell me if + New, Sale should open the invoice form instead.
9. **Customer in + New.** There is no add-customer screen today (customers are added on the list), so it opens the Customers list until the new form exists.

## Not done here (belongs to other tickets)

Applying the rename map to the words in the shell and shared components, and the scan that none of the old words appears (P1-10); hiding items by role in the sidebar (P1-8); the real pages behind each address (P3 to P5), each of which adds its address to the live list; the Hidden-unless-used rules (they need to know whether the shop makes goods or uses customer groups; the map records the rule, and a setting is needed to apply it). Live demo-store work remains blocked until a new session can reach the shop's address.
