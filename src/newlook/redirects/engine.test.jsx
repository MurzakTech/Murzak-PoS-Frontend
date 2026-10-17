/**
 * Ticket P1-7: the redirect engine, the preview switch, the menu with the new pages and the + New menu.
 * Acceptance checks AC-05 (menu) and AC-06 (old addresses). The table's own coverage is tested in redirectTable.test.js.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { findEntry, oldAddressFor, resolveRedirect, toNewAddress, NEW_LOOK_PREFIX } from './engine';
import { PREVIEW_KEY, getPreview, isPageLive, resyncPreview, setPreview } from './live';
import { REDIRECTS, NEW_PAGES } from './redirectTable';
import LegacyRedirects from './LegacyRedirects';
import PagePlaceholder from './PagePlaceholder';
import { NAVIGATION, flatItems, isActive, resolveNavigation } from '../shell/navigation';
import { NEW_MENU, newMenuItems, searchActionsFor } from '../shell/newMenu';
import { useNewLook } from '../NewLookProvider';

jest.mock('../NewLookProvider', () => ({ useNewLook: jest.fn() }));

const TABLE = [
  { from: '/sales', to: '/sales', status: 'sure' },
  { from: '/sales/history', to: '/sales', status: 'sure' },
  { from: '/sales/invoice/:id', to: '/sales?open=:id', status: 'sure' },
  { from: '/sales/invoice/new', to: '/sales/new', status: 'sure' },
  { from: '/purchases/:id', to: '/purchases?open=:id', status: 'sure' },
  { from: '/purchases/new', to: '/purchases/new', status: 'sure' },
  { from: '/dashboard', to: '/', status: 'sure' },
  { from: '/login', to: null, status: 'keep' },
];
const live = () => true;
const resolve = (path, search = '', hash = '') => resolveRedirect(path, search, hash, { table: TABLE, isLive: live });

beforeEach(() => {
  localStorage.clear();
  resyncPreview();
});

describe('Addresses', () => {
  test('new pages live under one transitional prefix, and Home is the prefix itself', () => {
    expect(NEW_LOOK_PREFIX).toBe('/new-look');
    expect(toNewAddress('/sales')).toBe('/new-look/sales');
    expect(toNewAddress('/')).toBe('/new-look');
    expect(toNewAddress('/stock?action=in')).toBe('/new-look/stock?action=in');
  });
});

describe('resolveRedirect', () => {
  test('sends an old address to its new page', () => {
    expect(resolve('/sales/history').to).toBe('/new-look/sales');
    expect(resolve('/dashboard').to).toBe('/new-look');
  });

  test('carries the record in the address to the panel that opens it', () => {
    expect(resolve('/sales/invoice/INV-0033').to).toBe('/new-look/sales?open=INV-0033');
    expect(resolve('/sales/invoice/a%20b').to).toBe('/new-look/sales?open=a+b'); // a space round-trips through the query
  });

  test('the more specific entry wins, whatever the order', () => {
    expect(resolve('/purchases/new').to).toBe('/new-look/purchases/new');
    expect(resolve('/purchases/PO-9').to).toBe('/new-look/purchases?open=PO-9');
    expect(resolve('/sales/invoice/new').to).toBe('/new-look/sales/new');
    expect(findEntry('/purchases/new', [...TABLE].reverse()).entry.from).toBe('/purchases/new');
  });

  test('keeps the filters, page and anchor the person had; the redirect’s own keys win', () => {
    expect(resolve('/sales/history', '?page=2&size=50', '#top').to).toBe('/new-look/sales?page=2&size=50#top');
    expect(resolve('/sales/invoice/9', '?open=1&q=amina').to).toBe('/new-look/sales?open=9&q=amina');
  });

  test('does nothing for an unknown address or one outside the redesign', () => {
    expect(resolve('/somewhere-else')).toBeNull();
    expect(resolve('/login')).toBeNull();
  });

  test('does nothing while the new page is not live', () => {
    expect(resolveRedirect('/sales/history', '', '', { table: TABLE, isLive: () => false })).toBeNull();
    expect(resolveRedirect('/sales/history', '', '', { table: TABLE, isLive: (page) => page === '/sales' }).to).toBe('/new-look/sales');
  });

  test('works out the current screen that does the job of a new page', () => {
    expect(oldAddressFor('/sales', TABLE)).toBe('/sales');
    expect(oldAddressFor('/sales/new', TABLE)).toBe('/sales/invoice/new');
    expect(oldAddressFor('/nowhere', TABLE)).toBeNull();
  });
});

describe('Live pages and the preview switch', () => {
  test('the finished pages are live; the till, New invoice, Import, Stores, Transfers and Settings are not', () => {
    ['/', '/sales', '/customers', '/products', '/stock', '/purchases', '/suppliers'].forEach((page) => expect(isPageLive(page)).toBe(true));
    ['/till', '/sales/new', '/products/import', '/stock/locations', '/stock/transfers', '/settings/till', '/reports'].forEach((page) => expect(isPageLive(page)).toBe(false));
  });

  test('a built page is live, with or without a query', () => {
    expect(isPageLive('/sales?open=1', false, ['/sales'])).toBe(true);
    expect(isPageLive('/stock', false, ['/sales'])).toBe(false);
  });

  test('the preview makes every page live, and is remembered on this device only', () => {
    expect(getPreview()).toBe(false);
    act(() => setPreview(true));
    expect(isPageLive('/anything')).toBe(true);
    expect(localStorage.getItem(PREVIEW_KEY)).toBe('1');
    act(() => setPreview(false));
    expect(localStorage.getItem(PREVIEW_KEY)).toBe('0');
  });

  test('a device that will not store it still works for this visit', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    act(() => setPreview(true));
    expect(getPreview()).toBe(true);
    spy.mockRestore();
  });
});

describe('The real table', () => {
  test('every old address leads somewhere when the preview is on, so none is left to show "not found"', () => {
    const concrete = REDIRECTS.filter((r) => r.status !== 'keep').map((r) => r.from.replace(/:([A-Za-z0-9_]+)/g, 'x1'));
    concrete.forEach((path) => {
      const hit = resolveRedirect(path, '', '', { isLive: live });
      expect(hit).not.toBeNull();
      expect(hit.to.startsWith('/new-look')).toBe(true);
    });
  });

  test('every address it sends people to has a page', () => {
    const paths = NEW_PAGES.map((p) => p.path);
    REDIRECTS.filter((r) => r.to).forEach((r) => {
      const target = r.to.split('?')[0].replace(/:[^/]+/g, 'x');
      const known = paths.some((p) => new RegExp(`^${p.replace(/:[^/]+/g, '[^/]+')}$`).test(target));
      expect(known).toBe(true);
    });
  });
});

describe('LegacyRedirects (in the app)', () => {
  const Where = () => {
    const l = useLocation();
    return <output data-testid="where">{`${l.pathname}${l.search}`}</output>;
  };
  const app = (path, { enabled = true } = {}) => {
    useNewLook.mockReturnValue({ enabled, status: 'ready' });
    return render(
      <MemoryRouter initialEntries={[path]}>
        <LegacyRedirects>
          <Routes>
            <Route path="*" element={<p>the page</p>} />
          </Routes>
        </LegacyRedirects>
        <Where />
      </MemoryRouter>
    );
  };

  test('with the New look off, every old address opens as it always did', () => {
    act(() => setPreview(true));
    app('/sales/history', { enabled: false });
    expect(screen.getByTestId('where')).toHaveTextContent('/sales/history');
  });

  test('with the New look on but the new page not built, the old screen stays', () => {
    app('/sales/pos');
    expect(screen.getByTestId('where')).toHaveTextContent('/sales/pos');
  });

  test('with the New look on and the preview on, the old address goes to its new page, keeping the record and page', () => {
    act(() => setPreview(true));
    app('/sales/invoice/INV-7?page=3');
    const where = screen.getByTestId('where').textContent;
    expect(where).toMatch(/^\/new-look\/sales\?/);
    expect(where).toContain('open=INV-7');
    expect(where).toContain('page=3');
  });

  test('New look pages are left alone', () => {
    act(() => setPreview(true));
    app('/new-look/sales');
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/sales');
  });
});

describe('PagePlaceholder', () => {
  test('names the page and offers the current screen', () => {
    window.innerWidth = 1280;
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/new-look/sales']}>
          <Routes>
            <Route path="/new-look/sales" element={<PagePlaceholder />} />
            <Route path="*" element={<p>current screen</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByRole('heading', { name: 'Sales', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Not built yet')).toBeInTheDocument();
    expect(oldAddressFor('/sales')).toBeTruthy();
    userEvent.click(screen.getByRole('button', { name: 'Open the current screen' }));
    expect(screen.getByText('current screen')).toBeInTheDocument();
  });
});

describe('The menu and its new pages (AC-05)', () => {
  const current = resolveNavigation(NAVIGATION, { isLive: () => false, toNew: toNewAddress });
  const previewed = resolveNavigation(NAVIGATION, { isLive: () => true, toNew: toNewAddress });

  test('until a page is built, an item opens the current screen', () => {
    expect(flatItems(current).filter((i) => !i.soon).every((i) => i.to && !i.to.startsWith('/new-look'))).toBe(true);
    expect(current.groups[0].items[0].to).toBe('/sales/history');
  });

  test('with the preview, an item opens its new page', () => {
    expect(previewed.groups[0].items[0].to).toBe('/new-look/sales');
    expect(previewed.settings.to).toBe('/new-look/settings/business');
    expect(previewed.home.to).toBe('/new-look');
  });

  test('every item’s new page exists, so the menu never leads to "not found"', () => {
    const paths = NEW_PAGES.map((p) => p.path);
    flatItems(NAVIGATION)
      .filter((i) => !i.soon)
      .forEach((i) => expect(paths).toContain(i.page));
  });

  test('the item stays highlighted on its old and its new pages', () => {
    const sales = NAVIGATION.groups[0].items[0];
    expect(isActive(sales, '/sales/history')).toBe(true);
    expect(isActive(sales, '/new-look/sales/unpaid')).toBe(true);
    expect(isActive(sales, '/new-look/customers')).toBe(false);
  });

  test('Home does not claim every New look page', () => {
    expect(isActive(NAVIGATION.home, '/new-look')).toBe(true);
    expect(isActive(NAVIGATION.home, '/dashboard')).toBe(true);
    expect(isActive(NAVIGATION.home, '/new-look/sales')).toBe(false);
  });

  test('Staff and Roles are reached only through Settings: no item of their own, and Settings stays highlighted', () => {
    expect(flatItems(NAVIGATION).map((i) => i.label)).not.toContain('Staff');
    expect(isActive(NAVIGATION.settings, '/staff')).toBe(true);
    expect(isActive(NAVIGATION.settings, '/roles/Manager')).toBe(true);
    expect(REDIRECTS.find((r) => r.from === '/staff').to).toMatch(/^\/settings\/team/);
  });

  test('Stores and Stock transfers are part of Stock levels', () => {
    const stock = NAVIGATION.groups[1].items[1];
    expect(isActive(stock, '/warehouses/new')).toBe(true);
    expect(isActive(stock, '/stock-transfers')).toBe(true);
  });
});

describe('The + New menu', () => {
  const run = (hasAccess, extra = {}) => {
    const open = jest.fn();
    const items = newMenuItems({ hasAccess, open, destination: (i) => `/go${i.page}`, ...extra });
    return { open, items };
  };

  test('lists sale, product, customer, expense and purchase for a person who may use them all', () => {
    const { items } = run(() => true);
    expect(items.map((i) => i.label)).toEqual(['Sale', 'Product', 'Customer', 'Expense (coming soon)', 'Purchase']);
    expect(NEW_MENU).toHaveLength(5);
  });

  test('shows only what the person’s role may open', () => {
    expect(run((path) => path === '/sales/pos').items.map((i) => i.label)).toEqual(['Sale']);
    expect(run(() => false).items).toEqual([]);
  });

  test('Expense cannot be chosen until its page exists', () => {
    expect(run(() => true).items.find((i) => i.label.startsWith('Expense')).disabled).toBe(true);
  });

  test('an item goes where it should', () => {
    const { items, open } = run(() => true);
    items[1].onClick();
    expect(open).toHaveBeenCalledWith('/go/products/new');
  });

  test('showAll lists all five whatever the role (the component page’s sample)', () => {
    expect(run(() => false, { showAll: true }).items).toHaveLength(5);
  });

  test('the same actions are findable by search, by the words a person uses', () => {
    const open = jest.fn();
    const actions = searchActionsFor({ hasAccess: () => true, open, destination: (i) => i.page });
    expect(actions.map((a) => a.label)).toEqual(['New sale', 'Add product', 'Add customer', 'New purchase']);
    actions[1].onSelect();
    expect(open).toHaveBeenCalledWith('/products/new');
    expect(actions[1].keywords).toContain('add');
  });
});
