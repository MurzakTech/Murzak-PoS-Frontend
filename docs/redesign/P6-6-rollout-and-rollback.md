# P6-6: Staged rollout and rollback rehearsal

This is the plan for moving shops onto the New look, one stage at a time, and for moving any shop back in seconds. It follows the
"Rollout and rollback" section of the Build Pack. The waiting times are suggestions; shorten them only if the owner agrees.

## 1. The stages

| Stage | Who has New look on | Move on when | Suggested time |
|---|---|---|---|
| 1. Test | The Linda Mwananchi test store and the demo store | All 40 checks pass and the rollback has been practised once | Until Phase 6 is done |
| 2. Pilot | One real shop, the owner's own, switched on while the owner is present | No blocker defects, and Home matches the Sales list every day | One week |
| 3. Group | Three to five more shops, one or two at a time | No blocker defects and no shop asks to go back | One week per group |
| 4. Everyone | All shops; New look defaults to on for new shops | No blocker defects | Two weeks |
| 5. Clean-up | The old screens are removed from the code | Nobody has switched back | Thirty days after stage 4 |

Definitions used throughout: a **blocker** is a sale that cannot be completed, an amount that is wrong, or data that is lost. A
**major defect** is a feature in a ticket that does not work. A **minor defect** is a look or wording problem.

Today only stage 1 is open. The New look is off by default for every shop and is switched on per shop, in that shop's own settings
(Settings, New look). Nothing in this document switches any shop on.

## 2. Before switching a shop on (one checklist per shop)

Each step takes minutes. Skipping one is how a good rollout becomes a bad day. Tick each box in the shop's own record.

| # | Step | How | Done when |
|---|---|---|---|
| 1 | Back up the shop's data | Take the shop's usual back end backup (database and files) from the hosting dashboard | You can name the backup and its time |
| 2 | Make sure the new server methods are installed on that shop's own back end | Update the back end app to the current `main`, run the site update (`bench migrate`) for that shop, then run the readiness check below | The readiness check says "ready" |
| 3 | Switch it on when the till is closed, or when no cashier has items in the cart | Ask the manager; carts and held sales live on the device where they were made | No open cart on any till |
| 4 | Give the owner the one-page note of what moved | `P6-6-owner-note.md` in this folder | The owner has read it |
| 5 | On the first day, compare Home with the Sales list for the same period and check one real sale end to end | Home's sales total for today against the total at the top of Sales for today; then one sale from cart to receipt | The two totals agree and the sale appears |

### 2.1 The readiness check (step 2)

The script `scripts/new-look-readiness.js` calls only the **read-only** server methods the new screens use, and tells you which
ones the shop's back end does not have. It changes nothing in the shop.

Why a key and secret and not a password: a Frappe user can be given an API key and secret, which can be revoked at any time and
which never exposes the user's password. Use a user that can only read (a test manager). Never paste the key or secret into chat,
a file or a commit; set them as environment variables for the one command.

How to run it, step by step:

1. In the shop's back end, open the test user, choose "API Access", and generate keys. Copy the key and secret somewhere private.
2. On a computer with Node.js, open a terminal in the front end folder.
3. Run (replace the three values; the secret stays in this terminal only):

   ```
   SHOP_URL=https://the-shop-address SHOP_API_KEY=your-key SHOP_API_SECRET=your-secret node scripts/new-look-readiness.js
   ```

4. Read the result:
   - `ready`: every method is installed. Go on to step 3 of the checklist.
   - `MISSING` against a method: the shop's back end has not been updated. Update it (step 2) and run the check again.
   - `unreachable`: the address is wrong or the shop is offline.
   - The exit code is 0 when ready, 1 when something is missing, 2 when the three variables are not set. Add `--json` for a
     machine-readable result.
5. Revoke the API key when you are done.

A method that answers "not allowed" for the test user counts as installed; the check is about whether the method exists, not
about the user's rights.

