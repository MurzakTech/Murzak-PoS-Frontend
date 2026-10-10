# Security and Access Control Review: Murzak POS Frontend

**Date:** 10 October 2026
**Scope:** This repository (the React web app). The Frappe backend was not available for review.

## Summary

The app's role-based access control (RBAC: deciding which screens each staff role may open) had a matching bug that quietly gave many roles far more access than their configuration intended. A cashier could open price updates, stock write-offs, refunds and customer credit limits simply by typing the address. That bug is fixed in this change, along with three other issues. The most important remaining work is on the server, which must refuse these actions on its own, because anything the browser decides can be bypassed by a determined user.

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Allowing a screen silently allowed every screen "under" it | High | Fixed |
| 2 | `:id` screens opened the neighbouring "new" screen | Medium | Fixed |
| 3 | Permanent API secret saved in browser storage | High | Fixed |
| 4 | Previous user's data left behind on shared tills after sign-out | Medium | Fixed |
| 5 | Edit and Return buttons shown to roles that may not use them | Low | Fixed |
| 6 | Vulnerable browser libraries (axios, React Router) | High | Fixed (one moderate item remains) |
| 7 | Server-side enforcement must be confirmed | Critical | Action needed on backend |
| 8 | Login tokens readable by any injected script; no security headers | Medium | Partly fixed (in-app policy live; server headers need one-time setup) |
| 9 | A few role grants needed an owner decision | Medium | Fixed (owner decided) |
| 10 | No automatic sign-out on idle shared tills | Medium | Fixed |
| 11 | Old build archive committed to the repository | Low | Fixed |

## Fixed in this change

### 1. A permission for one screen granted the whole area (High)

`isRouteAllowed` in `src/config/roleAccessConfig.js` treated any allowed path as a prefix. Because almost every role is granted `/products`, `/sales`, `/customers`, `/inventory` or `/purchases`, they also received everything beneath those addresses. Examples of what was reachable:

| Role | Intended | Actually reachable |
|------|----------|--------------------|
| Sales User, Desk User, Employee, Guest, Customer | View products | `/products/update-price`, `/products/new`, `/products/bulk-stock-import` |
| Sales User | Stock summary | `/inventory/material-issue`, `/inventory/stock-entry` (write stock off) |
| Sales User, Desk User | Sell | `/sales/returns` (refunds), `/sales/invoice/:id/edit` |
| Desk User, Employee | View customers | `/customers/credit` (change credit limits) |
| Auditor, Accounts User, Expense Approver | Read purchases | `/purchases/new`, `/purchases/create-order` |

These are the classic routes to POS fraud: price changes, unrecorded refunds and stock write-offs.

**Fix:** an address is now traced to the exact screen it opens (the same way the router does) and that screen must be listed for the role. Roles that need several related screens use small named bundles such as `SALES_TILL` (sell and view sales) and `PURCHASES_VIEW` (read-only purchases). Roles marked "read-only" in the config comments (Analytics, Auditor) now only receive view screens.

### 2. `:id` screens opened the "new" screen (Medium)

A grant for `/inventory/multi-level-reconciliation/:id` also opened `/inventory/multi-level-reconciliation/new`, which the config reserves for Stock Managers. The same applied to `/warehouses/:id` and `/roles/:roleName`. Fixed by the same change: `/new` resolves to the New screen, not to a record called "new".

### 3. Permanent API secret stored in the browser (High)

On sign-up, the API key and secret were saved to `localStorage`. Unlike a login token, an API secret does not expire, so anyone who ever read it (through a malicious browser extension or injected script) would keep access indefinitely. The app never reads it back. It is now kept in memory only, and any copy left by older versions is deleted when the app loads.

**Recommended follow-up:** regenerate the API secrets of accounts created before this release, since they may have been exposed.

### 4. Data left behind on shared tills (Medium)

Sign-out removed the login token but kept the previous person's company, POS profile, active store and onboarding flag, and every screen's data stayed in memory. On a shared counter, the next person could briefly see the last person's data. Sign-out, session expiry and a rejected token now all call one `clearSession()` helper (`src/utils/session.js`), and signing out reloads the app so nothing stays in memory.

### 5. Buttons for actions the role cannot take (Low)

The invoice screen showed **Edit** and **Create Return** to everyone. They are now hidden unless the role can open those screens.

### 6. Vulnerable libraries (High)

