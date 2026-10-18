/**
 * Ticket P5-4, acceptance check AC-33 at the screen level: Home carries the "Set up now" banner for a new store only. A shop that
 * has data, a person who is not the owner, and a shop with the New look off see Home exactly as before.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import HomePage from '../home/HomePage';
import { getOverview } from '../../api/overviewApi';
import { getMyAccess } from '../../api/accessApi';
import { getSetupState } from '../../api/setupApi';
import { useNewLook } from '../NewLookProvider';

jest.mock('../../api/overviewApi', () => ({ getOverview: jest.fn(), getProductsWithoutCost: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../api/setupApi', () => ({ ...jest.requireActual('../../api/setupApi'), getSetupState: jest.fn() }));
jest.mock('../NewLookProvider', () => ({ useNewLook: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { first_name: 'Amina', company: 'Demo Shop' } }, warehouse: { warehouses: [] }, staff: { staffUsers: [] } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));
jest.mock('../../store/staffSlice', () => ({ getStaffUsers: jest.fn(() => ({ type: 'y' })) }));

// A shop with no sales at all: Home shows its first-time panel
const noSales = () => ({
  role: 'owner',
  period: { key: '30d', from: '2026-09-14', to: '2026-10-12', days: 30, days_of_data: 0 },
  updated_at: '10:00',
  hero: { today_total: 0, same_weekday_last_week_total: 0, change_pct: null, sales_count: 0, average_basket: 0, cash_in_till: null, mpesa: { amount: 0, payments: 0 }, till: { state: 'none' } },
  tiles: { revenue: { value: 0, spark: [], days_of_data: 0 }, low_stock: { count: 0, out_of_stock: 0 } },
  charts: { sales: [], payments: [], top_products: [], busiest_hours: [] },
  attention: [],
  errors: {},
});
const setup = (over = {}) => ({ offer: true, needsSetup: true, inProgress: false, canEdit: true, doneSteps: [], skippedSteps: [], ...over });

const showHome = async () => {
  render(
    <MemoryRouter initialEntries={['/new-look']}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <HomePage />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getOverview).toHaveBeenCalled());
  await screen.findByRole('heading', { level: 1 });
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  getMyAccess.mockResolvedValue({ tier: 'owner', can: { profit: true, money_owed: true } });
  getOverview.mockResolvedValue(noSales());
  useNewLook.mockReturnValue({ enabled: true, status: 'ready', company: 'Demo Shop' });
});

test('a new store sees the banner on Home, above its first-time checklist', async () => {
  getSetupState.mockResolvedValue(setup());
  await showHome();
  expect(await screen.findByRole('button', { name: 'Set up now' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
});

test('a shop that already has data sees no banner', async () => {
  getSetupState.mockResolvedValue(setup({ offer: false, needsSetup: false }));
  await showHome();
  await waitFor(() => expect(getSetupState).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
});

test('with the New look off Home does not even ask', async () => {
  useNewLook.mockReturnValue({ enabled: false, status: 'ready', company: 'Demo Shop' });
  getSetupState.mockResolvedValue(setup());
  await showHome();
  expect(getSetupState).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
});
