---
name: design-fundamentals
description: Graphic design basics applied to interface work: visual hierarchy, grid and spacing, typography, colour, contrast, alignment, proximity, repetition, balance, whitespace, iconography, data visualisation and motion. Use when designing or critiquing any layout, deciding how something should look, or when a screen feels flat, busy, cramped or "off" and you need to know why.
---

# Design fundamentals for this product

Good interface design is applied graphic design. Each section gives the principle, the reason, and what it means with this repo's tokens (`murzak-design-system`). When a screen feels wrong, find the principle it breaks rather than adding decoration.

## 1. Hierarchy: one thing first, then the next

People scan in this order: size, weight, colour, position, then everything else. Every screen needs a clear first, second and third read.
- One page title (28px, 700) per page. One primary button per view or card.
- Rank by importance, not by database order. On Home the day's total (`--hero-size` 44) outranks tiles (`--kpi-size` 22), which outrank captions (12.5).
- Squint test: blur your eyes (or view a tiny screenshot). If you cannot tell what matters most, flatten the competing elements: reduce weight, drop colour to `--muted`, or remove them.
- Never rely on colour alone to rank; combine size or weight.

## 2. Spacing and rhythm

- Use only the 4/8/12/16/20/24/32/40 scale. Consistent steps create rhythm; arbitrary values create unease.
- **Proximity**: related things sit closer than unrelated things. A label is nearer to its field (4 to 8px) than to the previous field (16 to 20px). Inside a card use 12 to 16; between cards `--card-gap` 16; between page sections 32.
- Padding inside a container is at least the gap between its children. Cards use `--card-padding` 20.
- Whitespace is a tool, not waste. Crowding is the most common flaw in dense POS screens; remove something before shrinking everything.

## 3. Alignment and grid

- Pick an edge and hold it. Left-align text and labels; right-align numbers in tables so decimals and digits stack; centre only short, singular things (empty states, a hero amount).
- Content width caps at `--content-max` 1240; on wide screens do not stretch lines of text past about 70 characters.
- Use a 12-column mindset: tiles in 2, 3 or 4 per row, never 5 uneven. Equal-height cards in a row.
- Optical alignment beats mathematical: icons beside text need to look centred on the text's x-height; check the result, not the numbers.

## 4. Typography

- One family (Inter Variable). Hierarchy comes from size, weight and colour, not from extra fonts.
- Weights in use: 400 body, 500 medium, 600 card titles, 700 page titles and numbers. Do not invent 300 or 800.
- Body 14px at 1.5 line height; table 13.5; caption 12.5 in `--muted`; labels 11.5 capitals with 0.06em tracking. Tight tracking (-0.02em) only on large titles.
- Numbers: use tabular figures (`font-variant-numeric: tabular-nums`) in tables, totals and anything that updates, so columns do not jitter.
- Money: always `KES` formatting through `format.js`; never hand-build currency strings. Do not abbreviate a figure that a cashier must read exactly.
- Sentence case everywhere, no title-case or ALL CAPS except the label style. Truncate with an ellipsis and a `title` or tooltip only when full text is available elsewhere; never truncate amounts.
- Line length: 45 to 75 characters for paragraphs; keep help text short.

## 5. Colour

- The palette is deliberately restrained: neutrals do 90% of the work; the brand colour marks the primary action, selection and focus; green, red and amber mean good, bad and warning only.
- 60/30/10: about 60% `--bg`/`--surface`, 30% text and lines, 10% brand and meaning colours.
- **Colour never carries meaning alone.** Pair `--good`/`--bad`/`--warn` with an icon and words (colour-blind users, glare on a shop counter, greyscale receipts).
- Contrast: body text 4.5:1, large text and UI parts 3:1. Tokens already pass; do not apply `opacity` to text to make it lighter, because that breaks the ratio. Use `--ink-2` or `--muted`.
- Dark mode is not inverted light mode: lower the surface contrast, desaturate, lift surfaces by lightness rather than shadow. Use the tokens and it is handled.
- Charts: a series always has a direct label or legend in addition to colour; `--series-3`, `--series-4` and `--compare` are under 3:1 on light.

## 6. Contrast of form: size, weight, shape, density

Interest comes from contrast between things (big and small, bold and light, dense and airy), not from adding effects. If everything is bold, nothing is. Pair one confident element per region with calm surroundings.

## 7. Repetition and consistency

The same thing looks and behaves the same everywhere: same card, same table header, same empty state, same date format, same confirm pattern. Repetition is what makes an app feel designed and learnable. Deviate only with a reason you can say aloud.

## 8. Balance and composition

- Visual weight: a heavy block (a chart, a big number) needs a counterweight across the layout; do not stack all weight top-left.
- Group into 3 to 5 clear zones per screen. More means the screen is doing too much; split or progressively disclose.
- Use asymmetry on purpose (a wide main column with a narrower side panel) rather than a grid of identical cards.

## 9. Shape, borders and depth

- Radii come from tokens: 14 cards, 12 tiles, 10 controls, pill for chips. Nested radii: inner radius = outer radius minus the padding between them.
- Cards use a 1px `--line` border and no shadow. Shadows are reserved for things that float (menus, dialogs). Never stack a border, a shadow and a tinted background on one card.
- Dividers: prefer spacing; use a hairline only when spacing cannot separate.

## 10. Icons and imagery

- One icon set (`Icon.jsx`): 18px, 1.8px stroke, round ends. No mixing filled and outlined, no emoji as icons.
- An icon supports a word; it rarely replaces one. Icon-only controls need `aria-label` and a tooltip.
- Empty states and the brand may use illustration (`EmptyArt.jsx`, `Backdrop.jsx`) in the same stroke language. Prefer real product imagery (actual product photos, the shop's logo) over stock graphics.
- Logos and product images: reserve their space (fixed aspect ratio) to avoid layout shift; give a tidy fallback when missing.

## 11. Data display

- Tables: right-align numbers, left-align text, 13.5px, generous row height (min 44px on touch), sticky header on long lists, a visible selected-row state, zebra striping not needed.
- Choose the chart for the question: change over time is a line; compare categories a horizontal bar; part of whole at most 4 slices, otherwise a bar; a single number gets a big figure with a quiet comparison (`ChangeLine.jsx`). Do not use 3D, dual axes or decorative gradients.
- Start bar axes at zero. Label directly. Show the previous-period reference in `--compare`.
- Lead with the answer ("Sales are up 12% on last week"), then the chart that proves it.

## 12. Motion

- Motion explains cause and effect (a row appears where you added it, a panel slides from where it was opened). It is never ornament.
- 120 to 200ms for small state changes, 200 to 300ms for panels, ease-out on entry, ease-in on exit. Animate `transform` and `opacity` only.
- Honour `prefers-reduced-motion` (replace movement with an instant or fade change).
- The till is a speed tool: no entrance animations on the cart, buttons respond within one frame, nothing blocks the next tap.

## 13. States are part of the design

Design every state, not only the happy path: loading (skeletons that match final layout), empty (what this is, why it is empty, the next step), error (what happened in plain words, what to do, a retry), disabled (and why), hover, pressed, focus, selected, long text, large numbers, zero values, many items, offline.

## Quick self-critique (ask before you finish)

1. What is the one thing a user should see first, and is it?
2. Is everything aligned to a visible edge, spaced from the scale, grouped by meaning?
3. Could I remove a border, colour, shadow or word and lose nothing?
4. Does it work in dark mode, in each accent, on a 375px phone, with long and empty content?
5. Does any meaning rely on colour alone?
