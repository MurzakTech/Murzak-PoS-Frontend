/* eslint-disable testing-library/no-node-access --
   Two checks need structure no role query can express: that the word about a late bill sits in a status label that also holds an icon,
   and that a table row is the element holding the keyboard focus. */
/**
 * The Suppliers page (ticket P4-6), checked at the screen level against AC-25 and the supplier half of AC-28: one list with an
 * Owed filter in the address, a summary row, 20 rows to a page, Export, the empty states, the owed figures adding up to the summary
 * and to the rows, the word and icon for a bill that is late or due soon, the supplier panel opening from a row, a cashier seeing
 * no money, and the phone layout.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import SuppliersPage from './SuppliersPage';
import { getSupplierOverview, listSupplierGroups, listSuppliers } from '../../api/suppliersListApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/suppliersListApi', () => ({
  listSuppliers: jest.fn(),
  getSupplierOverview: jest.fn(),
  listSupplierGroups: jest.fn(),
  updateSupplier: jest.fn(),
  createSupplier: jest.fn(),
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
const NAMES = ['Bidco Distributors', 'Mama Njeri Eggs', 'Zawadi Packaging', 'Asha Flour Mill', 'Kilimo Seeds'];
const pad = (n, width = 3) => String(n).padStart(width, '0');
const TOTAL = 45;
// Suppliers 9, 18, 27, 36 and 45 are owed money; 9 and 45 have a late bill, 18 and 27 a bill due soon, 36 a bill far off
const DUE = {
  9: { date: '2026-10-10', amount: 4000, invoice: 'PINV-9', bill_no: 'B-9', state: 'overdue', days: -3 },
  18: { date: '2026-10-13', amount: 6000, invoice: 'PINV-18', bill_no: 'B-18', state: 'soon', days: 0 },
  27: { date: '2026-10-15', amount: 9000, invoice: 'PINV-27', bill_no: 'B-27', state: 'soon', days: 2 },
  36: { date: '2026-11-02', amount: 12000, invoice: 'PINV-36', bill_no: 'B-36', state: 'later', days: 20 },
  45: { date: '2026-10-12', amount: 15000, invoice: 'PINV-45', bill_no: 'B-45', state: 'overdue', days: -1 },
};
const ALL = Array.from({ length: TOTAL }, (_, i) => {
  const n = i + 1;
  const owed = n % 9 === 0 ? n * 1000 : 0;
  return {
    id: `SUP-${pad(n)}`,
    name: `${NAMES[i % NAMES.length]} ${pad(n)}`,
    type: n % 4 === 0 ? 'Individual' : 'Company',
    group: 'Goods',
    tax_id: '',
    country: 'Kenya',
    currency: 'KES',
    disabled: n === 5,
    owed,
    next_due: owed ? DUE[n] : null,
    bills_due_soon: owed && ['overdue', 'soon'].includes(DUE[n].state) ? 1 : 0,
  };
});
const OWED_ALL = ALL.filter((r) => r.owed > 0).sort((a, b) => b.owed - a.owed);
const OWED_TOTAL = OWED_ALL.reduce((sum, r) => sum + r.owed, 0); // 135,000
const DUE_SOON = OWED_ALL.reduce((sum, r) => sum + r.bills_due_soon, 0); // 4

const answer = ({ owed = false, page = 1, pageSize = 20, search = '', group, status } = {}, cashier = false) => {
  let rows = owed ? OWED_ALL : ALL.filter((r) => (status === 'disabled' ? r.disabled : status === 'all' ? true : !r.disabled));
  if (search) rows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  if (group) rows = rows.filter((r) => r.group === group);
  const shown = rows.slice((page - 1) * pageSize, page * pageSize).map((r) => {
    if (!cashier) return r;
    const { owed: _o, next_due: _n, bills_due_soon: _b, ...rest } = r; // eslint-disable-line no-unused-vars
    return rest;
  });
  return {
    rows: shown,
    summary: cashier ? { suppliers: 44 } : { suppliers: 44, owed_total: OWED_TOTAL, suppliers_owed: OWED_ALL.length, bills_due_soon: DUE_SOON },
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
};

const renderPage = async (url = '/new-look/suppliers', tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { profit: true, money_owed: true } });
  listSuppliers.mockImplementation(async (query) => answer(query, tier === 'cashier'));
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <SuppliersPage />
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
const money = (text) => Number(text.replace(/[^\d]/g, ''));

beforeEach(() => {
  jest.resetAllMocks();
  listSupplierGroups.mockResolvedValue([]);
  getSupplierOverview.mockImplementation(async (id) => {
    const row = ALL.find((r) => r.id === id) || ALL[0];
    return { ...row, internal: false, bill_count: row.owed ? 1 : 0, bills: row.owed ? [{ invoice: row.next_due.invoice, bill_no: row.next_due.bill_no, due_date: row.next_due.date, outstanding: row.owed, state: row.next_due.state, days: row.next_due.days }] : [] };
  });
  window.open = jest.fn();
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the list (AC-25)', () => {
  test('is one list with no tabs, and the title Suppliers', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Suppliers' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('has the columns Supplier, Owed, Next bill due and Status', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Supplier', 'Owed', 'Next bill due', 'Status']);
  });

  test('writes the status as an icon plus a word', async () => {
    await renderPage('/new-look/suppliers?status=all');
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(within(rowOf('Bidco Distributors 001')).getByText('Active')).toBeInTheDocument();
    expect(within(rowOf('Kilimo Seeds 005')).getByText('Disabled')).toBeInTheDocument();
  });

  test('writes money as KES and the due date day first', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const owed = rowOf('Mama Njeri Eggs 027');
    expect(within(owed).getByText('KES 27,000')).toBeInTheDocument();
    expect(within(owed).getByText('15 Oct 2026')).toBeInTheDocument();
  });

  test('shows a dash where nothing is owed or due', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(cellsOf(rowOf('Bidco Distributors 001')).map((c) => c.textContent)).toEqual(['Bidco Distributors 001', '-', '-', 'Active']);
  });

  test('the summary row shows Suppliers, Owed to suppliers and Bills due soon from the server', async () => {
    await renderPage();
    await screen.findByText('KES 135,000');
    expect(screen.getByLabelText('Suppliers summary')).toBeInTheDocument();
    expect(screen.getByText('Suppliers', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Owed to suppliers', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Bills due soon', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('44')).toHaveClass('nl-summary__value');
    expect(screen.getByText('4')).toHaveClass('nl-summary__value');
  });

  test('shows 20 rows of 44 active suppliers, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(listSuppliers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20, owed: false }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 44')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Zawadi Packaging 023/ });
    expect(where()).toContain('page=2');
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    expect(screen.getByText('Showing 4 of 44')).toBeInTheDocument();
  });

  test('the rows-per-page box is never blank, even for a bad address, and a change goes in the address', async () => {
    await renderPage('/new-look/suppliers?size=7');
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(screen.getByRole('option', { name: '50' }));
    await screen.findByText('Showing 44 of 44');
    expect(where()).toContain('size=50');
  });

  test('hides disabled suppliers at first and can show them through the Status choice', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(listSuppliers).toHaveBeenCalledWith(expect.not.objectContaining({ status: 'disabled' }));
    userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    userEvent.click(screen.getByRole('option', { name: 'Disabled' }));
    await waitFor(() => expect(where()).toContain('status=disabled'));
    await screen.findByRole('row', { name: /Kilimo Seeds 005/ });
    expect(listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'disabled' }));
  });
});

describe('filters live in the address', () => {
  test('a search goes in the address and to the server', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.type(screen.getByRole('searchbox', { name: 'Search suppliers' }), 'zawadi{enter}');
    await waitFor(() => expect(where()).toContain('q=zawadi'));
    await waitFor(() => expect(listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'zawadi' })));
    await waitFor(() => expect(screen.queryByRole('row', { name: /Bidco Distributors 001/ })).not.toBeInTheDocument());
    expect(screen.getByText('Showing 9 of 9')).toBeInTheDocument();
  });

  test('a link with a search and the Owed filter opens the same view after a refresh', async () => {
    await renderPage('/new-look/suppliers?q=bidco&owed=1&page=1');
    await screen.findAllByRole('row');
    expect(listSuppliers).toHaveBeenCalledWith(expect.objectContaining({ search: 'bidco', owed: true }));
    expect(screen.getByRole('searchbox', { name: 'Search suppliers' })).toHaveValue('bidco');
  });

  test('Clear filters appears with a search and takes it away', async () => {
    await renderPage('/new-look/suppliers?q=bidco');
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('q='));
  });

  test('there are no period presets on this page', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    expect(screen.queryByRole('radio', { name: 'Today' })).not.toBeInTheDocument();
  });

  test('the Supplier group choice is offered when the shop has more than one group, and goes in the address', async () => {
    listSupplierGroups.mockResolvedValue([
      { value: 'Goods', label: 'Goods' },
      { value: 'Farm', label: 'Farm' },
    ]);
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.click(await screen.findByRole('combobox', { name: 'Supplier group' }));
    userEvent.click(screen.getByRole('option', { name: 'Goods' }));
    await waitFor(() => expect(where()).toContain('group=Goods'));
    await waitFor(() => expect(listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ group: 'Goods' })));
  });

  test('the Supplier group choice is hidden when there is only one group', async () => {
    listSupplierGroups.mockResolvedValue([{ value: 'Goods', label: 'Goods' }]);
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(screen.queryByRole('combobox', { name: 'Supplier group' })).not.toBeInTheDocument();
  });
});

describe('the Owed filter (AC-28)', () => {
  test('is a choice between All suppliers and Owed, with All suppliers first', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    const group = screen.getByRole('radiogroup', { name: 'Show' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['All suppliers', 'Owed']);
    expect(within(group).getByRole('radio', { name: 'All suppliers' })).toBeChecked();
  });

  test('choosing Owed puts it in the address and asks the server for the owed suppliers', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.click(screen.getByRole('radio', { name: 'Owed' }));
    await waitFor(() => expect(where()).toContain('owed=1'));
    await waitFor(() => expect(listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ owed: true })));
    expect(screen.getByRole('radio', { name: 'Owed' })).toBeChecked();
  });

  test('choosing All suppliers again takes it out of the address', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('radio', { name: 'All suppliers' }));
    await waitFor(() => expect(where()).not.toContain('owed='));
  });

  test('a link with ?owed=1 opens the filter', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findAllByRole('row');
    expect(listSuppliers).toHaveBeenCalledWith(expect.objectContaining({ owed: true }));
    expect(screen.getByRole('radio', { name: 'Owed' })).toBeChecked();
  });

  test('lists exactly the suppliers who are owed, most owed first', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const names = screen.getAllByRole('row').slice(1).map((r) => cellsOf(r)[0].textContent);
    expect(names).toEqual(OWED_ALL.map((r) => r.name));
    expect(names).toHaveLength(5);
  });

  test('the owed amounts shown add up to the Owed to suppliers figure in the summary', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const shown = screen.getAllByRole('row').slice(1).map((r) => money(cellsOf(r)[1].textContent));
    expect(shown.reduce((a, b) => a + b, 0)).toBe(OWED_TOTAL);
    const summary = screen.getByText('Owed to suppliers', { selector: 'dt' }).closest('div');
    expect(within(summary).getByText('KES 135,000')).toBeInTheDocument();
    expect(screen.getByText('Showing 5 of 5')).toBeInTheDocument();
  });

  test('every supplier in the Owed list has a next bill due', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    screen.getAllByRole('row').slice(1).forEach((row) => expect(cellsOf(row)[2].textContent).not.toBe('-'));
  });

  test('the Owed list does not offer the Status choice, because everyone owed is listed', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findAllByRole('row');
    expect(screen.queryByRole('combobox', { name: 'Status' })).not.toBeInTheDocument();
    expect(listSuppliers).not.toHaveBeenCalledWith(expect.objectContaining({ status: expect.anything() }));
  });

  test('nobody owed gives an empty state with one action that shows all suppliers', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    listSuppliers.mockResolvedValue({ rows: [], summary: { suppliers: 44, owed_total: 0, suppliers_owed: 0, bills_due_soon: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    userEvent.click(screen.getByRole('radio', { name: 'Owed' }));
    const empty = (await screen.findByText('You do not owe any supplier')).closest('div');
    userEvent.click(within(empty).getByRole('button', { name: 'Show all suppliers' }));
    await waitFor(() => expect(where()).not.toContain('owed='));
  });

  test('the Owed filter with a search that finds nobody says no suppliers match', async () => {
    listSuppliers.mockResolvedValue({ rows: [], summary: { suppliers: 44, owed_total: OWED_TOTAL, suppliers_owed: 5, bills_due_soon: 4 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    render(
      <MemoryRouter initialEntries={['/new-look/suppliers?owed=1&q=zzz']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <SuppliersPage />
            <Where />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('No suppliers match')).toBeInTheDocument();
  });
});

describe('a bill that is late or due soon shows an icon and a word', () => {
  test('a late bill says how many days late, with an alert status', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const label = within(rowOf('Asha Flour Mill 009')).getByText('3 days late').closest('[data-status]');
    expect(label).toHaveAttribute('data-status', 'overdue');
    expect(label.querySelector('svg')).not.toBeNull();
    expect(within(rowOf('Kilimo Seeds 045')).getByText('1 day late')).toBeInTheDocument();
  });

  test('a bill due today or within 3 days says so, with a clock status', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const today = within(rowOf('Zawadi Packaging 018')).getByText('Due today').closest('[data-status]');
    expect(today).toHaveAttribute('data-status', 'unpaid');
    expect(today.querySelector('svg')).not.toBeNull();
    expect(within(rowOf('Mama Njeri Eggs 027')).getByText('Due in 2 days')).toBeInTheDocument();
  });

  test('a bill far off shows only its date', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    const row = rowOf('Bidco Distributors 036');
    expect(within(row).getByText('2 Nov 2026')).toBeInTheDocument();
    expect(row.querySelector('[data-status]')).toBeNull();
  });
});

describe('the header, Export and the empty states', () => {
  test('Add supplier in the header opens the new supplier form', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'Add supplier' }));
    expect(where()).toBe('/new-look/suppliers/new');
  });

  test('Supplier groups is in the header overflow and opens the current groups screen', async () => {
    await renderPage();
    await screen.findAllByRole('row');
    userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Supplier groups' }));
    expect(where()).toBe('/suppliers/groups?legacy=1');
  });

  test('Export CSV in the header saves the rows on screen, with the owed columns for an owner', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^suppliers-all-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('"Supplier","Type","Group","Tax ID","Country","Currency","Owed","Next bill due","Next bill amount","Bills due soon","Status"');
    expect(lines).toHaveLength(21);
    expect(await screen.findByText('Saved 20 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('Export on the Owed list is named for it and holds the owed suppliers', async () => {
    await renderPage('/new-look/suppliers?owed=1');
    await screen.findByRole('row', { name: /Kilimo Seeds 045/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^suppliers-owed-/);
    expect(text.trim().split('\n')).toHaveLength(6);
  });

  test('Export is off while there is nothing to export', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    listSuppliers.mockResolvedValue({ rows: [], summary: { suppliers: 0, owed_total: 0, suppliers_owed: 0, bills_due_soon: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={['/new-look/suppliers']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <SuppliersPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await screen.findByText('No suppliers yet');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  test('a shop with no suppliers sees one action, Add supplier', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    listSuppliers.mockResolvedValue({ rows: [], summary: { suppliers: 0, owed_total: 0, suppliers_owed: 0, bills_due_soon: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    render(
      <MemoryRouter initialEntries={['/new-look/suppliers']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <SuppliersPage />
            <Where />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument();
    const buttons = within(screen.getByText('No suppliers yet').closest('div')).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Add supplier']);
    userEvent.click(buttons[0]);
    expect(where()).toBe('/new-look/suppliers/new');
  });

  test('a search with no match says so and offers to clear the filters', async () => {
    await renderPage('/new-look/suppliers?q=zzz');
    const empty = (await screen.findByText('No suppliers match')).closest('div');
    userEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).not.toContain('q=zzz'));
    expect(await screen.findByRole('row', { name: /Bidco Distributors 001/ })).toBeInTheDocument();
  });

  test('a list that cannot load shows a retry', async () => {
    getMyAccess.mockResolvedValue({ tier: 'owner', can: { money_owed: true } });
    listSuppliers.mockRejectedValueOnce(new Error('We could not reach the Murzak server. Check your internet connection and try again.'));
    listSuppliers.mockImplementation(async (query) => answer(query));
    render(
      <MemoryRouter initialEntries={['/new-look/suppliers']}>
        <AccessProvider userKey="amina">
          <ToastProvider>
            <SuppliersPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Bidco Distributors 001/ })).toBeInTheDocument();
  });
});

describe('a cashier (AC-14, AC-28)', () => {
  test('sees no Owed filter, no Owed or Next bill due column and only the Suppliers number in the summary', async () => {
    await renderPage('/new-look/suppliers', 'cashier');
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(screen.queryByRole('radiogroup', { name: 'Show' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Supplier', 'Status']);
    expect(screen.queryByText('Owed to suppliers')).not.toBeInTheDocument();
    expect(screen.queryByText('Bills due soon')).not.toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
  });

  test('a link with ?owed=1 shows the plain list instead and never asks for what is owed', async () => {
    await renderPage('/new-look/suppliers?owed=1', 'cashier');
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    expect(listSuppliers).not.toHaveBeenCalledWith(expect.objectContaining({ owed: true }));
  });

  test('Export saves no owed columns', async () => {
    await renderPage('/new-look/suppliers', 'cashier');
    await screen.findByRole('row', { name: /Bidco Distributors 001/ });
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const text = saveTextFile.mock.calls[0][0];
    expect(text.split('\n')[0]).toBe('"Supplier","Type","Group","Tax ID","Country","Currency","Status"');
    expect(text).not.toContain('27000');
  });

  test('the first question is not asked until the server has said who this is', async () => {
    let resolve;
    getMyAccess.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <MemoryRouter initialEntries={['/new-look/suppliers?owed=1']}>
        <AccessProvider userKey="newperson">
          <ToastProvider>
            <SuppliersPage />
          </ToastProvider>
        </AccessProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
    expect(listSuppliers).not.toHaveBeenCalled();
    listSuppliers.mockImplementation(async (query) => answer(query));
    resolve({ tier: 'owner', can: { money_owed: true } });
    await screen.findAllByRole('row');
    expect(listSuppliers).toHaveBeenCalledWith(expect.objectContaining({ owed: true }));
    expect(listSuppliers).toHaveBeenCalledTimes(1);
  });
});

describe('the panel opens from a row', () => {
  test('a row opens the panel and puts the supplier in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Bidco Distributors 001/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Bidco Distributors 001' })).toBeInTheDocument();
    expect(where()).toContain('open=SUP-001');
    expect(getSupplierOverview).toHaveBeenCalledWith('SUP-001', 'Demo Shop');
  });

  test('a link with open= shows the panel straight away (the old supplier address lands here)', async () => {
    await renderPage('/new-look/suppliers?open=SUP-018');
    expect(await screen.findByRole('heading', { level: 2, name: 'Zawadi Packaging 018' })).toBeInTheDocument();
  });

  test('Escape closes the panel and the keyboard goes back to the row', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Bidco Distributors 001/ }));
    const heading = await screen.findByRole('heading', { level: 2, name: 'Bidco Distributors 001' });
    userEvent.type(heading, '{esc}');
    await waitFor(() => expect(where()).not.toContain('open='));
    await waitFor(() => expect(screen.getByRole('row', { name: /Bidco Distributors 001/ })).toHaveFocus());
  });

  test('Next moves to the neighbouring supplier', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Bidco Distributors 001/ }));
    await screen.findByRole('heading', { level: 2, name: 'Bidco Distributors 001' });
    const panel = screen.getByRole('region', { name: 'Bidco Distributors 001' });
    userEvent.click(within(panel).getByRole('button', { name: 'Next item' }));
    await waitFor(() => expect(where()).toContain('open=SUP-002'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Mama Njeri Eggs 002' })).toBeInTheDocument();
  });

  test('Edit in the panel opens the edit form of that supplier', async () => {
    await renderPage('/new-look/suppliers?open=SUP-001');
    userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(where()).toBe('/new-look/suppliers/SUP-001/edit');
  });
});

describe('phones (below 768px)', () => {
  test('rows become cards with the owed amount on the right, the due word, and a Filters button', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/suppliers?owed=1');
    const list = await screen.findByRole('list', { name: 'Suppliers you owe' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    const card = within(list).getByRole('button', { name: /Asha Flour Mill 009/ });
    expect(within(card).getByText('KES 9,000')).toBeInTheDocument();
    expect(within(card).getByText('3 days late')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  test('the Owed choice is always in reach on a phone', async () => {
    window.innerWidth = 390;
    await renderPage();
    await screen.findByRole('list', { name: 'Suppliers' });
    expect(screen.getByRole('radio', { name: 'Owed' })).toBeInTheDocument();
  });

  test('a card opens the panel', async () => {
    window.innerWidth = 390;
    await renderPage();
    userEvent.click(await screen.findByRole('button', { name: /Bidco Distributors 001/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Bidco Distributors 001' })).toBeInTheDocument();
  });

  test('a cashier sees no amount on a card', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/suppliers', 'cashier');
    await screen.findByRole('list', { name: 'Suppliers' });
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
  });
});
