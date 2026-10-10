import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HeldSalesDialog from './HeldSalesDialog';
import HoldSaleDialog from './HoldSaleDialog';

const NOW = new Date('2026-10-10T12:00:00.000Z');
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60000).toISOString();

const held = [
  { id: 1, heldAt: minutesAgo(135), label: 'Table 4', customer: 'Walk-in Customer', cart: [{ subtotal: 1200 }, { subtotal: 300 }] },
  { id: 2, heldAt: minutesAgo(14 * 60), label: '', customer: 'Amina', cart: [{ subtotal: 80 }] },
  { id: 3, heldAt: minutesAgo(5), label: 'Bar', customer: 'John', cart: [{ subtotal: 50 }] },
];

const renderDialog = (props = {}) => {
  const handlers = { onClose: jest.fn(), onRecall: jest.fn(), onDelete: jest.fn(), onRename: jest.fn() };
  render(<HeldSalesDialog open held={held} canRecall currency="KES" now={NOW} {...handlers} {...props} />);
  return handlers;
};

describe('HeldSalesDialog', () => {
  it('shows each bill by name, with its items, total and how long it has been open', () => {
    renderDialog();
    expect(screen.getByText('Table 4')).toBeInTheDocument();
    expect(screen.getByText(/2 items · .*1,500/)).toBeInTheDocument();
    expect(screen.getByText('Held 2 h 15 min ago')).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument(); // unnamed: the customer is the title
    expect(screen.getByText(/John · 1 item/)).toBeInTheDocument(); // named: the customer moves to the detail line
  });

  it('flags a bill that has been open a long time, and only that one', () => {
    renderDialog();
    expect(screen.getAllByText('Open a long time')).toHaveLength(1);
    expect(screen.getByText(/Held 14 h ago/)).toBeInTheDocument();
  });

  it('is honest that held sales live on this device only', () => {
    renderDialog();
    expect(screen.getByText(/kept on this device only/)).toBeInTheDocument();
  });

  it('brings a bill back, or refuses while another sale is on screen', () => {
    const h = renderDialog();
    fireEvent.click(screen.getAllByRole('button', { name: 'Bring back' })[0]);
    expect(h.onRecall).toHaveBeenCalledWith(1);
  });

  it('cannot bring a bill back while the till is busy, and says why', () => {
    renderDialog({ canRecall: false });
    screen.getAllByRole('button', { name: 'Bring back' }).forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByText(/Finish or hold the current sale/)).toBeInTheDocument();
  });

  it('asks before throwing a bill away, naming it and its total', async () => {
    const h = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Discard Table 4' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Discard this held sale?')).toBeInTheDocument();
    expect(screen.getByText(/"Table 4" \(.*1,500.*\) will be thrown away/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Discard this held sale?')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Discard Table 4' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Discard this held sale?' })).getByRole('button', { name: 'Discard' }));
    expect(h.onDelete).toHaveBeenCalledWith(1);
  });

  it('renames a bill, starting from its current name', () => {
    const h = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Table 4' }));
    const box = screen.getByLabelText(/Table or tab name/);
    expect(box).toHaveValue('Table 4');
    fireEvent.change(box, { target: { value: '  Patio 2 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(h.onRename).toHaveBeenCalledWith(1, '  Patio 2 '); // tidied by the store logic, tested separately
  });

  it('warns when a new name is already used by another bill, but not for its own name', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Table 4' }));
    const box = screen.getByLabelText(/Table or tab name/);
    expect(screen.queryByText(/already has this name/)).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'bar' } });
    expect(screen.getByText(/Another held sale already has this name/)).toBeInTheDocument();
  });

  it('says so when nothing is on hold', () => {
    renderDialog({ held: [] });
    expect(screen.getByText('No sales are on hold.')).toBeInTheDocument();
  });
});

describe('HeldSalesDialog with the server holding the bills', () => {
  const shared = [
    { id: 'a1', heldAt: minutesAgo(10), label: 'Table 4', customer: 'Walk-in Customer', cart: [{ subtotal: 400 }], heldBy: 'Amina', where: 'server' },
    { id: 'b2', heldAt: minutesAgo(3), label: 'Patio', customer: 'Walk-in Customer', cart: [{ subtotal: 90 }], where: 'device' },
  ];

  it('says the bills are shared, and shows who held each one', () => {
    renderDialog({ held: shared, status: 'online' });
    expect(screen.getByText('Held sales are shared with every till and phone in this store.')).toBeInTheDocument();
    expect(screen.getByText(/1 item · .*400 · by Amina/)).toBeInTheDocument();
    expect(screen.queryByText(/kept on this device only/)).not.toBeInTheDocument();
  });

  it('marks only the bills that have not reached the server yet', () => {
    renderDialog({ held: shared, status: 'online' });
    expect(screen.getAllByText('This device only')).toHaveLength(1);
  });

  it('explains that bills held while the server cannot be reached stay on this device for now', () => {
    renderDialog({ held: shared, status: 'offline' });
    expect(screen.getByText(/server cannot be reached right now/)).toBeInTheDocument();
    expect(screen.getAllByText('This device only')).toHaveLength(1);
  });

  it('does not mark anything as device-only when the server does not store held sales', () => {
    renderDialog({ held: shared, status: 'unavailable' });
    expect(screen.queryByText('This device only')).not.toBeInTheDocument();
    expect(screen.getByText(/kept on this device only/)).toBeInTheDocument();
  });
});

describe('HoldSaleDialog', () => {
  const open = (props = {}) => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<HoldSaleDialog open onConfirm={onConfirm} onClose={onClose} {...props} />);
    return { onConfirm, onClose };
  };

  it('holds with the name that was typed, when Enter is pressed', () => {
    const { onConfirm } = open();
    const box = screen.getByLabelText(/Table or tab name/);
    fireEvent.change(box, { target: { value: 'Table 7' } });
    fireEvent.submit(box.closest('form'));
    expect(onConfirm).toHaveBeenCalledWith('Table 7');
  });

  it('allows holding without a name', () => {
    const { onConfirm } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Hold sale' }));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('starts with the name of a bill that was brought back, so holding it again keeps its name', () => {
    open({ initialLabel: 'Table 4' });
    expect(screen.getByLabelText(/Table or tab name/)).toHaveValue('Table 4');
  });

  it('limits how long a name can be', () => {
    open();
    expect(screen.getByLabelText(/Table or tab name/)).toHaveAttribute('maxlength', '40');
  });

  it('can be cancelled', () => {
    const { onClose, onConfirm } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
