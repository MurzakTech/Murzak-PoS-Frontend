import { stockShortfalls } from './stockNote';

const stocks = { ITEM039: 0, ITEM084: 23, ITEM001: 3 };
const stockOf = (line) => (line.item_code in stocks ? stocks[line.item_code] : null);

describe('stockShortfalls', () => {
  it('names an item with none left, in plain words', () => {
    expect(stockShortfalls([{ item_code: 'ITEM039', item_name: 'Jik Bleach 750ml', qty: 1 }], stockOf)).toEqual([
      'Jik Bleach 750ml is out of stock. Remove it from the bill to continue.',
    ]);
  });

  it('says how many are left when there is some stock but not enough', () => {
    expect(stockShortfalls([{ item_code: 'ITEM001', item_name: 'Sugar', qty: 5 }], stockOf)).toEqual([
      'Only 3 of Sugar left in stock. Lower the quantity to continue.',
    ]);
  });

  it('lets through a covered line, a service, and a line whose stock is not known', () => {
    const cart = [
      { item_code: 'ITEM084', item_name: 'Beef Samosa (Pair)', qty: 1 },
      { item_code: 'DELIVERY', item_name: 'Delivery Fee', qty: 1 },
    ];
    expect(stockShortfalls(cart, stockOf)).toEqual([]);
    expect(stockShortfalls([], stockOf)).toEqual([]);
  });
});
