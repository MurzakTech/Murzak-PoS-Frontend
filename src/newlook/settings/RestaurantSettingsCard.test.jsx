import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RestaurantSettingsCard from './RestaurantSettingsCard';

jest.mock('./useSettingsUser', () => () => ({ company: 'Bar Ltd' }));

const SETTINGS = { service_charge_percent: 0, platforms: [{ name: 'Glovo', commission_percent: 25 }], happy_hours: [], tables: {}, can_change: true };
const STORES = { outlets: [{ warehouse: 'Main - BL', name: 'Main' }] };

test('the owner sets a service charge and tables, and they are saved together', async () => {
  const save = jest.fn().mockImplementation(async ({ settings }) => ({ ...settings, can_change: true }));
  render(<RestaurantSettingsCard load={jest.fn().mockResolvedValue(SETTINGS)} loadStores={jest.fn().mockResolvedValue(STORES)} save={save} />);
  await userEvent.type(await screen.findByLabelText('Service charge (%)'), '10');
  await userEvent.type(screen.getByLabelText('Main'), 'T1-T3');
  await userEvent.click(screen.getByRole('button', { name: 'Add a happy hour' }));
  await userEvent.type(screen.getByLabelText('Discount (%)'), '20');
  await userEvent.type(screen.getByLabelText('Menu sections'), 'Beer');
  await userEvent.click(screen.getByRole('button', { name: 'Save restaurant settings' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const sent = save.mock.calls[0][0].settings;
  expect(sent.service_charge_percent).toBe(10);
  expect(sent.tables).toEqual({ 'Main - BL': ['T1', 'T2', 'T3'] });
  expect(sent.platforms).toEqual([{ name: 'Glovo', commission_percent: 25 }]);
  expect(sent.happy_hours[0]).toMatchObject({ percent: 20, groups: ['Beer'], start: '17:00', end: '19:00' });
  expect(await screen.findByText('Restaurant settings saved.')).toBeInTheDocument();
});

test('a cashier sees the settings but cannot change them', async () => {
  render(<RestaurantSettingsCard load={jest.fn().mockResolvedValue({ ...SETTINGS, can_change: false })} loadStores={jest.fn().mockResolvedValue(STORES)} save={jest.fn()} />);
  expect(await screen.findByText('Only the owner and managers can change these.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save restaurant settings' })).not.toBeInTheDocument();
});
