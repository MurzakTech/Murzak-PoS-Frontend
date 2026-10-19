# P7-3: Receipts and branding

Front end: `src/newlook/brand`, `src/newlook/receipt`, `src/api/brandApi.js`. Back end: `murzak_pos/api/brand_api.py` (contract in the back end repo, `docs/redesign/P7-3-contract.md`).

## What was built

- **Settings, Brand and receipts** (`/new-look/settings/brand`, a sixth section in the side list). Three cards that each save on their own (Logo and colour; Words on your receipt; Receipt style) and a preview of a made-up sale that follows what is typed before it is saved. Owners can change; others can look.
  - Logo: JPG, PNG or WebP, 1 MB at most, checked in the browser and sent through the standard public file upload (`upload_file`, as the product photos). Only the `/files/...` address is stored.
  - Brand colour: nine named choices (Indigo, Blue, Teal, Green, Amber, Red, Pink, Purple, Slate). There is no box to type a colour. Each choice has a word and a check mark, so colour is never the only signal.
  - Tagline (80), footer message (160), social name, website, receipt style (80mm roll, 58mm roll, A4).
- **Storage**: `brand_api.get_brand` / `set_brand`, one JSON value per business in `DefaultValue` (like the New look switch). No migration, no new document type. Owners only to change; anyone signed in reads (cashiers print receipts).
- **Receipt**: one component (`receipt/Receipt.jsx`) fed by a plain object (`receiptModel.js`: `fromSale`, `fromTill`). Used by the till after a sale (New look only; the old look is unchanged), and by Print on the Sales page receipt panel, which is also the reprint. Header: logo, shop name, tagline, address, phone, KRA PIN. Title, short number `#0045` with the full reference under it, date and time, cashier, customer, an item table, totals (subtotal, offers, discount, tax only when present, TOTAL), payments by method with the M-Pesa code, cash given and change, footer message, thank you, social name and website.
- **Three styles**: Thermal 80mm and 58mm (black only, the logo in greys, no accent) and A4 (letterhead style with the accent on its rules, title and total). Each sets its own `@page` size. A till roll has no fixed length and Chrome does not accept `auto`, so the receipt measures itself and writes the length into the page size.
- **Where the brand is applied**: the receipt (all of it), the sign-in page header (logo, shop name and colour, from the last answer kept on the device), the top bar logo, and the accent colour on the whole New look shell.

## The accent colour and the design tokens

The palette lives in `tokens.css` only (rules `:root[data-accent='teal']` and the dark pair, plus `[data-swatch='teal']` for a colour chip and for paper). An accent re-sets `--brand`, `--brand-text`, `--on-brand`, `--soft`, `--track` and `--selected-row`, nothing else, and is set by one attribute on the page, removed when the New look is off or the colour is the default. The chart colours (`--series-*`) are left alone, so M-Pesa keeps its meaning. `brand/accents.test.js` checks every choice: brand text on white, the page background, soft, track and selected row, and on-brand text on the brand fill, at least 4.5:1 in light and in dark (the lowest is about 4.8:1), and that an accent changes only those six tokens.

## What could not be done

- No eTIMS or QR line: the sale answers carry no such data today, so none is drawn. A single tax total is shown; the sale answers have no tax breakdown by rate.
- The Sales page panel keeps its working on-screen layout; its Print draws the shop receipt. The till dialog shows the shop receipt itself.
- Brand and shop details are fetched when the New look is on; a till that opens offline uses the last copy kept on the device. A new device that has never been online shows a plain receipt.

## How it was checked

Jest: `brandModel`, `accents` (contrast), `brandApi`, `BrandSection`, `BrandProvider`, `receiptModel`, `Receipt`, sign-in with a device brand, top bar logo, till receipt (New look and old look). Browser (Chromium, mocked server answers, built app): Settings Brand at 1280 light, 375 and 1280 dark (no sideways scroll, saving Teal changes `--brand`); print emulation and `page.pdf` of the Sales receipt in all three styles (page 80mm, 58mm and A4 wide, nothing clipped, nothing else printed, thermal black, A4 teal) and of the till receipt (80mm and A4, the accent survives the till's old print rules); top bar logo; sign-in at 375.
Needs the real test store: a real printer on a 58mm and an 80mm roll (the length measure and the driver's own paper setting), a real logo upload through `upload_file`, and the real company address and PIN from `get_company`.

## For the lead

Add `'/settings/brand'` to `BUILT_PAGES` in `redirects/live.js` (it has no old address, so it only keeps the page lists consistent). Routes: one line for `/new-look/settings/brand` (and the path added to `OWN_ROUTES`) in `newLookRoutes.js`, and one row in `redirectTable.js`.
