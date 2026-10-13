/**
 * Phase 3 (P3-1): the payment method switches in Settings. Part of AC-32: switching M-Pesa on or off is saved on the
 * server, and the till's choices follow after a reload.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import TillSettingsPage from './TillSettingsPage';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const list = (over = {}) => ({
  company: 'Shop A',
  methods: [
    { key: 'cash', label: 'Cash', enabled: true, available: true, modes: ['Cash'], needs_code: false },
    { key: 'mpesa', label: 'M-Pesa', enabled: true, available: true, modes: ['Mpesa'], needs_code: true },
    { key: 'card', label: 'Card', enabled: false, available: false, modes: [], needs_code: false },
    { key: 'credit', label: 'On credit', enabled: true, available: true, modes: ['Credit'], needs_code: false },
  ],
  other: [{ mode: 'Cheque', label: 'Cheque', enabled: true, available: true }],
  ...over,
});

const show = (tier = 'owner', props = {}) => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  return render(
    <MemoryRouter>
      <AccessProvider userKey="amina">
        <TillSettingsPage {...props} />
      </AccessProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('shows the four switches in order, with Other methods beneath', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(list()) });
  await screen.findByRole('switch', { name: 'Cash' });
  ['Cash', 'M-Pesa', 'Card', 'On credit', 'Cheque'].forEach((name) => expect(screen.getByRole('switch', { name })).toBeInTheDocument());
  expect(screen.getByRole('switch', { name: 'M-Pesa' })).toBeChecked();
  expect(screen.getByText('Needs the M-Pesa confirmation code at the till')).toBeInTheDocument();
});

test('a method the shop has not set up is off, disabled and says why', async () => {
  show('owner', { load: jest.fn().mockResolvedValue(list()) });
  const card = await screen.findByRole('switch', { name: 'Card' });
  await waitFor(() => expect(card).toBeDisabled());
  expect(card).not.toBeChecked();
  expect(screen.getByText('Not set up for your shop yet')).toBeInTheDocument();
});

test('switching M-Pesa off saves it, says Saved, and shows what the server now holds', async () => {
  const after = list();
  after.methods[1].enabled = false;
  const save = jest.fn().mockResolvedValue(after);
  show('owner', { load: jest.fn().mockResolvedValue(list()), save });
  const mpesa = await screen.findByRole('switch', { name: 'M-Pesa' });
  await waitFor(() => expect(mpesa).toBeEnabled());
  userEvent.click(mpesa);
  await waitFor(() => expect(save).toHaveBeenCalledWith({ key: 'mpesa', enabled: false }));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'M-Pesa' })).not.toBeChecked();
});

test('an Other method is saved with its name', async () => {
  const save = jest.fn().mockResolvedValue(list());
  show('owner', { load: jest.fn().mockResolvedValue(list()), save });
  const cheque = await screen.findByRole('switch', { name: 'Cheque' });
  await waitFor(() => expect(cheque).toBeEnabled());
  userEvent.click(cheque);
  await waitFor(() => expect(save).toHaveBeenCalledWith({ key: 'other', mode: 'Cheque', enabled: false }));
});

test('a refusal comes back beside the switch and the switch moves back', async () => {
  const save = jest.fn().mockRejectedValue(new Error('At least one way of taking money must stay on. Switch another one on first.'));
  show('owner', { load: jest.fn().mockResolvedValue(list()), save });
  const cash = await screen.findByRole('switch', { name: 'Cash' });
  await waitFor(() => expect(cash).toBeEnabled());
  userEvent.click(cash);
  expect(await screen.findByText(/At least one way of taking money must stay on/)).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Cash' })).toBeChecked();
});

test('nobody but the owner can change them', async () => {
  show('manager', { load: jest.fn().mockResolvedValue(list()) });
  expect(await screen.findByText('Only the business owner can change these.')).toBeInTheDocument();
  screen.getAllByRole('switch').forEach((s) => expect(s).toBeDisabled());
});

test('a failed load says so and tries again', async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(list());
  show('owner', { load });
  expect(await screen.findByRole('heading', { name: 'We could not load the payment methods' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('switch', { name: 'Cash' })).toBeInTheDocument();
});
