import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ItemNoteDialog from './ItemNoteDialog';
import KitchenSettingsDialog from './KitchenSettingsDialog';
import KitchenTicketDialog, { TicketSheet } from './KitchenTicketDialog';
import ReadyTicketsDialog from './ReadyTicketsDialog';
import { UnsentItemsDialog, ClearSentSaleDialog } from './KitchenPrompts';
import { defaultSettings, planSend, buildTickets, EMPTY_KITCHEN } from '../../../utils/kitchenTickets';

const settings = (over = {}) => ({
  ...defaultSettings(),
  enabled: true,
  stations: [{ id: 'kitchen', name: 'Kitchen', groups: ['Food'] }, { id: 'bar', name: 'Bar', groups: ['Beer'] }],
  ...over,
});
const line = (code, name, group, qty, over = {}) => ({ item_code: code, item_name: name, item_group: group, qty, ...over });

describe('ItemNoteDialog', () => {
  const open = (props = {}) => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<ItemNoteDialog open item={line('P', 'Pilau', 'Food', 1)} quickNotes={['No onions', 'Well done']} onSave={onSave} onClose={onClose} {...props} />);
    return { onSave, onClose };
  };

  it('adds a quick note with one tap and takes it out with another', () => {
    open();
    const box = screen.getByLabelText('Note for the kitchen');
    fireEvent.click(screen.getByRole('button', { name: 'No onions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Well done' }));
    expect(box).toHaveValue('No onions, Well done');
    fireEvent.click(screen.getByRole('button', { name: 'No onions' }));
    expect(box).toHaveValue('Well done');
  });

  it('saves a tidied note, and says it stays off the receipt', () => {
    const { onSave } = open();
    fireEvent.change(screen.getByLabelText('Note for the kitchen'), { target: { value: '  no   pilipili ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(onSave).toHaveBeenCalledWith('no pilipili');
    expect(screen.getByText(/not on the customer's receipt/)).toBeInTheDocument();
  });

  it('starts from the current note, and can remove it', () => {
    const { onSave } = open({ item: line('P', 'Pilau', 'Food', 1, { note: 'well done' }) });
    expect(screen.getByLabelText('Note for the kitchen')).toHaveValue('well done');
    fireEvent.click(screen.getByRole('button', { name: 'Remove note' }));
    expect(onSave).toHaveBeenCalledWith('');
  });

  it('warns that changing the note of something already sent will tell the kitchen', () => {
    open({ item: line('P', 'Pilau', 'Food', 2, { sentQty: 2 }) });
    expect(screen.getByText(/2 already sent.*tells the kitchen about the change/)).toBeInTheDocument();
  });

  it('limits how long a note can be', () => {
    open();
    expect(screen.getByLabelText('Note for the kitchen')).toHaveAttribute('maxlength', '80');
  });
});

describe('KitchenSettingsDialog', () => {
  const open = (props = {}) => {
    const onSave = jest.fn();
    render(<KitchenSettingsDialog open settings={settings({ enabled: false })} groupNames={['Food', 'Beer', 'Soda', 'Stationery']} onSave={onSave} onClose={jest.fn()} {...props} />);
    return { onSave };
  };

  it('is off until switched on, and then shows the stations', () => {
    open();
    expect(screen.queryByLabelText('Station 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Send orders to the kitchen/ }));
    expect(screen.getByLabelText('Station 1')).toHaveValue('Kitchen');
    expect(screen.getByLabelText('Station 2')).toHaveValue('Bar');
  });

  it('suggests which categories go where, from their names', () => {
    open({ settings: settings({ stations: [{ id: 'kitchen', name: 'Kitchen', groups: [] }, { id: 'bar', name: 'Bar', groups: [] }] }) });
    fireEvent.click(screen.getByRole('button', { name: /Set up from my categories/ }));
    // each suggested category appears once, as a chip on its station; the unrelated one is not placed
    expect(screen.getAllByText('Food')).toHaveLength(1);
    expect(screen.getAllByText('Beer')).toHaveLength(1);
    expect(screen.getAllByText('Soda')).toHaveLength(1);
    expect(screen.queryByText('Stationery')).not.toBeInTheDocument();
  });

  it('refuses a station with no name, or the same name twice, and says why', () => {
    open({ settings: settings() });
    const first = screen.getByLabelText('Station 1');
    fireEvent.change(first, { target: { value: '' } });
    expect(screen.getByText('Give the station a name.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(first, { target: { value: 'bar' } });
    expect(screen.getAllByText('Two stations have this name.')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves tidy names and the quick notes as a list', () => {
    const { onSave } = open({ settings: settings() });
    fireEvent.change(screen.getByLabelText('Station 1'), { target: { value: '  Grill ' } });
    fireEvent.change(screen.getByLabelText(/Quick notes/), { target: { value: 'No onions,  Extra ,, No onions, Spicy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.stations[0].name).toBe('Grill');
    expect(saved.quickNotes).toEqual(['No onions', 'Extra', 'Spicy']);
    expect(saved.enabled).toBe(true);
    expect(saved.nextTicket).toBe(1); // the ticket counter is kept
  });

  it('can be switched off again and saved without checking the stations', () => {
    const { onSave } = open({ settings: settings({ stations: [{ id: 'k', name: '', groups: [] }] }) });
    fireEvent.click(screen.getByRole('switch', { name: /Send orders to the kitchen/ }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][0].enabled).toBe(false);
  });

  it('adds and removes stations, but always keeps one', () => {
    open({ settings: settings({ stations: [{ id: 'kitchen', name: 'Kitchen', groups: [] }] }) });
    expect(screen.getByRole('button', { name: 'Remove Kitchen' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Add a station/ }));
    expect(screen.getByLabelText('Station 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Kitchen' })).toBeEnabled();
  });

  it('has a station screens switch, and the button to open the screen appears once it is on', () => {
    const onOpenStation = jest.fn();
    open({ settings: settings(), onOpenStation, screensStatus: 'online' });
    expect(screen.queryByRole('button', { name: /Open the station screen/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Also show tickets on station screens/ }));
    fireEvent.click(screen.getByRole('button', { name: /Open the station screen/ }));
    expect(onOpenStation).toHaveBeenCalled();
  });

  it('saves the station screens choice with the other settings', () => {
    const { onSave } = open({ settings: settings(), screensStatus: 'online' });
    fireEvent.click(screen.getByRole('switch', { name: /Also show tickets on station screens/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][0].screens).toBe(true);
  });

  it('explains, and does not allow the switch, when the server cannot do station screens yet', () => {
    open({ settings: settings({ screens: true }), screensStatus: 'unavailable' });
    expect(screen.getByRole('switch', { name: /Also show tickets on station screens/ })).toBeDisabled();
    expect(screen.getByText(/cannot show tickets on station screens yet/)).toBeInTheDocument();
  });

  it('offers a default station for categories that have none, naming the stations', () => {
    open({ settings: settings() });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Items whose category has no station/ }));
    expect(screen.getByRole('option', { name: 'Do not send them' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Send to Bar' })).toBeInTheDocument();
  });
});

describe('KitchenTicketDialog', () => {
  const cart = [
    line('P', 'Pilau', 'Food', 2, { note: 'no pilipili' }),
    line('T', 'Tusker', 'Beer', 3),
    line('C', 'Cigarettes', 'Tobacco', 1),
  ];
  const plan = planSend(cart, EMPTY_KITCHEN, settings());
  const now = new Date(2026, 9, 10, 19, 42);
  const tickets = buildTickets(plan, { label: 'Table 4', waiter: 'Amina', number: 14, round: 2, now });

  const review = (props = {}) => {
    const onSend = jest.fn();
    render(<KitchenTicketDialog open mode="review" plan={plan} tickets={[]} initialLabel="Table 4" printNow onSend={onSend} onClose={jest.fn()} {...props} />);
    return { onSend };
  };

  it('shows what each station will get, with the notes', () => {
    review();
    expect(screen.getByText('2 x Pilau')).toBeInTheDocument();
    expect(screen.getByText('no pilipili')).toBeInTheDocument();
    expect(screen.getByText('3 x Tusker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send to 2 stations' })).toBeInTheDocument();
  });

  it('warns about items that have no station, and says they will not be sent', () => {
    review();
    expect(screen.getByText(/No station is set for: Cigarettes \(Tobacco\)\. They will not be sent/)).toBeInTheDocument();
  });

  it('sends with the table name that was typed', () => {
    const { onSend } = review();
    const box = screen.getByLabelText('Table or tab name');
    expect(box).toHaveValue('Table 4');
    fireEvent.change(box, { target: { value: 'Patio 2' } });
    fireEvent.submit(box.closest('form'));
    expect(onSend).toHaveBeenCalledWith('Patio 2', 'table');
  });

  it('lets the waiter say it is a counter order, and then the ticket number is what counts', () => {
    const { onSend } = review({ initialLabel: '' });
    expect(screen.getByRole('button', { name: 'Table service' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Counter order' }));
    expect(screen.getByLabelText('Name for this order (optional)')).toBeInTheDocument();
    expect(screen.getByText(/Do not put customer names here/)).toBeInTheDocument();
    fireEvent.submit(screen.getByLabelText('Name for this order (optional)').closest('form'));
    expect(onSend).toHaveBeenCalledWith('', 'counter');
  });

  it('starts from the order type the bill already has', () => {
    review({ initialOrderType: 'counter' });
    expect(screen.getByRole('button', { name: 'Counter order' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a waiting message while the stations receive the order, and cannot be closed by accident', () => {
    const onClose = jest.fn();
    render(<KitchenTicketDialog open mode="sending" plan={plan} tickets={[]} onSend={jest.fn()} onClose={onClose} />);
    expect(screen.getByText('Sending to the stations')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('when the stations did not get it, says nothing was marked as sent and offers three ways on', () => {
    const onRetry = jest.fn();
    const onPrintOnly = jest.fn();
    const onClose = jest.fn();
    render(<KitchenTicketDialog open mode="failed" plan={plan} tickets={[]} error="No internet connection." onSend={jest.fn()} onRetry={onRetry} onPrintOnly={onPrintOnly} onClose={onClose} />);
    expect(screen.getByText('No internet connection.')).toBeInTheDocument();
    expect(screen.getByText(/Nothing has been marked as sent/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect([onRetry, onPrintOnly, onClose].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });

  describe('after sending', () => {
    let printSpy;
    beforeEach(() => {
      jest.useFakeTimers();
      printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.useRealTimers();
      printSpy.mockRestore();
    });

    const sent = (props = {}) => render(<KitchenTicketDialog open mode="sent" plan={plan} tickets={tickets} printNow onSend={jest.fn()} onClose={jest.fn()} {...props} />);

    it('shows each ticket as it will print: station, number, table, who, round, items and notes', () => {
      sent();
      const kitchen = within(screen.getByTestId('ticket-Kitchen'));
      expect(kitchen.getByText('Kitchen')).toBeInTheDocument();
      expect(kitchen.getByText('#14')).toBeInTheDocument();
      expect(kitchen.getByText('Table 4')).toBeInTheDocument();
      expect(kitchen.getByText(/19:42\s+Amina\s+Round 2/)).toBeInTheDocument();
      expect(kitchen.getByText('2 x Pilau')).toBeInTheDocument();
      expect(kitchen.getByText('- no pilipili')).toBeInTheDocument();
      expect(within(screen.getByTestId('ticket-Bar')).getByText('3 x Tusker')).toBeInTheDocument();
    });

    it('says the order went to the station screens when it did', () => {
      sent({ toScreens: true });
      expect(screen.getByText('Sent to the station screens')).toBeInTheDocument();
    });

    it('prints by itself, once, when the till is set to', () => {
      const { rerender } = sent();
      act(() => { jest.advanceTimersByTime(400); });
      expect(printSpy).toHaveBeenCalledTimes(1);
      rerender(<KitchenTicketDialog open mode="sent" plan={plan} tickets={tickets} printNow onSend={jest.fn()} onClose={jest.fn()} />);
      act(() => { jest.advanceTimersByTime(400); });
      expect(printSpy).toHaveBeenCalledTimes(1); // not again for the same tickets
    });

    it('does not print by itself when the till is not set to, but can print on request', () => {
      sent({ printNow: false });
      act(() => { jest.advanceTimersByTime(400); });
      expect(printSpy).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Print again' }));
      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    it('has nothing to print when there are no tickets', () => {
      sent({ tickets: [] });
      act(() => { jest.advanceTimersByTime(400); });
      expect(printSpy).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Print again' })).toBeDisabled();
    });
  });
});

describe('TicketSheet', () => {
  const base = { station: 'Kitchen', number: 3, round: 1, label: 'Table 4', waiter: 'Amina', time: '19:42', adds: [], changes: [], voids: [] };

  it('shows a changed note clearly', () => {
    render(<TicketSheet ticket={{ ...base, changes: [{ item_code: 'B', item_name: 'Burger', note: 'well done, no onions', previousNote: 'well done' }] }} />);
    expect(screen.getByText('** CHANGE **')).toBeInTheDocument();
    expect(screen.getByText('- now: well done, no onions')).toBeInTheDocument();
  });

  it('shows cancellations in a box that says not to make them', () => {
    render(<TicketSheet ticket={{ ...base, voids: [{ item_code: 'P', item_name: 'Pilau', qty: 2, note: 'no pilipili' }] }} />);
    expect(screen.getByText('CANCELLED, DO NOT MAKE')).toBeInTheDocument();
    expect(screen.getByText('2 x Pilau (no pilipili)')).toBeInTheDocument();
  });
});

describe('TicketSheet order types', () => {
  const base = { station: 'Bar', number: 7, round: 1, waiter: 'Amina', time: '19:42', adds: [{ item_code: 'T', item_name: 'Tusker', qty: 1, note: '' }], changes: [], voids: [] };

  it('names a counter order by its number, without a customer name', () => {
    render(<TicketSheet ticket={{ ...base, label: '', orderType: 'counter' }} />);
    expect(screen.getByText('Counter order')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('shows the name given to a counter order', () => {
    render(<TicketSheet ticket={{ ...base, label: 'Window', orderType: 'counter' }} />);
    expect(screen.getByText('Counter: Window')).toBeInTheDocument();
  });
});

describe('ReadyTicketsDialog', () => {
  const ready = [
    { id: '11', station: 'Kitchen', number: 5, label: 'Table 4', orderType: 'table', statusAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: '12', station: 'Bar', number: 6, label: '', orderType: 'counter', statusAt: '', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  ];

  it('lists what is ready, and marks one served', () => {
    const onServe = jest.fn();
    render(<ReadyTicketsDialog open tickets={ready} onServe={onServe} onClose={jest.fn()} />);
    expect(screen.getByText('Table 4')).toBeInTheDocument();
    expect(screen.getByText('Counter order')).toBeInTheDocument();
    expect(screen.getByText('Ready 5 minutes ago')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Served Counter order Bar' }));
    expect(onServe).toHaveBeenCalledWith('12');
  });

  it('says so when nothing is waiting', () => {
    render(<ReadyTicketsDialog open tickets={[]} onServe={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText(/Nothing is waiting/)).toBeInTheDocument();
  });
});

describe('kitchen prompts', () => {
  it('asks before charging a bill with items the kitchen does not have, with three clear choices', () => {
    const onSendNow = jest.fn();
    const onChargeAnyway = jest.fn();
    const onClose = jest.fn();
    const plan = planSend([line('P', 'Pilau', 'Food', 1), line('T', 'Tusker', 'Beer', 2)], EMPTY_KITCHEN, settings());
    render(<UnsentItemsDialog open plan={plan} onSendNow={onSendNow} onChargeAnyway={onChargeAnyway} onClose={onClose} />);
    expect(screen.getByText(/2 items on this bill have not been sent/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Charge anyway' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect([onSendNow, onChargeAnyway, onClose].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('offers a cancellation ticket when clearing a bill the kitchen already has', () => {
    const onClear = jest.fn();
    const onClearAndPrint = jest.fn();
    render(<ClearSentSaleDialog open canPrintCancellation onClear={onClear} onClearAndPrint={onClearAndPrint} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear and print cancellation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear sale' }));
    expect(onClearAndPrint).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });

  it('tells the person to tell the kitchen themselves when no ticket can be printed', () => {
    render(<ClearSentSaleDialog open canPrintCancellation={false} onClear={jest.fn()} onClearAndPrint={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /print cancellation/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Tell them yourself/)).toBeInTheDocument();
  });
});
