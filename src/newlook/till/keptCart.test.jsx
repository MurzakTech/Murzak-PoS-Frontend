/**
 * Phase 3 (P3-4, P3-5): the cart kept across a refresh, the Leave-the-till dialog, the selling locations rule and the
 * over-stock note on a cart line. Acceptance checks AC-21 and AC-22.
 */
import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaveTillDialog from './LeaveTillDialog';
import { KEPT_CART_MAX_AGE_MS, clearKept, keptCartKey, loadKept, pickKept, saveKept } from './cartStore';
import useKeptCart from './useKeptCart';
import { isSellingLocation, sellingLocations, showsWarehouseMenu } from './sellingLocations';
import { stockNote } from './stockNote';

const line = (code, qty = 1) => ({ item_code: code, item_name: code, qty, rate: 100, subtotal: 100 * qty });
const sale = (cart) => ({ cart, customer: 'Walk-in Customer', customerId: null, selectedCustomerObj: null, customerPriceList: 'Standard Selling', manualDiscountType: 'percentage', manualDiscountValue: 0, activeHeldLabel: '', kitchen: null });

beforeEach(() => localStorage.clear());

describe('the kept cart (AC-21: add items and refresh, the cart returns)', () => {
  const key = keptCartKey('Demo Shop', 'amina@demo.test');

  test('keeps the sale and gives it back, with the customer and the discount', () => {
    saveKept(key, { ...sale([line('A', 2), line('B')]), customer: 'Wanjiru', customerId: 'CUST-4', manualDiscountType: 'amount', manualDiscountValue: 50, activeHeldLabel: 'Table 4' });
    const back = loadKept(key);
    expect(back.cart).toHaveLength(2);
    expect(back).toMatchObject({ customer: 'Wanjiru', customerId: 'CUST-4', manualDiscountType: 'amount', manualDiscountValue: 50, activeHeldLabel: 'Table 4' });
  });

  test('an empty cart keeps nothing and removes what was kept', () => {
    saveKept(key, sale([line('A')]));
    expect(loadKept(key)).not.toBeNull();
    saveKept(key, sale([]));
    expect(loadKept(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  test('belongs to one person in one business', () => {
    saveKept(key, sale([line('A')]));
    expect(loadKept(keptCartKey('Demo Shop', 'someone.else@demo.test'))).toBeNull();
    expect(loadKept(keptCartKey('Other Shop', 'amina@demo.test'))).toBeNull();
  });

  test('is dropped after a day, so an old cart never turns up', () => {
    const now = Date.now();
    saveKept(key, sale([line('A')]), now);
    expect(loadKept(key, now + KEPT_CART_MAX_AGE_MS - 1000)).not.toBeNull();
    expect(loadKept(key, now + KEPT_CART_MAX_AGE_MS + 1000)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  test('survives bad data and blocked storage without breaking the till', () => {
    localStorage.setItem(key, '{not json');
    expect(loadKept(key)).toBeNull();
    localStorage.setItem(key, JSON.stringify({ version: 99, savedAt: Date.now(), sale: sale([line('A')]) }));
    expect(loadKept(key)).toBeNull();
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => saveKept(key, sale([line('A')]))).not.toThrow();
    spy.mockRestore();
    expect(() => clearKept(key)).not.toThrow();
  });

  test('keeps only the parts of a sale that belong to it', () => {
    expect(Object.keys(pickKept({ cart: [], password: 'x', secret: 1 })).sort()).toEqual(['activeHeldLabel', 'cart', 'customer', 'customerId', 'customerPriceList', 'kitchen', 'manualDiscountType', 'manualDiscountValue', 'selectedCustomerObj']);
  });
});

describe('useKeptCart', () => {
  const props = (over = {}) => ({ enabled: true, company: 'Demo Shop', user: 'amina@demo.test', sale: sale([]), onRestore: jest.fn(), ...over });
  const key = keptCartKey('Demo Shop', 'amina@demo.test');

  test('does nothing while the New look is off', () => {
    saveKept(key, sale([line('A')]));
    const p = props({ enabled: false });
    const { rerender } = renderHook((x) => useKeptCart(x), { initialProps: p });
    rerender({ ...p, sale: sale([line('B')]) });
    expect(p.onRestore).not.toHaveBeenCalled();
    expect(loadKept(key).cart[0].item_code).toBe('A'); // untouched
  });

  test('restores a kept sale once when the till opens with an empty cart, and does not erase it first', () => {
    saveKept(key, sale([line('A', 3)]));
    const p = props();
    const { rerender } = renderHook((x) => useKeptCart(x), { initialProps: p });
    expect(p.onRestore).toHaveBeenCalledTimes(1);
    expect(p.onRestore.mock.calls[0][0].cart[0]).toMatchObject({ item_code: 'A', qty: 3 });
    expect(loadKept(key)).not.toBeNull(); // the empty cart was not written over it
    rerender({ ...p, sale: sale([line('A', 3)]) }); // the parent applied it
    expect(p.onRestore).toHaveBeenCalledTimes(1);
    expect(loadKept(key).cart[0].qty).toBe(3);
  });

  test('saves every change, and clears when the sale is finished', () => {
    const p = props();
    const { rerender, result } = renderHook((x) => useKeptCart(x), { initialProps: p });
    rerender({ ...p, sale: sale([line('A')]) });
    expect(loadKept(key).cart).toHaveLength(1);
    rerender({ ...p, sale: sale([line('A'), line('B')]) });
    expect(loadKept(key).cart).toHaveLength(2);
    rerender({ ...p, sale: sale([]) });
    expect(loadKept(key)).toBeNull();
    saveKept(key, sale([line('C')]));
    result.current.clear();
    expect(loadKept(key)).toBeNull();
  });

  test('does not restore over a cart that already has items (a held sale was brought back first)', () => {
    saveKept(key, sale([line('A')]));
    const p = props({ sale: sale([line('Z')]) });
    renderHook((x) => useKeptCart(x), { initialProps: p });
    expect(p.onRestore).not.toHaveBeenCalled();
  });

  test('waits for a signed-in person before doing anything', () => {
    saveKept(key, sale([line('A')]));
    const p = props({ user: '' });
    renderHook((x) => useKeptCart(x), { initialProps: p });
    expect(p.onRestore).not.toHaveBeenCalled();
  });
});

describe('Leave the till (AC-21)', () => {
  const show = (over = {}) => {
    const handlers = { onStay: jest.fn(), onHoldAndLeave: jest.fn(), onLeaveAndClear: jest.fn() };
    render(<LeaveTillDialog open itemCount={3} {...handlers} {...over} />);
    return handlers;
  };

  test('offers Hold sale and leave, Leave and clear, and Stay, and says how many items are in the sale', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Leave the till?' })).toBeInTheDocument();
    ['Hold sale and leave', 'Leave and clear', 'Stay'].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
    expect(screen.getByText(/3 items/)).toBeInTheDocument();
  });

  test('the first focus lands on Stay, so a stray Enter loses nothing', () => {
    const { onStay, onHoldAndLeave, onLeaveAndClear } = show();
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus();
    userEvent.keyboard('{Enter}');
    expect(onStay).toHaveBeenCalled();
    expect(onHoldAndLeave).not.toHaveBeenCalled();
    expect(onLeaveAndClear).not.toHaveBeenCalled();
  });

  test('each button does its own thing, and Escape means Stay', () => {
    const h = show();
    userEvent.click(screen.getByRole('button', { name: 'Hold sale and leave' }));
    expect(h.onHoldAndLeave).toHaveBeenCalledTimes(1);
    userEvent.click(screen.getByRole('button', { name: 'Leave and clear' }));
    expect(h.onLeaveAndClear).toHaveBeenCalledTimes(1);
    userEvent.keyboard('{Escape}');
    expect(h.onStay).toHaveBeenCalled();
  });

  test('while the sale is being held the buttons wait, and a failure says so in words', () => {
    const h = show({ busy: true });
    expect(screen.getByRole('button', { name: 'Leave and clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
    userEvent.keyboard('{Escape}');
    expect(h.onStay).not.toHaveBeenCalled();
  });

  test('shows why holding failed, as an alert, with the sale still safe', () => {
    show({ error: 'The sale could not be put on hold, so it is still here. Finish it or try again.' });
    expect(screen.getByRole('alert')).toHaveTextContent('still here');
  });
});

describe('selling locations (AC-22: the menu appears only with two or more)', () => {
  const real = (name) => ({ name: `${name} - DS`, warehouse_name: name });

  test('the leftover ERPNext warehouses do not count as places to sell from', () => {
    const list = [real('Stores'), real('Work In Progress'), real('Finished Goods'), real('Goods In Transit'), { name: 'All Warehouses - DS', is_group: 1 }];
    expect(sellingLocations(list).map((w) => w.warehouse_name)).toEqual(['Stores']);
    expect(showsWarehouseMenu(list)).toBe(false);
  });

  test('a second real location turns the menu on', () => {
    expect(showsWarehouseMenu([real('Main shop'), real('Branch')])).toBe(true);
    expect(showsWarehouseMenu([real('Main shop'), real('Work In Progress')])).toBe(false);
  });

  test('disabled locations and folders are left out, and bad input is safe', () => {
    expect(isSellingLocation({ name: 'X', disabled: 1 })).toBe(false);
    expect(isSellingLocation({ name: 'X', is_group: true })).toBe(false);
    expect(isSellingLocation(null)).toBe(false);
    expect(sellingLocations(undefined)).toEqual([]);
  });
});

describe('the over-stock note on a cart line (AC-22: "Only 13 left")', () => {
  test('says how many are left, in words', () => {
    expect(stockNote(20, 13)).toBe('Only 13 left');
    expect(stockNote(2, 1)).toBe('Only 1 left');
    expect(stockNote(5, 2.5)).toBe('Only 2.5 left');
  });

  test('says none when there is none, and says nothing when the quantity is covered or stock is unknown', () => {
    expect(stockNote(1, 0)).toBe('None left in stock');
    expect(stockNote(1, -3)).toBe('None left in stock');
    expect(stockNote(13, 13)).toBeNull();
    expect(stockNote(3, 13)).toBeNull();
    expect(stockNote(3, null)).toBeNull();
    expect(stockNote(3, undefined)).toBeNull();
    expect(stockNote(3, 'x')).toBeNull();
  });
});
