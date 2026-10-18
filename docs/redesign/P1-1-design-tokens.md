# P1-1: Design tokens, and what happens to the hard-coded colours

Recorded 13 October 2026. Ticket P1-1 of the Murzak POS redesign, started at the owner's request ("tokenize the hard coded colors"). Phase 0 is not finished (P0-3, P0-4 and P0-6 are waiting for the demo store), so this is recorded as early work on Phase 1, to be confirmed at the Phase 0 gate.

## What was built

`src/newlook/tokens.css` is now the one place where a colour, type size, space, radius or shadow of the redesigned screens is set. It holds **every token of Part 1, "Design system"**, with the exact names and values of the tables:

- **23 colour tokens**, light and dark (`--bg`, `--surface`, `--ink`, `--ink-2`, `--muted`, `--line`, `--base`, `--input-border` (new), `--field`, `--brand`, `--brand-text` (new), `--on-brand`, `--soft`, `--track`, `--selected-row`, `--good`, `--bad`, `--warn`, `--series-1` to `--series-4`, `--compare`).
- **Type** (Inter weights; page title 28px; card title 17px and 15px; body 14px with line height 1.5; table text 13.5px; caption 12.5px; label 11.5px in capitals; KPI 22px; hero amount 44px), the **spacing scale** (4, 8, 12, 16, 20, 24, 32, 40px), **layout** (card padding 20px, gap 16px, gutter 24px, content up to 1240px), **radius**, **control height** (40px, 44px at the till, 32px small), **elevation** (cards a 1px line and no shadow; menus and dialogs at 10% and 12% of the ink colour), **icons** (18px, 1.8px stroke) and the **keyboard focus ring** (2px in brand-text, 2px offset).
- Light values sit on the root element. The dark values replace them when the root carries `data-theme="dark"`, which `src/theme/ThemeProvider.js` now sets (and keeps in step with the theme toggle). Both themes use the same names, so no component needs a dark-only rule.

The empty New look shell (`NewLookShell.jsx`) is the first user: every colour, size, radius and space in it comes from the tokens. The current screens read none of the tokens, so they look exactly as before, with the New look off or on.

## What is checked automatically (AC-01 and AC-02 for the tokens)

- Every colour token has the light and dark value of the Colour table, and there are exactly the 23 of Part 1.
- Every type, space, shape and elevation value equals the Part 1 table.
- **Contrast, both themes:** all text pairs are at least 4.5:1 (ink, ink-2 and muted on the surface and the page; brand-text on the surface **and on soft**; on-brand on brand; good, bad and warn on the surface), the input border is at least 3:1 against the input fill, and the focus ring is at least 3:1 against the page and cards.
- **The Spec's own figures were re-calculated and all hold:** old brand on soft in dark 4.05:1 (the failure), brand-text on soft in dark 5.03:1 (the fix), light series-3 2.82:1, series-4 2.17:1, compare 2.73:1, input border 3.23:1 light and 3.21:1 dark, focus ring 5.73:1 light and 6.42:1 dark. The Spec's point that three light chart colours fall below 3:1, so a series must also be labelled, is confirmed.
- **No redesigned file may hard-code a colour:** a test scans everything in `src/newlook` (except the token file) for hex, `rgb()` and `hsl()` colours and fails if it finds one.
- The root element carries `data-theme`, and it follows the theme toggle.

## The hard-coded colours in the current screens

The screens that are not rebuilt yet still hard-code their own colours: **277 colours in 65 files** (`node scripts/colour-scan.js` lists them; the largest are `StatusChip.js`, `ReportChart.jsx`, `Landing.js`, `ProductArt.jsx` and the report pages; there are also 45 `rgba()` and `hsl()` values among them).

**What was done:** nothing in those screens was changed. Instead, `src/newlook/colourBaseline.json` records how many each file has, and a test (`colourBudget.test.js`) **fails if any file gains a hard-coded colour**, or a file that has none gets one. So the number can only go down. I checked that both guards fail when a stray colour is added.

**Why the old screens were not rewritten now:**
1. The old colours are not the Spec's colours (for example the status chips use slate and green shades that are not in the table). Replacing them with the new tokens would **change how the app looks with the New look switched off**, which breaks the rule that with the switch off nothing changes.
2. Those screens are rebuilt anyway in Phases 2 to 5, each from the shared components that use the tokens. Editing 65 files twice would add risk and no benefit.
3. The tokens reach each screen when it is rebuilt, behind the switch. After each rebuilt screen, run `node scripts/colour-scan.js --write` to lower the baseline. When the baseline reaches zero, the Spec's AC-01 ("a search for hex colours outside the token file finds none") holds for the whole app; ticket P6-1 and the language sweep (P6-4) finish what is left.

**If you want the old screens changed visibly anyway** (for example to retire the old palette earlier, accepting that shops with the New look off would see a different look), say so and I will plan that as a separate, larger step with before and after screenshots.

## Not in this ticket

- The Inter font file (P1-2) and the components (P1-3 to P1-5) are separate tickets.
- The indigo age scale for debt-age charts (`#a7a3f2`, `#7f79ea`, `#5a52e0`, `#3a30b8`) is for the Reports work in Phase 5 (Spec: "not built in this release"), so it is not a token yet.
- Printing: the receipt's print styles use black and white on purpose (a till roll) and stay as they are until the Sales rebuild.

## How the tokens are used

In a redesigned component, write `color: 'var(--ink)'`, `background: 'var(--surface)'`, `borderRadius: 'var(--radius-card)'`. Never write a hex value; the test fails. In a chart, pass `var(--series-1)` as the colour.
