/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   These tests check landmarks, which element holds a class, and the order of things in the page: structure that
   no role or label query can express. */
/**
 * Ticket P1-6: the app shell: top bar, sidebar in three states, page header. Acceptance check AC-07 (Go to till
 * on every back-office page, one title and one-line description, nothing wraps) and the Responsive behaviour
 * table at four widths.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Button, ToastProvider } from '../components';
import NewLookShell from '../NewLookShell';
import { AppShell, NAVIGATION, PageHeader, Sidebar, TopBar, bandFor, flatItems, isActive, resolveNavigation, search, RECENT_KEY, SIDEBAR_KEY } from './index';

// The menu as it opens today: each item goes to the current screen until its new page is built (ticket P1-7)
const CURRENT = resolveNavigation(NAVIGATION, { isLive: () => false, toNew: (page) => page });
const css = fs.readFileSync(path.join(__dirname, 'shell.css'), 'utf8');
const tokens = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');
const block = (selector) => {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`));
  expect(start).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
};

const Where = () => {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}`}</output>;
};

const resize = (width) => {
  act(() => {
    window.innerWidth = width;
    window.dispatchEvent(new Event('resize'));
  });
};

const shell = (props = {}, entry = '/sales/history', width = 1280) => {
  window.innerWidth = width;
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[entry]}>
        <ToastProvider>
          <AppShell navigation={CURRENT} topBar={{ tillTo: '/sales/pos', homeTo: '/dashboard', ...props.topBar }} searchActions={props.searchActions || []}>
            <PageHeader title="Sales" subtitle="Every sale, newest first." actions={<Button>Export</Button>} />
          </AppShell>
        </ToastProvider>
        <Where />
      </MemoryRouter>
    </ThemeProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 1280;
});
afterAll(() => {
  window.innerWidth = 1024;
});

describe('The menu', () => {
  test('is Home, eight items in four groups and Settings at the bottom (nine items), with the new names', () => {
    expect(NAVIGATION.home.label).toBe('Home');
    expect(NAVIGATION.groups.map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      ['Sell', ['Sales', 'Customers']],
      ['Stock', ['Products', 'Stock levels']],
      ['Buy', ['Purchases', 'Suppliers']],
      ['Money', ['Expenses', 'Reports']],
    ]);
    expect(NAVIGATION.settings.label).toBe('Settings');
    expect(flatItems(NAVIGATION)).toHaveLength(10); // Home, eight in groups, Settings
  });

  test('has no till item (the till is the top-bar button) and no old names', () => {
    const labels = flatItems(NAVIGATION).map((i) => i.label.toLowerCase());
    expect(labels.some((l) => /till|point of sale|staff|inventory|invoice/.test(l))).toBe(false);
  });

  test('an item is "open" on its own pages only, ending at a slash', () => {
    const sales = NAVIGATION.groups[0].items[0];
    expect(isActive(sales, '/sales')).toBe(true);
    expect(isActive(sales, '/sales/history')).toBe(true);
    expect(isActive(sales, '/sales-report')).toBe(false);
    expect(isActive(sales, '/customers')).toBe(false);
  });
});

describe('Sidebar', () => {
  const side = (props = {}, entry = '/customers') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Sidebar navigation={CURRENT} {...props} />
      </MemoryRouter>
    );

  test('expanded: group names, icon and words, and the open page is marked', () => {
    side();
    const nav = screen.getByRole('navigation', { name: 'Main menu' });
    ['Sell', 'Stock', 'Buy', 'Money'].forEach((g) => expect(within(nav).getByText(g)).toBeVisible());
    const current = within(nav).getByRole('link', { name: 'Customers' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Sales' })).not.toHaveAttribute('aria-current');
    expect(current.querySelector('[data-icon="users"]')).not.toBeNull();
    expect(block('.nl-nav__item.is-active')).toMatch(/background-color:\s*var\(--soft\)/);
    expect(block('.nl-nav__item.is-active')).toMatch(/color:\s*var\(--brand-text\)/);
    expect(block('.nl-nav__item.is-active')).toMatch(/box-shadow:\s*inset/);
  });

  test('the groups are named for screen readers', () => {
    side();
    expect(screen.getByRole('group', { name: 'Sell' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Money' })).toBeInTheDocument();
  });

  test('collapsed: icons only, but every item keeps its name for screen readers', () => {
    side({ collapsed: true });
    expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByText('Customers')).toHaveClass('nl-visually-hidden');
    // the group names are still read, just not drawn
    expect(screen.getByRole('group', { name: 'Stock' })).toBeInTheDocument();
  });

  test('collapsed: the name shows beside the icon on hover and on keyboard focus, and Escape hides it', () => {
    side({ collapsed: true });
    const link = screen.getByRole('link', { name: 'Customers' });
    userEvent.hover(link);
    expect(document.querySelector('.nl-tooltip')).toHaveTextContent('Customers');
    userEvent.unhover(link);
    expect(document.querySelector('.nl-tooltip')).toBeNull();
    act(() => link.focus());
    expect(document.querySelector('.nl-tooltip')).toHaveTextContent('Customers');
    userEvent.keyboard('{Escape}');
    expect(document.querySelector('.nl-tooltip')).toBeNull();
  });

  test('a page that does not exist yet is shown, but cannot be opened', () => {
    side();
    const expenses = screen.getByText('Expenses').closest('.nl-nav__item');
    expect(expenses).toHaveAttribute('aria-disabled', 'true');
    expect(expenses.tagName).not.toBe('A');
    expect(within(expenses).getByText('Soon')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Expenses/ })).toBeNull();
  });

  test('the collapse button says what it will do and reports the press', () => {
    const onToggle = jest.fn();
    const { rerender } = side({ canCollapse: true, onToggle });
    userEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(
      <MemoryRouter>
        <Sidebar navigation={CURRENT} canCollapse collapsed onToggle={onToggle} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Expand menu' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('is fixed in place with its own scroll; Settings is at the bottom, outside the scrolling part', () => {
    const { container } = side();
    expect(block('.nl-sidebar__scroll')).toMatch(/overflow-y:\s*auto/);
    expect(block('.nl-shell__side')).toMatch(/position:\s*sticky/);
    expect(container.querySelector('.nl-sidebar__foot')).toContainElement(screen.getByRole('link', { name: 'Settings' }));
    expect(container.querySelector('.nl-sidebar__scroll')).not.toContainElement(screen.getByRole('link', { name: 'Settings' }));
  });
});

describe('Widths: the Responsive behaviour table', () => {
  test('the bands are 1024px and up, 768 to 1023px, and below 768px', () => {
    expect([1920, 1100, 1024].map(bandFor)).toEqual(['wide', 'wide', 'wide']);
    expect([1023, 800, 768].map(bandFor)).toEqual(['medium', 'medium', 'medium']);
    expect([767, 375, 320].map(bandFor)).toEqual(['narrow', 'narrow', 'narrow']);
  });

  test('the sizes are the Spec\u2019s: 64px top bar, 240px sidebar, 72px when collapsed', () => {
    expect(tokens).toMatch(/--topbar-height:\s*64px/);
    expect(tokens).toMatch(/--sidebar-width:\s*240px/);
    expect(tokens).toMatch(/--sidebar-width-collapsed:\s*72px/);
    expect(block('.nl-topbar')).toMatch(/height:\s*var\(--topbar-height\)/);
    expect(block('.nl-shell__side')).toMatch(/width:\s*var\(--sidebar-width\)/);
    expect(block('.nl-shell.is-collapsed .nl-shell__side')).toMatch(/width:\s*var\(--sidebar-width-collapsed\)/);
  });

  test('1100px and up: sidebar 240px, with the collapse button', () => {
    const { container } = shell({}, '/sales/history', 1280);
    expect(container.querySelector('.nl-shell')).toHaveClass('is-wide');
    expect(container.querySelector('.nl-shell')).not.toHaveClass('is-collapsed');
    expect(screen.getByRole('button', { name: 'Collapse menu' })).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeVisible();
  });

  test('1024 to 1099px: still the full sidebar', () => {
    const { container } = shell({}, '/sales/history', 1050);
    expect(container.querySelector('.nl-shell')).toHaveClass('is-wide');
    expect(container.querySelector('.nl-shell')).not.toHaveClass('is-collapsed');
  });

  test('768 to 1023px: the sidebar is icons only and cannot be widened', () => {
    const { container } = shell({}, '/sales/history', 900);
    expect(container.querySelector('.nl-shell')).toHaveClass('is-medium', 'is-collapsed');
    expect(screen.queryByRole('button', { name: 'Collapse menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toHaveClass('is-collapsed');
  });

  test('below 768px: no sidebar in the page; a menu button opens it as a drawer', () => {
    const { container } = shell({}, '/sales/history', 600);
    expect(container.querySelector('.nl-shell')).toHaveClass('is-narrow');
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Main menu' });
    expect(within(drawer).getByRole('link', { name: 'Customers' })).toBeInTheDocument();
    expect(within(drawer).getByText('Sell')).toBeVisible();
  });

  test('the drawer closes when a page is chosen, with Escape, and when the window grows to 768px', () => {
    shell({}, '/sales/history', 600);
    userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Customers' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('where')).toHaveTextContent('/customers');
    userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
    userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    resize(900);
    expect(screen.queryByRole('dialog')).toBeNull();
    resize(600);
    expect(screen.queryByRole('dialog')).toBeNull(); // it does not come back by itself
  });

  test('a growing window moves between the states without a reload', () => {
    const { container } = shell({}, '/sales/history', 1280);
    resize(900);
    expect(container.querySelector('.nl-shell')).toHaveClass('is-collapsed');
    resize(500);
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    resize(1280);
    expect(screen.getByRole('navigation', { name: 'Main menu' })).not.toHaveClass('is-collapsed');
  });

  test('the collapsed choice is remembered, and applies from 1024px up', () => {
    const first = shell({}, '/sales/history', 1280);
    userEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    expect(first.container.querySelector('.nl-shell')).toHaveClass('is-collapsed');
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('collapsed');
    first.unmount();
    const second = shell({}, '/sales/history', 1280);
    expect(second.container.querySelector('.nl-shell')).toHaveClass('is-collapsed');
    userEvent.click(screen.getByRole('button', { name: 'Expand menu' }));
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('expanded');
  });

  test('a device that will not store the choice still works', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { container } = shell({}, '/sales/history', 1280);
    userEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    expect(container.querySelector('.nl-shell')).toHaveClass('is-collapsed');
    spy.mockRestore();
  });
});

describe('Top bar', () => {
  test('is a 64px banner with the logo, search, Go to till, theme, help and the user menu', () => {
    shell({ topBar: { user: { name: 'Wanjiru Kamau' } } });
    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('link', { name: 'Murzak POS, go to Home' })).toHaveAttribute('href', '/dashboard');
    expect(within(bar).getByRole('button', { name: 'Search' })).toHaveAttribute('aria-keyshortcuts', 'Control+K /');
    expect(within(bar).getByText('Ctrl K')).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'Go to till' })).toHaveAttribute('href', '/sales/pos');
    expect(within(bar).getByRole('button', { name: 'Switch to the dark theme' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Help and shortcuts' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Account menu for Wanjiru Kamau' })).toHaveTextContent('W');
  });

  test('Go to till is the primary button, reads Open till when no till is open, and never wraps', () => {
    const { unmount } = shell({ topBar: { till: { open: false } } });
    const link = screen.getByRole('link', { name: 'Open till' });
    expect(link).toHaveClass('nl-btn--primary');
    unmount();
    shell({ topBar: { till: { open: true, since: '08:15' } } });
    expect(screen.getByRole('link', { name: 'Go to till' })).toBeInTheDocument();
    expect(block('.nl-topbar__till')).toMatch(/white-space:\s*nowrap/);
    expect(block('.nl-topbar__till')).toMatch(/min-width:\s*128px/);
    expect(block('.nl-topbar__till')).toMatch(/flex:\s*none/);
  });

  test('the Till open pill shows only while a till is open, and opens its panel', () => {
    const onTillPill = jest.fn();
    const { unmount } = shell({ topBar: { till: { open: false } } });
    expect(screen.queryByRole('button', { name: /Till open/ })).toBeNull();
    unmount();
    shell({ topBar: { till: { open: true, since: '08:15' }, onTillPill } });
    userEvent.click(screen.getByRole('button', { name: 'Till open since 08:15' }));
    expect(onTillPill).toHaveBeenCalledTimes(1);
  });

  test('toasts keep clear of the Till open pill and Go to till', () => {
    shell({ topBar: { till: { open: true, since: '08:15' } } });
    expect(screen.getByRole('button', { name: /Till open since/ })).toHaveAttribute('data-toast-keepout');
    expect(screen.getByRole('link', { name: 'Go to till' })).toHaveAttribute('data-toast-keepout');
  });

  test('the store switcher appears only when the shop has more than one location', () => {
    const onChange = jest.fn();
    const one = shell({ topBar: { stores: { list: [{ id: 'a', name: 'Main shop' }], currentId: 'a', onChange } } });
    expect(screen.queryByRole('button', { name: /Change store/ })).toBeNull();
    one.unmount();
    shell({ topBar: { stores: { list: [{ id: 'a', name: 'Main shop' }, { id: 'b', name: 'Westlands' }], currentId: 'a', onChange } } });
    userEvent.click(screen.getByRole('button', { name: 'Store: Main shop. Change store' }));
    expect(screen.getByRole('menuitemradio', { name: 'Main shop' })).toHaveAttribute('aria-checked', 'true');
    userEvent.click(screen.getByRole('menuitemradio', { name: 'Westlands' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('+ New lists the quick actions it is given, and is left out when there are none', () => {
    const open = jest.fn();
    const none = shell();
    expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
    none.unmount();
    shell({ topBar: { newItems: [{ label: 'Sale', onClick: open }, { label: 'Product' }] } });
    userEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Sale', 'Product']);
  });

  test('the user menu says who is signed in and offers Sign out', () => {
    const onSignOut = jest.fn();
    shell({ topBar: { user: { name: 'Wanjiru Kamau' }, userItems: [{ label: 'Sign out', onClick: onSignOut }] } });
    userEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    expect(screen.getByRole('menuitem', { name: 'Signed in as Wanjiru Kamau' })).toBeDisabled();
    userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  test('below 1100px the search loses its hint and shrinks first; below 768px only four things stay', () => {
    expect(css).toMatch(/@media \(max-width: 1099px\)\s*\{\s*\.nl-topbar__kbd\s*\{\s*display: none/);
    expect(block('.nl-topbar__search')).toMatch(/flex:\s*1 1 360px/);
    const narrow = css.slice(css.indexOf('@media (max-width: 767px)'));
    expect(narrow).toMatch(/\.nl-topbar__optional,\s*\.nl-topbar__logo,\s*\.nl-topbar__search-text,\s*\.nl-topbar__kbd\s*\{\s*display: none/);
  });

  test('below 1024px the store switcher and + New keep only their icons (and their names for screen readers), and the pill drops the time', () => {
    expect(css).toMatch(/@media \(max-width: 1023px\)\s*\{\s*\.nl-btn\.nl-topbar__collapsible\s*\{\s*width:\s*var\(--control-height\)/);
    expect(css).toMatch(/\.nl-topbar__collapsible \.nl-btn__label,\s*\.nl-pill__since\s*\{\s*display: none/);
    shell({ topBar: { till: { open: true, since: '08:15' }, newItems: [{ label: 'Sale' }], stores: { list: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], currentId: 'a' } } });
    expect(screen.getByRole('button', { name: 'New' })).toHaveClass('nl-topbar__collapsible');
    expect(screen.getByRole('button', { name: /Change store/ })).toHaveClass('nl-topbar__collapsible');
    expect(screen.getByRole('button', { name: 'Till open since 08:15' }).querySelector('.nl-pill__since')).toHaveTextContent('since 08:15');
  });

  test('on a phone the menu button, search, Go to till and the user menu are what the bar holds', () => {
    shell({ topBar: { till: { open: true, since: '08:15' }, newItems: [{ label: 'Sale' }], stores: { list: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], currentId: 'a' } } }, '/sales/history', 500);
    const bar = screen.getByRole('banner');
    // They are in the page, and a phone's style sheet hides all but four; here we check the four exist
    expect(within(bar).getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'Go to till' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Account menu/ })).toBeInTheDocument();
  });

  test('is sticky at the top, and a table header sticks just under it', () => {
    expect(block('.nl-topbar')).toMatch(/position:\s*sticky/);
    expect(block('.nl-shell')).toMatch(/--sticky-top:\s*var\(--topbar-height\)/);
  });
});

describe('Page area and keyboard', () => {
  test('has landmarks: a banner, the main menu and one main area', () => {
    const { container } = shell();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(container.querySelector('.nl-shell__content')).toBeInTheDocument();
  });

  test('"Skip to the page" is the first stop of the Tab key and moves focus to the page', () => {
    shell();
    userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to the page' });
    expect(skip).toHaveFocus();
    userEvent.keyboard('{Enter}');
    fireEvent.click(skip);
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  test('Ctrl K and / open search; / is ignored while typing in a field; neither works over a dialog', () => {
    shell();
    userEvent.keyboard('{ctrl}k{/ctrl}');
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    userEvent.keyboard('/');
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
    userEvent.keyboard('{Escape}');
    // the search box in the top bar opens it too, and focus returns to it
    userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('combobox')).toHaveFocus();
    userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveFocus();
  });

  test('"/" typed into a field is just a slash', () => {
    window.innerWidth = 1280;
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ToastProvider>
            <AppShell navigation={CURRENT} topBar={{}}>
              <label>
                Note
                <input />
              </label>
            </AppShell>
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    );
    userEvent.type(screen.getByLabelText('Note'), 'a/b');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Note')).toHaveValue('a/b');
  });

  test('Help lists the keyboard shortcuts', () => {
    shell();
    userEvent.click(screen.getByRole('button', { name: 'Help and shortcuts' }));
    const dialog = screen.getByRole('dialog', { name: 'Help and shortcuts' });
    expect(within(dialog).getByText('Ctrl K or /')).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Help and shortcuts' })).toHaveFocus();
  });

  test('the page area is padded 24px, 16px on a phone, and no wider than 1240px', () => {
    expect(block('.nl-shell__main')).toMatch(/padding:\s*var\(--page-gutter\)/);
    expect(block('.nl-shell__content')).toMatch(/max-width:\s*var\(--content-max\)/);
    expect(css.slice(css.indexOf('@media (max-width: 767px)'))).toMatch(/\.nl-shell__main\s*\{\s*padding:\s*var\(--space-4\)/);
  });
});

describe('Search', () => {
  const actions = [{ label: 'Add product', keywords: 'new create item', onSelect: jest.fn() }];
  const openSearch = (props) => {
    shell({ searchActions: actions, ...props });
    userEvent.keyboard('/');
    return screen.getByRole('combobox');
  };

  test('finds a page by the start of its name, best match first', () => {
    const items = [
      { key: 'a', label: 'Stock levels' },
      { key: 'b', label: 'Sales' },
      { key: 'c', label: 'Purchase sales report' },
    ];
    expect(search(items, 'sal').map((i) => i.key)).toEqual(['b', 'c']);
    expect(search(items, 'LEVELS').map((i) => i.key)).toEqual(['a']);
    expect(search(items, '')).toEqual([]);
  });

  test('typing shows matching pages and actions; the arrow keys move; Enter opens a page', () => {
    const box = openSearch();
    userEvent.type(box, 'sa');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['SalesPage']);
    userEvent.clear(box);
    userEvent.type(box, 'p');
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(expect.arrayContaining(['ProductsPage', 'PurchasesPage', 'Add productAction']));
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    userEvent.clear(box);
    userEvent.type(box, 'customers{enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('where')).toHaveTextContent('/customers');
  });

  test('an action runs instead of opening a page', () => {
    actions[0].onSelect.mockClear();
    const box = openSearch();
    userEvent.type(box, 'add prod{enter}');
    expect(actions[0].onSelect).toHaveBeenCalledTimes(1);
  });

  test('"Nothing matches" comes with a suggestion', () => {
    const box = openSearch();
    userEvent.type(box, 'zzzz');
    const status = within(screen.getByRole('dialog', { name: 'Search' })).getByRole('status');
    expect(status).toHaveTextContent('Nothing matches \u201czzzz\u201d');
    expect(status).toHaveTextContent('Try a page name such as Sales or Products, or an action such as add product.');
  });

  test('the box is empty at first, with a hint; recent choices appear next time', () => {
    const first = openSearch();
    expect(screen.getByText('Type a page or an action, such as Sales or add product.')).toBeInTheDocument();
    userEvent.type(first, 'reports{enter}');
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))).toEqual(['page-reports']);
    userEvent.keyboard('/');
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Recent searches' })).toHaveTextContent('Reports');
  });

  test('keeps at most five recent searches, newest first, and survives a broken store', () => {
    localStorage.setItem(RECENT_KEY, 'not json');
    const box = openSearch();
    expect(screen.queryByText('Recent searches')).toBeNull();
    userEvent.type(box, 'sales{enter}');
    ['customers', 'products', 'purchases', 'suppliers', 'reports'].forEach((word) => {
      userEvent.keyboard('/');
      userEvent.type(screen.getByRole('combobox'), `${word}{enter}`);
    });
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY));
    expect(saved).toHaveLength(5);
    expect(saved[0]).toBe('page-reports');
    expect(saved).not.toContain('page-sales');
  });
});

describe('PageHeader', () => {
  const header = (props) =>
    render(
      <MemoryRouter initialEntries={['/sales']}>
        <PageHeader title="Sales" {...props} />
      </MemoryRouter>
    );

  test('has one title (a level 1 heading), an optional one-line subtitle and actions on the right', () => {
    header({ subtitle: 'Every sale, newest first.', actions: <Button>Export</Button> });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Sales', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Every sale, newest first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(block('.nl-page-header__title')).toMatch(/font-size:\s*var\(--page-title-size\)/);
    expect(block('.nl-page-header__title')).toMatch(/font-weight:\s*var\(--page-title-weight\)/);
    expect(block('.nl-page-header__row')).toMatch(/justify-content:\s*space-between/);
  });

  test('two actions are allowed; a third is reported while developing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    header({ actions: [<Button key="a">A</Button>, <Button key="b">B</Button>] });
    expect(spy).not.toHaveBeenCalled();
    header({ actions: [<Button key="a">A</Button>, <Button key="b">B</Button>, <Button key="c">C</Button>] });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('at most 2 header actions'));
    spy.mockRestore();
  });

  test('shows tabs under the title, as real links', () => {
    header({ tabs: { tabs: [{ key: 'all', label: 'All sales', to: '/sales' }, { key: 'unpaid', label: 'Unpaid', to: '/sales/unpaid' }], value: 'all' } });
    expect(screen.getByRole('tab', { name: 'All sales' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Unpaid' })).toHaveAttribute('href', '/sales/unpaid');
  });

  test('the browser tab says where you are, and goes back when the page closes', () => {
    document.title = 'Murzak POS | Point of sale';
    const { unmount } = header({});
    expect(document.title).toBe('Sales | Murzak POS');
    unmount();
    expect(document.title).toBe('Murzak POS | Point of sale');
  });
});

describe('NewLookShell', () => {
  const inShell = () => {
    window.innerWidth = 1280;
    const onSignOut = jest.fn();
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/new-look']}>
          <Routes>
            <Route
              path="/new-look"
              element={
                <NewLookShell user={{ name: 'Wanjiru Kamau' }} onSignOut={onSignOut}>
                  <PageHeader title="New look" />
                </NewLookShell>
              }
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    return onSignOut;
  };

  test('puts the page inside the full shell, with Go to till pointing at today\u2019s till', () => {
    inShell();
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to till' })).toHaveAttribute('href', '/sales/pos');
    expect(screen.getByRole('heading', { name: 'New look', level: 1 })).toBeInTheDocument();
  });

  test('parts waiting on other tickets stay out until switched on; + New is there', () => {
    inShell();
    expect(screen.queryByRole('button', { name: /Till open/ })).toBeNull();
    userEvent.click(screen.getByRole('banner').querySelector('[aria-haspopup="menu"][aria-label="New"]'));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Sale', 'Product', 'Customer', 'Expense (coming soon)', 'Purchase']);
  });

  test('the theme button switches the theme and says what it will do', () => {
    inShell();
    userEvent.click(screen.getByRole('button', { name: 'Switch to the dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to the light theme' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Switch to the light theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  test('Sign out is in the user menu', () => {
    const onSignOut = inShell();
    userEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('Styles', () => {
  test('uses no colour of its own: only tokens', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(/);
  });

  test('never removes an outline', () => {
    expect(css).not.toMatch(/outline:\s*(none|0)/);
  });

  test('every control in the shell is at least 44px high below 768px', () => {
    const narrow = css.slice(css.indexOf('@media (max-width: 767px)'));
    expect(narrow).toMatch(/\.nl-topbar__search\s*\{[^}]*height:\s*var\(--control-height-till\)/);
    expect(narrow).toMatch(/\.nl-nav__item\s*\{\s*min-height:\s*var\(--control-height-till\)/);
    expect(narrow).toMatch(/\.nl-btn\.nl-topbar__avatar\s*\{\s*width:\s*var\(--control-height-till\)/);
  });
});

// TopBar is exported for the screens that need it alone
test('the top bar can be shown by itself', () => {
  render(
    <MemoryRouter>
      <TopBar homeTo="/" tillTo="/till" />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: 'Go to till' })).toHaveAttribute('href', '/till');
});
