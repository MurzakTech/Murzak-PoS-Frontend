# P0-2: Audit of the screens the review did not open

Recorded 12 October 2026. Ticket P0-2 of the Murzak POS redesign. No app code was changed.

## How this audit was done, and its limit

I read the front-end code (this repository) and, where a screen depends on the server, the back-end code (`Murzak-PoS-Backend`, read only). I did **not** open the live app or a store, because no test store login has been given yet. So every row below is **"seen in code"**. Whatever a screen does at run time (for example whether a button is hidden for a role) still needs a live look during P0-4 and P0-6. Where the code shows a clear answer I say so; where only a live check can settle it, I say that too.

Done-when for P0-2: every row of "Module by module" is marked seen, and the action list that AC-39 and AC-40 rely on exists. Sections 2, 4 and 5 are those items.

## 1. What matters most (read this first)

1. **M-Pesa is far more built than the Spec says.** The back end already has M-Pesa prompts, a manual-code option, C2B confirmations (the shop is told about payments made to its paybill or till), refunds, and **M-Pesa statement import and matching** (`payment_matching_api.py`). The front end has a full Settings page and a till step for it. The Spec's "Matches x of y needs a statement or API connection that does not exist yet" is therefore probably wrong for shops that have it set up. See new open questions 13 and 14.
2. **Net profit KES 0 has a strong lead.** `dashboard_api.get_dashboard_metrics` adds POS invoices to sales and revenue (`_add_pos_invoice_sales`) but works out cost and profit only from Sales Invoice lines (`_get_profit_stats`). A POS invoice that was never merged into a Sales Invoice would show revenue and no profit. This supports the Spec's hypothesis (Open question 7). It is a lead from reading code, not yet proven on the store. The older "expenses always 0" problem is already fixed in the back end (`_get_operating_expenses` now reads the general ledger).
3. **Several working features are not in the Spec's module table.** Customer credit limits, loyalty (assign, redeem, balance, history), the three-step stock count with roles, stock-transfer approval, kitchen tickets and the Station screen, prescriptions, eTIMS, audit trail, two-factor sign-in, bank accounts, discount rules, and an offline sale queue. AC-40 ("nothing lost") will fail unless each has a named home. Section 4 lists them.
4. **Suppliers and customers lack the numbers the Spec shows.** The supplier list has no owed amount or next bill due. The customer list has Outstanding and Credit columns, but no last purchase, no WhatsApp button and no statement anywhere in the app.
5. **Receiving goods today is three paths, not one.** Purchase order, then goods received note (GRN), then purchase invoice; or a Purchase Receipt for stock only; or a direct bill with "Update stock on submission". The Spec's single guided step must sit on top of these without removing any.
6. **Count stock today is two features.** A simple stock reconciliation form, and a multi-level reconciliation (sales person, stock controller, stock manager) that depends on roles.
7. **Sign-in has no theme toggle** (AC-35 needs one), but has two-factor and forgot-password steps the Spec does not mention.
8. **Printing:** the sale-complete screen prints with the browser's `window.print()`, and auto-print is **on by default** (`pos_auto_print`). This is the likely source of Open question 8.
9. **The first-time flow already exists in three places:** Register (a long page including an optional industry), an Onboarding wizard, and a Getting started checklist on Home. None asks "What do you sell?" as a feature switch; the industry only seeds starter products. Default ERPNext warehouses (Work In Progress, Finished Goods, Goods In Transit) are not hidden anywhere.
10. **Expenses: nothing exists.** No expense page and no back-end method to record one; running costs are read from the general ledger only.

## 2. Module by module: every row marked

