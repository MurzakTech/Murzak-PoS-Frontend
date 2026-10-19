/** The brand for the screens (ticket P7-3): loaded once, kept for offline, the accent set only through one attribute, and off with the New look. */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrandProvider, useBrand } from './BrandProvider';
import { NewLookContext } from '../NewLookProvider';
import { getBrand } from '../../api/brandApi';
import { getCompany } from '../../api/businessApi';
import { DEFAULT_BRAND } from './brandModel';
import { CACHE_PREFIX, DEVICE_KEY, readDeviceBrand } from './deviceBrand';

jest.mock('../../api/brandApi');
jest.mock('../../api/businessApi');

const BRAND = { ...DEFAULT_BRAND, accent: 'teal', logo: '/files/logo.png', tagline: 'Fresh' };
const BUSINESS = { name: 'Shop A', companyName: 'Shop A', taxId: 'P1', address: {}, phone: '' };

const Probe = () => {
  const { brand, business, status } = useBrand();
  return <p data-testid="p">{`${status}|${brand.accent}|${brand.tagline}|${business.companyName || ''}`}</p>;
};

const mount = ({ enabled = true, auth = { isAuthenticated: true, user: { company: 'Shop A' } } } = {}) =>
  render(
    <Provider store={configureStore({ reducer: { auth: (state = auth) => state } })}>
      <NewLookContext.Provider value={{ enabled, status: 'ready', company: 'Shop A', setEnabled: async () => enabled }}>
        <BrandProvider>
          <Probe />
        </BrandProvider>
      </NewLookContext.Provider>
    </Provider>
  );

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-accent');
});

test('loads the brand and the shop details, and sets the accent on the page', async () => {
  getBrand.mockResolvedValue(BRAND);
  getCompany.mockResolvedValue(BUSINESS);
  mount();
  await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('ready|teal|Fresh|Shop A'));
  expect(document.documentElement.getAttribute('data-accent')).toBe('teal');
  expect(getBrand).toHaveBeenCalledWith('Shop A');
});

test('the default colour sets no attribute at all', async () => {
  getBrand.mockResolvedValue(DEFAULT_BRAND);
  getCompany.mockResolvedValue(BUSINESS);
  mount();
  await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('ready|indigo'));
  expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
});

test('with the New look off nothing is asked and no accent is set', () => {
  mount({ enabled: false });
  expect(getBrand).not.toHaveBeenCalled();
  expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  expect(screen.getByTestId('p')).toHaveTextContent('idle|indigo');
});

test('nobody signed in: nothing is asked', () => {
  mount({ auth: { isAuthenticated: false, user: null } });
  expect(getBrand).not.toHaveBeenCalled();
});

test('the last answer is kept on the device, so an offline start still has the shop brand', async () => {
  getBrand.mockResolvedValue(BRAND);
  getCompany.mockResolvedValue(BUSINESS);
  const { unmount } = mount();
  await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('ready|teal'));
  expect(JSON.parse(localStorage.getItem(`${CACHE_PREFIX}Shop A`)).brand.tagline).toBe('Fresh');
  expect(readDeviceBrand()).toEqual({ logo: '/files/logo.png', accent: 'teal', backdrop: 'waves', name: 'Shop A' });
  unmount();

  getBrand.mockRejectedValue(new Error('offline'));
  getCompany.mockRejectedValue(new Error('offline'));
  mount();
  expect(screen.getByTestId('p')).toHaveTextContent('ready|teal|Fresh|Shop A');
  await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('error|teal|Fresh|Shop A'));
});

test('a device with storage blocked still works', async () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  getBrand.mockResolvedValue(BRAND);
  getCompany.mockResolvedValue(BUSINESS);
  mount();
  await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('ready|teal'));
  spy.mockRestore();
  expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
});

test('outside the provider the plain default is given', () => {
  render(<Probe />);
  expect(screen.getByTestId('p')).toHaveTextContent('idle|indigo||');
});
