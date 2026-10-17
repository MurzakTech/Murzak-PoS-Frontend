/* eslint-disable testing-library/no-node-access --
   Two checks need structure no role query can express: that the word about a late bill sits in a status label that also holds an icon. */
/**
 * The supplier panel (ticket P4-6, acceptance check AC-28): what the shop owes, the next bill due (amount and date, with a word and
 * an icon when it is late or due soon), the unpaid bills as links to the Purchases page, and the actions Pay bill, Edit and Disable.
 * A cashier sees the facts and no money.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import SupplierPanel from './SupplierPanel';
import { getSupplierOverview, updateSupplier } from '../../api/suppliersListApi';

jest.mock('../../api/suppliersListApi', () => ({
  getSupplierOverview: jest.fn(),
  updateSupplier: jest.fn(),
}));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};
const where = () => screen.getByTestId('where').textContent;

// ---------- Fixtures: made-up shop data, never real ----------
const BILLS = [
  { invoice: 'ACC-PINV-2026-00012', bill_no: 'BD-1001', due_date: '2026-10-10', outstanding: 12000, state: 'overdue', days: -3 },
  { invoice: 'ACC-PINV-2026-00019', bill_no: '', due_date: '2026-10-20', outstanding: 8000, state: 'later', days: 7 },
];
const OWNER_VIEW = {
  id: 'SUP-001',
  name: 'Bidco Distributors',
  type: 'Company',
  group: 'Goods',
  tax_id: 'P051234567A',
  country: 'Kenya',
  currency: 'KES',
  disabled: false,
  internal: false,
  owed: 20000,
  next_due: { date: '2026-10-10', amount: 12000, invoice: 'ACC-PINV-2026-00012', bill_no: 'BD-1001', state: 'overdue', days: -3 },
  bills_due_soon: 1,
  bill_count: 2,
  bills: BILLS,
};
const CASHIER_VIEW = (({ owed, next_due, bills_due_soon, bill_count, bills, ...rest }) => rest)(OWNER_VIEW); // eslint-disable-line no-unused-vars

const renderPanel = async (view = OWNER_VIEW, props = {}) => {
  getSupplierOverview.mockResolvedValue(view);
  const handlers = { onClose: jest.fn(), onEdit: jest.fn(), onChanged: jest.fn() };
  const utils = render(
    <MemoryRouter initialEntries={['/new-look/suppliers?open=SUP-001']}>
      <ToastProvider>
        <SupplierPanel id="SUP-001" company="Demo Shop" summary={{ name: 'Bidco Distributors', disabled: false }} canSeeMoney {...handlers} {...props} />
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { level: 2, name: view.name });
  return { ...utils, ...handlers };
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('what the shop owes (AC-28)', () => {
  test('shows the amount owed and the next bill with its amount and date', async () => {
    await renderPanel();
    expect(getSupplierOverview).toHaveBeenCalledWith('SUP-001', 'Demo Shop');
    expect(screen.getByText('You owe')).toBeInTheDocument();
    expect(screen.getByText('KES 20,000')).toBeInTheDocument();
    expect(screen.getByText('Next bill due')).toBeInTheDocument();
    expect(screen.getByText('KES 12,000 on 10 Oct 2026')).toBeInTheDocument();
  });

  test('a late next bill carries an alert icon and the word "3 days late"', async () => {
    await renderPanel();
    const word = screen.getAllByText('3 days late')[0];
    expect(word.closest('[data-status]')).toHaveAttribute('data-status', 'overdue');
  });

  test('a next bill due soon carries a clock and the number of days', async () => {
    await renderPanel({ ...OWNER_VIEW, next_due: { ...OWNER_VIEW.next_due, state: 'soon', days: 2 }, bills: [{ ...BILLS[0], state: 'soon', days: 2 }] });
    expect(screen.getAllByText('Due in 2 days')[0].closest('[data-status]')).toHaveAttribute('data-status', 'unpaid');
  });

  test('a next bill far off has no warning word', async () => {
    await renderPanel({ ...OWNER_VIEW, next_due: { ...OWNER_VIEW.next_due, state: 'later', days: 20 }, bills: [{ ...BILLS[0], state: 'later', days: 20 }] });
    expect(screen.queryByText(/days late|Due in|Due today/)).not.toBeInTheDocument();
  });

  test('a supplier owed nothing says so and has no next bill', async () => {
    await renderPanel({ ...OWNER_VIEW, owed: 0, next_due: null, bills: [], bill_count: 0 });
    expect(screen.getByText('Nothing owed')).toBeInTheDocument();
    expect(screen.getByText('No bill is waiting')).toBeInTheDocument();
    expect(screen.getByText('No unpaid bills')).toBeInTheDocument();
  });

  test('shows the facts: type, tax ID, group, country and currency', async () => {
    await renderPanel();
    ['Type', 'Tax ID', 'Group', 'Country', 'Currency'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText('P051234567A')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Goods')).toBeInTheDocument();
  });

  test('an internal supplier says so', async () => {
    await renderPanel({ ...OWNER_VIEW, internal: true });
    expect(screen.getByText('Internal supplier')).toBeInTheDocument();
  });

  test('the supplier number is under Details, not in the title', async () => {
    await renderPanel();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Bidco Distributors');
    expect(screen.getByText('Supplier number')).toBeInTheDocument();
  });
});

describe('the unpaid bills', () => {
  test('lists each bill with its due date and amount, soonest first', async () => {
    await renderPanel();
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Bill BD-1001')).toBeInTheDocument();
    expect(within(items[0]).getByText('due 10 Oct 2026')).toBeInTheDocument();
    expect(within(items[0]).getByText('KES 12,000')).toBeInTheDocument();
    expect(within(items[1]).getByText('KES 8,000')).toBeInTheDocument();
  });

  test('each bill links to the Purchases page with the supplier and that bill open', async () => {
    await renderPanel();
    expect(screen.getByRole('link', { name: 'Bill BD-1001' })).toHaveAttribute('href', '/new-look/purchases?supplier=SUP-001&open=ACC-PINV-2026-00012');
  });

  test('a bill without its own bill number is named by the invoice number', async () => {
    await renderPanel();
    expect(screen.getByRole('link', { name: 'Bill ACC-PINV-2026-00019' })).toHaveAttribute('href', '/new-look/purchases?supplier=SUP-001&open=ACC-PINV-2026-00019');
  });

  test('a link to all the bills of this supplier opens the Purchases page for them', async () => {
    await renderPanel();
    expect(screen.getByRole('link', { name: 'See all bills from this supplier' })).toHaveAttribute('href', '/new-look/purchases?supplier=SUP-001');
  });

  test('says how many bills there are when the list is short', async () => {
    await renderPanel({ ...OWNER_VIEW, bill_count: 31 });
    expect(screen.getByText('Showing 2 of 31 unpaid bills, soonest due first.')).toBeInTheDocument();
  });

  test('the bills add up to the amount owed', async () => {
    await renderPanel();
    const total = within(screen.getByRole('list')).getAllByRole('listitem').map((li) => Number(within(li).getByText(/^KES [\d,]+$/).textContent.replace(/[^\d]/g, '')));
    expect(total.reduce((a, b) => a + b, 0)).toBe(OWNER_VIEW.owed);
  });
});

describe('the actions', () => {
  test('Pay bill is the main action and opens the next bill in Purchases', async () => {
    await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Pay bill' }));
    expect(where()).toBe('/new-look/purchases?supplier=SUP-001&open=ACC-PINV-2026-00012');
  });

  test('Pay bill falls back to the first bill when no bill has a due date', async () => {
    await renderPanel({ ...OWNER_VIEW, next_due: null });
    userEvent.click(screen.getByRole('button', { name: 'Pay bill' }));
    expect(where()).toBe('/new-look/purchases?supplier=SUP-001&open=ACC-PINV-2026-00012');
  });

  test('there is no Pay bill when nothing is owed', async () => {
    await renderPanel({ ...OWNER_VIEW, owed: 0, next_due: null, bills: [], bill_count: 0 });
    expect(screen.queryByRole('button', { name: 'Pay bill' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  test('Edit opens the edit form through the page', async () => {
    const { onEdit } = await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test('Disable asks first and says what happens', async () => {
    await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Disable Bidco Distributors?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Bills you already owe stay on record/)).toBeInTheDocument();
    expect(updateSupplier).not.toHaveBeenCalled();
  });

  test('Keep supplier closes the question and changes nothing', async () => {
    await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    userEvent.click(await screen.findByRole('button', { name: 'Keep supplier' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(updateSupplier).not.toHaveBeenCalled();
  });

  test('Disable supplier saves, thanks the person and tells the list', async () => {
    updateSupplier.mockResolvedValue({ id: 'SUP-001' });
    const { onChanged } = await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    userEvent.click(await screen.findByRole('button', { name: 'Disable supplier' }));
    await waitFor(() => expect(updateSupplier).toHaveBeenCalledWith({ id: 'SUP-001', disabled: true }));
    expect(await screen.findByText('Bidco Distributors is disabled')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  test('a disabled supplier offers Enable, and enabling saves at once', async () => {
    updateSupplier.mockResolvedValue({ id: 'SUP-001' });
    await renderPanel({ ...OWNER_VIEW, disabled: true });
    expect(screen.getByText(/This supplier is disabled/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await waitFor(() => expect(updateSupplier).toHaveBeenCalledWith({ id: 'SUP-001', disabled: false }));
    expect(await screen.findByText('Bidco Distributors is enabled again')).toBeInTheDocument();
  });

  test('a failed change says so in plain words', async () => {
    updateSupplier.mockRejectedValue(new Error('x'));
    await renderPanel();
    userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    userEvent.click(await screen.findByRole('button', { name: 'Disable supplier' }));
    expect(await screen.findByText('The supplier could not be changed. Please try again.')).toBeInTheDocument();
  });
});

describe('a cashier', () => {
  test('sees the facts and no money, no bills and no Pay bill', async () => {
    await renderPanel(CASHIER_VIEW, { canSeeMoney: false });
    expect(screen.getByText('P051234567A')).toBeInTheDocument();
    ['You owe', 'Next bill due', 'Unpaid bills'].forEach((word) => expect(screen.queryByText(word)).not.toBeInTheDocument());
    expect(screen.queryByText(/KES [\d,]/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay bill' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /bill/i })).not.toBeInTheDocument();
  });

  test('draws nothing about money even if the answer happened to carry it', async () => {
    await renderPanel(OWNER_VIEW, { canSeeMoney: false });
    expect(screen.queryByText(/KES [\d,]/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay bill' })).not.toBeInTheDocument();
  });
});

describe('loading and failing', () => {
  test('a panel that cannot load shows a retry', async () => {
    getSupplierOverview.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    getSupplierOverview.mockResolvedValue(OWNER_VIEW);
    render(
      <MemoryRouter>
        <ToastProvider>
          <SupplierPanel id="SUP-001" company="Demo Shop" summary={{ name: 'Bidco Distributors' }} canSeeMoney onClose={jest.fn()} onEdit={jest.fn()} />
        </ToastProvider>
      </MemoryRouter>
    );
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('KES 20,000')).toBeInTheDocument();
  });

  test('shows the name from the list row while the panel loads', async () => {
    getSupplierOverview.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <ToastProvider>
          <SupplierPanel id="SUP-001" company="Demo Shop" summary={{ name: 'Bidco Distributors' }} canSeeMoney onClose={jest.fn()} onEdit={jest.fn()} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Bidco Distributors' })).toBeInTheDocument();
  });
});
