import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Select from '../components/Select';
import Switch from '../components/Switch';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import { formatMoney } from '../components/format';
import { PageHeader } from '../shell';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import {
  getEcommerceSettings,
  saveEcommerceSettings,
  testWooCommerceConnection,
  syncWooCommerceCatalog,
  getEcommerceProducts,
} from '../../api/ecommerceApi';
import './ecommerce.css';

const TABS = [
  { key: 'woocommerce', label: 'WooCommerce Connector', to: '/ecommerce' },
  { key: 'digital_store', label: 'Digital Catalog & WhatsApp', to: '/ecommerce?tab=digital_store' },
  { key: 'products', label: 'Online Product Catalog', to: '/ecommerce?tab=products' },
];

const EcommercePage = () => {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'woocommerce';

  const user = useAppSelector((s) => s.auth.user);
  const company = user?.company || user?.custom_company || '';
  const { warehouses } = useAppSelector((s) => s.warehouse);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // WooCommerce Configuration
  const [enabled, setEnabled] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [autoSyncStock, setAutoSyncStock] = useState(true);
  const [autoSyncProducts, setAutoSyncProducts] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [status, setStatus] = useState('not_configured');
  const [lastSync, setLastSync] = useState(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);

  // Products table
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const storeOptions = useMemo(
    () => (warehouses || []).map((w) => ({ value: w.name, label: w.warehouse_name || w.name })),
    [warehouses]
  );

  const loadSettings = useCallback(async () => {
    try {
      const res = await getEcommerceSettings(company);
      if (res) {
        setEnabled(Boolean(res.enabled));
        setStoreUrl(res.store_url || '');
        setConsumerKey(res.consumer_key || '');
        setConsumerSecret(res.consumer_secret || '');
        setWarehouse(res.warehouse || '');
        setAutoSyncStock(res.auto_sync_stock !== false);
        setAutoSyncProducts(res.auto_sync_products !== false);
        setSyncOrders(res.sync_orders !== false);
        setStatus(res.status || 'not_configured');
        setLastSync(res.last_sync || null);
        setCatalogCount(res.catalog_count || 0);
        setStockCount(res.stock_items_count || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load e-commerce settings');
    }
  }, [company, toast]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await getEcommerceProducts({ company, warehouse, search });
      setProducts(res.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProductsLoading(false);
    }
  }, [company, warehouse, search]);

  useEffect(() => {
    if (company) {
      dispatch(listWarehouses({ company, limit: 1000 }));
      loadSettings();
    }
  }, [company, dispatch, loadSettings]);

  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts();
    }
  }, [activeTab, loadProducts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEcommerceSettings(
        {
          enabled,
          store_url: storeUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          warehouse,
          auto_sync_stock: autoSyncStock,
          auto_sync_products: autoSyncProducts,
          sync_orders: syncOrders,
        },
        company
      );
      toast.success('E-Commerce settings saved successfully');
      loadSettings();
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testWooCommerceConnection({
        storeUrl,
        consumerKey,
        consumerSecret,
        company,
      });
      toast.success(res.message || 'Successfully connected to WooCommerce!');
      setStatus('connected');
    } catch (err) {
      toast.error(err.message || 'Could not connect to WooCommerce store');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncWooCommerceCatalog({ company, warehouse });
      toast.success(res.message || 'Store catalog synchronized successfully!');
      loadSettings();
      if (activeTab === 'products') loadProducts();
    } catch (err) {
      toast.error(err.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  const digitalStoreUrl = `${window.location.origin}/store/${encodeURIComponent(
    company.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  )}`;

  const copyStoreLink = () => {
    navigator.clipboard?.writeText(digitalStoreUrl);
    toast.success('Store link copied to clipboard!');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Hello! Check out our online store catalog and order directly:\n${digitalStoreUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const productColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div>
          <strong>{r.item_name}</strong>
          <span className="nl-stock-sub">{r.item_code}</span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => r.category || '–' },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (r) => formatMoney(r.price),
    },
    {
      key: 'stock',
      header: 'In Stock',
      align: 'right',
      render: (r) => `${r.stock} ${r.unit || ''}`,
    },
    {
      key: 'status',
      header: 'Sync Status',
      render: (r) => (
        <span className={`nl-ready-pill nl-ready-pill--${r.sync_status}`}>
          {r.sync_status === 'ready' ? 'Ready to sync' : 'Missing price'}
        </span>
      ),
    },
  ];

  return (
    <div className="nl-ecommerce">
      <PageHeader
        title="E-Commerce & Online Store"
        subtitle="Connect your shop to WooCommerce or start selling online with real-time stock sync"
        tabs={{
          label: 'E-commerce sections',
          tabs: TABS,
          value: activeTab,
        }}
      />

      {/* Overview Stat Tiles */}
      <div className="nl-ecommerce__tiles">
        <Card>
          <span className="nl-stock-tile__label">Store Status</span>
          <span className="nl-stock-tile__value">
            <span
              className={`nl-status-pill nl-status-pill--${
                status === 'connected' ? 'connected' : enabled ? 'configured' : 'disconnected'
              }`}
            >
              <span className="nl-status-pill__dot" />
              {status === 'connected' ? 'Connected' : enabled ? 'Configured' : 'Offline / Off'}
            </span>
          </span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">Catalog Products</span>
          <span className="nl-stock-tile__value">{catalogCount}</span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">Items with Stock</span>
          <span className="nl-stock-tile__value">{stockCount}</span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">Last Catalog Sync</span>
          <span className="nl-stock-tile__value" style={{ fontSize: 'var(--body-size)', fontWeight: 'normal' }}>
            {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
          </span>
        </Card>
      </div>

      {/* Main Tabs Body */}
      {activeTab === 'woocommerce' ? (
        <Card title="WooCommerce REST API Integration">
          <div className="nl-ecommerce__guide">
            <strong>How to connect WooCommerce with your POS:</strong>
            <ol>
              <li>Log in to your WordPress Admin dashboard and ensure WooCommerce is active.</li>
              <li>Go to <strong>WooCommerce &gt; Settings &gt; Advanced &gt; REST API</strong> and click <strong>Add Key</strong>.</li>
              <li>Set Description to <em>Murzak POS</em> and Permissions to <strong>Read/Write</strong>.</li>
              <li>Copy and paste your Store URL, Consumer Key (<code>ck_...</code>), and Consumer Secret (<code>cs_...</code>) below.</li>
            </ol>
          </div>

          <div className="nl-ecommerce__form-grid">
            <Field
              label="WooCommerce Store URL"
              placeholder="https://example.com"
              value={storeUrl}
              onChange={setStoreUrl}
              helper="Your website root address (must use HTTPS)"
            />

            <Select
              label="Stock Warehouse for Online Orders"
              options={storeOptions}
              value={warehouse}
              onChange={setWarehouse}
              placeholder="Select warehouse"
              helper="Which store/warehouse fulfills online orders"
            />

            <Field
              label="Consumer Key"
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={consumerKey}
              onChange={setConsumerKey}
              autoComplete="off"
            />

            <Field
              label="Consumer Secret"
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={consumerSecret}
              onChange={setConsumerSecret}
              type="password"
              autoComplete="off"
            />
          </div>

          <div className="nl-ecommerce__toggles">
            <Switch
              label="Enable WooCommerce Integration"
              description="Activate automated sync between this POS and your WordPress/WooCommerce store"
              checked={enabled}
              onChange={setEnabled}
            />

            <Switch
              label="Real-time Inventory Sync"
              description="Update WooCommerce stock whenever an in-store sale or stock change occurs to prevent overselling"
              checked={autoSyncStock}
              onChange={setAutoSyncStock}
            />

            <Switch
              label="Sync Product Catalog"
              description="Automatically create or update product titles, descriptions, categories, and prices on WooCommerce"
              checked={autoSyncProducts}
              onChange={setAutoSyncProducts}
            />
          </div>

          <div className="nl-ecommerce__actions">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                icon="check"
                loading={testing}
                disabled={!storeUrl || saving}
                onClick={handleTest}
              >
                Test Connection
              </Button>
              <Button
                variant="secondary"
                icon="refresh"
                loading={syncing}
                disabled={!enabled || saving}
                onClick={handleSync}
              >
                Sync Catalog Now
              </Button>
            </div>

            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Integration Settings
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === 'digital_store' ? (
        <Card title="Instant Digital Catalog & WhatsApp Ordering">
          <p style={{ color: 'var(--ink-2)', margin: '0 0 var(--space-4) 0' }}>
            Don't have a WordPress or WooCommerce website yet? Share your live Murzak digital store link directly with customers on WhatsApp, Instagram, or Facebook. Customers can view your menu/products and place orders directly to your till.
          </p>

          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <span className="nl-label">Your Storefront Link</span>
              <div className="nl-ecommerce__share-box">
                <span style={{ flex: 1 }}>{digitalStoreUrl}</span>
                <Button variant="secondary" size="small" icon="copy" onClick={copyStoreLink}>
                  Copy link
                </Button>
                <Button variant="secondary" size="small" icon="share" onClick={shareWhatsApp}>
                  Share on WhatsApp
                </Button>
              </div>
            </div>

            <div className="nl-ecommerce__guide">
              <strong>Features of your instant online catalog:</strong>
              <ul>
                <li>Live product availability based on real-time POS inventory.</li>
                <li>Instant WhatsApp order generation with product list and total price.</li>
                <li>Fast, mobile-friendly design optimized for Kenya & East Africa.</li>
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === 'products' ? (
        <Card title="Online Product Catalog Preview">
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between' }}>
            <Field
              placeholder="Search products..."
              value={search}
              onChange={setSearch}
              style={{ maxWidth: '300px', margin: 0 }}
            />
            <Button variant="secondary" icon="refresh" loading={syncing} onClick={handleSync}>
              Sync Products
            </Button>
          </div>

          <Table
            caption="Products available for e-commerce synchronization"
            columns={productColumns}
            rows={products}
            loading={productsLoading}
            empty={{
              title: 'No products found',
              description: 'Add products in the Products section to sync them online.',
            }}
          />
        </Card>
      ) : null}
    </div>
  );
};

export default EcommercePage;
