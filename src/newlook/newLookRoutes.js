import { lazyPage, lazyNamed } from './lazyPage';
import PagePlaceholder from './redirects/PagePlaceholder';
import { NEW_PAGES } from './redirects/redirectTable';
import { BUILT_PAGES } from './redirects/live';

// Every redesigned page loads only when its address is opened (route-level code splitting, ticket P6-3). The chart library
// (recharts) rides along only with the pages that draw a chart: Home, Reports and the chart page. A page shows the shell's
// loading skeleton for the moment its code takes to arrive (see the Suspense in src/routes/AppRouter.js).
const HomePage = lazyPage(() => import('./home/HomePage'), 'HomePage');
const SetupWizard = lazyPage(() => import('./setup/SetupWizard'), 'SetupWizard');
const TillSettingsPage = lazyPage(() => import('./settings/TillSettingsPage'), 'TillSettingsPage');
const SettingsPage = lazyPage(() => import('./settings/SettingsPage'), 'SettingsPage');
const AppointmentsPage = lazyPage(() => import('./appointments/AppointmentsPage'), 'AppointmentsPage');
const SalesPage = lazyPage(() => import('./sales/SalesPage'), 'SalesPage');
const UnpaidRedirect = lazyNamed(() => import('./sales/SalesTabRedirect'), 'UnpaidRedirect');
const SalesReturnsRedirect = lazyNamed(() => import('./sales/SalesTabRedirect'), 'ReturnsRedirect', 'SalesReturnsRedirect');
const SessionsRedirect = lazyNamed(() => import('./sales/SalesTabRedirect'), 'SessionsRedirect');
const CustomersPage = lazyPage(() => import('./customers/CustomersPage'), 'CustomersPage');
const NewCustomerPage = lazyPage(() => import('./customers/NewCustomerPage'), 'NewCustomerPage');
const EditCustomerPage = lazyPage(() => import('./customers/EditCustomerPage'), 'EditCustomerPage');
const OwingRedirect = lazyPage(() => import('./customers/OwingRedirect'), 'OwingRedirect');
const StockLevelsPage = lazyPage(() => import('./stock/StockLevelsPage'), 'StockLevelsPage');
const ProductsPage = lazyPage(() => import('./products/ProductsPage'), 'ProductsPage');
const NewProductPage = lazyPage(() => import('./products/NewProductPage'), 'NewProductPage');
const EditProductPage = lazyPage(() => import('./products/EditProductPage'), 'EditProductPage');
const ImportProductsPage = lazyPage(() => import('./products/import/ImportProductsPage'), 'ImportProductsPage');
const SuppliersPage = lazyPage(() => import('./suppliers/SuppliersPage'), 'SuppliersPage');
const NewSupplierPage = lazyPage(() => import('./suppliers/NewSupplierPage'), 'NewSupplierPage');
const EditSupplierPage = lazyPage(() => import('./suppliers/EditSupplierPage'), 'EditSupplierPage');
const PurchasesPage = lazyPage(() => import('./purchases/PurchasesPage'), 'PurchasesPage');
const NewPurchasePage = lazyPage(() => import('./purchases/NewPurchasePage'), 'NewPurchasePage');
const ReceiveGoodsPage = lazyPage(() => import('./purchases/ReceiveGoodsPage'), 'ReceiveGoodsPage');
const OrdersRedirect = lazyNamed(() => import('./purchases/TabRedirect'), 'OrdersRedirect');
const ReturnsRedirect = lazyNamed(() => import('./purchases/TabRedirect'), 'ReturnsRedirect');
const ExpensesPage = lazyPage(() => import('./expenses/ExpensesPage'), 'ExpensesPage');
const AddExpensePage = lazyPage(() => import('./expenses/AddExpensePage'), 'AddExpensePage');
const ReportsPage = lazyPage(() => import('./reports/ReportsPage'), 'ReportsPage');
const ReportPage = lazyPage(() => import('./reports/ReportPage'), 'ReportPage');
const ComponentPage = lazyPage(() => import('./ComponentPage'), 'ComponentPage');
const ChartsPage = lazyPage(() => import('./charts/ChartsPage'), 'ChartsPage');
const RedirectsPage = lazyPage(() => import('./redirects/RedirectsPage'), 'RedirectsPage');
const EcommercePage = lazyPage(() => import('./ecommerce/EcommercePage'), 'EcommercePage');

