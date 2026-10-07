# Murzak POS: UX Revamp, Phase 1

This document records what changed in Phase 1 of the market-entry revamp, what was found along the way that needs a decision from the business, and what Phase 2 should cover.

## 1. Goal

Make the product easy to start, easy to use and easy to understand, with a modern look. Phase 1 focuses on the first experience (landing, sign in, registration, first dashboard) and on the shared foundation that every other page inherits.

## 2. What changed

### Design foundation (applies to every page automatically)
- New design system in `src/theme/theme.js`: one builder for light and dark modes, soft grey canvas with white cards, a single brand colour for actions, consistent corners, shadows, focus rings and table styling.
- Inter font, self-hosted (no request to Google, better on weak connections).
- The theme now follows the device setting (light or dark) instead of always starting in dark.
- A real, transparent Murzak logo mark replaces the two logo files that were JPEGs saved as `.png` with a white background (this caused the white box on dark pages).

### App shell
- Permanent, labelled sidebar grouped by job (Sell, Stock, Buy, Insights, Team). It no longer hides behind a hover and no longer covers page content. It can be collapsed and remembers the choice.
- Quick search and jump (Ctrl+K, Cmd+K or "/") with plain-language actions such as "Add a product" and "Open point of sale". Results respect the user's permissions.
- Cleaner top bar: breadcrumbs, store switcher, a clear "Open POS" button, honest connection indicator (the old "sync" button did nothing and was removed), help link.
- Friendly error screen instead of a blank white page when something unexpected fails, and layout-shaped loading skeletons instead of lone spinners.

### First-run experience
- **Welcome screen** for a business with no products: three clear ways in (starter products for the registered industry, add one product, import a spreadsheet). Previously this was an almost empty page with a tiny spinner, and users with no registered industry hit a dead end.
- **"Get started" checklist** on the dashboard. Steps tick themselves off from real data (products added, staff invited, first sale made); the rest are marked by the user. It can be collapsed or hidden and re-opened.
- **Registration is one step shorter.** The POS Configuration step contained only pre-ticked defaults, so it now runs automatically with the recommended settings. If it fails, the old form appears with a clear message so the user can retry.
- **Phone numbers accept normal formats** (0712 345 678, +254 712 345 678, 254712345678) and are converted for the server.

### Dashboard
- Redesigned: greeting, quick actions, compact filters, headline figures, trend charts, and "needs attention" lists with helpful empty states.
- Removed invented trend percentages (+12.5%, -3.2%, +8.7%) that were hard-coded and shown as real results.
- Fixed "Pending shipments" showing an item count as money.
- If the product check fails, the normal dashboard now shows instead of wrongly showing the "no products" screen.

### Sign in and landing page
- Sign in rewritten: simpler layout, clearer errors, "Create your free account" link, working Terms and Privacy links.
- One "Email or phone number" box instead of an Email/Phone switch. The screen works out which one was typed; a phone number in any local format (0712 345 678, +254 712 345 678) is sent as 254712345678.
- Registration no longer asks for the password twice. The "show password" eye lets people check what they typed, which is what most modern sign-ups do.
- Landing page rewritten around benefits and three setup steps, with content that always displays (the old one hid sections until scrolled).

### Point of sale (till)
The selling screen was rebuilt for a POS machine. It is full screen (no sidebar or top bar), laid out for touch, and designed so a cashier can complete a sale in a few taps.

- **Layout:** product tiles on the left, the current sale on the right. Tapping a tile adds it. Category pills, a large search field and a quantity box in the cart.
- **Barcode scanners:** the search field is always ready. Scan (or type a code) and press Enter to add the product. If focus is elsewhere, scanning still lands in the search field.
- **Payment step:** a dedicated screen with large method buttons, quick-cash buttons (exact, then the next common note combinations), an on-screen number pad that also works from the keyboard, and the change to give shown in large type. Credit, split payments, M-Pesa and card are supported as before.
- **Hold and bring back a sale:** replaces the old "Save Draft" button, which did nothing.
- **Start of shift:** the till opens on an "Open your till" screen instead of a pop-up that could be dismissed.
- **Resumes after a refresh:** an open shift is now picked back up (see defects below).
- **Receipt:** a clear "Sale complete" screen showing the change to give, a receipt laid out for an 80mm till roll (prints on one page), and an option to turn automatic printing on or off.
- **Safer keys:** Escape no longer leaves the till (it used to jump to the dashboard mid-sale). F2 or Ctrl+K searches, F4 chooses a customer, F9 or Ctrl+Enter charges, Escape goes back one step.
- **Full screen button:** in the header. For a dedicated machine, also start the browser in kiosk mode (for example Chrome with `--kiosk`).

- **Products with no fixed price:** tapping a product whose selling price is zero (fresh produce, services, repairs) opens an "Enter price" keypad instead of adding it for nothing. The tile says "Enter price" rather than "0".
- **Credit shortcut:** choosing Credit without a customer now offers a "Choose customer" button right there, instead of sending the cashier back.

