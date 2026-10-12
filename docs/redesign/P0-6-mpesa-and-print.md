# P0-6: M-Pesa on the pay screen, and the print window

Recorded 12 October 2026. Ticket P0-6 of the Murzak POS redesign. It settles Open question 6 (is M-Pesa missing from the pay screen only on the demo profile?) and Open question 8 (does Complete sale open a browser print window, and should it?).

**Status: provisional.** Both answers below come from reading the code (front end and back end) and, for printing, from one experiment in a real browser. **The live test on the demo store has not been done yet**, because no demo store or login has been given. Section 4 is the exact checklist for it. The ticket is finished when that checklist has been run and the two answers below are confirmed or corrected.

## 1. Open question 6: is M-Pesa missing only on the demo profile?

**Provisional answer: very probably yes. M-Pesa is not built into the pay screen; it appears for a shop once M-Pesa has been set up for that shop. The demo store most likely has no M-Pesa set up.**

How the pay screen decides (all from the code):

1. The list of choices on the pay screen is the shop's **enabled "Mode of Payment" records** (`list_payment_methods` in the back end, called with `only_enabled: true` from `NewSale.js`). A mode appears if it is enabled and either set up for this shop's company or not yet set up for any company (`modes_of_payment_for` in `business_lists.py`). Only if that list comes back empty does the till fall back to a fixed list (Cash, Card, Mobile Money, Bank Transfer), and none of those is wired to M-Pesa.
2. **M-Pesa is just one such mode.** It is created and added to every POS profile of the company when the shop saves its M-Pesa settings (Settings, Payment Gateways) or runs the payment-matching set-up (`setup_mpesa_mode_of_payment`, `add_mode_to_pos_profiles`). Nothing creates it on a shop that has never set M-Pesa up.
3. **What the till does once the mode is chosen** depends on the shop's M-Pesa settings: a phone prompt to the customer, or a confirmation code typed by the cashier (the field is labelled "M-Pesa code"; allowed when the shop turns on "allow manual code" or "C2B"). Complete sale stays disabled until the payment is confirmed (`PAYMENT_GATEWAYS.md`; `GatewayPayment.jsx`).

So the Spec's default for question 6 ("build the M-Pesa choice and its confirmation-code field either way") is mostly **already built**. What is left is wording and arrangement, not a new feature.

**New findings for the Spec:**

- **The mode is named `MPESA`, not "M-Pesa"** (`DEFAULT_MODE_OF_PAYMENT = "MPESA"` in `mpesa_api.py`). The pay screen shows the mode name as it is stored, so shops would see "MPESA". The Language and formats table (AC-19, AC-34) should map `MPESA` to "M-Pesa". Add it to the rename map in P1-10.
- Shops that use another name for their mobile money (for example "Mobile Money") would not get the M-Pesa prompt even if keys exist, because the prompt is tied to the mode named in their M-Pesa settings. Worth checking on the demo store.
- The Spec's pay-screen order ("Cash and M-Pesa first") has to match the real mode names, not the labels.

## 2. Open question 8: does Complete sale open a print window, and should it?

**Provisional answer: yes it does, by default, and while that window is open the page is frozen. This is very probably the cause of the freeze the review saw.**

From the code:

- After a sale, the **Sale complete** dialog (`ReceiptDialog.jsx`) opens. If **auto-print** is on, the till calls the browser's `window.print()` **300 ms later** (`NewSale.js`, lines 1274 to 1281). **Auto-print is on unless the cashier has switched it off**: the saved setting `pos_auto_print` counts as on unless it equals `false`. The setting is per device (browser storage), and the till's "More options" menu has the toggle.
- The receipt itself is laid out for an 80 mm till roll (`ReceiptDialog.jsx` print styles), so shops with a receipt printer are meant to use it.
- The **Print receipt** button on the Sale complete dialog, kitchen tickets (`KitchenTicketDialog.jsx`, automatic only when the till is set to print them) and the Print buttons on stock and purchase documents all use the same `window.print()`, so they behave the same way; only the sale receipt and kitchen tickets can fire by themselves.

