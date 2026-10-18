/* eslint-disable testing-library/no-node-access, testing-library/no-container, testing-library/no-unnecessary-act --
   A few checks need structure no role query can express: that the difference icon is the right one and that skeleton
   shapes appear only after 200ms. The act wrappers flush answers of the injected server functions, which arrive
   after a click and before the next query would start waiting. */
/**
 * Ticket P3-6 (front end): the difference words, the shift-end count dialog (AC-23) and the Till open panel.
 * All server calls are replaced by jest functions; the data is made up.
 */
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShiftCloseDialog from './ShiftCloseDialog';
import TillPanel, { MAX_RECENT_SALES } from './TillPanel';
import { cashRow, countedFor, differenceView, hasCount, openedLine, openingFloat, otherRows, sessionName, wordFor } from './shiftModel';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const session = { name: 'POS-OPE-7', cashier: 'wanjiru@shop.test', cashier_name: 'Wanjiru', opened_at: '08:15', pos_profile: 'Main till', opening: [{ mode: 'Cash', amount: 2000 }] };

const tillState = (over = {}) => ({
  state: 'open',
  session,
  expected: [
    { mode: 'Cash', key: 'cash', label: 'Cash', opening: 2000, sales: 3500, paid_in: 0, refunds: 0, paid_out: 0, expected: 5500, counts_cash: true },
    { mode: 'M-Pesa', key: 'mpesa', label: 'M-Pesa', opening: 0, sales: 4200, paid_in: 0, refunds: 0, paid_out: 0, expected: 4200, counts_cash: true },
    { mode: 'Credit Card', key: 'card', label: 'Card', opening: 0, sales: 900, paid_in: 0, refunds: 0, paid_out: 0, expected: 900, counts_cash: true },
    { mode: 'On credit', key: 'credit', label: 'On credit', opening: 0, sales: 1200, paid_in: 0, refunds: 0, paid_out: 0, expected: 0, counts_cash: false },
  ],
  held_count: 3,
  recent_sales: [],
  ...over,
});

const previewFor = (counted, over = {}) => {
  const difference = counted - 5500;
  return {
    closed: false,
    // As the server sends it: every money line is listed, and a line that was not counted by hand counts as expected
    lines: [
      { mode: 'Cash', key: 'cash', label: 'Cash', expected: 5500, counted, difference },
      { mode: 'M-Pesa', key: 'mpesa', label: 'M-Pesa', expected: 4200, counted: 4200, difference: 0 },
      { mode: 'Credit Card', key: 'card', label: 'Card', expected: 900, counted: 900, difference: 0 },
    ],
    total_expected: 10600,
    total_counted: 5100 + counted,
    difference,
    word: difference === 0 ? 'matches' : difference < 0 ? 'short' : 'over',
    ...over,
  };
};

