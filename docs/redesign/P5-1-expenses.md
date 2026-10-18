# P5-1: the Expenses page

Ticket P5-1, acceptance check AC-30, open question 21 (the owner's decision: a new expense is one entry in the books).
Back end: branch `claude/expenses-api` in `/home/user/be-expenses` (pushed), contract at `docs/redesign/P5-1-contract.md` in that worktree.

## What was built

| Piece | Where |
|---|---|
| Expenses page (List page pattern) | `src/newlook/expenses/ExpensesPage.jsx`, `ExpenseCards.jsx`, `ExpensePanel.jsx`, `expenses.css` |
| Add expense form (Form page pattern) | `src/newlook/expenses/AddExpensePage.jsx` |
| Owners and managers only | `src/newlook/expenses/ExpensesGate.jsx` (a cashier sees a plain message and a button back to Home) |
| Rules, words, data hooks | `expensesModel.js`, `strings.expenses.js`, `useExpensesData.js` |
| Server client | `src/api/expensesApi.js` (`getExpenseOptions`, `listExpenses`, `createExpense`, `getReceipt`) |
| Routes | `/new-look/expenses`, `/new-look/expenses/new` in `newLookRoutes.js` (one import and one line each, both added to `OWN_ROUTES`) |
| Menu | `shell/navigation.js`: Expenses is no longer marked "Soon" and opens its page; `shell/newMenu.js`: + New, Expense opens the form |

Tests: `ExpensesPage.test.jsx` (36), `AddExpensePage.test.jsx` (43), `expensesModel.test.js` (27), `routes.test.jsx` (2), `src/api/expensesApi.test.js` (17); the shell and redirect tests that asserted "Soon" were updated.

### The list
Summary row of three numbers (Running costs, Expenses, Biggest cost), period presets Today, 7 days, 30 days, Custom (default 30 days), a Category filter and a search, all in the address; table (Date, Category, Note, Paid from, Amount), "Showing x of y", rows per page (20, never blank), Export CSV in the header, cards below 768px behind one Filters button, an expense panel (4 of 12 columns, a full page below 1100px) with the facts, the receipt photo (asked for only when the panel opens, since a photo is large) and the record number under Details. Empty state: one action, Add expense (with filters on: Clear filters).

The first number is the same figure Home shows as Running costs for the same days (the server computes it with Home's own rule). The list also shows the other costs the books count, such as a supplier bill for power or an entry the accountant made, marked "Entered another way" with their source in plain words; a supplier bill links to its purchase. Money back (a refund) shows as a negative amount.

### The form
Amount in shillings (`KES` in front, digits only, no cents: the shared money field), Category (only the expense accounts the books already have), Paid from (Cash, M-Pesa, Bank; one the shop has not set up is shown as "(not set up)", cannot be chosen, and says why), Date (day first, today by default, not after today), Note (up to 140 characters, with a count of what is left). The optional receipt photo is under More options: choose, preview with name and size, remove; a file that is not a picture or is over 5 MB is refused at once with its size. "Not saved yet" until a real save, then "Saved". Save, Save and add another (keeps category, paid from and date, clears amount, note and photo, and puts the keyboard on the amount), Cancel. Leaving with changes asks first (the shared guard). Errors show beside the field and in the summary at the top; a refusal from the server (for example no M-Pesa account) lands beside the field it is about. One request id belongs to each expense and is kept for a retry, so a second tap or a retry after a bad connection never saves it twice.

## Old action, where it is now

There is no older expense screen and no older expense server method (audit section 3.7): the Expenses page is new, so no action is lost. Nothing a person can do today moves.

| Old action | Where it is now |
|---|---|
| (none: expenses could not be recorded in the app; an accountant could make a journal entry in the books) | Add expense (header button, + New menu, empty state) |
| (none) | Costs made another way (journal entries, supplier bills) are now visible in the list, read-only; they are still made and changed on their current screens |

## Decisions
- **Whole shillings only.** The shared money field takes digits only; the server also accepts cents if another client sends them. A KES 45.50 expense is entered as 46 or 45.
- **Wider list than "expenses added here".** The list is the ledger lines Home counts as running costs, so its total equals Home's number for the period (a list of only the entries made here could not). Rows from other sources are read-only and marked.
- **The summary ignores the Category filter and the search** (like Purchases): it always answers "what are my running costs for these days", the same as Home. "Showing x of y" follows the filters.
- **Receipt photo travels inside `create_expense`** as a data URL, so the entry and its photo are saved together or not at all. There is no separate `upload_file` call. JPG, PNG, GIF and WebP only; a phone HEIC photo is refused with a plain sentence (phone browsers normally hand over JPG).
- **Photo shown through `get_receipt`**, not the private file address, so a manager without accounting roles can see it.
- **Expenses menu item opens its page even before the redirects are switched on.** Expenses has no current screen to fall back to, so `resolveNavigation` and the + New menu use the new page when an item has no `old` screen. `BUILT_PAGES` was not touched; the lead may add `/expenses` and `/expenses/new` there when the redirects go on (nothing redirects to them, as no old address exists).
- **Home links.** Home has no link to Expenses today (the Net profit tile opens Reports, Needs attention has no expense item), so Home was not changed. A link can use the same `go('/expenses', ...)` pattern later.
- **Note under the essentials, photo under More options** (the Form page rule: essentials first).

## How each Done-when was checked

| Done-when | How |
|---|---|
| Add expense takes amount, category, paid from, date, note and an optional photo (AC-30) | `AddExpensePage.test.jsx`: field order, one save call with exactly these values, photo sent in the same call, photo optional |
| After the cache interval Net profit falls by the amount (AC-30) | Back end tests with no database (`test_expenses_calc.py`, class `TestAC30NetProfitFallsByTheAmount`): the debit line of an entry made by `create_expense` is counted by the same rule Home uses for running costs, and Net profit goes from KES 23,000 to KES 20,500 for a KES 2,500 expense; `test_expenses_api.py` runs Home's real running-costs query and the list's query on the same made-up ledger and gets the same number (KES 6,300). **Needs a real check**: add an expense on a test shop, wait 60 seconds and read Net profit on Home |
| List page pattern | `ExpensesPage.test.jsx`: summary of three numbers, presets, Category filter, search, address, 20 rows, "Showing 20 of 45", rows per page, Export CSV (name and content), cards, empty states |
| Form page pattern | `AddExpensePage.test.jsx`: "Not saved yet"/"Saved", Save and add another, errors beside the field and in the summary, leave guard, More options |
| Photo checks | size over 5 MB and non-picture refused before sending, preview, remove, only pictures offered in the chooser |
| Owners and managers only | both pages test a manager (allowed), a cashier (plain message, a way back to Home, no server call) and the wait before the role is known; the server refuses a cashier too |
| Menu and + New | `shell.test.jsx` and `engine.test.jsx` |
| Words, colours, tokens | `labels`, `colourBudget`, `tokens` tests pass; lint clean |

## Needs a browser check (the lead)
- `/new-look/expenses` at 1280px, 1024px and 390px: summary row, filter row, table, panel beside the list and as a full page, cards and the Filters button.
- The panel with a real receipt photo (the picture fits, Escape closes, focus returns to the row).
- `/new-look/expenses/new` at 390px: the sticky footer with three buttons, the photo chooser on a phone (the camera or gallery opens), the Select lists with a long category list.
- The sidebar: Expenses is a link, highlighted on both pages; + New, Expense opens the form.
- A cashier login opening either page.
- AC-30 on a test shop (see above).