What was checked here: the script was run against a local pretend shop only (a 404 for one method, a "not whitelisted" answer for
another, a permission refusal for a third, wrong credentials, and no variables). It reported each case correctly. It has **not**
been run against a real shop, because this environment cannot reach one.

## 3. Switching back

Turn New look off in the shop's settings (Settings, New look); the old screens return at once. Nothing needs undoing in the data.

- Most of the new server methods only read.
- The few that write create ordinary records, so nothing is left half done: a new expense (a journal entry), the payment switches
  update, closing a shift, receiving goods, taking a payment and the other forms.
- An expense entered on the new Expenses page stays in the books, but the old screens have no page to show it until New look is
  switched back on. Tell the shop this before it switches back.
- Carts and held sales stay on the device where they were made, so ask cashiers to finish or clear held sales before a shop is
  switched back.
- If the app itself will not load, redeploy the previous build from the hosting dashboard (Coolify). The tenant build and the main
  build are separate folders; redeploy both.
- Signing in has a device flag (`murzak_new_look_device`) that keeps the new Sign-in page on a device. Clearing the browser's site
  data on that device returns it to the current Sign-in page.

### 3.1 If this happens

| If this happens | Do this |
|---|---|
| A sale is recorded with a wrong amount, or cannot be completed | Switch every shop with New look on back at once, fix the cause, and repeat from stage 2 |
| Home's total differs from the Sales list for the same period | Switch that shop back and compare the two using the notes from P1-9 |
| A page takes more than 3 seconds to show data on a normal connection, twice in a day | Log a defect; if it is the till, switch that shop back |
| Cashiers cannot find a function | Keep New look on, add the function to the one-page note, and switch back only if it stops selling |
| The readiness check says a method is MISSING after an update | Do not switch the shop on; run the site update again and check the back end log |

## 4. Rollback rehearsal

The Done-when for P6-6 is "all 40 checks pass; the rollback was practised once". There are two parts.

### 4.1 Part A: switch-off check on the built app (done here, with pretend server answers)

At each phase gate the Build Pack asks: with New look off, the live app still completes a cash sale, opens Sales and runs a
report. This was run on the production build with the shop's answers pretended, with the switch on and then off. The results are in
section 6.

### 4.2 Part B: the rehearsal on the Linda Mwananchi test store (needs the real store)

This cannot be done from this environment, because the network policy blocks `murzaktech.tech` and no credentials have been
supplied. It takes about ten minutes and is done by the owner or the builder with the owner present:

1. Open the test store with the New look on. Do a cash sale and look at Home and Sales. (Stage 1 state.)
2. Close the till, or clear held sales (step 3 of the checklist).
3. Go to Settings, New look, and turn it off. Time how long it takes: the Build Pack says seconds.
4. Reload. Check that the old Dashboard opens, that a cash sale on the old till completes, that Sales History opens, and that a
   report runs (for example Profit and Loss).
5. Check the expense you entered on the New look (if any) is in the books: open Accounts, Journal Entry, and find it.
6. Switch New look back on and reload. Check nothing was lost: the sale from step 1 is in Sales.
7. Write down the date, who did it, how long step 3 took, and anything that surprised you. That record is the evidence that the
   rollback was practised once.

## 5. Things that need the real test store

| Item | Why it cannot be done here |
|---|---|
| Readiness check on the Linda Mwananchi store and on the demo store | The network blocks `murzaktech.tech`; no API key and secret have been supplied |
| Whether the Linda Mwananchi store shares `api.pos.murzaktech.tech` or has its own back end | If it has its own, the current back end must be installed and migrated there separately; there is no server access from here |
| Part B of the rehearsal (section 4.2) | Needs a real shop |
| Lighthouse on a real connection, real phones and tablets | See the P6-2 and P6-3 notes |
| An M-Pesa sale with the live gateway | Never charged with real money; use the gateway's test mode only, with keys supplied as environment variables |

## 6. Switch-off check results

See the end of this document, section 7, which is filled in after the rehearsal on the built app.

## 7. Rehearsal record (built app, pretend server)

To be completed by the rehearsal run recorded in the Phase 6 report.
