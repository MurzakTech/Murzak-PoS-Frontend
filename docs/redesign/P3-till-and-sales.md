# Phase 3: Till and Sales (P3-1 to P3-9)

Everything on the till is behind the shop's New look switch: with it off, the till behaves exactly as today. The Sales page and the Settings page are new pages at `/new-look/sales` and `/new-look/settings/till`. The redirect for Sales is not switched on yet.

## What was built

| Ticket | What | Where |
|---|---|---|
| P3-1 | Payment method switches (Cash, M-Pesa, Card, On credit, and each Other method), each saving on its own with "Saved". The till offers only what is switched on, in the order Cash, M-Pesa, Card, On credit, Other, and keeps the last list on the device for offline use. | Back end: [PR 34](https://github.com/MurzakTech/Murzak-PoS-Backend/pull/34). Front end: `src/newlook/settings/`, `src/api/paymentMethodsApi.js`, `src/newlook/till/offeredModes.js` |
| P3-2 | The new pay screen: five choices, quick-cash notes always including 2,000, number pad and Change in view, split payments and credit kept, the existing gateway block kept | `src/newlook/till/PayScreen.jsx`, `NumberPad.jsx`, `payModel.js` |
| P3-3 | M-Pesa confirmation code: required, 8 to 12 letters and numbers, shown in capitals, saved on the payment as its reference; a blank or short code blocks Complete sale and says why beside the field | `PayScreen.jsx` |
| P3-4 | The cart is kept across a refresh (dropped after 24 hours); the Leave the till dialog offers Hold sale and leave, Leave and clear, and Stay (first focus on Stay); held sales keep their count | `src/newlook/till/cartStore.js`, `useKeptCart.js`, `LeaveTillDialog.jsx`, wired in `NewSale.js` |
| P3-5 | A cart line over stock says "Only 13 left" in words; the "Take stock from" menu shows only with two or more real selling locations (the leftover ERPNext warehouses no longer count) | `stockNote.js`, `sellingLocations.js`, `OrderPanel.jsx` |
| P3-6 | The Till open pill opens a panel with Recent sales and held sales; Count and close till asks for the counted cash, shows expected cash, counted cash and the difference with an icon and a word ("Short by KES 100"), and closes only after the cashier confirms | Back end: [PR 35](https://github.com/MurzakTech/Murzak-PoS-Backend/pull/35). Front end: `TillPanel.jsx`, `ShiftCloseDialog.jsx`, `src/api/tillApi.js` |
| P3-7 | `list_sales` and `get_sale` over POS Invoices and Sales Invoices, one function for the amounts so list and receipt agree | Back end: [PR 36](https://github.com/MurzakTech/Murzak-PoS-Backend/pull/36) (builds on PR 33) |
| P3-8 | The Sales page: tabs All sales, Unpaid, Returns, Till sessions; short receipt numbers; summary row; receipt panel with Print, Send on WhatsApp and Return items; filters, page and the open receipt live in the address; Export | `src/newlook/sales/`, `src/api/salesListApi.js` |
| P3-9 | The till's controls are 44px with the New look on; no sideways scroll at 1024, 768 and 375px | `src/newlook/till/till-controls.css` |

## How each Done-when was checked

Unit tests: 1,717 pass in all (about 400 new in this phase). Browser checks (Chromium, production build, made-up server answers): `e2e-till`, `e2e-sales`, `e2e-home`, `e2e-charts`, all passing.

| Check | Result |
|---|---|
| AC-19 Pay screen | Pass in the browser at 1280 by 755: five choices in the right order (a switched-off method is absent), 2,000 among the quick notes, pad and Complete sale in view with no scrolling. |
| AC-20 M-Pesa code | Pass: Complete sale blocked with no code; a short code says "The code is too short. It must be 8 to 12 letters and numbers." beside the field; a valid code is capitalised and unblocks the sale and is saved as the payment reference. |
| AC-21 Cart kept | Pass: add items, refresh, the cart returns with its quantity. Leaving with items opens the dialog with first focus on Stay. Held sales show a count (in the Till open panel and the header). |
| AC-22 Cart line | Pass: "Only 3 left"; no store menu with one location. Two-location behaviour is covered by tests of the rule; not seen with two real locations in the browser. |
| AC-23 Shift end | Pass in the browser: counted 9,250 against 9,350 expected shows "Short by KES 100"; the preview closes nothing; the session closes only after confirming. |
| AC-24 Sales list | Pass: four tabs, short receipt numbers, no ACC reference in the list or above Details, Escape closes the panel and returns focus to the row. |
| AC-25 List page | Pass: filters in the address, 20 rows, "Showing 20 of 45", a bad rows-per-page value still shows 20, Export gives a CSV, empty states. |
| AC-37 for the till and Sales | Pass: no sideways scroll at 1280, 1024, 768 and 390 or 375px; the receipt opens as a full page below 1100px; on a phone the filters sit behind one Filters button. |

## Not yet checked

- **Everything against real data.** The three back-end pull requests (34, 35, 36) and Home's (33) are not run against a real database. They need to be deployed to the demo store, then: a sale made at the till appears in the Sales list with the same amount in the receipt panel; switching M-Pesa off shows at the till after a reload; a shift end creates one closing entry with the counted amounts.
- **Print and WhatsApp:** the print window and the WhatsApp link are built but not seen in a real browser window. The CSV was checked as a download only.
- **The dark theme** of the till and Sales page, and the till at 320px.
- **A real M-Pesa payment.** No real money was moved; the code is stored, not verified.

## Decisions for the owner

1. **Take payment on an unpaid sale.** There is no server call to record a payment on an unpaid invoice anywhere in the app today. The button is therefore not offered; the receipt says "This sale still has KES x to pay. Taking a payment from this page is coming soon." The page code and dialog for it exist behind one switch (`TAKE_PAYMENT_READY` in `src/newlook/sales/salesModel.js`). Building the server call records money against an invoice (a Payment Entry), so it needs your approval. Shall I build it?
2. **Closing-entry figures** (PR 35): the shift end overwrites `expected_amount` and `difference` on the new closing entry so it matches what the cashier was shown. I recommend keeping this.
3. **Closed shifts in the Sales list** (PR 36): ERPNext merges a closed shift's receipts into one Sales Invoice; the list then shows that one invoice labelled "Till closing" instead of each receipt (each receipt can still be opened by its id). Do you want every receipt to stay visible after a close?
4. **Short receipt numbers.** The till prints the full invoice name today. The new short number is the last digits padded to four (`#0033`), with an S for a Sales Invoice (`#S0033`). ERPNext restarts its numbers each year, so the date is shown beside it.
5. **The Sales redirect** (old Sales History to the new Sales page) is not switched on. It should wait until PR 36 is deployed.
6. **Return items** links to the current returns screen with the invoice filled in; a redesigned Returns page is not in this phase.
