import { checkSheet, COLUMNS, mapColumns, resolveUnitName, templateCsv } from './importSheet';
import { parseCsv } from '../../../utils/productImport';

const HEAD = ['item_code', 'item_name', 'category', 'unit', 'price', 'cost_price', 'opening_stock', 'store', 'low_stock_level', 'description', 'brand', 'barcode', 'image', 'is_service', 'vat_class'];
const UNITS = [{ name: 'Nos' }, { name: 'Kg' }, { name: 'Box' }, { name: 'Ltr' }];

describe('the columns', () => {
  test('headings are matched however they are written, and the old names still work', () => {
    const { columns, unknown } = mapColumns(['Item Code', 'NAME', 'Item Group', 'UOM', 'Standard Rate', 'Cost', 'Qty', 'Warehouse', 'Reorder level', 'Photo', 'Service', 'Tax class', 'Colour']);
    expect(columns).toMatchObject({ item_code: 0, item_name: 1, category: 2, unit: 3, price: 4, cost_price: 5, opening_stock: 6, store: 7, low_stock_level: 8, image: 9, is_service: 10, vat_class: 11 });
    expect(unknown).toEqual(['Colour']);
  });

  test('the template has every column once and parses back to the same headings', () => {
    const { rows } = parseCsv(templateCsv());
    expect(rows[0]).toEqual(COLUMNS.map((c) => c.field));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveLength(rows[0].length);
    expect(templateCsv()).not.toContain('\u2014');
  });

  test('the template passes its own check', () => {
    const check = checkSheet(parseCsv(templateCsv()).rows, { shopUnits: UNITS });
    expect(check.fileProblems).toEqual([]);
    expect(check.invalid).toEqual([]);
    expect(check.rows).toHaveLength(2);
  });
});

describe('units in plain words', () => {
  test('the stored name, the plain words and short forms all give the stored name', () => {
    ['Kg', 'kg', ' KG ', 'kilogram', 'Kilograms', 'kgs'].forEach((text) => expect(resolveUnitName(text, UNITS)).toBe('Kg'));
    ['piece', 'Pieces', 'pcs', 'nos'].forEach((text) => expect(resolveUnitName(text, UNITS)).toBe('Nos'));
    expect(resolveUnitName('litres', UNITS)).toBe('Ltr');
    expect(resolveUnitName('boxes', UNITS)).toBe('Box');
  });

  test('a unit the shop does not have is not guessed', () => {
    expect(resolveUnitName('barrel', UNITS)).toBeNull();
    expect(resolveUnitName('gram', UNITS)).toBeNull();
    expect(resolveUnitName('', UNITS)).toBeNull();
    expect(resolveUnitName('kg', [])).toBeNull();
  });

  test('a plain list of names works too', () => {
    expect(resolveUnitName('kilograms', ['Kg'])).toBe('Kg');
  });
});

describe('checkSheet', () => {
  const sheet = (...rows) => [HEAD, ...rows];
  const row = (more = {}) => {
    const base = { item_code: 'A1', item_name: 'Soap' };
    return HEAD.map((h) => ({ ...base, ...more })[h] || '');
  };

  test('a good row becomes the values the server takes', () => {
    const check = checkSheet(sheet(row({ price: 'KES 1,200', cost_price: '800', opening_stock: '12', unit: 'kilograms', category: ' Drinks ', is_service: 'No' })), { shopUnits: UNITS });
    expect(check.invalid).toEqual([]);
    expect(check.rows[0]).toEqual({
      rowNumber: 2,
      payload: { row_number: 2, item_code: 'A1', item_name: 'Soap', category: 'Drinks', unit: 'Kg', price: '1200', cost_price: '800', opening_stock: '12', is_service: 'no' },
    });
  });

  test('a unit that is not known is sent as written so the server can say so', () => {
    expect(checkSheet(sheet(row({ unit: 'barrel' })), { shopUnits: UNITS }).rows[0].payload.unit).toBe('barrel');
  });

  test('blank cells are not sent', () => {
    expect(Object.keys(checkSheet(sheet(row())).rows[0].payload).sort()).toEqual(['item_code', 'item_name', 'row_number']);
  });

  test('each problem is named in plain words', () => {
    const check = checkSheet(sheet(row({ item_code: '', item_name: '', description: 'x' }), row({ price: 'abc' }), row({ item_code: 'A2', cost_price: '-5', is_service: 'maybe' })));
    expect(check.invalid.map((r) => r.problems)).toEqual([
      ['The product code is empty.', 'The product name is empty.'],
      ['The price "abc" is not a number.'],
      ['The cost price cannot be negative.', 'The service column must be yes or no (found "maybe").'],
    ]);
  });

  test('the 140 character limits', () => {
    const check = checkSheet(sheet(row({ item_code: 'x'.repeat(141), item_name: 'n'.repeat(141) })));
    expect(check.invalid[0].problems).toEqual(['The product code is longer than 140 characters.', 'The product name is longer than 140 characters.']);
  });

  test('a code used twice, ignoring capitals, is refused the second time', () => {
    const check = checkSheet(sheet(row(), row({ item_code: 'a1' })));
    expect(check.rows).toHaveLength(1);
    expect(check.invalid[0].problems[0]).toBe('The product code a1 was already used on row 2.');
  });

  test('a comma that was not in quotation marks is caught by the extra cells', () => {
    const csv = `${HEAD.join(',')}\r\nB1,Burger, Cheese,Food\r\n`;
    // The name is cut at the comma; the row is shorter than the headings so it still reads, but a row with too many cells is flagged
    expect(checkSheet(parseCsv(csv).rows).invalid).toEqual([]);
    const wide = `item_code,item_name\r\nB1,Burger, Cheese\r\n`;
    expect(checkSheet(parseCsv(wide).rows).invalid[0].problems[0]).toMatch(/more columns than the headings/);
    const quoted = `item_code,item_name\r\nB1,"Burger, Cheese"\r\n`;
    expect(checkSheet(parseCsv(quoted).rows).rows[0].payload.item_name).toBe('Burger, Cheese');
  });

  test('the earlier is_stock_item column turns into is_service', () => {
    const csv = 'item_code,item_name,is_stock_item\r\nS1,Haircut,0\r\nS2,Soap,1\r\n';
    const check = checkSheet(parseCsv(csv).rows);
    expect(check.rows[0].payload.is_service).toBe('yes');
    expect(check.rows[1].payload.is_service).toBeUndefined();
    expect(check.unknownColumns).toEqual([]);
  });

  test('problems with the file as a whole', () => {
    expect(checkSheet([]).fileProblems[0]).toMatch(/file is empty/);
    expect(checkSheet([['colour', 'size'], ['a', 'b']]).fileProblems[0]).toMatch(/"item_code" and "item_name"/);
    expect(checkSheet([['item_code', 'item_name']]).fileProblems[0]).toMatch(/no products under them/);
    const many = [['item_code', 'item_name'], ...Array.from({ length: 2001 }, (_, i) => [`C${i}`, 'x'])];
    expect(checkSheet(many).fileProblems[0]).toMatch(/2001 products.*2000 or fewer/);
  });

  test('unknown columns are listed, blank lines are skipped, row numbers are the file lines', () => {
    const check = checkSheet([['item_code', 'item_name', 'colour'], ['A', 'a', 'red'], ['', '', ''], ['B', 'b', '']]);
    expect(check.unknownColumns).toEqual(['colour']);
    expect(check.rows.map((r) => r.rowNumber)).toEqual([2, 4]);
  });
});
