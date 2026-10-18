# Phase 5 review gate, and the redirects switched on

Phase 5 covers Expenses (P5-1), Reports (P5-2), Settings with Team (P5-3), the first-time set-up wizard (P5-4) and the new Sign-in
(P5-5). Per-ticket notes are in `P5-1-expenses.md`, `P5-2-reports.md`, `P5-3-settings.md`, `P5-4-setup.md` and `P5-5-signin.md`.

## Owner's decisions applied

- A new expense creates one Journal Entry (open question 21): money out of the Cash, M-Pesa or Bank account, into an existing expense
  account chosen as the category. It feeds the running-costs figure Home already reads, so Net profit falls by the amount.
- Settings rebuilds the simple cards and links to the current screens for the sensitive ones (M-Pesa and other gateway keys, eTIMS, bank
  accounts, discount rules, loyalty). No keys or secrets pass through new code.
- The new pages replace the old ones: redirects are on for the finished pages.

## Redirects now on

Added to `BUILT_PAGES`: `/expenses`; `/reports`, `/reports/sales`, `/reports/profit`, `/reports/owed`, `/reports/running-costs`,
`/reports/stock-summary`, `/reports/stock-value`, `/reports/aging-stock`; `/settings/business`, `/settings/till`, `/settings/tax`,
`/settings/team`, `/settings/advanced`. So `/staff`, `/roles`, `/settings/*` and the old report addresses open the new pages.

Held back: `/reports/stock-movement` and `/reports/performance` (they only link to the current screens). The sign-in is not
redirected; it follows a device flag (see P5-5). The wizard has no old address; it is reached from a banner on Home.

### A change to how current screens behave

Opening a current screen on purpose (an address with `legacy=1`, for example Roles or Payment gateways) now keeps you on current screens
while you move around inside them, so a button on a current screen (New role, for example) does not bounce to a new page. Going back
into the New look ends it. It lives in memory only, so a reload starts clean.

## Back end pull requests (all drafts, repo MurzakTech/Murzak-PoS-Backend)

| PR | Branch | Adds |
|---|---|---|
| 44 | `claude/expenses-api` | Expenses: create as a Journal Entry, list, options, receipt photo |
| 45 | `claude/reports-run-api` | `run_report` and `list_reports` |
| 42 | `claude/settings-team-api` | Read-only Team list |
| 43 | `claude/setup-api` | Set-up wizard calls |

With the Phase 4 PRs (33 to 41), a trial merge of all twelve open branches onto `main` (throwaway copy, nothing pushed) gave only
expected conflicts in `sw.csv` and `test_record_access.py`; after keeping both sides and rebuilding the `EXPECTED_GUARDS` block, 2,593
back end tests pass and `check_changed_files.py` is clean. Three Swahili rows appear twice: two with different wording, one identical.
Delete one of each when merging.

## Browser check

18 pages at 1280, 1024, 768 and 390: no page errors, no sideways scroll. Found and fixed: the Team table and the report tables were
too wide on tablet and phone (secondary columns now give way), the waterfall labels and date ticks crowded on a phone, the Settings
tabs did not scroll the open section into view, the More options button stretched across forms, the dark age scale was too faint, and
a few links were short of 44 pixels on a phone. Expenses `?open=` now also accepts the plain document number.

## Things to know before the demo

- Nothing has been run against a real database or the demo store. The real check of AC-30 (add an expense, wait 60 seconds, read Net
  profit on Home) needs the back end deployed.
- The expense is made with permission checks switched off after the owner or manager check, because a Sales Manager cannot create
  journal entries on their own. This is in the contract and is the one decision to read closely before deploying.
- Business name, short name, country and currency are read-only on the new Business card (the current server call cannot change them).
- The old audit-trail filters (person, area, action) and search box are not rebuilt.
- "Services first" and "prescription only" are saved by the wizard but not yet wired to a screen.
- The sign-in thunk raises its own "Login Failed" pop-up whose wording differs for a switched-off account; fixing it means changing
  today's sign-in code, so it is a follow-up.
- A way back into the wizard after it is finished (a link in Settings, Business) is not added yet.
