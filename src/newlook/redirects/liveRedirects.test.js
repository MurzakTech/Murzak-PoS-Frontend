/**
 * The old addresses now open the redesigned pages (the owner's decision). These checks guard the two ways that goes wrong:
 * a finished page with no real screen behind it, and a link back to a current screen that bounces straight to the new page.
 */
import { matchPath } from 'react-router-dom';
import { oldScreen, resolveRedirect, NEW_LOOK_PREFIX } from './engine';
import { BUILT_PAGES } from './live';
import { REDIRECTS } from './redirectTable';
import { newLookRoutes } from '../newLookRoutes';

const live = (page) => BUILT_PAGES.includes(page.split('?')[0]);
const go = (address) => {
  const [path, query] = address.split('?');
  return resolveRedirect(path, query ? `?${query}` : '', '', { isLive: live });
};
const realRoutes = newLookRoutes.filter((r) => !r.element.name || r.element.name !== 'PagePlaceholder').map((r) => r.path);
const hasRealRoute = (address) => {
  const path = address.split('?')[0].replace(/^\/new-look/, '') || '/';
  const full = path === '/' ? NEW_LOOK_PREFIX : `${NEW_LOOK_PREFIX}${path}`;
  return realRoutes.some((route) => matchPath({ path: route, end: true }, full));
};

describe('Old addresses open the finished pages', () => {
  test.each([
    ['/dashboard', '/new-look'],
    ['/sales/history', '/new-look/sales'],
    ['/sales/invoice/INV-9', '/new-look/sales?open=INV-9'],
    ['/customers', '/new-look/customers'],
    ['/products', '/new-look/products'],
    ['/inventory/low-stock', '/new-look/stock/low'],
    ['/purchases/invoices/PINV-1', '/new-look/purchases?open=PINV-1'],
    ['/suppliers/SUP-1', '/new-look/suppliers?open=SUP-1'],
    ['/staff', '/new-look/settings/team'],
    ['/settings/payment-methods', '/new-look/settings/till'],
    ['/reports/sales-analytics', '/new-look/reports/sales'],
    ['/reports/inventory-summary', '/new-look/reports/stock-summary'],
  ])('%s opens %s', (from, to) => {
    expect(go(from).to).toBe(to);
  });

  test('every finished page has a real screen, not a "being rebuilt" notice', () => {
    BUILT_PAGES.forEach((page) => expect(hasRealRoute(page)).toBe(true));
  });

  test('every redirect that is switched on lands on a real screen', () => {
    const samples = REDIRECTS.filter((r) => r.status !== 'keep' && r.to && live(r.to.replace(/:[A-Za-z0-9_]+/g, 'x')));
    expect(samples.length).toBeGreaterThan(30);
    const hits = samples.map((r) => ({ from: r.from, hit: go(r.from.replace(/:[A-Za-z0-9_]+/g, 'x')) })).filter((r) => r.hit);
    const broken = hits.filter((r) => !hasRealRoute(r.hit.to)).map((r) => r.from);
    expect(broken).toEqual([]);
  });
});

describe('Screens that are not redesigned yet stay where they are', () => {
  test.each(['/sales/pos', '/sales/invoice/new', '/products/load-products', '/products/update-price', '/products/variations', '/inventory/stock-entry', '/warehouses', '/stock-transfers', '/stock-transfers/create', '/reports/sales-summary', '/reports/stock-movement', '/reports/performance-metrics'])('%s is not redirected', (address) => {
    expect(go(address)).toBeNull();
  });
});

describe('Links from a new page to a current screen', () => {
  test('oldScreen adds the marker with the right separator', () => {
    expect(oldScreen('/sales/returns')).toBe('/sales/returns?legacy=1');
    expect(oldScreen('/sales/returns?invoice=X')).toBe('/sales/returns?invoice=X&legacy=1');
  });

  test.each(['/sales/returns?invoice=X', '/purchases/returns?purchase=P1', '/purchases/new?draft=PO-1', '/purchases/receipts/new', '/purchases/create-grn', '/inventory/stock-entries/STE-1', '/inventory/multi-level-reconciliation', '/inventory/item-details', '/products', '/roles', '/settings/payment-gateways', '/settings/etims', '/settings/bank-accounts', '/reports/inventory-valuation/value-trends'])('%s stays when it carries the marker', (address) => {
    expect(go(oldScreen(address))).toBeNull();
  });

  test.each(['/sales/returns?invoice=X', '/purchases/returns?purchase=P1', '/purchases/new?draft=PO-1', '/purchases/receipts/new', '/inventory/stock-entries/STE-1', '/inventory/item-details', '/products'])('%s would bounce to the new page without the marker', (address) => {
    expect(go(address)).not.toBeNull();
  });

  test('the supplier groups address opens Advanced, and the current screen still opens with the marker', () => {
    expect(go('/suppliers/groups').to).toBe('/new-look/settings/advanced?section=supplier-groups');
    expect(go(oldScreen('/suppliers/groups'))).toBeNull();
  });
});