`axios` (1.13.2 to 1.20.0) and `react-router-dom` (6.30.2 to 6.30.6) were upgraded to clear high-severity advisories, including an open-redirect issue. One moderate React Router advisory is only fixed in version 7; plan that upgrade separately. Most other `npm audit` warnings come from `react-scripts` build tooling that never reaches users' browsers; moving off Create React App (to Vite) would clear them.

### Safeguards added

- `src/config/roleAccessConfig.test.js` checks the cases above and fails if a new screen is added to the router without an access rule.
- `src/utils/session.test.js` checks that sign-out clears user data but keeps device settings such as dark mode.

## Action needed

### 7. Confirm the server enforces every permission (Critical)

The roles this app checks are read from browser storage, which the user controls. Anyone can edit them in the browser's developer tools and see any screen. **The screens are not the security boundary; the server is.** For each sensitive action, confirm the Frappe backend checks the caller's role and refuses otherwise:

- Price changes and bulk imports
- Sales returns, credit notes and invoice edits
- Stock entries, material issues and stock reconciliation
- Customer credit limit changes
- Role, staff and settings changes (payment gateways, eTIMS, bank accounts)

A quick test: sign in as a Sales User, then call one of these API methods directly (for example with Postman) using that user's token. It should be refused.

### 8. Protect login tokens and add security headers (Medium)

The login token sits in `localStorage`, where any injected script can read it. Until tokens move to secure cookies, security headers limit what such a script could do. They come in two parts.

**In the app (done, applied on every deploy).** `scripts/add-security-policy.js` adds a Content Security Policy to the page during the deploy workflow. It lets the page run only its own scripts and send data only to itself and its API, so an injected script cannot load more code or send tokens elsewhere. Product photos may still come from any `https` address. The build now keeps every script in its own file (`INLINE_RUNTIME_CHUNK=false`) so the policy can be strict, and the script stops the deploy if that ever changes. Before release, 19 screens (landing page, sign-in, till, products, inventory, reports, settings) were opened in a browser under the policy with no blocked items, and a test request to an outside site was refused.

**On the server (one-time setup needed).** A few protections only work when the web server sends them, such as stopping other websites from showing the till inside a frame to trick staff into clicking. They are ready in `deploy/nginx/security-headers.conf`. Someone with administrator access to the server should:

1. Copy the file to the server: `sudo cp security-headers.conf /etc/nginx/snippets/murzak-security-headers.conf`
2. Add this line inside each `server { ... }` block for `pos.murzaktech.tech` and the shop sites (`*.pos.murzaktech.tech`):
   `include /etc/nginx/snippets/murzak-security-headers.conf;`
   If a `location` block in that server already has its own `add_header` lines, add the `include` line inside that `location` too, because Nginx then ignores the outer ones.
3. Check the configuration, then reload: `sudo nginx -t && sudo systemctl reload nginx`
4. Confirm: `curl -sI https://pos.murzaktech.tech | grep -iE "x-frame|strict-transport|x-content"` should list the new headers.

`Strict-Transport-Security` makes browsers insist on HTTPS for a year. Enable it only once the main site and every shop site work over HTTPS. If a future feature needs the camera (for example scanning barcodes with a phone), loosen the `Permissions-Policy` line to `camera=(self)`.

### 9. Role grants that needed an owner decision (Medium)

These grants were written explicitly in the config, so they were only changed after the owner decided. All four were removed:

- **Sales User** can no longer open **Stock Reconciliation**, which adjusts stock quantities.
- **Accounts Manager** now gets finance settings only (bank accounts, payment methods, account provisioning, loyalty programs). Payment gateways, eTIMS, business and POS profile settings stay with administrators.
- **Stock User** can no longer create stores or start multi-level stock counts. Stock Managers still can.
- **Auditor** no longer gets the Bank Accounts settings screen, which allows editing.

### 10. Idle sign-out on shared tills (Medium)

**Fixed.** After 15 minutes with no tap, click or key press, the app warns for one minute and then signs out, clearing the session. Activity in any tab counts, so a quiet tab never signs out someone busy in another. The limit is set at build time with `REACT_APP_IDLE_TIMEOUT_MINUTES` (`0` turns it off). Longer term, consider a quick cashier switch using a PIN so every sale is tied to the right person.

### 11. Repository hygiene (Low)

**Fixed.** `pos_frontend.tar.gz` (5 MB), an old production build, has been removed and `*.tar.gz` added to `.gitignore`. No secrets were found in it. It remains in the repository's history, which is harmless since it holds no secrets.
