import { parseCsv } from './productImport';
import {
  buildStarterItems,
  checkStarterSelection,
  buildSeedPayload,
  starterTemplateCsv,
  applySheetToItems,
  jsonToSheet,
} from './starterProducts';

const seed = [
  { sku: 'REST-001', name: 'Veg Burger', status: 'available' },
  { sku: 'REST-002', name: 'Chicken Burger', status: 'available' },
  { sku: 'REST-003', name: 'Tusker Lager', status: 'available' },
];
const items = () => buildStarterItems(seed);
const sheet = (csv) => parseCsv(csv).rows;

describe('buildStarterItems', () => {
  it('makes rows with nothing filled in, instead of a price of 0', () => {
    expect(items()[0]).toEqual({ item_code: 'REST-001', item_name: 'Veg Burger', item_group: '', uom: 'Nos', item_price: null, buying_price: null, qty: null });
  });

  it('skips entries without a code or name and copes with a missing list', () => {
    expect(buildStarterItems([{ sku: '', name: 'x' }, { sku: 'A', name: '' }, null])).toEqual([]);
    expect(buildStarterItems(undefined)).toEqual([]);
  });
});

describe('checkStarterSelection', () => {
  const withPrice = (price, extra = {}) => items().map((i, n) => (n === 0 ? { ...i, item_price: price, ...extra } : i));
  const first = new Set(['REST-001']);

  it('accepts a product with a real selling price', () => {
    const r = checkStarterSelection(withPrice(350), first, null);
    expect(r.problems).toEqual([]);
    expect(r.valid).toHaveLength(1);
  });

  it('refuses a missing price and a price of 0, which the old page let through', () => {
    expect(checkStarterSelection(withPrice(null), first, null).problems[0].message).toBe('Enter a selling price.');
    expect(checkStarterSelection(withPrice(0), first, null).problems[0].message).toContain('is 0');
    expect(checkStarterSelection(withPrice(-5), first, null).problems[0].message).toContain('cannot be negative');
  });

  it('only looks at ticked products', () => {
    const r = checkStarterSelection(items(), first, null);
    expect(r.problems.map((p) => p.item_code)).toEqual(['REST-001']);
  });

  it('needs a store before stock quantities can be recorded', () => {
    const list = withPrice(100, { qty: 12 });
    expect(checkStarterSelection(list, first, null).problems[0].message).toContain('Choose a store');
    expect(checkStarterSelection(list, first, 'Main Store').problems).toEqual([]);
  });

  it('does not need a store for a quantity of 0', () => {
    expect(checkStarterSelection(withPrice(100, { qty: 0 }), first, null).problems).toEqual([]);
  });

  it('refuses a fractional or negative quantity and a negative buying price', () => {
    expect(checkStarterSelection(withPrice(100, { qty: 1.5 }), first, 'S').problems[0].message).toContain('whole number');
    expect(checkStarterSelection(withPrice(100, { buying_price: -1 }), first, 'S').problems[0].message).toContain('buying price');
  });
});

describe('buildSeedPayload', () => {
  const list = items().map((i) => ({ ...i, item_price: 100 }));

  it('builds the request, defaulting the category and leaving out what was not filled in', () => {
    const p = buildSeedPayload({ items: [list[0]], priceList: 'Standard Selling', buyingPriceList: 'Standard Buying', warehouse: 'Main Store', company: 'Shop A', industry: 'REST' });
    expect(p).toEqual({
      price_list: 'Standard Selling',
      buying_price_list: 'Standard Buying',
      items: [{ item_code: 'REST-001', item_name: 'Veg Burger', item_price: 100, item_group: 'All Item Groups', uom: 'Nos' }],
      warehouse: 'Main Store',
      company: 'Shop A',
      industry: 'REST',
    });
  });

  it('adds stock, store and valuation cost only for products that have a quantity', () => {
    const p = buildSeedPayload({
      items: [{ ...list[0], item_group: 'Food', buying_price: 40, qty: 10 }, { ...list[1], buying_price: 30 }],
      priceList: 'S', buyingPriceList: 'B', warehouse: 'Main Store',
    });
    expect(p.items[0]).toMatchObject({ item_group: 'Food', buying_price: 40, qty: 10, warehouse: 'Main Store', basic_rate: 40 });
    expect(p.items[1]).toEqual({ item_code: 'REST-002', item_name: 'Chicken Burger', item_price: 100, item_group: 'All Item Groups', uom: 'Nos', buying_price: 30 });
    expect(p).not.toHaveProperty('company');
  });
});

