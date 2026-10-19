import { changeText, countsOf, filterRows, importCount, needsAttention, previewRows, resultHasTrouble, resultLines, rowsToSend, saveLabel, understoodLines } from './importModel';

const server = (more = {}) => ({
  rows: [
    { row: 3, item_code: 'B', item_name: 'Rice', action: 'update', will: 'Will be updated: price.', understood: { category: 'Food', unit: 'Kg', price: 200, cost_price: null, opening_stock: 10, store: 'Stores - A', is_service: false, vat_class: 'zero_rated', image: { kind: 'link', value: 'https://x.test/a.jpg' } }, changes: [{ field: 'price', from: 150, to: 200 }], problems: [], notes: ['No store'] },
    { row: 5, item_code: 'D', item_name: 'Bad', action: 'invalid', will: 'Left out', understood: {}, changes: [], problems: [{ field: 'unit', message: 'The unit Barrel is not one of this shop\'s units.' }], notes: [] },
  ],
  counts: { total: 2, create: 0, update: 1, unchanged: 0, invalid: 1 },
  ...more,
});
const browser = { invalid: [{ rowNumber: 4, itemCode: 'C', itemName: 'No price', problems: ['The price "x" is not a number.'], cells: [] }], rows: [{ rowNumber: 2, payload: { item_code: 'A' } }] };

describe('the page model', () => {
  test('the browser and server findings are one list in file order', () => {
    const rows = previewRows(browser, server());
    expect(rows.map((r) => [r.row, r.action])).toEqual([[3, 'update'], [4, 'invalid'], [5, 'invalid']]);
    expect(rows[1].problems).toEqual(['The price "x" is not a number.']);
    expect(rows[0].changes).toEqual(['price: KES 150 to KES 200']);
  });

  test('counts add the rows the browser refused', () => {
    expect(countsOf(browser, server())).toEqual({ create: 0, update: 1, unchanged: 0, invalid: 2 });
    expect(countsOf(null, null)).toEqual({ create: 0, update: 0, unchanged: 0, invalid: 0 });
  });

  test('what was understood is short phrases in plain words with money as KES', () => {
    expect(understoodLines(server().rows[0].understood)).toEqual([
      'Category: Food',
      'Unit: kilogram',
      'Price: KES 200',
      'Opening stock: 10',
      'Store: Stores - A',
      'Picture: a web link',
      'Tax: zero rated',
    ]);
    expect(understoodLines({ is_service: true })).toEqual(['A service, no stock']);
    expect(understoodLines(null)).toEqual([]);
  });

  test('a change from nothing says blank', () => {
    expect(changeText({ field: 'brand', from: '', to: 'Tusker' })).toBe('brand: blank to Tusker');
  });

  test('which rows need a look', () => {
    const rows = previewRows(browser, server());
    expect(filterRows(rows, 'all')).toHaveLength(3);
    expect(filterRows(rows, 'attention').map((r) => r.row)).toEqual([3, 4, 5]);
    expect(needsAttention({ action: 'unchanged', problems: [], notes: [] })).toBe(false);
  });

  test('the button says how many will be imported', () => {
    expect(saveLabel(null)).toBe('Import products');
    expect(saveLabel({ create: 1, update: 0 })).toBe('Import 1 product');
    expect(saveLabel({ create: 2, update: 3 })).toBe('Import 5 products');
    expect(importCount({ create: 2, update: 3, unchanged: 9, invalid: 1 })).toBe(5);
  });

  test('only the rows the browser accepted are sent', () => {
    expect(rowsToSend(browser)).toEqual([{ item_code: 'A' }]);
    expect(rowsToSend(null)).toEqual([]);
  });

  test('the result lines', () => {
    const result = { counts: { created: 2, updated: 0, unchanged: 0, failed: 1, left_out: 0 }, categoriesCreated: ['Snacks', 'Fizzy'], brandsCreated: ['Bidco'], stock: { rows: 2, reference: 'R', problem: '' }, picturesAdded: 3, photosProblem: '' };
    expect(resultLines(result)).toEqual(['New categories created: Snacks, Fizzy.', 'New brands created: Bidco.', 'Opening stock added for 2 products.', '3 pictures added.']);
    expect(resultHasTrouble(result)).toBe(true);
    expect(resultHasTrouble({ ...result, counts: { ...result.counts, failed: 0 } })).toBe(false);
    expect(resultLines({ ...result, categoriesCreated: [], brandsCreated: [], picturesAdded: 0, stock: { rows: 0, reference: '', problem: 'Try again.' } })).toEqual(['Opening stock was not added. Try again.']);
  });
});
