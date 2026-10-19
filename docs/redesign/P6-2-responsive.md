# P6-2 Responsive pass at 1280, 1024, 768 and 375 pixels (AC-37)

What was checked, how, what was wrong, what was fixed and what is left. Everything here was checked on a production build in
Chromium with made-up server answers (mocked `/api/method/*`). No real store was reachable. The real test store still has to be
looked at by eye (see the last section).

## How it was checked

One script opens every New look page at 1280, 1024, 768 and 375 wide, in the light and the dark theme, and measures the page
against the Responsive behaviour table of the Build Pack. It lives in the lead's scratchpad folder, not in the repo
(`phase6-responsive/responsive.js`, with `lib6.js` for the mocked answers). 52 page states, 4 widths, 2 themes: 416 page loads, plus the
extra steps below. Screenshots were taken at 1280 and 375 for every page and at 768 for Home, Sales, the till, Purchases and Settings,
and the screenshots were looked at (full-page at 375 so the cards below the fold are seen).

Pages covered: Home; Sales (All, Unpaid, Returns, Till sessions, receipt open); the till at `/sales/pos` with New look on (items in the
cart, the cart sheet on a phone, and the pay screen in a 755px high window); the component page, the chart page and the redirects page;
Products (list, panel, Categories, New, Edit); Stock levels (Overview, Low stock, Movements, Count stock); Customers (list, panel,
Owing, New, Edit); Suppliers (list, panel, Owed, New, Edit); Purchases (list, panel, Orders, Returns, New, Receive goods and its
items step); Expenses (list, panel, New); Reports (landing and the seven reports); Settings (five sections); the set-up wizard; and
the new sign-in.

Checks per page, against the table:

| Check | Rule |
|---|---|
| No sideways page scroll | `scrollWidth <= innerWidth` at every width (a data table scrolls inside its own box) |
| Sidebar | 240px at 1024 and up, 72px icons from 768 to 1023, no sidebar below 768 and a menu button that opens a drawer |
| Content | no wider than 1240px at 1100 and up |
| Go to till | present in the top bar at every width, one line, `white-space: nowrap`, one control high |
| Page header | one title; at most two actions; actions on one row from 768 up |
| Detail panel | beside the list at 1100 and up; a full page (list hidden) below 1100 |
| Lists below 768 | rows are cards (no table), filters sit behind one Filters button and open when it is pressed |
| Home | 4 tile columns and Sales chart beside Needs attention at 1100 and up; Sales chart full width with Needs attention below from 768 to 1099; one column in the order hero, tiles two by two, Needs attention, Sales chart, then the three cards below 768 |
| Till | product area and cart side by side from 768 (no bottom bar); below 768 products on top and a fixed bottom bar with item count, total and Charge, and the cart as a bottom sheet |
| Tap targets below 768 | every visible button, link, input box, select and checkbox label at least 44px high, with at least 8px between neighbours. A control covered by a sticky footer or scrolled out of its own box is not counted; a stand-alone link counts, a link inside a sentence does not |
| Pay screen | in a window 755px high the number pad, Change and Complete sale are all in view with no scrolling, at all four widths |

## Results

| | Before | After |
|---|---|---|
| Issues found over 4 widths and 2 themes | 204 | 90 (72 are the header-action count, 6 the Suppliers header at 768, 2 a sticky-footer overlap of the set-up cards; all three are explained under "Left") |
| Page scrolls sideways | Home at 375 (15px) | none on any page at any width, light or dark |
| Till at 768 | phone layout (bottom bar and sheet) | side by side, 340px cart |
| Tap targets under 44px below 768 | 38 page states (the first run measured the inner text box, 42px, instead of its 44px frame, which made about 30 of these false; the real ones are the links, till and pay-screen controls in the table below) | 0 |
| Tap targets closer than 8px below 768 | 54 page states | 0 (set-up cards: see Left) |
| Pay screen at 375 and 768 in a 755px window | last pad rows below Complete sale | pad, Change and Complete sale all in view |

