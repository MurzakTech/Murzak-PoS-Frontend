# P4-6: Suppliers page, Owed filter and supplier panel

Ticket P4-6: "Suppliers page with the Owed filter and detail panel. Done when the supplier half of AC-28 passes." Module by module: "List page, form. One list with an Owed filter and a detail panel showing what the shop owes and the next bill due."

## What was built

Front end, in `src/newlook/suppliers/` (words in `strings.suppliers.js`, API client in `src/api/suppliersListApi.js`):

| Page or part | Address | Notes |
|---|---|---|
| `SuppliersPage` | `/new-look/suppliers` | List page pattern like Sales: one list (no tabs), summary row (Suppliers, Owed to suppliers, Bills due soon), an All suppliers or Owed choice (Segmented, always visible, also on a phone), search, optional Supplier group and Status choices, table (Supplier, Owed, Next bill due, Status), "Showing x of y", rows per page never blank, Export CSV, empty states with one action, cards below 768px. Everything lives in the address (`?owed=1&q=&group=&status=&page=&size=&open=`). |
| `SupplierPanel` | beside the list, `?open=<supplier>` | Facts (type, tax ID, group, country, currency, internal), what the shop owes, the next bill due (amount and date, icon plus word when late or due within 3 days), the unpaid bills (each links to `/new-look/purchases?supplier=<id>&open=<invoice>`), a link to all bills of the supplier. Actions: Pay bill (opens the next bill in Purchases), Edit, Disable or Enable (asks first). |
| `NewSupplierPage`, `EditSupplierPage` (`SupplierForm`) | `/new-look/suppliers/new`, `/new-look/suppliers/:id/edit` | Shared Form page. Essential: Supplier name (required), Type, Tax ID or PIN. Under More options: Supplier group, Country, Default currency, Internal supplier. Edit adds Enabled as a Checkbox (the shared Switch says "Saved at once", which would contradict "Not saved yet"). |
| `SupplierGroupsLink` | header overflow (three dots), item "Supplier groups" | Opens the CURRENT screen `/suppliers/groups`. Will move to Settings, Advanced in Phase 5; only `GROUPS_PATH` in `suppliersModel.js` changes then. |

Back end (branch `claude/suppliers-list-api`, contract `docs/redesign/P4-6-contract.md` in the back end repository): `list_suppliers_overview` and `get_supplier_overview` in `murzak_pos/api/suppliers_list_api.py`, rules in `suppliers_list_calc.py`. One function (`figures_by_supplier`) works out what the shop owes for the list, the Owed filter, the summary, the panel, and it uses Home's rule for "due soon".

Routes: three lines added to `src/newlook/newLookRoutes.js` and `/suppliers`, `/suppliers/new` added to `OWN_ROUTES`. `BUILT_PAGES` (redirects/live.js) is not touched; the old address `/suppliers/:id` already maps to `/suppliers?open=:id`, which this page reads.

## How the Done-when was checked (AC-28, supplier half; AC-25; AC-26)

- Owed filter lists the same people as the balances: the page test "the owed amounts shown add up to the Owed to suppliers figure in the summary" adds the owed cells of the Owed list and compares with the summary figure; the back end tests check that `total` with `owed=true` equals `summary.suppliers_owed`, that the sum of `owed` over all pages equals `summary.owed_total`, that the panel's owed and next bill equal the list row's, and that the bills counted as due soon are exactly the bills Home's `supplier_bill_items` lists.
- AC-25: filters in the address, 20 rows, rows-per-page box never blank (bad `size` reads 20), correct "Showing x of y", Export in the header, empty state with one action.
- AC-26: name required, errors beside the field and in the summary, "Not saved yet", leave question when dirty, sticky footer from the shared Form page.
- A cashier: no Owed choice, no Owed or Next bill due column, summary has only Suppliers, no panel money, no Pay bill, Export without money columns; the server leaves the fields out (not null) and refuses `owed=true`.

## Decisions and departures

- **Phone and email are not on the page.** The brief says "if the current API stores them"; `create_supplier` and `update_supplier` take neither (ERPNext keeps them in Contact and Address records), so the list column "Phone or email" and the form fields are left out. They need a server change to add later.
- **Type and Internal supplier cannot be changed after saving.** `update_supplier` ignores them (the current Edit dialog sends them and nothing happens). The new Edit form shows them disabled with a sentence saying why, instead of pretending to save them. Supplier group cannot be cleared on Edit for the same reason (an empty group is ignored by the server).
- **Owed filter is a Segmented control above the filter row**, not a dropdown, so it stays in reach on a phone while the other filters sit behind the Filters button. The two dropdowns of the filter row are Supplier group (only when the shop has more than one group) and Status (Active, Disabled, All; not offered while Owed is on, because everyone who is owed is listed, disabled or not).
- **The old list columns Type, Supplier group, Tax ID, Country, Currency** are in the panel and the CSV, not in the table, to keep the table to the four columns the Spec asks for.
- **Header actions:** Export CSV and Add supplier are the two buttons; the three-dots overflow with Supplier groups is a third control wrapped in the same fragment (the header counts two children and the overflow is the one the brief asks for).
- Bills due soon and next bill due use Home's rule: unpaid, submitted, not a return, due within 3 days or already late.
- A bill with no due date counts in "Owed" but is never the "next bill due".

## Old action, where it is now (supplier rows of section 4 of P0-2-screen-audit.md)

| Old action | Where today | Where it is now |
|---|---|---|
| Add a supplier | Suppliers, Add Supplier dialog | Suppliers header, Add supplier (`/new-look/suppliers/new`), also the empty-state action |
| Edit a supplier | Suppliers row menu, Edit | Supplier panel, Edit (`/new-look/suppliers/:id/edit`) |
| Disable a supplier | Edit dialog switch | Supplier panel, Disable (asks first); also the Enabled checkbox on the Edit form |
| Enable a supplier again | Edit dialog switch | Supplier panel, Enable; also the Enabled checkbox; disabled suppliers are listed with the Status choice |
| Supplier detail (type, internal, tax ID, country, currency) | `/suppliers/:id` | Supplier panel (old address opens `/new-look/suppliers?open=<id>`) |
| View the outstanding amount of a supplier | Server only (`get_supplier_details`), not shown | Owed column, summary row, Owed filter, panel |
| Filter by supplier group | Filter bar | Supplier group choice in the filter row (shown when the shop has more than one group) |
| Search suppliers | Filter bar | Search box (name, supplier number, tax ID) |
| Page size | Table footer | Rows per page, 20 by default |
| Supplier groups: list, create, edit | `/suppliers/groups` | Header overflow, "Supplier groups", opens the current screen `/suppliers/groups`. **Will move to Settings, Advanced in Phase 5** (the redirect table already maps it to `/settings/advanced?section=supplier-groups`) |
| Pay a supplier invoice | Purchase invoice details (Purchases) | Supplier panel, Pay bill, and each bill in the panel, both open the bill in the Purchases page (`/new-look/purchases?supplier=<id>&open=<invoice>`), built by the Purchases ticket |

## For the lead

- Needs browser check: the Owed Segmented control above the filter row (spacing, phone width), the three-dots overflow next to the two header buttons (44px target below 768px), the panel with a long list of bills, the status labels (alert and clock icons) in the table and on cards, light and dark themes.
- The Purchases page must read `?supplier=<id>` and `?open=<invoice>` for the links to land well; until it exists they open the placeholder for Purchases.
- Back end assumptions not verified without a database are listed in the back end contract (Purchase Invoice columns `bill_no`, `due_date`, `outstanding_amount`, `is_return`; Supplier fields).
