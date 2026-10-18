# P5-4: first-time set-up wizard (acceptance check AC-33)

Back end contract: `docs/redesign/P5-4-contract.md` in the back end worktree `/home/user/be-setup` (branch `claude/setup-api`).

## What was built

| Piece | Where |
|---|---|
| The wizard, six steps on the Form page pattern, at `/new-look/setup` | `src/newlook/setup/SetupWizard.jsx`, `StepFrame.jsx`, `BusinessStep.jsx`, `ShopStep.jsx`, `CashStep.jsx`, `PaymentsStep.jsx`, `ProductsStep.jsx`, `StaffStep.jsx` |
| The one small component for "when it appears": a banner on Home | `src/newlook/setup/SetupBanner.jsx`, mounted once in `home/HomePage.jsx` |
| Decisions (steps, resume, "Not now" for 7 days, tax ID check, links) | `setupModel.js` |
| What the shop turned on, read by other screens | `useBusinessFeatures.js` |
| The usual opening cash for the Open till dialog | `useUsualOpening.js`, called once from `pages/Sales/NewSale.js` |
| Server calls | `src/api/setupApi.js` (+ test) |
| Words and styles | `strings.setup.js`, `setup.css` |
| Route | `/new-look/setup` in `newLookRoutes.js` (and `/setup` in `OWN_ROUTES`) |

## The steps

1. **What do you sell?** Pharmacy, Retail, Services, Other. Asked once: a shop that answered opens at the next step. A kind chosen at sign-up is offered as the starting choice.
2. **Shop name and tax ID.** Through the company calls the current Business settings use (`get_company`, `update_company`, sending only the tax ID).
3. **Usual opening cash.** Kept per business; the Open till dialog fills it in (see below).
4. **Payment methods.** The `PaymentMethodsCard` of Settings, Till and payments, unchanged (same calls, same words).
5. **First products.** New product, the current starter products screen, add from a file, add opening stock.
6. **Your team.** Settings, Team when live, otherwise the current Staff screen. Its button reads Finish.

Every step can be skipped ("Skip this step"); "Skip for now" and "Finish" both mark set-up done. Passing or skipping a step is saved on the server, so a refresh opens at the first step not passed (`?step=` in the address also works). The list of steps shows each as Done, Skipped or the current one, in words. Only the owner can use it (others see a short notice).

## When it appears (one-time rule)

The server decides (`get_setup_state.offer`): no business kind recorded (by the wizard or chosen at sign-up), no submitted sale, fewer than 5 products, set-up not finished; or the wizard was started and not finished while the shop is still that new. A count that cannot be read counts as "has data". Home shows a banner with "Set up now" (or "Carry on") and "Not now"; "Not now" is remembered on this device for 7 days. It is a banner, not a redirect, because it is the least intrusive way to meet AC-33 and never blocks a shop that wants to sell. With the New look off the component asks nothing and draws nothing; a person who is not the owner never sees it.

## What each answer turns on

| Kind | Features (all only ADD) | Where they show now |
|---|---|---|
| Pharmacy | `expiry`, `prescription_only` | Stock levels shows the Expiry tab (added to the existing test, which still shows it for a shop whose own batches have expiry dates) |
| Retail | `barcodes_first`, `units_first` | New product shows Barcode and Unit above More options |
| Services | `services_first` | Flag stored and readable; see "Not done" |
| Other | nothing | |

## Leftover warehouses

One rule everywhere: `till/sellingLocations.js`. Audit of the New look pages that list stores:

| Page | Before | Now |
|---|---|---|
| Till (old file, New look on), Stock levels tabs and filters | already used the rule | unchanged |
| Home, Store filter | listed every warehouse, so a one-shop business showed a Store filter with the leftovers | uses `sellingLocations` |
| Sales, Store filter | same | uses `sellingLocations` |
| New purchase, Receive into | same | uses `sellingLocations` |
| Receive goods, store | same | uses `sellingLocations` |
| Stock levels, Locations and Transfers tabs | placeholders linking to the current screens, shown only with a second real location | unchanged |
| Edit product | uses a default store only, no list | unchanged |

## Old action, where it is now

