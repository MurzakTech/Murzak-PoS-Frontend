/**
 * Home for each role: what the dashboard holds follows the modules a role opens (the app's own role table), with the protected figures
 * (money owed, profit) only for those the server allows. The model is checked against the real role table, then the page for a buyer, a
 * seller and a person with nothing assigned, and the choice between the full Home and the role Home.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import RoleDashboard from './RoleDashboard';
import { attentionFor, dashboardFor, openModules, rolesOf, usesFullHome } from './roleDashboardModel';
import { canAccessRoute } from '../../config/roleAccessConfig';
import { getOverview } from '../../api/overviewApi';
import { getMyAccess } from '../../api/accessApi';
import { listPurchases } from '../../api/purchasesListApi';
import { sampleProducts, sampleSales } from '../charts/sampleData';

const mockUser = { current: { first_name: 'Amina', company: 'Demo Shop', roles: [] } };
jest.mock('../../api/overviewApi', () => ({ getOverview: jest.fn(), getProductsWithoutCost: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../api/purchasesListApi', () => ({ listPurchases: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: mockUser.current }, warehouse: { warehouses: [] }, staff: { staffUsers: [] } }),
}));

const forRoles = (roles, can = {}) => dashboardFor({ hasAccess: (route) => canAccessRoute(route, roles), can: (name) => can[name] === true });

describe('what each role opens', () => {
  test('a till seller sees selling and stock, and no buying or money', () => {
    const d = forRoles(['Sales User']);
    expect(d.panels).toEqual(['sell', 'stock']);
    expect(d.focus).toBe('sell');
    expect(d.actions.sale).toBe(true);
    expect(d.actions.receive).toBe(false);
  });

  test('a purchase user sees buying and may receive goods, but not count stock', () => {
    const d = forRoles(['Purchase User']);
    expect(d.panels).toEqual(['buy', 'stock']);
    expect(d.focus).toBe('buy');
    expect(d.actions.receive).toBe(true);
    expect(d.actions.count).toBe(false);
    expect(d.actions.sale).toBe(false);
  });

  test('a stock user sees stock and may count it', () => {
    const d = forRoles(['Stock User']);
    expect(d.panels).toEqual(['stock']);
    expect(d.actions.count).toBe(true);
  });

  test('an accounts manager sees money only when the server allows the figures', () => {
    expect(forRoles(['Accounts Manager'], { money_owed: true }).panels).toEqual(['sell', 'buy', 'money', 'insight']);
    expect(forRoles(['Accounts Manager'], {}).panels).toEqual(['sell', 'buy', 'money', 'insight']); // expenses still open
    expect(forRoles(['Auditor'], {}).panels).toEqual(['sell', 'buy', 'insight']);
    expect(forRoles(['Auditor'], { money_owed: true }).panels).toEqual(['sell', 'buy', 'money', 'insight']);
  });

  test('a read-only role gets the figures it can look at and no buttons to act', () => {
    const d = forRoles(['Employee Self Service']);
    expect(d.panels).toEqual(['sell']);
    expect(d.actions.sale).toBe(false);
  });

  test('a role with only products has no panels, only the list of modules', () => {
    const d = forRoles(['Blogger']);
    expect(d.panels).toEqual([]);
    expect(d.focus).toBe('modules');
    expect(d.modules).toEqual(['products']);
  });

  test('a person with two roles gets both sets of panels', () => {
    expect(forRoles(['Sales User', 'Purchase User']).panels).toEqual(['sell', 'buy', 'stock']);
  });

  test('the modules listed are the ones the role opens, in the usual order', () => {
    expect(openModules((r) => canAccessRoute(r, ['Item Manager']))).toEqual(['products', 'stock', 'reports']);
  });

  test('attention items are limited to the modules the person has', () => {
    const items = [{ type: 'till_not_closed' }, { type: 'out_of_stock' }, { type: 'customer_overdue' }, { type: 'supplier_bill_due' }, { type: 'mystery' }];
    expect(attentionFor(items, forRoles(['Stock User'])).map((i) => i.type)).toEqual(['out_of_stock']);
    expect(attentionFor(items, forRoles(['Sales User'])).map((i) => i.type)).toEqual(['till_not_closed', 'out_of_stock']);
    expect(attentionFor(items, forRoles(['Purchase Manager'], { money_owed: true })).map((i) => i.type)).toEqual(['out_of_stock', 'supplier_bill_due']);
  });

  test('owners and full-access roles keep the full Home; a role we cannot read does too', () => {
    expect(usesFullHome({ tier: 'owner', roles: ['Sales User'] })).toBe(true);
    expect(usesFullHome({ tier: 'manager', roles: ['Business Owner'] })).toBe(true);
    expect(usesFullHome({ tier: 'manager', roles: ['System Manager'] })).toBe(true);
    expect(usesFullHome({ tier: null, roles: [] })).toBe(true);
    expect(usesFullHome({ tier: 'cashier', roles: ['Sales User'] })).toBe(false);
  });

  test('roles are read from the user in either shape', () => {
    expect(rolesOf({ roles: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(rolesOf({ role: 'A' })).toEqual(['A']);
    expect(rolesOf(null)).toEqual([]);
  });
});

const overview = () => {
  const sales = sampleSales(30).map((p) => ({ date: p.date, revenue: p.revenue, profit: p.profit, count: p.count, previous: p.previous }));
  return {
    period: { key: '30d', from: sales[0].date, to: '2026-10-12', days: 30, days_of_data: 30 },
    hero: { today_total: 12450, change_pct: 13.2, sales_count: 9, average_basket: 1383.33, cash_in_till: { amount: 9800, opening_float: 2000 }, mpesa: { amount: 4200, payments: 23 }, till: { state: 'closed' } },
    tiles: {
      revenue: { value: 71000, previous: 63000, change_pct: 12.7, spark: [1, 2, 3, 4] },
      money_owed: { amount: 24500, customers: 6, previous: null, change_pct: null, spark: [] },
      low_stock: { count: 5, out_of_stock: 2, previous: null, change_pct: null, spark: [] },
    },
    charts: { sales, payments: [], top_products: sampleProducts.map((p, i) => ({ item_code: `I${i}`, ...p })), busiest_hours: [] },
    attention: [
      { type: 'out_of_stock', item_code: 'ITM-7', name: 'Milk 500ml' },
      { type: 'customer_overdue', customer: 'C4', name: 'Wanjiru Kamau', mobile: '0712345678', amount: 3500, days_overdue: 6 },
    ],
    errors: {},
  };
};

const show = async (roles, access = { tier: 'manager', can: {} }) => {
  mockUser.current = { first_name: 'Amina', company: 'Demo Shop', roles };
  getMyAccess.mockResolvedValue(access);
  render(
    <MemoryRouter>
      <AccessProvider userKey="amina">
        <RoleDashboard />
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getOverview).toHaveBeenCalled());
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  getOverview.mockResolvedValue(overview());
  listPurchases.mockResolvedValue({ rows: [], total: 0, summary: { orders_open: 4, bills_unpaid: 15000, returned: 0 }, page: 1, pageSize: 1, pages: 1 });
});

describe('the Home of a buyer', () => {
  test('shows the buying panel with its figures and Receive goods, and no till or sales figures', async () => {
    await show(['Purchase User']);
    expect(await screen.findByRole('heading', { name: 'Buying' })).toBeInTheDocument();
    expect(await screen.findByText('Orders waiting for goods')).toBeInTheDocument();
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Receive goods' })).toHaveAttribute('href', '/purchases/receive');
    expect(screen.queryByText('Today so far (KES)')).not.toBeInTheDocument();
    expect(screen.getByText('Your workspace: Buying')).toBeInTheDocument();
  });

  test('hides the bills to pay figure unless the server allows money figures', async () => {
    await show(['Purchase User']);
    await screen.findByText('Orders waiting for goods');
    expect(screen.queryByText('Supplier bills to pay (KES)')).not.toBeInTheDocument();
  });

  test('lists only the modules the role opens, each as a link', async () => {
    await show(['Purchase User']);
    const modules = await screen.findByRole('navigation', { name: 'Modules you can open' });
    expect(within(modules).getAllByRole('link')).toHaveLength(4);
    expect(within(modules).getByRole('link', { name: /Purchases/ })).toBeInTheDocument();
    expect(within(modules).queryByRole('link', { name: /Reports/ })).not.toBeInTheDocument();
    expect(within(modules).queryByRole('link', { name: /Customers/ })).not.toBeInTheDocument();
  });

  test('shows stock to reorder but never a customer debt', async () => {
    await show(['Purchase User']);
    expect(await screen.findByText('Milk 500ml')).toBeInTheDocument();
    expect(screen.queryByText('Wanjiru Kamau')).not.toBeInTheDocument();
  });
});

describe('the Home of a seller', () => {
  test('shows today at the till and no buying panel', async () => {
    await show(['Sales User'], { tier: 'cashier', can: {} });
    expect(await screen.findByText('Today so far (KES)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open till' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Buying' })).not.toBeInTheDocument();
    expect(listPurchases).not.toHaveBeenCalled();
  });

  test('a role that can only look at sales gets no till button', async () => {
    await show(['Auditor']);
    expect(await screen.findByText('Today so far (KES)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open till' })).not.toBeInTheDocument();
  });
});

describe('when things are missing', () => {
  test('a role with no modules is told to ask for access, not shown an empty page', async () => {
    mockUser.current = { first_name: 'Amina', company: 'Demo Shop', roles: ['Customer Care'] };
    getMyAccess.mockResolvedValue({ tier: 'cashier', can: {} });
    getOverview.mockResolvedValue(overview());
    render(
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <RoleDashboard />
        </AccessProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('No modules are assigned to your role yet')).toBeInTheDocument();
  });

  test('when the figures cannot load the buying figures and the modules are still there', async () => {
    getOverview.mockRejectedValue(new Error('down'));
    await show(['Purchase Manager']);
    expect(await screen.findByText('Some figures could not be loaded. The rest of your workspace is still here.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Buying' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Modules you can open' })).toBeInTheDocument();
  });
});
