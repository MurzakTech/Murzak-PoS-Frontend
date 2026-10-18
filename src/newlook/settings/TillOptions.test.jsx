/**
 * Settings, Till and payments: the Till options card and the This device card (ticket P5-3, AC-32). Each switch saves on its
 * own and says "Saved"; a refusal comes back beside the switch; only the owner can change the server settings; the auto-print
 * choice is kept on the device under the key the till reads.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import TillOptionsCard from './TillOptionsCard';
import DeviceCard from './DeviceCard';
import TillSection from './TillSection';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const PROFILE = { name: 'Main till', updateStock: true, allowDiscountChange: true, allowRateChange: false, allowPartialPayment: false };

const show = (ui, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">{ui}</AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('Till options', () => {
  test('shows the four switches with their state and a plain sentence under each', async () => {
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} />);
    expect(await screen.findByRole('switch', { name: 'Take sold items out of stock' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Let cashiers change discounts' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Let cashiers change prices at the till' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Let customers pay part now and the rest later' })).not.toBeChecked();
    expect(screen.getByText('A cashier can type a different price for an item while selling.')).toBeInTheDocument();
  });

  test('asks the existing call for the signed-in business', async () => {
    const load = jest.fn().mockResolvedValue(PROFILE);
    show(<TillOptionsCard load={load} />);
    await screen.findByRole('switch', { name: 'Take sold items out of stock' });
    expect(load).toHaveBeenCalledWith('Shop A');
  });

  test('switching one on saves the whole set with that change, says Saved, and refreshes the till profile', async () => {
    const save = jest.fn().mockImplementation(async ({ profile }) => profile);
    const afterSave = jest.fn().mockResolvedValue();
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} save={save} afterSave={afterSave} />);
    const rate = await screen.findByRole('switch', { name: 'Let cashiers change prices at the till' });
    await waitFor(() => expect(rate).toBeEnabled());
    userEvent.click(rate);
    await waitFor(() => expect(save).toHaveBeenCalledWith({ company: 'Shop A', profile: { ...PROFILE, allowRateChange: true } }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(afterSave).toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Let cashiers change prices at the till' })).toBeChecked();
  });

  test('two quick changes are sent one after the other, the second on top of the first', async () => {
    const save = jest.fn().mockImplementation(async ({ profile }) => profile);
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} save={save} afterSave={jest.fn()} />);
    const rate = await screen.findByRole('switch', { name: 'Let cashiers change prices at the till' });
    await waitFor(() => expect(rate).toBeEnabled());
    userEvent.click(rate);
    userEvent.click(screen.getByRole('switch', { name: 'Let customers pay part now and the rest later' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].profile).toEqual({ ...PROFILE, allowRateChange: true, allowPartialPayment: true });
  });

  test('a refusal comes back beside the switch and the switch moves back', async () => {
    const save = jest.fn().mockRejectedValue(new Error('You cannot change this till profile.'));
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} save={save} afterSave={jest.fn()} />);
    const stock = await screen.findByRole('switch', { name: 'Take sold items out of stock' });
    await waitFor(() => expect(stock).toBeEnabled());
    userEvent.click(stock);
    expect(await screen.findByText('You cannot change this till profile.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Take sold items out of stock' })).toBeChecked();
  });

  test('nobody but the owner can change them', async () => {
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} />, 'manager');
    expect(await screen.findByText('Only the business owner can change these.')).toBeInTheDocument();
    screen.getAllByRole('switch').forEach((s) => expect(s).toBeDisabled());
  });

  test('a failed load says so and tries again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(PROFILE);
    show(<TillOptionsCard load={load} />);
    expect(await screen.findByRole('heading', { name: 'We could not load the till options' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('switch', { name: 'Take sold items out of stock' })).toBeInTheDocument();
  });

  test('a shop with no till profile is told, with no switches', async () => {
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(null)} />);
    expect(await screen.findByText('Your shop has no till set up yet. Finish the set-up first.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  test('the profile name and the kind of invoice stay on the current screen', async () => {
    show(<TillOptionsCard load={jest.fn().mockResolvedValue(PROFILE)} />);
    expect(await screen.findByRole('link', { name: 'Open till settings' })).toHaveAttribute('href', '/settings/pos-profile?legacy=1');
  });
});

describe('This device', () => {
  test('auto-print is on until switched off, as the till treats it', () => {
    show(<DeviceCard />);
    expect(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' })).toBeChecked();
  });

  test('switching it off is kept on this device under the key the till reads, and says Saved', async () => {
    show(<DeviceCard />);
    userEvent.click(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(localStorage.getItem('pos_auto_print')).toBe('false');
  });

  test('reads what the till last stored', () => {
    localStorage.setItem('pos_auto_print', 'false');
    show(<DeviceCard />);
    expect(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' })).not.toBeChecked();
  });

  test('a device that will not keep the choice says so and the switch moves back', async () => {
    const write = jest.fn().mockRejectedValue(new Error('This device did not keep the choice.'));
    show(<DeviceCard write={write} />);
    userEvent.click(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' }));
    expect(await screen.findByText('This device did not keep the choice.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' })).toBeChecked();
  });

  test('anyone may change it for their own device', () => {
    show(<DeviceCard />, 'cashier');
    expect(screen.getByRole('switch', { name: 'Print the receipt automatically after a sale' })).toBeEnabled();
  });
});

describe('the links to the current screens', () => {
  test('payment gateways, On credit, bank accounts, discounts and loyalty open their current screens with legacy=1', async () => {
    show(<TillSection options={{ load: jest.fn().mockResolvedValue(PROFILE) }} payments={{ load: jest.fn().mockResolvedValue({ methods: [], other: [] }) }} />);
    const expected = {
      'Open Payment gateways': '/settings/payment-gateways?legacy=1',
      'Open On credit': '/settings/payment-methods?legacy=1',
      'Open Bank accounts': '/settings/bank-accounts?legacy=1',
      'Open Inventory discounts': '/settings/inventory-discounts?legacy=1',
      'Open Loyalty programmes': '/settings/loyalty-programs?legacy=1',
    };
    Object.entries(expected).forEach(([name, href]) => expect(screen.getByRole('link', { name })).toHaveAttribute('href', href));
  });

  test('no key, secret or phone number can be typed on this section', async () => {
    show(<TillSection options={{ load: jest.fn().mockResolvedValue(PROFILE) }} payments={{ load: jest.fn().mockResolvedValue({ methods: [], other: [] }) }} />);
    await screen.findByRole('switch', { name: 'Take sold items out of stock' });
    expect(screen.queryByLabelText(/consumer|secret|passkey|key|paybill|till number|password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
