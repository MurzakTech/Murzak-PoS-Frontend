import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopTypeCard from './ShopTypeCard';

const OPTIONS = [
  { value: 'retail', label: 'Retail shop', description: '' },
  { value: 'pharmacy', label: 'Pharmacy', description: '' },
];
const data = (extra = {}) => ({ company: 'Shop A', current: null, current_label: null, options: OPTIONS, can_change: true, next_change_on: null, next_change_text: '', ...extra });

const choose = async (user, name) => {
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name }));
};

test('an owner sets the shop type the first time without being asked to confirm', async () => {
  const user = userEvent;
  const save = jest.fn().mockResolvedValue(data({ current: 'retail', current_label: 'Retail shop', next_change_on: '2026-12-07', next_change_text: '07/12/2026' }));
  render(<ShopTypeCard load={jest.fn().mockResolvedValue(data())} save={save} />);
  await screen.findByText(/Not set yet/);
  await choose(user, 'Retail shop');
  await user.click(screen.getByRole('button', { name: 'Save shop type' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ industry: 'retail', company: undefined }));
  expect(await screen.findByText(/can be changed again on 07\/12\/2026/)).toBeInTheDocument();
});

test('changing a type that is already set asks first and says it cannot be changed again for 30 days', async () => {
  const user = userEvent;
  const save = jest.fn().mockResolvedValue(data({ current: 'pharmacy', current_label: 'Pharmacy' }));
  render(<ShopTypeCard load={jest.fn().mockResolvedValue(data({ current: 'retail', current_label: 'Retail shop' }))} save={save} />);
  await screen.findByText(/once every 30 days/);
  await choose(user, 'Pharmacy');
  await user.click(screen.getByRole('button', { name: 'Save shop type' }));
  expect(save).not.toHaveBeenCalled();
  expect(await screen.findByText(/from Retail shop to Pharmacy/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Change it' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ industry: 'pharmacy', company: undefined }));
});

test('while the waiting period runs the choice is locked and the date is shown', async () => {
  render(<ShopTypeCard load={jest.fn().mockResolvedValue(data({ current: 'retail', next_change_on: '2026-12-01', next_change_text: '01/12/2026' }))} save={jest.fn()} />);
  expect(await screen.findByText(/can be changed again on 01\/12\/2026/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save shop type' })).not.toBeInTheDocument();
});

test('a manager can see it but not change it', async () => {
  render(<ShopTypeCard load={jest.fn().mockResolvedValue(data({ current: 'retail', can_change: false }))} save={jest.fn()} />);
  expect(await screen.findByText('Only the business owner can change the shop type.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save shop type' })).not.toBeInTheDocument();
});

test('a refusal from the server is shown in words', async () => {
  const user = userEvent;
  const save = jest.fn().mockRejectedValue(new Error('Choose a shop type from the list.'));
  render(<ShopTypeCard load={jest.fn().mockResolvedValue(data())} save={save} />);
  await screen.findByText(/Not set yet/);
  await choose(user, 'Retail shop');
  await user.click(screen.getByRole('button', { name: 'Save shop type' }));
  expect(await screen.findByText('Choose a shop type from the list.')).toBeInTheDocument();
});

test('shows nothing when the answer cannot be read', async () => {
  const { container } = render(<ShopTypeCard load={jest.fn().mockResolvedValue(null)} save={jest.fn()} />);
  await waitFor(() => expect(container.querySelector('[data-card="shop-type"]')).toBeNull());
});
