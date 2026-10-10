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
| 8 | Login tokens readable by any injected script; no security headers | Medium | Recommendation |
| 9 | A few role grants need an owner decision | Medium | Decision needed |
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

The login token sits in `localStorage`, where any injected script can read it. Until tokens move to secure cookies, reduce the risk with response headers on the Nginx server that serves the app:

```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.murzaktech.tech; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Test the policy in report-only mode first (`Content-Security-Policy-Report-Only`), because a payment gateway or image host missing from the list will be blocked. `frame-ancestors 'none'` stops other sites from embedding the till to trick staff into clicking buttons.

### 9. Role grants that need an owner decision (Medium)

These grants are written explicitly in the config, so they were kept, but they deserve a business decision:

- **Sales User** can open **Stock Reconciliation**, which adjusts stock quantities. Cashiers adjusting their own stock is a loss risk.
- **Accounts Manager** receives every Settings screen, including payment gateways and eTIMS.
- **Stock User** can create stores and start multi-level reconciliations.
- **Auditor** was given Bank Accounts settings, which is an edit screen.

### 10. Idle sign-out on shared tills (Medium)

**Fixed.** After 15 minutes with no tap, click or key press, the app warns for one minute and then signs out, clearing the session. Activity in any tab counts, so a quiet tab never signs out someone busy in another. The limit is set at build time with `REACT_APP_IDLE_TIMEOUT_MINUTES` (`0` turns it off). Longer term, consider a quick cashier switch using a PIN so every sale is tied to the right person.

### 11. Repository hygiene (Low)

**Fixed.** `pos_frontend.tar.gz` (5 MB), an old production build, has been removed and `*.tar.gz` added to `.gitignore`. No secrets were found in it. It remains in the repository's history, which is harmless since it holds no secrets.
