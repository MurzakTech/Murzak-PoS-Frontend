/* eslint-disable testing-library/no-node-access -- a card, a row or a table row is found from its own heading or name with closest(), because none of them has a role or label of its own to ask for */
/**
 * Settings, Tax and Advanced (ticket P5-3, AC-32): whether eTIMS is on (a read-only line with no secrets), links to the current
 * screens for what stays there, and the Advanced cards with a plain sentence each, outlined when the address names one.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import TaxSection from './TaxSection';
import AdvancedSection from './AdvancedSection';
import T from './strings.settings';

const show = (ui, user = { company: 'Shop A', pos_industry: { industry_code: 'pharmacy' } }) => {
  const store = configureStore({ reducer: { auth: () => ({ user }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
};

describe('Tax', () => {
  test('says eTIMS is on when the existing call says so, and links to the current screen', async () => {
    show(<TaxSection load={jest.fn().mockResolvedValue({ found: true, active: true, test: false })} />);
    expect(await screen.findByText('Your sales are being sent to the Kenya Revenue Authority.')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open eTIMS settings' })).toHaveAttribute('href', '/settings/etims?legacy=1');
  });

  test('asks the existing call for the signed-in business', async () => {
    const load = jest.fn().mockResolvedValue({ found: true, active: true, test: false });
    show(<TaxSection load={load} />);
    await screen.findByText('On');
    expect(load).toHaveBeenCalledWith('Shop A');
  });

  test('says test mode, off and not set up in words (an icon and a word, never colour alone)', async () => {
    const { unmount } = show(<TaxSection load={jest.fn().mockResolvedValue({ found: true, active: true, test: true })} />);
    expect(await screen.findByText('Test mode')).toBeInTheDocument();
    unmount();
    const view = show(<TaxSection load={jest.fn().mockResolvedValue({ found: true, active: false, test: false })} />);
    expect(await screen.findByText('Off')).toBeInTheDocument();
    view.unmount();
    show(<TaxSection load={jest.fn().mockResolvedValue({ found: false, active: false, test: false })} />);
    expect(await screen.findByText('Not set up')).toBeInTheDocument();
  });

  test('someone who may not see it is told so, and the link is still there', async () => {
    show(<TaxSection load={jest.fn().mockRejectedValue(new Error('You do not have permission to do this. Ask the business owner or an admin for access.'))} />);
    expect(await screen.findByText('Only the owner or an accounts manager can see this.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open eTIMS settings' })).toBeInTheDocument();
  });

  test('any other failure says so and tries again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('We could not reach the Murzak server.')).mockResolvedValue({ found: true, active: true, test: false });
    show(<TaxSection load={load} />);
    expect(await screen.findByText(/We could not check eTIMS just now/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('On')).toBeInTheDocument();
  });

  test('no key, password, device number or tax number can be typed or is shown here', async () => {
    show(<TaxSection load={jest.fn().mockResolvedValue({ found: true, active: true, test: false })} />);
    await screen.findByText('On');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/P\d{9}[A-Z]/)).not.toBeInTheDocument();
  });
});

describe('Advanced', () => {
  test('lists every card with one plain sentence', () => {
    show(<AdvancedSection />);
    ['Brands', 'Units', 'Warranties', 'Price groups', 'Supplier groups', 'Account provisioning', 'Inventory discounts', 'Loyalty programmes', 'Industry starter products', 'Station screen settings', 'New look'].forEach((name) =>
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    );
    expect(screen.getByText('Picks the account that holds the cost of goods received before their supplier bill arrives.')).toBeInTheDocument();
  });

  test('each opens its current screen with legacy=1, except the New look switch, which is not redirected', () => {
    show(<AdvancedSection />);
    const href = (name) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Open Brands')).toBe('/products/brands?legacy=1');
    expect(href('Open Units')).toBe('/products/units?legacy=1');
    expect(href('Open Warranties')).toBe('/products/warranties?legacy=1');
    expect(href('Open Price groups')).toBe('/products/price-groups?legacy=1');
    expect(href('Open Supplier groups')).toBe('/suppliers/groups?legacy=1');
    expect(href('Open Account provisioning')).toBe('/settings/account-provisioning?legacy=1');
    expect(href('Open Industry starter products')).toBe('/industry/pharmacy/products?legacy=1');
    expect(href('Open Station screen settings')).toBe('/kitchen?legacy=1');
    expect(href('Open New look')).toBe('/settings/new-look');
  });

  test('the card named in the address is outlined', () => {
    show(<AdvancedSection search="?section=price-groups" />);
    const row = screen.getByRole('heading', { name: 'Price groups' }).closest('li');
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row).toHaveClass('is-highlighted');
    expect(screen.getByRole('heading', { name: 'Brands' }).closest('li')).not.toHaveAttribute('aria-current');
  });

  test('every name the old addresses send here finds its card', () => {
    ['brands', 'units', 'warranties', 'price-groups', 'supplier-groups', 'inventory-discounts', 'loyalty-programs', 'account-provisioning'].forEach((name) => {
      const { unmount } = show(<AdvancedSection search={`?section=${name}`} />);
      expect(screen.getByRole('heading', { name: T.advanced.cards[name].title }).closest('li')).toHaveAttribute('aria-current', 'true');
      unmount();
    });
  });

  test('without a shop type the starter products say why they cannot open', () => {
    show(<AdvancedSection />, { company: 'Shop A' });
    expect(screen.getByText('Your shop type is not set, so there is no starter list to open.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Industry starter products' })).not.toBeInTheDocument();
  });
});
