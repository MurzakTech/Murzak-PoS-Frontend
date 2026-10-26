import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MarketplacePage from './MarketplacePage';
import { getMarketplace } from '../../api/marketplaceApi';

jest.mock('../../api/marketplaceApi', () => ({ getMarketplace: jest.fn() }));

const OFFER = {
  groups: [
    {
      key: 'online',
      items: [
        { id: 'starter-storefront', name: 'Online Storefront (Managed)', monthly: 500, setup: 0, checkoutUrl: 'https://murzaktech.tech/checkout/new?serviceId=starter-storefront' },
        { id: 'starter-woocommerce', name: 'WordPress + WooCommerce (Managed)', monthly: 2500, setup: 300, checkoutUrl: 'https://murzaktech.tech/checkout/new?serviceId=starter-woocommerce' },
      ],
    },
    { key: 'protect', items: [{ id: 'new-thing', name: 'Something New', monthly: 900, setup: 0, checkoutUrl: 'https://murzaktech.tech/checkout/new?serviceId=new-thing' }] },
  ],
};

const open = () =>
  render(
    <MemoryRouter>
      <MarketplacePage />
    </MemoryRouter>
  );

describe('Marketplace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows each product with its price and a Buy button that goes to the website checkout', async () => {
    getMarketplace.mockResolvedValue(OFFER);
    open();

    expect(await screen.findByText('Online Storefront (Managed)')).toBeInTheDocument();
    expect(screen.getByText(/KES 500 a month/)).toBeInTheDocument();
    expect(screen.getByText(/KES 2,500 a month/)).toBeInTheDocument();
    expect(screen.getByText(/plus KES 300 once/)).toBeInTheDocument();
    expect(screen.getByText(/Your own online shop on its own web address/)).toBeInTheDocument();

    const buy = screen.getByRole('link', { name: 'Buy Online Storefront (Managed)' });
    expect(buy).toHaveAttribute('href', 'https://murzaktech.tech/checkout/new?serviceId=starter-storefront');
    expect(buy).toHaveAttribute('target', '_blank');
    expect(buy.getAttribute('rel')).toMatch(/noopener/);
  });

  it('still shows a product the POS has no wording for, with the name the website gave it', async () => {
    getMarketplace.mockResolvedValue(OFFER);
    open();
    expect(await screen.findByText('Something New')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buy Something New' })).toBeInTheDocument();
  });

  it('explains how buying works', async () => {
    getMarketplace.mockResolvedValue(OFFER);
    open();
    expect(await screen.findByText('How buying works')).toBeInTheDocument();
    expect(screen.getByText(/pay with M-Pesa or PayPal/)).toBeInTheDocument();
  });

  it('says so, and lets the owner try again, when the marketplace cannot be reached', async () => {
    getMarketplace.mockRejectedValueOnce(new Error('The marketplace could not be reached just now.')).mockResolvedValueOnce(OFFER);
    open();
    expect(await screen.findByText('The marketplace could not be reached just now.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Online Storefront (Managed)')).toBeInTheDocument();
    await waitFor(() => expect(getMarketplace).toHaveBeenCalledTimes(2));
  });

  it('says nothing is on offer when the list is empty', async () => {
    getMarketplace.mockResolvedValue({ groups: [] });
    open();
    expect(await screen.findByText('Nothing is on offer right now')).toBeInTheDocument();
  });

  it('never offers a product without a checkout address', async () => {
    getMarketplace.mockResolvedValue({ groups: [{ key: 'online', items: [{ id: 'x-y', name: 'No Address', monthly: 100, setup: 0, checkoutUrl: '' }] }] });
    open();
    expect(await screen.findByText('Nothing is on offer right now')).toBeInTheDocument();
    expect(screen.queryByText('No Address')).not.toBeInTheDocument();
  });
});
