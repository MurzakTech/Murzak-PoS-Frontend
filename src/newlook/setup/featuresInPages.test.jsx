/**
 * Ticket P5-4, acceptance check AC-33: the answer to "What do you sell?" makes the matching features appear in the screens, and only
 * ADDS: a pharmacy gets the Expiry tab on Stock levels; a retail shop sees Barcode and Unit first on New product; and a shop whose
 * own expiry dates already show the tab keeps it. With the answer missing, or the New look off, the screens are as they were.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import StockLevelsPage from '../stock/StockLevelsPage';
import NewProductPage from '../products/NewProductPage';
import { getStockLevels } from '../../api/stockLevelsApi';
import { listCategories, listUnits } from '../../api/productsListApi';
import { getMyAccess } from '../../api/accessApi';
import { getBusinessFeatures, NO_FEATURES } from '../../api/setupApi';
import { useNewLook } from '../NewLookProvider';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/stockLevelsApi', () => ({ getStockLevels: jest.fn(), findProducts: jest.fn(), stockIn: jest.fn(), stockOut: jest.fn(), getCountSheet: jest.fn(), submitCount: jest.fn() }));
jest.mock('../../api/productsListApi', () => ({ ...jest.requireActual('../../api/productsListApi'), createProduct: jest.fn(), listCategories: jest.fn(), listUnits: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../api/setupApi', () => ({ ...jest.requireActual('../../api/setupApi'), getBusinessFeatures: jest.fn() }));
jest.mock('../NewLookProvider', () => ({ useNewLook: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: [{ name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 }] } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));

const answer = (expiry) => ({
  tab: 'overview',
  features: { expiry, locations: 1 },
  canChange: true,
  role: 'owner',
  categories: [],
  rows: [],
  total: 0,
  page: 1,
  pageSize: 20,
  pages: 1,
  tiles: { items: 0, low: 0, out_of_stock: 0, stock_value: 0 },
});

const kindOf = (kind, on) => ({ company: 'Demo Shop', kind, features: { ...NO_FEATURES, ...on }, openingCash: 0 });
const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const showStock = async (url = '/new-look/stock') => {
  getMyAccess.mockResolvedValue({ tier: 'owner', can: { cost_of_goods: true } });
  render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <StockLevelsPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await screen.findByRole('tablist', { name: 'Stock levels views' });
  await waitFor(() => expect(getStockLevels).toHaveBeenCalled());
};
const tabNames = () => within(screen.getByRole('tablist', { name: 'Stock levels views' })).getAllByRole('tab').map((t) => t.textContent);

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  useNewLook.mockReturnValue({ enabled: true, status: 'ready', company: 'Demo Shop' });
  listCategories.mockResolvedValue({ categories: [], total: 0, productTotal: 0 });
  listUnits.mockResolvedValue([{ name: 'Nos', uom_name: 'Nos' }]);
  window.innerWidth = 1280;
});

describe('Stock levels, the Expiry tab', () => {
  test('a pharmacy gets the Expiry tab even before it has recorded one expiry date', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf('pharmacy', { expiry: true, prescriptionOnly: true }));
    getStockLevels.mockResolvedValue(answer(false));
    await showStock();
    await waitFor(() => expect(tabNames()).toContain('Expiry'));
  });

  test('a shop that did not answer, and has no expiry dates, has no Expiry tab', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf(null, {}));
    getStockLevels.mockResolvedValue(answer(false));
    await showStock();
    await waitFor(() => expect(getBusinessFeatures).toHaveBeenCalled());
    expect(tabNames()).not.toContain('Expiry');
  });

  test('a shop whose own batches have expiry dates keeps the tab whatever it answered (nothing shown today is hidden)', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf('retail', { barcodesFirst: true }));
    getStockLevels.mockResolvedValue(answer(true));
    await showStock();
    await waitFor(() => expect(tabNames()).toContain('Expiry'));
  });

  test('a link to Expiry stays on Expiry for a pharmacy, and does not bounce while the answer is on its way', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf('pharmacy', { expiry: true }));
    getStockLevels.mockResolvedValue({ ...answer(false), tab: 'expiry', rows: [] });
    await showStock('/new-look/stock/expiry');
    await waitFor(() => expect(getBusinessFeatures).toHaveBeenCalled());
    await waitFor(() => expect(tabNames()).toContain('Expiry'));
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/stock/expiry');
  });

  test('a link to Expiry in a shop without it still goes to Overview', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf(null, {}));
    getStockLevels.mockResolvedValue(answer(false));
    await showStock('/new-look/stock/expiry');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/new-look/stock'));
    await waitFor(() => expect(screen.getByTestId('where').textContent).not.toMatch(/expiry/));
  });

  test('with the New look off the answer is never asked for', async () => {
    useNewLook.mockReturnValue({ enabled: false, status: 'ready', company: 'Demo Shop' });
    getStockLevels.mockResolvedValue(answer(false));
    await showStock();
    expect(getBusinessFeatures).not.toHaveBeenCalled();
    expect(tabNames()).not.toContain('Expiry');
  });
});

describe('New product, barcode and unit first', () => {
  const showForm = async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { cost_of_goods: true, profit: true } });
    render(
      <MemoryRouter initialEntries={['/new-look/products/new']}>
        <AccessProvider userKey="beth">
          <ToastProvider>
            <NewProductPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await screen.findByRole('button', { name: 'More options' });
    await waitFor(() => expect(listCategories).toHaveBeenCalled());
  };

  test('a retail shop sees Barcode and Unit without opening More options', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf('retail', { barcodesFirst: true, unitsFirst: true }));
    await showForm();
    await waitFor(() => expect(screen.getByLabelText('Barcode')).toBeVisible());
    expect(screen.getByRole('combobox', { name: /Unit/ })).toBeVisible();
    expect(screen.getAllByLabelText('Barcode')).toHaveLength(1);
    expect(screen.getAllByRole('combobox', { name: /Unit/ })).toHaveLength(1);
  });

  test('any other shop keeps them under More options, as before', async () => {
    getBusinessFeatures.mockResolvedValue(kindOf('services', { servicesFirst: true }));
    await showForm();
    await waitFor(() => expect(getBusinessFeatures).toHaveBeenCalled());
    expect(screen.getByLabelText('Barcode')).not.toBeVisible();
    expect(screen.getAllByLabelText('Barcode')).toHaveLength(1);
  });
});
