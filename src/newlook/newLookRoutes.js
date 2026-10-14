import HomePage from './home/HomePage';
import TillSettingsPage from './settings/TillSettingsPage';
import SalesPage from './sales/SalesPage';
import CustomersPage from './customers/CustomersPage';
import NewCustomerPage from './customers/NewCustomerPage';
import EditCustomerPage from './customers/EditCustomerPage';
import OwingRedirect from './customers/OwingRedirect';
import StockLevelsPage from './stock/StockLevelsPage';
import ProductsPage from './products/ProductsPage';
import NewProductPage from './products/NewProductPage';
import ComponentPage from './ComponentPage';
import ChartsPage from './charts/ChartsPage';
import RedirectsPage from './redirects/RedirectsPage';
import PagePlaceholder from './redirects/PagePlaceholder';
import { NEW_PAGES } from './redirects/redirectTable';
import { NEW_LOOK_PREFIX } from './redirects/engine';
import { BUILT_PAGES } from './redirects/live';

/**
 * The redesigned screens built so far. Each opens inside the New look shell, and only while the shop's
 * New look switch is on (see NewLookGate). Anything not listed here is still the current screen.
 *
 * Add a screen by adding a row: { path, element }. For now these open for owners only (the access rules for
 * each role arrive with the Roles ticket, P1-8).
 */
// Pages that have their own route above, so they get no placeholder (add a page here when you add its route)
const OWN_ROUTES = ['/', '/sales', '/settings/till', '/customers', '/customers/owing', '/customers/new', '/stock', '/stock/low', '/stock/movements', '/stock/count', '/stock/locations', '/stock/transfers', '/stock/expiry', '/products', '/products/categories', '/products/new'];

export const newLookRoutes = [
  // Home (Phase 2): the greeting and hero band, four tiles, charts and Needs attention
  { path: '/new-look', element: HomePage },
  // Every shared component in every state, in both themes (the Phase 1 gate)
  { path: '/new-look/components', element: ComponentPage },
  // Every chart with made-up numbers (Phase 2, P2-2)
  { path: '/new-look/charts', element: ChartsPage },
  // Settings, Till and payments: the payment method switches (P3-1); the rest of the section comes with Settings (P5)
  { path: '/new-look/settings/till', element: TillSettingsPage },
  // Sales (P3-8): one list with the tabs All sales, Unpaid, Returns and Till sessions, and the receipt panel
  { path: '/new-look/sales', element: SalesPage },
  // Customers (P4-7): the list with the tabs All customers and Owing, the customer panel, and the New and Edit forms. The old
  // Customer Credit address (/customers/owing) opens the Owing tab.
  { path: '/new-look/customers', element: CustomersPage },
  { path: '/new-look/customers/owing', element: OwingRedirect },
  { path: '/new-look/customers/new', element: NewCustomerPage },
  { path: '/new-look/customers/:id/edit', element: EditCustomerPage },
  // Stock levels (P4-3, P4-4): Overview, Low stock, Movements, Count stock, and Locations, Transfers and Expiry when the shop has them. One
  // route with a trailing wildcard, so moving between tabs does not rebuild the page; /stock/count/:id keeps its placeholder.
  { path: '/new-look/stock/*', element: StockLevelsPage },
  // Products (P4-1, P4-2): the list with the tabs All products and Categories, the product panel, and the one-screen New product form.
  // One route with a trailing wildcard, so moving between the two tabs does not rebuild the page; /products/new and /products/import are
  // more specific and win.
  { path: '/new-look/products/*', element: ProductsPage },
  { path: '/new-look/products/new', element: NewProductPage },
  // Every old address and where it goes (acceptance check AC-06)
  { path: '/new-look/redirects', element: RedirectsPage },
  // Each new page until its real screen is built: a notice that names the page and links to the current screen.
  // A ticket that builds a page adds its own route above, and adds the page to BUILT_PAGES (redirects/live.js).
  ...NEW_PAGES.filter((page) => !OWN_ROUTES.includes(page.path) && !BUILT_PAGES.includes(page.path)).map((page) => ({ path: `${NEW_LOOK_PREFIX}${page.path}`, element: PagePlaceholder })),
];
