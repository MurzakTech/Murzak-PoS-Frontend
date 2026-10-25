import {
  MAX_LINE_QTY,
  cartCount,
  cartReducer,
  cartSubtotal,
  cleanSavedLines,
  emptyCart,
  loadCart,
  maxFor,
  orderLines,
  saveCart,
  storageKey,
} from './cart';

const rice = { item_code: 'RICE', item_name: 'Rice', price: 150, unit: 'Kg', category: 'Food', in_stock: true };
const tea = { item_code: 'TEA', item_name: 'Tea', price: 80, in_stock: true, low_stock: 3 };
const add = (state, product, qty) => cartReducer(state, { type: 'add', product, qty });

describe('adding', () => {
  test('puts a product in the basket and adds to it the second time', () => {
    let cart = add(emptyCart(), rice);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ item_code: 'RICE', qty: 1, price: 150 });
    cart = add(cart, rice, 2);
    expect(cart.lines[0].qty).toBe(3);
    expect(cartCount(cart)).toBe(3);
    expect(cartSubtotal(cart)).toBe(450);
  });

  test('a product that is out of stock, or has no code, is not added', () => {
    expect(add(emptyCart(), { ...rice, in_stock: false }).lines).toHaveLength(0);
    expect(add(emptyCart(), { ...rice, item_code: '' }).lines).toHaveLength(0);
    expect(add(emptyCart(), null).lines).toHaveLength(0);
  });

  test('never goes above what is left, or above 99', () => {
    expect(maxFor(tea)).toBe(3);
    expect(maxFor(rice)).toBe(MAX_LINE_QTY);
    let cart = add(emptyCart(), tea, 10);
    expect(cart.lines[0].qty).toBe(3);
    cart = add(cart, tea, 1);
    expect(cart.lines[0].qty).toBe(3);
    cart = add(emptyCart(), rice, 500);
    expect(cart.lines[0].qty).toBe(MAX_LINE_QTY);
  });
});

describe('changing and removing', () => {
  const start = () => add(add(emptyCart(), rice, 2), tea, 1);

  test('sets a quantity, and zero removes the line', () => {
    let cart = cartReducer(start(), { type: 'set', item_code: 'RICE', qty: 5 });
    expect(cart.lines.find((l) => l.item_code === 'RICE').qty).toBe(5);
    cart = cartReducer(cart, { type: 'set', item_code: 'RICE', qty: 0 });
    expect(cart.lines.map((l) => l.item_code)).toEqual(['TEA']);
  });

  test('a quantity is a whole number inside the limits', () => {
    const cart = cartReducer(start(), { type: 'set', item_code: 'RICE', qty: 'abc' });
    expect(cart.lines.find((l) => l.item_code === 'RICE')).toBeUndefined();
    const capped = cartReducer(start(), { type: 'set', item_code: 'TEA', qty: 50 });
    expect(capped.lines.find((l) => l.item_code === 'TEA').qty).toBe(3);
    const fractional = cartReducer(start(), { type: 'set', item_code: 'RICE', qty: 2.9 });
    expect(fractional.lines.find((l) => l.item_code === 'RICE').qty).toBe(2);
  });

  test('removes a line, clears the basket and ignores what it does not know', () => {
    expect(cartReducer(start(), { type: 'remove', item_code: 'TEA' }).lines).toHaveLength(1);
    expect(cartReducer(start(), { type: 'clear' }).lines).toEqual([]);
    const same = start();
    expect(cartReducer(same, { type: 'set', item_code: 'NOPE', qty: 1 })).toBe(same);
    expect(cartReducer(same, { type: 'what' })).toBe(same);
  });
});

describe('what is sent to the server', () => {
  test('only the product and the quantity, never a price', () => {
    const cart = add(add(emptyCart(), rice, 2), tea, 1);
    expect(orderLines(cart)).toEqual([
      { item_code: 'RICE', qty: 2 },
      { item_code: 'TEA', qty: 1 },
    ]);
  });
});

describe('keeping the basket on the phone', () => {
  beforeEach(() => localStorage.clear());

  test('saves and loads it back, one basket per shop', () => {
    saveCart('Duka-ya-Amina', add(emptyCart(), rice, 2));
    expect(storageKey('Duka-ya-Amina')).toBe('murzak_cart:duka-ya-amina');
    expect(loadCart('duka-ya-amina').lines[0]).toMatchObject({ item_code: 'RICE', qty: 2 });
    expect(loadCart('another-shop').lines).toEqual([]);
  });

  test('an empty basket is not kept', () => {
    saveCart('duka', add(emptyCart(), rice));
    saveCart('duka', emptyCart());
    expect(localStorage.getItem(storageKey('duka'))).toBeNull();
  });

  test('damaged or edited storage cannot break the page', () => {
    localStorage.setItem(storageKey('duka'), '{not json');
    expect(loadCart('duka').lines).toEqual([]);
    localStorage.setItem(storageKey('duka'), JSON.stringify({ a: 1 }));
    expect(loadCart('duka').lines).toEqual([]);
  });

  test('every saved line is checked', () => {
    const lines = cleanSavedLines([
      { item_code: 'RICE', item_name: 'Rice', price: 150, qty: 2, max: 99 },
      { item_code: 'RICE', qty: 5 },
      { item_code: '', qty: 1 },
      { item_code: 'BAD', qty: -3 },
      { item_code: 'NAN', qty: 'x' },
      { item_code: 'HUGE', price: 'free', qty: 5000 },
      null,
      'text',
    ]);
    expect(lines.map((l) => l.item_code)).toEqual(['RICE', 'HUGE']);
    expect(lines[1]).toMatchObject({ qty: 99, price: 0 });
    expect(cleanSavedLines('nope')).toEqual([]);
    expect(cleanSavedLines(Array.from({ length: 80 }, (_, i) => ({ item_code: `I${i}`, qty: 1 })))).toHaveLength(50);
  });

  test('works when storage is blocked', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => saveCart('duka', add(emptyCart(), rice))).not.toThrow();
    spy.mockRestore();
    const read = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadCart('duka').lines).toEqual([]);
    read.mockRestore();
  });
});
