---
name: pos-ux-patterns
description: UX patterns for a point-of-sale and back-office product used in Kenyan shops: the till, touch targets, speed, offline, M-Pesa, receipts, money display, tables and forms. Use when designing or changing the till, sales, payment, stock, purchases, customers, reports or any form or list in this app.
---

# POS and back-office UX patterns

Two very different modes share one product. Design each for its job.

## Context to design for

- **Who:** owners, cashiers and stock clerks, often non-technical, often standing, sometimes on a shared Android phone or a cheap tablet with a cracked screen.
- **Where:** bright shops, power cuts, patchy mobile data. Offline and slow networks are normal, not an edge case.
- **When:** Saturday queues. Seconds matter; mistakes cost money.
- **Money:** Kenyan shillings. M-Pesa dominates, with cash, card and credit ("on credit") also common.

## The till (speed mode)

- **Targets:** at least 44px (`--control-height-till`), 8px or more between targets. Primary pay action is the biggest thing on screen.
- **Zero friction to the next sale:** after payment, focus returns to the product search; no dialog the cashier must dismiss before selling again.
- **Show state at a glance:** items count, running total (hero size, tabular figures), customer, held sales, till open since. Amount due is the loudest number on the pay screen.
- **Keyboard and scanner first:** barcode scans go straight into the cart; Enter confirms; Esc cancels; every pointer action has a keyboard path. Never steal focus mid-scan.
- **Forgiving:** undo for remove-item; hold a sale instead of losing it; quantity edits inline; stock warnings informative, not blocking, unless policy says so.
- **Quiet:** no entrance animations in the cart; confirmation is a clear but brief toast and the receipt option, not a modal.
- **Plain background** (no brand backdrop) and high contrast.

## Payments

- Show methods by display name via the rename map (M-Pesa, Cash, Card, On credit, Other). Colour from series tokens plus the name, never colour alone.
- M-Pesa code entry: monospace-friendly, auto-uppercase, inline validation (length and characters), paste-friendly, explicit error ("That code is 9 characters; M-Pesa codes have 10").
- Split payments: show the remaining balance continuously. Change due is large and obvious.
- "On credit" shows the customer's limit and what they already owe before confirming.
- Never leave a payment in an unknown state: show pending, succeeded or failed with the next step, and keep it recoverable.

## Money and numbers

- Format through `src/newlook/components/format.js`; do not hand-roll. Thousands separators, no decimals unless needed, `KES` prefix or the shop's setting.
- Right-align, tabular figures, same decimals in a column. Negative and owing amounts use words and icon plus `--bad`, not only a red minus.
- Big numbers get a quiet comparison ("up KES 4,200 on last Saturday"), not a decorative sparkline.

## Offline and unreliable networks

- Say clearly when the device is offline and what still works. Queue writes locally ("Saved on this device, will send when online") and show sync state per item.
- Nothing the user typed is ever lost on error, refresh or sign-out (see `docs/redesign/P6-5-offline-and-nothing-lost.md` and `nothingLost.test.jsx`).
- Skeletons and cached data first, then update in place without layout jumps. Keep bundles small: lazy-load routes (`lazyPage.js`), avoid heavy dependencies, no large images without sizes.
- Idle sign-out must warn and preserve state.

## Lists and tables (back office)

- Search, then filters (`FilterRow`), then the table. Remember filters in the URL (`useListParams`) so back and refresh work.
- Row opens a detail panel (`DetailPanel`) instead of navigating away, so the list context is kept.
- Bulk actions appear when rows are selected, with a count. Destructive actions say what will happen.
- Pagination shows "Showing 1 to 25 of 312". Empty search results say what was searched and offer to clear filters.
- On phones, tables become stacked rows with the key figure on the right; do not scroll a wide table sideways when a card list works.

## Forms

- Single column, labels above fields (`Field`), helper text only when it prevents an error. Mark optional rather than required.
- Right input type and keyboard: `inputMode="numeric"` for quantities and amounts, `type="tel"` for phones (Kenyan formats 07xx, 01xx, +254), `autoComplete` where sensible.
- Validate on blur and on submit, inline, in words, next to the field; do not disable the submit button without saying why. Preserve input on error.
- Primary action bottom-right on desktop, full-width and pinned on mobile; the cancel is quieter.
- Long forms are split into labelled steps with a visible progress and the ability to go back without losing data.

## Roles and permissions

Not everyone sees everything (`ROLE_BASED_ACCESS.md` and `FRONTEND_RBAC_GUIDE.md` in the repo root, `src/newlook/access`). When a user lacks access, hide actions they can never use; when they might get access, show a disabled control with the reason. Never show a screen that errors because of permissions.

## Receipts and printing

Receipts are black on white paper, in 80mm, 58mm or A4. Brand accent appears as `--accent-paper`. Design for a thermal roll first: narrow, monospaced alignment of amounts, no light greys. Check `docs/redesign/P0-6-mpesa-and-print.md` and `P7-3-receipts-and-brand.md`.

## Accessibility baseline

Keyboard operable everywhere, visible focus, logical tab order, no focus traps, labels for all inputs, live regions for toasts and totals that change, 200% zoom without loss, reduced motion, contrast per tokens. `docs/redesign/P6-1-accessibility.md` lists the rules the team tests against.

## Checklist for any new screen

1. Which mode is this: speed (till) or study (back office)?
2. What is the single most important action, and is it the most prominent thing?
3. What happens offline, on a slow connection, and on a failed request?
4. Does it work on a 375px phone with one thumb?
5. Are all words from the strings file, in plain language, in English and ready for Swahili?
6. What does a new cashier see on their first day? An experienced one on their thousandth sale?
