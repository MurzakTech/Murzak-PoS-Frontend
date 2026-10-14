# P4-1 and P4-2: Products, New product, Categories and plain-word units

## What was built

Front end, all under `src/newlook/products/` (words in `strings.products.js`):

- `ProductsPage` at `/new-look/products` (and `/new-look/products/categories` for the Categories tab). List page pattern as the Sales
  page: tabs All products and Categories; summary row (Products, Low on stock, Out of stock, the whole shop, from the server);
  search and Category and Show dropdowns, all in the address; table Product (name, code beneath), Category, Price, Stock, Status;
  "Showing x of y" taken from the server's exact count; rows per page that is 20 unless the address names 10, 50 or 100; cards below
  768px; product panel (price, stock, unit in words, barcode, category, low-stock warning; cost price and profit per item for owners and
  managers only; Add stock and Edit). Header: Export, Import, New product. Empty state with one action (Add product).
- `NewProductPage` at `/new-look/products/new`, on the shared `FormPage`. Name and Price (KES) are the only required fields. Under More
  options: Cost price (owner and manager only) with the live "Profit per item" line, Opening stock, Low-stock warning, Unit, Category chips
  (with "New category"), Barcode, Product code ("Filled in automatically"). Save and add another keeps category and unit.
- `CategoriesTab` and `CategoryDialog`: categories with product counts, add, rename and move, delete (with a question).
- `unitWords.js`: `unitWords('Nos')` gives `pieces`, `unitWord` gives `piece`, `unitLabel` gives `Pieces`, `quantityText(12, 'Nos')` gives
  `12 pieces`. A unit without a plain word is shown as stored. The map is in `strings.products.js`; `renameMap.js` is not edited.
- `src/api/productsListApi.js` (+ test): `listProducts`, `listCategories`, `createProduct` (throws `ProductSaveError` with `fields`),
  `listUnits`, `addCategory`, `renameCategory`, `deleteCategory`.
- Routes: one wildcard route `/new-look/products/*` and `/new-look/products/new` in `newLookRoutes.js`, and the three addresses added to
  `OWN_ROUTES`. `BUILT_PAGES` is not touched.

Back end (branch `claude/products-list-api`, contract `docs/redesign/P4-1-contract.md` in that repository): `list_products`,
`list_categories`, `create_product_simple`.

## How Done-when was checked

- AC-26 for this form: tests for only name and price required, both errors beside the fields and in the summary, "Not saved yet" then
  "Saved", the leave question (link, Cancel), server refusals beside the right field (the section under More options opens and the field
  gets focus) or in the summary only.
- AC-27 Products count: the page shows the server's `total`, which the back end makes from the same query parts as the rows. The back
  end test counts 720 filter combinations and reads every page on SQLite; the page tests check the count after a search, a page past
  the end and a bad `size`.
- P4-2: Categories tab tests; the label scan finds no "Item Group"; unit tests for the plain words.
- Needs browser check: layout of the three header buttons at 1024px, the chips on a phone, the product panel on a phone.

## Decisions and open points

1. Header has three actions (Export, Import, New product) as the brief asks. `PageHeader` allows two, so they are passed as one wrapper
   element. The lead may prefer a different split.
2. Edit has no redesigned screen yet. The panel's Edit goes to the current Products screen (`/products`). When `/products` is made live
   that address redirects to the new list, so an Edit product screen (the form in edit mode, using `update_product`) is needed first.
   Brand, description, photo and "prescription only" are not on the one-screen form either (they are on the current Edit).
3. Stock is the total over all stores; the panel says "In stock, all stores". Low and Out never overlap (0 left is Out).
4. Only products for sale are listed (`is_sales_item`), including services, which show a dash and "Not counted".
5. Opening stock without a cost price may be refused by ERPNext (valuation rate). The product is still saved and a message says to use
   Stock in.
6. Categories are shared by the whole site in ERPNext, so renaming one affects every business (as on the current screen).
7. Import goes to `/products/bulk-import` until `/products/import` is live. Add stock goes to `/inventory/material-receipt` until
   `/stock` is live, then to `/stock?action=in&item=CODE`.

## Old action, where it is now (Products rows of section 4 of the audit, and the Products screens of section 3.11)

| Old action | Where it is now |
|---|---|
| Product list with search and filters (item group, brand, price list) | Products page: search, Category and Show. Brand and price list filters are not on the new list. |
| Add a product | New product button, and the one-screen form |
| Create a product with a code, group, unit, price, barcode, description, brand, photo | Form: name, price, category, unit, barcode; code is automatic. Description, brand, photo: current Edit screen only |
| View a product | Product panel |
| Edit a product (name, group, unit, price, description, brand, flags, prescription only) | Panel Edit, to the current screen for now (decision 2) |
| Add or remove a barcode | Barcode at creation on the form; later changes on the current Edit screen |
| Set a price in a price list; bulk price update (`/products/update-price`) | Current screens; redirect table sends `/products/update-price` to the list |
| Disable or enable a product | Show filter "Disabled products" lists them; the switch itself is on the current Edit screen |
| Create a discount rule for an item (Stock List row menu) | Not placed by the Spec; unchanged on the current Stock screen |
| Edit price, SKU, unit, expiry, batch per item and store (Inventory Details) | Not placed by the Spec; current Inventory Details screen |
| Load Products / industry starter products | Import button (current screen `/products/bulk-import`; Load Products and the industry catalogue keep their current addresses) |
| Bulk import, bulk stock import | Import button, then the current screens |
| Categories: list, create, rename, change parent, delete | Categories tab (parent shown as "Part of") |
| Brands, Units, Warranties, Price groups | Settings, Advanced (per the redirect table); current screens until then |
| Product variations | Current screen; the redirect table sends it to the list |
| Add stock for a product | Panel button Add stock |
| Export the list | Export button (CSV of the rows listed) |
