import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OutletIndustryCard from './OutletIndustryCard';

jest.mock('./useSettingsUser', () => () => ({ company: 'Duka Ltd' }));

const data = (extra = {}) => ({
  company: 'Duka Ltd',
  business_profile: 'general',
  outlets: [
    { warehouse: 'Main - DL', name: 'Main', industry: '', profile: 'general', label: 'General shop' },
    { warehouse: 'Chemist - DL', name: 'Chemist', industry: 'PHARMACY', profile: 'pharmacy', label: 'Pharmacy' },
  ],
  options: [
    { value: 'REST', label: 'Restaurant' },
    { value: 'PHARMACY', label: 'Pharmacy' },
  ],
  can_change: true,
  ...extra,
});

test('each store shows its own kind of shop, and a store with none follows the business', async () => {
  render(<OutletIndustryCard load={jest.fn().mockResolvedValue(data())} save={jest.fn()} />);
  expect(await screen.findByText('Main')).toBeInTheDocument();
  expect(screen.getByText('Kind of shop, by store')).toBeInTheDocument();
  expect(screen.getByText('Same as the business (General shop)')).toBeInTheDocument();
  expect(screen.getAllByText('Pharmacy').length).toBeGreaterThan(0);
});

test('the owner picks a kind of shop for a store and it is saved at once', async () => {
  const load = jest.fn().mockResolvedValue(data());
  const save = jest.fn().mockResolvedValue({});
  render(<OutletIndustryCard load={load} save={save} />);
  await screen.findByText('Main');
  const boxes = screen.getAllByRole('combobox');
  await userEvent.click(boxes[0]);
  await userEvent.click(await screen.findByRole('option', { name: 'Restaurant' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ warehouse: 'Main - DL', industry: 'REST', company: 'Duka Ltd' }));
  expect(await screen.findByText('Main saved.')).toBeInTheDocument();
});

test('a manager sees the stores but cannot change them', async () => {
  render(<OutletIndustryCard load={jest.fn().mockResolvedValue(data({ can_change: false }))} save={jest.fn()} />);
  expect(await screen.findByText('Only the owner can change this.')).toBeInTheDocument();
});

test('when the stores cannot be read, nothing is shown', async () => {
  const { container } = render(<OutletIndustryCard load={jest.fn().mockRejectedValue(new Error('old server'))} save={jest.fn()} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});
