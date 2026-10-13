/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   A few checks need structure no role query can express: that the sparkline is hidden from screen readers and that
   skeleton shapes are held back for the first 200ms. */
/**
 * Phase 2, Home (P2-3 to P2-7): the decisions in homeModel, the refreshing hook, and the page for an owner, a cashier,
 * a failing card, a shop with no sales and a till left open. Acceptance checks AC-08 to AC-15 at the screen level.
 */
import React from 'react';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import HomePage from './HomePage';
import NeedsAttention, { describeItem } from './NeedsAttention';
import useOverview from './useOverview';
import { MissingCostDialog } from './MissingCostList';
import { changeInfo, dateLine, greeting, greetingWord, hasNoSalesYet, monthProgress, overviewCsv, periodFromSearch, rangeWords, reminderLink, todayIso, whatsappNumber } from './homeModel';
import { getOverview } from '../../api/overviewApi';
import { getMyAccess } from '../../api/accessApi';
import { sampleHours, samplePayments, sampleProducts, sampleSales } from '../charts/sampleData';

jest.mock('../../api/overviewApi', () => ({ getOverview: jest.fn(), getProductsWithoutCost: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { first_name: 'Amina', company: 'Demo Shop' } }, warehouse: { warehouses: [] }, staff: { staffUsers: [] } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));
jest.mock('../../store/staffSlice', () => ({ getStaffUsers: jest.fn(() => ({ type: 'y' })) }));

// ---------- Fixtures: made-up shop data, never real ----------
const overview = (over = {}) => {
  const sales = sampleSales(30).map((p) => ({ date: p.date, revenue: p.revenue, profit: p.profit, count: p.count, previous: p.previous }));
  return {
    role: 'owner',
    period: { key: '30d', from: sales[0].date, to: '2026-10-12', days: 30, days_of_data: 30 },
    updated_at: '14:52',
    cached: false,
    hero: { today_total: 12450, same_weekday_last_week_total: 11000, change_pct: 13.2, sales_count: 9, average_basket: 1383.33, cash_in_till: { amount: 9800, opening_float: 2000 }, mpesa: { amount: 4200, payments: 23 }, till: { state: 'open', session: 'POS-OPE-1', opened_on: '2099-01-01', opened_at: '08:15' } },
    tiles: {
      revenue: { value: 71000, gross_total: 82360, previous: 63000, change_pct: 12.7, spark: [1, 2, 3, 4], days_of_data: 30 },
      net_profit: { value: 18400, margin_pct: 25.9, previous: 16000, change_pct: 15, spark: [1, 2, 3], estimated: true, uncosted_products: 12 },
      money_owed: { amount: 24500, customers: 6, previous: null, change_pct: null, spark: [] },
      low_stock: { count: 5, out_of_stock: 2, previous: null, change_pct: null, spark: [] },
    },
    charts: {
      sales,
      payments: samplePayments,
      top_products: sampleProducts.map((p, i) => ({ item_code: `I${i}`, ...p })),
      busiest_hours: sampleHours,
    },
    attention: [
      { type: 'out_of_stock', urgency: 2, item_code: 'ITM-7', name: 'Milk 500ml' },
      { type: 'customer_overdue', urgency: 4, customer: 'C4', name: 'Wanjiru Kamau', mobile: '0712345678', amount: 3500, days_overdue: 6 },
    ],
    errors: {},
    ...over,
  };
};

const cashierView = () => {
  const data = overview({ role: 'cashier', attention: [{ type: 'out_of_stock', urgency: 2, item_code: 'ITM-7', name: 'Milk 500ml' }] });
  delete data.tiles.net_profit;
  delete data.tiles.money_owed;
  data.charts.sales = data.charts.sales.map(({ profit, ...rest }) => rest);
  return data;
};

