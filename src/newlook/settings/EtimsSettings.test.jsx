/** Settings, Tax: the eTIMS details card. The PIN and branch are shown and not changed; going live and switching off ask first. */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import EtimsSettingsCard from './EtimsSettingsCard';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const DETAILS = { name: 'E-1', pin: 'P123456789A', branch: '00', deviceSerial: 'DEV-001', active: true, test: true };

const show = (props = {}, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  const fns = {
    load: jest.fn().mockResolvedValue(DETAILS),
    save: jest.fn().mockResolvedValue({ details: DETAILS, changed: ['dvcsrlno'], message: 'eTIMS settings updated successfully' }),
    ...props,
  };
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <EtimsSettingsCard {...fns} />
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

test('shows the PIN and branch as read-only, and the serial number and switches as they are', async () => {
  show();
  expect(await screen.findByLabelText('KRA PIN')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('KRA PIN')).toHaveValue('P123456789A');
  expect(screen.getByLabelText('Branch ID')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Device serial number')).toHaveValue('DEV-001');
  expect(screen.getByRole('switch', { name: 'Send sales and bills to KRA' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Test mode' })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Save eTIMS details' })).toBeDisabled();
});

test('changing the serial number saves it, with the switches as they stand', async () => {
  const { save } = show();
  const serial = await screen.findByLabelText('Device serial number');
  userEvent.clear(serial);
  userEvent.type(serial, 'DEV-002');
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ company: 'Shop A', name: 'E-1', deviceSerial: 'DEV-002', test: true, active: true }));
  expect(await screen.findByText('Saved.')).toBeInTheDocument();
});

test('a serial number with strange characters is refused beside the field', async () => {
  const { save } = show();
  const serial = await screen.findByLabelText('Device serial number');
  userEvent.clear(serial);
  userEvent.type(serial, 'DEV<2>');
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  expect(await screen.findByText('Use letters, digits and dashes only.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

test('going live asks first; a no changes nothing', async () => {
  const { save } = show();
  userEvent.click(await screen.findByRole('switch', { name: 'Test mode' }));
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  expect(await screen.findByText('Report real sales to KRA?')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Stay in test mode' }));
  expect(save).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  userEvent.click(await screen.findByRole('button', { name: 'Yes, go live' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ test: false, active: true })));
});

test('switching reporting off asks first', async () => {
  const { save } = show();
  userEvent.click(await screen.findByRole('switch', { name: 'Send sales and bills to KRA' }));
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  expect(await screen.findByText('Stop sending to KRA?')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Yes, stop sending' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ active: false })));
});

test('a refusal from the server is said in words', async () => {
  show({ save: jest.fn().mockRejectedValue(new Error('Add the business KRA PIN as its Tax ID first.')) });
  const serial = await screen.findByLabelText('Device serial number');
  userEvent.type(serial, 'X');
  userEvent.click(screen.getByRole('button', { name: 'Save eTIMS details' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Add the business KRA PIN as its Tax ID first.');
});

test('a business with no eTIMS settings is told support sets them up', async () => {
  show({ load: jest.fn().mockResolvedValue(null) });
  expect(await screen.findByText(/Support creates them once/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save eTIMS details' })).not.toBeInTheDocument();
});

test('only the owner sees it', async () => {
  const load = jest.fn();
  show({ load }, 'manager');
  await screen.findByText(() => false).catch(() => undefined);
  expect(load).not.toHaveBeenCalled();
});
