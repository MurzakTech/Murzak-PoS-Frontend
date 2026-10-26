import React from 'react';
import { render, screen } from '@testing-library/react';
import { cleanShopName, readShopName } from './shopConfig';
import StandaloneShop from './StandaloneShop';

jest.mock('../ShopApp', () => () => <div>shop pages</div>);
jest.mock('../TrackPage', () => () => <div>tracking page</div>);

describe('shopConfig', () => {
  it('accepts a valid shop name and tidies its case', () => {
    expect(cleanShopName('lindamwananchi')).toBe('lindamwananchi');
    expect(cleanShopName('  Linda-Shop ')).toBe('linda-shop');
  });

  it.each([['a'], ['-bad-'], ['has space'], ['under_score'], ['dots.in.it'], [''], [null], [undefined], [42], ['x'.repeat(41)]])(
    'refuses %p as a shop name',
    (value) => {
      expect(cleanShopName(value)).toBe('');
    }
  );

  it('reads the name from the file the container writes', async () => {
    const fetchFile = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ slug: 'mamanjeri' }) });
    await expect(readShopName(fetchFile)).resolves.toBe('mamanjeri');
    expect(fetchFile).toHaveBeenCalledWith('/shop-config.json');
  });

  it('gives an empty name when the file is missing, broken or holds a bad name', async () => {
    await expect(readShopName(jest.fn().mockResolvedValue({ ok: false }))).resolves.toBe('');
    await expect(readShopName(jest.fn().mockRejectedValue(new Error('offline')))).resolves.toBe('');
    await expect(readShopName(jest.fn().mockResolvedValue({ ok: true, json: async () => ({ slug: '../etc' }) }))).resolves.toBe('');
  });
});

describe('StandaloneShop', () => {
  const open = (path) => window.history.pushState({}, '', path);

  it('sends the front door to the shop', () => {
    open('/');
    render(<StandaloneShop slug="mamanjeri" />);
    expect(screen.getByText('shop pages')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/shop/mamanjeri');
  });

  it('keeps a link to another shop on this shop', () => {
    open('/shop/someone-else');
    render(<StandaloneShop slug="mamanjeri" />);
    expect(window.location.pathname).toBe('/shop/mamanjeri');
  });

  it('opens order tracking', () => {
    open('/track/tok-abcdefgh');
    render(<StandaloneShop slug="mamanjeri" />);
    expect(screen.getByText('tracking page')).toBeInTheDocument();
  });

  it('says the shop is not open when it has no valid name', () => {
    open('/');
    render(<StandaloneShop slug="" />);
    expect(screen.getByRole('heading', { name: /not open/i })).toBeInTheDocument();
  });
});
