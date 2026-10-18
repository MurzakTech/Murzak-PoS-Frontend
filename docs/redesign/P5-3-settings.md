# P5-3: Settings page with five sections; Team replaces Staff

New pages under `/new-look/settings`. The current Settings, Staff and Roles screens are not changed and work as before while the New look is off. The redirect rows for `/settings/*`, `/staff` and `/roles` are unchanged and are not live (`live.js` was not touched).

## What was built

| Piece | Where |
|---|---|
| Settings page: side list of five sections (a row of tabs below 768px), each section a real address | `src/newlook/settings/SettingsShell.jsx`, `SettingsPage.jsx`, `settingsModel.js` |
| Routes: `/new-look/settings` (opens Business), `/business`, `/till` (existing page, extended), `/tax`, `/team`, `/advanced` | `src/newlook/newLookRoutes.js` (one import, five route lines, four paths in `OWN_ROUTES`) |
| Card that saves on its own: Save, "Not saved yet", "Saved", error in words, leave question | `SettingsCard.jsx` (uses `forms/useLeaveGuard`) |
| Business: three cards (Business details, Address and contact, Contact person) and a link to Bank accounts | `BusinessSection.jsx`, `CompanyCard.jsx`, `businessModel.js`, `src/api/businessApi.js` |
| Till and payments: payment switches (P3-1, moved to `PaymentMethodsCard.jsx`), Till options, This device, links | `TillSection.jsx`, `TillOptionsCard.jsx`, `DeviceCard.jsx`, `autoPrint.js`, `src/api/tillOptionsApi.js` |
| Tax: eTIMS on/off line (no secrets) and a link | `TaxSection.jsx`, `src/api/taxApi.js` |
| Team and security: People, Roles link, Security, Audit trail | `TeamSection.jsx`, `TeamPeople.jsx`, `PersonDialog.jsx`, `SecurityCard.jsx`, `AuditCard.jsx`, `teamModel.js`, `src/api/teamApi.js` |
| Advanced: eleven cards with one plain sentence each | `AdvancedSection.jsx`, `LinkList.jsx` |
| Words | `strings.settings.js` |

`TillSettingsPage` keeps its props (`load`, `save`) and its seven original tests (one test now looks only at the payment switches, since the page also holds a device switch anyone may change).

## Decisions

- **Same calls, same shape.** Business uses `onboarding_api.get_company` and `update_company`; Till options use `get_pos_profile` and `update_pos_profile`; Tax uses `get_etims_settings`; Team uses the `staff_api` calls of `src/pages/Staff/index.js` (create, update by PUT, assign and remove roles, disable, enable); Audit trail uses `auditApi.listAuditEvents`; Security uses `getTwoFactorStatus`. The request bodies match the current screens. After a Till option saves, the signed-in person's profile is read again (`fetchCurrentUser`), as the current screen does.
- **Business name, short name, country and currency are read only.** The current screen lets them be typed, but on the server `update_company` takes `company_name` as the key of the business and has no `abbr`, `country` or `default_currency` parameter, so a change either fails or does nothing. They are sent back unchanged. (Unverified against the deployed server; if it accepts them, make the fields editable in `BusinessSection.jsx`.) The address email is sent as both `email_id` (what the current screen sends) and `email` (what the server reads).
- **Business edits are owner only** (the current Settings pages are owner only). Others read.
- **Till options are switches that save at once** (like the payment switches), not a form with Save. The profile name and the POS invoice type stay on the current screen (link), because the invoice type changes what records a sale makes.
- **Auto-print** is per device: it uses `localStorage` key `pos_auto_print`, read and written exactly as `NewSale.js` does; the till follows it after a reload.
- **Team.** One new back end call lists people with their kind (see back end below). Roles are only added or removed, never replaced: Cashier gives `Sales User`; Manager gives the five manager roles; Owner gives `System Manager`; moving down takes the higher roles away. The new roles are given first, and nothing is taken away if giving is refused. The server's rule "you cannot give roles you do not hold" still applies, so an owner who lacks e.g. `Item Manager` will see that refusal in the dialog. Till access is shown (not edited) from the same table the app uses to show the till (`canAccessRoute('/sales/pos')`). The only active owner and the signed-in person cannot be moved down or deactivated. Deactivating asks first.
- **New person's first password.** The existing `create_staff_user` needs one. It is typed in a hidden field, sent once and not kept. Nothing else secret is typed anywhere in the new code.
- **Auditors** count as the Cashier kind on the server. For that kind the Audit trail card is a link to the current screen, where the server decides; owners and managers get the list here.
- **Open question 1**: Staff is reached only through Settings, Team. **Open question 20**: Account provisioning keeps its name, with the line "Picks the account that holds the cost of goods received before their supplier bill arrives." (read from `AccountProvisioning.js` and the back end: it picks the provisional account used when goods are received before the bill). **Open question 22**: Station screen is a card in Advanced (as well as the till menu); Industry products is a card in Advanced (needs the shop type, otherwise it says so); Discounts and Bank accounts link from Till and payments (Bank accounts also from Business); Roles and Audit trail are in Team and security.
- **Redirect section names** match: `brands`, `units`, `warranties`, `price-groups`, `supplier-groups`, `account-provisioning`, `inventory-discounts`, `loyalty-programs` are all Advanced cards (a test reads the table). Discounts and loyalty also appear as links under Till and payments, as the ticket asked, so they show twice by design. The table sends `/settings/bank-accounts` and `/settings/payment-gateways` to `/settings/till`; those links are on that section. `?open=<role>` (Roles rows) outlines the Roles card.
- Links to current screens use `oldScreen()` (`legacy=1`), except the New look switch (`/settings/new-look`, not redirected).
- No keys, secrets, bank details or eTIMS values are shown, typed or stored by the new code; the eTIMS client keeps only three yes/no facts (found, on, test), and a test checks nothing secret survives.

