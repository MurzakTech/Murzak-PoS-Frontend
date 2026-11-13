import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsurersCard from './InsurersCard';

jest.mock('./useSettingsUser', () => () => ({ company: 'Chemist Ltd' }));

test('the owner adds an insurer with its co-payment and saves', async () => {
  const save = jest.fn().mockImplementation(async ({ insurers }) => ({ insurers: insurers.map((i) => ({ ...i, customer: i.name })), can_change: true }));
  render(<InsurersCard load={jest.fn().mockResolvedValue({ insurers: [], can_change: true })} save={save} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Add an insurer' }));
  await userEvent.type(screen.getByLabelText('Insurer'), 'AAR');
  await userEvent.type(screen.getByLabelText('Co-payment (%)'), '10');
  await userEvent.type(screen.getByLabelText('Co-payment (KES)'), '200');
  await userEvent.click(screen.getByRole('button', { name: 'Save insurers' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toEqual({ insurers: [{ name: 'AAR', copay_percent: 10, copay_amount: 200 }], company: 'Chemist Ltd' });
  expect(await screen.findByText('Insurers saved.')).toBeInTheDocument();
});

test('a cashier sees the insurers but cannot change them', async () => {
  render(<InsurersCard load={jest.fn().mockResolvedValue({ insurers: [{ name: 'AAR', copay_percent: 10, copay_amount: 0 }], can_change: false })} save={jest.fn()} />);
  expect(await screen.findByText('Only the owner or a manager can change the insurers.')).toBeInTheDocument();
  expect(screen.getByLabelText('Insurer')).toBeDisabled();
});
