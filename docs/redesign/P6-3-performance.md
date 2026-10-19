# P6-3 Performance pass against the targets (AC-38)

**Read this first.** Every number below is a lab number: a production build served from this machine, with made-up server answers
(`/api/method/*` answered by a small local server with a 100ms think time), measured in headless Chromium on a shared virtual
machine with no real network. Lighthouse used its mobile settings (simulated slow 4G and 4x CPU slowdown), but the machine is
slower than a typical laptop, so the times are pessimistic in absolute terms and good for before and after comparison only. They are
not a mid-range Android phone over 4G and not the real server. The targets table still has to be checked on a real phone with the
live store (see the last section).

How: `lighthouse` 13.5, `source-map-explorer` and the build's own file sizes, installed in the lead's scratchpad folder (nothing was
added to the repo). A production build was made before any change and another after (`REACT_APP_API_URL=/api/method`, source maps on).
3 Lighthouse runs per page and build, on Home (`/new-look`), Sales (`/new-look/sales`) and the till (`/sales/pos`, 500 products on the
device). Browser checks (skeleton delay, layout shift, font, list size, till timing) were made with Playwright and
`performance.now()`.

## Targets against measurements

| Target | Result (after) | Before | Met? |
|---|---|---|---|
| Skeletons appear within 200ms | first draw 205ms after the page mounted (delay constant `SKELETON_DELAY_MS = 200`) | same | Yes |
| Layout shift under 0.1, charts and tiles reserve height | Lighthouse CLS 0 on Home, Sales and the till; Home with a slow server and a 375px window 0.0008 | Home 0.406, till 0.349, Sales 0 | Yes |
| Largest Contentful Paint under 2.5s (mobile, 4G) | Home 6.4 to 6.6s, Sales 5.4 to 5.8s, till 7.4 to 9.8s (lab, simulated) | Home 7.1 to 7.3s, Sales 6.7 to 7.8s, till 9.4 to 12.8s | **No** in the lab; better than before on every page. Needs a real phone |
| Total Blocking Time (stand-in for INP, under 200ms) | Home 2.7 to 3.0s, Sales 1.5 to 2.3s, till 3.8 to 5.0s | Home 1.8 to 3.3s, Sales 1.6 to 2.4s, till 6.0 to 8.2s | **No** in the lab; till improved by about 40 percent |
| Till search within 100ms (5,000 products on the device) | narrow searches 50 to 60ms, broad ones 130 to 415ms (median 192ms) | median 474ms (300ms of it a wait before searching) | **Partly** (see below) |
| Add to cart within 100ms, no network wait | line in the page after a median 71ms, painted after 137ms; no request starts, and two items added with the browser fully offline | 95ms and 183ms | Yes for the line itself; paint is slightly over in this lab |
| Chart library only where a chart is drawn | recharts is in its own file and loads on Home, Reports, the chart page and the old dashboard only | in the main bundle for everyone | Yes |
| One variable Inter file, `font-display: swap` | one request, `inter-latin-wght-normal.*.woff2`, 48 KB; `font-display: swap` read from the live stylesheet | same | Yes |
| 20 rows per page, paged on the server | every list sends `page_size=20` and draws 20 rows (Sales, Products, Customers, Suppliers, Purchases, Expenses, Stock levels, Movements) | same | Yes |
| Home data under 1.5s | not measurable here (mocked answer); the page waits for one call, `dashboard.overview` | | Needs the real server |

Lighthouse transfer size (gzip, first load): Home 939 KB to 816 KB, Sales 941 KB to 703 KB, till 1,046 KB to 804 KB.

## Bundle (a)

| | Before | After |
|---|---|---|
| Main JS file, raw | 2,186,209 bytes | 1,338,804 bytes (down 39 percent) |
| Main JS file, gzip | 636 KB | 385 KB |
| New look code in the main file | about 551 KB (every page, string file and chart) | about 109 KB (shell, redirect table, shared strings and components) |
| Chart code (recharts, d3, es-toolkit, decimal) in the main file | about 343 KB | 0 (one separate file, about 341 KB raw, 98 KB gzip) |

Cause: `src/newlook/newLookRoutes.js` imported every page directly, and `AppRouter` imports that file, so every New look page and the chart
library were in the file every person downloads first, including the old screens with the New look off.

