# P1-6: App shell

Recorded 13 October 2026. Ticket P1-6 of the Murzak POS redesign (Done when: AC-07 passes; the Responsive behaviour table matches at four widths).

## What was built

The shell is in `src/newlook/shell/`, built only from the design tokens and the shared components. It frames every redesigned screen (everything under `/new-look`, owner only, and only while the shop's New look is on). The current screens and the New look switch are untouched.

| Part | What it does |
|---|---|
| **Top bar** (64px, sticks to the top) | Logo, search (Ctrl K), store switcher (only when the shop has more than one location), the Till open pill, **Go to till** (primary), **+ New**, theme toggle, help and the user menu. Go to till never wraps (`white-space: nowrap`, a 128px minimum, it does not shrink) and reads **Open till** when no till is open |
| **Sidebar** (three states) | 240px with icons, words and group names; 72px with icons only; and a drawer below 768px. Fixed in place with its own scroll, Settings pinned at the bottom. The open page has the soft fill, brand-text, a bar on its left edge and `aria-current="page"` |
| **Page header** | One title (28px, 700), an optional one-line subtitle, up to two actions on the right (a third is reported while developing) and tabs underneath. It also sets the browser tab title ("Sales \| Murzak POS") and puts it back when the page closes |
| **Search** | Opens with Ctrl K, Command K or `/` (not while typing in a field, and not over a dialog). Finds pages and actions; arrow keys and Enter; recent searches when empty; "Nothing matches" with a suggestion |
| **Help** | A dialog listing the keyboard shortcuts |
| **Skip link** | "Skip to the page" is the first Tab stop and moves focus to the page area |

**Widths (the Responsive behaviour table), checked in a real browser:**

| Width | Sidebar | Top bar |
|---|---|---|
| 1100px and up | 240px, or 72px if the person collapsed it (remembered on this device) | Everything; the Ctrl K hint is shown |
| 1024 to 1099px | 240px (same choice) | The Ctrl K hint is hidden and the search shrinks first; Go to till keeps its icon and label |
| 768 to 1023px | 72px, icons only, cannot be widened | The store switcher and + New show only their icons (their names stay for screen readers) and the pill drops the time |
| Below 768px | No sidebar in the page; a menu button opens it as a 240px drawer | Menu button, search (icon), Go to till and the user menu |

**On the component page** a new "App shell" card switches sample versions on of the parts that wait for other tickets (till open or closed, one or two locations, the + New menu), because the real data arrives later (see below). The page now sits inside the shell, so you can see the real top bar and sidebar around it.

## What is connected and what waits

| Part | State now | Arrives with |
|---|---|---|
| Signed-in person and Sign out | **Working** (taken from the app's sign-in) | |
| Theme toggle, search of pages, help, skip link | **Working** | |
| Go to till | Points at today's till (`/sales/pos`) and reads "Go to till", because the shell does not yet know whether a till is open | P3 (till state, P3-6) |
| Till open pill, store switcher | Built and tested; hidden until real till and location data are connected | P3-6 and the locations work |
| + New menu | Built and tested; hidden until its items and permissions exist | P1-7 |
| Sidebar destinations | Each item opens **today's** matching screen (for example Sales opens Sales History); Expenses is shown as "Soon" because the page does not exist yet | P1-7 (new addresses and redirects), P5-1 (Expenses) |
| Hiding items a role may not see | Not yet | P1-8 |

## How the Spec's rules were applied

- **No new colours or sizes.** The Spec's three shell sizes are now tokens (`--topbar-height` 64px, `--sidebar-width` 240px, `--sidebar-width-collapsed` 72px). Everything else uses existing tokens; a test fails if a colour is written in the shell's stylesheet or an outline is removed.
- **A table's header sticks just under the top bar** (the shell sets `--sticky-top` to the top bar's height); checked in the browser.
- **Toasts keep clear of the top bar's Go to till and Till open pill** (they carry the `data-toast-keepout` mark from P1-5); checked in the browser with everything switched on.
- **Collapsed sidebar:** each icon keeps its name for screen readers, and shows it beside the icon on hover and on keyboard focus (Escape hides it). The name is drawn outside the scrolling list so it is never clipped.
- **Small screens:** below 768px every top bar control, menu item and search result is at least 44px.
- **Landmarks:** one banner, one main menu, one main area; the groups are named; the open page is announced.

## How it was checked

- **68 new automated tests** since P1-5 (55 of them in the shell's own test file, the rest guarding the fixes and the changes to shared components). The whole suite is 56 files and 962 tests, all passing; lint is clean for everything in `newlook`; the production build compiles; the colour budget is unchanged (277 old, none in `newlook`).
- **A real browser run, 66 checks, all passing** (light and dark at 1280px; then 1100, 1024, 900 and 768px with every optional part switched on; then a 375px phone). Examples: top bar 64px; sidebar 240px under it; Go to till 40px high on one line at every width; nothing in the top bar overlaps and the page never scrolls sideways at any width; the search keeps at least 40px; the sidebar stays in view while a long page scrolls; collapsed is 72px and remembered after a refresh; Tab once reaches the skip link, Enter moves to the page; Ctrl K and `/` open search, typing finds Customers, nonsense gives "Nothing matches" with a suggestion; menu items show the 2px brand-text ring; + New lists sale, product, customer, expense and purchase; a toast never overlaps the pill or Go to till; on a phone the bar holds exactly the menu button, search, Go to till and the user menu, each at least 44px, and the drawer is 240px, closes when a page is chosen, and its items are at least 44px; no console errors.
- Re-ran the P1-4 and P1-5 browser checks inside the shell; all still pass (with one expected change, below).

## Problems found and fixed on the way

1. **A hidden helper text inside the sales table widened the whole page on a phone** (639px on a 375px screen). It was an unpositioned hidden label in the table's "Actions" column header (added in P1-5). The table's container is now the positioning parent, so such text scrolls with the table. A test guards it.
2. **At 768 to 900px the top bar overflowed** when the store switcher, pill and + New were all on. Below 1024px those now show only icons (and a shorter pill), as described above.
3. **Rows are now 57px, not 49px.** The row menu button added in P1-5 is 32px tall, which made rows 57px while the loading rows stayed 49px (a layout jump). Both are 57px now; the P1-4 note is corrected.

## Decisions and judgement calls (please read)

1. **Below 768px the top bar drops the + New menu, the Till open pill, the store switcher and the theme and help buttons, as the Spec says.** That means a phone has no way to add a product, customer or expense from the top bar, or to change store. The Spec lists only search, Go to till and the user menu. I followed it. If you want + New (and the store switcher) kept on phones, say so; the simplest answer is to put them inside the user menu.
2. **The sidebar says "Settings" and the page called "Staff" is not in the menu**, as the Spec says (Staff moves into Settings, Team; Open question 1, default yes).
3. **"Home" is highlighted on every page under `/new-look`**, because the New look's own pages stand in for Home until the real Home (P2) exists.
4. **Search finds pages and actions only.** Finding a customer, product or receipt needs the server, and no ticket builds it yet; the Spec lists it under Components without a ticket. Tell me if you want it scheduled.
5. **The user menu holds Sign out and the signed-in name only.** The Spec lists the user menu without contents. Profile and similar items can be added when you decide what they are.
6. **Escape also hides the collapsed sidebar's name tags**, and they do not stay open when the pointer moves onto them (WCAG 1.4.13 asks for that; I judged it unnecessary for a one-word label). Tell me if tender evidence needs the stricter reading.

## Not done here (belongs to other tickets)

The real + New items and permissions, new addresses and redirects for every old page (P1-7); roles and what each role sees (P1-8); the strings file (P1-10); the till shell with its own header (P3). Live demo-store work remains blocked until a new session can reach the shop's address.