// Pages that have their own route, so they get no placeholder
const OWN_ROUTES = [
  '/', '/appointments', '/sales', '/sales/unpaid', '/sales/returns', '/sales/sessions',
  '/settings/till', '/settings/business', '/settings/brand', '/settings/tax', '/settings/team', '/settings/advanced',
  '/customers', '/customers/owing', '/customers/new',
  '/stock', '/stock/low', '/stock/movements', '/stock/count', '/stock/locations', '/stock/transfers', '/stock/expiry',
  '/products', '/products/categories', '/products/import', '/products/new',
  '/suppliers', '/suppliers/new', '/suppliers/:id/edit',
  '/purchases', '/purchases/new', '/purchases/orders', '/purchases/returns',
  '/reports', '/reports/sales', '/reports/profit', '/reports/owed', '/reports/running-costs', '/reports/stock-summary', '/reports/stock-value', '/reports/aging-stock',
  '/setup', '/expenses', '/expenses/new', '/ecommerce', '/settings/ecommerce',
];

// Canonical routes: top-level paths directly served by the New look shell
const CANONICAL_ROUTES = [
  // Home (Phase 2): the greeting and hero band, four tiles, charts and Needs attention
  { path: '/', element: HomePage },
  // Every shared component in every state, in both themes (the Phase 1 gate)
  { path: '/components', element: ComponentPage },
  // Every chart with made-up numbers (Phase 2, P2-2)
  { path: '/charts', element: ChartsPage },
  // Settings, Till and payments
  { path: '/settings/till', element: TillSettingsPage },
  // Settings (P5-3)
  { path: '/settings', element: SettingsPage },
  { path: '/settings/business', element: SettingsPage },
  { path: '/settings/brand', element: SettingsPage },
  { path: '/settings/tax', element: SettingsPage },
  { path: '/settings/team', element: SettingsPage },
  { path: '/settings/advanced', element: SettingsPage },
  // Appointments (Native Frappe & Salon/Barber bookings)
  { path: '/appointments', element: AppointmentsPage },
  // Sales (P3-8)
  { path: '/sales', element: SalesPage },
  { path: '/sales/unpaid', element: UnpaidRedirect },
  { path: '/sales/returns', element: SalesReturnsRedirect },
  { path: '/sales/sessions', element: SessionsRedirect },
  // Customers (P4-7)
  { path: '/customers', element: CustomersPage },
  { path: '/customers/owing', element: OwingRedirect },
  { path: '/customers/new', element: NewCustomerPage },
  { path: '/customers/:id/edit', element: EditCustomerPage },
  // Stock levels (P4-3, P4-4)
  { path: '/stock/*', element: StockLevelsPage },
  // Products (P4-1, P4-2)
  { path: '/products', element: ProductsPage },
  { path: '/products/categories', element: ProductsPage },
  { path: '/products/new', element: NewProductPage },
  { path: '/products/import', element: ImportProductsPage },
  { path: '/products/:code/edit', element: EditProductPage },
  // Suppliers (P4-6)
  { path: '/suppliers', element: SuppliersPage },
  { path: '/suppliers/new', element: NewSupplierPage },
  { path: '/suppliers/:id/edit', element: EditSupplierPage },
  // Purchases (P4-5)
  { path: '/purchases', element: PurchasesPage },
  { path: '/purchases/new', element: NewPurchasePage },
  { path: '/purchases/receive', element: ReceiveGoodsPage },
  { path: '/purchases/orders', element: OrdersRedirect },
  { path: '/purchases/returns', element: ReturnsRedirect },
  // Setup (P5-4)
  { path: '/setup', element: SetupWizard },
  // Expenses (P5-1)
  { path: '/expenses', element: ExpensesPage },
  { path: '/expenses/new', element: AddExpensePage },
  // Reports (P5-2)
  { path: '/reports', element: ReportsPage },
  { path: '/reports/:name', element: ReportPage },
  // Redirects table review
  { path: '/redirects', element: RedirectsPage },
  // E-Commerce & Online Store (WooCommerce)
  { path: '/ecommerce', element: EcommercePage },
  { path: '/settings/ecommerce', element: EcommercePage },
  // Placeholders for un-migrated pages
  ...NEW_PAGES.filter((page) => !OWN_ROUTES.includes(page.path) && !BUILT_PAGES.includes(page.path)).map((page) => ({ path: page.path, element: PagePlaceholder })),
];

// Backwards-compatible transitional aliases: also mount under /new-look/*
const TRANSITIONAL_ROUTES = CANONICAL_ROUTES.map((r) => ({
  path: `/new-look${r.path === '/' ? '' : r.path}`,
  element: r.element,
}));

export const newLookRoutes = [
  ...CANONICAL_ROUTES,
  ...TRANSITIONAL_ROUTES,
];