Fix: every route page is now `React.lazy` through `lazyPage` (new `src/newlook/lazyPage.js`), so a page loads when its address is
opened and shows the existing loading skeleton for the moment its code arrives. Behaviour is unchanged. `PagePlaceholder` stays in the
routes file. Three route tests that compared a route to the page object now compare its `pageName` (`expenses`, `products`, `setup`
routes tests), and `src/newlook/lazyPage.test.js` fails if a page is imported directly again.

JavaScript downloaded on a first visit (raw / gzip KB, no cache):

| Screen | Before | After |
|---|---|---|
| New look Home | 2,135 / 624 | 1,723 / 503 (chart file included) |
| New look Sales | 2,135 / 624 | 1,341 / 390 (no chart file) |
| New look Products | 2,135 / 624 | 1,339 / 389 |
| New look Reports | 2,135 / 624 | 1,745 / 509 |
| Till | 2,456 / 724 | 1,642 / 482 |
| Old Products (New look off) | 2,285 / 670 | 1,458 / 424 |
| Old Sales history (New look off) | 2,194 / 643 | 1,367 / 397 |
| Old dashboard (New look off, draws its own charts) | 2,186 / 640 | 1,704 / 495 |

The service worker precaches all files, so a lazy page is available offline after the first visit.

## Other fixes in this ticket

| Finding | Fix (file) |
|---|---|
| Layout shift on Home: cards were much shorter while loading (tiles 161px against 314px loaded, hero 199 against 247, cards 338 against 425) | `src/newlook/home/home.css` reserves the measured heights (hero, tiles, Sales chart, Needs attention, the three cards, the two-line date on a phone) |
| Layout shift 0.35 on the till: the "Checking your shift" message and the product area were the same element re-styled | `src/pages/Sales/NewSale.js` (a key on each, so the products area is a new element) |
| Till search waited 300ms (a debounce) before looking in the catalogue kept on the device | `NewSale.js`: tiles follow the typing through `useDeferredValue`; the look-up of offers for the tiles still follows the paced term, so typing sends no extra request |
| Adding a line redrew all 60 product tiles because the add function was new on every change | `NewSale.js` (one steady function for the tiles; each tile was already memoised) |

## What is left, and why

- **LCP and TBT are above target in the lab.** On Home the LCP element is the greeting; Lighthouse shows about 2.2s of "element render
  delay", which is the main thread busy parsing and running the 1.3 MB main file (385 KB gzip) before the page can draw. The New look
  is no longer the cause (109 KB of it is left in the main file). The rest is the older app: MUI, Redux store slices (several hundred KB of
  `store/*Slice.js` for every module), the route table and axios. Next steps, each a larger change: load the store slices with their
  modules, lazy-load the shell and gate when the New look is off, and trim MUI imports. These were not done: they touch the old screens.
- **Till search on a broad word (for example "oil" with 1,250 matches) still takes about 130 to 260ms here.** The time is drawing 60 tiles. Showing 30
  tiles first would roughly halve it; that changes what the cashier sees, so it is left for the owner to choose.
- **Font preload.** The font loads after the stylesheet is read. A preload link needs the file at a fixed address; Create React App
  gives it a hashed one. The text is drawn at once in the fallback font (`swap`), and LCP here is limited by script work, not the
  font, so no change was made.
- **Setup banner and other late items above the fold** (Home shows "Set up your shop" after a second call) can move the hero by about 112px
  for a new shop only; it cannot be reserved without knowing in advance. It does not apply once a shop has finished set-up.
- The Phase 0 baseline (P0-3) numbers for the old screens were not available to this ticket, so "today's figure becomes the limit"
  was not compared; the before column is the build just before this ticket.

## Needs a real phone over 4G and the real server

- LCP, CLS and TBT (and INP by tapping) on a mid-range Android phone with the throttling of the real network, using the live store's
  data and the real answer time of `dashboard.overview` (target 1.5s).
- Till search and add timing on a real till device with the shop's real catalogue (5,000 products) and a barcode scanner.
- A first load with a cold and then a warm cache, and an update (new build) arriving mid-shift.
- The 200ms skeleton rule with the real server: on a fast answer the skeleton never shows, which is intended.
