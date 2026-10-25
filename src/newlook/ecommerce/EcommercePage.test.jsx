import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToastProvider } from '../components/Toast';
import EcommercePage from './EcommercePage';
import {
  getEcommerceSettings,
  saveEcommerceSettings,
  testWooCommerceConnection,
  syncWooCommerceCatalog,
  getEcommerceProducts,
} from '../../api/ecommerceApi';
import { getOnlineStore, listOnlineOrders, setItemsOnline } from '../../api/onlineStoreApi';

jest.mock('../../api/onlineStoreApi', () => ({
  getOnlineStore: jest.fn(),
  checkStoreSlug: jest.fn(),
  saveOnlineStore: jest.fn(),
  setItemsOnline: jest.fn(),
  listOnlineOrders: jest.fn(),
  getOnlineOrder: jest.fn(),
  setOnlineOrderStatus: jest.fn(),
  markOnlineOrderPaid: jest.fn(),
  createInvoiceForOnlineOrder: jest.fn(),
}));
jest.mock('../../api/ecommerceApi', () => ({
  getEcommerceSettings: jest.fn(),
  saveEcommerceSettings: jest.fn(),
  testWooCommerceConnection: jest.fn(),
  syncWooCommerceCatalog: jest.fn(),
  getEcommerceProducts: jest.fn(),
}));

const mockStore = configureStore({
  reducer: {
    auth: () => ({ user: { company: 'Test Company', roles: ['Administrator'] } }),
    warehouse: () => ({ warehouses: [{ name: 'Main - TC', warehouse_name: 'Main Store' }] }),
  },
});

const renderPage = (initialEntries = ['/ecommerce']) =>
  render(
    <Provider store={mockStore}>
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>
          <EcommercePage />
        </ToastProvider>
      </MemoryRouter>
    </Provider>
  );

describe('EcommercePage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getEcommerceSettings.mockResolvedValue({
      enabled: true,
      store_url: 'https://myshop.com',
      consumer_key: 'ck_1234****',
      consumer_secret: 'cs_1234****',
      warehouse: 'Main - TC',
      auto_sync_stock: true,
      auto_sync_products: true,
      sync_orders: true,
      status: 'connected',
      catalog_count: 42,
      stock_items_count: 35,
    });
    getEcommerceProducts.mockResolvedValue({
      rows: [
        { item_code: 'ITEM-1', item_name: 'Product 1', price: 100, stock: 15, unit: 'Nos', sync_status: 'ready' },
      ],
      total: 1,
    });
  });

  test('renders page title and stat tiles', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /E-Commerce & Online Store/i })).toBeInTheDocument();
    expect(screen.getByText('Store Status')).toBeInTheDocument();
    expect(screen.getByText('Catalog Products')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
  });

  test('renders WooCommerce connector tab and allows testing connection', async () => {
    testWooCommerceConnection.mockResolvedValue({
      success: true,
      message: 'Successfully connected to WooCommerce store!',
    });

    renderPage();
    const testBtn = await screen.findByRole('button', { name: /Test Connection/i });
    expect(testBtn).toBeInTheDocument();

    await waitFor(() => expect(testBtn).not.toBeDisabled());

    userEvent.click(testBtn);
    await waitFor(() => {
      expect(testWooCommerceConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          storeUrl: 'https://myshop.com',
          company: 'Test Company',
        })
      );
    });
  });

  describe('Sync Catalog Now', () => {
    beforeEach(() => {
      saveEcommerceSettings.mockResolvedValue({});
      syncWooCommerceCatalog.mockResolvedValue({ status: 'success', message: 'Sent 76 products to the online store (76 new, 0 updated)' });
    });

    test('saves what was typed first, because the server sends only what it has saved', async () => {
      renderPage();
      const key = await screen.findByLabelText('Consumer Key');
      await waitFor(() => expect(key).toHaveValue('ck_1234****'));
      userEvent.clear(key);
      userEvent.type(key, 'ck_brandnewkey');
      userEvent.click(screen.getByRole('button', { name: /Sync Catalog Now/i }));

      await waitFor(() => expect(syncWooCommerceCatalog).toHaveBeenCalled());
      expect(saveEcommerceSettings).toHaveBeenCalledWith(
        expect.objectContaining({ store_url: 'https://myshop.com', consumer_key: 'ck_brandnewkey' }),
        'Test Company'
      );
      expect(saveEcommerceSettings.mock.invocationCallOrder[0]).toBeLessThan(syncWooCommerceCatalog.mock.invocationCallOrder[0]);
    });

    test('does not touch the saved settings when nothing was changed', async () => {
      renderPage();
      const sync = await screen.findByRole('button', { name: /Sync Catalog Now/i });
      await waitFor(() => expect(screen.getByLabelText('Consumer Key')).toHaveValue('ck_1234****'));
      userEvent.click(sync);
      await waitFor(() => expect(syncWooCommerceCatalog).toHaveBeenCalled());
      expect(saveEcommerceSettings).not.toHaveBeenCalled();
    });

    test('does not sync when the settings could not be saved, and says why', async () => {
      saveEcommerceSettings.mockRejectedValue(new Error('Please enter a valid website URL, e.g. https://example.com'));
      renderPage();
      const key = await screen.findByLabelText('Consumer Key');
      await waitFor(() => expect(key).toHaveValue('ck_1234****'));
      userEvent.type(key, 'x');
      userEvent.click(screen.getByRole('button', { name: /Sync Catalog Now/i }));
      expect(await screen.findByText('Please enter a valid website URL, e.g. https://example.com')).toBeInTheDocument();
      expect(syncWooCommerceCatalog).not.toHaveBeenCalled();
    });
  });

  test('the online store tab gives the real store link to share', async () => {
    getOnlineStore.mockResolvedValue({ slug: 'duka-ya-amina', enabled: true, mpesa_ready: false, product_count: 42, links: {} });
    renderPage(['/ecommerce?tab=digital_store']);

    expect(await screen.findByText(`${window.location.origin}/shop/duka-ya-amina`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share on WhatsApp/i })).toBeInTheDocument();
  });
});