describe('the difference helper', () => {
  test('a negative difference is short, a positive one is over, zero matches', async () => {
    expect(wordFor(-100)).toBe('short');
    expect(wordFor(100)).toBe('over');
    expect(wordFor(0)).toBe('matches');
  });

  test('half a cent either way counts as a match, a whole cent does not', async () => {
    expect(wordFor(0.004)).toBe('matches');
    expect(wordFor(-0.004)).toBe('matches');
    expect(wordFor(0.01)).toBe('over');
    expect(wordFor(-0.01)).toBe('short');
  });

  test('short shows an alert icon and "Short by" with the amount, never a minus sign', async () => {
    expect(differenceView(-100)).toMatchObject({ word: 'short', icon: 'alert', tone: 'bad', text: 'Short by KES 100' });
  });

  test('over shows an info icon and "Over by"', async () => {
    expect(differenceView(250)).toMatchObject({ word: 'over', icon: 'info', tone: 'warn', text: 'Over by KES 250' });
  });

  test('matches shows a check icon and the word Matches, with no amount', async () => {
    expect(differenceView(0)).toMatchObject({ word: 'matches', icon: 'check', tone: 'good', text: 'Matches' });
  });

  test('cents are kept: Short by KES 99.50', async () => {
    expect(differenceView(-99.5).text).toBe('Short by KES 99.50');
  });

  test('thousands use a comma', async () => {
    expect(differenceView(-1250).text).toBe('Short by KES 1,250');
  });

  test('the server word wins when it is one of the three; an unknown word falls back to the sign', async () => {
    expect(differenceView(-100, 'short').word).toBe('short');
    expect(differenceView(-100, 'nonsense').word).toBe('short');
    expect(differenceView(undefined, undefined).word).toBe('matches');
  });

  test('picks out the cash row, the other rows, the float and the counted list', async () => {
    const state = tillState();
    expect(cashRow(state).mode).toBe('Cash');
    expect(otherRows(state).map((r) => r.key)).toEqual(['mpesa', 'card']); // not cash, and not the On credit line
    expect(cashRow({ expected: [{ key: 'mpesa', counts_cash: true }] })).toBeNull(); // counts_cash is on M-Pesa too
    expect(openingFloat(session, state)).toBe(2000);
    expect(openingFloat(session, null)).toBe(2000);
    expect(openingFloat(null, null)).toBe(0);
    expect(countedFor(state, '5400')).toEqual([{ mode: 'Cash', amount: 5400 }]);
    expect(countedFor(null, '0')).toEqual([{ mode: 'Cash', amount: 0 }]);
    expect(countedFor({ expected: [{ key: 'mpesa', mode: 'M-Pesa' }] }, '10')).toEqual([]); // a till with no cash method
  });

  test('a typed zero counts as a count; blank does not', async () => {
    expect(hasCount('0')).toBe(true);
    expect(hasCount('5400')).toBe(true);
    expect(hasCount('')).toBe(false);
    expect(hasCount(undefined)).toBe(false);
  });

  test('says who opened the till and when, with whatever is known', async () => {
    expect(openedLine(session)).toBe('Opened by Wanjiru at 08:15');
    expect(openedLine({ cashier: 'a@b.test' })).toBe('Opened by a@b.test');
    expect(openedLine({ opened_at: '09:00' })).toBe('Opened at 09:00');
    expect(openedLine(null)).toBe('');
    expect(sessionName('S1')).toBe('S1');
    expect(sessionName(session)).toBe('POS-OPE-7');
    expect(sessionName(null)).toBe('');
  });
});

// A click that starts a server call: wrapped so the answer is applied inside act
const press = (name) =>
  act(async () => {
    userEvent.click(screen.getByRole('button', { name }));
  });

