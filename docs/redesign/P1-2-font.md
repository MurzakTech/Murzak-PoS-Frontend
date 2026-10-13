# P1-2: Inter as one Latin variable file

Recorded 13 October 2026. Ticket P1-2 of the Murzak POS redesign (Done when: AC-03 passes for the font; no second font file is requested).

## What changed

- `src/fonts.css` loads Inter as **one variable font file, Latin characters only**, with `font-display: swap` (text shows at once in a fallback font and swaps to Inter when it arrives). The one file covers every weight from 100 to 900, so the design system's 400, 500, 600 and 700 are all this file.
- `src/index.js` imports that file instead of the package's seven-language style sheet.
- The font name is unchanged (`Inter Variable`), so both the current theme and the design tokens use it as before.

## What was measured (production build, real browser, stubbed server)

| | Before | After |
|---|---|---|
| Inter files in the build | 7 files, 218 KB | **1 file, 48 KB** |
| Inter files stored for offline use on every device (the service worker's cache) | 7 | **1** |
| Inter files the browser requested on Sign-in, Dashboard, Settings and the New look shell | 1 (Latin) | 1 (Latin) |

The browser already asked for only the Latin file before, because it fetches by character range. So the Spec's "no second font file is requested" already held on these pages. The gain is the **170 KB the offline cache no longer downloads and stores on every till**, and a guarantee that a second file can never be requested.

## What is checked automatically (`src/fonts.test.js`)

Exactly one font face; named `Inter Variable`; `font-display: swap`; weights 100 to 900 from a variable file; the file is the Latin one; the character range is identical to the package's own Latin block (so an update of the package that changes it is noticed); the application no longer imports the seven-language style sheet; the design tokens name the same font family.

## What the owner should know

- Characters outside the Latin range (Cyrillic, Greek, Vietnamese, and Latin-extended letters such as some European names) now use the device's own font instead of Inter. English and Swahili are fully inside the range. This applies to the whole app, not only the New look, because the font is loaded once at start-up; the change cannot be put behind the switch. I judged it harmless for Kenyan shops; tell me if any shop needs those characters in Inter.
- AC-03's sizes (page title 28px at 700, body 14px, table text 13.5px, hero amount 44px) and tabular figures are carried by the tokens (P1-1, tested) and are applied by the components in P1-3 to P1-5. They are verified on screen when those exist.
