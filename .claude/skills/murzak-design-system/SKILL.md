---
name: murzak-design-system
description: The Murzak POS "New look" design system rules. Use whenever creating or changing any UI in this repo (a page, card, table, form, dialog, chart, empty state, icon or CSS), choosing a colour, size, space or radius, or adding visible words. Covers tokens, shared components, the strings file, dark mode, accent colours and the tests that guard them.
---

# Murzak design system (New look)

The redesigned screens live in `src/newlook`. The older screens (MUI, `src/components`, `src/pages`) are being replaced one by one; do not copy their styling into new work. Full background is in `docs/redesign/` (start with `P1-1-design-tokens.md`, `P1-3-base-components.md`, `P6-1-accessibility.md`).

## The five hard rules (tests fail if you break them)

1. **No hard-coded colours in `src/newlook`.** No hex, `rgb()` or `hsl()`. Use tokens: `color: 'var(--ink)'`. Old screens have a colour budget (`colourBaseline.json`); it may only go down. After rebuilding an old screen run `node scripts/colour-scan.js --write`.
2. **No visible words inside components.** Every label, title, placeholder, `aria-label` and message goes in the strings files (`src/newlook/strings.js` and the feature's `strings.*.js`). Use `{placeholders}` and `labels/fill.js` for changing parts so a sentence can be translated and reordered. `labels/labelsInOnePlace.test.js` scans for strays.
3. **Use the rename map.** Business-facing words follow `labels/renameMap.js` (for example M-Pesa, not MPESA; Card, not Credit Card). Never reintroduce an old term.
4. **Reuse before you build.** Check `src/newlook/components/` first: Button, Card, Chip, Dialog, Drawer, DetailPanel, EmptyState, Field, FilterRow, Icon, Menu, Pagination, Segmented, Select, Skeleton, SummaryRow, Switch, Table, Tabs, Toast, Checkbox, plus `charts/` and `shell/`. If something is missing, add it to the shared set with a demo on the component page, not as a one-off inside a screen.
5. **Accessibility is not optional.** Contrast is tested from the tokens; icon-only buttons need an `aria-label`; every chart has a text summary and a table view; motion respects `prefers-reduced-motion`.

## Tokens (`src/newlook/tokens.css`)

Light on `:root`, dark on `:root[data-theme='dark']`, the same names in both. Never write a dark-only rule; the token already flips.

| Group | Tokens |
|---|---|
| Surfaces | `--bg` page, `--surface` cards/dialogs, `--field` input fill, `--soft` selected/chip fill, `--track` meter track, `--selected-row` |
| Text | `--ink` main, `--ink-2` secondary, `--muted` captions and labels, `--brand-text` brand-coloured text and icons, `--on-brand` text on brand fill |
| Lines | `--line` hairlines and card borders, `--base` dividers inside controls, `--input-border` input outline and switch off state |
| Meaning | `--good`, `--bad`, `--warn` (text colours; always pair with an icon, never colour alone) |
| Charts | `--series-1` (M-Pesa and the main series) to `--series-4`, `--compare` (previous period). Three light series are below 3:1, so always label series directly |
| Type | `--page-title-size` 28 (one per page), `--card-title-size` 17 / small 15, `--dialog-title-size` 16, `--body-size` 14 / `--body-line` 1.5, `--table-size` 13.5, `--caption-size` 12.5, `--label-size` 11.5 (capitals, `--label-spacing`), `--kpi-size` 22, `--hero-size` 44 |
| Space | `--space-1..8` = 4, 8, 12, 16, 20, 24, 32, 40. Nothing off the scale |
| Layout | `--card-padding` 20, `--card-gap` 16, `--page-gutter` 24, `--content-max` 1240 |
| Shape | `--radius-card` 14, `--radius-tile` 12, `--radius-input` 10, `--radius-button` 10, `--radius-button-small` 8, `--radius-pill` |
| Controls | `--control-height` 40, `--control-height-till` 44, `--control-height-small` 32 |
| Elevation | Cards: 1px `--line`, **no shadow**. Only menus (`--shadow-menu`) and dialogs (`--shadow-dialog`) float |
| Focus | `--focus-ring` 2px `--brand-text`, offset 2px. Never remove it |
| Icons | 18px, 1.8px stroke, round ends, current text colour (`Icon.jsx`) |

If a value you need is not a token, stop and ask whether the design really needs it. If it does, add the token to `tokens.css` for both themes, with a contrast check, rather than inlining a value.

## Brand and accent

The shop owner picks one accent (indigo, blue, teal, green, amber, red, pink, purple, slate) in Settings, Brand. `[data-accent]` re-sets the brand ramp (`--brand`, `--brand-text`, `--on-brand`, `--soft`, `--track`, `--selected-row`). So **a screen must work in every accent**: never assume the brand is indigo, never mix a literal indigo with `--brand`. Backdrops (`brand/Backdrop.jsx`) appear on sign-in and the Home banner only; the till always stays plain.

## Building a screen

1. Read the matching ticket doc in `docs/redesign/` for the screen's intent and acceptance rules.
2. Compose from shared components; page chrome from `shell/PageHeader.jsx`.
3. Style with a co-located `.css` file using `nl-` prefixed classes (see `components.css`) and tokens only.
4. Add words to the strings file; fetch data through `hooks/useDataQuery.js`.
5. Design all states: loading (Skeleton, not a spinner over a blank page), empty (EmptyState with a next step), error (say what happened and what to do), partial, and long content.
6. Check light and dark, every accent you touched, and widths 1280, 1024, 768, 375.
7. Run the checks below, then follow the `ui-visual-review` skill with real screenshots.

## Commands

```
npm test -- --watchAll=false --ci src/newlook      # tests for the New look
npx eslint --ext .js,.jsx src/newlook                 # lint (include .jsx, it is easy to forget)
node scripts/colour-scan.js                           # hard-coded colour counts
npm run build                                         # production build must compile
```

## Related skills

`design-fundamentals` (why the tokens look the way they do and how to apply the principles), `human-not-ai` (what to avoid so it does not look machine-made), `pos-ux-patterns` (till, touch, Kenyan retail context), `ui-visual-review` (screenshot review loop).
