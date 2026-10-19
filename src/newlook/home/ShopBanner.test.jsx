/**
 * The shop banner at the top of Home: the shop's name, tagline or logo, and the most common jobs.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrandContext } from '../brand/BrandProvider';
import { DEFAULT_BRAND } from '../brand/brandModel';
import ShopBanner from './ShopBanner';

const ACTIONS = [
  { key: 'sale', label: 'New sale', icon: 'receipt', to: '/sales/pos' },
  { key: 'product', label: 'Add product', icon: 'box', to: '/new-look/products/new' },
];

const show = (brand = {}, business = { companyName: 'Duka Kuu' }, props = {}) =>
  render(
    <MemoryRouter>
      <BrandContext.Provider value={{ brand: { ...DEFAULT_BRAND, ...brand }, business, status: 'ready', applySaved: () => {} }}>
        <ShopBanner actions={ACTIONS} {...props} />
      </BrandContext.Provider>
    </MemoryRouter>
  );

test('shows the shop name, its first letter as a mark, a friendly line and the quick jobs as links', () => {
  show();
  expect(screen.getByText('Duka Kuu')).toBeInTheDocument();
  expect(screen.getByText('D')).toBeInTheDocument();
  expect(screen.getByText('Here is how your shop is doing today.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'New sale' })).toHaveAttribute('href', '/sales/pos');
  expect(screen.getByRole('link', { name: 'Add product' })).toHaveAttribute('href', '/new-look/products/new');
});

test('uses the shop tagline and logo when they are set', () => {
  show({ tagline: 'Fresh every day', logo: '/files/logo.png' });
  expect(screen.getByText('Fresh every day')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Logo of Duka Kuu' })).toHaveAttribute('src', '/files/logo.png');
});

test('an owner with nothing set is pointed to the Brand settings; others are not', () => {
  const view = show({}, { companyName: 'Duka Kuu' }, { canBrand: true, brandTo: '/new-look/settings/brand' });
  expect(screen.getByRole('link', { name: 'Add your logo and colours' })).toHaveAttribute('href', '/new-look/settings/brand');
  view.unmount();
  show({}, { companyName: 'Duka Kuu' }, { canBrand: false, brandTo: '/new-look/settings/brand' });
  expect(screen.queryByRole('link', { name: 'Add your logo and colours' })).not.toBeInTheDocument();
});

test('a shop with no name loaded yet still shows a mark and no name line', () => {
  show({}, {});
  expect(screen.queryByText('Duka Kuu')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'New sale' })).toBeInTheDocument();
});
