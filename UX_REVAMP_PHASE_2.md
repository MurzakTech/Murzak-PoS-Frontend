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

## 4. Needs a decision from the business

1. **What should a cashier see on the dashboard?** Today a Sales User can still see the whole shop's revenue, purchases and expenses. This phase only removed the actions they cannot use. If cashiers should not see money figures, that is a permission decision for the owner, and it should be enforced on the server as well.
2. **Where should a cashier land after signing in?** The dashboard (as now) or straight into the till. A till-only role might prefer the second. This was not changed because some cashiers also look at past sales.
3. **A user with no till profile.** If a user account has no POS profile, "Open till" refuses with a message about a "POS profile" that the cashier cannot see or fix. The right fix is to assign a profile when the account is created; the till screen could also say "Ask your manager to assign you a till". Not changed here.

## 5. Suggested next steps

1. Run the till on the real counter hardware (touch screen, scanner, printer) at 1366 by 768.
2. The other list pages (Sales History, Purchases, Customers, Suppliers) share the same table; check them for the same clipping on a laptop. The table now has slightly tighter cell padding everywhere.
3. Rename the remaining form labels that still use system words (for example "Material Receipt" fields).
4. Add short "what is this?" hints to the technical settings (eTIMS, price groups, accounting setup).

## 6. How it was verified

All 482 automated tests pass (new tests cover the setup checklist per role and the unit wording). The production build passes. The browser walkthrough was repeated after the changes: cashier and owner dashboards, every menu section at 1366 by 768, the Inventory landing page, the 404 page, the product list, the payment screen, a full cash sale to the receipt, and the phone dashboard. No console errors were seen.
