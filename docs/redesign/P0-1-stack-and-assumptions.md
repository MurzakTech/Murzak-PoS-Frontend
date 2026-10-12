# P0-1: Stack and assumptions, confirmed from the code

Recorded 12 October 2026 for the Murzak POS redesign. This replaces the guesses in the Spec's "Stack and assumptions" table with facts. No app code was changed. The front end is this repository (`MurzakTech/Murzak-PoS-Frontend`); the back end was read from `MurzakTech/Murzak-PoS-Backend` (read only).

## Corrected table

| Part | Spec assumed | Fact | Proof (file or setting) |
|---|---|---|---|
| Front end | React single-page app, static files, served from Coolify | React 19.2 single-page app built with Create React App 5 (`react-scripts` 5.0.1), React Router 6.30, route-level lazy loading, static files, Workbox service worker. **Today** it is deployed by GitHub Actions on every push to `main`, copied by rsync to a VPS (`/var/www/pos/` shared, `/var/www/pos-tenant/` per shop) and served by nginx. **Coolify is planned** (owner, 12 Oct 2026); it is not in the repository yet. | `package.json`; `.github/workflows/deploy.yml`; `deploy/nginx/security-headers.conf`; `src/routes/routes.js`; `src/service-worker.js` |
| Charts | Recharts | Confirmed. Recharts 3.5.0, used in two files. | `package-lock.json`; `src/pages/Dashboard/DashboardCharts.jsx`; `src/components/Reports/ReportChart.jsx` |
| Font | Inter (variable) | Confirmed. Self-hosted `@fontsource-variable/inter` 5.3.0, `font-display: swap`. The default import registers seven language subsets (Latin, Latin-extended, Cyrillic, Cyrillic-extended, Greek, Greek-extended, Vietnamese); the browser fetches only those it needs, but all seven files ship. P1-2 should import Latin only. | `src/index.js` line 4; `src/theme/theme.js`; `node_modules/@fontsource-variable/inter/index.css` |
| Back end | Frappe/ERPNext on each shop's own site, called over REST | Frappe/ERPNext, called through named server methods (`murzak_pos.api.<module>.<function>`), not generic record calls (no `/api/resource` calls; two `frappe.client.get_list`). Bearer-token sign-in. The code is a custom Frappe app, `murzak_pos`, in a separate repository. **Two deployments exist**: shared (`pos.murzaktech.tech`, one back end, many companies, public sign-up) and per-shop (`<shop>.pos.murzaktech.tech`, each shop's own Frappe site behind a proxy, sign-up closed). | `src/api/axiosInstance.js`; `src/config/deployment.js`; `deploy.yml`; backend `murzak_pos/api/` |
| Theme | A dark theme already exists | Confirmed. Light and dark themes in one builder. Follows the device setting until the user chooses; the choice is saved as `themeMode`. Toggles: app top bar and till menu ("Dark screen"). Not on Sign-in. The existing palette differs from the Spec's tokens. | `src/theme/theme.js`; `src/theme/ThemeProvider.js`; `src/components/Layout/Layout.js` line 401; `src/pages/Sales/pos/PosHeader.jsx` line 196 |
| Offline | Till keeps the catalogue and open shift in the browser | Confirmed, and larger: keys `pos_offline_catalog`, `pos_offline_shift`, plus an offline **cash-sale queue** `pos_offline_sales` (cash only, at most 200 sales, at most 24 hours, uploaded when the connection returns). The service worker keeps the app itself available offline. | `src/utils/offlineTill.js`; `src/utils/offlineSales.js`; `src/hooks/useOfflineSales.js`; `src/service-worker.js` |
| Cart | Held in memory only | Confirmed for the live cart (`useState([])`, no storage key, browser leave-page warning only). Held sales are **not** memory only: saved on the server with a browser copy as fallback (`pos_held_sales_v2:<company>`). | `src/pages/Sales/NewSale.js` lines 179 and 1913; `src/hooks/useHeldSales.js`; `src/utils/heldSales.js` |

## The four unknowns, answered (Open question 5)

| Question | Answer | Proof |
|---|---|---|
| How are styles written? | Material UI (MUI) 7 with Emotion, using the `sx` prop (about 3,300 uses). No Tailwind, no CSS modules, no `styled()`. One small `src/index.css` holds animation keyframes. | `package.json`; `src/theme/theme.js` |
| How is data fetched and cached? | axios plus Redux Toolkit (`createAsyncThunk` in 20 files) plus custom hooks. No React Query, SWR or RTK Query; no browser-side cache layer. | `src/store/*Slice.js`; `src/hooks/` |
| Are there automated tests? | Yes. Jest and React Testing Library through `react-scripts test`: 45 test files, 518 tests, all passing (run 12 Oct 2026). No end-to-end tool, no Storybook, no lint config beyond the Create React App default. The deploy workflow runs no tests and builds with `CI: false`. | `package.json`; `src/setupTests.js`; `deploy.yml` |
| Where does the repository live? | `github.com/MurzakTech/Murzak-PoS-Frontend` (default branch `main`). Back end: `github.com/MurzakTech/Murzak-PoS-Backend`. CI uses Node 20. | `git remote -v`; `deploy.yml` |

## Owner decisions recorded

- 12 Oct 2026: Coolify is the planned host. Rollback instructions in the plan (redeploy from Coolify) apply after that move; until then rollback is a revert on `main`, which redeploys.
- 12 Oct 2026: read access to the back-end repository granted.