describe('starterTemplateCsv', () => {
  it('lists the products so prices can be typed in Excel, and survives names with commas and quotes', () => {
    const list = [{ ...items()[0], item_name: 'Burger, "Big"', item_price: 350 }];
    const csv = starterTemplateCsv(list);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const rows = parseCsv(csv).rows;
    expect(rows[0]).toEqual(['item_code', 'item_name', 'category', 'selling_price', 'buying_price', 'quantity']);
    expect(rows[1]).toEqual(['REST-001', 'Burger, "Big"', '', '350', '', '']);
  });

  it('can be uploaded straight back without changing anything', () => {
    const r = applySheetToItems(items(), sheet(starterTemplateCsv(items())));
    expect(r.fileProblems).toEqual([]);
    expect(r.problems).toEqual([]);
    expect(r.updated + r.added).toBe(0);
  });
});

describe('applySheetToItems', () => {
  it('fills in prices, stock and categories by item code, and marks the rows it touched', () => {
    const r = applySheetToItems(items(), sheet(
      'item_code,item_name,category,selling_price,buying_price,quantity\r\n' +
      'REST-001,Veg Burger,Food,"1,200",800,12\r\n' +
      'rest-003,Tusker Lager,Beer,250,,\r\n'
    ));
    expect(r.problems).toEqual([]);
    expect(r.updated).toBe(2);
    expect([...r.touched].sort()).toEqual(['REST-001', 'REST-003']);
    expect(r.items[0]).toMatchObject({ item_group: 'Food', item_price: 1200, buying_price: 800, qty: 12 });
    expect(r.items[2]).toMatchObject({ item_code: 'REST-003', item_group: 'Beer', item_price: 250, qty: null });
    expect(r.items[1].item_price).toBeNull(); // not in the file: untouched
  });

  it('understands friendly headings (SKU, Price, Cost, Stock)', () => {
    const r = applySheetToItems(items(), sheet('SKU,Price,Cost,Stock\nREST-002,500,300,5'));
    expect(r.items[1]).toMatchObject({ item_price: 500, buying_price: 300, qty: 5 });
  });

  it('does not change the list when the file cannot be used, and says why', () => {
    const r = applySheetToItems(items(), sheet('name,price\nBurger,5'));
    expect(r.fileProblems[0]).toContain('"item_code"');
    expect(r.items).toEqual(items());
    expect(applySheetToItems(items(), []).fileProblems).toHaveLength(1);
  });

  it('rejects a row with a bad number and leaves that product alone, still applying the good rows', () => {
    const r = applySheetToItems(items(), sheet('item_code,selling_price,quantity\nREST-001,abc,5\nREST-002,200,1.5\nREST-003,300,2'));
    expect(r.problems.map((p) => [p.rowNumber, p.itemCode])).toEqual([[2, 'REST-001'], [3, 'REST-002']]);
    expect(r.problems[0].message).toContain('"abc"');
    expect(r.problems[1].message).toContain('whole number');
    expect(r.items[0].item_price).toBeNull();
    expect(r.items[1].item_price).toBeNull();
    expect(r.items[2]).toMatchObject({ item_price: 300, qty: 2 });
    expect(r.updated).toBe(1);
  });

  it('adds products of your own when the code is new and a name is given', () => {
    const r = applySheetToItems(items(), sheet('item_code,item_name,selling_price\nMY-1,House Special,450\nMY-2,,100'));
    expect(r.added).toBe(1);
    expect(r.items).toHaveLength(4);
    expect(r.items[3]).toMatchObject({ item_code: 'MY-1', item_name: 'House Special', item_price: 450, uom: 'Nos' });
    expect(r.problems[0]).toMatchObject({ rowNumber: 3, itemCode: 'MY-2' });
    expect(r.problems[0].message).toContain('no item_name');
  });

  it('reports a code used twice in the file and an empty code', () => {
    const r = applySheetToItems(items(), sheet('item_code,selling_price\nREST-001,10\nREST-001,20\n,30'));
    expect(r.items[0].item_price).toBe(10);
    expect(r.problems.map((p) => p.message)).toEqual(['This item code appears more than once in the file.', 'Item code is empty.']);
  });

  it('does not count a row that changes nothing as an update', () => {
    const filled = items().map((i) => ({ ...i, item_price: 100 }));
    const r = applySheetToItems(filled, sheet('item_code,selling_price\nREST-001,100'));
    expect(r.updated).toBe(0);
    expect(r.touched.size).toBe(0);
  });

  it('never alters the list it was given', () => {
    const original = items();
    applySheetToItems(original, sheet('item_code,selling_price\nREST-001,99'));
    expect(original[0].item_price).toBeNull();
  });
});

describe('jsonToSheet', () => {
  it('turns the old JSON template layout into rows that go through the same checks', () => {
    const rows = jsonToSheet({ price_list: 'Standard Selling', items: [{ item_code: 'REST-001', item_name: 'Veg Burger', item_price: 9.99, qty: 4 }] });
    const r = applySheetToItems(items(), rows);
    expect(r.items[0]).toMatchObject({ item_price: 9.99, qty: 4 });
  });

  it('returns null for something that is not a list of items', () => {
    expect(jsonToSheet({ hello: 1 })).toBeNull();
    expect(jsonToSheet(null)).toBeNull();
  });
});
