import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Checkbox from '../components/Checkbox';
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
import OnlineOrdersTab from './OnlineOrdersTab';
import OnlineStoreTab from './OnlineStoreTab';
import WebhookCard from './WebhookCard';
import S from './strings.ecommerce';
import fill from '../labels/fill';
import { setItemsOnline } from '../../api/onlineStoreApi';
import './ecommerce.css';

const TABS = [
  { key: 'orders', label: S.tabs.orders, to: '/ecommerce?tab=orders' },
  { key: 'digital_store', label: S.tabs.store, to: '/ecommerce?tab=digital_store' },
  { key: 'woocommerce', label: S.tabs.woocommerce, to: '/ecommerce' },
  { key: 'products', label: S.tabs.products, to: '/ecommerce?tab=products' },
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
  const [lastOrder, setLastOrder] = useState({ message: '', at: '' });
  // The settings as last loaded from, or saved to, the server: used to tell whether the form has unsaved changes
  const savedSettings = useRef('');

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
        setLastOrder({ message: res.last_order_message || '', at: res.last_order_at || '' });
        savedSettings.current = JSON.stringify({
          enabled: Boolean(res.enabled),
          store_url: res.store_url || '',
          consumer_key: res.consumer_key || '',
          consumer_secret: res.consumer_secret || '',
          warehouse: res.warehouse || '',
          auto_sync_stock: res.auto_sync_stock !== false,
          auto_sync_products: res.auto_sync_products !== false,
          sync_orders: res.sync_orders !== false,
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load e-commerce settings');
    }
  }, [company, toast]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await getEcommerceProducts({ company, warehouse, search, visibility: 'all' });
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

  // What the form holds now, as the server stores it
  const currentSettings = () => ({
    enabled,
    store_url: storeUrl,
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    warehouse,
    auto_sync_stock: autoSyncStock,
    auto_sync_products: autoSyncProducts,
    sync_orders: syncOrders,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEcommerceSettings(currentSettings(), company);
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
      // The server sends what it has saved, not what is typed in the form, so unsaved changes are saved first
      if (JSON.stringify(currentSettings()) !== savedSettings.current) {
        await saveEcommerceSettings(currentSettings(), company);
      }
      const res = await syncWooCommerceCatalog({ company, warehouse });
      if (res.status === 'partial') toast.info(fill(S.products.syncResult.partial, { message: res.message }));
      else toast.success(res.message || 'Store catalog synchronized successfully!');
      loadSettings();
      if (activeTab === 'products') loadProducts();
    } catch (err) {
      toast.error(err.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleShown = async (row, show) => {
    try {
      await setItemsOnline({ itemCodes: [row.item_code], show, company });
      setProducts((rows) => rows.map((r) => (r.item_code === row.item_code ? { ...r, show_online: show } : r)));
    } catch (err) {
      toast.error(err.message || S.products.updateFailed);
    }
  };

  const productColumns = [
    {
      key: 'product',
      header: S.page.columns.product,
      render: (r) => (
        <div>
          <strong>{r.item_name}</strong>
          <span className="nl-stock-sub">{r.item_code}</span>
        </div>
      ),
    },
    { key: 'category', header: S.page.columns.category, render: (r) => r.category || '–' },
    {
      key: 'price',
      header: S.page.columns.price,
      align: 'right',
      render: (r) => formatMoney(r.price),
    },
    {
      key: 'stock',
      header: S.page.columns.inStock,
      align: 'right',
      render: (r) => `${r.stock} ${r.unit || ''}`,
    },
    {
      key: 'show_online',
      header: S.products.shownOnline,
      render: (r) => (
        <Checkbox
          label={fill(S.products.shownLabel, { name: r.item_name })}
          checked={r.show_online !== false}
          onChange={(show) => toggleShown(r, show)}
        />
      ),
    },
    {
      key: 'status',
      header: S.page.columns.syncStatus,
      render: (r) => (
        <span className={`nl-ready-pill nl-ready-pill--${r.sync_status}`}>
          {r.sync_status === 'ready' ? S.page.syncReady : S.page.syncMissingPrice}
        </span>
      ),
    },
  ];

  return (
    <div className="nl-ecommerce">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        tabs={{
          label: S.page.sectionsLabel,
          tabs: TABS,
          value: activeTab,
        }}
      />

      {/* Overview Stat Tiles */}
      <div className="nl-ecommerce__tiles">
        <Card>
          <span className="nl-stock-tile__label">{S.page.tiles.status}</span>
          <span className="nl-stock-tile__value">
            <span
              className={`nl-status-pill nl-status-pill--${
                status === 'connected' ? 'connected' : enabled ? 'configured' : 'disconnected'
              }`}
            >
              <span className="nl-status-pill__dot" />
              {status === 'connected' ? S.page.statusNames.connected : enabled ? S.page.statusNames.configured : S.page.statusNames.off}
            </span>
          </span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">{S.page.tiles.catalog}</span>
          <span className="nl-stock-tile__value">{catalogCount}</span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">{S.page.tiles.withStock}</span>
          <span className="nl-stock-tile__value">{stockCount}</span>
        </Card>

        <Card>
          <span className="nl-stock-tile__label">{S.page.tiles.lastSync}</span>
          <span className="nl-stock-tile__value" style={{ fontSize: 'var(--body-size)', fontWeight: 'normal' }}>
            {lastSync ? new Date(lastSync).toLocaleString() : S.page.never}
          </span>
        </Card>
      </div>

      {/* Main Tabs Body */}
      {activeTab === 'woocommerce' ? (
        <>
        <Card title={S.page.woo.title}>
          <div className="nl-ecommerce__guide">
            <strong>{S.page.woo.guideTitle}</strong>
            <ol>
              {S.page.woo.steps.map((parts, i) => (
                <li key={i}>
                  {parts.map((part, j) =>
                    part.tag ? React.createElement(part.tag, { key: j }, part.text) : <React.Fragment key={j}>{part.text}</React.Fragment>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="nl-ecommerce__form-grid">
            <Field
              label={S.page.woo.storeUrl}
              placeholder={S.page.woo.storeUrlPlaceholder}
              value={storeUrl}
              onChange={setStoreUrl}
              helper={S.page.woo.storeUrlHelp}
            />

            <Select
              label={S.page.woo.warehouse}
              options={storeOptions}
              value={warehouse}
              onChange={setWarehouse}
              placeholder={S.page.woo.warehousePlaceholder}
              helper={S.page.woo.warehouseHelp}
            />

            <Field
              label={S.page.woo.consumerKey}
              placeholder={S.page.woo.consumerKeyPlaceholder}
              value={consumerKey}
              onChange={setConsumerKey}
              autoComplete="off"
            />

            <Field
              label={S.page.woo.consumerSecret}
              placeholder={S.page.woo.consumerSecretPlaceholder}
              value={consumerSecret}
              onChange={setConsumerSecret}
              type="password"
              autoComplete="off"
            />
          </div>

          <div className="nl-ecommerce__toggles">
            <Switch
              label={S.page.woo.enable.label}
              description={S.page.woo.enable.description}
              checked={enabled}
              onChange={setEnabled}
            />

            <Switch
              label={S.page.woo.realtime.label}
              description={S.page.woo.realtime.description}
              checked={autoSyncStock}
              onChange={setAutoSyncStock}
            />

            <Switch
              label={S.page.woo.catalog.label}
              description={S.page.woo.catalog.description}
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
                {S.page.woo.test}
              </Button>
              <Button
                variant="secondary"
                icon="refresh"
                loading={syncing}
                disabled={!enabled || saving}
                onClick={handleSync}
              >
                {S.page.woo.syncNow}
              </Button>
            </div>

            <Button variant="primary" loading={saving} onClick={handleSave}>
              {S.page.woo.save}
            </Button>
          </div>
        </Card>
        <WebhookCard company={company} lastOrderMessage={lastOrder.message} lastOrderAt={lastOrder.at} />
        </>
      ) : null}

      {activeTab === 'orders' ? <OnlineOrdersTab company={company} /> : null}

      {activeTab === 'digital_store' ? <OnlineStoreTab company={company} locations={storeOptions.map((o) => ({ value: o.value, label: o.label }))} /> : null}

      {activeTab === 'products' ? (
        <Card title={S.page.preview.title}>
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between' }}>
            <Field
              placeholder={S.page.preview.search}
              value={search}
              onChange={setSearch}
              style={{ maxWidth: '300px', margin: 0 }}
            />
            <Button variant="secondary" icon="refresh" loading={syncing} onClick={handleSync}>
              {S.page.preview.sync}
            </Button>
          </div>

          <Table
            caption={S.page.preview.caption}
            columns={productColumns}
            rows={products}
            loading={productsLoading}
            empty={{
              title: S.page.preview.emptyTitle,
              description: S.page.preview.emptyDescription,
            }}
          />
        </Card>
      ) : null}
    </div>
  );
};

export default EcommercePage;