| Module | Basis in the Spec | After P0-2 | Where detail is |
|---|---|---|---|
| Home | Seen | Seen. The existing Home reads `get_dashboard_metrics` (see finding 2) | Section 3.10 |
| Till | Seen | Seen (action list added for AC-39 and AC-40) | Sections 3.9, 4, 5 |
| Sales | Seen | Seen by the review. Old routes listed in 3.11 for redirects | 3.11 |
| Customers | To verify | **Seen in code** | 3.1 |
| Products | Seen | Seen by the review. Not re-audited, routes listed in 3.11 | 3.11 |
| Stock levels | To verify | **Seen in code** (with Stores and Stock transfers) | 3.3 |
| Purchases | To verify | **Seen in code** | 3.4 |
| Suppliers | To verify | **Seen in code** | 3.2 |
| Expenses | New | Confirmed new: no page and no server method exist | 3.7 |
| Reports | Seen | Seen. The Spec says "seven current reports"; the code has six top-level reports and 13 sub-reports | 3.8 |
| Settings | To verify | **Seen in code** (11 pages mapped to the five sections) | 3.5 |
| First-time set-up | To verify | **Seen in code** | 3.6 |
| Sign-in | To verify | **Seen in code** | 3.6 |
| Sale-complete screen (ticket P0-2 scope) | n/a | **Seen in code** | 3.9 |

## 3. Screen audits

### 3.1 Customers (`/customers`, `/customers/credit`)

- **List fields:** Customer name, Type (Individual, Company, Partnership), Group, Territory, Mobile, Email, Credit limit, Outstanding, Available credit, Utilization, Status. Header stats: Total, Active, Over limit.
- **Filters:** search; Customer type; Customer group; Territory; "Include disabled". 20 rows per page, page size changeable (state in Redux, not in the address).
- **Header action:** Add customer.
- **Row actions (menu):** View details; Edit; Credit limit; Credit history; Redeem points; Assign loyalty program; Loyalty history.
- **New and edit form fields:** Customer name, Customer group, Customer type, Territory, Tax ID/PIN, Mobile number, Email, Default currency, Default price list, Disabled switch. A Company is required (an error shows otherwise).
- **Credit page (`/customers/credit`):** pick a customer and company; **set or remove a credit limit** (0 means unlimited, plus a switch), and a **credit history** table (Date, Type, Document, Amount, Outstanding, Status, Company) with From and To date filters.
- **Loyalty dialogs:** assign a program (search, shows Active or Inactive), redeem points (points, optional reference), balance, history (start and end date, transaction type).
- **Till quick add (`CustomerDialog.jsx`):** name, mobile (placeholder 0712 345 678), optional email, optional KRA PIN, type. Matches the Spec's list of five fields.
- **Server methods:** `customer_api` (create, get, list, update, credit limit set, get and remove, credit history) and `loyalty` (assign, redeem, balance, history, programs).
- **Against the Spec:** the Spec's panel (balance owed, last purchase, WhatsApp, statement) has **no existing source for last purchase, WhatsApp or statement**; Outstanding exists. The Spec does not place **credit limits** or **loyalty**; both must stay reachable (open questions 15 and 16). The Owing tab is a **new list** (customers with Outstanding above zero); the old "Customer Credit" page is a limit-management page, not an owing list, so "Customer Credit becomes Owing" is only half right. Customer group and Territory are in the form today; the Spec hides them unless used.

### 3.2 Suppliers (`/suppliers`, `/suppliers/groups`, `/suppliers/:id`)

- **List fields:** Supplier name, Type, Supplier group, Tax ID, Country, Currency, Status (Enabled or Disabled).
- **Filters:** search; Supplier group; page size.
- **Header actions:** Supplier groups; Add supplier.
- **Row actions:** View details; Edit.
- **Form fields:** Supplier name, Type, Supplier group, Tax ID/PIN, Country, Default currency, Internal supplier switch; in edit, an Enabled switch.
- **Detail page:** type, internal or not, tax ID, country, currency; an Edit button. The server method `get_supplier_details` returns an **outstanding amount** (`supplier_api.py`, lines 218 to 276); the list method `get_suppliers` and the list screen do not show it.
- **Supplier groups page:** list (Group or Leaf), create and edit with Name, Parent group, Payment terms.
- **Against the Spec:** no owed amount, no next-bill-due and no Owed filter exist in the list; they need a list-level number (server work) before P4-6. Supplier groups move to Settings, Advanced as the Spec says; the page and the create and edit form must go with it.

### 3.3 Stock levels, Stores and Stock transfers

