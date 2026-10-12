# P0-5: The per-shop "New look" switch

Recorded 12 October 2026. Ticket P0-5 of the Murzak POS redesign. Decision taken by the owner: **Option A, the switch is a setting on each shop's server** (not on each device).

## What it does

- Each shop has one New look switch. It is **off by default**, and a shop that has never chosen is off.
- Only an **owner** can see and change it: **Settings, New look**. "Owner" here means a user with the **System Manager** role, or the Administrator. The back end already uses that meaning for staff and role changes (`access_control.require_manager`), and Open question 4 (do Owner, Manager and Cashier roles exist?) is still open, so this follows today's roles.
- Turning it **on** asks first ("Turn on the New look?"), because it changes what everyone in the shop sees. Turning it **off** is immediate. Either way the page says "Saved".
- **On:** the empty new shell loads at `/new-look` (a top bar, a menu column and a page area, with nothing in them yet). Every screen that has not been rebuilt stays exactly as it is.
- **Off:** nothing in the app changes. `/new-look` shows the usual "Page Not Found".
- Switching changes no sale, stock figure, report or accounting entry. It only chooses which screens are drawn.

## Where the setting is kept

On the shop's own server, in Frappe's existing `DefaultValue` table, under one key per company (`murzak_new_look:<company>`). That table exists on every site, so the change adds **no document type, no custom field and no migration**, and alters no existing record. Absent key means off.

The browser also keeps the last answer (`murzak_new_look:<company>` in local storage) so a till that starts without a connection shows the same look as last time. An answer from the server always replaces it. If the server cannot be asked and nothing is saved, the look is off.

## What was added

Front end (this repository):

| File | Purpose |
|---|---|
| `src/api/newLookApi.js` | `getNewLook`, `setNewLook` |
| `src/newlook/NewLookProvider.jsx` | Holds the switch for the app; saves the last answer on the device |
| `src/newlook/NewLookGate.jsx` | Lets a redesigned screen open only while the switch is on |
| `src/newlook/NewLookShell.jsx` | The empty new shell, and the placeholder page inside it |
| `src/newlook/newLookRoutes.js` | The list of redesigned screens built so far (only the placeholder for now) |
| `src/pages/Settings/NewLook.js` | The owner's switch page |
| `src/App.js`, `src/routes/AppRouter.js`, `src/routes/routes.js` | Wire the above in (one provider, one block of routes, one Settings entry) |
| `src/config/roleAccessConfig.js` | `/settings/new-look` is owners only |

Back end (a **separate repository**, not yet merged): `docs/redesign/backend-patches/0001-new-look-switch.patch` adds `murzak_pos/api/new_look_api.py` (two calls, `get_new_look` and `set_new_look`) and `murzak_pos/api/test_new_look_api.py` (17 tests). The two calls follow the back end's own rules: `set_new_look` checks for an owner before it touches anything, both calls refuse a company the caller does not belong to, and a shop can never read or change another shop's switch.

## Before a real shop can use it: install the back-end part

This session could not push to `Murzak-PoS-Backend` (push access was declined), so the back-end change is delivered as a patch. To apply it:

1. In a clone of `Murzak-PoS-Backend`: `git checkout -b new-look-switch` then `git am /path/to/0001-new-look-switch.patch`.
2. Run its tests on a bench: `bench --site <site> run-tests --module murzak_pos.api.test_new_look_api`, and the existing `murzak_pos.api.test_access_control` (it reads every API file to check guards, so it covers the new one too).
3. Review and merge. **Merging to the back end's main branch deploys it to the live server**, and each per-shop back end needs the new method installed before that shop's switch can be used (the plan's "before switching a shop on" step 2).

**Until the method exists on a shop's back end, that shop behaves exactly as today:** the app asks, gets no answer, and treats the shop as off. Nobody sees an error pop-up. The owner's page shows a warning "We could not check the setting just now".

## How it was checked (fake data and a stand-in server, never a real shop)

- Front end: all 49 test files pass (550 tests, 32 of them new); lint is clean on the touched folders; the production build compiles.
- Browser (Chromium against the production build, stubbed server, fake shop "Demo Shop"), **in the light and the dark theme**, 17 checks each, all passing: the current dashboard loads with the switch off; `/new-look` is "Page Not Found" when off; the owner finds Settings, New look; turning on asks first and sends `enabled: true`; the empty shell loads and survives a reload; "Back to the current screens" returns to the unchanged dashboard; turning off sends `enabled: false` with no confirmation and `/new-look` is "Page Not Found" again; a cashier is sent to the dashboard from both addresses and makes no change request; with the server unreachable, a saved "on" keeps the shell and nothing saved means off; no uncaught page errors.
- Back end: 17 tests pass against a **minimal stand-in for Frappe, not a real bench**. They must be run on a bench (step 2 above) before merging.

**Not yet checked:** a real shop (no test store login has been given), and the real back end.

## Rules kept

- Off by default for every shop. No existing back-end record, report, setting or accounting entry is altered; the one new setting is a new key in an existing table.
- No new colour, size or component was invented. The empty shell uses only the current theme; the real shell and tokens are P1-6 and P1-1.
- Nothing outside the ticket was touched. One visible difference with the switch off: the owner (and only the owner) sees a new "New look" item in the Settings menu, which the ticket requires.

## Things to know

- A change reaches each device the next time it signs in or reloads, not instantly. If the owner turns it off while a cashier has items in the cart, the cart is not touched until that device reloads.
- For now the empty shell opens for owners only. Access for the other roles comes with the Roles ticket (P1-8) and each screen's own access rule.
- There is no history of who changed the switch or when (the `DefaultValue` table keeps none). If the owner wants that, it needs an audit entry, which is a small addition to the back-end patch.
