/* eslint-disable testing-library/no-node-access -- a card, a row or a table row is found from its own heading or name with closest(), because none of them has a role or label of its own to ask for */
/**
 * The Settings page (ticket P5-3, AC-32): six sections in a side list, each an address that opens the same section on refresh,
 * the bare address opening Business, ?section= kept, and the server calls of every section reached through one page.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import SettingsPage from './SettingsPage';
import TillSettingsPage from './TillSettingsPage';
import { getMyAccess } from '../../api/accessApi';
import { getCompany } from '../../api/businessApi';
import { getPosProfile } from '../../api/tillOptionsApi';
import { getPaymentMethods } from '../../api/paymentMethodsApi';
import { getEtimsStatus } from '../../api/taxApi';
import { listTeam } from '../../api/teamApi';
import { getTwoFactorStatus } from '../../api/twoFactorApi';
import { listAuditEvents } from '../../api/auditApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../api/businessApi', () => ({ ...jest.requireActual('../../api/businessApi'), getCompany: jest.fn(), updateCompany: jest.fn() }));
jest.mock('../../api/tillOptionsApi', () => ({ getPosProfile: jest.fn(), updatePosProfile: jest.fn() }));
jest.mock('../../api/paymentMethodsApi', () => ({ getPaymentMethods: jest.fn(), setPaymentMethod: jest.fn() }));
jest.mock('../../api/taxApi', () => ({ getEtimsStatus: jest.fn() }));
jest.mock('../../api/teamApi', () => ({ listTeam: jest.fn() }));
jest.mock('../../api/twoFactorApi', () => ({ getTwoFactorStatus: jest.fn() }));
jest.mock('../../api/auditApi', () => ({ listAuditEvents: jest.fn() }));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const renderAt = (address, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A', pos_industry: { industry_code: 'retail' } } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[address]}>
        <AccessProvider userKey="amina">
          <Routes>
            <Route path="/new-look/settings/till" element={<TillSettingsPage />} />
            <Route path="/new-look/settings" element={<SettingsPage />} />
            <Route path="/new-look/settings/:section" element={<SettingsPage />} />
            <Route path="*" element={<p>Somewhere else</p>} />
          </Routes>
          <Where />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  getCompany.mockResolvedValue({ name: 'Shop A', companyName: 'Shop A', abbr: 'SA', taxId: '', country: 'Kenya', currency: 'KES', address: { line1: '', line2: '', city: '', state: '', pincode: '' }, phone: '', email: '', contact: { firstName: '', lastName: '', email: '', mobile: '', phone: '' } });
  getPosProfile.mockResolvedValue({ name: 'Main', updateStock: true, allowDiscountChange: true, allowRateChange: true, allowPartialPayment: false });
  getPaymentMethods.mockResolvedValue({ methods: [{ key: 'cash', label: 'Cash', enabled: true, available: true, modes: ['Cash'], needs_code: false }], other: [] });
  getEtimsStatus.mockResolvedValue({ found: false, active: false, test: false });
  listTeam.mockResolvedValue({ company: 'Shop A', me: 'a@shop.test', members: [], counts: { total: 0, active: 0 }, tiers: { grant: {}, owner_roles: [], manager_roles: [] } });
  getTwoFactorStatus.mockResolvedValue(false);
  listAuditEvents.mockResolvedValue({ events: [], hasMore: false });
});

test('has a side list of the six sections, with the open one marked', async () => {
  renderAt('/new-look/settings/tax');
  const nav = screen.getByRole('navigation', { name: 'Settings sections' });
  expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Business', 'Brand and receipts', 'Till and payments', 'Tax', 'Team and security', 'Advanced']);
  expect(within(nav).getByRole('link', { name: 'Tax' })).toHaveAttribute('aria-current', 'page');
  expect(within(nav).getByRole('link', { name: 'Business' })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('heading', { level: 1, name: 'Tax' })).toBeInTheDocument();
  await screen.findByText('Not set up');
});

test('the bare address opens Business', async () => {
  renderAt('/new-look/settings');
  expect(await screen.findByRole('heading', { level: 1, name: 'Business' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('/new-look/settings/business');
  await screen.findByLabelText('Tax ID (KRA PIN)');
});

test('the bare address keeps what was asked for in the address', async () => {
  renderAt('/new-look/settings?section=brands');
  await screen.findByRole('heading', { level: 1, name: 'Business' });
  expect(screen.getByTestId('where')).toHaveTextContent('/new-look/settings/business?section=brands');
});

test('each section opens from the side list, and the address changes with it', async () => {
  renderAt('/new-look/settings/business');
  await screen.findByLabelText('Tax ID (KRA PIN)');
  const nav = screen.getByRole('navigation', { name: 'Settings sections' });
  userEvent.click(within(nav).getByRole('link', { name: 'Team and security' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Team and security' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('/new-look/settings/team');
  userEvent.click(within(nav).getByRole('link', { name: 'Advanced' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Advanced' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Brands' })).toBeInTheDocument();
  userEvent.click(within(nav).getByRole('link', { name: 'Till and payments' }));
  expect(await screen.findByRole('switch', { name: 'Cash' })).toBeInTheDocument();
});

test('a refresh on any section opens the same section', async () => {
  const { unmount } = renderAt('/new-look/settings/advanced?section=units');
  expect(await screen.findByRole('heading', { level: 1, name: 'Advanced' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Units' }).closest('li')).toHaveAttribute('aria-current', 'true');
  unmount();
  renderAt('/new-look/settings/team');
  expect(await screen.findByRole('heading', { level: 1, name: 'Team and security' })).toBeInTheDocument();
});

test('Till and payments keeps the payment method switches and adds the till options and the device choice', async () => {
  renderAt('/new-look/settings/till');
  expect(await screen.findByRole('switch', { name: 'Cash' })).toBeInTheDocument();
  expect(await screen.findByRole('switch', { name: 'Take sold items out of stock' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Payment gateways' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Settings sections' })).toBeInTheDocument();
});

test('every section is reached through the existing server calls (the saved business name is the signed-in business)', async () => {
  renderAt('/new-look/settings/business');
  await waitFor(() => expect(getCompany).toHaveBeenCalledWith('Shop A'));
  renderAt('/new-look/settings/team');
  await waitFor(() => expect(listTeam).toHaveBeenCalledWith({ company: 'Shop A' }));
});

test('a link to another section with unsaved changes asks first', async () => {
  renderAt('/new-look/settings/business');
  const tax = await screen.findByLabelText('Tax ID (KRA PIN)');
  userEvent.type(tax, 'P123456789A');
  userEvent.click(within(screen.getByRole('navigation', { name: 'Settings sections' })).getByRole('link', { name: 'Tax' }));
  const ask = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
  userEvent.click(within(ask).getByRole('button', { name: 'Leave without saving' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Tax' })).toBeInTheDocument();
});
