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

## What is still limited

Held bills live in the browser on one device:

- Another till or a waiter's phone cannot see them.
- Clearing the browser's data, or changing browser or device, loses them.
- Two browser tabs on the same till do not update each other.
- A held bill keeps the prices it had when it was held.

For a single counter this is acceptable. For a bar with two tills, or waiters taking orders on phones, it is not. That needs Phase 2.

## Phase 2: held bills stored on the server

### The idea

The server already supports saving a sale as a draft instead of completing it. In `REACT_POS_SALE_FLOW.md`, `create_pos_invoice` accepts `do_not_submit: true`, and the front end already has calls to update a POS invoice (`update_pos_invoice`), list POS invoices (`list_pos_invoices`) and submit a draft (`submit_invoice`). A held bill would become a draft POS invoice: it is visible on every device, survives clearing the browser, and is turned into a real sale when paid.

### What must be confirmed with whoever manages the server

I could not verify these from this repository, and each one decides whether the idea is safe:

1. **Can `list_pos_invoices` return drafts?** Is there a filter for draft status (docstatus 0), and does the list include who created them and the store?
2. **Can a draft be deleted?** The only existing call is `cancel_pos_invoice`, which normally applies to completed sales. If a discarded draft cannot be deleted, abandoned tabs will pile up as drafts. A small "delete draft" endpoint may be needed.
3. **Where can the table or tab name be stored?** For example the invoice's remarks field, or a new custom field. I will not invent a field the server may reject.
4. **Does saving a draft check stock or reserve it?** A draft should not change stock until paid, but some setups check availability at save time, which would block holding an item that is running low.
5. **Do drafts appear in sales history, reports and the shift's totals?** They must not be counted as sales.
6. **Can the draft be updated when items are added to a tab?** (`update_pos_invoice` appears to exist; its fields need confirming.)

### Suggested approach once those are answered

1. Add a "kept on the server" mode for held bills, used when the server can do items 1 to 3. Keep the browser copy as a fallback when the connection drops.
2. Show held bills from the server in the same list, so every till and phone sees the same tabs.
3. Re-price a held bill when it is brought back, and warn if a price changed.
4. Add a live refresh so two tills do not edit the same tab at once.

### If the server cannot do it

The alternative is a small purpose-built endpoint pair on the server (save a held bill, list held bills for a store, delete one). This is simple but needs server work and is less standard than using drafts.

## The rest of a restaurant and bar

Held bills are the biggest gap, but they are not the only one. In rough order of value for a restaurant or bar:

1. **Order tickets to the kitchen or bar** (print or screen). Nothing exists yet.
2. **Notes and add-ons on an item** ("no onions", "double", "extra shot"). Nothing exists yet.
3. **Tips and service charge, and splitting a bill between guests.** The till can split a payment across methods (cash plus M-Pesa) but not split items between guests.
4. **Happy hour pricing.** Discount rules take dates but not times of day.
5. **Selling a bottle by the tot, and recipes** (a burger uses a bun and a patty). Stock is tracked per item sold only.
6. **Dine-in or takeaway.**

Items 1 and 2 are the ones that most change how a restaurant uses the till, and they need the same server-side groundwork as Phase 2.