## Back end

One new read-only call, `murzak_pos.api.team_api.list_team` (branch `claude/settings-team-api`, pushed, not merged; commit 9bb22a3). Owner or manager may read; a cashier is refused before anything is read; team changes stay owner only through the existing `require_manager()` staff calls. Pure functions in `team_calc.py` (a test checks the kind agrees with `role_tiers.get_tier`), no-database tests, one Swahili row, contract `docs/redesign/P5-3-contract.md`. No `EXPECTED_GUARDS` entry (it opens no record by number). The runner passes (952 tests), ruff format and check pass, and `check_changed_files.py` passes.

## Old action, where it is now

| Old page | Old action | Where it is now |
|---|---|---|
| POS Profile | Switches: update stock, allow discount changes, allow rate changes, allow partial payment | Settings, Till and payments, Till options (switches, same calls) |
| POS Profile | Profile name; POS invoice type | Link "Open till settings" (current screen) |
| Payment Methods | See methods; create or enable On credit | Switches in Till and payments (P3-1); On credit set-up link to the current screen |
| Payment Gateways | M-Pesa, Pesapal, PayPal set-up, test, turn off | Link on Till and payments (keys stay on the current screen) |
| Inventory Discounts | List, create, edit, delete rules | Links on Till and payments and Advanced |
| Loyalty Programs | List, create, edit programmes | Links on Till and payments and Advanced |
| Business | Company details, address, contact | Business, three cards (name, short name, country, currency read only; see decisions) |
| Bank Accounts | Cash or bank accounts, banks | Links on Business and Till and payments |
| eTIMS | KRA PIN, branch, device serial, test mode, active | Tax shows on, off, test or not set up; changing it is a link to the current screen |
| Security | Two-step sign-in on and off; protection and sign-out info | Team and security, Security: status line and the same two facts; on and off is a link (needs a code) |
| Audit Trail | List, filters, Export CSV | Team and security, Audit trail: list for a date range, Show more, Export CSV (the person, area and action filters and the search box are not rebuilt; the current screen stays linked for auditors) |
| Account Provisioning | Choose the provisional account | Advanced card with a one-line description, opens the current screen |
| Staff | List, Active and Inactive tabs | People list (active and deactivated shown together, with a status) |
| Staff | Create a person | Add a person (name, email, mobile, first password, role) |
| Staff | Edit name, phone | Change details or role |
| Staff | Assign or remove roles | Role choice (Owner, Manager, Cashier); other roles one by one through a link to the current Staff screen |
| Staff | Disable, enable | Deactivate (asks first) and Reactivate |
| Staff | View details dialog | The row shows name, email, role, till access and status |
| Roles | List, create, edit, permissions | Link "Open roles and permissions" (current screen) |
| New look (not one of the 11) | The shop's switch | Advanced card |
| Industry products, Brands, Units, Warranties, Price groups, Supplier groups, Station screen | Moved here by the redirect table | Advanced cards, each opens its current screen |

`RoleManagement.js` is dead code (no route) and is not covered.

## How AC-32 was checked

AC-32: "There are five sections. Payment method switches change the till's choices after a till reload. Team shows people, role and till access. Each card saves on its own and says Saved."

- Five sections: `SettingsPage.test.jsx` (side list of five, open one marked, bare address opens Business, refresh keeps the section, `?section=` kept).
- Payment switches: the P3-1 tests still pass inside the new page (M-Pesa off saves, says Saved, refusal beside the switch); the till reads the saved list on reload (checked in P3, not re-checked in a browser here).
- Team: `TeamPeople.test.jsx` (25 tests: role, till access, status; add, change, deactivate, reactivate; owner and manager rules; errors beside fields).
- Each card saves on its own and says Saved: Business (`BusinessSection.test.jsx`, including that one card does not send another card's unsaved text), Till options and This device (`TillOptions.test.jsx`), Team changes (notice "Saved"). Leave question: Business cards and moving between sections.
- Tests: 163 tests in the 15 suites of `src/newlook/settings` and the four new `src/api` clients (27 of them); `src/newlook` and `src/api` together 3,067 pass; the 3 failures are the word scan on other helpers' pages (`expenses/`, `reports/ReportPage.jsx`), none in Settings. Lint (`--ext .js,.jsx`) is clean on my files. Word scanner, colour budget and tokens pass for my files.

## Needs browser check

- `/new-look/settings` at 1280 and 1024: side list beside the cards; at 390: the list is a row of tabs that scrolls sideways, no sideways page scroll, 44px tap targets.
- Business with real data: the shape `get_company` really returns (read in three tolerant ways), and that a Save of the address and contact works against the deployed server.
- Team with a real owner: Add, then change a person Cashier to Manager and back (the "cannot give roles you do not hold" refusal if the owner lacks a manager role).
- Till options: switch one, reload the till, confirm the till follows; auto-print off then reload the till.
- Dark theme of all five sections; the Team table below 768px (role, till and status move under the name).
- Redirects: with the preview switch on, `/staff`, `/roles`, `/settings/security` open Team; a link such as Brands opens the old screen once and does not bounce back.
