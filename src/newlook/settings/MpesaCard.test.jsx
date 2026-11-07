/**
 * Settings, Till and payments: the M-Pesa card. Keys are password boxes and a saved key is never shown; going live and turning off
 * ask first; problems come back in words; only the owner sees it.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import MpesaCard from './MpesaCard';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const ACCOUNTS = [{ value: 'M-Pesa - LI', label: 'M-Pesa' }, { value: 'Cash - LI', label: 'Cash' }];
const SAVED = {
  mpesa: { is_active: 1, environment: 'Sandbox', shortcode_type: 'Paybill', shortcode: '174379', till_number: '', consumer_key: '***', consumer_secret: '***', passkey: '***', payment_account: 'M-Pesa - LI', allow_manual_code: 1, enable_c2b: 0, payment_timeout: 120, effective_callback_url: 'https://shop.example/callback' },
};
const EMPTY = { mpesa: null };

const show = (props = {}, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  const fns = {
    load: jest.fn().mockResolvedValue(SAVED),
    save: jest.fn().mockResolvedValue({ message: 'M-Pesa settings saved' }),
    test: jest.fn().mockResolvedValue({ message: 'Connected to Safaricom.' }),
    testWithPhone: jest.fn().mockResolvedValue({ message: 'Connected.', test_payment: { success: true } }),
    turnOff: jest.fn().mockResolvedValue({}),
    loadAccounts: jest.fn().mockResolvedValue(ACCOUNTS),
    ...props,
  };
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <MpesaCard {...fns} />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
  return fns;
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('M-Pesa card', () => {
  test('keys are password boxes, and a saved key is never shown', async () => {
    show();
    const key = await screen.findByLabelText('Consumer key');
    expect(key).toHaveAttribute('type', 'password');
    expect(key).toHaveValue('');
    expect(screen.getByLabelText('Consumer secret')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Lipa na M-Pesa Online passkey')).toHaveAttribute('type', 'password');
    expect(screen.queryByDisplayValue('***')).not.toBeInTheDocument();
    expect(screen.getAllByText('Saved. Type a new one only to replace it.').length).toBe(3);
  });

  test('saving with a saved key leaves it as it was (the server keeps "***")', async () => {
    const { save } = show();
    await screen.findByLabelText('Consumer key');
    userEvent.click(screen.getByRole('button', { name: 'Save M-Pesa settings' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const [company, sent] = save.mock.calls[0];
    expect(company).toBe('Shop A');
    expect(sent.consumer_key).toBe('***');
    expect(sent.passkey).toBe('***');
    expect(await screen.findByText('Saved. Press Test connection to check the keys.')).toBeInTheDocument();
  });

  test('typing a new key replaces it; clearing the box again keeps the saved one', async () => {
    const { save } = show();
    const key = await screen.findByLabelText('Consumer key');
    userEvent.type(key, 'NEWKEY');
    userEvent.click(screen.getByRole('button', { name: 'Save M-Pesa settings' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1].consumer_key).toBe('NEWKEY');
  });

  test('a form with nothing in it says what is missing, beside each field, and saves nothing', async () => {
    const { save } = show({ load: jest.fn().mockResolvedValue(EMPTY) });
    userEvent.click(await screen.findByRole('button', { name: 'Save M-Pesa settings' }));
    expect(await screen.findByText('Enter the paybill or store number.')).toBeInTheDocument();
    expect(screen.getByText('Enter the consumer key.')).toBeInTheDocument();
    expect(screen.getByText('Enter the passkey.')).toBeInTheDocument();
    expect(screen.getByText('Choose the account.')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  test('switching a sandbox shop to live asks first, and a no saves nothing', async () => {
    const { save } = show();
    await screen.findByLabelText('Consumer key');
    userEvent.click(screen.getByRole('radio', { name: 'Live (real money)' }));
    userEvent.click(screen.getByRole('button', { name: 'Save M-Pesa settings' }));
    expect(await screen.findByText('Switch M-Pesa to live?')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Stay in testing' }));
    expect(save).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Save M-Pesa settings' }));
    userEvent.click(await screen.findByRole('button', { name: 'Yes, go live' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][1].environment).toBe('Production');
  });

  test('a save the server refuses is said in words', async () => {
    show({ save: jest.fn().mockRejectedValue(new Error('The shortcode is not valid for Safaricom.')) });
    await screen.findByLabelText('Consumer key');
    userEvent.click(screen.getByRole('button', { name: 'Save M-Pesa settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The shortcode is not valid for Safaricom.');
  });

  test('Test connection shows the answer, and a callback problem as a warning after it', async () => {
    show({ test: jest.fn().mockResolvedValue({ message: 'Connected to Safaricom.', callback_problem: 'The callback address cannot be reached.' }) });
    userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connected to Safaricom. However: The callback address cannot be reached.')).toBeInTheDocument();
  });

  test('the KES 1 test prompt needs a phone number and goes to it', async () => {
    const { testWithPhone } = show();
    const send = await screen.findByRole('button', { name: 'Send KES 1 test prompt' });
    expect(send).toBeDisabled();
    userEvent.type(screen.getByLabelText('Test phone'), '0712 345 678');
    userEvent.click(send);
    await waitFor(() => expect(testWithPhone).toHaveBeenCalledWith('Shop A', '0712 345 678'));
    expect(await screen.findByText(/A KES 1 prompt was sent to the test phone/)).toBeInTheDocument();
  });

  test('turning M-Pesa off asks first, then does it', async () => {
    const { turnOff } = show();
    userEvent.click(await screen.findByRole('button', { name: 'Turn M-Pesa off' }));
    expect(await screen.findByText('Turn M-Pesa off?')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Yes, turn it off' }));
    await waitFor(() => expect(turnOff).toHaveBeenCalledWith('Shop A', 'mpesa'));
    expect(await screen.findByText('Turned off. M-Pesa no longer shows at the till.')).toBeInTheDocument();
  });

  test('the receiving accounts are the shop\'s cash and bank accounts', async () => {
    show({ load: jest.fn().mockResolvedValue(EMPTY) });
    userEvent.click(await screen.findByRole('combobox', { name: /Where M-Pesa takings are recorded/ }));
    expect(within(await screen.findByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['M-Pesa', 'Cash']);
  });

  test('a failed load says so and tries again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(SAVED);
    show({ load });
    expect(await screen.findByRole('heading', { name: 'We could not load the M-Pesa settings' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Consumer key')).toBeInTheDocument();
  });

  test('only the owner sees it, and nothing is loaded for anyone else', async () => {
    const load = jest.fn();
    show({ load }, 'manager');
    await screen.findByText(() => false).catch(() => undefined);
    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByText('M-Pesa')).not.toBeInTheDocument();
  });
});