From an experiment in a real browser (not headless): a page with a running timer and a background worker was opened in Chromium on a virtual display, then `window.print()` was called. Before the call the page answered every time. **After the call the page stopped answering and had still not answered 4 seconds later** (the timer and every request to the page were stuck). The background worker is not the page, so it proves nothing about the till; the point is that the page's own thread was blocked. Limits of the experiment: one browser (Chromium), a computer with no printer, and the test could not close the print window, so I could not time how long the page stays frozen after it is dismissed.

What this means for a busy shop: every completed sale pops up the browser's print window and **freezes the till until someone answers it**. With no printer connected, or if the cashier does not notice the window, selling stops. The offline upload timer, the held-sales refresh and the realtime updates are frozen as well while it is open.

**Options (for the owner to choose; nothing has been built):**

| Option | What it does | Cost and risk |
|---|---|---|
| A. The Spec's default | Keep today's behaviour, and add a shop-wide switch in Settings, Till and payments ("Print the receipt automatically"). The till menu toggle stays | Small. A shop with a printer loses nothing. A shop without one must know to switch it off |
| B. Switch auto-print **off** by default for shops that have not chosen | The till never freezes by surprise; the cashier presses Print receipt when wanted | Changes behaviour for shops that rely on auto-print, so they would have to turn it on once |
| C. Silent printing at the computer | Start the browser in "kiosk printing" mode (a Chrome and Edge start-up setting, `--kiosk-printing`), which prints to the default printer without the window | Not a code change. Needs the computer set up once per till and a default printer |

My recommendation: **A now, and C for shops with a receipt printer.** It follows the Spec's default, keeps working shops unchanged, and gives the shop a clear switch. B is the safer default if the demo store shows the freeze on its own tills. Whether auto-print should be on or off for a shop **with no printer at all** is the owner's call.

## 3. Answers to record in the Open questions table (provisional)

| No. | Answer (12 Oct 2026, provisional until Section 4 is run) |
|---|---|
| 6 | Probably only a set-up matter. M-Pesa appears when the shop has saved its M-Pesa settings, which creates the "MPESA" mode and adds it to the shop's POS profiles. The choice and the "M-Pesa code" field are already built. Still to do: show the name as "M-Pesa" (rename map), and check the demo store's mode name and settings |
| 8 | Yes, it opens the browser's print window after every completed sale unless auto-print is switched off, and the page is frozen while that window is open. Recommend option A, with C for shops that have a printer. The owner decides the default for shops without a printer |

## 4. The live test on the demo store (still to do)

**What I need first** (never a real shop, never production passwords):

1. The **demo store's name** (Open question 11).
2. A **login for that demo store** with the Owner role (to read Settings, Payment Gateways and Payment Methods), and a **Cashier login** (to use the till). If you prefer, run the steps yourself and send me what you see.
3. Confirmation that the open till session on the demo store (POS-OPE-2026-00010) has been closed by its owner, as Part 0 requires. I will not close it.

**Steps and what each should show:**

| # | Do this | Look for | Settles |
|---|---|---|---|
| 1 | As Owner, open Settings, Payment Methods | Is there a method called `MPESA` (or similar) and is it Enabled? | Q6 |
| 2 | Open Settings, Payment Gateways, M-Pesa | Status chip: Not set up, Off, Live or Testing; paybill or till number; "allow manual code" and "C2B" switches | Q6 |
| 3 | As Cashier, open the till, add an item, go to the pay screen | Which methods are listed and in what order; is M-Pesa among them and under what name | Q6 |
| 4 | If M-Pesa is listed, choose it | Does a phone number prompt and/or an "M-Pesa code" field appear; is Complete sale blocked until confirmed. Use a made-up amount; do **not** send a real phone prompt | Q6 |
| 5 | With the setting "Auto-print" **on** in More options, complete a small **cash** sale | Does the browser's print window open by itself; can you still click anything behind it; how long until the till responds after you dismiss it | Q8 |
| 6 | Repeat with Auto-print **off** | No window; the till stays usable; "Print receipt" opens it only on request | Q8 |
| 7 | Note the computer, browser and whether a printer is connected | Needed to say whether the freeze is general or specific to that setup | Q8 |

Record each result in this file, then change "Provisional" to "Confirmed" in Section 3 (or correct the answers).