Selling rules (stock, offers, customer price lists, credit limits, loyalty points, invoice creation) were kept exactly as they were, and the invoice request sent to the server is unchanged.

### Phones (informed by a review of the Square POS mobile app)
- **Till on a phone:** the products fill the screen in two columns. A bar at the bottom shows the item count and a large "Charge KES ..." button, always under the thumb. "View sale" slides the current sale up from the bottom; payment then takes the whole screen.
- **No keyboard pop-ups:** on touch screens the search box no longer grabs focus after every tap, so the on-screen keyboard stays out of the way. Barcode scanners still work because typing anywhere lands in search.
- **Compact till header:** store name, till status, connection dot and the menu. The clock, logo and full screen button are hidden on small screens.
- **Bottom tab bar in the app:** Home, Sales, Sell (centre), Products and More (opens the full menu), shown on phones only.
- **Full-screen pickers:** the customer picker and the price keypad use the whole screen on phones.

## 3. Defects found and fixed

| Finding | Impact | Fix |
|---|---|---|
| MUI v7 no longer supports the old `Grid item xs={..}` syntax; 100 files (863 usages) used it | Layouts across the whole app rendered with auto-sized columns | Import switched to MUI's `GridLegacy` compatibility component in all 100 files |
| `loginUser` sent only email and password | Phone sign-in never sent the phone number | Now forwards whichever identifier was used |
| "Forgot password?" pointed to a page that does not exist | Dead end (404) | Opens an email to support, pre-written |
| Terms and Privacy links on sign in were `#` | Dead links | Point to the real pages |
| Debug logging printed the signed-in user's profile to the browser console | Privacy hygiene | Removed |
| `Stack` and `Grid` margins clashed | Misaligned form rows (registration) | Stack now uses flex gap globally |
| The till kept the open shift only in memory | After a refresh or restart the till forgot it, tried to open a second shift, and could not close the first | The till now looks for the cashier's own open shift and resumes it |
| A page effect re-ran on every render | The POS page re-rendered about 1,275 times in 3 seconds while idle, which strains low-powered machines | Totals are calculated once per change; idle updates dropped to zero |
| The previous customer stayed selected after a sale | The next walk-in customer could be billed to the previous customer's account | Each new sale starts as a walk-in |
| Escape on the POS jumped to the dashboard | A mid-sale cart could be lost by accident | Escape now goes back one step inside the till |
| The POS appeared inside the app shell (two sidebars and a top bar) | The full-screen layout was never actually full screen | The till now owns the whole screen |
| `App.test.js` was the unmodified Create React App sample and could not pass | No working tests | Replaced with 10 real tests |

## 4. Needs a decision from the business

1. **Phone sign-in:** the front end now sends the phone number, but nothing in this repository confirms the server accepts it. Please have the backend team confirm. If it does not, the sign-in box should ask for email only.
2. **Typed prices:** the "Enter price" keypad sends the typed price as the line rate, the same field the till already sends. If a product's POS profile does not allow rate changes, the server may refuse the sale; confirm the setting for variable-price products.
3. **Password reset:** there is no self-service reset. Support by email is a stop-gap. This needs a backend endpoint and a front-end page before launch.
4. **Marketing claims:** the old pages stated "500+ businesses", "99.9% uptime", "24/7 support", "Bank-level encryption", "Lightning fast", "Start Free Trial", and industry features such as kitchen display and appointment scheduling. I removed or softened these because they cannot be verified from the code (and the dashboard says other industries are "coming soon"). Restore any of them only with evidence you can stand behind.
5. **Repository clutter:** the project root holds about 60 planning documents and a 5 MB archive (`pos_frontend.tar.gz`). I did not move or delete them. Consider a `docs/` folder and removing the archive.

## 5. Phase 2 (recommended next)

0. Test the till on the real POS hardware (touch screen, barcode scanner, receipt printer). Confirm how product barcodes are returned by the server; the till reads a `barcode` field or a `barcodes` list.

1. Move existing list pages (Products, Customers, Suppliers, Staff, Inventory) to the shared `PageHeader`, `FilterBar` and `DataTable`, and add friendly empty states to each. They already inherit the new look, but not the new patterns.
2. Point of sale screen: review for speed on tablets (large touch targets, barcode focus, a clear way back to the dashboard).
3. Inline help: short "what is this?" hints on technical settings (eTIMS, price groups, stock reconciliation).
4. Move Terms/Privacy and similar legal text through a review.
5. Accessibility pass (keyboard, screen readers) and a real-device test on a low-end Android phone.
6. Optional: replace the sample dashboard preview on the landing page with real product screenshots.

## 6. How it was verified

Production build passes. Fifteen automated tests pass. The till was also exercised end to end at phone size (390 by 844, touch): 22 checks covering the bottom bar, slide-up sale, typed price reaching the invoice, payment, the tab bar and single-box sign-in. In a browser with a simulated server I exercised: sign in by email and phone, registration end to end (including the automatic step failing and recovering), the new-business and established-business dashboards in light and dark, mobile width, the quick-search palette, and sidebar collapse persistence. No console errors were observed.
