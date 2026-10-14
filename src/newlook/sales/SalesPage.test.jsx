/* eslint-disable testing-library/no-node-access --
   Two checks need structure no role query can express: that the system reference sits inside the closed Details
   fold-out (closest('details')), and that a table row is the element holding the keyboard focus. */
/**
 * The Sales page (ticket P3-8), checked at the screen level against AC-24 and AC-25: the four tabs, short receipt
 * numbers, the system reference only under Details, the receipt panel and its buttons, the keyboard, filters in the
 * address, 20 rows to a page, the summary row, Till sessions, empty and error states, Export, and the phone layout.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import SalesPage from './SalesPage';
import { getSale, listSales, takePayment } from '../../api/salesListApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/salesListApi', () => ({ listSales: jest.fn(), getSale: jest.fn(), takePayment: jest.fn() }));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) =>
    select({
      auth: { user: { company: 'Demo Shop' } },
      warehouse: { warehouses: [] },
      staff: { staffUsers: [{ name: 'amina@demo.test', full_name: 'Amina Hassan' }, { name: 'otieno@demo.test', full_name: 'Otieno Odhiambo' }] },
    }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));
jest.mock('../../store/staffSlice', () => ({ getStaffUsers: jest.fn(() => ({ type: 'y' })) }));

// ---------- Fixtures: made-up shop data, never real ----------
const NAMES = ['Wanjiru Kamau', 'Otieno Odhiambo', 'Amina Hassan'];
const STATUSES = ['paid', 'unpaid', 'paid', 'part-returned', 'overdue'];
const pad = (n, width) => String(n).padStart(width, '0');
const TOTAL = 45;
const ALL_ROWS = Array.from({ length: TOTAL }, (_, i) => {
  const n = TOTAL - i;
  const status = STATUSES[i % STATUSES.length];
  const unpaid = status === 'unpaid' || status === 'overdue';
  return {
    id: `ACC-PSINV-2026-${pad(n, 5)}`,
    doctype: 'POS Invoice',
    receipt: `#${pad(n, 4)}`,
    reference: `ACC-PSINV-2026-${pad(n, 5)}`,
    date: '2026-10-12',
    time: '14:05',
    customer: NAMES[i % NAMES.length],
    cashier: 'Amina Hassan',
    total: 100 * (n + 1),
    paid: unpaid ? 0 : 100 * (n + 1),
    outstanding: unpaid ? 100 * (n + 1) : 0,
    status,
    methods: unpaid ? ['On credit'] : [['M-Pesa', 'Cash', 'Card'][i % 3]],
    is_return: false,
  };
});

const SESSIONS = [
  { id: 'POS-OPE-1', cashier: 'amina@demo.test', cashier_name: 'Amina Hassan', opened_on: '2026-10-12', opened_at: '08:00', closed_at: '17:30', status: 'closed', sales_count: 12, expected: 5000, counted: 4800, difference: -200, closing_entry: 'POS-CLO-1' },
  { id: 'POS-OPE-2', cashier: 'otieno@demo.test', cashier_name: 'Otieno Odhiambo', opened_on: '2026-10-11', opened_at: '08:10', closed_at: '17:00', status: 'closed', sales_count: 9, expected: 3000, counted: 3150, difference: 150, closing_entry: 'POS-CLO-2' },
  { id: 'POS-OPE-3', cashier: 'amina@demo.test', cashier_name: 'Amina Hassan', opened_on: '2026-10-10', opened_at: '08:05', closed_at: '16:45', status: 'closed', sales_count: 7, expected: 2000, counted: 2000, difference: 0, closing_entry: 'POS-CLO-3' },
  { id: 'POS-OPE-4', cashier: 'otieno@demo.test', cashier_name: 'Otieno Odhiambo', opened_on: '2026-10-13', opened_at: '08:30', closed_at: null, status: 'open', sales_count: 2, expected: 800, counted: null, difference: null, closing_entry: null },
];

const answer = ({ tab = 'all', page = 1, pageSize = 20, search = '' } = {}) => {
  if (tab === 'sessions') return { rows: SESSIONS, summary: { sold: 0, unpaid: 0, returned: 0 }, total: SESSIONS.length, page: 1, pageSize, pages: 1 };
  let rows = ALL_ROWS;
  if (tab === 'unpaid') rows = rows.filter((r) => r.outstanding > 0);
  if (tab === 'returns') rows = rows.filter((r) => r.status === 'part-returned');
  if (search) rows = rows.filter((r) => `${r.receipt} ${r.customer}`.toLowerCase().includes(search.toLowerCase()));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    summary: { sold: 123450, unpaid: 24500, returned: 3200 },
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
};

const saleFor = (row, over = {}) => ({
  id: row.id,
  doctype: row.doctype,
  receipt: row.receipt,
  reference: row.reference,
  date: row.date,
  time: row.time,
  customer: { name: row.customer, mobile: '0712345678' },
  cashier: row.cashier,
  status: row.status,
  is_return: false,
  return_against: null,
  lines: [{ item_code: 'MLK', item_name: 'Milk 500ml', qty: 2, rate: 60, amount: 120 }],
  totals: { subtotal: 120, discount: 0, tax: 0, total: row.total, paid: row.paid, outstanding: row.outstanding, change: 0 },
  payments: row.paid ? [{ mode: 'M-Pesa', label: 'M-Pesa', amount: row.paid, reference: 'SJK4D9X2LM' }] : [],
  returns: [],
  can: { take_payment: row.outstanding > 0, return_items: true, print: true, whatsapp: true },
  ...over,
});

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = '/new-look/sales', tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { profit: true, money_owed: true } });
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <SalesPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const rowOf = (receipt) => screen.getByRole('row', { name: new RegExp(`${receipt}\\b`) });

beforeEach(() => {
  jest.resetAllMocks();
  listSales.mockImplementation(async (query) => answer(query));
  getSale.mockImplementation(async (id) => saleFor(ALL_ROWS.find((r) => r.id === id) || ALL_ROWS[0]));
  window.print = jest.fn();
  window.open = jest.fn();
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the list (AC-24, AC-25)', () => {
  test('shows the four tabs, with All sales open', async () => {
    await renderPage();
    const tabs = within(screen.getByRole('tablist', { name: 'Sales views' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['All sales', 'Unpaid', 'Returns', 'Till sessions']);
    expect(screen.getByRole('tab', { name: 'All sales' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sales' })).toBeInTheDocument();
  });

  test('lists POS invoices and sales invoices with short receipt numbers, newest first, and no system reference', async () => {
    const rows = answer().rows.map((r, i) => (i === 1 ? { ...r, doctype: 'Sales Invoice', reference: 'ACC-SINV-2026-00044' } : r));
    listSales.mockResolvedValue({ ...answer(), rows });
    await renderPage();
    expect(await screen.findByRole('row', { name: /#0045\b/ })).toBeInTheDocument();
    expect(rowOf('#0044')).toBeInTheDocument();
    const order = screen.getAllByRole('row').slice(1, 3).map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(order).toEqual(['#0045', '#0044']);
    expect(screen.queryByText(/ACC-/)).not.toBeInTheDocument();
  });

  test('a sale made when a till was closed says Till closing under its receipt number', async () => {
    const rows = answer().rows.map((r, i) => (i === 0 ? { ...r, doctype: 'Sales Invoice', receipt: '#S0045', consolidated: true } : r));
    listSales.mockResolvedValue({ ...answer(), rows });
    await renderPage();
    const row = await screen.findByRole('row', { name: /#S0045/ });
    expect(within(row).getByText('Till closing')).toBeInTheDocument();
    expect(within(rowOf('#0044')).queryByText('Till closing')).not.toBeInTheDocument();
  });

  test('has the columns Receipt, Date and time, Customer, Payment, Amount and Status', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Receipt', 'Date and time', 'Customer', 'Payment', 'Amount', 'Status']);
  });

  test('draws each payment method as a chip, the amount as KES, and the status as an icon plus a word', async () => {
    await renderPage();
    const first = await screen.findByRole('row', { name: /#0045\b/ });
    expect(within(first).getByText('M-Pesa')).toBeInTheDocument();
    expect(within(first).getByText('KES 4,600')).toBeInTheDocument();
    expect(within(first).getByText('Paid')).toBeInTheDocument();
    expect(within(rowOf('#0044')).getByText('On credit')).toBeInTheDocument();
    expect(within(rowOf('#0044')).getByText('Unpaid')).toBeInTheDocument();
    expect(within(rowOf('#0042')).getByText('Part returned')).toBeInTheDocument();
  });

  test('the summary row shows Sold, Unpaid and Returned from the server', async () => {
    await renderPage();
    await screen.findByText('KES 123,450');
    expect(screen.getByText('Sold')).toBeInTheDocument();
    expect(screen.getByText('Unpaid', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('Returned', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('KES 24,500')).toBeInTheDocument();
    expect(screen.getAllByText('KES 3,200')[0]).toHaveClass('nl-summary__value');
  });

  test('shows 20 rows of 45, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(listSales).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 45')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /#0025\b/ });
    expect(where()).toContain('page=2');
    expect(listSales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /#0005\b/ });
    expect(screen.getByText('Showing 5 of 45')).toBeInTheDocument();
  });

  test('the rows-per-page box changes the list and is never blank, even for a bad address', async () => {
    await renderPage('/new-look/sales?size=7');
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(screen.getByRole('option', { name: '50' }));
    await screen.findByText('Showing 45 of 45');
    expect(where()).toContain('size=50');
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('50');
  });
});

describe('tabs and filters live in the address', () => {
  test('choosing Unpaid changes the address and asks for the unpaid tab', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    userEvent.click(screen.getByRole('tab', { name: 'Unpaid' }));
    await waitFor(() => expect(where()).toContain('tab=unpaid'));
    await waitFor(() => expect(listSales).toHaveBeenLastCalledWith(expect.objectContaining({ tab: 'unpaid' })));
    expect(screen.getByRole('tab', { name: 'Unpaid' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.queryByRole('row', { name: /#0045\b/ })).not.toBeInTheDocument());
  });

  test('a link to the Returns tab opens it', async () => {
    await renderPage('/new-look/sales?tab=returns');
    await screen.findAllByRole('row');
    expect(listSales).toHaveBeenCalledWith(expect.objectContaining({ tab: 'returns' }));
    expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('aria-selected', 'true');
  });

  test('the period presets are Today, 7 days, 30 days and Custom, and a choice goes in the address', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Today', '7 days', '30 days', 'Custom']);
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(where()).toContain('period=7d'));
    await waitFor(() => expect(listSales).toHaveBeenLastCalledWith(expect.objectContaining({ period: '7d' })));
  });

  test('a custom range sends its dates', async () => {
    await renderPage('/new-look/sales?period=custom&from=2026-10-01&to=2026-10-07');
    await screen.findAllByRole('row');
    expect(listSales).toHaveBeenCalledWith(expect.objectContaining({ period: 'custom', from: '2026-10-01', to: '2026-10-07' }));
  });

  test('search waits for a pause in typing, then goes in the address and back to page 1', async () => {
    await renderPage('/new-look/sales?page=2');
    await screen.findByRole('row', { name: /#0025\b/ });
    listSales.mockClear();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales' }), { target: { value: 'wanjiru' } });
    expect(listSales).not.toHaveBeenCalled();
    await waitFor(() => expect(where()).toContain('q=wanjiru'));
    expect(where()).not.toContain('page=2');
    await waitFor(() => expect(listSales).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'wanjiru', page: 1 })));
    expect(listSales).toHaveBeenCalledTimes(1);
  });

  test('an owner can filter by cashier; a cashier is not offered the choice', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(await screen.findByRole('combobox', { name: /Cashier/ })).toBeInTheDocument();
  });

  test('a cashier sees no cashier filter', async () => {
    await renderPage('/new-look/sales', 'cashier');
    await screen.findByRole('row', { name: /#0045\b/ });
    expect(screen.queryByRole('combobox', { name: /Cashier/ })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search sales' })).toBeInTheDocument();
  });
});

describe('the receipt panel', () => {
  test('a click on a row opens the receipt, asks the server for it and puts the choice in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Receipt #0045' })).toBeInTheDocument();
    expect(getSale).toHaveBeenCalledWith('ACC-PSINV-2026-00045', 'POS Invoice');
    expect(where()).toContain('open=ACC-PSINV-2026-00045');
    expect(await screen.findByText('Milk 500ml')).toBeInTheDocument();
    expect(rowOf('#0045')).toHaveAttribute('aria-current', 'true');
  });

  test('Enter on a focused row opens it', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /#0044\b/ });
    row.focus();
    userEvent.keyboard('{enter}');
    expect(await screen.findByRole('heading', { level: 2, name: 'Receipt #0044' })).toBeInTheDocument();
  });

  test('a shared link opens the same receipt', async () => {
    await renderPage('/new-look/sales?open=ACC-PSINV-2026-00044');
    expect(await screen.findByRole('heading', { level: 2, name: 'Receipt #0044' })).toBeInTheDocument();
    expect(getSale).toHaveBeenCalledWith('ACC-PSINV-2026-00044', 'POS Invoice');
  });

  test('the system reference appears only inside Details', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    await screen.findByText('Milk 500ml');
    const found = screen.getAllByText(/ACC-PSINV/).filter((el) => !el.dataset.testid);
    expect(found).toHaveLength(1);
    expect(found[0].closest('details')).not.toBeNull();
    expect(within(found[0].closest('details')).getByText('Details')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: /Sales, newest first/ })).queryByText(/ACC-/)).not.toBeInTheDocument();
  });

  test('shows the lines, the totals and how it was paid, with the M-Pesa code', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    await screen.findByText('Milk 500ml');
    expect(screen.getByRole('table', { name: 'Items on the receipt' })).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Paid', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.getByText('How it was paid')).toBeInTheDocument();
    expect(screen.getByText('Code SJK4D9X2LM')).toBeInTheDocument();
    expect(screen.getByText('Wanjiru Kamau', { selector: 'dd' })).toBeInTheDocument();
  });

  test('a sale still on the till\u2019s open shift cannot take a payment yet, and says why', async () => {
    getSale.mockImplementation(async (id) => saleFor(ALL_ROWS.find((r) => r.id === id), { can: { take_payment: false, take_payment_blocked: 'pay_after_close', return_items: true, print: true, whatsapp: true } }));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    expect(await screen.findByText(/Close the shift, then take the payment/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take payment' })).not.toBeInTheDocument();
  });

  test('an unpaid sale offers Take payment, Print, Send on WhatsApp and Return items', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    await screen.findByText('Milk 500ml');
    ['Take payment', 'Print', 'Send on WhatsApp', 'Return items'].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });

  test('a paid sale has no Take payment, and a sale the server cannot return has no Return items', async () => {
    getSale.mockImplementation(async (id) => saleFor(ALL_ROWS.find((r) => r.id === id), { can: { take_payment: false, return_items: false, print: true, whatsapp: true } }));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    await screen.findByText('Milk 500ml');
    expect(screen.queryByRole('button', { name: 'Take payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return items' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });

  test('Escape closes the panel and the keyboard returns to its row', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /#0043\b/ });
    userEvent.click(row);
    const heading = await screen.findByRole('heading', { level: 2, name: 'Receipt #0043' });
    await waitFor(() => expect(heading).toHaveFocus());
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Receipt #0043' })).not.toBeInTheDocument());
    expect(where()).not.toContain('open=');
    await waitFor(() => expect(rowOf('#0043')).toHaveFocus());
  });

  test('Next moves to the following receipt and closing returns to that row', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    await screen.findByRole('heading', { level: 2, name: 'Receipt #0045' });
    expect(screen.getByText('1 of 20 on this page')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Next item' }));
    await screen.findByRole('heading', { level: 2, name: 'Receipt #0044' });
    userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(rowOf('#0044')).toHaveFocus());
  });

  test('Send on WhatsApp opens a wa.me link with a 254 number and the receipt text, and sends nothing itself', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Send on WhatsApp' }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const [link, target] = window.open.mock.calls[0];
    expect(link.startsWith('https://wa.me/254712345678?text=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('#0044');
    expect(decodeURIComponent(link)).not.toMatch(/ACC-/);
    expect(target).toBe('_blank');
  });

  test('a customer with no phone number gets no WhatsApp button and a plain reason', async () => {
    getSale.mockImplementation(async (id) => saleFor(ALL_ROWS.find((r) => r.id === id), { customer: { name: 'Walk-in', mobile: '' } }));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    await screen.findByText('Milk 500ml');
    expect(screen.queryByRole('button', { name: 'Send on WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByText(/no phone number/)).toBeInTheDocument();
  });

  test('Print draws the receipt for the printer, opens the print window and takes the block away', async () => {
    window.print = jest.fn(() => {
      expect(document.body.classList.contains('nl-printing-receipt')).toBe(true);
      expect(document.body.querySelector('.nl-receipt-print')).not.toBeNull();
      expect(document.body.querySelector('.nl-receipt-print').textContent).not.toMatch(/ACC-/);
    });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Print' }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.body.querySelector('.nl-receipt-print')).toBeNull());
    expect(document.body.classList.contains('nl-printing-receipt')).toBe(false);
  });

  test('Return items goes to the returns screen with the invoice filled in', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Return items' }));
    expect(where()).toBe('/sales/returns?invoice=ACC-PSINV-2026-00044');
  });

  test('Take payment asks for the amount and how it was paid, saves it, and refreshes the receipt and the list', async () => {
    takePayment.mockResolvedValue({ outstanding: 0 });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Take payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Take payment' });
    expect(within(dialog).getByRole('textbox', { name: 'Amount received' })).toHaveValue('4500');
    userEvent.click(within(dialog).getByRole('radio', { name: 'M-Pesa' }));
    userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    expect(await within(dialog).findByText('Enter the M-Pesa code')).toBeInTheDocument();
    expect(takePayment).not.toHaveBeenCalled();
    userEvent.type(within(dialog).getByRole('textbox', { name: 'M-Pesa code' }), 'SJK4D9X2LM');
    const listCalls = listSales.mock.calls.length;
    const saleCalls = getSale.mock.calls.length;
    userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    await waitFor(() => expect(takePayment).toHaveBeenCalledWith({ id: 'ACC-PSINV-2026-00044', doctype: 'POS Invoice', amount: 4500, mode: 'mpesa', reference: 'SJK4D9X2LM', requestId: expect.stringMatching(/^pay-/) }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(listSales.mock.calls.length).toBeGreaterThan(listCalls));
    await waitFor(() => expect(getSale.mock.calls.length).toBeGreaterThan(saleCalls));
    expect(await screen.findByText(/Payment of KES 4,500 saved for receipt #0044/)).toBeInTheDocument();
  });

  test('a payment the server refuses stays open and says why', async () => {
    takePayment.mockRejectedValue(new Error('That is more than is owed.'));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Take payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Take payment' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The payment was not saved. That is more than is owed.');
    expect(screen.getByRole('dialog', { name: 'Take payment' })).toBeInTheDocument();
  });

  test('a retry sends the same request id, so the money is never recorded twice', async () => {
    takePayment.mockRejectedValueOnce(new Error('The server did not answer.')).mockResolvedValue({ outstanding: 0 });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Take payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Take payment' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    await within(dialog).findByRole('alert');
    userEvent.click(within(dialog).getByRole('button', { name: 'Save payment' }));
    await waitFor(() => expect(takePayment).toHaveBeenCalledTimes(2));
    expect(takePayment.mock.calls[0][0].requestId).toBeTruthy();
    expect(takePayment.mock.calls[1][0].requestId).toBe(takePayment.mock.calls[0][0].requestId);
  });

  test('a receipt that fails to load has its own Try again, and the list stays', async () => {
    getSale.mockRejectedValueOnce(new Error('boom')).mockImplementation(async (id) => saleFor(ALL_ROWS.find((r) => r.id === id)));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#0045\b/ }));
    expect(await screen.findByText('We could not load this receipt')).toBeInTheDocument();
    expect(rowOf('#0044')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Milk 500ml')).toBeInTheDocument();
  });
});

describe('Till sessions', () => {
  test('shows the cashier, time and cash difference, each difference as an icon plus a word', async () => {
    await renderPage('/new-look/sales?tab=sessions');
    await screen.findByRole('row', { name: /Otieno Odhiambo.*Still open/ });
    expect(listSales).toHaveBeenCalledWith(expect.objectContaining({ tab: 'sessions' }));
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Cashier', 'Opened', 'Closed', 'Sales', 'Expected cash', 'Counted cash', 'Cash difference']);
    const short = screen.getByText('Short by KES 200');
    expect(short.closest('[data-difference]')).toHaveAttribute('data-difference', 'short');
    expect(short.parentElement.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Over by KES 150').parentElement.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Matches').parentElement.querySelector('svg')).not.toBeNull();
  });

  test('an open session has a dash for the difference and says it is still open', async () => {
    await renderPage('/new-look/sales?tab=sessions');
    const open = await screen.findByRole('row', { name: /Otieno Odhiambo.*Still open/ });
    const cells = within(open).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent('Still open');
    expect(cells[5]).toHaveTextContent('–');
    expect(cells[6]).toHaveTextContent('–');
    expect(within(cells[6]).getByText('Not counted yet')).toBeInTheDocument();
  });

  test('has no summary row and no receipt panel', async () => {
    await renderPage('/new-look/sales?tab=sessions&open=ACC-PSINV-2026-00044');
    await screen.findByRole('row', { name: /Otieno Odhiambo.*Still open/ });
    expect(screen.queryByText('Sold')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Receipt/ })).not.toBeInTheDocument();
    expect(getSale).not.toHaveBeenCalled();
  });
});

describe('empty and error states', () => {
  test('a shop with no sales says so and offers Go to till', async () => {
    listSales.mockResolvedValue(answer({ search: 'zzz' }));
    await renderPage();
    expect(await screen.findByRole('heading', { name: 'No sales yet' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Go to till' }));
    expect(where()).toBe('/sales/pos');
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  test('a search with no match says so and offers Clear filters', async () => {
    listSales.mockImplementation(async (query) => answer({ ...query, search: query.search ? 'zzz-none' : '' }));
    await renderPage('/new-look/sales?q=none');
    expect(await screen.findByRole('heading', { name: 'No sales match' })).toBeInTheDocument();
    userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await waitFor(() => expect(where()).not.toContain('q=none'));
  });

  test('an empty Unpaid tab has one action: Show all sales', async () => {
    listSales.mockResolvedValue({ rows: [], summary: { sold: 0, unpaid: 0, returned: 0 }, total: 0, page: 1, pageSize: 20, pages: 1 });
    await renderPage('/new-look/sales?tab=unpaid');
    expect(await screen.findByRole('heading', { name: 'Nothing unpaid' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Show all sales' }));
    await waitFor(() => expect(where()).toBe('/new-look/sales'));
  });

  test('a list that fails to load says so and Try again loads it', async () => {
    listSales.mockRejectedValueOnce(new Error('We could not reach the Murzak server.')).mockImplementation(async (query) => answer(query));
    await renderPage();
    expect(await screen.findByText('We could not load this list')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /#0045\b/ })).toBeInTheDocument();
  });

  test('while the list loads the region is marked busy and Export waits', async () => {
    listSales.mockReturnValue(new Promise(() => {}));
    await renderPage();
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });
});

describe('Export', () => {
  test('downloads the rows now listed as a spreadsheet with the ten columns', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^sales-all-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('"Receipt","Date","Time","Customer","Cashier","Payment","Total","Paid","Outstanding","Status"');
    expect(lines).toHaveLength(21);
    expect(lines[1]).toContain('"#0045"');
    expect(await screen.findByText(/Saved 20 rows/)).toBeInTheDocument();
  });

  test('Till sessions export their own columns', async () => {
    await renderPage('/new-look/sales?tab=sessions');
    await screen.findByRole('row', { name: /Otieno Odhiambo.*Still open/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^sales-sessions-/);
    expect(text.split('\n')[0]).toBe('"Cashier","Opened on","Opened at","Closed at","Status","Sales","Expected cash","Counted cash","Cash difference"');
  });

  test('the Export button is in the page header', async () => {
    await renderPage();
    const header = screen.getByRole('heading', { level: 1, name: 'Sales' }).closest('.nl-page-header');
    expect(within(header).getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});

describe('phones', () => {
  const narrow = () => {
    window.innerWidth = 390;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  test('below 768px the rows are cards that open the receipt, and filters sit behind one Filters button', async () => {
    window.innerWidth = 390;
    await renderPage();
    const cards = await screen.findByRole('list', { name: 'Sales, newest first' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search sales' })).toBeInTheDocument();
    userEvent.click(within(cards).getByRole('button', { name: /#0045\b/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Receipt #0045' })).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(screen.getByRole('button', { name: /#0045\b/ })).toHaveFocus());
  });

  test('resizing to a phone switches to cards', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#0045\b/ });
    narrow();
    expect(await screen.findByRole('list', { name: 'Sales, newest first' })).toBeInTheDocument();
  });

  test('the Filters button says how many filters are on', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/sales?q=wanjiru&period=7d');
    expect(await screen.findByRole('button', { name: 'Filters (2 on)' })).toBeInTheDocument();
  });
});