**Today's pages (all under `/inventory`):** Overview (a card launcher), Stock List (`/stock-summary`), Low Stock, Expiry Alerts, Stock Ledger, Entries, Material Receipts, Material Issues, Material Transfers (hidden), New Stock Entry, Stock Reconciliation, Multi-level Reconciliation (and its create, details, stock-take pages), Inventory Details (`/item-details`).

- **Stock List:** columns Item code, Item name, Item group, Warehouse, Actual qty, Reserved qty, Projected qty, Stock value, Stock level. Stats: Total items, Total value, Out of stock, Low stock. Filters: Warehouse, Item group, "Low stock only", search. Actions: **Export CSV**, **Stock adjustment**, row menu (view, stock reconciliation for the item, stock ledger for the item, create a discount rule for the item). A valuation-rate edit form exists in the code but its save call is commented out, so it does nothing today.
- **Low Stock:** Item code, Item name, Warehouse, Item group, Actual qty, Projected qty, Stock UOM; a Threshold filter and Warehouse filter; actions Export CSV, **Create receipt** (opens Material Receipt for that item).
- **Expiry Alerts:** Item, Batch, Quantity, Expiry, Status, Value; filters "Expiring within" and Store; Export CSV.
- **Stock Ledger:** Date/time, Item code, Warehouse, Voucher type, Voucher no, Quantity, Qty after, Valuation rate, Stock value, Status (Active or Cancelled); filters Warehouse, From, To, Voucher type; Export CSV.
- **Entries (stock entries):** list with filters (type, warehouse, item code, dates, status); entry detail with **Edit, Submit, Cancel, Print, Additional costs**. A **repost stock** call exists in the store code (`repostStock`), but I found no screen that calls it (check in P0-4).
- **Material Receipt, Material Issue, Material Transfer forms:** target or source warehouse, posting date, item lines. Material Issue has a **per-line "Purpose/Reason" text box**; it is not required. The Spec says a write-off cannot be saved without a reason (AC-27), so that becomes new behaviour.
- **Stock Reconciliation (single level):** Warehouse, Posting date, item lines with counted quantity and unit; shows the difference.
- **Multi-level reconciliation:** a list, a create page, a details page and a **stock-take** page, with a three-step flow by role (sales person, stock controller, stock manager) through `inventory_api` methods `add_sales_person_stock_take`, `add_stock_controller_stock_take`, `add_stock_manager_stock_take_and_submit`. The Spec's "Count stock" does not mention it (open question 17).
- **Inventory Details (`/item-details`):** per item and warehouse, edit **Buying price, Selling price, Unit, SKU, Expiry date, Batch no**.
- **Stores (`/warehouses`):** All stores, New store, Store details, Edit, Store staff, **Staff assignment** (assign warehouses to staff, set a default store). Nothing hides the default ERPNext warehouses today.
- **Stock transfers (`/stock-transfers`):** list; **Create material request**; **Create stock transfer** (request, submit); **Approve** (workflow); **Dispatch**; **Receive** at the destination; details; cancel. Methods in `murzak_pos.api.stock`.
- **Against the Spec:** the Spec's "Movements" tab merges ledger, entries, receipts and issues, but entries have a Draft, Submitted, Cancelled life cycle with Edit, Submit and Cancel actions that a merged list must keep. Expiry Alerts becoming a Low stock filter drops the Batch and "expiring within" controls unless kept. The Stock transfer approval workflow is not mentioned. Low stock "Reorder button" matches the existing Create receipt action, but the Spec opens a **purchase**, the code opens a **material receipt** (stock in with no supplier). That is a real difference (open question 18).

### 3.4 Purchases (`/purchases`)

**Today's pages:** All Purchases, Purchase Invoices, Create Order, Submit Order, Create GRN, GRN List, Purchase Returns, Purchase Receipts, New Purchase, plus detail pages for each.

