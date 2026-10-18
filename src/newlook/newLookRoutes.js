import HomePage from './home/HomePage';
import SetupWizard from './setup/SetupWizard';
import TillSettingsPage from './settings/TillSettingsPage';
import SettingsPage from './settings/SettingsPage';
import SalesPage from './sales/SalesPage';
import { UnpaidRedirect, ReturnsRedirect as SalesReturnsRedirect, SessionsRedirect } from './sales/SalesTabRedirect';
import CustomersPage from './customers/CustomersPage';
import NewCustomerPage from './customers/NewCustomerPage';
import EditCustomerPage from './customers/EditCustomerPage';
import OwingRedirect from './customers/OwingRedirect';
import StockLevelsPage from './stock/StockLevelsPage';
import ProductsPage from './products/ProductsPage';
import NewProductPage from './products/NewProductPage';
import EditProductPage from './products/EditProductPage';
import SuppliersPage from './suppliers/SuppliersPage';
import NewSupplierPage from './suppliers/NewSupplierPage';
import EditSupplierPage from './suppliers/EditSupplierPage';
import PurchasesPage from './purchases/PurchasesPage';
import NewPurchasePage from './purchases/NewPurchasePage';
import ReceiveGoodsPage from './purchases/ReceiveGoodsPage';
import { OrdersRedirect, ReturnsRedirect } from './purchases/TabRedirect';
import ExpensesPage from './expenses/ExpensesPage';
import AddExpensePage from './expenses/AddExpensePage';
import ReportsPage from './reports/ReportsPage';
import ReportPage from './reports/ReportPage';
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
const OWN_ROUTES = ['/', '/sales', '/sales/unpaid', '/sales/returns', '/sales/sessions', '/settings/till', '/settings/business', '/settings/tax', '/settings/team', '/settings/advanced', '/customers', '/customers/owing', '/customers/new', '/stock', '/stock/low', '/stock/movements', '/stock/count', '/stock/locations', '/stock/transfers', '/stock/expiry', '/products', '/products/categories', '/products/new', '/suppliers', '/suppliers/new', '/purchases', '/purchases/new', '/purchases/orders', '/purchases/returns', '/reports', '/reports/sales', '/reports/profit', '/reports/owed', '/reports/running-costs', '/reports/stock-summary', '/reports/stock-value', '/reports/aging-stock', '/setup', '/expenses', '/expenses/new'];

export const newLookRoutes = [
  // Home (Phase 2): the greeting and hero band, four tiles, charts and Needs attention
  { path: '/new-look', element: HomePage },
  // Every shared component in every state, in both themes (the Phase 1 gate)
  { path: '/new-look/components', element: ComponentPage },
  // Every chart with made-up numbers (Phase 2, P2-2)
  { path: '/new-look/charts', element: ChartsPage },
  // Settings, Till and payments: the payment method switches (P3-1); the rest of the section comes with Settings (P5)
  { path: '/new-look/settings/till', element: TillSettingsPage },
  // Settings (P5-3): the Settings page with its five sections. The bare address opens Business; Team replaces Staff.
  { path: '/new-look/settings', element: SettingsPage },
  { path: '/new-look/settings/business', element: SettingsPage },
  { path: '/new-look/settings/tax', element: SettingsPage },
  { path: '/new-look/settings/team', element: SettingsPage },
  { path: '/new-look/settings/advanced', element: SettingsPage },
  // Sales (P3-8): one list with the tabs All sales, Unpaid, Returns and Till sessions, and the receipt panel
  { path: '/new-look/sales', element: SalesPage },
  // The old Returns and Opening Entries addresses, and the Unpaid link on Home, open the matching tab
  { path: '/new-look/sales/unpaid', element: UnpaidRedirect },
  { path: '/new-look/sales/returns', element: SalesReturnsRedirect },
  { path: '/new-look/sales/sessions', element: SessionsRedirect },
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
  { path: '/new-look/products/:code/edit', element: EditProductPage },
  // Suppliers (P4-6): one list with an Owed filter, the supplier panel (what the shop owes and the next bill due), and the Add and Edit
  // forms. Supplier groups stay on the current screen (/suppliers/groups) until Settings, Advanced is built in Phase 5.
  { path: '/new-look/suppliers', element: SuppliersPage },
  { path: '/new-look/suppliers/new', element: NewSupplierPage },
  { path: '/new-look/suppliers/:id/edit', element: EditSupplierPage },
  // Purchases (P4-5): the list with the tabs All purchases, Orders and Returns and the purchase panel, the guided Receive goods steps (goods
  // received note, stock and supplier bill together), and the New purchase form. The old Submit Order and Purchase Returns addresses open the
  // Orders and Returns tabs. Goods received notes and stock-only receipts open in the panel with ?open=; their current screens stay linked.
  { path: '/new-look/purchases', element: PurchasesPage },
  { path: '/new-look/purchases/new', element: NewPurchasePage },
  { path: '/new-look/purchases/receive', element: ReceiveGoodsPage },
  { path: '/new-look/purchases/orders', element: OrdersRedirect },
  { path: '/new-look/purchases/returns', element: ReturnsRedirect },
  // First-time set-up (P5-4, AC-33): a short wizard, reached from the "Set up now" banner on Home. It is not an old address, so no redirect.
  { path: '/new-look/setup', element: SetupWizard },
  // Expenses (P5-1): the list of running costs with its panel, and the Add expense form. New pages: there is no current screen.
  { path: '/new-look/expenses', element: ExpensesPage },
  { path: '/new-look/expenses/new', element: AddExpensePage },
  // Reports (P5-2): the landing page of six questions, and one report page for sales, profit, owed, running-costs, stock-summary,
  // stock-value and aging-stock. Stock movement and Performance keep their placeholders (static routes beat :name) and link to the
  // current screens, as do all the sub-reports (see "More reports").
  { path: '/new-look/reports', element: ReportsPage },
  { path: '/new-look/reports/:name', element: ReportPage },
  // Every old address and where it goes (acceptance check AC-06)
  { path: '/new-look/redirects', element: RedirectsPage },
  // Each new page until its real screen is built: a notice that names the page and links to the current screen.
  // A ticket that builds a page adds its own route above, and adds the page to BUILT_PAGES (redirects/live.js).
  ...NEW_PAGES.filter((page) => !OWN_ROUTES.includes(page.path) && !BUILT_PAGES.includes(page.path)).map((page) => ({ path: `${NEW_LOOK_PREFIX}${page.path}`, element: PagePlaceholder })),
];
