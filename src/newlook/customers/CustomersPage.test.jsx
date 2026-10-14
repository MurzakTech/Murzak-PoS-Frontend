/* eslint-disable testing-library/no-node-access --
   One check needs structure no role query can express: that a table row is the element holding the keyboard focus. */
/**
 * The Customers page (ticket P4-7), checked at the screen level against AC-25 and the list half of AC-28: the tabs All customers
 * and Owing, a summary row, filters in the address, 20 rows to a page, Export, the empty states, the Owing tab adding up to the
 * summary and to the rows, the customer panel opening from a row, a cashier seeing no balances, and the phone layout.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import CustomersPage from './CustomersPage';
import { getCustomerOverview, getCustomerStatement, getCreditHistory, getCreditLimit, getLoyaltyBalance, listCustomers } from '../../api/customersListApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/customersListApi', () => ({
  listCustomers: jest.fn(),
  getCustomerOverview: jest.fn(),
  getCustomerStatement: jest.fn(),
  getCreditLimit: jest.fn(),
  getCreditHistory: jest.fn(),
  getLoyaltyBalance: jest.fn(),
  updateCustomer: jest.fn(),
  setCreditLimit: jest.fn(),
  removeCreditLimit: jest.fn(),
  listLoyaltyPrograms: jest.fn(),
  assignLoyaltyProgram: jest.fn(),
  redeemPoints: jest.fn(),
  getPointsHistory: jest.fn(),
}));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } } }),
}));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

// ---------- Fixtures: made-up shop data, never real ----------
const NAMES = ['Wanjiru Kamau', 'Otieno Odhiambo', 'Amina Hassan', 'Baraka Stores', 'Zawadi Mwangi'];
const pad = (n, width = 3) => String(n).padStart(width, '0');
const TOTAL = 45;
const ALL = Array.from({ length: TOTAL }, (_, i) => {
  const n = i + 1;
  const owes = n % 9 === 0 ? n * 100 : 0; // customers 9, 18, 27, 36 and 45 owe money
  return {
    id: `CUST-${pad(n)}`,
    name: `${NAMES[i % NAMES.length]} ${pad(n)}`,
    type: n % 4 === 0 ? 'Company' : 'Individual',
    mobile: `+254712${pad(n, 6)}`,
    email: '',
    disabled: n === 5,
    balance: owes,
    last_purchase: n % 7 === 0 ? null : { date: '2026-10-05', amount: 250, receipt: '#0012', id: 'ACC-PSINV-2026-00012' },
  };
});
const OWING_ALL = ALL.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
const OWING_TOTAL = OWING_ALL.reduce((sum, r) => sum + r.balance, 0);

const answer = ({ tab = 'all', page = 1, pageSize = 20, search = '', type, status } = {}, cashier = false) => {
  let rows = tab === 'owing' ? OWING_ALL : ALL.filter((r) => (status === 'disabled' ? r.disabled : status === 'all' ? true : !r.disabled));
  if (search) rows = rows.filter((r) => `${r.name} ${r.mobile}`.toLowerCase().includes(search.toLowerCase()));
  if (type) rows = rows.filter((r) => r.type === type);
  const shown = rows.slice((page - 1) * pageSize, page * pageSize).map((r) => {
    if (!cashier) return r;
    const { balance, ...rest } = r; // eslint-disable-line no-unused-vars
    return { ...rest, last_purchase: r.last_purchase ? { date: r.last_purchase.date } : null };
  });
  return {
    rows: shown,
    summary: cashier ? { customers: 44 } : { customers: 44, owing_total: OWING_TOTAL, owing_customers: OWING_ALL.length },
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
};

const renderPage = async (url = '/new-look/customers', tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { profit: true, money_owed: true } });
  listCustomers.mockImplementation(async (query) => answer(query, tier === 'cashier'));
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <CustomersPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const rowOf = (text) => screen.getByRole('row', { name: new RegExp(text) });

beforeEach(() => {
  jest.resetAllMocks();
  getCustomerOverview.mockImplementation(async (id) => {
    const row = ALL.find((r) => r.id === id) || ALL[0];
    return { id: row.id, name: row.name, type: row.type, mobile: row.mobile, email: '', tax_id: '', group: '', territory: '', loyalty_program: '', disabled: row.disabled, balance: row.balance, last_purchase: row.last_purchase, features: { groups: false, territories: false } };
  });
  getCustomerStatement.mockResolvedValue({ lines: [], from: '2026-07-16', to: '2026-10-13', opening_balance: 0, closing_balance: 0, current_balance: 0, truncated: false });
  getCreditLimit.mockResolvedValue({ limit: 0, effective: 0, owed: 0, available: 0, source: '', over: false });
  getCreditHistory.mockResolvedValue({ rows: [], total: 0 });
  getLoyaltyBalance.mockResolvedValue({ points: 0, recent: [] });
  window.print = jest.fn();
  window.open = jest.fn();
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the list (AC-25)', () => {
  test('shows the tabs All customers and Owing, with All customers open', async () => {
    await renderPage();
    const tabs = within(screen.getByRole('tablist', { name: 'Customer views' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['All customers', 'Owing']);
    expect(screen.getByRole('tab', { name: 'All customers' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
  });

  test('has the columns Customer, Mobile, Balance owed, Last purchase and Status', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Customer', 'Mobile', 'Balance owed', 'Last purchase', 'Status']);
  });

  test('writes the mobile as 0712 000 001, the date day first, money as KES and the status as an icon plus a word', async () => {
    await renderPage('/new-look/customers?status=all');
    const first = await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(within(first).getByText('0712 000 001')).toBeInTheDocument();
    expect(within(first).getByText('5 Oct 2026')).toBeInTheDocument();
    expect(within(first).getByText('Active')).toBeInTheDocument();
    expect(within(rowOf('Zawadi Mwangi 005')).getByText('Disabled')).toBeInTheDocument();
    expect(within(rowOf('Baraka Stores 009')).getByText('KES 900')).toBeInTheDocument();
    expect(within(rowOf('Baraka Stores 009')).getByText('5 Oct 2026')).toBeInTheDocument();
  });

  test('says "No purchases yet" for a customer who never bought', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(within(rowOf('Otieno Odhiambo 007')).getByText('No purchases yet')).toBeInTheDocument();
  });

  test('the summary row shows Customers, Owing and Customers who owe from the server', async () => {
    await renderPage();
    await screen.findByText('KES 13,500');
    expect(screen.getByLabelText('Customers summary')).toBeInTheDocument();
    expect(screen.getByText('Customers', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Owing', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Customers who owe')).toBeInTheDocument();
    expect(screen.getByText('44')).toHaveClass('nl-summary__value');
    expect(screen.getByText('5')).toHaveClass('nl-summary__value');
  });

  test('shows 20 rows of 44 active customers, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20, tab: 'all' }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 44')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Amina Hassan 023/ });
    expect(where()).toContain('page=2');
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Zawadi Mwangi 045/ });
    expect(screen.getByText('Showing 4 of 44')).toBeInTheDocument();
  });

  test('the rows-per-page box is never blank, even for a bad address, and a change goes in the address', async () => {
    await renderPage('/new-look/customers?size=7');
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(screen.getByRole('option', { name: '50' }));
    await screen.findByText('Showing 44 of 44');
    expect(where()).toContain('size=50');
  });

  test('hides disabled customers at first and can show them through the Status choice', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(listCustomers).toHaveBeenCalledWith(expect.not.objectContaining({ status: 'disabled' }));
    userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    userEvent.click(screen.getByRole('option', { name: 'Disabled' }));
    await waitFor(() => expect(where()).toContain('status=disabled'));
    await screen.findByRole('row', { name: /Zawadi Mwangi 005/ });
    expect(listCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'disabled' }));
  });
});

describe('filters live in the address', () => {
  test('a search goes in the address and to the server, by name or mobile', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'baraka{enter}');
    await waitFor(() => expect(where()).toContain('q=baraka'));
    await waitFor(() => expect(listCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'baraka' })));
    await waitFor(() => expect(screen.queryByRole('row', { name: /Wanjiru Kamau 001/ })).not.toBeInTheDocument());
    expect(screen.getByText('Showing 9 of 9')).toBeInTheDocument();
  });

  test('a link with a search opens the same view after a refresh', async () => {
    await renderPage('/new-look/customers?q=amina&type=Individual&page=1');
    await screen.findAllByRole('row');
    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ search: 'amina', type: 'Individual' }));
    expect(screen.getByRole('searchbox', { name: 'Search customers' })).toHaveValue('amina');
  });

  test('the Type choice changes the address and the question', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    userEvent.click(screen.getByRole('option', { name: 'Company' }));
    await waitFor(() => expect(where()).toContain('type=Company'));
    await waitFor(() => expect(listCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'Company' })));
  });

  test('Clear filters appears with a filter and takes it away', async () => {
    await renderPage('/new-look/customers?type=Company');
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('type='));
  });

  test('there are no period presets on this page', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    expect(screen.queryByRole('radio', { name: 'Today' })).not.toBeInTheDocument();
  });
});

describe('the Owing tab (AC-28)', () => {
  test('choosing Owing changes the address and asks for the owing tab', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.click(screen.getByRole('tab', { name: 'Owing' }));
    await waitFor(() => expect(where()).toContain('tab=owing'));
    await waitFor(() => expect(listCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ tab: 'owing' })));
    expect(screen.getByRole('tab', { name: 'Owing' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a link to the Owing tab opens it', async () => {
    await renderPage('/new-look/customers?tab=owing');
    await screen.findAllByRole('row');
    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ tab: 'owing' }));
  });

  test('lists exactly the customers who owe, most owed first', async () => {
    await renderPage('/new-look/customers?tab=owing');
    await screen.findByRole('row', { name: /Zawadi Mwangi 045/ });
    const names = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(OWING_ALL.map((r) => r.name));
    expect(names).toHaveLength(5);
  });

  test('the balances shown add up to the Owing figure in the summary', async () => {
    await renderPage('/new-look/customers?tab=owing');
    await screen.findByRole('row', { name: /Zawadi Mwangi 045/ });
    const shown = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[2].textContent);
    const sum = shown.map((text) => Number(text.replace(/[^\d]/g, ''))).reduce((a, b) => a + b, 0);
    expect(sum).toBe(OWING_TOTAL);
    const owing = screen.getByText('Owing', { selector: 'dt' }).closest('div');
    expect(within(owing).getByText('KES 13,500')).toBeInTheDocument();
    expect(screen.getByText('Showing 5 of 5')).toBeInTheDocument();
  });

  test('the Owing tab does not offer the Status choice', async () => {
    await renderPage('/new-look/customers?tab=owing');
    await screen.findAllByRole('row');
    expect(screen.queryByRole('combobox', { name: 'Status' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type' })).toBeInTheDocument();
  });

  test('nobody owing gives an empty state with one action that shows all customers', async () => {
    await renderPage('/new-look/customers?tab=owing');
    listCustomers.mockResolvedValue({ rows: [], summary: { customers: 44, owing_total: 0, owing_customers: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    userEvent.click(screen.getByRole('tab', { name: 'All customers' }));
    userEvent.click(screen.getByRole('tab', { name: 'Owing' }));
    expect(await screen.findByText('Nobody owes you anything')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Show all customers' }));
    await waitFor(() => expect(where()).not.toContain('tab=owing'));
  });
});

describe('the header, Export and the empty states', () => {
  test('Add customer in the header opens the new customer form', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'Add customer' }));
    expect(where()).toBe('/new-look/customers/new');
  });

  test('Export CSV in the header saves the rows on screen, including balances for an owner', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^customers-all-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('"Customer","Mobile","Email","Type","Balance owed","Last purchase","Last purchase amount","Status"');
    expect(lines).toHaveLength(21);
    expect(text).toContain('"Wanjiru Kamau 001","0712 000 001"');
    expect(await screen.findByText('Saved 20 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('Export is off while there is nothing to export', async () => {
    await renderPage();
    listCustomers.mockResolvedValue({ rows: [], summary: { customers: 0, owing_total: 0, owing_customers: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    userEvent.click(screen.getByRole('tab', { name: 'Owing' }));
    await screen.findByText('Nobody owes you anything');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  test('a shop with no customers sees one action, Add customer', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    listCustomers.mockResolvedValue({ rows: [], summary: { customers: 0, owing_total: 0, owing_customers: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={['/new-look/customers']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <CustomersPage />
            <Where />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('No customers yet')).toBeInTheDocument();
    const buttons = within(screen.getByText('No customers yet').closest('div')).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Add customer']);
    userEvent.click(buttons[0]);
    expect(where()).toBe('/new-look/customers/new');
  });

  test('a search with no match says so and offers to clear the filters', async () => {
    await renderPage('/new-look/customers?q=zzz');
    const empty = (await screen.findByText('No customers match')).closest('div');
    userEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('q=zzz'));
    expect(await screen.findByRole('row', { name: /Wanjiru Kamau 001/ })).toBeInTheDocument();
  });

  test('a list that cannot load shows a retry', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    listCustomers.mockRejectedValueOnce(new Error('We could not reach the Murzak server. Check your internet connection and try again.'));
    listCustomers.mockImplementation(async (query) => answer(query));
    render(
      <MemoryRouter initialEntries={['/new-look/customers']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <CustomersPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Wanjiru Kamau 001/ })).toBeInTheDocument();
  });
});

describe('a cashier (AC-14, AC-28)', () => {
  test('sees no Owing tab, no Balance owed column and only the Customers number in the summary', async () => {
    await renderPage('/new-look/customers', 'cashier');
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(screen.queryByRole('tab', { name: 'Owing' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Customer', 'Mobile', 'Last purchase', 'Status']);
    expect(screen.queryByText('Balance owed')).not.toBeInTheDocument();
    expect(screen.queryByText('Customers who owe')).not.toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
  });

  test('a link to the Owing tab shows All customers instead and never asks for balances', async () => {
    await renderPage('/new-look/customers?tab=owing', 'cashier');
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    expect(listCustomers).not.toHaveBeenCalledWith(expect.objectContaining({ tab: 'owing' }));
    expect(screen.getByRole('tab', { name: 'All customers' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Export saves no balance columns', async () => {
    await renderPage('/new-look/customers', 'cashier');
    await screen.findByRole('row', { name: /Wanjiru Kamau 001/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const text = saveTextFile.mock.calls[0][0];
    expect(text.split('\n')[0]).toBe('"Customer","Mobile","Email","Type","Last purchase","Status"');
    expect(text).not.toContain('900');
  });

  test('the first question is not asked until the server has said who this is', async () => {
    let resolve;
    getMyAccess.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(
      <MemoryRouter initialEntries={['/new-look/customers?tab=owing']}>
        <AccessProvider userKey="newperson">
          <ToastProvider>
            <CustomersPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
    expect(listCustomers).not.toHaveBeenCalled();
    listCustomers.mockImplementation(async (query) => answer(query));
    resolve({ tier: 'owner', can: { money_owed: true } });
    await screen.findAllByRole('row');
    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ tab: 'owing' }));
    expect(listCustomers).toHaveBeenCalledTimes(1);
  });
});

describe('the panel opens from a row', () => {
  test('a row opens the panel and puts the customer in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Baraka Stores 009/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Baraka Stores 009' })).toBeInTheDocument();
    expect(where()).toContain('open=CUST-009');
    expect(getCustomerOverview).toHaveBeenCalledWith('CUST-009', 'Demo Shop');
  });

  test('a link with open= shows the panel straight away', async () => {
    await renderPage('/new-look/customers?open=CUST-018');
    expect(await screen.findByRole('heading', { level: 2, name: /Baraka Stores 009|Wanjiru Kamau 018|Otieno Odhiambo 018|Amina Hassan 018|Zawadi Mwangi 018/ })).toBeInTheDocument();
  });

  test('Escape closes the panel and the keyboard goes back to the row', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /Baraka Stores 009/ });
    userEvent.click(row);
    const heading = await screen.findByRole('heading', { level: 2, name: 'Baraka Stores 009' });
    userEvent.type(heading, '{esc}');
    await waitFor(() => expect(where()).not.toContain('open='));
    await waitFor(() => expect(screen.getByRole('row', { name: /Baraka Stores 009/ })).toHaveFocus());
  });

  test('Next and Previous move to the neighbouring customer', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Wanjiru Kamau 001/ }));
    await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau 001' });
    const panel = screen.getByRole('region', { name: 'Wanjiru Kamau 001' });
    userEvent.click(within(panel).getByRole('button', { name: 'Next item' }));
    await waitFor(() => expect(where()).toContain('open=CUST-002'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Otieno Odhiambo 002' })).toBeInTheDocument();
  });
});

describe('phones (below 768px)', () => {
  test('rows become cards with the balance on the right and a Filters button', async () => {
    window.innerWidth = 390;
    await renderPage();
    const list = await screen.findByRole('list', { name: 'Customers' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    const card = within(list).getByRole('button', { name: /Baraka Stores 009/ });
    expect(within(card).getByText('KES 900')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  test('a card opens the panel', async () => {
    window.innerWidth = 390;
    await renderPage();
    userEvent.click(await screen.findByRole('button', { name: /Baraka Stores 009/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Baraka Stores 009' })).toBeInTheDocument();
  });

  test('a cashier sees no amount on a card', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/customers', 'cashier');
    await screen.findByRole('list', { name: 'Customers' });
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
  });
});