const Where = () => <p data-testid="where">{useLocation().pathname + useLocation().search}</p>;
const renderHome = (url = '/new-look', tier = 'owner') => {
  const can = tier === 'cashier' ? { profit: false, cost_of_goods: false, money_owed: false } : { profit: true, cost_of_goods: true, money_owed: true };
  getMyAccess.mockResolvedValue({ tier, can });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <HomePage />
        <Where />
      </AccessProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

// ---------- The decisions ----------
describe('homeModel', () => {
  test('reads the period from the address and falls back to 30 days for anything unusable', () => {
    expect(periodFromSearch(new URLSearchParams('period=7d'))).toEqual({ period: '7d', from: '', to: '' });
    expect(periodFromSearch(new URLSearchParams(''))).toEqual({ period: '30d', from: '', to: '' });
    expect(periodFromSearch(new URLSearchParams('period=forever'))).toEqual({ period: '30d', from: '', to: '' });
    expect(periodFromSearch(new URLSearchParams('period=custom&from=2026-10-01&to=2026-10-12'))).toEqual({ period: 'custom', from: '2026-10-01', to: '2026-10-12' });
    expect(periodFromSearch(new URLSearchParams('period=custom&from=2026-10-12&to=2026-10-01')).period).toBe('30d');
    expect(periodFromSearch(new URLSearchParams('period=custom')).period).toBe('30d');
  });

  test('greets by the hour in Nairobi and writes the date day first', () => {
    expect(greetingWord(6)).toBe('Good morning');
    expect(greetingWord(12)).toBe('Good afternoon');
    expect(greetingWord(17)).toBe('Good evening');
    const noon = new Date('2026-10-13T09:00:00Z'); // 12:00 in Nairobi
    expect(greeting('Amina', noon)).toBe('Good afternoon, Amina');
    expect(greeting('', noon)).toBe('Good afternoon');
    expect(dateLine(noon)).toBe('Tuesday 13 October 2026');
    expect(todayIso(new Date('2026-10-13T22:30:00Z'))).toBe('2026-10-14'); // already tomorrow in Nairobi
  });

  test('says a change in words with a direction, and says so when there is nothing to compare', () => {
    expect(changeInfo(13.24, { up: 'Up {pct}%', down: 'Down {pct}%', same: 'Same', none: 'None' })).toEqual({ direction: 'up', text: 'Up 13.2%' });
    expect(changeInfo(-4, { up: 'Up {pct}%', down: 'Down {pct}%', same: 'Same', none: 'None' })).toEqual({ direction: 'down', text: 'Down 4%' });
    expect(changeInfo(0, { up: 'Up', down: 'Down', same: 'Same', none: 'None' }).direction).toBe('flat');
    expect(changeInfo(null, { up: 'Up', down: 'Down', same: 'Same', none: 'None' }).direction).toBe('none');
  });

  test('worked out from the end of the period: Day 12 of 31', () => {
    expect(monthProgress('2026-10-12')).toEqual({ day: 12, days: 31 });
    expect(monthProgress('2026-02-03')).toEqual({ day: 3, days: 28 });
  });

  test('turns a Kenyan mobile number into the form WhatsApp wants, and the app sends nothing itself', () => {
    expect(whatsappNumber('0712 345 678')).toBe('254712345678');
    expect(whatsappNumber('+254712345678')).toBe('254712345678');
    expect(whatsappNumber('712345678')).toBe('254712345678');
    expect(whatsappNumber('')).toBe('');
    const link = reminderLink({ mobile: '0712345678', name: 'Wanjiru', amount: 3500, shop: 'Demo Shop' });
    expect(link).toMatch(/^https:\/\/wa\.me\/254712345678\?text=/);
    expect(decodeURIComponent(link)).toContain('KES 3,500');
  });

  test('a shop with no sales at all gets the first-time panel, a shop with any sale does not', () => {
    expect(hasNoSalesYet({ period: { days_of_data: 0 }, tiles: { revenue: { value: 0 } }, hero: { today_total: 0 }, charts: { sales: [{ revenue: 0, count: 0 }] } })).toBe(true);
    expect(hasNoSalesYet(overview())).toBe(false);
    expect(hasNoSalesYet(null)).toBe(false);
  });

  test('describes the period in words for the charts', () => {
    expect(rangeWords('30d')).toBe('the last 30 days');
    expect(rangeWords('custom', '2026-10-01', '2026-10-12')).toBe('1 Oct to 12 Oct');
  });

  test('the CSV holds the visible numbers, and a cashier gets no profit or debt in it', () => {
    const owner = overviewCsv(overview(), { canProfit: true });
    expect(owner).toContain('"Net profit","18400"');
    expect(owner).toContain('"Money owed to you"');
    const cashier = overviewCsv(cashierView(), { canProfit: false });
    expect(cashier).not.toMatch(/Net profit|Money owed|profit/);
    expect(cashier).toContain('"Revenue"');
  });
});

// ---------- The hook ----------
describe('useOverview', () => {
  test('loads, refreshes quietly every 60 seconds without blanking, and retries on request', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 }).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ n: 4 });
    const { result } = renderHook(() => useOverview({ period: '30d' }, { fetcher, refreshMs: 60000 }));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(result.current.data).toEqual({ n: 2 });
    expect(result.current.status).toBe('ready');
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    // The failed quiet refresh keeps what is on screen
    expect(result.current.status).toBe('ready');
    expect(result.current.data).toEqual({ n: 2 });
    await act(async () => {
      result.current.reload();
    });
    expect(result.current.data).toEqual({ n: 4 });
    jest.useRealTimers();
  });

  test('a first failure shows the error state, and asking again recovers', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('We could not reach the server.')).mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useOverview({ period: '30d' }, { fetcher }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error.message).toMatch(/could not reach/);
    await act(async () => {
      result.current.reload();
    });
    expect(result.current.status).toBe('ready');
  });

  test('changing the period asks again with the new period, and a slow old answer is ignored', async () => {
    let resolveFirst;
    const fetcher = jest.fn((query) => (query.period === '30d' ? new Promise((r) => (resolveFirst = r)) : Promise.resolve({ for: query.period })));
    const { result, rerender } = renderHook(({ period }) => useOverview({ period }, { fetcher }), { initialProps: { period: '30d' } });
    rerender({ period: '7d' });
    await waitFor(() => expect(result.current.data).toEqual({ for: '7d' }));
    await act(async () => resolveFirst({ for: '30d' }));
    expect(result.current.data).toEqual({ for: '7d' });
  });
});

