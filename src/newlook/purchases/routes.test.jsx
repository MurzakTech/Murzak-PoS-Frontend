/**
 * The addresses of the Purchases pages (ticket P4-5): the list, the New purchase form, the Receive goods steps, and that the Orders
 * and Returns addresses (where the old Submit Order and Purchase Returns addresses go) land on those tabs. Every old purchase address
 * in the redirect table still reaches a screen that can show the purchase.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { newLookRoutes } from '../newLookRoutes';
import { REDIRECTS } from '../redirects/redirectTable';
import { findEntry } from '../redirects/engine';
import PagePlaceholder from '../redirects/PagePlaceholder';
import { OrdersRedirect, ReturnsRedirect } from './TabRedirect';
import { newPurchaseAddress, openAddress, receiveAddress } from './purchasesModel';

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/new-look/purchases/orders" element={<OrdersRedirect />} />
        <Route path="/new-look/purchases/returns" element={<ReturnsRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

describe('the Orders and Returns addresses', () => {
  test('Orders opens the Orders tab', () => {
    renderAt('/new-look/purchases/orders');
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/purchases?tab=orders');
  });

  test('Returns opens the Returns tab, and a purchase in the address opens its panel', () => {
    renderAt('/new-look/purchases/returns?purchase=ACC-PINV-2026-00009');
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/purchases?tab=returns&open=ACC-PINV-2026-00009');
  });
});

describe('the routes', () => {
  const find = (path) => newLookRoutes.filter((r) => r.path === path);

  test('the list, the New form, the Receive goods steps, Orders and Returns each have one route of their own', () => {
    ['/new-look/purchases', '/new-look/purchases/new', '/new-look/purchases/receive', '/new-look/purchases/orders', '/new-look/purchases/returns'].forEach((path) => {
      expect(find(path)).toHaveLength(1);
      expect(find(path)[0].element).not.toBe(PagePlaceholder);
    });
  });

  test('no address is registered twice, so no placeholder hides a real page', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('the addresses other pages link to are the real ones', () => {
    expect(newPurchaseAddress('SKU-1')).toBe('/new-look/purchases/new?item=SKU-1');
    expect(receiveAddress('PO-1')).toBe('/new-look/purchases/receive?order=PO-1');
    expect(openAddress('PO-1')).toBe('/new-look/purchases?open=PO-1');
  });
});

describe('the old purchase addresses', () => {
  test('every old purchase address in the table goes to a page that exists', () => {
    const pages = newLookRoutes.map((r) => r.path);
    const purchaseEntries = REDIRECTS.filter((e) => e.from.startsWith('/purchases'));
    expect(purchaseEntries.length).toBeGreaterThan(8);
    purchaseEntries.forEach((entry) => {
      const target = `/new-look${entry.to.split('?')[0].replace(/:[A-Za-z]+/g, 'x')}`;
      expect(pages.some((p) => p === target || p.replace(/:[A-Za-z]+/g, 'x') === target)).toBe(true);
    });
  });

  test('Create GRN goes to the Receive goods action of the Purchases page', () => {
    expect(findEntry('/purchases/create-grn').entry.to).toBe('/purchases?action=receive');
  });
});
