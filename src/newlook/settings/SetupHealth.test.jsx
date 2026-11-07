/**
 * Settings, Business: the Setup health card (Addendum C, R1). It lists what must be in place for the shop to work, says what
 * needs fixing in plain words, is for owners and managers only, and shows nothing when the answer cannot be read.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import SetupHealthCard from './SetupHealthCard';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const REPORT = {
  company: 'Shop A',
  ok: false,
  summary: { green: 1, amber: 1, red: 1 },
  checks: [
    { id: 'scheduler', title: 'Background jobs', status: 'red', detail: 'Background jobs are switched off.', where: 'Ask your technical support to turn the scheduler on for this site.' },
    { id: 'mpesa', title: 'M-Pesa', status: 'amber', detail: 'M-Pesa prompts are not ready: add the Lipa na M-Pesa passkey in Settings > Payment gateways.', where: 'Settings > Payment gateways.' },
    { id: 'cash', title: 'Cash payments', status: 'green', detail: 'Cash is set up.', where: '' },
  ],
};

const show = (load, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <SetupHealthCard load={load} />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

test('lists each check with its status in words, and says how many need fixing', async () => {
  show(jest.fn().mockResolvedValue(REPORT));
  expect(await screen.findByText('1 thing needs fixing before the shop works properly.')).toBeInTheDocument();
  expect(screen.getByText('Background jobs')).toBeInTheDocument();
  expect(screen.getByText('Needs fixing')).toBeInTheDocument();
  expect(screen.getByText('Worth a look')).toBeInTheDocument();
  expect(screen.getByText('Fine')).toBeInTheDocument();
  expect(screen.getByText(/passkey/)).toBeInTheDocument();
  expect(screen.getByText('Where to fix it: Settings > Payment gateways.')).toBeInTheDocument();
});

test('a line that needs attention links to the settings that fix it', async () => {
  show(jest.fn().mockResolvedValue(REPORT));
  const links = await screen.findAllByRole('link', { name: 'Go to these settings' });
  expect(links).toHaveLength(1); // M-Pesa; the scheduler has no screen to go to, and the cash line is fine
  expect(links[0].getAttribute('href')).toMatch(/settings\/till$/);
});

test('a line that is fine does not send the owner anywhere', async () => {
  show(jest.fn().mockResolvedValue({ ...REPORT, summary: { green: 1, amber: 0, red: 0 }, checks: [REPORT.checks[2]] }));
  expect(await screen.findByText('Everything needed is in place.')).toBeInTheDocument();
  expect(screen.queryByText(/Where to fix it/)).not.toBeInTheDocument();
});

test('shows nothing when the answer cannot be read', async () => {
  const load = jest.fn().mockResolvedValue(null);
  const { container } = show(load);
  await screen.findByText(() => false).catch(() => undefined);
  expect(load).toHaveBeenCalled();
  expect(container.querySelector('[data-card="setup-health"]')).toBeNull();
});

test('a cashier does not see it, and nothing is asked', async () => {
  const load = jest.fn().mockResolvedValue(REPORT);
  show(load, 'cashier');
  await screen.findByText(() => false).catch(() => undefined);
  expect(load).not.toHaveBeenCalled();
  expect(screen.queryByText('Setup health')).not.toBeInTheDocument();
});

test('shows how much is ready as a percentage, and warns about what needs fixing even when the list is closed', async () => {
  const user = userEvent;
  show(jest.fn().mockResolvedValue({ ...REPORT, percent: 33 }));
  expect(await screen.findByText('33% ready')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute('aria-valuenow', '33');
  expect(screen.getByRole('alert')).toHaveTextContent('Needs fixing now: Background jobs.');
  await user.click(screen.getByRole('button', { name: 'Hide details' }));
  expect(screen.queryByText('Cash payments')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Background jobs'); // the warning stays while the list is closed
  await user.click(screen.getByRole('button', { name: 'Show details' }));
  expect(screen.getByText('Cash payments')).toBeInTheDocument();
});

test('the list starts closed when everything is fine, and the choice is remembered', async () => {
  const user = userEvent;
  const fine = { ...REPORT, ok: true, percent: 100, summary: { green: 1, amber: 0, red: 0 }, checks: [REPORT.checks[2]] };
  const first = show(jest.fn().mockResolvedValue(fine));
  expect(await screen.findByText('100% ready')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Cash payments')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show details' }));
  expect(screen.getByText('Cash payments')).toBeInTheDocument();
  first.unmount();
  show(jest.fn().mockResolvedValue(fine));
  expect(await screen.findByText('Cash payments')).toBeInTheDocument(); // still open the next time
});

test('the heading reads right for one and for several', async () => {
  show(jest.fn().mockResolvedValue({ ...REPORT, summary: { green: 0, amber: 2, red: 0 }, checks: [REPORT.checks[1], REPORT.checks[1]] }));
  expect(await screen.findByText('2 things are worth a look. The shop can still work.')).toBeInTheDocument();
});
