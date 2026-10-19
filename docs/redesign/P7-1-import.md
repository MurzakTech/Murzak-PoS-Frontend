# P7-1 Import products (New look)

The page `/new-look/products/import`, built on the Form page pattern, with two new server calls
(`preview_product_import`, `import_products`; see `docs/redesign/P7-1-contract.md` in the back end repository).
The current Bulk import screen (`/products/bulk-import`) and its calls are unchanged and still used while the New look is off.

## What the page does

1. Step 1: choose an Excel (.xlsx) or CSV file, or download the template (CSV, with two sample rows).
2. Step 2 (optional): choose a ZIP of photos. It is uploaded as a private file; only its address is sent.
3. The page checks the file in the browser (fast typing mistakes), then asks the server to read it against the shop. It then shows,
   before anything is saved: counts (new, to update, already up to date, left out), "3 new categories will be created: ..." (and new
   brands), the opening stock and the store it goes into, and for every row what was understood and what will happen.
4. The button says "Import N products" and does it. The result lists what happened to each row, the categories created, stock added and
   pictures added. Rows left out can be downloaded as a CSV with the reason, fixed and sent again.

## Columns

`item_code`, `item_name` (needed), then `category`, `unit`, `price`, `cost_price`, `opening_stock`, `store`, `low_stock_level`,
`description`, `brand`, `barcode`, `image`, `is_service`, `vat_class`. The earlier names still work (`item_group`, `stock_uom`,
`standard_rate`, `is_stock_item`). Other column headings are listed as "not used" and ignored. A plain-words guide to every column is on the
page ("Show the columns").

## Decisions

| Question | Choice |
| --- | --- |
| Existing product code | Updated, never added twice. Only filled cells change anything; a blank cell keeps what the product has. Shown per row ("Will be updated: price") |
| Same file twice | Every row reads "No changes"; nothing is written. A stock entry that failed is added on the next run |
| Unit, tax class, "is a service" of an existing product | Never changed (noted on the row) |
| Unknown category / brand | Created (category under All Item Groups), named before the person confirms, and again in the result |
| Unknown unit / store | The row is left out and says why (never dropped silently) |
| Opening stock | Through the existing opening stock call, only for a product with no stock history, and only with a cost price; otherwise the product is saved and the stock is left out with a note |
| Pictures | Added only to a product with none. A link must be http(s) to a public address; a ZIP name is matched ignoring case, spaces and folders. A bad picture is a note, never a failed product |
| Tax class | The existing `vat_class` of `create_product` (standard, zero rated, exempt) |

## Units in plain words

`importSheet.resolveUnitName(text, shopUnits)` turns "kilograms", "Kg", "kgs" or "piece" into the stored unit the shop has, using the
plain words of `strings.products.js` (units). A unit the shop does not have is sent as written and the server reports it. When
Helper B's `resolveUnit` lands in `unitWords.js`, `resolveUnitName` can call it (one line).

## Checks

Tests: `src/newlook/products/import/*.test.*` (sheet rules, model, page), `src/api/productImportApi.test.js`, the route test in
`src/newlook/products/routes.test.jsx`. The word scanner, colour ratchet and token tests pass. Shared files touched: `newLookRoutes.js`
(one import line, one route line, and `/products/import` added to OWN_ROUTES so it gets no placeholder), `labels/stringsFiles.test.js`
(allows `uom` in the import strings file only, where it is an alternative spelling of the Unit column heading).

## For the lead

Add `'/products/import'` to `BUILT_PAGES` in `src/newlook/redirects/live.js` when this goes live; the Products header Import button then
opens this page (until then it opens the current bulk import). `liveRedirects.test.js` and `engine.test.jsx` (line 91 lists
`/products/import` as not live) may need the matching change.

## Could only be mocked

The server calls (no store is reachable): the page tests use plain answers, the back end tests use an in-memory stand-in for the
database and a fake connection for picture links. Still to check on the real test store: a real Excel file with the template headings,
a real ZIP, a link on the public internet, a first import with stock, and the same file imported twice.
