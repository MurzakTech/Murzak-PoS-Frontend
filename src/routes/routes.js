import React, { lazy, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { IS_TENANT_BUILD, MURZAK_SIGNUP_URL, SIGNUP_OPEN } from '../config/deployment';

// Lazy load pages for code splitting
const RootRoute = lazy(() => import('./RootRoute'));
const ToLogin = () => <Navigate to="/login" replace />;
// Sign-up is closed here; a new business signs up on the website and gets its own site
export const ToSignUpSite = () => {
  useEffect(() => {
    window.location.replace(MURZAK_SIGNUP_URL);
  }, []);
  return null;
};
const Login = lazy(() => import('../pages/Login'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const Register = lazy(() => import('../newlook/auth/SignUpPage'));
// The online store a shopper sees: no sign-in (see newlook/storefront)
const ShopApp = lazy(() => import('../newlook/storefront/ShopApp'));
const TrackPage = lazy(() => import('../newlook/storefront/TrackPage'));
// Sign-up open: the form. A shop's own site: its sign-in. Otherwise: the website, where each business gets its own site
const SignUpRoute = SIGNUP_OPEN ? Register : IS_TENANT_BUILD ? ToLogin : ToSignUpSite;
const Dashboard = lazy(() => import('../newlook/home/HomePage'));
const Products = lazy(() => import('../newlook/products/ProductsPage'));
const NewProduct = lazy(() => import('../newlook/products/NewProductPage'));
const UpdatePrice = lazy(() => import('../pages/Products/UpdatePrice'));
const ProductVariations = lazy(() => import('../pages/Products/ProductVariations'));
const BulkImport = lazy(() => import('../newlook/products/import/ImportProductsPage'));
const BulkStockImport = lazy(() => import('../pages/Products/BulkStockImport'));
const PriceGroups = lazy(() => import('../pages/Products/PriceGroups'));
const Units = lazy(() => import('../pages/Products/Units'));
const Categories = lazy(() => import('../newlook/products/ProductsPage'));
const Brands = lazy(() => import('../pages/Products/Brands'));
const Warranties = lazy(() => import('../pages/Products/Warranties'));
const Sales = lazy(() => import('../newlook/sales/SalesPage'));
const NewSale = lazy(() => import('../pages/Sales/NewSale'));
const KitchenStation = lazy(() => import('../pages/Kitchen'));
const SalesHistory = lazy(() => import('../newlook/sales/SalesPage'));
const SalesInvoiceDetails = lazy(() => import('../newlook/sales/SalesPage'));
const NewSalesInvoice = lazy(() => import('../pages/Sales/NewSalesInvoice'));
const POSOpeningEntries = lazy(() => import('../newlook/sales/SalesPage'));
const POSOpeningEntryDetails = lazy(() => import('../newlook/sales/SalesPage'));
const SalesReturns = lazy(() => import('../newlook/sales/SalesPage'));
const Inventory = lazy(() => import('../newlook/stock/StockLevelsPage'));
const Warehouses = lazy(() => import('../pages/Warehouses'));
const WarehouseDetails = lazy(() => import('../pages/Inventory/WarehouseDetails'));
const WarehouseForm = lazy(() => import('../pages/Inventory/WarehouseForm'));
const WarehouseStaff = lazy(() => import('../pages/Inventory/WarehouseStaff'));
const StaffWarehouseAssignment = lazy(() => import('../pages/Inventory/StaffWarehouseAssignment'));
const MaterialReceipt = lazy(() => import('../pages/Inventory/MaterialReceipt'));
const MaterialIssue = lazy(() => import('../pages/Inventory/MaterialIssue'));
const MaterialTransfer = lazy(() => import('../pages/Inventory/MaterialTransfer'));
const StockEntry = lazy(() => import('../pages/Inventory/StockEntry'));
const StockReconciliation = lazy(() => import('../pages/Inventory/StockReconciliation'));
const StockSummary = lazy(() => import('../pages/Inventory/StockSummary'));
const LowStockAlert = lazy(() => import('../pages/Inventory/LowStockAlert'));
const ExpiryAlerts = lazy(() => import('../pages/Inventory/ExpiryAlerts'));
const StockLedger = lazy(() => import('../pages/Inventory/StockLedger'));
const InventoryItemDetails = lazy(() => import('../pages/Inventory/InventoryItemDetails'));
const StockEntryList = lazy(() => import('../pages/Inventory/StockEntryList'));
const StockEntryDetails = lazy(() => import('../pages/Inventory/StockEntryDetails'));
const MaterialReceiptsList = lazy(() => import('../pages/Inventory/MaterialReceiptsList'));
const MaterialIssuesList = lazy(() => import('../pages/Inventory/MaterialIssuesList'));
const MaterialTransfersList = lazy(() => import('../pages/Inventory/MaterialTransfersList'));
// Multi-Level Stock Reconciliation
const MultiLevelReconciliation = lazy(() => import('../pages/Inventory/MultiLevelReconciliation'));
const MultiLevelReconciliationDetails = lazy(() => import('../pages/Inventory/MultiLevelReconciliationDetails'));
const StockTake = lazy(() => import('../pages/Inventory/StockTake'));
const CreateMultiLevelReconciliation = lazy(() => import('../pages/Inventory/CreateMultiLevelReconciliation'));
const Customers = lazy(() => import('../newlook/customers/CustomersPage'));
const CustomerCredit = lazy(() => import('../newlook/customers/CustomersPage'));
const Suppliers = lazy(() => import('../newlook/suppliers/SuppliersPage'));
const SupplierDetails = lazy(() => import('../newlook/suppliers/SuppliersPage'));
const NewSupplier = lazy(() => import('../newlook/suppliers/NewSupplierPage'));
const EditSupplier = lazy(() => import('../newlook/suppliers/EditSupplierPage'));
const SupplierGroups = lazy(() => import('../pages/Suppliers/SupplierGroups'));
const Purchases = lazy(() => import('../newlook/purchases/PurchasesPage'));
const NewPurchase = lazy(() => import('../newlook/purchases/NewPurchasePage'));
const PurchaseReturns = lazy(() => import('../newlook/purchases/PurchasesPage'));
const PurchaseDetails = lazy(() => import('../newlook/purchases/PurchasesPage'));
const PurchaseReceiptsList = lazy(() => import('../newlook/purchases/PurchasesPage'));
const NewPurchaseReceipt = lazy(() => import('../newlook/purchases/ReceiveGoodsPage'));
const PurchaseReceiptDetails = lazy(() => import('../newlook/purchases/PurchasesPage'));
// Purchase Order Flow Forms (based on PURCHASE_API_DOCUMENTATION.md)
const CreatePurchaseOrder = lazy(() => import('../newlook/purchases/NewPurchasePage'));
const SubmitPurchaseOrder = lazy(() => import('../newlook/purchases/PurchasesPage'));
const CreateGRN = lazy(() => import('../newlook/purchases/ReceiveGoodsPage'));
const GRNList = lazy(() => import('../newlook/purchases/PurchasesPage'));
const GRNDetails = lazy(() => import('../newlook/purchases/PurchasesPage'));
// Purchase Invoice pages (based on PURCHASE_INVOICE_API_DOCUMENTATION.md)
const PurchaseInvoicesList = lazy(() => import('../newlook/purchases/PurchasesPage'));
const PurchaseInvoiceDetails = lazy(() => import('../newlook/purchases/PurchasesPage'));
const Staff = () => <Navigate to="/settings/team" replace />;
const Reports = lazy(() => import('../newlook/reports/ReportsPage'));
const Expenses = lazy(() => import('../newlook/expenses/ExpensesPage'));
const Appointments = lazy(() => import('../newlook/appointments/AppointmentsPage'));
const SalesAnalytics = lazy(() => import('../newlook/reports/ReportsPage'));
const InventorySummary = lazy(() => import('../newlook/reports/ReportsPage'));
const InventoryValuation = lazy(() => import('../newlook/reports/ReportsPage'));
const ValueByCategory = lazy(() => import('../newlook/reports/ReportsPage'));
const CostMethodComparison = lazy(() => import('../newlook/reports/ReportsPage'));
const ValueTrends = lazy(() => import('../newlook/reports/ReportsPage'));
const StockMovement = lazy(() => import('../newlook/reports/ReportsPage'));
const TurnoverReport = lazy(() => import('../newlook/reports/ReportsPage'));
const DaysOnHand = lazy(() => import('../newlook/reports/ReportsPage'));
const MovementPatterns = lazy(() => import('../newlook/reports/ReportsPage'));
const AgingStock = lazy(() => import('../newlook/reports/ReportsPage'));
const StockAging = lazy(() => import('../newlook/reports/ReportsPage'));
const ObsolescenceRisk = lazy(() => import('../newlook/reports/ReportsPage'));
const AgingRecommendations = lazy(() => import('../newlook/reports/ReportsPage'));
const PerformanceMetrics = lazy(() => import('../newlook/reports/ReportsPage'));
const AccuracyReport = lazy(() => import('../newlook/reports/ReportsPage'));
const VarianceReport = lazy(() => import('../newlook/reports/ReportsPage'));
const AdjustmentTrends = lazy(() => import('../newlook/reports/ReportsPage'));
const TransferEfficiency = lazy(() => import('../newlook/reports/ReportsPage'));
const Settings = lazy(() => import('../newlook/settings/SettingsPage'));
const POSProfileSettings = lazy(() => import('../pages/Settings/POSProfileSettings'));
const BusinessSettings = lazy(() => import('../pages/Settings/BusinessSettings'));
const ETIMSSettings = lazy(() => import('../pages/Settings/ETIMSSettings'));
const BankAccounts = lazy(() => import('../pages/Settings/BankAccounts'));
const AuditTrail = lazy(() => import('../pages/Settings/AuditTrail'));
const Recipes = lazy(() => import('../pages/Inventory/Recipes'));
const RecipeEditor = lazy(() => import('../pages/Inventory/RecipeEditor'));
const Wastage = lazy(() => import('../pages/Inventory/Wastage'));
const Approvals = lazy(() => import('../pages/Settings/Approvals'));
const PaymentMatching = lazy(() => import('../pages/Settings/PaymentMatching'));
const SalesPeople = lazy(() => import('../pages/Settings/SalesPeople'));
const Security = lazy(() => import('../pages/Settings/Security'));
const NewLook = lazy(() => import('../pages/Settings/NewLook'));
const AccountProvisioning = lazy(() => import('../pages/Settings/AccountProvisioning'));
const PaymentMethods = lazy(() => import('../pages/Settings/PaymentMethods'));
const PaymentGateways = lazy(() => import('../pages/Settings/PaymentGateways'));
const InventoryDiscounts = lazy(() => import('../pages/Settings/InventoryDiscounts'));
const DiscountRuleForm = lazy(() => import('../pages/Settings/DiscountRuleForm'));
const LoyaltyPrograms = lazy(() => import('../pages/Settings/LoyaltyPrograms'));
// Roles
const Roles = lazy(() => import('../pages/Roles'));
const RoleDetails = lazy(() => import('../pages/Roles/RoleDetails'));
const RolePermissions = lazy(() => import('../pages/Roles/RolePermissions'));
const RoleForm = lazy(() => import('../pages/Roles/RoleForm'));
const IndustryProductSetup = lazy(() => import('../pages/IndustryProductSetup'));
const LoadProducts = lazy(() => import('../pages/Products/LoadProducts'));
// Stock Transfers
const StockTransfers = lazy(() => import('../pages/StockTransfers'));
const StockTransfersList = lazy(() => import('../pages/StockTransfers/StockTransfersList'));
const CreateStockTransfer = lazy(() => import('../pages/StockTransfers/CreateStockTransfer'));
const StockTransferDetails = lazy(() => import('../pages/StockTransfers/StockTransferDetails'));
const CreateMaterialRequest = lazy(() => import('../pages/StockTransfers/CreateMaterialRequest'));
const ApproveTransferRequest = lazy(() => import('../pages/StockTransfers/ApproveTransferRequest'));
const DispatchStock = lazy(() => import('../pages/StockTransfers/DispatchStock'));
const ReceiveStock = lazy(() => import('../pages/StockTransfers/ReceiveStock'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const ContactUs = lazy(() => import('../pages/ContactUs'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Public routes (without Layout)
export const publicRoutes = [
  {
    path: '/',
    // Dynamic entrypoint: renders POS dashboard when authenticated, or Landing/Login when unauthenticated
    element: RootRoute,
    label: 'Home',
  },
  {
    path: '/login',
    element: Login,
    label: 'Login',
  },
  {
    path: '/forgot-password',
    element: ForgotPassword,
    label: 'Forgot Password',
  },
  {
    path: '/register',
    element: SignUpRoute,
    label: 'Register',
  },
  {
    path: '/signup',
    element: SignUpRoute,
    label: 'Sign Up',
  },
  {
    path: '/terms-of-service',
    element: TermsOfService,
    label: 'Terms of Service',
  },
  {
    path: '/privacy-policy',
    element: PrivacyPolicy,
    label: 'Privacy Policy',
  },
  {
    path: '/contact-us',
    element: ContactUs,
    label: 'Contact Us',
  },
  // The online store of a business: /shop/<name>, and /shop/<name>/checkout
  {
    path: '/shop/:slug/*',
    element: ShopApp,
    label: 'Online store',
  },
  // Where a shopper's order is, opened from the link they were given
  {
    path: '/track/:token',
    element: TrackPage,
    label: 'Order tracking',
  },
];

// Protected routes without Layout (e.g., onboarding)
// Note: Onboarding is now part of the Register component
export const protectedRoutesWithoutLayout = [];

// Protected routes (with Layout)
export const protectedRoutes = [
  {
    path: '/',
    element: Dashboard,
    label: 'Home',
    icon: 'Dashboard',
  },
  {
    path: '/dashboard',
    element: Dashboard,
    label: 'Dashboard',
    icon: 'Dashboard',
    hideFromMenu: true,
  },
  {
    path: '/till',
    element: NewSale,
    label: 'Till',
    icon: 'PointOfSale',
    hideFromMenu: true,
  },
  {
    path: '/expenses',
    element: Expenses,
    label: 'Expenses',
    icon: 'AttachMoney',
  },
  {
    path: '/appointments',
    element: Appointments,
    label: 'Appointments',
    icon: 'CalendarToday',
    hideFromMenu: true,
  },
  {
    path: '/kitchen',
    element: KitchenStation,
    label: 'Station screen',
    icon: 'PointOfSale',
    hideFromMenu: true,
  },
  {
    path: '/industry/:industryCode/products',
    element: IndustryProductSetup,
    label: 'Industry Products',
    icon: 'Inventory',
    hideFromMenu: true,
  },
  {
    path: '/products',
    element: Products,
    label: 'Products',
    icon: 'Inventory',
    // Page-specific child navigation
    pageChildren: [
      { path: '/products', label: 'All Products', icon: 'Inventory' },
      { path: '/products/new', label: 'New Product', icon: 'Add' },
      { path: '/products/load-products', label: 'Load Products', icon: 'CloudDownload' },
      { path: '/products/categories', label: 'Categories', icon: 'Folder' },
      { path: '/products/brands', label: 'Brands', icon: 'BrandingWatermark' },
      { path: '/products/units', label: 'Units', icon: 'Straighten' },
      { path: '/products/warranties', label: 'Warranties', icon: 'Verified' },
      { path: '/products/price-groups', label: 'Price Groups', icon: 'PriceCheck' },
    ],
    children: [
      {
        path: '/products',
        element: Products,
        label: 'All Products',
        icon: 'Inventory',
      },
      {
        path: '/products/new',
        element: NewProduct,
        label: 'New Product',
        icon: 'Add',
        hideFromMenu: true
      },
      {
        path: '/products/update-price',
        element: UpdatePrice,
        label: 'Update Price',
        icon: 'AttachMoney',
        hideFromMenu: true
      },
      {
        path: '/products/variations',
        element: ProductVariations,
        label: 'Product Variations',
        icon: 'Category',
        hideFromMenu: true
      },
      {
        path: '/products/bulk-import',
        element: BulkImport,
        label: 'Bulk Products Import',
        icon: 'Upload',
        hideFromMenu: true
      },
      {
        path: '/products/bulk-stock-import',
        element: BulkStockImport,
        label: 'Bulk Opening Stock Import',
        icon: 'Inventory2',
        hideFromMenu: true
      },
      {
        path: '/products/price-groups',
        element: PriceGroups,
        label: 'Selling Price Groups',
        icon: 'PriceCheck',
        hideFromMenu: true
      },
      {
        path: '/products/units',
        element: Units,
        label: 'Units Management',
        icon: 'Straighten',
        hideFromMenu: true
      },
      {
        path: '/products/categories',
        element: Categories,
        label: 'Categories',
        icon: 'Folder',
        hideFromMenu: true
      },
      {
        path: '/products/load-products',
        element: LoadProducts,
        label: 'Load Products',
        icon: 'CloudDownload',
      },
      {
        path: '/products/brands',
        element: Brands,
        label: 'Brands',
        icon: 'BrandingWatermark',
        hideFromMenu: true
      },
      {
        path: '/products/warranties',
        element: Warranties,
        label: 'Warranties',
        icon: 'Verified',
        hideFromMenu: true
      },
    ],
  },
  {
    path: '/sales',
    element: Sales,
    label: 'Sales',
    icon: 'PointOfSale',
    // Page-specific child navigation
    pageChildren: [
      { path: '/sales/pos', label: 'Point of Sale', icon: 'PointOfSale' },
      { path: '/sales/history', label: 'Sales History', icon: 'History' },
      { path: '/sales/invoice/new', label: 'New Invoice', icon: 'Add' },
      { path: '/sales/pos-opening-entries', label: 'Opening Entries', icon: 'History' },
      { path: '/sales/returns', label: 'Returns', icon: 'AssignmentReturn' },
    ],
    children: [
      {
        path: '/sales/pos',
        element: NewSale,
        label: 'Point of Sale',
        icon: 'PointOfSale',
      },
      {
        path: '/sales/history',
        element: SalesHistory,
        label: 'Sales History',
        icon: 'History',
      },
      {
        path: '/sales/invoice/new',
        element: NewSalesInvoice,
        label: 'New Sales Invoice',
        icon: 'Add',
        hideFromMenu: true
      },
      {
        path: '/sales/pos-opening-entries',
        element: POSOpeningEntries,
        label: 'POS Opening Entries',
        icon: 'History',
      },
      {
        path: '/sales/returns',
        element: SalesReturns,
        label: 'Sales Returns',
        icon: 'AssignmentReturn',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/sales/invoice/:id',
        element: SalesInvoiceDetails,
        label: 'Sales Invoice Details',
        hideFromMenu: true,
      },
      {
        path: '/sales/pos-opening-entries/:name',
        element: POSOpeningEntryDetails,
        label: 'POS Opening Entry Details',
        hideFromMenu: true,
      },
      {
        path: '/sales/pos-invoice/:id',
        element: SalesInvoiceDetails,
        label: 'POS Invoice Details',
        hideFromMenu: true,
      },
      {
        path: '/sales/invoice/:id/edit',
        element: NewSalesInvoice,
        label: 'Edit Sales Invoice',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/warehouses',
    element: Warehouses,
    label: 'Stores',
    icon: 'Warehouse',
    // Page-specific child navigation
    pageChildren: [
      { path: '/warehouses', label: 'All Stores', icon: 'Warehouse' },
      { path: '/warehouses/new', label: 'New Store', icon: 'Add' },
      { path: '/warehouses/staff-assignment', label: 'Staff Assignment', icon: 'People' },
    ],
    children: [
      {
        path: '/warehouses',
        element: Warehouses,
        label: 'All Stores',
        icon: 'Warehouse',
      },
      {
        path: '/warehouses/new',
        element: WarehouseForm,
        label: 'New Store',
        icon: 'Add',
      },
      {
        path: '/warehouses/staff-assignment',
        element: StaffWarehouseAssignment,
        label: 'Staff Assignment',
        icon: 'People',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/warehouses/:id',
        element: WarehouseDetails,
        label: 'Store Details',
        hideFromMenu: true,
      },
      {
        path: '/warehouses/:id/edit',
        element: WarehouseForm,
        label: 'Edit Store',
        hideFromMenu: true,
      },
      {
        path: '/warehouses/:id/staff',
        element: WarehouseStaff,
        label: 'Store Staff',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/inventory',
    element: Inventory,
    label: 'Inventory',
    icon: 'Inventory2',
    // Page-specific child navigation
    pageChildren: [
      { path: '/inventory', label: 'Overview', icon: 'Dashboard' },
      { path: '/inventory/stock-summary', label: 'Stock List', icon: 'Assessment' },
      { path: '/inventory/low-stock', label: 'Low Stock', icon: 'Warning' },
      { path: '/inventory/expiry-alerts', label: 'Expiry Alerts', icon: 'CalendarToday' },
      { path: '/inventory/stock-ledger', label: 'Stock Ledger', icon: 'Book' },
      { path: '/inventory/stock-entries', label: 'Entries', icon: 'ListAlt' },
      { path: '/inventory/material-receipts', label: 'Material Receipts', icon: 'Input' },
      { path: '/inventory/material-issues', label: 'Material Issues', icon: 'Output' },
      { path: '/inventory/multi-level-reconciliation', label: 'Reconciliation', icon: 'Checklist' },
      { path: '/inventory/recipes', label: 'Recipes', icon: 'Restaurant' },
      { path: '/inventory/wastage', label: 'Wastage', icon: 'Delete' },
    ],
    children: [
      {
        path: '/inventory',
        element: Inventory,
        label: 'Overview',
        icon: 'Dashboard',
      },
      {
        path: '/inventory/stock-summary',
        element: StockSummary,
        label: 'Inventory List',
        icon: 'Assessment',
      },
      {
        path: '/inventory/low-stock',
        element: LowStockAlert,
        label: 'Low Stock Alert',
        icon: 'Warning',
      },
      {
        path: '/inventory/expiry-alerts',
        element: ExpiryAlerts,
        label: 'Expiry Alerts',
        icon: 'CalendarToday',
      },
      {
        path: '/inventory/stock-ledger',
        element: StockLedger,
        label: 'Stock Ledger',
        icon: 'Book',
      },
      {
        path: '/inventory/item-details',
        element: InventoryItemDetails,
        label: 'Inventory Details',
        icon: 'List',
      },
      {
        path: '/inventory/recipes',
        element: Recipes,
        label: 'Recipes',
        icon: 'Restaurant',
      },
      {
        path: '/inventory/recipes/new',
        element: RecipeEditor,
        label: 'New Recipe',
        icon: 'Add',
      },
      {
        path: '/inventory/recipes/:dish',
        element: RecipeEditor,
        label: 'Recipe',
        icon: 'Restaurant',
      },
      {
        path: '/inventory/wastage',
        element: Wastage,
        label: 'Wastage',
        icon: 'Delete',
      },
      {
        path: '/inventory/stock-entries',
        element: StockEntryList,
        label: 'Stock Entries',
        icon: 'ListAlt',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/inventory/stock-entries/:stockEntryName',
        element: StockEntryDetails,
        label: 'Stock Entry Details',
        hideFromMenu: true,
      },
      {
        path: '/inventory/material-receipts',
        element: MaterialReceiptsList,
        label: 'Material Receipts',
        icon: 'Input',
      },
      {
        path: '/inventory/material-issues',
        element: MaterialIssuesList,
        label: 'Material Issues',
        icon: 'Output',
      },
      {
        path: '/inventory/material-transfers',
        element: MaterialTransfersList,
        label: 'Material Transfers',
        icon: 'SwapHoriz',
        hideFromMenu: true,
      },
      {
        path: '/inventory/stock-entry',
        element: StockEntry,
        label: 'New Stock Entry',
        icon: 'Edit',
      },
      {
        path: '/inventory/stock-reconciliation',
        element: StockReconciliation,
        label: 'Stock Reconciliation',
        icon: 'Sync',
        hideFromMenu: true,
      },
      {
        path: '/inventory/multi-level-reconciliation',
        element: MultiLevelReconciliation,
        label: 'Stock Reconciliation',
        icon: 'Checklist',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/inventory/multi-level-reconciliation/new',
        element: CreateMultiLevelReconciliation,
        label: 'Create Multi-Level Reconciliation',
        hideFromMenu: true,
      },
      {
        path: '/inventory/multi-level-reconciliation/:id',
        element: MultiLevelReconciliationDetails,
        label: 'Reconciliation Details',
        hideFromMenu: true,
      },
      {
        path: '/inventory/multi-level-reconciliation/:id/stock-take',
        element: StockTake,
        label: 'Add Stock Take',
        hideFromMenu: true,
      },
      // Creation forms (not in sidebar, accessed via buttons on listing pages)
      {
        path: '/inventory/material-receipt',
        element: MaterialReceipt,
        label: 'New Material Receipt',
        hideFromMenu: true,
      },
      {
        path: '/inventory/material-issue',
        element: MaterialIssue,
        label: 'New Material Issue',
        hideFromMenu: true,
      },
      {
        path: '/inventory/material-transfer',
        element: MaterialTransfer,
        label: 'New Material Transfer',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/customers',
    element: Customers,
    label: 'Customers',
    icon: 'People',
    // Page-specific child navigation
    pageChildren: [
      { path: '/customers', label: 'All Customers', icon: 'People' },
      { path: '/customers/credit', label: 'Customer Credit', icon: 'CreditCard' },
    ],
    children: [
      {
        path: '/customers',
        element: Customers,
        label: 'All Customers',
        icon: 'People',
      },
      {
        path: '/customers/credit',
        element: CustomerCredit,
        label: 'Customer Credit',
        icon: 'CreditCard',
      },
    ],
  },
  {
    path: '/suppliers',
    element: Suppliers,
    label: 'Suppliers',
    icon: 'Business',
    // Page-specific child navigation
    pageChildren: [
      { path: '/suppliers', label: 'All Suppliers', icon: 'Business' },
      { path: '/suppliers/groups', label: 'Supplier Groups', icon: 'Group' },
    ],
    children: [
      {
        path: '/suppliers',
        element: Suppliers,
        label: 'All Suppliers',
        icon: 'Business',
      },
      {
        path: '/suppliers/groups',
        element: SupplierGroups,
        label: 'Supplier Groups',
        icon: 'Group',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/suppliers/new',
        element: NewSupplier,
        label: 'New Supplier',
        hideFromMenu: true,
      },
      {
        path: '/suppliers/:id/edit',
        element: EditSupplier,
        label: 'Edit Supplier',
        hideFromMenu: true,
      },
      {
        path: '/suppliers/:id',
        element: SupplierDetails,
        label: 'Supplier Details',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/purchases',
    element: Purchases,
    label: 'Purchases',
    icon: 'ShoppingCart',
    // Page-specific child navigation
    pageChildren: [
      { path: '/purchases', label: 'All Purchases', icon: 'ShoppingCart' },
      { path: '/purchases/invoices', label: 'Purchase Invoices', icon: 'Receipt' },
      { path: '/purchases/create-order', label: 'Create Order', icon: 'AddShoppingCart' },
      { path: '/purchases/submit-order', label: 'Submit Order', icon: 'Send' },
      { path: '/purchases/create-grn', label: 'Create GRN', icon: 'Inventory' },
      { path: '/purchases/grns', label: 'GRN List', icon: 'Receipt' },
      { path: '/purchases/returns', label: 'Purchase Returns', icon: 'AssignmentReturn' },
      { path: '/purchases/receipts', label: 'Purchase Receipts', icon: 'Receipt' },
    ],
    children: [
      {
        path: '/purchases',
        element: Purchases,
        label: 'All Purchases',
        icon: 'ShoppingCart',
      },
      {
        path: '/purchases/new',
        element: NewPurchase,
        label: 'New Purchase',
        icon: 'Add',
        hideFromMenu: true,
      },
      {
        path: '/purchases/create-order',
        element: CreatePurchaseOrder,
        label: 'Create Purchase Order',
        icon: 'AddShoppingCart',
      },
      {
        path: '/purchases/submit-order',
        element: SubmitPurchaseOrder,
        label: 'Submit Purchase Order',
        icon: 'Send',
      },
      {
        path: '/purchases/create-grn',
        element: CreateGRN,
        label: 'Create GRN',
        icon: 'Inventory',
      },
      {
        path: '/purchases/grns',
        element: GRNList,
        label: 'GRN List',
        icon: 'Receipt',
      },
      {
        path: '/purchases/returns',
        element: PurchaseReturns,
        label: 'Purchase Returns',
        icon: 'AssignmentReturn',
      },
      {
        path: '/purchases/receipts',
        element: PurchaseReceiptsList,
        label: 'Purchase Receipts',
        icon: 'Receipt',
      },
      {
        path: '/purchases/receipts/new',
        element: NewPurchaseReceipt,
        label: 'New Purchase Receipt',
        icon: 'Add',
      },
      {
        path: '/purchases/invoices',
        element: PurchaseInvoicesList,
        label: 'Purchase Invoices',
        icon: 'Receipt',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/purchases/:id',
        element: PurchaseDetails,
        label: 'Purchase Details',
        hideFromMenu: true,
      },
      {
        path: '/purchases/receipts/:id',
        element: PurchaseReceiptDetails,
        label: 'Purchase Receipt Details',
        hideFromMenu: true,
      },
      {
        path: '/purchases/grns/:id',
        element: GRNDetails,
        label: 'GRN Details',
        hideFromMenu: true,
      },
      {
        path: '/purchases/invoices/:invoiceNo',
        element: PurchaseInvoiceDetails,
        label: 'Purchase Invoice Details',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/stock-transfers',
    element: StockTransfers,
    label: 'Stock Transfers',
    icon: 'SwapHoriz',
    // Page-specific child navigation
    pageChildren: [
      { path: '/stock-transfers', label: 'Overview', icon: 'Dashboard' },
      { path: '/stock-transfers/list', label: 'All Transfers', icon: 'List' },
      { path: '/stock-transfers/create', label: 'Direct Transfer', icon: 'Add' },
      { path: '/stock-transfers/create-request', label: 'Transfer Request', icon: 'Add' },
    ],
    children: [
      {
        path: '/stock-transfers',
        element: StockTransfers,
        label: 'Stock Transfers',
        icon: 'SwapHoriz',
      },
      {
        path: '/stock-transfers/list',
        element: StockTransfersList,
        label: 'All Transfers',
        icon: 'List',
      },
      {
        path: '/stock-transfers/create',
        element: CreateStockTransfer,
        label: 'Create Direct Transfer',
        icon: 'Add',
      },
      {
        path: '/stock-transfers/create-request',
        element: CreateMaterialRequest,
        label: 'Create Transfer Request',
        icon: 'Add',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/stock-transfers/:id',
        element: StockTransferDetails,
        label: 'Transfer Details',
        hideFromMenu: true,
      },
      {
        path: '/stock-transfers/:id/approve',
        element: ApproveTransferRequest,
        label: 'Approve Transfer',
        hideFromMenu: true,
      },
      {
        path: '/stock-transfers/:id/dispatch',
        element: DispatchStock,
        label: 'Dispatch Stock',
        hideFromMenu: true,
      },
      {
        path: '/stock-transfers/:id/receive',
        element: ReceiveStock,
        label: 'Receive Stock',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/staff',
    element: Staff,
    label: 'Staff',
    icon: 'Badge',
  },
  {
    path: '/roles',
    element: Roles,
    label: 'Roles',
    icon: 'Security',
    // Page-specific child navigation
    pageChildren: [
      { path: '/roles', label: 'All Roles', icon: 'Security' },
    ],
    children: [
      {
        path: '/roles',
        element: Roles,
        label: 'All Roles',
        icon: 'Security',
      },
      {
        path: '/roles/new',
        element: RoleForm,
        label: 'Create Role',
        icon: 'Add',
        hideFromMenu: true,
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/roles/:roleName',
        element: RoleDetails,
        label: 'Role Details',
        hideFromMenu: true,
      },
      {
        path: '/roles/:roleName/edit',
        element: RoleForm,
        label: 'Edit Role',
        hideFromMenu: true,
      },
      {
        path: '/roles/:roleName/permissions',
        element: RolePermissions,
        label: 'Role Permissions',
        hideFromMenu: true,
      },
    ],
  },
  // {
  //   path: '/reports',
  //   element: Reports,
  //   label: 'Reports',
  //   icon: 'Assessment',
  // },
  {
    path: '/settings',
    element: Settings,
    label: 'Settings',
    icon: 'Settings',
    // Page-specific child navigation
    pageChildren: [
      { path: '/settings/pos-profile', label: 'POS Profile', icon: 'PointOfSale' },
      { path: '/settings/business', label: 'Business', icon: 'Business' },
      { path: '/settings/etims', label: 'eTIMS', icon: 'Settings' },
      { path: '/settings/bank-accounts', label: 'Bank Accounts', icon: 'AccountBalance' },
      { path: '/settings/account-provisioning', label: 'Account Provisioning', icon: 'AccountBalance' },
      { path: '/settings/payment-methods', label: 'Payment Methods', icon: 'CreditCard' },
      { path: '/settings/payment-gateways', label: 'Payment Gateways', icon: 'CreditCard' },
      { path: '/settings/inventory-discounts', label: 'Inventory Discounts', icon: 'LocalOffer' },
      { path: '/settings/loyalty-programs', label: 'Loyalty Programs', icon: 'Star' },
      { path: '/settings/audit-trail', label: 'Audit Trail', icon: 'History' },
      { path: '/settings/approvals', label: 'Approvals', icon: 'FactCheck' },
      { path: '/settings/payment-matching', label: 'Payment Matching', icon: 'CompareArrows' },
      { path: '/settings/sales-people', label: 'Sales People', icon: 'People' },
      { path: '/settings/security', label: 'Security', icon: 'Security' },
      { path: '/settings/new-look', label: 'New look', icon: 'Settings' },
    ],
    children: [
      {
        path: '/settings/pos-profile',
        element: POSProfileSettings,
        label: 'POS Profile',
        icon: 'PointOfSale',
      },
      {
        path: '/settings/business',
        element: BusinessSettings,
        label: 'Business',
        icon: 'Business',
      },
      {
        path: '/settings/etims',
        element: ETIMSSettings,
        label: 'eTIMS',
        icon: 'Settings',
      },
      {
        path: '/settings/bank-accounts',
        element: BankAccounts,
        label: 'Bank Accounts',
        icon: 'AccountBalance',
      },
      {
        path: '/settings/account-provisioning',
        element: AccountProvisioning,
        label: 'Account Provisioning',
        icon: 'AccountBalance',
      },
      {
        path: '/settings/payment-methods',
        element: PaymentMethods,
        label: 'Payment Methods',
        icon: 'CreditCard',
      },
      {
        path: '/settings/payment-gateways',
        element: PaymentGateways,
        label: 'Payment Gateways',
        icon: 'CreditCard',
      },
      {
        path: '/settings/inventory-discounts',
        element: InventoryDiscounts,
        label: 'Inventory Discounts',
        icon: 'LocalOffer',
      },
      {
        path: '/settings/loyalty-programs',
        element: LoyaltyPrograms,
        label: 'Loyalty Programs',
        icon: 'Star',
      },
      {
        path: '/settings/audit-trail',
        element: AuditTrail,
        label: 'Audit Trail',
        icon: 'History',
      },
      {
        path: '/settings/approvals',
        element: Approvals,
        label: 'Approvals',
        icon: 'FactCheck',
      },
      {
        path: '/settings/payment-matching',
        element: PaymentMatching,
        label: 'Payment Matching',
        icon: 'CompareArrows',
      },
      {
        path: '/settings/sales-people',
        element: SalesPeople,
        label: 'Sales People',
        icon: 'People',
      },
      {
        path: '/settings/security',
        element: Security,
        label: 'Security',
        icon: 'Security',
      },
      {
        path: '/settings/new-look',
        element: NewLook,
        label: 'New look',
        icon: 'Settings',
      },
      // Dynamic routes (not in sidebar, accessed via links)
      {
        path: '/settings/inventory-discounts/new',
        element: DiscountRuleForm,
        label: 'New Discount Rule',
        hideFromMenu: true,
      },
      {
        path: '/settings/inventory-discounts/:id/edit',
        element: DiscountRuleForm,
        label: 'Edit Discount Rule',
        hideFromMenu: true,
      },
    ],
  },
  {
    path: '/reports',
    element: Reports,
    label: 'Reports',
    icon: 'Assessment',
    // Page-specific child navigation
    pageChildren: [
      { path: '/reports', label: 'Overview', icon: 'Dashboard' },
      { path: '/reports/sales-analytics', label: 'Sales Analytics', icon: 'TrendingUp' },
      { path: '/reports/inventory-summary', label: 'Inventory Summary', icon: 'Summarize' },
      { path: '/reports/inventory-valuation', label: 'Inventory Valuation', icon: 'Inventory2' },
      { path: '/reports/stock-movement', label: 'Stock Movement', icon: 'SwapHoriz' },
      { path: '/reports/aging-stock', label: 'Aging Stock', icon: 'Schedule' },
      { path: '/reports/performance-metrics', label: 'Performance Metrics', icon: 'Analytics' },
    ],
    children: [
      {
        path: '/reports',
        element: Reports,
        label: 'All Reports',
        icon: 'Dashboard',
      },
      {
        path: '/reports/sales-analytics',
        element: SalesAnalytics,
        label: 'Sales Analytics',
        icon: 'TrendingUp',
      },
      {
        path: '/reports/inventory-summary',
        element: InventorySummary,
        label: 'Inventory Summary',
        icon: 'Summarize',
      },
      {
        path: '/reports/inventory-valuation',
        element: InventoryValuation,
        label: 'Inventory Valuation',
        icon: 'Inventory2',
        children: [
          {
            path: '/reports/inventory-valuation/value-by-category',
            element: ValueByCategory,
            label: 'Value by Category',
            hideFromMenu: true,
          },
          {
            path: '/reports/inventory-valuation/cost-method-comparison',
            element: CostMethodComparison,
            label: 'Cost Method Comparison',
            hideFromMenu: true,
          },
          {
            path: '/reports/inventory-valuation/value-trends',
            element: ValueTrends,
            label: 'Value Trends',
            hideFromMenu: true,
          },
        ],
      },
      {
        path: '/reports/stock-movement',
        element: StockMovement,
        label: 'Stock Movement',
        icon: 'SwapHoriz',
        children: [
          {
            path: '/reports/stock-movement/turnover',
            element: TurnoverReport,
            label: 'Inventory Turnover',
            hideFromMenu: true,
          },
          {
            path: '/reports/stock-movement/days-on-hand',
            element: DaysOnHand,
            label: 'Days on Hand',
            hideFromMenu: true,
          },
          {
            path: '/reports/stock-movement/movement-patterns',
            element: MovementPatterns,
            label: 'Movement Patterns',
            hideFromMenu: true,
          },
        ],
      },
      {
        path: '/reports/aging-stock',
        element: AgingStock,
        label: 'Aging Stock',
        icon: 'Schedule',
        children: [
          {
            path: '/reports/aging-stock/stock-aging',
            element: StockAging,
            label: 'Stock Aging',
            hideFromMenu: true,
          },
          {
            path: '/reports/aging-stock/obsolescence-risk',
            element: ObsolescenceRisk,
            label: 'Obsolescence Risk',
            hideFromMenu: true,
          },
          {
            path: '/reports/aging-stock/aging-recommendations',
            element: AgingRecommendations,
            label: 'Aging Recommendations',
            hideFromMenu: true,
          },
        ],
      },
      {
        path: '/reports/performance-metrics',
        element: PerformanceMetrics,
        label: 'Performance Metrics',
        icon: 'Analytics',
        children: [
          {
            path: '/reports/performance-metrics/accuracy',
            element: AccuracyReport,
            label: 'Inventory Accuracy',
            hideFromMenu: true,
          },
          {
            path: '/reports/performance-metrics/variance',
            element: VarianceReport,
            label: 'Inventory Variance',
            hideFromMenu: true,
          },
          {
            path: '/reports/performance-metrics/adjustment-trends',
            element: AdjustmentTrends,
            label: 'Adjustment Trends',
            hideFromMenu: true,
          },
          {
            path: '/reports/performance-metrics/transfer-efficiency',
            element: TransferEfficiency,
            label: 'Transfer Efficiency',
            hideFromMenu: true,
          },
        ],
      },
    ],
  },

];

// All routes (for 404 handling)
export const routes = [
  ...publicRoutes,
  ...protectedRoutesWithoutLayout,
  ...protectedRoutes,
  {
    path: '*',
    element: NotFound,
    label: 'Not Found',
  },
];

// Helper function to get route by path
export const getRouteByPath = (path) => {
  return routes.find((route) => route.path === path);
};

// Helper function to get all navigation routes (excludes 404 and public routes)
export const getNavigationRoutes = () => {
  return protectedRoutes;
};