describe('EcommercePage by role', () => {
  const asRoles = (roles) =>
    configureStore({
      reducer: {
        auth: () => ({ user: { company: 'Test Company', roles } }),
        warehouse: () => ({ warehouses: [] }),
      },
    });
  const renderAs = (roles, entry = '/ecommerce') =>
    render(
      <Provider store={asRoles(roles)}>
        <MemoryRouter initialEntries={[entry]}>
          <ToastProvider>
            <EcommercePage />
          </ToastProvider>
        </MemoryRouter>
      </Provider>
    );

  beforeEach(() => {
    jest.resetAllMocks();
    getEcommerceSettings.mockResolvedValue({ enabled: true, consumer_secret: 'cs_secret' });
    getEcommerceProducts.mockResolvedValue({ rows: [], total: 0 });
    listOnlineOrders.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20 });
  });

  test('the owner sees all four tabs', async () => {
    renderAs(['Business Owner']);
    expect(await screen.findByRole('tab', { name: 'Online orders' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My online store' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My website (WooCommerce)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Online products' })).toBeInTheDocument();
  });

  test('an orders clerk sees only the orders, even when they ask for the website tab, and the website keys are never fetched', async () => {
    renderAs(['Online Orders Clerk'], '/ecommerce?tab=woocommerce');
    expect(await screen.findByRole('tab', { name: 'Online orders' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My website (WooCommerce)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My online store' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Online products' })).not.toBeInTheDocument();
    expect(screen.queryByText('WooCommerce REST API Integration')).not.toBeInTheDocument();
    expect(getEcommerceSettings).not.toHaveBeenCalled();
  });

  test('a role with no part of the module is told so', async () => {
    renderAs(['Desk User']);
    expect(await screen.findByText('You do not have access to the online store')).toBeInTheDocument();
  });

  test('shows or hides everything in the list in one go', async () => {
    getEcommerceProducts.mockResolvedValue({
      rows: [
        { item_code: 'A', item_name: 'Apple', price: 10, stock: 1, unit: 'Nos', sync_status: 'ready', show_online: true },
        { item_code: 'B', item_name: 'Bread', price: 50, stock: 1, unit: 'Nos', sync_status: 'ready', show_online: true },
      ],
      total: 2,
    });
    setItemsOnline.mockResolvedValue({});
    renderAs(['Item Manager'], '/ecommerce?tab=products');
    await screen.findByText('Apple');
    userEvent.click(screen.getByRole('button', { name: 'Hide all listed' }));
    await waitFor(() => expect(setItemsOnline).toHaveBeenCalledWith({ itemCodes: ['A', 'B'], show: false, company: 'Test Company' }));
    expect(await screen.findByText('2 products are now hidden from your online store.')).toBeInTheDocument();
    // A person who only chooses what is shown cannot send the catalogue to the website
    expect(screen.queryByRole('button', { name: /Sync Products/ })).not.toBeInTheDocument();
  });
});