| Old action | Where it is now |
|---|---|
| Register: first name, last name, email, phone, password | Sign-up stays outside the app (the per-shop build shows a link to the Murzak portal); `/register` is kept as it is |
| Register: Business industry | Step 1 "What do you sell?" (the sign-up industry is offered as the starting choice and picks the starter products) |
| Register: company name | Step 2 shows it (it cannot be renamed: the company call uses the name to find the business) |
| Register: abbreviation, country, currency | Set at sign-up; shown, not changed, in Settings, Business |
| Register: tax ID | Step 2 |
| Register: street address, city | Link in step 2 to Settings, Business |
| Register: POS profile name and its four switches | Link in step 6 to Settings, Till (current screen until Settings is live) |
| Register: eTIMS block | Link in step 6 to Tax and eTIMS |
| Onboarding: company information | Step 2 and Settings, Business |
| Onboarding: POS profile | Step 4 (payment methods) and the Till link in step 6 |
| Onboarding: eTIMS (optional) | Tax and eTIMS link in step 6 |
| Home WelcomeSetup: load starter products | Step 5 "See starter products" (current screen, `oldScreen`) |
| Home WelcomeSetup: add a product yourself | Step 5 "Add a product" (New product) |
| Home WelcomeSetup: import a spreadsheet | Step 5 "Add from a file" (current screen) |
| GettingStarted: add products / opening stock | Step 5 |
| GettingStarted: payment methods and tax | Step 4 and the Tax and eTIMS link |
| GettingStarted: invite your team | Step 6 |
| GettingStarted: first sale | Home's first-time panel (already in the New look) |
| GettingStarted: collapse or hide the checklist | "Not now" (7 days) and "Skip for now" |
| Industry products: tick, edit, download, upload, delete, save | Step 5 link to the current screen, `oldScreen('/industry/<code>/products')` |

## Decisions and departures

- **Shop name is shown, not edited.** `update_company` cannot rename a company (the settings helper for P5-3 found the same). Only the tax ID is saved, through the existing call.
- **Opening cash is included.** Added behind the New look switch only: `useUsualOpening` fills the first opening amount if it is still empty; nothing is asked and nothing changes with the switch off. Whole shillings only (the money field takes digits).
- **Banner, not redirect.**
- **Payments reuse `PaymentMethodsCard`** unchanged; its owner-only rule and "Saved" come with it.
- **No separate sign-up-industry link for "Other"** (no starter list exists for it).
- **Not done: services first on the till and in Products.** The till's product grid is the old screen, and the Products list order comes from the products list call (back end branch `claude/products-list-api`, not merged); sorting one page in the browser would mislead. The `services_first` flag is stored and returned, ready for those two to read. Prescription-only: the flag is stored; the current product screens already offer the setting, and the New look Edit product page links to it.
- **Not wired:** a link back into the wizard after it is finished (suggest one in Settings, Business); `/setup` is not in `redirectTable.js`.

## How AC-33 was checked

Jest (all passing; label scanner, colour ratchet and tokens pass for the new files):
- `setupApi.test.js` (13), `setupModel.test.js` (12), `SetupWizard.test.jsx` (33: every step, skipping each way, resuming, asked once, finishing, owner only), `SetupBanner.test.jsx` (8: new store, in progress, existing shop, not owner, New look off, 7 days), `homeBanner.test.jsx` (3, on the real Home), `useBusinessFeatures.test.jsx` (6), `useUsualOpening.test.jsx` (5, with the real Open till dialog), `featuresInPages.test.jsx` (8: Expiry tab and New product), `leftoverStores.test.jsx` (6: Home, Sales, New purchase), `routes.test.jsx` (3).
- Back end: `test_setup_calc.py` and `test_setup_api.py` (no database), 996 tests in the runner pass.
- The leftover-store tests were seen to fail with the old line in Home.

Needs browser check: (1) a new test store with the New look on: Home shows the banner; "Set up now" opens step 1; choose Pharmacy, the Expiry tab appears on Stock levels; (2) refresh in step 3 stays on step 3; (3) "Not now" hides the banner and it stays hidden after a reload; (4) an existing shop never sees the banner; (5) Home, Sales and New purchase show no Store filter on a one-shop business with the default places; (6) Open till with a saved usual amount shows it filled in and editable; (7) the wizard at 375px wide and in dark mode (the radio tiles, the step list, the sticky footer).