- **All Purchases list:** Purchase #, Supplier, Date, Bill no, Total amount, Status; filters Supplier, Status, From and To date. Header actions: Purchase Receipts; **New purchase** (opens Create Order). Row menu: View; **Edit draft**; **Submit order**; **Create GRN**; **Create return**; **Cancel**.
- **Create Purchase Order:** Supplier, Order date, Default warehouse, item lines. **Submit Purchase Order** is a separate page and a button on details.
- **New Purchase (direct bill, 1,711 lines):** Supplier, Posting date, Default warehouse, Bill number, Bill date, Currency; **Manual entry or CSV upload** of lines (with template download and a "Missing" flag for unknown items); **create a product from inside the form** (item code, name, standard rate, unit); **Mark as paid** with paid amount, cash or bank account and mode of payment; switches **Update stock on submission** and **Prevent eTIMS submission**.
- **Create GRN:** pick a Purchase Order (Draft or Submitted), Warehouse, item lines with received quantities. GRN List: GRN number, Supplier, Posting date, Warehouse, Purchase order, Total, Status, Doc status, Items, Total qty; filters Supplier, Purchase order, Warehouse, dates, Status, Document status. **GRN details: Create Purchase Invoice, Print.**
- **Purchase Invoices:** Invoice no, Supplier, Posting date, Due date, Bill no, Grand total, **Outstanding**, Status; filters include Purchase Order and Purchase Receipt. Details: **Pay Invoice, Edit, Print** (plus cancel through `cancel_purchase_invoice`).
- **Purchase Receipts (stock only):** list, new, details with Print; `create_stock_receipt` from a GRN.
- **Purchase Returns:** return against a purchase with posting date and quantities.
- **eTIMS:** `check_etims_registration_status` runs from the purchase flow.
- **Against the Spec:** "The bill and the stock update together" is not how the three paths work: the GRN raises stock, then a separate step creates the invoice, and the direct bill uses a switch. The guided Receive goods step (P4-5) needs a decision on which path it uses (open question 19). Orders, receipts, bills and returns each have their own list and Print; the Spec's three tabs (All, Orders, Returns) leave **Purchase Receipts** and **GRN** without a tab. Supplier payment (Pay Invoice) feeds the "supplier bill due" item in Needs attention, so it must be reachable from Home.

### 3.5 Settings (11 pages) mapped to the Spec's five sections

| Today's page | What it holds | Spec section |
|---|---|---|
| POS Profile | Profile name; switches Update stock, Allow discount changes, Allow rate changes, Allow partial payment; POS invoice type | Till and payments |
| Payment Methods | List of modes of payment with Enabled or Disabled; **Create or enable Credit payment** (receivable account, payment type, currency, status). No on or off switches for other methods | Till and payments |
| Payment Gateways | M-Pesa (paybill or till number, consumer key and secret, passkey, **allow manual code**, **enable C2B**, wait time, B2C refund credentials, callback address, test phone), Pesapal, PayPal (keys, display name, currency), bank methods read-only; Test, Save, Turn off, status chip (Not set up, Off, Live, Testing) | Till and payments |
| Inventory Discounts | List of rules (Name, Type, Target, Discount, Priority, Warehouse, Valid from and to, Status); New rule form; delete | Till and payments |
| Loyalty Programs | List and create form (name, points per unit, type, tier, dates, conversion factor, expiry days, expense account); "Active only" | Till and payments |
| Business | Company name, abbreviation, tax ID, country, currency, address, phone, email, contact person | Business |
| Bank Accounts | Three tabs: Cash or Bank accounts, Banks, Bank accounts; create and edit | Business |
| eTIMS | KRA PIN, Branch ID, device serial, "Connected to", sandbox switch, Active switch | Tax |
| Security | Two-factor (turn on with a 6-digit code, turn off), "Always on" item, idle sign-out status | Team and security |
| Audit Trail | When, Staff, Action, Document, Details; Export CSV | Team and security |
| Account Provisioning | Chooses a **provisional account** (an accounting account) with Recommended hint; the back end docs describe automatic provisioning | Advanced (see open question 20) |

Related pages outside Settings that the Spec must place: **Staff** (`/staff`: staff users, roles, Active and Inactive tabs, create, edit, role assignment, contact fields) and **Roles** (`/roles`, with permissions, details and a create and edit form), and a `RoleManagement.js` page file that is **not reachable from any route** (dead code to confirm in P1-7). These make up "Team and security". Kitchen settings are reached from the till menu, not Settings.

