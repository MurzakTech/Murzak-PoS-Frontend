import { canOpenInTill, packageOrderForTill } from './tillModel';

describe('which orders can go to the till', () => {
  test('an order that is still to be handed over can', () => {
    ['New', 'Confirmed', 'Ready'].forEach((status) => expect(canOpenInTill({ status })).toBe(true));
  });
  test('one that is delivered or cancelled cannot', () => {
    ['Delivered', 'Cancelled'].forEach((status) => expect(canOpenInTill({ status })).toBe(false));
    expect(canOpenInTill(null)).toBe(false);
  });
});

describe('the order as the till reads it', () => {
  const row = { name: 'SO-1', paid: 0, status: 'Ready' };
  const order = {
    customer: 'CUST-001',
    customer_name: 'Amina Wanjiru',
    phone: '254712345678',
    lines: [
      { item_code: 'RICE', item_name: 'Rice', qty: 2, rate: 150, amount: 300 },
      { item_code: 'DEL', qty: '1', rate: '200' },
    ],
  };

  test('carries the order, the customer and every line at the price the shopper was charged', () => {
    expect(packageOrderForTill(row, order)).toEqual({
      source: 'online_order',
      order: 'SO-1',
      paid: false,
      customer: 'CUST-001',
      customer_name: 'Amina Wanjiru',
      customer_phone: '254712345678',
      items: [
        { item_code: 'RICE', item_name: 'Rice', qty: 2, rate: 150 },
        { item_code: 'DEL', item_name: 'DEL', qty: 1, rate: 200 },
      ],
    });
  });

  test('remembers an order that is already paid, and copes with a missing customer', () => {
    const paid = packageOrderForTill({ name: 'SO-2', paid: 1 }, { lines: [] });
    expect(paid.paid).toBe(true);
    expect(paid).toMatchObject({ customer: '', customer_name: '', items: [] });
  });
});