// ---------- The page ----------
describe('Home for an owner', () => {
  test('draws the hero, four tiles, four charts and Needs attention from one answer (AC-08 to AC-11)', async () => {
    getOverview.mockResolvedValue(overview());
    renderHome();
    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Amina$/ })).toBeInTheDocument();
    expect(await screen.findByTestId('hero-total')).toHaveTextContent('KES 12,450');
    const hero = screen.getByRole('region', { name: 'Today so far' });
    expect(within(hero).getByText('Up 13.2% on last', { exact: false })).toBeInTheDocument();
    expect(within(hero).getByText('Includes KES 2,000 float')).toBeInTheDocument();
    expect(within(hero).getByText('23 payments recorded')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Count and close till' })).toBeInTheDocument();
    expect(screen.getByText('Updated 14:52')).toBeInTheDocument();
    ['Revenue', 'Net profit', 'Money owed to you', 'Low on stock'].forEach((name) => expect(screen.getByRole('link', { name: new RegExp(`^${name}:`) })).toBeInTheDocument());
    expect(screen.getByText('KES 18,400')).toBeInTheDocument();
    expect(screen.getByText('Without VAT; KES 82,360 with VAT')).toBeInTheDocument();
    expect(screen.getAllByRole('figure')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
  });

  test('the period lives in the address, and the server is asked for it (AC-11)', async () => {
    getOverview.mockResolvedValue(overview());
    renderHome('/new-look?period=7d');
    await screen.findByTestId('hero-total');
    expect(getOverview).toHaveBeenCalledWith(expect.objectContaining({ period: '7d' }));
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
    userEvent.click(screen.getByRole('radio', { name: 'This month' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('period=month'));
    await waitFor(() => expect(getOverview).toHaveBeenLastCalledWith(expect.objectContaining({ period: 'month' })));
  });

  test('Net profit says how many products are not counted, and the line opens the list (AC-13, P2-7)', async () => {
    getOverview.mockResolvedValue(overview());
    const { getProductsWithoutCost } = require('../../api/overviewApi');
    getProductsWithoutCost.mockResolvedValue([{ item_code: 'X1', item_name: 'Foam roller', units_sold: 14 }]);
    renderHome();
    expect(await screen.findByText('Profit not counted for 12 products without a cost price')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add the costs' }));
    const dialog = await screen.findByRole('dialog', { name: 'Products without a cost price' });
    expect(await within(dialog).findByText('Foam roller')).toBeInTheDocument();
    expect(within(dialog).getByText('14 sold')).toBeInTheDocument();
  });

  test('the missing-cost line is absent when every product has a cost', async () => {
    const data = overview();
    data.tiles.net_profit.uncosted_products = 0;
    getOverview.mockResolvedValue(data);
    renderHome();
    await screen.findByText('KES 18,400');
    expect(screen.queryByText(/Profit not counted/)).not.toBeInTheDocument();
  });

  test('never shows KES 0 as profit when the server gave a figure', async () => {
    getOverview.mockResolvedValue(overview());
    renderHome();
    await screen.findByText('KES 18,400');
    expect(screen.queryByText('KES 0')).not.toBeInTheDocument();
  });

  test('one failing card shows its own retry while the rest still draws (AC-15)', async () => {
    const data = overview();
    data.charts.payments = null;
    data.errors = { 'charts.payments': 'Could not load this.' };
    getOverview.mockResolvedValue(data);
    renderHome();
    await screen.findByTestId('hero-total');
    expect(screen.getAllByRole('figure')).toHaveLength(3);
    const failed = screen.getByRole('heading', { name: 'How customers paid (KES)' }).closest('section');
    expect(within(failed).getByText('We could not load this chart')).toBeInTheDocument();
    getOverview.mockResolvedValue(overview());
    userEvent.click(within(failed).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getAllByRole('figure')).toHaveLength(4));
  });

  test('a failed call shows a page error with Try again, and nothing is invented', async () => {
    getOverview.mockRejectedValueOnce(new Error('We could not reach the server.'));
    renderHome();
    expect(await screen.findByRole('heading', { name: 'We could not load Home' })).toBeInTheDocument();
    getOverview.mockResolvedValue(overview());
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('hero-total')).toBeInTheDocument();
  });

  test('a shop with no sales sees the first-time panel in place of the tiles and charts', async () => {
    const data = overview({ period: { key: '30d', from: '2026-09-14', to: '2026-10-12', days: 30, days_of_data: 0 } });
    data.hero.today_total = 0;
    data.hero.sales_count = 0;
    data.tiles.revenue.value = 0;
    data.charts.sales = data.charts.sales.map((p) => ({ ...p, revenue: 0, count: 0 }));
    getOverview.mockResolvedValue(data);
    renderHome();
    expect(await screen.findByRole('heading', { name: /first sale is waiting/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Revenue:/ })).not.toBeInTheDocument();
  });

  test('a till left open from an earlier day becomes a warning banner (the hero button is replaced)', async () => {
    const data = overview();
    data.hero.till = { state: 'open', session: 'POS-OPE-1', opened_on: '2020-01-01', opened_at: '08:15' };
    getOverview.mockResolvedValue(data);
    renderHome();
    expect(await screen.findByRole('alert')).toHaveTextContent('A till is still open from an earlier day');
  });

  test('says Open till when none is open, and "no till" under cash', async () => {
    const data = overview();
    data.hero.till = { state: 'closed' };
    data.hero.cash_in_till = null;
    getOverview.mockResolvedValue(data);
    renderHome();
    expect(await screen.findByRole('link', { name: 'Open till' })).toBeInTheDocument();
    expect(screen.getByText('No till is open')).toBeInTheDocument();
  });

  test('under 7 days of data the tiles show the month progress meter', async () => {
    const data = overview({ period: { key: 'today', from: '2026-10-12', to: '2026-10-12', days: 1, days_of_data: 1 } });
    getOverview.mockResolvedValue(data);
    renderHome();
    await screen.findByTestId('hero-total');
    expect(screen.getAllByRole('meter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Day 12 of 31').length).toBeGreaterThan(0);
  });

  test('skeleton shapes are held back for the first 200ms of loading', async () => {
    jest.useFakeTimers();
    getOverview.mockReturnValue(new Promise(() => {}));
    const { container } = renderHome();
    expect(container.querySelector('.nl-home')).toHaveClass('is-waiting');
    act(() => jest.advanceTimersByTime(250));
    expect(container.querySelector('.nl-home')).not.toHaveClass('is-waiting');
    jest.useRealTimers();
  });
});