- **Against the Spec:** the Spec's "Payment methods are plain switches for M-Pesa, Cash, Card and On credit" is **new behaviour**; today's page lists methods and can only create or enable the Credit mode, and M-Pesa availability at the till depends on the gateway page and a server call (`get_pos_payment_options`). Account Provisioning is **not "a plain description"**: it sets an accounting account. Moving it to Advanced is safe; hiding or renaming it needs the owner to confirm what it does (the Spec already asks for this).

### 3.6 First-time set-up and Sign-in

- **Register (`/register`):** First name, Last name, Email, Phone (optional), Password, **Business industry (optional, chosen from a list)**, Company name, Abbreviation (checked for availability), Tax ID (optional), Country, Currency, Street address, City, POS profile name (optional) with four switches (Auto update stock, Allow discounts, Allow rate change, Partial payments), and an eTIMS block (Enable, Server URL, TIN, Branch ID, Sales, Purchases, Stock, sandbox). Closed in the per-shop build; shows a link to the Murzak portal instead.
- **Onboarding (`/onboarding`):** three steps: Company information, POS profile, eTIMS (optional). For a signed-in user with no company.
- **Home extras:** `WelcomeSetup` (a "Fastest way to start" card) and `GettingStarted` (a checklist: Create your business account, Add your products, Enter your opening stock, Check payment methods and tax, Invite your team, Make your first sale; collapsible and dismissible). The Spec's "reuse the app's existing getting-started list" refers to this.
- **Industry products (`/industry/:industryCode/products`):** starter products for the chosen industry: tick, edit, **download list, upload a file**, delete, save. Shows the active store and price lists.
- **Against the Spec:** there is no "What do you sell?" feature switch; the industry only seeds products (the back end's `industry_api` and `pharmacy_rules` show some pharmacy behaviour exists). Hiding the default warehouses (AC-33) is new work. Opening cash is entered when the till is opened (Open Till), not in set-up.
- **Sign-in (`/login`):** one field "Email or phone number", Password (show or hide), a **6-digit code step for two-factor**, an error alert (`role="alert"`), links **Forgot password?**, Terms and Privacy, and either Create account or the portal link. **No theme toggle.** Forgot password (`/forgot-password`) is a three-step page (request, reset with code, done).
- **Against the Spec:** AC-35 needs a theme toggle added. The two-factor step and password reset must keep working in the new look.

### 3.7 Expenses (new)

No page, no route and no server method for expenses exist. The back end reads running costs from the general ledger by account type (`dashboard_api._get_operating_expenses`), excluding cost of goods and stock adjustments. P5-1 therefore needs a **new server method that creates an accounting record** (the Spec's "Likely source" suggests a Journal Entry or Payment Entry). Which record, and which accounts, is an accounting decision for the owner (open question 21). Whatever is chosen must flow into the existing operating-expense query so Net profit falls by the amount (AC-30).

### 3.8 Reports

Six top-level reports, each with sub-reports reached by hidden routes (13 in all): **Sales Analytics**; **Inventory Summary**; **Inventory Valuation** (Value by category, Cost method comparison, Value trends); **Stock Movement** (Turnover, Days on hand, Movement patterns); **Aging Stock** (Stock aging, Obsolescence risk, Aging recommendations); **Performance Metrics** (Accuracy, Variance, Adjustment trends, Transfer efficiency). Sales Analytics has an **export** dialog with a format choice. The Spec's "seven current reports" does not match this count, and "six questions" for the new page leaves the 13 sub-reports without a home (AC-40).

### 3.9 The till and the sale-complete screen

- **Sale-complete (`ReceiptDialog.jsx`):** Receipt no., Date, Served by, Customer, Items, Offers, Discount, TOTAL, payments with references, Cash given, Change. Buttons: **New sale** (primary, focused), **Print receipt**, **View invoice**. Auto-print runs `window.print()` 300 ms after the dialog opens when `pos_auto_print` is not `false` (default on); the till menu has a toggle. There is no Take payment, no Send on WhatsApp and no Return items on this screen.
- **Open till (`OpenTill.jsx`):** opening balance lines, each with a mode of payment and amount; add or remove a line.
- **Close till:** `CloseTillDialog.jsx` is a plain confirm ("Keep selling" or close). It closes the session through `sales_api` (a POS Closing Entry). **There is no cash count today**; the Spec's count, expected cash and difference are new (P3-6).
- **Till header and menu:** exit, store switcher, "Till open" chip, Held sales, Ready to serve, full screen, More options (Sales history, Dark screen or Light screen, Show pictures, Auto-print, Kitchen settings, Close session).
- **Search and products:** one box ("Scan a barcode or search products"), category chips, Show more, picture toggle, Rx-only badge.
- **Cart line:** quantity stepper, remove, note, store (warehouse) menu, kitchen "sent" quantities, price entry for variable-price items.
- **Totals and customer:** Items, Offers, Discount (percent or amount), Loyalty points, customer picker (walk-in, search, new customer), Hold, Clear.
- **Payment (`PaymentPanel.jsx`):** Cash (amount given, change), split payments, Credit (needs a registered customer and checks available credit), gateway methods (M-Pesa prompt or code, Pesapal or PayPal QR code, bank reference) with Complete sale blocked until confirmed; offline cash sale.
- **Keyboard:** Ctrl or Cmd+K or F2 (search), F4, Ctrl or Cmd+Enter or F9 (pay), Escape (back one step).
- **Other:** held sales (server first, device fallback, recall, rename, discard, "open a long time" warning), kitchen tickets and Ready tickets, prescription dialog for Rx items, offline bar (Upload now, View list, retry, remove).

### 3.10 Home (existing)

The current Home reads `murzak_pos.api.dashboard_api.get_dashboard_metrics(company, warehouse, staff, from_date, to_date, period)` and draws charts with Recharts. The Spec's `dashboard.overview` is a new, cached method with a different shape; the old one must stay for the old screens.

### 3.11 Old addresses (for AC-06) and what each becomes

The route table has about 196 path entries; 58 are hidden from the menu. The redirects list is built in P1-7 from `src/routes/routes.js`. Groups to cover: `/sales/*` (history, invoice new, edit and details, POS invoice details, opening entries and details, returns), `/products/*` (new, update price, variations, bulk import, bulk stock import, price groups, units, categories, brands, warranties, load products), `/inventory/*` (see 3.3), `/warehouses/*`, `/stock-transfers/*`, `/customers/*`, `/suppliers/*`, `/purchases/*`, `/staff`, `/roles`, `/settings/*`, `/reports/*`, `/industry/:industryCode/products`, and the station screen (`/kitchen`).

## 4. Action list for AC-40 (nothing lost)

Every action found above, and where the Spec puts it. **"Not placed"** means the Spec's Module by module and App shell sections do not say, and an owner decision is needed.

| Action today | Where today | Spec home |
|---|---|---|
| Add, edit, disable a customer | Customers | Customers, + New |
| Set or remove a credit limit; view credit history | Customers menu, `/customers/credit` | **Not placed** (proposal: customer panel) |
| Assign loyalty program; redeem points; loyalty balance and history | Customers menu | **Not placed** |
| Customer group, territory, price list on a customer | Customer form | "Hidden unless used" |
| Add, edit, enable or disable a supplier; supplier detail | Suppliers | Suppliers |
| Supplier groups (list, create, edit) | `/suppliers/groups` | Settings, Advanced |
| Stock list with filters and CSV export | Stock List | Stock levels, Overview |
| Stock adjustment; stock reconciliation per item | Stock List | Count stock |
| Create a discount rule for an item | Stock List row menu | **Not placed** (Settings, Till and payments has discounts) |
| Low stock, Create receipt | Low Stock | Low stock, Reorder (**opens a purchase in the Spec**) |
| Expiry alerts (batch, expiring within) | Expiry Alerts | A filter on Low stock |
| Stock ledger (filters, export) | Stock Ledger | Movements |
| Stock entries: create, edit, submit, cancel, print, additional costs | Entries | Movements (**life cycle not placed**) |
| Material receipt, issue, transfer | Material pages | Stock in, Stock out or write-off, **Transfer not placed for one-store shops** |
| Edit price, SKU, unit, expiry, batch per item and store | Inventory Details | **Not placed** (Products? Stock levels?) |
| Multi-level stock count (three roles) | Multi-level reconciliation | **Not placed** (proposal: a mode of Count stock) |
| Stores: add, edit, staff, default store, staff assignment | Stores | Stock levels tabs only with a second store; **first store creation not placed** |
| Stock transfers: request, approve, dispatch, receive, cancel | Stock Transfers | Transfers tab (second location) |
| Purchase order: create, edit draft, submit, cancel | Purchases | Orders tab |
| Receive goods (GRN), then create purchase invoice | Purchases | Receive goods button |
| Direct bill: CSV upload, mark as paid, update stock, skip eTIMS, create product inline | New Purchase | **Not placed** |
| Purchase receipt (stock only) | Purchases | **Not placed** |
| Pay a supplier invoice; cancel invoice; print | Purchase invoice details | **Not placed** (Needs attention links to "the payment form") |
| Purchase return | Purchases | Returns tab |
| Print on each purchase document | Details pages | **Not placed** |
| POS profile switches | Settings | Settings, Till and payments |
| Create or enable credit payment | Payment Methods | Settings, Till and payments |
| M-Pesa, Pesapal, PayPal setup and test | Payment Gateways | Settings, Till and payments |
| Inventory discount rules (create, edit, delete) | Settings | **Not placed** |
| Loyalty programs (create, edit, filter) | Settings | **Not placed** |
| Business details; bank accounts | Settings | Settings, Business |
| eTIMS settings | Settings | Settings, Tax |
| Two-factor on or off; idle sign-out info | Settings, Security | Settings, Team and security |
| Audit trail with export | Settings | Settings, Team and security |
| Account provisioning | Settings | Settings, Advanced |
| Staff create, edit, roles, enable or disable | Staff | Settings, Team |
| Roles and permissions create, edit | Roles (`/roles`) | Settings, Team and security (**not stated**) |
| Station screen (kitchen board) | `/kitchen` | **Not placed** |
| Industry starter products: tick, edit, download, upload, save | Industry Products | **Not placed** (proposal: first-time set-up and Products, Import) |
| Reports: 6 reports and 13 sub-reports, sales export | Reports | Reports landing (six questions) |
| Register, Onboarding, Getting started checklist | Register, Onboarding, Home | First-time set-up |
| Sign-in with two-factor; forgot password | Login, Forgot password | Sign-in |
| Till: every item in section 3.9 | Till | Till (Spec lists some) |

## 5. Offline list for AC-39 (what the till can do with no network today)

1. Open the app itself (pages are cached by the service worker) and move between screens already loaded.
2. Search and sell from the **saved product list** (`pos_offline_catalog`), using the last known stock figures.
3. Keep the **open shift** this person had (`pos_offline_shift`) and carry on selling.
4. Add items, change quantities, apply discounts and customer choices in the cart (memory only; lost on refresh).
5. **Complete a cash sale offline.** It is saved on the device (`pos_offline_sales`), shows a receipt, and uploads automatically on reconnect (retry every 30 seconds). Limits: cash only (no M-Pesa, card, credit or loyalty redemption), at most 200 waiting sales, none older than 24 hours. Each sale carries a client reference so a double upload is harmless. Sales the server refuses are flagged "need a manager" and can be retried or, after a check, removed.
6. **Hold a sale.** Held sales save on the device when the server cannot be reached and are sent when the connection returns. Bringing a held sale back **needs the server** (so two tills cannot both take it).
7. See the offline bar: status, "Upload now", the list of waiting sales.

Not possible offline: card, M-Pesa and credit sales, sign-in, opening or closing a till, reports, any list page.

## 6. New open questions raised by this audit

The Spec's twelve are unchanged. Each new question has a default so work can carry on.

| No. | Question | Why it matters | Default if unanswered | Needed by |
|---|---|---|---|---|
| 13 | M-Pesa prompts, C2B confirmations and statement matching already exist. Should "Matches x of y payments" appear for shops that have them on? | AC-10 says it must not appear until confirmations are connected; they may be connected already | Show "x payments recorded" unless the shop has C2B on, then show "Matches x of y" using the existing matching | Phase 2 (P2-1) |
| 14 | Is M-Pesa missing from the demo pay screen because no gateway keys are set (configuration), not because it is not built? | Replaces the guess in Open question 6 | Test in P0-6; if so, no build is needed for the choice, only the Spec wording changes | Phase 0 |
| 15 | Where do customer credit limits (set, remove, history) live? | AC-40 | A "Credit" section in the customer panel and the Owing tab | Phase 4 |
| 16 | Where does loyalty live (assign, redeem, balance, history, and programs in Settings)? | AC-40; the Spec lists loyalty as out of scope as a new module, but it already exists | Customer panel for the person actions; Settings, Till and payments for programs | Phase 4 |
| 17 | Does the three-role multi-level stock count stay? | It depends on roles that may not exist (Open question 4) | Keep it as an option inside Count stock | Phase 4 |
| 18 | Does Reorder open a **purchase** (Spec) or a **material receipt** (today's Create receipt)? | Different records: a purchase raises a supplier bill, a material receipt does not | Spec wins: open a new purchase; keep Stock in as a header button for no-supplier receipts | Phase 4 |
| 19 | Which of the three purchase paths does the guided Receive goods step use (order then GRN then invoice; stock-only receipt; direct bill)? | AC-29 requires the bill and the stock to rise together | Order, then GRN, then invoice for orders; direct bill stays as + New, Purchase | Phase 4 (P4-5) |
| 20 | What does Account Provisioning do for the owner, and can it move to Advanced under that name? | Spec asks to confirm; code shows it sets an accounting account | Move to Advanced, keep the name, add a one-line description | Phase 5 |
| 21 | Which accounting record should a new expense create (Journal Entry, Payment Entry, Expense Claim) and which accounts? | P5-1 and Net profit (AC-30) | Journal Entry against an "Expenses" account chosen in Settings; needs owner approval | Phase 5 (P5-1) |
| 22 | Where do Station screen, Industry products, Discount rules, Bank accounts, Roles and Audit trail go in the new menu? | AC-40 | Station: link from the till menu; Industry products: first-time set-up and Products, Import; Discounts and Bank accounts: Settings; Roles and Audit trail: Settings, Team and security | Phase 1 (P1-7) |
| 23 | Is auto-print (`window.print()`) on by default acceptable? | Ties to Open question 8 | Keep, test in P0-6, and offer the Settings switch if it blocks | Phase 0 |
| 24 | Hosting: Coolify is planned. Is the Coolify move before, during or after the redesign? | The plan's rollback paragraph and rollout depend on where the app is deployed | After the redesign ships; use GitHub Actions until then | Before Phase 6 |

## 7. Back-end facts found (for the Data and API needs section)

- Methods are named `murzak_pos.api.<module>.<function>`; the Spec's `dashboard.overview` style names should be mapped to that (for example `dashboard_api.get_overview`).
- Sales are defined once in `sales_figures.py`: submitted Sales Invoices plus submitted POS Invoices, excluding returns and excluding POS Invoices merged into a Sales Invoice. The dashboard adds POS invoice figures separately (`_add_pos_invoice_sales`).
- Profit is worked out in `profit_calc.py` from Sales Invoice lines (recorded cost, then valuation rate, flagged as estimated); expenses come from general ledger entries. This matches the Spec's formula but not its "missing cost price" line: the code falls back to the current valuation rate and counts "estimated", and counts "missing" items, so the Spec's "Profit not counted for 12 products without a cost price" line is feasible.
- Held sales have server methods and a realtime message; offline sales have `offline_sales.py` with idempotent upload.
- `print_api.py` and `alerts.run_hourly_alerts` (expiry, low-stock and unsent-invoice alerts) exist and may serve Needs attention.
- The held-sale purge (30 days) and kitchen ticket purge (90 days) run daily.
- Roles in `roleAccessConfig.js` are ERPNext role names; no Owner, Manager or Cashier role exists in either repository.
