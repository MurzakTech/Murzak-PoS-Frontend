/**
 * Shift management, the till screens: cash in or out of the drawer, the shift report and the report rows. All server
 * calls are replaced by jest functions; the data is made up.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CashMovementDialog from './CashMovementDialog';
import ShiftReportDialog from './ShiftReportDialog';
import ShiftCloseDialog from './ShiftCloseDialog';
import TillPanel from './TillPanel';
import { cashRows, cashDifference, creditLine, isFinal, methodRows, returnsLine, salesRows, timeLines } from './reportModel';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const session = { name: 'POS-OPE-7', cashier_name: 'Wanjiru', opened_at: '08:15', pos_profile: 'Main till', opening: [{ mode: 'Cash', amount: 2000 }] };

const listing = (over = {}) => ({
  session: 'POS-OPE-7',
  movements: [],
  totals: { 'Paid In': 0, 'Paid Out': 0, 'Safe Drop': 0 },
  reasons: { 'Paid In': ['Float top-up', 'Other'], 'Paid Out': ['Petty cash', 'Supplier payment', 'Other'], 'Safe Drop': ['Bank deposit', 'Other'] },
  ...over,
});

const saved = (over = {}) => ({ movement: { id: 'M1', kind: 'Paid Out', amount: 300, reason: 'Petty cash', note: '', recorded_at: '12:30' }, duplicate: false, cash_in_till: 2710, ...over });

const report = (over = {}) => ({
  kind: 'X',
  session: 'POS-OPE-7',
  cashier: 'wanjiru@shop.test',
  cashier_name: 'Wanjiru',
  opened_on: '24 Oct 2026',
  opened_at: '08:15',
  closed_on: null,
  closed_at: null,
  sales: { count: 2, gross: 1450, net: 818.97, tax: 131.04, discounts: 50, average: 725 },
  returns: { count: 1, total: 500 },
  credit_sales: 0,
  by_method: [{ mode: 'Cash', label: 'Cash', key: 'cash', sales: 1450, refunds: 0, expected: 1850, counted: null, difference: null }],
  cash: { opening: 0, sales: 1450, paid_in: 1000, paid_out: 200, safe_drops: 400, refunds: 0, expected: 1850, counted: null, difference: null, word: null },
  totals: { expected: 1850, counted: null, difference: null, word: null },
  movements: [{ id: 'A', kind: 'Paid In', amount: 1000, reason: 'Float top-up', note: '', recorded_at: '09:00' }],
  movement_totals: { 'Paid In': 1000, 'Paid Out': 200, 'Safe Drop': 400 },
  ...over,
});

const finalReport = () =>
  report({
    kind: 'Z',
    closed_on: '24 Oct 2026',
    closed_at: '18:30',
    by_method: [{ mode: 'Cash', label: 'Cash', key: 'cash', sales: 1450, refunds: 0, expected: 1850, counted: 1825, difference: -25 }],
    cash: { opening: 0, sales: 1450, paid_in: 1000, paid_out: 200, safe_drops: 400, refunds: 0, expected: 1850, counted: 1825, difference: -25, word: 'short' },
    totals: { expected: 1850, counted: 1825, difference: -25, word: 'short' },
  });

describe('cash in or out', () => {
  test('it loads what was recorded and offers the reasons the server named', async () => {
    const load = jest.fn().mockResolvedValue(listing({ movements: [{ id: 'A', kind: 'Paid In', amount: 1000, reason: 'Float top-up', note: '', recorded_at: '09:00' }], totals: { 'Paid In': 1000, 'Paid Out': 0, 'Safe Drop': 0 } }));
    render(<CashMovementDialog open onClose={() => {}} session={session} load={load} save={jest.fn()} />);
    expect(await screen.findByText('09:00 put in KES 1,000 for Float top-up')).toBeInTheDocument();
    expect(screen.getByText('Put in: KES 1,000')).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith('POS-OPE-7');
  });

  test('Save stays off until an amount is typed, then saves once with the till reference and says what the drawer holds', async () => {
    const save = jest.fn().mockResolvedValue(saved());
    const onRecorded = jest.fn();
    render(<CashMovementDialog open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(listing())} save={save} onRecorded={onRecorded} />);
    const button = await screen.findByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Amount/), '300');
    expect(button).toBeEnabled();
    await userEvent.click(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ session: 'POS-OPE-7', kind: 'Paid Out', amount: 300, reason: 'Petty cash' });
    expect(save.mock.calls[0][0].clientId).toMatch(/^cash-/);
    expect(await screen.findByText('Saved. The drawer should now hold KES 2,710.')).toBeInTheDocument();
    expect(onRecorded).toHaveBeenCalled();
    expect(screen.getByLabelText(/Amount/)).toHaveValue('');
  });

  test('a save that fails keeps the entry and the same till reference for the next try', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('That is more than the till holds. Expected cash in the till is 100.00.')).mockResolvedValue(saved());
    render(<CashMovementDialog open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(listing())} save={save} />);
    await userEvent.type(await screen.findByLabelText(/Amount/), '900');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('more than the till holds');
    expect(screen.getByLabelText(/Amount/)).toHaveValue('900');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].clientId).toBe(save.mock.calls[0][0].clientId);
  });

  test('"Other" needs a few words before anything is sent', async () => {
    const save = jest.fn().mockResolvedValue(saved());
    render(<CashMovementDialog open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(listing())} save={save} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'To the safe' }));
    expect(screen.getByText(/Notes you move from the drawer to the safe/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: /Reason/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Other' }));
    await userEvent.type(screen.getByLabelText(/Amount/), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please say what the money was for.');
    expect(save).not.toHaveBeenCalled();
  });

  test('it shows a way to try again when what was recorded cannot be loaded', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(listing());
    render(<CashMovementDialog open onClose={() => {}} session={session} load={load} save={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load what was recorded');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Nothing has been recorded in this shift yet.')).toBeInTheDocument();
  });

  test('under Take out it points to Expenses for petty cash, and only under Take out', async () => {
    const onAddExpense = jest.fn();
    render(<CashMovementDialog open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(listing())} save={jest.fn()} onAddExpense={onAddExpense} />);
    expect(await screen.findByText(/Petty cash, supplies and paying a supplier are expenses/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
    expect(onAddExpense).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('radio', { name: 'Put in' }));
    expect(screen.queryByRole('button', { name: 'Add an expense' })).not.toBeInTheDocument();
  });

  test('it shows nothing while closed', () => {
    const { container } = render(<CashMovementDialog open={false} onClose={() => {}} session={session} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the shift report', () => {
  test('an open shift shows the X report with the drawer line by line', async () => {
    const load = jest.fn().mockResolvedValue(report());
    render(<ShiftReportDialog open onClose={() => {}} session="POS-OPE-7" load={load} />);
    expect(await screen.findByRole('heading', { name: 'Shift report so far' })).toBeInTheDocument();
    const drawer = screen.getByRole('table', { name: 'The cash drawer' });
    expect(within(drawer).getByText('Cash put in')).toBeInTheDocument();
    expect(within(drawer).getByText('Moved to the safe')).toBeInTheDocument();
    expect(within(drawer).getByText('Should be in the drawer')).toBeInTheDocument();
    expect(within(drawer).queryByText('Counted')).not.toBeInTheDocument();
    expect(screen.getByText('1 returned, KES 500 given back')).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith('POS-OPE-7');
  });

  test('a closed shift shows the Z report with what was counted and the difference in words', async () => {
    render(<ShiftReportDialog open onClose={() => {}} session="POS-OPE-7" load={jest.fn().mockResolvedValue(finalReport())} />);
    expect(await screen.findByRole('heading', { name: 'Shift report, closed' })).toBeInTheDocument();
    const drawer = screen.getByRole('table', { name: 'The cash drawer' });
    expect(within(drawer).getByText('Counted')).toBeInTheDocument();
    expect(within(drawer).getByText('Short by KES 25')).toBeInTheDocument();
    expect(screen.getByText('Closed 24 Oct 2026 18:30')).toBeInTheDocument();
  });

  test('it can be printed', async () => {
    const print = jest.spyOn(window, 'print').mockImplementation(() => {});
    render(<ShiftReportDialog open onClose={() => {}} session="POS-OPE-7" load={jest.fn().mockResolvedValue(report())} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Print' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    print.mockRestore();
  });

  test('a report that cannot be loaded says so and can be tried again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('This shift is closed but its closing record is not ready yet.')).mockResolvedValue(report());
    render(<ShiftReportDialog open onClose={() => {}} session="POS-OPE-7" load={load} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('not ready yet');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Shift report so far' })).toBeInTheDocument();
  });
});

describe('the report rows', () => {
  test('the sales rows leave out discounts when there were none and the average when nothing sold', () => {
    expect(salesRows(report()).map((r) => r.key)).toEqual(['count', 'gross', 'net', 'tax', 'discounts', 'average']);
    const none = report({ sales: { count: 0, gross: 0, net: 0, tax: 0, discounts: 0, average: 0 } });
    expect(salesRows(none).map((r) => r.key)).toEqual(['count', 'gross', 'net', 'tax']);
  });

  test('returns and credit lines appear only when there were some', () => {
    expect(returnsLine(report({ returns: { count: 0, total: 0 } }))).toBe('');
    expect(creditLine(report())).toBe('');
    expect(creditLine(report({ credit_sales: 1200 }))).toBe('Sold on credit: KES 1,200');
  });

  test('the drawer shows refunds, cash out and safe drops as money going out, and the count only when counted', () => {
    const rows = cashRows(report({ cash: { ...report().cash, refunds: 500 } }));
    expect(rows.map((r) => [r.key, r.amount])).toEqual([
      ['opening', 'KES 0'],
      ['sales', 'KES 1,450'],
      ['in', 'KES 1,000'],
      ['refunds', '-KES 500'],
      ['out', '-KES 200'],
      ['drops', '-KES 400'],
      ['expected', 'KES 1,850'],
    ]);
    expect(cashRows(finalReport()).some((r) => r.key === 'counted')).toBe(true);
    expect(cashRows(report({ cash: null }))).toEqual([]);
  });

  test('the cash difference reads in words only for a counted drawer', () => {
    expect(cashDifference(report())).toBeNull();
    expect(cashDifference(finalReport()).text).toBe('Short by KES 25');
  });

  test('a method row says "Not counted" until counted', () => {
    expect(methodRows(report())[0]).toMatchObject({ name: 'Cash', counted: 'Not counted', difference: '' });
    expect(methodRows(finalReport())[0]).toMatchObject({ counted: 'KES 1,825', difference: 'Short by KES 25' });
  });

  test('only a Z report is final, and its times include when it closed', () => {
    expect(isFinal(report())).toBe(false);
    expect(isFinal(finalReport())).toBe(true);
    expect(timeLines(report())).toEqual(['Opened 24 Oct 2026 08:15']);
    expect(timeLines(finalReport())).toEqual(['Opened 24 Oct 2026 08:15', 'Closed 24 Oct 2026 18:30']);
  });
});

describe('where the new screens are reached from', () => {
  const tillState = { state: 'open', session, expected: [{ mode: 'Cash', key: 'cash', label: 'Cash', opening: 2000, sales: 0, paid_in: 0, refunds: 0, paid_out: 0, expected: 2000, counts_cash: true }], held_count: 0, recent_sales: [] };

  test('the till panel offers Cash in or out and Shift report only when the till gives them', async () => {
    const onCash = jest.fn();
    const onReport = jest.fn();
    const { rerender } = render(<TillPanel open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(tillState)} />);
    await screen.findByRole('button', { name: /Count and close till/ });
    expect(screen.queryByRole('button', { name: 'Cash in or out' })).not.toBeInTheDocument();
    rerender(<TillPanel open onClose={() => {}} session={session} load={jest.fn().mockResolvedValue(tillState)} onCashInOut={onCash} onShiftReport={onReport} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cash in or out' }));
    await userEvent.click(screen.getByRole('button', { name: 'Shift report' }));
    expect(onCash).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  test('once the shift is closed the confirmation can open the final report', async () => {
    const onReport = jest.fn();
    const preview = jest.fn().mockResolvedValue({ closed: false, lines: [{ mode: 'Cash', key: 'cash', label: 'Cash', expected: 2000, counted: 2000, difference: 0 }], total_expected: 2000, total_counted: 2000, difference: 0, word: 'matches' });
    const close = jest.fn().mockResolvedValue({ closed: true, lines: [{ mode: 'Cash', key: 'cash', label: 'Cash', expected: 2000, counted: 2000, difference: 0 }], total_expected: 2000, total_counted: 2000, difference: 0, word: 'matches', outcome: 'closed' });
    render(<ShiftCloseDialog open onClose={() => {}} session={session} onReport={onReport} load={jest.fn().mockResolvedValue(tillState)} preview={preview} close={close} />);
    await userEvent.type(await screen.findByLabelText(/Cash you counted/), '2000');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Close till' }));
    await userEvent.click(await screen.findByRole('button', { name: 'See the shift report' }));
    expect(onReport).toHaveBeenCalledWith('POS-OPE-7');
  });
});
