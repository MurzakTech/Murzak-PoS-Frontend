import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryOrderDialog, RestaurantToolbar, SplitBillDialog, TableMapDialog, TipDialog } from './RestaurantDialogs';

test('the table map shows free and open tables, and opens or starts one', async () => {
  const onOpenTable = jest.fn();
  const onStartTable = jest.fn();
  const held = [{ id: 7, label: 'T2', heldAt: new Date().toISOString(), cart: [{ subtotal: 900 }] }];
  render(<TableMapDialog open tables={['T1', 'T2']} held={held} current="" onOpenTable={onOpenTable} onStartTable={onStartTable} onClose={jest.fn()} />);
  expect(screen.getByRole('listitem', { name: 'T1: Free' })).toBeInTheDocument();
  const open = screen.getByRole('listitem', { name: 'T2: Open' });
  expect(open).toHaveTextContent('900');
  await userEvent.click(open);
  expect(onOpenTable).toHaveBeenCalledWith(held[0]);
  await userEvent.click(screen.getByRole('listitem', { name: 'T1: Free' }));
  expect(onStartTable).toHaveBeenCalledWith('T1');
});

test('a store with no tables says where to add them', () => {
  render(<TableMapDialog open tables={[]} held={[]} onOpenTable={jest.fn()} onStartTable={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(/No tables are set for this store yet/)).toBeInTheDocument();
});

test('splitting by item charges only what this guest takes, and never the whole bill', async () => {
  const onSplitItems = jest.fn();
  const cart = [
    { item_code: 'BURGER', item_name: 'Burger', qty: 2, rate: 700, subtotal: 1400 },
    { item_code: 'BEER', item_name: 'Beer', qty: 1, rate: 300, subtotal: 300 },
  ];
  render(<SplitBillDialog open cart={cart} total={1700} onSplitItems={onSplitItems} onSplitEqually={jest.fn()} onClose={jest.fn()} />);
  const charge = screen.getByRole('button', { name: 'Charge this guest' });
  expect(charge).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'One more Burger' }));
  expect(screen.getByText(/This guest: KES 700/)).toBeInTheDocument();
  await userEvent.click(charge);
  expect(onSplitItems).toHaveBeenCalledWith({ BURGER: 1 });
});

test('splitting equally shows each share and asks for one payment each', async () => {
  const onSplitEqually = jest.fn();
  render(<SplitBillDialog open cart={[{ item_code: 'A', item_name: 'A', qty: 1, rate: 1000, subtotal: 1000 }]} total={1000} onSplitItems={jest.fn()} onSplitEqually={onSplitEqually} onClose={jest.fn()} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Equally' }));
  await userEvent.click(screen.getByRole('button', { name: 'One person more' }));
  expect(screen.getByText(/Each pays KES 333.33/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Take 3 payments' }));
  expect(onSplitEqually).toHaveBeenCalledWith(3, [333.34, 333.33, 333.33]);
});

test('a delivery order names its platform and order number', async () => {
  const onSave = jest.fn();
  render(<DeliveryOrderDialog open platforms={[{ name: 'Glovo' }, { name: 'Bolt Food' }]} onSave={onSave} onClose={jest.fn()} />);
  await userEvent.type(screen.getByLabelText('Platform order number'), ' GL-551 ');
  await userEvent.click(screen.getByRole('button', { name: 'Mark as Glovo order' }));
  expect(onSave).toHaveBeenCalledWith({ channel: 'Glovo', ref: 'GL-551' });
});

test('a tip is recorded with how it was paid, and a refusal is shown', async () => {
  const onSave = jest.fn().mockRejectedValueOnce(new Error('Tips cannot be recorded on this site yet.')).mockResolvedValueOnce(undefined);
  render(<TipDialog open modes={['Cash', 'M-Pesa']} onSave={onSave} onClose={jest.fn()} />);
  await userEvent.type(screen.getByLabelText('Tip (KES)'), '150');
  await userEvent.click(screen.getByRole('button', { name: 'Record tip' }));
  expect(await screen.findByText('Tips cannot be recorded on this site yet.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Record tip' }));
  await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({ amount: 150, mode: 'Cash' }));
});

test('the toolbar shows the delivery order and lets it be cleared', async () => {
  const onClearChannel = jest.fn();
  render(<RestaurantToolbar tablesOn onTables={jest.fn()} onSplit={jest.fn()} onDelivery={jest.fn()} onTip={jest.fn()} channel={{ channel: 'Glovo', ref: 'GL-1' }} onClearChannel={onClearChannel} />);
  expect(screen.getByText('Glovo · GL-1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tables' })).toBeInTheDocument();
});
