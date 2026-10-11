# Murzak POS: UX Revamp, Phase 2 (a walkthrough as real users)

Phase 1 (`UX_REVAMP_PHASE_1.md`) rebuilt the till, the first-run experience and the shell. This phase checks the result the way people actually use it, and fixes what got in their way.

## 1. How it was tested

The app was run in a browser against a simulated server, and used as three people:

| Person | Role | What they did |
|---|---|---|
| Njeri, shop owner | System Manager | Signed in, read the dashboard, browsed every menu section, opened Products, Inventory, Purchases and Settings |
| Otieno, cashier | Sales User | Signed in, looked at his dashboard and menu, opened a till, rang up a sale, took cash, read the receipt |
| Njeri on her phone | System Manager, 390 by 844 touch screen | Dashboard and menu |

The laptop size used was 1366 by 768, which is the most common size on shop counters. Most of the problems below only appear at that size.

## 2. What got in people's way, and what changed

### The cashier
| Finding | Why it matters | Fix |
|---|---|---|
| The cashier landed on the owner's "Get started" checklist (import stock, set up payments, invite staff) and an "Add product" button | Every button led to a page the cashier cannot open, and the app silently sent them back to the dashboard. It looked broken | The checklist, its steps and "Add product" are now shown only for pages the person's role can open. A cashier sees a clean dashboard with "New sale" |
| On the payment screen at 768px height, the bottom row of the number pad (backspace, clear) was hidden behind the "Complete sale" bar | Nothing told the cashier to scroll; the keypad looked broken | On short screens the payment screen tightens (smaller header, keys and buttons), so the whole keypad and "Complete sale" are visible with no scrolling |
| The till said "per Nos" and "1 Nos" | "Nos" is ERP shorthand for "numbers". Customers read it on their receipts | Counted items now read "each" on a price, and "pc" or "pcs" beside a quantity. Kg, Litre and other measured units are unchanged |

### The owner, finding their way around
| Finding | Fix |
|---|---|
| At 768px height the main menu cut off the "Team" section (Staff, Roles); there was no sign more was below | The menu is tighter on short screens, so everything fits |
| The second menu (inside Sales, Inventory and so on) used 11px text | 13px text, larger icons and tap targets, slightly wider |
| Menu names used system words: Opening Entries, Material Receipts, Material Issues, Reconciliation, Create GRN, GRN List, Submit Order, Account Provisioning, Audit Trail | Plain names (see section 3). The system word is kept in the page title in brackets, and in search, so people who know the old name still find the page |
| Eleven Settings pages in one flat list, starting with "POS Profile" | Four groups with headings (Business, Money, Selling, Safety). Settings now opens on Business Details |
| The Inventory landing page listed record types (Stock Entries, Material Receipts...) and showed every tile to every role, including pages a role cannot open | Rewritten around what the person wants to do: Check your stock, Change your stock, More. Tiles a role cannot open are left out. Tiles are real buttons, so the keyboard works too |
| A wrong link showed a bare "404" with no menu and a "Go to Home" button that went to the marketing page | Signed-in people keep the menu and get Go to Dashboard, Open the till and Go back. People not signed in get a Sign in button |
| Products list: the Actions column was pushed off the right edge, item codes and prices wrapped onto two lines, and a variable-price product showed "KES 0.00" | Columns fit; the actions button stays visible even on narrow screens; the price reads "Set at sale" when the cashier types the price at the till; "UOM" is now "Unit" and "Nos" reads "Each" |

### On a phone
The setup checklist squeezed its text into a column one word wide, because two buttons shared the row. The buttons now drop beneath the text.

## 3. New menu names

| Was | Now | Still found by searching |
|---|---|---|
| Opening Entries | Till Shifts | opening entries, session, cash up |
| Returns (Sales) | Customer Returns | refund, credit note |
| Stock Ledger | Stock History | ledger |
| Entries | Stock Movements | stock entries |
| Material Receipts | Stock In | material receipts, receive |
| Material Issues | Stock Out | material issues, damaged, write off |
| Reconciliation | Stock Count | reconciliation, stocktake |
| Create Order | New Order | create purchase order |
| Submit Order | Approve Orders | submit |
| Create GRN | Receive Goods | grn |
| GRN List | Goods Received | grn |
| POS Profile | Till Settings | pos profile |
| Payment Gateways | M-Pesa and Cards | gateway, daraja |
| Inventory Discounts | Discounts | inventory discounts |
| Account Provisioning | Accounting Setup | chart of accounts |
| Audit Trail | Activity Log | audit |
| eTIMS | KRA eTIMS | etims |

No page address changed, so saved links and bookmarks still work.

## 4. Decisions made by the owner, and what was done

