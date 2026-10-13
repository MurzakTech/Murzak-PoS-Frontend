# P1-8: Roles (Owner, Manager and Cashier) and the one server-side check

Recorded 13 October 2026. Ticket P1-8 of the Murzak POS redesign (Done when: a request made as Cashier is refused by the server for a profit-only call, the first half of AC-14).

## What was built

**Back end** (a separate repository): [Murzak-PoS-Backend#32](https://github.com/MurzakTech/Murzak-PoS-Backend/pull/32), a draft pull request on the branch `claude/roles-access-helper`. A copy of the commit is kept in `docs/redesign/backend-patches/0002-roles-access-helper.patch` for reference. It is separate from the New look switch (pull request #31), so either can be merged first.

| File | What it does |
|---|---|
| `murzak_pos/api/role_tiers.py` | Places a signed-in user as **owner**, **manager** or **cashier**. Holds **`require_access(capability)`, the one check** every protected call makes first. `get_my_access()` tells the screens which kind of person is signed in |
| `murzak_pos/api/profit_api.py` | `get_profit_summary`, the first call behind the check. A cashier or guest is refused **before anything is read**. An owner or manager gets the same profit figures the dashboard's profit tile uses today (same code) |
| `test_role_tiers.py` (28 tests) | Each role placed correctly; a cashier refused for every protected figure; nothing read when refused; the check is the first statement of the profit call |
| `test_record_access.py`, `sw.csv` | The call added to the repository's own guard list; one Swahili row for the one new message |

**Front end** (this repository): `src/api/accessApi.js` and `src/newlook/access/AccessProvider.jsx` ask the server which kind of person is signed in. The New look user menu now reads "Signed in as Wanjiru Kamau, Manager". `useAccess().can('profit')` is what the Home page (P2) will use to decide whether to draw Net profit, cost of goods and Money owed. Until the server has answered, or if it cannot be asked, **nothing protected is drawn** (too little is safer than too much). The last answer is kept on the device for each person, and a fresh answer always replaces it.

## Who is who

The three are worked out from the roles a person **already has**, so every existing user is placed at once and **no role record is created or changed** on any shop. A person with roles of several kinds takes the highest.

| Kind | Which existing roles |
|---|---|
| **Owner** | System Manager, and the Administrator |
| **Manager** | Sales Manager, Purchase Manager, Stock Manager, Accounts Manager, Item Manager, Accounts User. These are the roles the current screens already let into Reports |
| **Cashier** | Every other signed-in user: Sales User, Desk User, Employee, Stock User, Purchase User, Quality Manager and so on. Frappe's "All" role is ignored, because it is given to every user |

"Cashier" here means "a person who does not run the business", whatever their job. A stock clerk is a Cashier for the purpose of seeing profit.

| What | Owner | Manager | Cashier |
|---|---|---|---|
| Profit, cost of goods, money owed (`profit`, `cost_of_goods`, `money_owed`) | Yes | Yes | **No** |
| Every sale, not only their own till's (`all_sales`) | Yes | Yes | No |
| The team and who holds which role (`team`) | Yes | No | No |

To change who may see something, change that one table in `role_tiers.py`. To protect a call, make `require_access("profit")` its first statement; a source test enforces that for the profit call.

## Open question 4: mapping instead of creating roles

The Spec's default for Open question 4 is "create the three roles in Phase 1 and map them to the permissions the shop uses today". I did the mapping and did not create role records, for two reasons: a new role record would have to be created on every shop's server and assigned to every person before anyone was placed, whereas the mapping places everyone immediately; and it changes nothing that exists. The Team page (P5-3) will assign a kind by giving a person the matching existing roles; `ROLES_TO_GRANT` in `role_tiers.py` lists them (Owner: System Manager; Manager: the five manager roles; Cashier: Sales User). Tell me if you would rather have real "Owner", "Manager" and "Cashier" roles.

## Existing calls that still show these figures to any signed-in user (please read)

The rule for this work is that no existing report or screen changes, so I did **not** add the check to calls that exist today. A text search of the back end found these that return profit, cost or money owed without any role check. The search is rough, so treat this as a starting point for review, not a complete audit:

- **Profit:** `dashboard_api.get_dashboard_metrics` (profit, margin and the unpaid-invoices list in one answer), `reports.get_profit_and_loss`, `recipes_api.get_recipe` (cost and margin of a dish).
- **Money owed by customers:** `customer_api.list_customers`, `get_customer` and `get_customer_credit_history` (outstanding balances), `sales_api.list_sales_invoices` and `list_pos_invoices` (outstanding amount of each invoice).
- **Cost:** `product_api.get_products` and `get_product_details` (cost fields; the till needs the product list, so these need a field-level change, not a refusal), and the stock value and valuation reports in `reports.py` and `stock.py`.

Today the current screens already keep a cashier away from Reports and the dashboard's detail by hiding them, but the server answers anyone who asks, which is exactly what the Spec says is not enough. Say which of these you want protected now. For the whole-page calls (`get_profit_and_loss`) it is one line each. For the mixed ones (`get_dashboard_metrics`, the product and customer lists) the answer would have to leave the three figures out for a cashier, which changes today's response, so I want your go-ahead first. The redesigned Home (P2-1, `dashboard.overview`) will be built behind the check from the start.

## How it was checked

- **Back end:** 28 new tests; all 780 of the back end's no-database unit tests pass on real Frappe 15 installed the way its CI installs it; the changed files pass the pinned lint and format. The new call is also in the back end's guard list for calls that open a record by its number, and passes that guard's own tests.
- **Front end:** 16 new tests; the whole suite is 60 files and 1,125 tests, all passing; lint is clean for everything in `newlook` and `api`; the production build compiles.
- **Real browser, 7 checks, all passing** (stand-in server, fake shop): the user menu reads "Signed in as Demo Owner, Owner", "..., Manager" and "..., Cashier" for the three answers; when the server cannot say, the menu shows only the name and nothing breaks; no console errors.
- **Not done:** nothing was tried against a real shop's back end, and the acceptance check itself ("Cashier login, Network panel") needs the test store's Cashier login (ticket P0-4), which is not available from this session. The refusal is proved by the tests, not yet by a real cashier's request.

## Decisions and judgement calls (please read)

1. **Accounts User counts as a Manager** because the current screens already let that role into Reports. If a bookkeeper should not see profit, move the role out of `MANAGER_ROLES` (one word).
2. **A cashier's "own till's sales only"** (the second half of AC-14) is not built here. The `all_sales` capability exists for it; it comes with the sales list (P3-8).
3. **A new profit call, not a changed one.** `get_profit_summary` reads Sales Invoices only, like the dashboard today. Whether sales made as POS Invoices must be added is the question ticket P1-9 answers, and this call changes with it.
4. **The Swahili for "Only an owner or a manager can see this."** is a draft for a native speaker to confirm.
5. **Merging back-end pull request #32 deploys it to the live server**, and each shop's own back end needs it installed before the front end can ask it who is signed in. Until then the front end draws no protected figures and shows no error.

## Not done here (belongs to other tickets)

Giving a person a kind from the Team page (P5-3); limiting a cashier's sales list to their own till (P3-8); the Home endpoint that uses the check (P2-1); hiding sidebar items by kind. Live demo-store work remains blocked until a new session can reach the shop's address.