describe('Home for a cashier (AC-14)', () => {
  test('has no Net profit, Money owed, profit switch or debt items on screen', async () => {
    getOverview.mockResolvedValue(cashierView());
    renderHome('/new-look', 'cashier');
    await screen.findByTestId('hero-total');
    await screen.findByRole('link', { name: /^Revenue:/ });
    expect(screen.queryByText(/Net profit|Money owed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Profit' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Add the costs|Profit not counted/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^(Revenue|Low on stock):/ })).toHaveLength(2);
  });

  test('even if the server wrongly sent a profit figure, a cashier does not see it', async () => {
    const data = overview();
    getOverview.mockResolvedValue(data);
    renderHome('/new-look', 'cashier');
    await screen.findByTestId('hero-total');
    await screen.findByRole('link', { name: /^Revenue:/ });
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Profit' })).not.toBeInTheDocument());
    expect(screen.queryByText(/Net profit|Money owed|Profit not counted|Wanjiru/)).not.toBeInTheDocument();
    expect(screen.queryByText('KES 18,400')).not.toBeInTheDocument();
  });
});

// ---------- Needs attention (AC-12) ----------
describe('Needs attention', () => {
  const links = { close: '/sales/pos', reorder: (i) => `/purchases/new?item=${i.item_code}`, pay: () => '/purchases/invoices', all: '/inventory/low-stock' };
  const all = [
    { type: 'till_not_closed', urgency: 1, session: 'POS-OPE-1', opened_on: '2026-10-11' },
    { type: 'out_of_stock', urgency: 2, item_code: 'ITM-7', name: 'Milk 500ml' },
    { type: 'running_low', urgency: 3, item_code: 'ITM-3', name: 'Sugar 1kg', qty: 4, warning_level: 10 },
    { type: 'customer_overdue', urgency: 4, customer: 'C4', name: 'Wanjiru Kamau', mobile: '0712345678', amount: 3500, days_overdue: 6 },
    { type: 'supplier_bill_due', urgency: 5, invoice: 'PINV-9', supplier: 'Brew Ltd', amount: 12000, due_on: '2026-10-15' },
  ];

  test('each rule has its one button, most urgent first, at most four', () => {
    render(
      <MemoryRouter>
        <NeedsAttention items={all} links={links} shop="Demo Shop" />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Close: POS-OPE-1' })).toHaveAttribute('href', '/sales/pos');
    expect(screen.getByRole('link', { name: 'Reorder: Milk 500ml' })).toHaveAttribute('href', '/purchases/new?item=ITM-7');
    expect(screen.getByRole('link', { name: 'Reorder: Sugar 1kg' })).toBeInTheDocument();
    expect(screen.getByText('4 left; the warning level is 10')).toBeInTheDocument();
    expect(screen.queryByText('Brew Ltd')).not.toBeInTheDocument(); // the fifth is not shown
  });

  test('Remind opens WhatsApp with a ready message in a new tab, and Pay opens the payment', () => {
    render(
      <MemoryRouter>
        <NeedsAttention items={all.slice(3)} links={links} shop="Demo Shop" />
      </MemoryRouter>
    );
    const remind = screen.getByRole('link', { name: 'Remind: Wanjiru Kamau' });
    expect(remind.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/254712345678\?text=Hello/);
    expect(remind).toHaveAttribute('target', '_blank');
    expect(remind).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: 'Pay: Brew Ltd' })).toHaveAttribute('href', '/purchases/invoices');
  });

  test('every item says what it is in words, not by colour or icon alone', () => {
    render(
      <MemoryRouter>
        <NeedsAttention items={all.slice(0, 4)} links={links} shop="Demo Shop" />
      </MemoryRouter>
    );
    ['Till not closed', 'Out of stock', 'Running low', 'Customer overdue'].forEach((word) => expect(screen.getByText(word)).toBeInTheDocument());
  });

  test('with nothing to do it says so with a check icon', () => {
    const { container } = render(
      <MemoryRouter>
        <NeedsAttention items={[]} links={links} />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Nothing needs you right now' })).toBeInTheDocument();
    expect(container.querySelector('[data-icon="check"]')).toBeInTheDocument();
  });

  test('describes each item', () => {
    expect(describeItem(all[3])).toEqual(['Wanjiru Kamau', 'KES 3,500 overdue by 6 days']);
    expect(describeItem({ ...all[3], days_overdue: 1 })[1]).toBe('KES 3,500 overdue by 1 day');
    expect(describeItem(all[4])).toEqual(['Brew Ltd', 'KES 12,000 due 15 Oct']);
  });
});

describe('the missing-cost list', () => {
  test('says so when it cannot load, and tries again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MissingCostDialog open onClose={() => {}} range={{ from: '2026-10-01', to: '2026-10-12' }} productsTo={() => '/products'} load={load} />
      </MemoryRouter>
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this list');
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Every product that sold has a cost price.')).toBeInTheDocument();
  });
});