| Decision | What was built |
|---|---|
| A cashier must not see the shop's revenue and similar figures | The dashboard is built from the person's roles. Shop-wide money figures (revenue, profit, money owed, purchases, returns, expenses, sales charts, unpaid invoices) show only to roles that may open **Reports**. Stock figures show to roles that may open stock pages. A role with neither gets shortcuts to the places it can open. Where a role has no figures, the browser does not even request them |
| A cashier lands straight in the till. Extra roles that carry a dashboard give a dashboard for that role | The cashier roles (Sales User, Desk User, Employee, Agent, Academics User) no longer have a dashboard. After signing in they go to the till. The rule is one function, `getHomePath`: dashboard if any of the person's roles has one, otherwise the till. A cashier with an extra role (for example Sales Manager) starts on a dashboard that shows only what the combined roles allow. The logo, the "page not allowed" redirect, the 404 page and "Exit" in the till all follow the same rule, and Exit never sends a cashier back into the till (it goes to their sales list, which has the menu and sign-out). An account with no usable role sees "Your account has no access yet" instead of a redirect loop |
| Assign a till profile when creating the account | See the note below |

### Note on the till profile
Reading the server code showed that there is no per-person profile to assign. When anyone signs in, the server gives them the business's current till profile, and creates one if none exists. So every new staff account already has a till. What was added:
- The Create Staff form now says: choose **Sales User** for a cashier; they go straight to the till, see no shop figures, and their till is set up automatically; add other roles only when they need more.
- If an account somehow arrives without a till (a failed profile load), "Open till" now says "This account is not set up for a till yet. Ask your manager to check your account, then sign out and sign in again." instead of a pop-up about a "POS profile".

If you want a different till for each person or branch (for example a separate cash drawer or store per cashier), that needs a server change: a till-profile field on the user, a matching option in `create_staff_user`, and `get_current_user` using it. It is not built.

### Important: the figures are hidden in the app, but the server still sends them
`get_dashboard_metrics` on the server does not check the caller's role, so a cashier who knows how to call the server directly could still ask for the numbers. The app no longer asks and no longer shows them, but the real lock must be on the server. The server already has the pattern for this (`access_control.py`, with role lists copied from this app). Suggested change, for the backend repository:

```python
# techsavanna_pos/api/access_control.py
# Roles that may see shop-wide figures: the same roles that may open Reports in the app
DASHBOARD_ROLES = frozenset({
    "System Manager", "Sales Manager", "Purchase Manager", "Stock Manager", "Item Manager",
    "Accounts Manager", "Accounts User", "Delivery Manager", "Agent Manager", "Analytics",
    "Auditor", "Expense Approver", "Dashboard Manager", "Agriculture Manager",
})

def require_dashboard_role() -> None:
    require_any_role(DASHBOARD_ROLES, _("see the shop's dashboard figures"))

# techsavanna_pos/api/dashboard_api.py, first line inside get_dashboard_metrics:
    require_dashboard_role()
```

The same applies to any other call that returns shop-wide totals. Stock roles that only need the "running low" list would need a smaller call or an exception. This is not applied to the server, because the backend deploys straight to the live server on merge, so it should be reviewed first.

The change is written, with tests, as a ready patch: `backend-patches/dashboard-role-check.patch`. It was prepared against the backend's `main` and applies cleanly. It could not be opened as a backend pull request from this session, which has no write access to that repository. To turn it into one, in a copy of the backend repository:

```
git checkout -b dashboard-role-check
git am /path/to/backend-patches/dashboard-role-check.patch
git push -u origin dashboard-role-check
```

Then open a pull request from that branch and run the backend's tests (`bench run-tests`). The role logic was checked on its own here, but the backend's own test suite needs Frappe and was not run. The patch also lets stock roles (Stock User and similar) keep their "running low" and "stock on the way" lists, with every money figure removed, because the app shows them those.

## 5. Suggested next steps

1. Run the till on the real counter hardware (touch screen, scanner, printer) at 1366 by 768.
2. The other list pages (Sales History, Purchases, Customers, Suppliers) share the same table; check them for the same clipping on a laptop. The table now has slightly tighter cell padding everywhere.
3. Rename the remaining form labels that still use system words (for example "Material Receipt" fields).
4. Add short "what is this?" hints to the technical settings (eTIMS, price groups, accounting setup).

## 6. How it was verified

All 488 automated tests pass (new tests cover the setup checklist per role, the unit wording and the landing rules). The production build passes. The browser walkthrough was repeated after the changes: cashier and owner dashboards, every menu section at 1366 by 768, the Inventory landing page, the 404 page, the product list, the payment screen, a full cash sale to the receipt, and the phone dashboard. No console errors were seen.

Second round (landing and dashboard by role): in the browser, a cashier signed in through the real sign-in form and arrived at the till; opening `/dashboard` or a page the cashier may not open returned to the till; "Exit" in the till opened the sales list; a Sales User with Sales Manager added got the dashboard with figures; a Stock User got stock figures only and no money; a Guest got shortcuts only; an account with no roles got the "no access yet" message; roles with no figures made no dashboard request.