Passing at all widths and in both themes: sidebar widths and the drawer, content width, Go to till on one line at 1024 and every other
width, one title per page, the detail panel as a side panel at 1100 and up and a full page below, cards and the Filters button on every
list below 768, the Home order at every width, the till layout, and the 755px pay screen. The earlier findings (Receive goods, Team
table, report tables, Categories table) were re-checked: none scrolls the page sideways at any width.

## Defects found and fixed

| Defect | Where | Fix (file) |
|---|---|---|
| Home overflowed the window by 15px at 375 (the period buttons made the single grid column wider than the window), then by more once buttons were spaced | Home | `src/newlook/home/home.css` (`.nl-home` column `minmax(0, 1fr)`; filters row never wider than its parent), `src/newlook/components/data-components.css` (`.nl-filters__group` `min-width: 0`) |
| "See all alerts" link 19px high on a phone | Home | `home.css` (stand-alone link is 44px below 768) |
| Segmented buttons (periods, Chart and Table, tabs of choices) 4px apart below 768; the previous, next and close buttons of a panel 4px apart | all lists, reports, panels, charts page | `data-components.css` (8px gap below 768) |
| The till showed the phone layout from 767 up to 899px (MUI "md" is 900) and the cart column had no width from 768 to 899 | Till | `src/pages/Sales/NewSale.js` (phone layout below 768 only; row layout and a 340px cart from 768) |
| Cart steppers, quantity box, note and more-options buttons 32 to 40px; Add discount, Hold sale and Clear 32px; the sheet's Close button 40px and touching the customer row | Till cart and sheet | `src/pages/Sales/pos/OrderPanel.jsx`, `NewSale.js` (44px, taller sheet header) |
| Cash, M-Pesa and Card choices 34px high on a phone | Pay screen | `src/newlook/till/pay.css` |
| Last two rows of the number pad fell below Complete sale at 375 and in the 428px pay area at 768 (window 755px high) | Pay screen | `pay.css` (below a 560px pay area: pad four keys wide with Backspace and Clear down the right, quick-cash notes on one row, keys 44px with 8px gaps) |
| Product picker rows in New purchase 4px apart on a phone | Purchases | `src/newlook/purchases/purchases.css` |
| "Back to the New look" and "Components" links, "Reset the list above" link under 44px | component and chart pages | `src/newlook/components/components.css` (`.nl-page-link`), `ChartsPage.jsx`, `ComponentPage.jsx`, `DataDemo.jsx` (class only) |
| Home cards jumped when the numbers arrived (layout shift 0.41 in Lighthouse); see P6-3 | Home | `home.css` (reserved heights) |

## Left, and why

- **More than two header actions on Products (Export, Import, New product), Suppliers (Export CSV, Add supplier, More actions) and
  Purchases (Export, More purchase screens, Receive goods, New purchase).** The Spec says a page has at most two header actions, but
  its own Products and Purchases rows ask for Export plus Import, and Export plus Receive goods plus New purchase. The Phase 4
  helpers kept every old action in the header. None of them wraps at 1024 or 1280. At 768 the Suppliers header wraps onto a second
  row. This needs an owner decision (one choice: a single "More" menu holding Export, Import and the other screens, beside the
  primary button), because it changes where Export lives, which AC-25 says must be in the header.
- **Set-up wizard cards at 375** sit under the sticky footer until the person scrolls; the measured 3px overlap is the footer
  overlaying the last card, not two touching buttons.
- **Till bottom bar says "Charge KES x", the Spec says "Pay".** Wording belongs to the language pass; flagged for it.
- **Tablet (768 to 1023) controls are 40px**, as the table allows (44px is required below 768, and at the till).
- **Home summary tiles on Sales stack one per row on a phone**; allowed by the table, noted because it pushes the list down.

## Needs the real test store, or a real device

- The same walk on the live store with real names, long product names and real numbers (the mocked data is short).
- A real phone (375 to 412 wide) for touch, the on-screen keyboard covering the pay screen, and the browser address bar changing the
  window height.
- The cart sheet and bottom bar with a real barcode scanner.
- The sign-in at 375 was measured on the new page only; the old sign-in (flag off) was not changed.
