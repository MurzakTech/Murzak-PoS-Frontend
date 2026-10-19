# P7-2 Units by industry (front end)

Back end contract: `docs/redesign/P7-2-contract.md` in the back end repo (branch `claude/p7-units-be`). New calls only: `get_industry_units`, `ensure_industry_units`, `set_units_industry`, `add_custom_unit` in `murzak_pos.api.units_api`.

## What a shop owner sees

- In New product and Edit product, the Unit choice lists the shop's industry units first (a pharmacy: pieces, tablets, capsules, strips, bottles, vials, sachets, tubes, boxes, millilitres), then the shop's own units, then the common ones, then the rest A to Z. A unit the site does not have yet is not offered.
- Owners and managers see "Add or change units" under the choice. The dialog "Your units" has "Kind of shop" (only changes which units come first; nothing is removed) and "Add your own unit" (name, word for many, "Can be sold in parts").
- Everywhere units are shown in words (till, Sales, Stock levels, Products), a custom unit reads in singular and plural ("1 jerrycan", "3 jerrycans"). Units of the curated lists have plain words too ("tablets", "tonnes", "carcasses").
- A cashier only reads; the server refuses writes from a cashier.

## Which kind of shop

The server picks, in order: the owner's choice in the dialog, the sign-up industry (Restaurant, Hotel, Grocery, Pharmacy, Salon, Automotive and Furniture map to restaurant, hotel, butchery or groceries, pharmacy, salon or services, hardware), the answer to "What do you sell?", else a general shop. Nine kinds: pharmacy, restaurant or bar, hotel or guest house, butchery or groceries, hardware, salon or services, wholesale, general shop, farm or agrovet.

## Files

- `src/api/unitsApi.js` (+ test): the four calls.
- `src/newlook/products/strings.units.js`: all words of the dialog, the nine kind names and the plain words of the new units.
- `src/newlook/products/unitWords.js`: now also holds the shop's own words (`setShopUnitWords`, kept on this device under `murzak_new_look:unit-words` with the shop name, so an offline till still says "jerrycans"), and `resolveUnit`.
- `src/newlook/products/customUnit.js`: the same checks as the server (2 to 30 characters, letters, numbers, spaces, hyphens, full stops, at least one letter, no repeat ignoring case).
- `useShopUnits.js`, `UnitPicker.jsx`, `UnitsDialog.jsx`, `UnitWordsLoader.jsx` (mounted once in `src/App.js`; it asks nothing while the New look is off).
- `productsModel.js`: `unitOptions(uoms, first)` and `firstUnits(shop)`.

## For the import (Helper A): resolveUnit(text, shopUnits)

Pure, in `src/newlook/products/unitWords.js`.

```
resolveUnit('Pieces', ['Nos', 'Kg'])   // { unit: 'Nos', known: true }
resolveUnit('', ['Nos'])               // { unit: '', known: true }   nothing given: use the default
resolveUnit('furlong', ['Nos'])        // { unit: '', known: false }  report it, never drop it silently
```

`shopUnits` is a list of stored names, or of `{ name, singular?, plural? }` (for example `data.units.filter(u => u.exists)` plus `data.custom`, from `getIndustryUnits`). The stored name, the singular and the plural (built-in, or the shop's own words) all give the stored name; case and extra spaces are ignored; a short form ("pcs", "kgs", "ltr") gives the unit with the same plain word; with two stored names for one word the first in the list wins. An unknown text is reported with `known: false`.

## Checks

Jest: unitsApi (9), unitWords (new: words, shop words, resolveUnit), customUnit, productsModel (order of the choice), UnitPicker (order, ensure once, cashier read only, offline fallback, New look off, dialog checks, add, refusal, kind of shop, Escape), UnitWordsLoader (4). Word scanner, colour ratchet and token tests pass.

## Only mocked

Everything runs against mocked answers. Needs the real test store: that the UOM list really holds the standard ERPNext units (so Piece, Metre and Litre are matched to Nos, Meter and Litre), that creating a UOM as a manager works there, and the picker with a real list.

## Decisions

- Butchery and groceries are one kind (the brief groups them).
- A custom unit is sold whole by default; "Can be sold in parts" sets the unit's whole number flag off when it is created. Existing units are never changed.
- Plain words come from the curated list in English only; stored unit names are not translated.
- The plural of a custom unit is kept per shop (Frappe DefaultValue), the unit itself is a UOM shared by the site.
