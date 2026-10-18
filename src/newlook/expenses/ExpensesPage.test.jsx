/* eslint-disable testing-library/no-node-access --
   One check needs structure no role query can express: that the word about a receipt sits in a chip that also holds an icon. */
/**
 * The Expenses page (ticket P5-1), checked at the screen level against the List page pattern and AC-30: a summary row of three
 * numbers, period presets, a Category filter and a search that live in the address, 20 rows to a page with "Showing x of y", rows per
 * page, Export CSV, the expense panel with the receipt photo, the empty states, cards on a phone, and owners and managers only.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import ExpensesPage from './ExpensesPage';
import { getExpenseOptions, getReceipt, listExpenses } from '../../api/expensesApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/expensesApi', () => ({
  listExpenses: jest.fn(),
  getExpenseOptions: jest.fn(),
  getReceipt: jest.fn(),
  createExpense: jest.fn(),
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
const CATEGORIES = [
  { id: 'Office Rent - DS', label: 'Office Rent', group: 'Indirect Expenses' },
  { id: 'Airtime - DS', label: 'Airtime', group: 'Indirect Expenses' },
  { id: 'Electricity - DS', label: 'Electricity', group: 'Indirect Expenses' },
];
const OPTIONS = {
  company: 'Demo Shop',
  today: '2026-10-17',
  categories: CATEGORIES,
  paidFrom: [
    { key: 'cash', label: 'Cash', available: true, reason: '', modeOfPayment: 'Cash' },
    { key: 'mpesa', label: 'M-Pesa', available: true, reason: '', modeOfPayment: 'M-Pesa' },
    { key: 'bank', label: 'Bank', available: false, reason: 'no_mode', modeOfPayment: '' },
  ],
  limits: {},
};
const pad = (n, width = 3) => String(n).padStart(width, '0');
const TOTAL = 45;
const dayOf = (n) => `2026-10-${pad(Math.max(1, 18 - Math.ceil(n / 3)), 2)}`;
// Every 9th row is a supplier bill (entered another way); every 5th row made on the page carries a receipt photo
const ALL = Array.from({ length: TOTAL }, (_, i) => {
  const n = i + 1;
  const category = CATEGORIES[i % 3];
  const bill = n % 9 === 0;
  return {
    id: bill ? `ACC-PINV-${pad(n)}` : `ACC-JV-${pad(n)}`,
    key: `${bill ? 'Purchase Invoice' : 'Journal Entry'}:${bill ? 'ACC-PINV' : 'ACC-JV'}-${pad(n)}:${category.id}`,
    date: dayOf(n),
    amount: n * 100,
    category: { id: category.id, label: category.label },
    note: bill ? `Power bill ${pad(n)}` : `Note ${pad(n)}`,
    kind: bill ? 'other' : 'expense',
    source: bill ? 'Supplier bill' : 'Added on the Expenses page',
    paid_from: bill ? null : { key: n % 2 ? 'cash' : 'mpesa', label: n % 2 ? 'Cash' : 'M-Pesa' },
    has_receipt: !bill && n % 5 === 0,
    added_by: bill ? null : 'Amina Owner',
    reference_type: bill ? 'Purchase Invoice' : 'Journal Entry',
    reference: bill ? `ACC-PINV-${pad(n)}` : `ACC-JV-${pad(n)}`,
  };
});
const SUMMARY = { total: ALL.reduce((sum, r) => sum + r.amount, 0), count: TOTAL, topCategory: { id: 'Electricity - DS', label: 'Electricity', amount: 30000 } };

const answer = ({ category, search = '', page = 1, pageSize = 20 } = {}) => {
  let rows = ALL;
  if (category) rows = rows.filter((r) => r.category.id === category);
  if (search) rows = rows.filter((r) => `${r.note} ${r.category.label}`.toLowerCase().includes(search.toLowerCase()));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    summary: SUMMARY,
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    period: { key: '30d', from: '2026-09-18', to: '2026-10-17', days: 30 },
    spentInList: 0,
  };
};

const renderPage = async (url = '/new-look/expenses', tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { profit: true, money_owed: true } });
  listExpenses.mockImplementation(async (query) => answer(query));
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <ExpensesPage />
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
const cellsOf = (row) => within(row).getAllByRole('cell');

beforeEach(() => {
  jest.resetAllMocks();
  getExpenseOptions.mockResolvedValue(OPTIONS);
  getReceipt.mockResolvedValue({ dataUrl: 'data:image/png;base64,AAAA', contentType: 'image/png', size: 4 });
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the list (List page pattern)', () => {
  test('has the title Expenses and an Add expense button and an Export button in the header', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  test('has the columns Date, Category, Note, Paid from and Amount', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Date', 'Category', 'Note', 'Paid from', 'Amount']);
  });

  test('shows money as KES, the date day first, the paid-from word and a dash for a cost entered another way', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    expect(cellsOf(rowOf('Note 001')).map((c) => c.textContent)).toEqual(['17 Oct 2026', 'Office Rent', 'Note 001', 'Cash', 'KES 100']);
    const bill = cellsOf(rowOf('Power bill 009')).map((c) => c.textContent);
    expect(bill[1]).toBe('ElectricitySupplier bill');
    expect(bill[3]).toBe('-');
    expect(bill[4]).toBe('KES 900');
  });

  test('marks an expense that has a receipt photo with an icon and the words', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 005/ });
    const chip = within(rowOf('Note 005')).getByText('Receipt photo');
    expect(chip.closest('.nl-chip').querySelector('[data-icon="receipt"]')).not.toBeNull();
    expect(within(rowOf('Note 001')).queryByText('Receipt photo')).not.toBeInTheDocument();
  });

  test('the summary row shows the running costs, how many expenses and the biggest cost, from the server', async () => {
    await renderPage();
    await screen.findByText('KES 103,500');
    const summary = screen.getByLabelText('Expenses summary');
    expect(within(summary).getByText('Running costs', { selector: 'dt' })).toBeInTheDocument();
    expect(within(summary).getByText('Expenses', { selector: 'dt' })).toBeInTheDocument();
    expect(within(summary).getByText('Biggest cost', { selector: 'dt' })).toBeInTheDocument();
    expect(within(summary).getByText('45')).toHaveClass('nl-summary__value');
    expect(within(summary).getByText('Electricity')).toHaveClass('nl-summary__value');
    expect(within(summary).getByText('KES 30,000')).toBeInTheDocument();
  });

  test('shows 20 rows of 45, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    expect(listExpenses).toHaveBeenCalledWith(expect.objectContaining({ period: '30d', page: 1, pageSize: 20 }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 45')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Note 021/ });
    expect(where()).toContain('page=2');
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Power bill 045/ });
    expect(screen.getByText('Showing 5 of 45')).toBeInTheDocument();
  });

  test('the rows-per-page box is never blank, even for a bad address, and a change goes in the address', async () => {
    await renderPage('/new-look/expenses?size=7');
    await screen.findByRole('row', { name: /Note 001/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(screen.getByRole('option', { name: '50' }));
    await screen.findByText('Showing 45 of 45');
    expect(where()).toContain('size=50');
  });
});

describe('filters live in the address', () => {
  test('has the period presets Today, 7 days, 30 days and Custom, with 30 days chosen', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    const group = screen.getByRole('radiogroup', { name: 'Period' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Today', '7 days', '30 days', 'Custom']);
    expect(within(group).getByRole('radio', { name: '30 days' })).toBeChecked();
  });

  test('choosing 7 days puts it in the address and asks the server for it', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(where()).toContain('period=7d'));
    await waitFor(() => expect(listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ period: '7d' })));
  });

  test('Custom asks for two dates and sends them', async () => {
    await renderPage('/new-look/expenses?period=custom&from=2026-10-01&to=2026-10-10');
    await screen.findAllByRole('row');
    expect(listExpenses).toHaveBeenCalledWith(expect.objectContaining({ period: 'custom', from: '2026-10-01', to: '2026-10-10' }));
    expect(screen.getByLabelText('From')).toHaveValue('01/10/2026');
    expect(screen.getByLabelText('To')).toHaveValue('10/10/2026');
  });

  test('a category goes in the address and to the server', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    userEvent.click(await screen.findByRole('combobox', { name: 'Category' }));
    userEvent.click(screen.getByRole('option', { name: 'Airtime' }));
    await waitFor(() => expect(where()).toContain('category=Airtime+-+DS'));
    await waitFor(() => expect(listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Airtime - DS' })));
    await screen.findByText('Showing 15 of 15');
  });

  test('the Category choice lists All categories first, then the categories by name', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    userEvent.click(await screen.findByRole('combobox', { name: 'Category' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All categories', 'Airtime', 'Electricity', 'Office Rent']);
  });

  test('a search goes in the address and to the server', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Note 001/ });
    userEvent.type(screen.getByRole('searchbox', { name: 'Search expenses' }), 'power{enter}');
    await waitFor(() => expect(where()).toContain('q=power'));
    await waitFor(() => expect(listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'power' })));
    await screen.findByText('Showing 5 of 5');
  });

  test('a link with a category, a search and a period opens the same view after a refresh', async () => {
    await renderPage('/new-look/expenses?q=note&category=Office+Rent+-+DS&period=7d&page=1');
    await screen.findAllByRole('row');
    expect(listExpenses).toHaveBeenCalledWith(expect.objectContaining({ search: 'note', category: 'Office Rent - DS', period: '7d' }));
    expect(screen.getByRole('searchbox', { name: 'Search expenses' })).toHaveValue('note');
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
  });

  test('Clear filters appears with a filter and takes it away', async () => {
    await renderPage('/new-look/expenses?q=note&period=7d');
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('q='));
    expect(where()).not.toContain('period=');
  });
});

describe('Export CSV', () => {
  test('saves the rows on screen under a name with the period and the date', async () => {
    await renderPage('/new-look/expenses?period=7d');
    await screen.findByRole('row', { name: /Note 001/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^expenses-last-7-days-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text.split('\n')[0]).toBe('"Date","Category","Note","Paid from","Amount","Added by","Source"');
    expect(text.split('\n')).toHaveLength(22); // header, 20 rows, trailing newline
    expect(await screen.findByText('Saved 20 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('is switched off while there is nothing to export', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: {} });
    listExpenses.mockResolvedValue({ rows: [], summary: { total: 0, count: 0, topCategory: null }, total: 0, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={['/new-look/expenses']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <ExpensesPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await screen.findByText('No expenses in this period');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });
});

describe('the empty states', () => {
  const renderEmpty = async (url) => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: {} });
    listExpenses.mockResolvedValue({ rows: [], summary: { total: 0, count: 0, topCategory: null }, total: 0, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={[url]}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <ExpensesPage />
            <Where />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
  };

  test('with nothing in the period, names the next action: Add expense', async () => {
    await renderEmpty('/new-look/expenses');
    expect(await screen.findByRole('heading', { name: 'No expenses in this period' })).toBeInTheDocument();
    const buttons = within(screen.getByRole('heading', { name: 'No expenses in this period' }).parentElement).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Add expense']);
    userEvent.click(buttons[0]);
    expect(where()).toBe('/new-look/expenses/new');
  });

  test('with filters on, says nothing matches and offers Clear filters', async () => {
    await renderEmpty('/new-look/expenses?q=zzz');
    expect(await screen.findByRole('heading', { name: 'No expenses match' })).toBeInTheDocument();
    const box = screen.getByRole('heading', { name: 'No expenses match' }).parentElement;
    userEvent.click(within(box).getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('q='));
  });

  test('a list that cannot load says so and offers to try again', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: {} });
    listExpenses.mockRejectedValue(new Error('We could not reach the server.'));
    render(
      <MemoryRouter initialEntries={['/new-look/expenses']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <ExpensesPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});

describe('the expense panel', () => {
  test('opens from a row, with the facts, and puts the row in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Note 002/ }));
    const panel = await screen.findByRole('region', { name: 'Airtime' });
    expect(where()).toContain('open=');
    expect(within(panel).getByText('KES 200')).toBeInTheDocument();
    expect(within(panel).getByText('17 Oct 2026')).toBeInTheDocument();
    expect(within(panel).getByText('M-Pesa')).toBeInTheDocument();
    expect(within(panel).getByText('Note 002')).toBeInTheDocument();
    expect(within(panel).getByText('Amina Owner')).toBeInTheDocument();
    expect(within(panel).getByText('Added on this page', { selector: 'dd' })).toBeInTheDocument();
    expect(within(panel).getByText('No photo was added to this expense.')).toBeInTheDocument();
    expect(getReceipt).not.toHaveBeenCalled();
  });

  test('shows the receipt photo of an expense that has one', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Note 005/ }));
    const photo = await screen.findByRole('img', { name: 'Photo of the receipt for Airtime' });
    expect(photo).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(getReceipt).toHaveBeenCalledWith('ACC-JV-005');
  });

  test('a photo that cannot load says so and can be tried again', async () => {
    getReceipt.mockRejectedValueOnce(new Error('We could not reach the server.'));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Note 005/ }));
    expect(await screen.findByText(/The photo could not be loaded/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('img', { name: /Photo of the receipt/ })).toBeInTheDocument();
  });

  test('a cost entered another way says where it came from, has no photo to show and links to its bill', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Power bill 009/ }));
    const panel = await screen.findByRole('region', { name: 'Electricity' });
    expect(within(panel).getByText('Entered another way')).toBeInTheDocument();
    expect(within(panel).getAllByText('Supplier bill').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Receipt photos can be added only when an expense is added on this page.')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Open this bill' })).toHaveAttribute('href', expect.stringContaining('ACC-PINV-009'));
    expect(getReceipt).not.toHaveBeenCalled();
  });

  test('keeps the system record number under Details', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Note 001/ }));
    const panel = await screen.findByRole('region', { name: 'Office Rent' });
    expect(within(panel).queryByText('ACC-JV-001')).not.toBeVisible();
    userEvent.click(within(panel).getByText('Details'));
    expect(within(panel).getByText('ACC-JV-001')).toBeVisible();
  });

  test('moves to the next and the previous row and closes with the Close button', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Note 001/ }));
    await screen.findByRole('region', { name: 'Office Rent' });
    userEvent.click(within(screen.getByRole('region', { name: 'Office Rent' })).getByRole('button', { name: 'Next item' }));
    expect(await screen.findByRole('region', { name: 'Airtime' })).toBeInTheDocument();
    userEvent.click(within(screen.getByRole('region', { name: 'Airtime' })).getByRole('button', { name: 'Previous item' }));
    expect(await screen.findByRole('region', { name: 'Office Rent' })).toBeInTheDocument();
    userEvent.click(within(screen.getByRole('region', { name: 'Office Rent' })).getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Office Rent' })).not.toBeInTheDocument());
    expect(where()).not.toContain('open=');
  });

  test('a link with an expense open shows its panel', async () => {
    await renderPage(`/new-look/expenses?open=${encodeURIComponent(ALL[1].key)}`);
    expect(await screen.findByRole('region', { name: 'Airtime' })).toBeInTheDocument();
  });

  test('says when an entry is money back', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: {} });
    const refund = { ...ALL[0], amount: -200, note: 'Rent refund', key: 'Journal Entry:ACC-JV-900:Office Rent - DS', id: 'ACC-JV-900', reference: 'ACC-JV-900', kind: 'other' };
    listExpenses.mockResolvedValue({ rows: [refund], summary: SUMMARY, total: 1, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={['/new-look/expenses']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <ExpensesPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    userEvent.click(await screen.findByRole('row', { name: /Rent refund/ }));
    expect(await screen.findByText('This is money back, so it lowers your running costs.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Office Rent' })).getByText('-KES 200')).toBeInTheDocument();
  });
});

describe('owners and managers only', () => {
  test('a manager sees the page', async () => {
    await renderPage('/new-look/expenses', 'manager');
    expect(await screen.findByRole('row', { name: /Note 001/ })).toBeInTheDocument();
  });

  test('a cashier sees a plain message with a way back to Home, and nothing is asked for', async () => {
    await renderPage('/new-look/expenses', 'cashier');
    expect(await screen.findByRole('heading', { name: 'Expenses are for owners and managers' })).toBeInTheDocument();
    expect(screen.getByText('Your sign-in does not include expenses. Ask the owner of the shop if you need to add one.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(listExpenses).not.toHaveBeenCalled();
    expect(getExpenseOptions).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(where()).toBe('/new-look');
  });

  test('nothing is asked for until the server has said who the person is', async () => {
    getMyAccess.mockReturnValue(new Promise(() => {}));
    listExpenses.mockResolvedValue(answer());
    render(
      <MemoryRouter initialEntries={['/new-look/expenses']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <ExpensesPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(listExpenses).not.toHaveBeenCalled();
  });
});

describe('phones (below 768px)', () => {
  test('rows become cards with the amount on the right, the date, the note and a Filters button', async () => {
    window.innerWidth = 390;
    await renderPage();
    const list = await screen.findByRole('list', { name: 'Expenses' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    const card = within(list).getByRole('button', { name: /Note 005/ });
    expect(within(card).getByText('KES 500')).toBeInTheDocument();
    expect(within(card).getByText('16 Oct 2026')).toBeInTheDocument();
    expect(within(card).getByText('Receipt photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  test('a cost entered another way says what it is on its card', async () => {
    window.innerWidth = 390;
    await renderPage();
    const list = await screen.findByRole('list', { name: 'Expenses' });
    expect(within(within(list).getByRole('button', { name: /Power bill 009/ })).getByText('Supplier bill')).toBeInTheDocument();
  });

  test('the Filters button opens the filters', async () => {
    window.innerWidth = 390;
    await renderPage();
    await screen.findByRole('list', { name: 'Expenses' });
    userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search expenses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('a card opens the panel', async () => {
    window.innerWidth = 390;
    await renderPage();
    userEvent.click(await screen.findByRole('button', { name: /Note 001/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Office Rent' })).toBeInTheDocument();
  });
});