describe('the shift-end count dialog', () => {
  const setup = async (props = {}) => {
    const load = jest.fn().mockResolvedValue(tillState());
    const preview = jest.fn((args) => Promise.resolve(previewFor(args.counted[0].amount)));
    const close = jest.fn((args) => Promise.resolve({ ...previewFor(args.counted[0].amount), closed: true, closing_entry: 'POS-CLO-1' }));
    const onClose = jest.fn();
    const onClosed = jest.fn();
    const utils = render(<ShiftCloseDialog open session={session} currency="KES" onClose={onClose} onClosed={onClosed} load={load} preview={preview} close={close} {...props} />);
    await act(async () => {});
    return { load, preview, close, onClose, onClosed, ...utils };
  };
  const field = () => screen.getByLabelText('Cash you counted');
  const count = async (digits) => {
    userEvent.type(field(), digits);
    await press('See the difference');
  };

  test('opens on the count step with the session, who opened it and the opening float', async () => {
    await setup();
    expect(screen.getByRole('dialog', { name: 'Count the cash' })).toBeInTheDocument();
    expect(screen.getByText('Session POS-OPE-7')).toBeInTheDocument();
    expect(screen.getByText('Opened by Wanjiru at 08:15')).toBeInTheDocument();
    expect(screen.getByText('Opening float: KES 2,000')).toBeInTheDocument();
    expect(await screen.findByLabelText('Cash you counted')).toBeInTheDocument();
  });

  test('the first focus lands on the counted cash field', async () => {
    await setup();
    expect(field()).toHaveFocus();
  });

  test('the field takes digits only, in KES', async () => {
    await setup();
    userEvent.type(field(), '5a4,0.0');
    expect(field()).toHaveValue('5400');
    expect(screen.getByText('KES')).toBeInTheDocument();
  });

  test('explains what to count in plain words', async () => {
    await setup();
    expect(screen.getByText(/including the opening float/i)).toBeInTheDocument();
  });

  test('See the difference is off until a number is typed, and a typed 0 turns it on', async () => {
    await setup();
    const button = screen.getByRole('button', { name: 'See the difference' });
    expect(button).toBeDisabled();
    userEvent.type(field(), '0');
    expect(button).toBeEnabled();
    userEvent.clear(field());
    expect(button).toBeDisabled();
  });

  test('asks the server to preview the count and does not close anything', async () => {
    const { preview, close } = await setup();
    await count('5400');
    await screen.findByRole('dialog', { name: 'Check and end shift' });
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenCalledWith({ session: 'POS-OPE-7', counted: [{ mode: 'Cash', amount: 5400 }] });
    expect(close).not.toHaveBeenCalled();
  });

  test('a short count shows an alert icon and "Short by KES 100"', async () => {
    await setup();
    await count('5400');
    const word = await screen.findByText('Short by KES 100');
    expect(word.closest('[data-word]')).toHaveAttribute('data-word', 'short');
    expect(word.closest('[data-word]').querySelector('[data-icon="alert"]')).not.toBeNull();
  });

  test('an over count shows an info icon and "Over by KES 100"', async () => {
    await setup();
    await count('5600');
    const word = await screen.findByText('Over by KES 100');
    expect(word.closest('[data-word]').querySelector('[data-icon="info"]')).not.toBeNull();
  });

  test('a matching count shows a check icon and "Matches"', async () => {
    await setup();
    await count('5500');
    const word = await screen.findByText('Matches');
    expect(word.closest('[data-word]').querySelector('[data-icon="check"]')).not.toBeNull();
  });

  test('shows expected cash with its parts, counted cash and the difference as table rows', async () => {
    await setup();
    await count('5400');
    await screen.findByText('Short by KES 100');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: /Expected cash/ })).toBeInTheDocument();
    const rowOf = (name) => within(table).getByRole('rowheader', { name }).closest('tr');
    expect(within(rowOf(/Expected cash/)).getByText('KES 5,500')).toBeInTheDocument();
    expect(within(rowOf('Opening float')).getByText('KES 2,000')).toBeInTheDocument();
    expect(within(rowOf('Cash sales')).getByText('KES 3,500')).toBeInTheDocument();
    expect(within(rowOf('Counted cash')).getByText('KES 5,400')).toBeInTheDocument();
    expect(within(rowOf('Difference')).getByText('Short by KES 100')).toBeInTheDocument();
    expect(within(table).queryByRole('rowheader', { name: 'Cash refunds' })).toBeNull();
  });

  test('cash refunds show only when there are some', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ expected: [{ mode: 'Cash', key: 'cash', label: 'Cash', opening: 2000, sales: 3500, refunds: 300, expected: 5200 }] }));
    await setup({ load });
    await waitFor(() => expect(load).toHaveBeenCalled());
    userEvent.type(field(), '5200');
    await waitFor(() => expect(screen.getByRole('button', { name: 'See the difference' })).toBeEnabled());
    await press('See the difference');
    expect(await screen.findByRole('rowheader', { name: 'Cash refunds' })).toBeInTheDocument();
    expect(screen.getByText('-KES 300')).toBeInTheDocument();
  });

  test('M-Pesa and card are plain information lines with nothing to count and no field', async () => {
    await setup();
    await count('5500');
    expect(await screen.findByText('M-Pesa received KES 4,200, nothing to count')).toBeInTheDocument();
    expect(screen.getByText('Card received KES 900, nothing to count')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  test('Back keeps the typed count and returns focus to the field', async () => {
    await setup();
    await count('5400');
    await screen.findByText('Short by KES 100');
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('dialog', { name: 'Count the cash' })).toBeInTheDocument();
    expect(field()).toHaveValue('5400');
    expect(field()).toHaveFocus();
  });

  test('changing the count after Back previews the new count', async () => {
    const { preview } = await setup();
    await count('5400');
    await screen.findByText('Short by KES 100');
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    userEvent.clear(field());
    await count('5600');
    expect(await screen.findByText('Over by KES 100')).toBeInTheDocument();
    expect(preview).toHaveBeenCalledTimes(2);
  });

  test('close is not called before the cashier confirms, and the session closes once on Close till', async () => {
    const { close, onClosed } = await setup();
    await count('5400');
    await screen.findByText('Short by KES 100');
    expect(close).not.toHaveBeenCalled();
    await press('Close till');
    await screen.findByRole('dialog', { name: 'Till closed' });
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith({ session: 'POS-OPE-7', counted: [{ mode: 'Cash', amount: 5400 }] });
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(onClosed).toHaveBeenCalledWith(expect.objectContaining({ closed: true, closing_entry: 'POS-CLO-1' }));
  });

  test('a double press of Close till closes once', async () => {
    let release;
    const close = jest.fn(() => new Promise((resolve) => { release = () => resolve({ ...previewFor(5400), closed: true }); }));
    await setup({ close });
    await count('5400');
    await screen.findByText('Short by KES 100');
    const button = screen.getByRole('button', { name: 'Close till' });
    await act(async () => {
      userEvent.click(button);
      userEvent.click(button);
    });
    expect(close).toHaveBeenCalledTimes(1);
    await act(async () => release());
  });

  test('success is announced with role status and says what was counted and expected', async () => {
    await setup();
    await count('5400');
    await screen.findByText('Short by KES 100');
    await press('Close till');
    await screen.findByRole('dialog', { name: 'Till closed' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Till closed. Counted KES 5,400, expected KES 5,500.');
    expect(status).toHaveTextContent('Difference: Short by KES 100');
    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  });

  test('Done asks the parent to close the dialog', async () => {
    const { onClose } = await setup();
    await count('5500');
    await screen.findByText('Matches');
    await press('Close till');
    await press('Done');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('an error while checking shows a role alert and keeps the typed count', async () => {
    const preview = jest.fn().mockRejectedValue(new Error('Count the cash first.'));
    await setup({ preview });
    await count('5400');
    expect(await screen.findByRole('alert')).toHaveTextContent('Count the cash first.');
    expect(field()).toHaveValue('5400');
    expect(screen.getByRole('button', { name: 'See the difference' })).toBeEnabled();
  });

  test('an error while closing shows a role alert, keeps the figures and does not report a closed till', async () => {
    const close = jest.fn().mockRejectedValue(new Error('The till could not be closed.'));
    const { onClosed } = await setup({ close });
    await count('5400');
    await screen.findByText('Short by KES 100');
    await press('Close till');
    expect(await screen.findByRole('alert')).toHaveTextContent('The till could not be closed.');
    expect(screen.getByRole('dialog', { name: 'Check and end shift' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close till' })).toBeEnabled();
    expect(onClosed).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(field()).toHaveValue('5400');
  });

  test('after a failed close the cashier can try again and it closes', async () => {
    const close = jest.fn().mockRejectedValueOnce(new Error('No connection.')).mockResolvedValueOnce({ ...previewFor(5400), closed: true });
    const { onClosed } = await setup({ close });
    await count('5400');
    await screen.findByText('Short by KES 100');
    await press('Close till');
    await screen.findByRole('alert');
    await press('Close till');
    await screen.findByRole('dialog', { name: 'Till closed' });
    expect(close).toHaveBeenCalledTimes(2);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  test('paid in and paid out show as parts of the expected cash when there are some', async () => {
    const row = { mode: 'Cash', key: 'cash', label: 'Cash', opening: 2000, sales: 3500, paid_in: 400, refunds: 0, paid_out: 150, expected: 5750, counts_cash: true };
    await setup({ load: jest.fn().mockResolvedValue(tillState({ expected: [row] })) });
    await count('5750');
    expect(await screen.findByRole('rowheader', { name: 'Paid in by customers' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Money paid out' }).closest('tr')).toHaveTextContent('-KES 150');
  });

  test('the On credit line is not shown, and M-Pesa is never taken for cash', async () => {
    await setup();
    await count('5500');
    await screen.findByText('Matches');
    expect(screen.queryByText(/On credit/)).toBeNull();
    expect(screen.getAllByRole('rowheader', { name: /Expected cash/ })).toHaveLength(1);
    expect(screen.getByText('M-Pesa received KES 4,200, nothing to count')).toBeInTheDocument();
  });

  test('without the loaded figures the other methods still show from the server lines', async () => {
    await setup({ load: jest.fn().mockRejectedValue(new Error('offline')) });
    await screen.findByRole('alert');
    await count('5500');
    expect(await screen.findByText('M-Pesa received KES 4,200, nothing to count')).toBeInTheDocument();
    expect(screen.getByText('Card received KES 900, nothing to count')).toBeInTheDocument();
  });

  test('a till with no cash method sends no counted list', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ expected: [{ mode: 'M-Pesa', key: 'mpesa', label: 'M-Pesa', opening: 0, sales: 100, paid_in: 0, refunds: 0, paid_out: 0, expected: 100, counts_cash: true }] }));
    const preview = jest.fn().mockResolvedValue({ closed: false, lines: [{ mode: 'M-Pesa', key: 'mpesa', label: 'M-Pesa', expected: 100, counted: 100, difference: 0 }], total_expected: 100, total_counted: 100, difference: 0, word: 'matches' });
    await setup({ load, preview });
    await count('0');
    await screen.findByRole('dialog', { name: 'Check and end shift' });
    expect(preview).toHaveBeenCalledWith({ session: 'POS-OPE-7', counted: [] });
  });

  test('a close that finishes in the background says so', async () => {
    const close = jest.fn().mockResolvedValue({ ...previewFor(5500), closed: true, outcome: 'closing' });
    await setup({ close });
    await count('5500');
    await screen.findByText('Matches');
    await press('Close till');
    expect(await screen.findByText(/finish in the background/)).toBeInTheDocument();
  });

  test('Escape closes the dialog', async () => {
    const { onClose } = await setup();
    userEvent.keyboard('{esc}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape does nothing while the till is closing', async () => {
    let release;
    const close = jest.fn(() => new Promise((resolve) => { release = () => resolve({ ...previewFor(5400), closed: true }); }));
    const { onClose } = await setup({ close });
    await count('5400');
    await screen.findByText('Short by KES 100');
    await press('Close till');
    userEvent.keyboard('{esc}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    await act(async () => release());
  });

  test('Keep selling closes without calling the server to close', async () => {
    const { onClose, close } = await setup();
    userEvent.click(screen.getByRole('button', { name: 'Keep selling' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  test('Enter in the field checks the count', async () => {
    const { preview } = await setup();
    userEvent.type(field(), '5400');
    await act(async () => {
      userEvent.keyboard('{enter}');
    });
    await screen.findByText('Short by KES 100');
    expect(preview).toHaveBeenCalledTimes(1);
  });

  test('if the till figures cannot load, an alert offers Try again and the count still works', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(tillState());
    await setup({ load });
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the till figures');
    await press('Try again');
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('without the loaded figures the check step still shows the server totals', async () => {
    const load = jest.fn().mockRejectedValue(new Error('offline'));
    await setup({ load });
    await screen.findByRole('alert');
    userEvent.type(field(), '5400');
    await press('See the difference');
    expect(await screen.findByText('Short by KES 100')).toBeInTheDocument();
    expect(screen.getByText('KES 5,500')).toBeInTheDocument();
  });

  test('accepts the session as just its name', async () => {
    const { preview } = await setup({ session: 'POS-OPE-9' });
    await count('100');
    await screen.findByRole('dialog', { name: 'Check and end shift' });
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({ session: 'POS-OPE-9' }));
  });

  test('draws nothing when closed, and focus returns to the opener when it closes', async () => {
    const Host = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open count</button>
          <ShiftCloseDialog open={open} session={session} onClose={() => setOpen(false)} load={jest.fn().mockResolvedValue(tillState())} />
        </>
      );
    };
    render(<Host />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const opener = screen.getByRole('button', { name: 'Open count' });
    userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  test('the buttons are 44px till buttons', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'See the difference' })).toHaveClass('nl-btn--till');
    expect(screen.getByRole('button', { name: 'Keep selling' })).toHaveClass('nl-btn--till');
  });
});

describe('the Till open panel', () => {
  const sale = (n, over = {}) => ({ id: `INV-${n}`, receipt: `#00${30 + n}`, time: `14:0${n}`, customer: `Customer ${n}`, total: 350 * n, status: 'paid', ...over });
  const setup = async (props = {}) => {
    const load = jest.fn().mockResolvedValue(tillState({ recent_sales: [sale(1), sale(2), sale(3)] }));
    const handlers = { onClose: jest.fn(), onOpenHeld: jest.fn(), onCloseTill: jest.fn(), onOpenSale: jest.fn() };
    const utils = render(<TillPanel open session={session} currency="KES" heldCount={3} load={load} {...handlers} {...props} />);
    await act(async () => {});
    return { load, ...handlers, ...utils };
  };

  test('names the panel Till open and says who opened the till and since when', async () => {
    await setup();
    expect(screen.getByRole('dialog', { name: 'Till open' })).toBeInTheDocument();
    expect(await screen.findByText('Opened by Wanjiru at 08:15')).toBeInTheDocument();
  });

  test('shows the opening float and the cash in the till', async () => {
    await setup();
    await screen.findByText('Opened by Wanjiru at 08:15');
    expect(screen.getByText('Opening float').nextSibling).toHaveTextContent('KES 2,000');
    expect(screen.getByText('Cash in the till').nextSibling).toHaveTextContent('KES 5,500');
  });

  test('lists the recent sales with receipt, time, customer and amount', async () => {
    await setup();
    const list = await screen.findByRole('list');
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('#0031');
    expect(rows[0]).toHaveTextContent('14:01');
    expect(rows[0]).toHaveTextContent('Customer 1');
    expect(rows[0]).toHaveTextContent('KES 350');
  });

  test('shows at most five recent sales', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ recent_sales: [1, 2, 3, 4, 5, 6, 7].map((n) => sale(n)) }));
    await setup({ load });
    const list = await screen.findByRole('list');
    expect(within(list).getAllByRole('button')).toHaveLength(MAX_RECENT_SALES);
    expect(MAX_RECENT_SALES).toBe(5);
    expect(screen.queryByText('Customer 6')).toBeNull();
  });

  test('a sale with no customer reads Walk-in customer', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ recent_sales: [sale(1, { customer: '' })] }));
    await setup({ load });
    expect(await screen.findByText('Walk-in customer')).toBeInTheDocument();
  });

  test('pressing a sale calls onOpenSale with its id', async () => {
    const { onOpenSale } = await setup();
    userEvent.click(await screen.findByRole('button', { name: /#0032/ }));
    expect(onOpenSale).toHaveBeenCalledWith('INV-2');
  });

  test('Held sales (3) calls onOpenHeld', async () => {
    const { onOpenHeld } = await setup();
    userEvent.click(await screen.findByRole('button', { name: 'Held sales (3)' }));
    expect(onOpenHeld).toHaveBeenCalledTimes(1);
  });

  test('the held count follows the prop, and falls back to the server count', async () => {
    await setup({ heldCount: 0 });
    expect(await screen.findByRole('button', { name: 'Held sales (0)' })).toBeInTheDocument();
  });

  test('without a held count prop the server count is used', async () => {
    await setup({ heldCount: undefined });
    expect(await screen.findByRole('button', { name: 'Held sales (3)' })).toBeInTheDocument();
  });

  test('Count and close till calls onCloseTill and is a 44px till button', async () => {
    const { onCloseTill } = await setup();
    const button = await screen.findByRole('button', { name: 'Count and close till' });
    expect(button).toHaveClass('nl-btn--till');
    userEvent.click(button);
    expect(onCloseTill).toHaveBeenCalledTimes(1);
  });

  test('an empty session says so and offers no action in that spot', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ recent_sales: [] }));
    await setup({ load });
    expect(await screen.findByText('No sales yet in this session')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  test('a failed load shows a message and Try again, which loads again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(tillState({ recent_sales: [sale(1)] }));
    await setup({ load });
    expect(await screen.findByText('We could not load the till')).toBeInTheDocument();
    await press('Try again');
    expect(await screen.findByText('#0031')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('a closed till says so', async () => {
    const load = jest.fn().mockResolvedValue(tillState({ state: 'closed', session: null }));
    await setup({ load });
    expect(await screen.findByText('This till is closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Count and close till' })).toBeNull();
  });

  test('loading shows a polite status at once and skeleton shapes only after 200ms', async () => {
    jest.useFakeTimers();
    try {
      const load = jest.fn(() => new Promise(() => {}));
      await setup({ load });
      expect(screen.getByRole('status')).toHaveTextContent('Loading the till');
      expect(document.querySelector('.nl-skeleton')).toBeNull();
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(document.querySelector('.nl-skeleton')).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('loads again each time it opens', async () => {
    const load = jest.fn().mockResolvedValue(tillState());
    const { rerender } = await setup({ load });
    await screen.findByText('Opened by Wanjiru at 08:15');
    rerender(<TillPanel open={false} session={session} load={load} onClose={() => {}} />);
    rerender(<TillPanel open session={session} load={load} onClose={() => {}} />);
    await screen.findByText('Opened by Wanjiru at 08:15');
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('shows the session it already knows while the fresh figures load', async () => {
    const load = jest.fn(() => new Promise(() => {}));
    await setup({ load });
    expect(screen.getByRole('dialog', { name: 'Till open' })).toBeInTheDocument();
    expect(screen.queryByText('Opened by Wanjiru at 08:15')).toBeNull();
  });

  test('Escape and the Close button ask the parent to close, and focus returns to the opener', async () => {
    const Host = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Till open pill</button>
          <TillPanel open={open} onClose={() => setOpen(false)} session={session} load={jest.fn().mockResolvedValue(tillState())} />
        </>
      );
    };
    render(<Host />);
    const pill = screen.getByRole('button', { name: 'Till open pill' });
    userEvent.click(pill);
    expect(screen.getByRole('dialog', { name: 'Till open' })).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(pill).toHaveFocus();
    userEvent.click(pill);
    userEvent.click(screen.getByRole('button', { name: 'Close the Till open panel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('draws nothing when closed', async () => {
    const load = jest.fn();
    render(<TillPanel open={false} onClose={() => {}} load={load} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
});
