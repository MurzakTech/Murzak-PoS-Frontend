# P6-1: Accessibility pass on every New look screen

Acceptance: AC-36 (every rule of the "Accessibility rules" table passes on Home, Sales and the till, including a keyboard-only run with no focus trap), and the rules hold on the other screens.

Everything below was checked on a production build made from the source tree, with mocked server answers (no real store is reachable from this environment). Screen readers (NVDA, VoiceOver, TalkBack) were NOT used: speech is verified through the roles, names and live regions the browser exposes, not by listening.

## 1. How it was checked

| Check | How |
|---|---|
| Automated scan | axe-core 4.11 in Chromium, tags wcag2a, wcag2aa, wcag21a, wcag21aa and best-practice, light and dark, at 1280 and 390 wide. 61 scenarios, 244 runs: every page, plus an open detail panel or dialog where one exists (receipt, customer, product, purchase, supplier and expense panels; Stock in and out, category, person, pay bill, take payment dialogs; Search; the till's cart with a stock warning, pay screen, M-Pesa code error, Leave-the-till, Till open panel, shift close). Script: `scratchpad/phase6-a11y/scan.js`. |
| Keyboard run | `page.keyboard` only (Tab, Shift+Tab, Enter, arrows, Escape). Home and Sales at 1280 and 390, the till at 1280 and 390, light and dark. A stop shows a ring when its computed outline is 2px or more (or, for a text field, a 2px highlighted border). Scripts `kbrun.js`, `kbtill.js`. |
| Rules axe cannot see | Contrast worked out from `tokens.css` for every text and icon pair (`contrast6.js`, and the jest file `src/newlook/accessibility.test.js`); chart summary, toggle and keyboard tooltip on every chart; toast timing and roles; reduced motion; status chips and payment chips; input border colour; zoom. Scripts `rules.js`, `rules2.js`, `zoom.js`. |

## 2. Axe results, before and after

| | Before | After |
|---|---|---|
| Runs | 208 (52 scenarios; 12 till runs at 390 could not drive the phone cart in the script) | 244 (61 scenarios, no script errors) plus a final re-run of the 7 till scenarios (28 runs) |
| Critical | 0 | 0 |
| Serious | 9 | 0 |
| Moderate | 10 | 22 (see below: 22 runs of one rule on the till; the 10 earlier were another rule) |

Before, serious: `color-contrast` x7 (muted words on the soft fill 4.49:1 on a report figure and the set-up steps; warn status word on an open row 4.48:1; good words on the soft fill in the dark theme 4.47:1), `aria-command-name` x2 (the Till open chip at 390 has no visible word, so no name). Before, moderate: `page-has-heading-one` on the till (10 runs).

After: no serious or critical in any run. Left: `heading-order` (moderate) on the till only. The current till's markup uses Material UI text styles that render as h2 to h6 (Current sale, Total, product and customer names), so the heading levels skip. Fixing it means retagging many parts of the current till; left, see section 5.

## 3. Rules table

PASS on a page group means the check above passed for every screen in that group. "Other screens" = Customers, Products, Stock, Purchases, Suppliers, Expenses, Reports, Settings, Set-up, Sign-in, components and charts pages.

| Rule | Home | Sales | Till | Other screens |
|---|---|---|---|---|
| Text contrast, 4.5:1 / 3:1 (brand-text, never brand) | PASS | PASS | PASS | PASS (note A) |
| Focus: reachable in reading order, 2px brand-text ring, never removed without a replacement | PASS | PASS | PASS (fixed) | PASS (fixed, charts) |
| Input borders 3:1 | PASS (light 3.23, dark 3.21 computed; the field border measured as the input-border token in both themes) | PASS | PASS (text fields show a 2px highlighted border) | PASS |
| Colour never alone | PASS | PASS (20 of 20 status labels have icon and word; payment chips show the name) | PASS | PASS (note B) |
| Labels and names | PASS (chart stops named, fixed) | PASS | PASS (Till open chip named, cart sheet named, fixed) | PASS |
| Charts: one-sentence summary, Chart and Table toggle, keyboard tooltip | PASS (3 charts) | n/a | n/a | PASS (charts page 5, reports sales 3, profit 2, owed 1, aging stock 1) |
| Dialogs and menus: focus in, trapped, Escape closes, focus returns, Stay first | PASS (New menu, Search, Help, Account) | PASS (panel: focus moves in, Escape returns to the row) | PASS (Leave the till: first focus on Stay; Till open panel; shift close; receipt) | PASS by the shared Dialog (axe plus component tests; not each dialog by keyboard) |
| Messages: confirmation role status, error role alert, toast 6 s and pauses on hover, "Sale complete, KES 100" | PASS | PASS | PASS (added: polite status in the receipt, says "Sale complete, KES 2,500" in the run) | PASS (note C) |
| Motion: reduced motion turns off count-up, chart draw-in, skeleton shimmer | PASS (there is no count-up; hero shows its final value at once in both modes) | PASS | PASS | PASS |
| Targets 40/44px | Owned by the Responsive helper (P6-2) | | | |
| Zoom: 200% and 320px with no sideways scroll except in a table | PASS | PASS | PASS | FAIL on two demo pages at 320px only (components 14px, charts 16px over); every real screen passes at 320px and at 200% (640px). Left to the Responsive helper. |
| Keyboard-only run, no focus trap | PASS (41 stops, ends at the browser) | PASS (45 stops; 30 at 390) | PASS (12 stops, pay screen 26 stops, no trap) | n/a |

Notes.
- A. Pairs measured below 4.5:1 but not used for text, or only transient: muted on the track fill (4.27), muted, warn, bad, good and brand-text under the 16% pressed overlay (about 3.5 to 4.5, held only while a button is pressed), and muted words on a hovered table row (4.40:1). Left, see section 5. Chart marks series-3 (2.82), series-4 (2.17) and compare (2.73) are under 3:1 on white by design in the Build Pack; every series is named by a label or legend with its value, and every chart has the Table view.
- B. Customers and Expenses lists have no status labels; their words are plain text.
- C. Field-level error text is tied to its input (aria-invalid and aria-describedby, checked at runtime), and the form summary and banners are role alert. Individual field errors are not role alert on purpose: adding it made a form read every error twice (once from the summary, once from the field) and broke 11 tests that rely on one alert per form.

## 4. What was fixed

| Defect | Fix | Files |
|---|---|---|
| Chart svg took keyboard focus with no visible ring (the ring rule targeted the wrapper) | Ring on `.recharts-surface:focus-visible` | `src/newlook/charts/charts.css` |
| Each chart added 10 or more nameless Tab stops (the library's drawing layers are focusable in Chromium) | Layers get tabindex -1; the chart svg is named with its one-sentence summary | `src/newlook/charts/ChartFrame.jsx` (+ `chartFocus.test.jsx`) |
| The till's buttons, tiles and chips showed no focus ring at all (Material UI removes the outline) | 2px brand-text ring with 2px gap on everything focusable in the till and in the dialogs and menus it opens, via a body class while the New look till is open (text fields keep their own highlighted border) | `src/newlook/till/till-controls.css`, `src/pages/Sales/NewSale.js` |
| No "Sale complete, KES 100" announcement | Polite live region inside the receipt dialog (so the page's hidden state behind the dialog cannot mute it), spoken a moment after it exists; only with the New look on | `src/newlook/till/SaleAnnouncement.jsx`, `strings.till.js`, `src/pages/Sales/pos/ReceiptDialog.jsx` (optional `announcement` slot), `NewSale.js` (+ `SaleAnnouncement.test.jsx`, 6 tests) |
| Till had no h1 | Hidden h1 "Till", New look only | `NewSale.js`, `strings.till.js` |
| Till open chip had no name at 390 | `aria-label="Till open"` | `src/pages/Sales/pos/PosHeader.jsx` |
| Phone cart sheet was a dialog with no name | `aria-label="Current sale"` | `NewSale.js` |
| Store name, cashier name, clock rendered as h6 | Rendered as span | `PosHeader.jsx`, `src/pages/Sales/pos/Clock.jsx` |
| Contrast 4.47 to 4.49:1 on soft fills and open rows | Quiet words on a soft figure use ink-2; change words and status words on open or hovered rows take a little ink in the mix (tokens are unchanged) | `src/newlook/reports/reports.css`, `setup/setup.css`, `components/data-components.css` (+ `accessibility.test.js`, 15 tests) |

The three edits to the current till files (`NewSale.js`, `PosHeader.jsx`, `ReceiptDialog.jsx`, `Clock.jsx`) add attributes or an optional prop only; the h6 to span change in the header has the same look. The old till behaves as before with the New look off, except that its screen-reader names are better (Till open chip, Current sale sheet, header text no longer headings).

Already correct, confirmed by test: toast stays 6000 ms and pauses on hover and focus (`overlayComponents.test.jsx`, and 6.4 s measured in the browser; error toasts stay until closed and sit in role alert); every chart has a one-sentence summary equal to its visible note, a Chart and Table toggle, and its tooltip opens when the chart is focused (arrow keys move it); reduced motion turns off skeleton shimmer (CSS), chart draw-in (library flag, measured bar heights constant) and every running animation at 150 ms; no count-up exists in the code.

## 5. Left, and why

| Item | Impact | Why left |
|---|---|---|
| `heading-order` on the current till (22 of 28 runs, one element: the first h2 to h6 that follows the hidden h1) | Moderate | The till's Material UI headings need retagging across `OrderPanel`, `ProductPanel`, `PaymentPanel`; it is old-screen markup, large to touch for a moderate best-practice rule. |
| Muted words on a hovered table row measure 4.40:1; pressed-state overlays 3.5 to 4.5:1 | Hover and press only | Fixing it needs a new token or a lighter overlay (the spec fixes both). Static and focus states all pass. |
| Components page and Charts page overflow 14 and 16px at 320px | Demo pages, not shipped screens | Layout CSS; the Responsive helper (P6-2) owns it. |
| Menu popups (`role=menu`) sit outside any landmark in one axe run (region, moderate) | Moderate, only while open | It is the way the shared Menu draws above everything; axe did not repeat it in the final run. |
| `role="application"` on each chart svg (library default) | Best practice | Needed for arrow-key tooltips; the svg is named with the summary. |
| Targets 40/44px | | Responsive helper (P6-2). |

## 6. Needs the real test store or a real device

- Listen to the till with NVDA, VoiceOver and TalkBack: "Sale complete, KES 100" after a real sale, the Leave-the-till dialog reading Stay first, chart stops reading their summary, and the menus.
- Run the keyboard-only pass on the live Home, Sales and till with a barcode scanner acting as a keyboard.
- Zoom a real phone and desktop browser to 200% and confirm no sideways scroll (checked here only by narrowing the viewport to 640px and 320px).
- Axe on real data: long product names, many statuses, error states from the real server.
- Contrast on a real screen in sunlight, and with the device's own dark mode.

Another helper's tests (Settings Business model, Sales phone layout) failed at times during the full run while their files were changing, and `loginSwitch` timed out once under load; each passed when run alone. None involves files from this ticket.

Scripts and raw results are in `scratchpad/phase6-a11y/` (`axe-before.json`, `axe-final.json`, `axe-till.json`, `kbrun-*.json`, `kbtill-*.json`, `rules.json`, `rules2.json`, `zoom.json`).
