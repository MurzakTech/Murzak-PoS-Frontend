import { parseCsv, problemRowsCsv, summarizeBulkCreate } from './productImport';
import { checkStockSheet, STOCK_TEMPLATE_CSV, STOCK_WORDING, localDateString } from './stockImport';

const check = (csv) => checkStockSheet(parseCsv(csv).rows);

describe('checkStockSheet', () => {
  it('accepts the layout of the template', () => {
    const r = check(STOCK_TEMPLATE_CSV);
    expect(r.fileProblems).toEqual([]);
    expect(r.valid.map((v) => v.stock)).toEqual([{ item_code: 'ITEM001', qty: 100 }, { item_code: 'ITEM002', qty: 50 }]);
    expect(r.unknownColumns).toEqual([]); // item_name is a known helper column
    expect(r.valid[0].itemName).toBe('Tusker Lager 500ml');
  });

  it('reads decimals, thousands separators and friendly headings', () => {
    const r = check('SKU,Quantity\nA1,"1,250"\nA2,2.5');
    expect(r.valid.map((v) => v.stock.qty)).toEqual([1250, 2.5]);
  });

  it('reports a row with a missing, negative or unreadable quantity instead of dropping it', () => {
    const r = check('item_code,qty\nA1,10\nA2,\nA3,-4\nA4,ten');
    expect(r.valid).toHaveLength(1);
    expect(r.invalid.map((v) => [v.rowNumber, v.itemCode, v.problems[0]])).toEqual([
      [3, 'A2', 'Quantity is empty.'],
      [4, 'A3', 'Quantity cannot be negative.'],
      [5, 'A4', 'Quantity "ten" is not a number.'],
    ]);
  });

  it('refuses a code used twice rather than counting it twice', () => {
    const r = check('item_code,qty\nA1,10\na1,5');
    expect(r.valid).toHaveLength(1);
    expect(r.invalid[0].problems[0]).toContain('already used on row 2');
  });

  it('leaves out a quantity of 0 on purpose, and says so', () => {
    const r = check('item_code,qty\nA1,0\nA2,3');
    expect(r.zeroRows).toEqual([{ rowNumber: 2, itemCode: 'A1' }]);
    expect(r.valid.map((v) => v.stock.item_code)).toEqual(['A2']);
    expect(r.invalid).toEqual([]);
  });

  it('reports a code that is empty, with the row number in the sheet', () => {
    const r = check('item_code,qty\nA1,1\n,\n,5');
    expect(r.invalid).toHaveLength(1); // the fully blank row is skipped, not reported
    expect(r.invalid[0]).toMatchObject({ rowNumber: 4 });
    expect(r.invalid[0].problems).toContain('Item code is empty.');
  });

  it('catches an unquoted comma that pushes values into extra columns', () => {
    const r = check('item_code,qty\nA,1,5');
    expect(r.invalid[0].problems[0]).toContain('quotation marks');
  });

  it('names missing columns and what it found; rejects empty files and too many rows', () => {
    expect(check('code,price\nA,1').fileProblems[0]).toContain('"qty"');
    expect(checkStockSheet([]).fileProblems).toHaveLength(1);
    expect(check('item_code,qty\n').fileProblems[0]).toContain('no rows');
    const big = [['item_code', 'qty'], ...Array.from({ length: 2001 }, (_, i) => [`C${i}`, '1'])];
    expect(checkStockSheet(big).fileProblems[0]).toContain('split it');
  });

  it('lists columns it does not use', () => {
    expect(check('item_code,qty,shelf\nA,1,top').unknownColumns).toEqual(['shelf']);
  });

  it('produces a fix-it file that can be read back', () => {
    const r = check('item_code,qty\nA1,10\nA2,abc');
    const rows = parseCsv(problemRowsCsv(r)).rows;
    expect(rows[0]).toEqual(['item_code', 'qty', 'problem']);
    expect(rows[1].slice(0, 2)).toEqual(['A2', 'abc']);
  });
});

describe('summarizing the server reply for stock', () => {
  it('uses stock wording and reports failures', () => {
    const s = summarizeBulkCreate({ success_count: 8, failed_count: 2, errors: [{ item_code: 'X', error: 'Item X does not exist.' }, 'Y: no such item'] }, 10, STOCK_WORDING);
    expect(s.text).toBe('8 items recorded. 2 could not be recorded.');
    expect(s.failures).toEqual(['X: Item X does not exist', 'Y: no such item']);
    expect(s.problems).toBe(true);
  });

  it('does not claim success when the server gives no counts', () => {
    const s = summarizeBulkCreate({}, 3, STOCK_WORDING);
    expect(s.text).toBe('3 items sent. The server did not say how many were recorded, so check the stock list.');
  });

  it('picks up the stock entry the server created', () => {
    expect(summarizeBulkCreate({ success_count: 1, stock_entry_name: 'MAT-STE-0001' }, 1, STOCK_WORDING).reference).toBe('MAT-STE-0001');
    expect(summarizeBulkCreate({ success_count: 1, stock_entry: { name: 'MAT-STE-0002' } }, 1, STOCK_WORDING).reference).toBe('MAT-STE-0002');
    expect(summarizeBulkCreate({ success_count: 1 }, 1, STOCK_WORDING).reference).toBe('');
  });
});

describe('localDateString', () => {
  it('gives the local calendar date, even just after midnight', () => {
    expect(localDateString(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01');
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
