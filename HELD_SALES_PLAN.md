# Held Sales, Tabs and Tables: Plan

## Why this matters

Restaurants and bars run on open bills: a table that orders in rounds, a tab that stays open all evening, a customer who steps away. The till has a "Hold sale" button, but until now it stored the bill only in one browser, with no name, so it was of little use outside a quick counter sale.

This document records what was changed, what is still limited, and what is needed from the server to finish the job.

## Phase 1: done (front end only)

| Problem | What changed |
|---|---|
| A held bill showed only the customer, which is "Walk-in" for nearly every bar bill | A bill can be named when held ("Table 4", "John's tab"). Names are optional, can be changed later, and a duplicate name is flagged. |
| Bringing a tab back and holding it again lost its name | The name is kept, because "add a round to Table 4" is the main bar workflow |
| If the browser refused to save, the bill was cleared from the screen anyway and lost | A bill that cannot be saved stays on screen, the cashier is told, and it is never listed as held |
| One shared list for everyone on the device: after a logout and login, the next person saw the previous person's held bills and customer names | Held bills are kept separately for each business. Bills held before this update are given to the first business that opens the till, then the old shared list is removed. |
| No idea how long a bill had been open | Each bill shows how long ago it was held, with a warning after 12 hours (tabs left overnight) |
| One tap discarded a bill | Discarding asks first, and names the bill and its total |

Where the logic lives: `src/utils/heldSales.js` (tested in `heldSales.test.js`), `src/pages/Sales/pos/HoldSaleDialog.jsx`, `HeldSalesDialog.jsx`, and the hold and recall functions in `src/pages/Sales/NewSale.js`.

## Phase 2: held bills stored on the server (front end done, server needed)

### Status

The front end is finished and tested. It checks whether the server has the held-sales calls, and:

- **Server has them:** held bills are stored there. Every till and phone in the store sees the same bills, with who held each one. A bill is brought back by deleting it from the server first, so two tills can never take the same tab. If the connection drops, a bill is kept on the device and sent to the server by itself when the connection returns, and the list is marked "This device only" until then.
- **Server does not have them (today):** the till behaves exactly as in Phase 1, with bills kept in the browser on that device.

The server calls and a reference implementation are in `HELD_SALES_SERVER_API.md`. Nothing changes for users until someone adds those three calls to the server.

### Why not draft invoices

Earlier this plan suggested using the server's draft invoices. Looking at the code, that was set aside:

- There is no call to delete a draft: the history screen offers Edit and Submit for drafts, and Cancel only for completed sales. A discarded tab would stay behind.
- The invoice calls have no field for a table or tab name.
- A draft can be checked against stock at the moment it is saved, and drafts risk showing up in history and reports.

So held bills get their own three small calls instead.

### What is still limited

- Until the server calls exist, held bills live in one browser (see Phase 1).
- A held bill keeps the prices it had when it was held.
- A bill that is brought back and not held again or paid is lost if the browser is closed; this is the same as any sale in progress.
- Two tills are kept up to date by asking the server about every 20 seconds, and when the till window is clicked. A bill held on one till can take up to 20 seconds to appear on another.

## The rest of a restaurant and bar

Held bills are the biggest gap, but they are not the only one. In rough order of value for a restaurant or bar:

1. **Order tickets to the kitchen or bar** (print or screen). Nothing exists yet.
2. **Notes and add-ons on an item** ("no onions", "double", "extra shot"). Nothing exists yet.
3. **Tips and service charge, and splitting a bill between guests.** The till can split a payment across methods (cash plus M-Pesa) but not split items between guests.
4. **Happy hour pricing.** Discount rules take dates but not times of day.
5. **Selling a bottle by the tot, and recipes** (a burger uses a bun and a patty). Stock is tracked per item sold only.
6. **Dine-in or takeaway.**

Items 1 and 2 are the ones that most change how a restaurant uses the till, and they need the same server-side groundwork as Phase 2.
