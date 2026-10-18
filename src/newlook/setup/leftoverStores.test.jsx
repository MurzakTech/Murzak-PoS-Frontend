/**
 * Ticket P5-4, acceptance check AC-33: the places a new business comes with (Work In Progress, Finished Goods, Goods In Transit, All
 * Warehouses) stay out of every store list of the New look until a second real location is added. One rule everywhere: the one in
 * till/sellingLocations.js. These checks cover Home and Sales (the Store filter) and New purchase (Receive into).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import HomePage from '../home/HomePage';
import SalesPage from '../sales/SalesPage';
import NewPurchasePage from '../purchases/NewPurchasePage';
import { getOverview } from '../../api/overviewApi';
import { listSales } from '../../api/salesListApi';
import { findProductsToBuy, getPaymentModes, listSuppliers } from '../../api/purchasesListApi';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/overviewApi', () => ({ getOverview: jest.fn(), getProductsWithoutCost: jest.fn() }));
jest.mock('../../api/salesListApi', () => ({ listSales: jest.fn(), getSale: jest.fn(), takePayment: jest.fn() }));
jest.mock('../../api/purchasesListApi', () => ({ addPurchaseNote: jest.fn(), createDirectBill: jest.fn(), findProductsToBuy: jest.fn(), getPaymentModes: jest.fn(), getProductToBuy: jest.fn(), listSuppliers: jest.fn(), saveOrder: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
const mockShop = { warehouses: [] };
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: mockShop.warehouses }, staff: { staffUsers: [] } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));
jest.mock('../../store/staffSlice', () => ({ getStaffUsers: jest.fn(() => ({ type: 'y' })) }));

const real = (name) => ({ name: `${name} - DS`, warehouse_name: name, disabled: 0, is_group: 0 });
const LEFTOVERS = [
  { name: 'Work In Progress - DS', warehouse_name: 'Work In Progress', disabled: 0, is_group: 0 },
  { name: 'Finished Goods - DS', warehouse_name: 'Finished Goods', disabled: 0, is_group: 0 },
  { name: 'Goods In Transit - DS', warehouse_name: 'Goods In Transit', disabled: 0, is_group: 0 },
  { name: 'All Warehouses - DS', warehouse_name: 'All Warehouses', disabled: 0, is_group: 1 },
];
const ONE_SHOP = [real('Duka Kuu'), ...LEFTOVERS];
const TWO_SHOPS = [real('Duka Kuu'), real('Duka la Pili'), ...LEFTOVERS];

const overview = () => ({
  role: 'owner',
  period: { key: '30d', from: '2026-09-14', to: '2026-10-12', days: 30, days_of_data: 30 },
  updated_at: '10:00',
  cached: false,
  hero: { today_total: 100, same_weekday_last_week_total: 80, change_pct: 25, sales_count: 1, average_basket: 100, cash_in_till: null, mpesa: { amount: 0, payments: 0 }, till: { state: 'none' } },
  tiles: { revenue: { value: 100, spark: [], days_of_data: 30 }, low_stock: { count: 0, out_of_stock: 0 } },
  charts: { sales: [{ date: '2026-10-12', revenue: 100, count: 1 }], payments: [], top_products: [], busiest_hours: [] },
  attention: [],
  errors: {},
});

const inShell = (page) => (
  <MemoryRouter initialEntries={['/new-look']}>
    <AccessProvider userKey="amina">
      <ToastProvider>{page}</ToastProvider>
    </AccessProvider>
  </MemoryRouter>
);

beforeEach(() => {
  jest.resetAllMocks();
  getMyAccess.mockResolvedValue({ tier: 'owner', can: { profit: true, money_owed: true, cost_of_goods: true } });
  getOverview.mockResolvedValue(overview());
  listSales.mockResolvedValue({ rows: [], summary: { sold: 0, unpaid: 0, returned: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
  listSuppliers.mockResolvedValue([{ id: 'SUP-1', name: 'Bidco Africa' }]);
  getPaymentModes.mockResolvedValue([{ name: 'Cash', kind: 'cash' }]);
  findProductsToBuy.mockResolvedValue([]);
  window.innerWidth = 1280;
});

describe('Home, the Store filter', () => {
  test('a one-shop business with the default places beside it has no Store filter', async () => {
    mockShop.warehouses = ONE_SHOP;
    render(inShell(<HomePage />));
    await waitFor(() => expect(getOverview).toHaveBeenCalled());
    await screen.findByText('Average basket');
    await screen.findByRole('button', { name: 'Export' });
    expect(screen.queryByRole('combobox', { name: /Store/ })).not.toBeInTheDocument();
  });

  test('with a second real location the Store filter appears and lists only real locations', async () => {
    mockShop.warehouses = TWO_SHOPS;
    render(inShell(<HomePage />));
    const store = await screen.findByRole('combobox', { name: /Store/ });
    userEvent.click(store);
    expect(await screen.findByRole('option', { name: 'Duka la Pili' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Duka Kuu' })).toBeInTheDocument();
    ['Work In Progress', 'Finished Goods', 'Goods In Transit', 'All Warehouses'].forEach((name) => expect(screen.queryByRole('option', { name })).not.toBeInTheDocument());
  });
});

describe('Sales, the Store filter', () => {
  const open = async () => {
    render(inShell(<SalesPage />));
    await waitFor(() => expect(listSales).toHaveBeenCalled());
    await screen.findByRole('tab', { name: /All sales/ });
  };

  test('a one-shop business with the default places beside it has no Store filter', async () => {
    mockShop.warehouses = ONE_SHOP;
    await open();
    expect(screen.queryByRole('combobox', { name: /Store/ })).not.toBeInTheDocument();
  });

  test('with a second real location the Store filter lists only real locations', async () => {
    mockShop.warehouses = TWO_SHOPS;
    await open();
    userEvent.click(await screen.findByRole('combobox', { name: /Store/ }));
    expect(await screen.findByRole('option', { name: 'Duka la Pili' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Finished Goods' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Work In Progress' })).not.toBeInTheDocument();
  });
});

describe('New purchase, Receive into', () => {
  const open = async () => {
    render(inShell(<NewPurchasePage />));
    await waitFor(() => expect(listSuppliers).toHaveBeenCalled());
    userEvent.click(await screen.findByRole('button', { name: 'More options' }));
  };

  test('a one-shop business with the default places beside it is not asked where to receive', async () => {
    mockShop.warehouses = ONE_SHOP;
    await open();
    expect(screen.queryByRole('combobox', { name: 'Receive into' })).not.toBeInTheDocument();
  });

  test('with a second real location it is asked, and the default places are not offered', async () => {
    mockShop.warehouses = TWO_SHOPS;
    await open();
    userEvent.click(await screen.findByRole('combobox', { name: 'Receive into' }));
    expect(await screen.findByRole('option', { name: 'Duka la Pili' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Goods In Transit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'All Warehouses' })).not.toBeInTheDocument();
  });
});
