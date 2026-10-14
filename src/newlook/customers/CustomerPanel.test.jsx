/* eslint-disable testing-library/no-node-access --
   Two checks need structure no role query can express: that the customer number sits inside the closed Details fold-out
   (closest('details')), and that the print block is a direct child of the page body while the browser's print window is open. */
/**
 * The customer panel (ticket P4-7, the panel half of AC-28): balance owed, last purchase, a WhatsApp button that opens a
 * message ready to send, a statement with a running balance that can be sent, printed and exported, the Credit section
 * and the loyalty actions. A cashier gets none of the money parts.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import CustomerPanel from './CustomerPanel';
import {
  assignLoyaltyProgram,
  getCreditHistory,
  getCreditLimit,
  getCustomerOverview,
  getCustomerStatement,
  getLoyaltyBalance,
  getPointsHistory,
  listLoyaltyPrograms,
  redeemPoints,
  removeCreditLimit,
  setCreditLimit,
  updateCustomer,
} from '../../api/customersListApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/customersListApi', () => ({
  getCustomerOverview: jest.fn(),
  getCustomerStatement: jest.fn(),
  getCreditLimit: jest.fn(),
  getCreditHistory: jest.fn(),
  setCreditLimit: jest.fn(),
  removeCreditLimit: jest.fn(),
  getLoyaltyBalance: jest.fn(),
  listLoyaltyPrograms: jest.fn(),
  assignLoyaltyProgram: jest.fn(),
  redeemPoints: jest.fn(),
  getPointsHistory: jest.fn(),
  updateCustomer: jest.fn(),
}));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));

// ---------- Fixtures: made-up shop data, never real ----------
const CUSTOMER = {
  id: 'CUST-0007',
  name: 'Wanjiru Kamau',
  type: 'Individual',
  mobile: '+254712345678',
  email: 'wanjiru@demo.test',
  tax_id: 'A012345678Z',
  group: 'Individual',
  territory: 'Nairobi',
  loyalty_program: 'Duka Points',
  disabled: false,
  balance: 3500,
  last_purchase: { date: '2026-10-05', amount: 250, receipt: '#0012', id: 'ACC-PSINV-2026-00012' },
  features: { groups: false, territories: false },
};

const STATEMENT = {
  customer: { id: 'CUST-0007', name: 'Wanjiru Kamau', mobile: '+254712345678' },
  from: '2026-07-16',
  to: '2026-10-13',
  requested_from: '2026-07-16',
  truncated: false,
  opening_balance: 1000,
  lines: [
    { date: '2026-10-01', kind: 'sale', id: 'ACC-SINV-2026-00004', doctype: 'Sales Invoice', receipt: '#S0004', debit: 3000, credit: 0, balance: 4000 },
    { date: '2026-10-05', kind: 'sale', id: 'ACC-PSINV-2026-00012', doctype: 'POS Invoice', receipt: '#0012', debit: 250, credit: 250, balance: 4000 },
    { date: '2026-10-08', kind: 'return', id: 'ACC-SINV-2026-00006', doctype: 'Sales Invoice', receipt: '#S0006', debit: 0, credit: 100, balance: 3900 },
    { date: '2026-10-09', kind: 'payment', id: 'ACC-PAY-2026-00003', doctype: 'Payment Entry', receipt: '#P0003', debit: 0, credit: 400, balance: 3500 },
  ],
  total_debit: 3250,
  total_credit: 750,
  closing_balance: 3500,
  current_balance: 3500,
  last_purchase: CUSTOMER.last_purchase,
};

const CREDIT = { limit: 5000, effective: 5000, owed: 3500, available: 1500, source: 'Customer', over: false, bypass: false };
const HISTORY = {
  rows: [
    { voucher_no: 'ACC-SINV-2026-00004', voucher_type: 'Sales Invoice', posting_date: '2026-10-01', amount: 3000, outstanding_amount: 3000, status: 'Unpaid' },
    { voucher_no: 'ACC-PAY-2026-00003', voucher_type: 'Payment Entry', posting_date: '2026-10-09', amount: -400, outstanding_amount: 0, status: 'Submitted' },
  ],
  total: 2,
};

const renderPanel = (props = {}) => {
  const onEdit = jest.fn();
  const onChanged = jest.fn();
  const onClose = jest.fn();
  render(
    <MemoryRouter>
      <ToastProvider>
        <CustomerPanel id="CUST-0007" company="Demo Shop" shop="Duka la Amina" canSeeMoney onEdit={onEdit} onChanged={onChanged} onClose={onClose} {...props} />
      </ToastProvider>
    </MemoryRouter>
  );
  return { onEdit, onChanged, onClose };
};

const section = (name) => screen.getByRole('region', { name });

beforeEach(() => {
  jest.resetAllMocks();
  getCustomerOverview.mockResolvedValue({ ...CUSTOMER });
  getCustomerStatement.mockResolvedValue({ ...STATEMENT });
  getCreditLimit.mockResolvedValue({ ...CREDIT });
  getCreditHistory.mockResolvedValue({ ...HISTORY });
  getLoyaltyBalance.mockResolvedValue({ points: 120, recent: [] });
  window.print = jest.fn();
  window.open = jest.fn();
});

describe('the facts, the balance and the last purchase (AC-28)', () => {
  test('shows the name, type, mobile, email and KRA PIN', async () => {
    renderPanel();
    expect(await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' })).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Wanjiru Kamau' });
    expect(within(panel).getByText('0712 345 678')).toBeInTheDocument();
    expect(within(panel).getByText('wanjiru@demo.test')).toBeInTheDocument();
    expect(within(panel).getByText('A012345678Z')).toBeInTheDocument();
    expect(within(panel).getByText('Individual', { selector: 'dd' })).toBeInTheDocument();
    expect(within(panel).getByText('Active')).toBeInTheDocument();
  });

  test('shows the balance owed in KES and the last purchase with its date and amount', async () => {
    renderPanel();
    await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' });
    expect(screen.getByText('Balance owed')).toBeInTheDocument();
    expect(screen.getAllByText('KES 3,500')[0]).toHaveClass('nl-customer-panel__balance');
    expect(screen.getByText('Last purchase')).toBeInTheDocument();
    expect(screen.getByText('5 Oct 2026, KES 250')).toBeInTheDocument();
  });

  test('a customer who owes nothing says so, and one who never bought says that', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, balance: 0, last_purchase: null });
    renderPanel();
    expect(await screen.findByText('Owes nothing')).toBeInTheDocument();
    expect(screen.getByText('No purchases yet')).toBeInTheDocument();
  });

  test('the customer number is under Details, closed at first, and nowhere else', async () => {
    renderPanel();
    await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' });
    const number = screen.getByText('CUST-0007');
    expect(number.closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByText(/ACC-/)).not.toBeInTheDocument();
  });

  test('group and area appear only when the shop uses them', async () => {
    renderPanel();
    await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' });
    expect(screen.queryByText('Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Area')).not.toBeInTheDocument();
  });

  test('group and area appear when the server says the shop uses them', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, features: { groups: true, territories: true } });
    renderPanel();
    expect(await screen.findByText('Group')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
  });

  test('a disabled customer is marked with an icon and a word, and can be turned on again', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, disabled: true });
    updateCustomer.mockResolvedValue({ id: 'CUST-0007' });
    const { onChanged } = renderPanel();
    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText(/does not show|do not show in the till/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith({ id: 'CUST-0007', disabled: false, company: 'Demo Shop' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  test('a customer that cannot be loaded shows a retry', async () => {
    getCustomerOverview.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' })).toBeInTheDocument();
  });

  test('the title shows the list row\'s name while the customer loads', () => {
    getCustomerOverview.mockReturnValue(new Promise(() => {}));
    renderPanel({ summary: { name: 'Wanjiru Kamau', disabled: false } });
    expect(screen.getByRole('heading', { level: 2, name: 'Wanjiru Kamau' })).toBeInTheDocument();
  });
});

describe('the WhatsApp button (AC-28)', () => {
  const opened = () => new URL(window.open.mock.calls[0][0]);

  test('opens WhatsApp with a reminder for what is owed, to the right number, and sends nothing itself', async () => {
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Send reminder on WhatsApp' }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = opened();
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/254712345678');
    const text = url.searchParams.get('text');
    expect(text).toContain('Wanjiru Kamau');
    expect(text).toContain('KES 3,500');
    expect(text).toContain('Duka la Amina');
    expect(window.open.mock.calls[0][1]).toBe('_blank');
    expect(window.open.mock.calls[0][2]).toContain('noopener');
  });

  test('the message is ready and the owner can change it before it opens', async () => {
    renderPanel();
    const field = await screen.findByRole('textbox', { name: 'Message' });
    expect(field.value).toContain('KES 3,500');
    userEvent.clear(field);
    userEvent.type(field, 'Hello, please come and pay on Friday.');
    userEvent.click(screen.getByRole('button', { name: 'Send reminder on WhatsApp' }));
    expect(opened().searchParams.get('text')).toBe('Hello, please come and pay on Friday.');
    expect(screen.getByText(/Nothing is sent until you press send/)).toBeInTheDocument();
  });

  test('a customer who owes nothing gets a friendly hello instead of a reminder', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, balance: 0 });
    renderPanel();
    const field = await screen.findByRole('textbox', { name: 'Message' });
    expect(field.value).not.toContain('KES');
    expect(field.value).toContain('Wanjiru Kamau');
    expect(screen.getByRole('button', { name: 'Send on WhatsApp' })).toBeInTheDocument();
  });

  test('a customer with no mobile has no button, a reason, and a way to add a number', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, mobile: '' });
    const { onEdit } = renderPanel();
    expect(await screen.findByText(/WhatsApp is not available because there is no mobile number/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add a mobile number' }));
    expect(onEdit).toHaveBeenCalled();
  });

  test('a number WhatsApp cannot use gives the same reason', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, mobile: '12345' });
    renderPanel();
    expect(await screen.findByText(/WhatsApp is not available/)).toBeInTheDocument();
  });

  test('a cashier gets a hello with no amount', async () => {
    const { balance, ...rest } = CUSTOMER; // eslint-disable-line no-unused-vars
    getCustomerOverview.mockResolvedValue({ ...rest, last_purchase: { date: '2026-10-05', receipt: '#0012', id: 'X' } });
    renderPanel({ canSeeMoney: false });
    const field = await screen.findByRole('textbox', { name: 'Message' });
    expect(field.value).not.toContain('KES');
    expect(screen.getByRole('button', { name: 'Send on WhatsApp' })).toBeInTheDocument();
  });
});

describe('the statement (AC-28)', () => {
  test('shows the lines with a running balance, with the document as a short receipt number', async () => {
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    const table = await within(statement).findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Date', 'Document', 'Debit', 'Credit', 'Balance']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['01/10/2026', 'Sale #S0004', 'KES 3,000', '-', 'KES 4,000']);
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['05/10/2026', 'Sale #0012', 'KES 250', 'KES 250', 'KES 4,000']);
    expect(within(rows[2]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['08/10/2026', 'Return #S0006', '-', 'KES 100', 'KES 3,900']);
    expect(within(rows[3]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['09/10/2026', 'Payment #P0003', '-', 'KES 400', 'KES 3,500']);
    expect(within(statement).queryByText(/ACC-/)).not.toBeInTheDocument();
  });

  test('shows the balance at the start and at the end, and the end matches the balance owed', async () => {
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    await within(statement).findByRole('table');
    expect(within(statement).getByText('Balance at the start').nextSibling).toHaveTextContent('KES 1,000');
    expect(within(statement).getByText('Balance at the end').nextSibling).toHaveTextContent('KES 3,500');
    expect(screen.getAllByText('KES 3,500')[0]).toHaveClass('nl-customer-panel__balance');
    expect(within(statement).queryByText('Owed now')).not.toBeInTheDocument();
  });

  test('asks for the last 90 days at first and for another period when one is chosen', async () => {
    renderPanel();
    await screen.findByRole('region', { name: 'Statement' });
    await waitFor(() => expect(getCustomerStatement).toHaveBeenCalledTimes(1));
    const first = getCustomerStatement.mock.calls[0][0];
    expect(first.customer).toBe('CUST-0007');
    expect(first.company).toBe('Demo Shop');
    expect(first.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    userEvent.click(within(section('Statement')).getByRole('radio', { name: 'Last 30 days' }));
    await waitFor(() => expect(getCustomerStatement).toHaveBeenCalledTimes(2));
    const second = getCustomerStatement.mock.calls[1][0];
    expect(second.from > first.from).toBe(true);
  });

  test('Custom shows From and To and asks only once both are real dates', async () => {
    renderPanel();
    await screen.findByRole('region', { name: 'Statement' });
    await waitFor(() => expect(getCustomerStatement).toHaveBeenCalledTimes(1));
    userEvent.click(within(section('Statement')).getByRole('radio', { name: 'Custom' }));
    const from = within(section('Statement')).getByRole('textbox', { name: 'From' });
    const to = within(section('Statement')).getByRole('textbox', { name: 'To' });
    userEvent.type(from, '01092026');
    expect(getCustomerStatement).toHaveBeenCalledTimes(1);
    userEvent.type(to, '30092026');
    await waitFor(() => expect(getCustomerStatement).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-09-01', to: '2026-09-30' })));
  });

  test('an empty period says so', async () => {
    getCustomerStatement.mockResolvedValue({ ...STATEMENT, lines: [], opening_balance: 0, closing_balance: 0, current_balance: 0 });
    renderPanel();
    expect(await screen.findByText('No sales or payments in this period')).toBeInTheDocument();
  });

  test('a statement that was cut says where it starts', async () => {
    getCustomerStatement.mockResolvedValue({ ...STATEMENT, truncated: true, from: '2026-09-01' });
    renderPanel();
    expect(await screen.findByText(/The statement starts on 1 Sep 2026/)).toBeInTheDocument();
  });

  test('a statement that stops before today also shows what is owed now', async () => {
    getCustomerStatement.mockResolvedValue({ ...STATEMENT, closing_balance: 1500, current_balance: 3500 });
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    expect(await within(statement).findByText('Owed now')).toBeInTheDocument();
  });

  test('a statement that cannot load shows a retry inside the section', async () => {
    getCustomerStatement.mockRejectedValueOnce(new Error('nope'));
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    userEvent.click(await within(statement).findByRole('button', { name: 'Try again' }));
    expect(await within(statement).findByRole('table')).toBeInTheDocument();
  });

  test('Send statement on WhatsApp is a link with the balance and the latest items', async () => {
    renderPanel();
    const link = await screen.findByRole('link', { name: 'Send statement on WhatsApp' });
    const url = new URL(link.getAttribute('href'));
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/254712345678');
    const text = url.searchParams.get('text');
    expect(text).toContain('You owe KES 3,500');
    expect(text).toContain('Duka la Amina');
    expect(text).toContain('09/10/2026 Payment #P0003 KES 400');
    expect(text).toContain('01/10/2026 Sale #S0004 KES 3,000');
    expect(text).not.toContain('ACC-');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  test('a customer with no mobile has no WhatsApp link on the statement, with a reason', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, mobile: '' });
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    await within(statement).findByRole('table');
    expect(within(statement).queryByRole('link', { name: 'Send statement on WhatsApp' })).not.toBeInTheDocument();
    expect(within(statement).getByText(/WhatsApp is not available/)).toBeInTheDocument();
  });

  test('Print puts a print-only block on the page, opens the print window and takes the block away', async () => {
    let during;
    window.print = jest.fn(() => {
      during = {
        title: document.querySelector('body > .nl-statement-print h1').textContent,
        classed: document.body.classList.contains('nl-printing-statement'),
        text: document.querySelector('body > .nl-statement-print').textContent,
      };
    });
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    await within(statement).findByRole('table');
    userEvent.click(within(statement).getByRole('button', { name: 'Print' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(during.title).toBe('Statement for Wanjiru Kamau');
    expect(during.classed).toBe(true);
    expect(during.text).toContain('Sale #S0004');
    expect(during.text).toContain('KES 3,500');
    expect(during.text).not.toContain('ACC-');
    expect(document.querySelector('body > .nl-statement-print')).toBeNull();
    expect(document.body.classList.contains('nl-printing-statement')).toBe(false);
  });

  test('Export saves the lines as a spreadsheet with the balance at the start and the end', async () => {
    renderPanel();
    const statement = await screen.findByRole('region', { name: 'Statement' });
    await within(statement).findByRole('table');
    userEvent.click(within(statement).getByRole('button', { name: 'Export' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^statement-Wanjiru-Kamau-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('"Date","Document","Debit","Credit","Balance"');
    expect(lines).toHaveLength(7);
    expect(lines[1]).toContain('"Balance at the start"');
    expect(lines[lines.length - 1]).toContain('3500');
    expect(await screen.findByText('Saved the statement as a spreadsheet file')).toBeInTheDocument();
  });
});

describe('the Credit section (open question 15)', () => {
  test('shows the limit, what the customer owes and what is available', async () => {
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    await within(credit).findByText('Available');
    expect(within(credit).getByText('Credit limit', { selector: 'dt' }).nextSibling).toHaveTextContent('KES 5,000');
    expect(within(credit).getByText('Owes').nextSibling).toHaveTextContent('KES 3,500');
    expect(within(credit).getByText('Available').nextSibling).toHaveTextContent('KES 1,500');
    expect(getCreditLimit).toHaveBeenCalledWith('CUST-0007', 'Demo Shop');
  });

  test('being over the limit is said in words with an icon', async () => {
    getCreditLimit.mockResolvedValue({ ...CREDIT, owed: 6000, available: -1000, over: true });
    renderPanel();
    expect(await screen.findByText('Over the limit')).toBeInTheDocument();
  });

  test('a customer with no limit says so', async () => {
    getCreditLimit.mockResolvedValue({ limit: 0, effective: 0, owed: 3500, available: 0, source: '', over: false });
    renderPanel();
    expect(await screen.findByText('No limit set')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove limit' })).not.toBeInTheDocument();
  });

  test('saves a new limit through the current credit call', async () => {
    setCreditLimit.mockResolvedValue({});
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    const field = await within(credit).findByRole('textbox', { name: 'Credit limit for this customer' });
    await waitFor(() => expect(field).toHaveValue('5000'));
    userEvent.clear(field);
    userEvent.type(field, '7500');
    userEvent.click(within(credit).getByRole('button', { name: 'Save limit' }));
    await waitFor(() => expect(setCreditLimit).toHaveBeenCalledWith({ customer: 'CUST-0007', company: 'Demo Shop', limit: '7500' }));
    expect(await screen.findByText('Credit limit saved')).toBeInTheDocument();
  });

  test('an empty limit is refused beside the field', async () => {
    getCreditLimit.mockResolvedValue({ limit: 0, effective: 0, owed: 0, available: 0, source: '', over: false });
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    await within(credit).findByRole('textbox', { name: 'Credit limit for this customer' });
    userEvent.click(within(credit).getByRole('button', { name: 'Save limit' }));
    expect(await within(credit).findByText('Enter an amount, such as 5000')).toBeInTheDocument();
    expect(setCreditLimit).not.toHaveBeenCalled();
  });

  test('removing the limit asks first and names what will happen', async () => {
    removeCreditLimit.mockResolvedValue({});
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    userEvent.click(await within(credit).findByRole('button', { name: 'Remove limit' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove the credit limit?' });
    expect(within(dialog).getByText(/The shop default applies instead/)).toBeInTheDocument();
    expect(removeCreditLimit).not.toHaveBeenCalled();
    userEvent.click(within(dialog).getByRole('button', { name: 'Remove limit' }));
    await waitFor(() => expect(removeCreditLimit).toHaveBeenCalledWith({ customer: 'CUST-0007', company: 'Demo Shop' }));
    expect(await screen.findByText('Credit limit removed')).toBeInTheDocument();
  });

  test('keeping the limit closes the question and changes nothing', async () => {
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    userEvent.click(await within(credit).findByRole('button', { name: 'Remove limit' }));
    userEvent.click(await screen.findByRole('button', { name: 'Keep limit' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(removeCreditLimit).not.toHaveBeenCalled();
  });

  test('a refused change is a plain message, not a code', async () => {
    setCreditLimit.mockRejectedValue(new Error('Only roles that manage credit can do this.'));
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    const field = await within(credit).findByRole('textbox', { name: 'Credit limit for this customer' });
    await waitFor(() => expect(field).toHaveValue('5000'));
    userEvent.click(within(credit).getByRole('button', { name: 'Save limit' }));
    expect(await screen.findByText('The credit limit could not be changed. Please try again.')).toBeInTheDocument();
  });

  test('the history lists movements with short numbers and the system reference nowhere', async () => {
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    const table = await within(credit).findByRole('table', { name: 'Credit history of Wanjiru Kamau' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['01/10/2026', 'Sale #S0004', 'KES 3,000', 'KES 3,000', 'Unpaid']);
    expect(within(rows[1]).getByText('Payment #P0003')).toBeInTheDocument();
    expect(within(credit).queryByText(/ACC-/)).not.toBeInTheDocument();
  });

  test('the history can be limited with From and To', async () => {
    renderPanel();
    const credit = await screen.findByRole('region', { name: 'Credit' });
    await within(credit).findByRole('table', { name: 'Credit history of Wanjiru Kamau' });
    userEvent.type(within(credit).getByRole('textbox', { name: 'History from' }), '01092026');
    userEvent.type(within(credit).getByRole('textbox', { name: 'History to' }), '30092026');
    await waitFor(() => expect(getCreditHistory).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-09-01', to: '2026-09-30', customer: 'CUST-0007' })));
  });

  test('an empty history says so', async () => {
    getCreditHistory.mockResolvedValue({ rows: [], total: 0 });
    renderPanel();
    expect(await screen.findByText('No credit movements in this period')).toBeInTheDocument();
  });
});

describe('loyalty (open question 16)', () => {
  test('shows the programme and the points balance', async () => {
    renderPanel();
    const loyalty = await screen.findByRole('region', { name: 'Loyalty' });
    expect(await within(loyalty).findByText('120')).toBeInTheDocument();
    expect(within(loyalty).getByText('Duka Points')).toBeInTheDocument();
    expect(getLoyaltyBalance).toHaveBeenCalledWith('CUST-0007', 'Demo Shop');
  });

  test('a customer on no programme says so', async () => {
    getCustomerOverview.mockResolvedValue({ ...CUSTOMER, loyalty_program: '' });
    renderPanel();
    expect(await screen.findByText('Not on a programme')).toBeInTheDocument();
  });

  test('assigning a programme lists them, marks the inactive ones, and calls the current assign call', async () => {
    listLoyaltyPrograms.mockResolvedValue([
      { name: 'P1', title: 'Duka Points', active: true },
      { name: 'P2', title: 'Old Club', active: false },
    ]);
    assignLoyaltyProgram.mockResolvedValue({});
    const { onChanged } = renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Assign programme' }));
    const dialog = await screen.findByRole('dialog', { name: 'Assign a loyalty programme' });
    userEvent.click(await within(dialog).findByRole('combobox', { name: 'Programme' }));
    expect(screen.getByRole('option', { name: 'Old Club (not active)' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('option', { name: 'Duka Points (active)' }));
    userEvent.click(within(dialog).getByRole('button', { name: 'Assign programme' }));
    await waitFor(() => expect(assignLoyaltyProgram).toHaveBeenCalledWith({ customer: 'CUST-0007', program: 'P1', company: 'Demo Shop' }));
    expect(await screen.findByText('Wanjiru Kamau is now on Duka Points')).toBeInTheDocument();
    await waitFor(() => expect(getCustomerOverview.mock.calls.length).toBeGreaterThan(1));
    expect(onChanged).not.toHaveBeenCalled();
  });

  test('assigning without choosing is refused beside the field', async () => {
    listLoyaltyPrograms.mockResolvedValue([{ name: 'P1', title: 'Duka Points', active: true }]);
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Assign programme' }));
    const dialog = await screen.findByRole('dialog', { name: 'Assign a loyalty programme' });
    await within(dialog).findByRole('combobox', { name: 'Programme' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Assign programme' }));
    expect(await within(dialog).findByText('Choose a programme from the list')).toBeInTheDocument();
    expect(assignLoyaltyProgram).not.toHaveBeenCalled();
  });

  test('a shop with no programmes is told where they are set up', async () => {
    listLoyaltyPrograms.mockResolvedValue([]);
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Assign programme' }));
    expect(await screen.findByText(/Programmes are set up in Settings/)).toBeInTheDocument();
  });

  test('redeeming points calls the current redeem call and shows what is left', async () => {
    redeemPoints.mockResolvedValue({ redeemed: 50, remaining: 70 });
    renderPanel();
    const loyalty = await screen.findByRole('region', { name: 'Loyalty' });
    await within(loyalty).findByText('120');
    userEvent.click(within(loyalty).getByRole('button', { name: 'Redeem points' }));
    const dialog = await screen.findByRole('dialog', { name: 'Redeem points' });
    expect(within(dialog).getByText('Wanjiru Kamau has 120 points.')).toBeInTheDocument();
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Points to redeem' }), '50');
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Reference (optional)' }), 'R-12');
    userEvent.click(within(dialog).getByRole('button', { name: 'Redeem points' }));
    await waitFor(() => expect(redeemPoints).toHaveBeenCalledWith({ customer: 'CUST-0007', points: 50, reference: 'R-12', company: 'Demo Shop' }));
    expect(await screen.findByText('50 points redeemed, 70 left')).toBeInTheDocument();
  });

  test('redeeming more than the balance, or nothing, is refused beside the field', async () => {
    renderPanel();
    const loyalty = await screen.findByRole('region', { name: 'Loyalty' });
    await within(loyalty).findByText('120');
    userEvent.click(within(loyalty).getByRole('button', { name: 'Redeem points' }));
    const dialog = await screen.findByRole('dialog', { name: 'Redeem points' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Redeem points' }));
    expect(await within(dialog).findByText('Enter a whole number of points above 0')).toBeInTheDocument();
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Points to redeem' }), '500');
    userEvent.click(within(dialog).getByRole('button', { name: 'Redeem points' }));
    expect(await within(dialog).findByText('They only have 120 points')).toBeInTheDocument();
    expect(redeemPoints).not.toHaveBeenCalled();
  });

  test('Escape closes a loyalty dialog and returns the keyboard to its button', async () => {
    renderPanel();
    const loyalty = await screen.findByRole('region', { name: 'Loyalty' });
    await within(loyalty).findByText('120');
    const button = within(loyalty).getByRole('button', { name: 'Redeem points' });
    userEvent.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Redeem points' });
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Points to redeem' }), '{esc}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  test('the history shows earned and redeemed points with From, To and a kind', async () => {
    getPointsHistory.mockResolvedValue({
      rows: [
        { name: 'T1', date: '2026-10-05 10:00:00', transaction_type: 'Earn', points_earned: 20, purchase_amount: 2000, reference_document: '' },
        { name: 'T2', date: '2026-10-06 11:00:00', transaction_type: 'Redeem', points_earned: 50, purchase_amount: 0, reference_document: 'R-12' },
      ],
      total: 2,
      pages: 1,
    });
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Points history' }));
    const dialog = await screen.findByRole('dialog', { name: 'Points history' });
    const table = await within(dialog).findByRole('table', { name: 'Points history of Wanjiru Kamau' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['05/10/2026', 'Earned', '20', 'KES 2,000', '-']);
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['06/10/2026', 'Redeemed', '50', '-', 'R-12']);
    userEvent.click(within(dialog).getByRole('combobox', { name: 'Kind' }));
    userEvent.click(screen.getByRole('option', { name: 'Earned' }));
    await waitFor(() => expect(getPointsHistory).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'earn', customer: 'CUST-0007' })));
  });
});

describe('Edit and Disable', () => {
  test('Edit opens the edit form', async () => {
    const { onEdit } = renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test('Disable asks first, in words that say what happens, and changes nothing until confirmed', async () => {
    updateCustomer.mockResolvedValue({ id: 'CUST-0007' });
    const { onChanged } = renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Disable Wanjiru Kamau?' });
    expect(within(dialog).getByText(/will no longer show in the till. Their history and what they owe stay as they are/)).toBeInTheDocument();
    expect(updateCustomer).not.toHaveBeenCalled();
    userEvent.click(within(dialog).getByRole('button', { name: 'Disable customer' }));
    await waitFor(() => expect(updateCustomer).toHaveBeenCalledWith({ id: 'CUST-0007', disabled: true, company: 'Demo Shop' }));
    expect(await screen.findByText('Wanjiru Kamau is disabled')).toBeInTheDocument();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  test('keeping the customer closes the question', async () => {
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    userEvent.click(await screen.findByRole('button', { name: 'Keep customer' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(updateCustomer).not.toHaveBeenCalled();
  });

  test('a failed change says so in plain words', async () => {
    updateCustomer.mockRejectedValue(new Error('x'));
    renderPanel();
    userEvent.click(await screen.findByRole('button', { name: 'Disable' }));
    userEvent.click(await screen.findByRole('button', { name: 'Disable customer' }));
    expect(await screen.findByText('The customer could not be changed. Please try again.')).toBeInTheDocument();
  });
});

describe('a cashier (AC-14)', () => {
  const asCashier = () => {
    const { balance, ...rest } = CUSTOMER; // eslint-disable-line no-unused-vars
    getCustomerOverview.mockResolvedValue({ ...rest, last_purchase: { date: '2026-10-05', receipt: '#0012', id: 'X' } });
    return renderPanel({ canSeeMoney: false });
  };

  test('sees no balance, no amount, no statement and no credit, and the server is not asked for them', async () => {
    asCashier();
    await screen.findByRole('heading', { level: 2, name: 'Wanjiru Kamau' });
    expect(screen.queryByText('Balance owed')).not.toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Statement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Credit' })).not.toBeInTheDocument();
    expect(getCustomerStatement).not.toHaveBeenCalled();
    expect(getCreditLimit).not.toHaveBeenCalled();
    expect(getCreditHistory).not.toHaveBeenCalled();
  });

  test('still sees the last purchase date, WhatsApp, loyalty, Edit and Disable', async () => {
    asCashier();
    expect(await screen.findByText('5 Oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send on WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loyalty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
  });
});
