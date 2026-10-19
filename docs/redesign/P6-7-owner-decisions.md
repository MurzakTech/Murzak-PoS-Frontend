# Phase 6 owner decisions, applied

The owner answered the open decisions of the Phase 6 report on 19 October 2026. This note records each answer, what was built, and how
it was checked. Everything here was checked on the built app with pretend server answers; nothing was seen on a real store.

| # | Decision | What was done |
|---|---|---|
| 1 | The New look is the default for all stores | Back end: a business with no saved choice now answers "on" (an owner who switched it off stays off). Front end: the sign-in page on a device never used before is the new one. See section 1. |
| 2 | Header buttons: move the extras | Products, Suppliers and Purchases now show the main button and a More menu. See section 2. |
| 3 | Printed receipt number: which works best, implement | The receipt leads with the short number (#0045) and keeps the full system reference under it. See section 3. |
| 4 | Login emails: remove under the name | Settings, Team no longer prints the email under each name. |
| 5 | Link cards: buttons on Products, hidden for one-store shops | Update many prices, Stores, Stock transfers and Move stock between stores are in the Products More menu; the last three show only with a second store. See section 4. |
| 6 | Pay button wording | The New look till says Pay (and "Pay KES 1,250"), where the earlier till says Charge. |

## 1. The New look is the default for every store

What changed:

- Back end (`new_look_api`, draft pull request on the back end repository): `get_new_look` answers on when the business has no saved
  choice. A saved off stays off; a saved on stays on. Empty counts as no choice. `set_new_look` is unchanged (owners only).
- Front end: the sign-in page reads a device flag. A device with no flag (never signed in) now shows the new sign-in; only a flag of
  off, saved when an owner switched the New look off, keeps the earlier page. Both pages call the same sign-in code.
- Settings, New look says it is on by default and how to turn it off.
- Unchanged on purpose: if the server cannot be asked and nothing is saved (a store whose back end has not been updated yet), the
  look is off. That store keeps working as before instead of showing screens whose server methods are missing.

What this means for the rollout plan (`P6-6-rollout-and-rollback.md`): the staged pilot (stages 2 and 3) is skipped by this decision.
The pre-switch checklist still matters, because the switch now happens for every store when the back end change is deployed:

1. Every store's back end must have the current server methods before the back end change reaches it. If the Linda Mwananchi store has
   its own back end, install and update it first; its screens will then work. Until then it stays on the earlier screens (see above).
2. Run `scripts/new-look-readiness.js` against each store if it has its own back end.
3. A store that wants the earlier screens: Settings, New look, off. Carts and held sales stay on the device, so ask cashiers to finish
   or clear held sales first.
4. The rollback is unchanged: turn New look off per store, or redeploy the previous front end build.

Checked: back end unit tests (2,595 pass, including new cases for no key, empty key, and every spelling of off), lint, front end
tests for the sign-in choice and the provider.

## 2. Header buttons

A page header holds two controls at most: the main button, and a More menu for the rest. A menu holding a single item is drawn as a
plain button instead.

| Page | Main button | In More |
|---|---|---|
| Products | New product | Export, Import, Update many prices, and with a second store Stores, Stock transfers, Move stock between stores |
| Suppliers | Add supplier | Export CSV, Supplier groups |
| Purchases | New purchase | Receive goods, Export, Goods received notes, All supplier bills, Record goods with no order (earlier screen) |

A cashier on Products sees only Export (one item, so a plain button). The More button is 44px tall on a phone like every header
control. Shared piece: `src/newlook/shell/HeaderActions.jsx`.

## 3. The printed receipt number

Options considered: keep the system number (ACC-PSINV-2026-00045); show only #0045; show both.

Chosen: **both, short first.** The receipt after a sale shows "Receipt no. #0045" and, below it, "Reference ACC-PSINV-2026-00045".

Why this works best:

- Customers and cashiers can say, write and search for 45 (the Sales list and its search already use #0045).
- The short number repeats every year (#0045 exists in 2026 and 2027) and a Sales Invoice has its own letter (#S0045), so it is
  not unique on its own. The full reference never repeats, and is what the books, the tax receipt (eTIMS) and any audit use.
- Nothing is lost: the full reference is still printed.

An offline sale not yet uploaded has only a temporary name, so it shows that name as before. The earlier till (New look off) is
unchanged. Rule in `src/newlook/till/receiptNumber.js`; it mirrors the server's own short receipt number.

Needs a check on a real printer, and with the shop's tax adviser if the shop is registered for eTIMS: the official tax receipt is
printed by the server and is not changed by this.

## 4. Link cards become buttons on Products

- Update many prices, Stores, Stock transfers and Move stock between stores are in the Products More menu (managers and owners only).
- Stores and the two transfer screens are hidden for a shop with one selling location. "One selling location" uses the same rule as the
  till's store menu: real selling locations only, so the folders and stock-in-production places a new business comes with do not make a
  shop look like it has two.
- The Settings, Advanced cards for Stock transfers, Move stock between stores and Update many prices are removed (they moved). The Stores card moved to Settings, Business.
- **Stores has another home: a card in Settings, Business** (owner decision, 19 October), shown to every shop, because that is how a
  one-store shop adds its second store. It is no longer a card in Settings, Advanced.
- The nothing-lost checks (AC-40) were updated to count the Products More menu as a home.

## 5. Where this is not checked

- Real stores: none was reachable. Every check used pretend server answers.
- A store whose back end has not had the new server methods installed will keep the earlier screens until it is updated.
