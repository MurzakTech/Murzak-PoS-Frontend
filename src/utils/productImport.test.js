import { parseCsv, parseAmount, checkProductSheet, problemRowsCsv, summarizeBulkCreate, cellsToText, MAX_ROWS } from './productImport';

const H = 'item_code,item_name,item_group,stock_uom,standard_rate\n';
const check = (csv) => checkProductSheet(parseCsv(csv).rows);

describe('parseCsv', () => {
  it('keeps a comma inside quotes within one cell', () => {
    expect(parseCsv('a,"Burger, Cheese",c').rows).toEqual([['a', 'Burger, Cheese', 'c']]);
  });

  it('reads doubled quotes as one quote and allows line breaks inside quotes', () => {
    expect(parseCsv('"He said ""hi""","line1\nline2"').rows).toEqual([['He said "hi"', 'line1\nline2']]);
  });

  it('copes with Windows, Mac and Unix line endings and a leading BOM', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r3,4\n5,6').rows).toEqual([['a', 'b'], ['1', '2'], ['3', '4'], ['5', '6']]);
  });

  it('detects semicolons and tabs, which Excel uses in some regions', () => {
    expect(parseCsv('a;b;c\n1;2;3').rows[1]).toEqual(['1', '2', '3']);
    expect(parseCsv('a\tb\n1\t2').rows[1]).toEqual(['1', '2']);
  });

  it('keeps empty cells and a final line without a line break', () => {
    expect(parseCsv('a,,c\n1,2,').rows).toEqual([['a', '', 'c'], ['1', '2', '']]);
  });

  it('flags a quote that is never closed', () => {
    expect(parseCsv('a,"oops\nb').unclosedQuote).toBe(true);
  });
});

describe('parseAmount', () => {
  it.each([
    ['250', 250],
    ['1,200', 1200],
    ['1,200,000', 1200000],
    ['1,200.50', 1200.5],
    ['1.200,50', 1200.5],
    ['12,5', 12.5],
    ['KES 1,200', 1200],
    ['Ksh 350/=', 350],
    ['1 200', 1200],
    ['0', 0],
  ])('reads %s as %s', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['abc', '12abc', '', '1,2,3', '--5', '.'])('rejects %j', (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe('checkProductSheet', () => {
  it('accepts a normal file', () => {
    const r = check(H + 'B001,Tusker Lager 500ml,Beer,Nos,250\nB002,Fanta,Soda,Nos,80');
    expect(r.valid).toHaveLength(2);
    expect(r.invalid).toHaveLength(0);
    expect(r.valid[0].product).toMatchObject({ item_code: 'B001', item_name: 'Tusker Lager 500ml', standard_rate: 250, stock_uom: 'Nos', is_stock_item: true, is_sales_item: true, is_purchase_item: false });
  });

  it('imports a name with a comma and a price with a thousands separator correctly', () => {
    const r = check(H + 'B002,"Burger, Cheese",Food,Nos,650\nB005,Whisky 750ml,Spirits,Nos,"1,200"');
    expect(r.invalid).toHaveLength(0);
    expect(r.valid[0].product.item_name).toBe('Burger, Cheese');
    expect(r.valid[1].product.standard_rate).toBe(1200);
  });

  it('understands friendly headings such as SKU, Name and Price in any case', () => {
    const r = check('SKU,Product Name,Category,Unit,Price\nA1,Soap,Household,Nos,50');
    expect(r.valid[0].product).toMatchObject({ item_code: 'A1', item_name: 'Soap', item_group: 'Household', stock_uom: 'Nos', standard_rate: 50 });
  });

  it('reports ignored columns instead of silently dropping them', () => {
    const r = check('item_code,item_name,colour\nA1,Soap,red');
    expect(r.unknownColumns).toEqual(['colour']);
  });

  it('names the missing required columns and what it found instead', () => {
    const r = check('code,price\nA1,5');
    expect(r.fileProblems[0]).toContain('"item_name"');
    expect(r.fileProblems[0]).toContain('code, price');
  });

  it('rejects an empty file and a file with headings only', () => {
    expect(checkProductSheet([]).fileProblems).toHaveLength(1);
    expect(check('item_code,item_name\n').fileProblems[0]).toContain('no products');
  });

  it('reports the spreadsheet row number and reason for each bad row, and still accepts the good ones', () => {
    const r = check(H + 'A1,Good,G,Nos,10\n,No code,G,Nos,10\nA3,,G,Nos,10\nA4,Bad price,G,Nos,abc\nA5,Negative,G,Nos,-5');
    expect(r.valid.map((v) => v.rowNumber)).toEqual([2]);
    expect(r.invalid.map((v) => v.rowNumber)).toEqual([3, 4, 5, 6]);
    expect(r.invalid[0].problems).toContain('Item code is empty.');
    expect(r.invalid[1].problems).toContain('Item name is empty.');
    expect(r.invalid[2].problems[0]).toContain('"abc" is not a number');
    expect(r.invalid[3].problems).toContain('Price cannot be negative.');
  });

  it('keeps row numbers right when blank rows are in the file', () => {
    const r = check(H + 'A1,One,G,Nos,1\n,,,,\nA3,Three,,,');
    expect(r.valid.map((v) => v.rowNumber)).toEqual([2, 4]);
    expect(r.total).toBe(2);
  });

  it('catches repeated item codes, ignoring capital letters', () => {
    const r = check(H + 'A1,One,G,Nos,1\na1,Again,G,Nos,2');
    expect(r.valid).toHaveLength(1);
    expect(r.invalid[0].problems[0]).toContain('already used on row 2');
  });

  it('catches an unquoted comma that pushes values into extra columns', () => {
    const r = check(H + 'B002,Burger, Cheese,Food,Nos,650');
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].problems[0]).toContain('quotation marks');
  });

  it('warns about a missing price but still imports the row at 0', () => {
    const r = check(H + 'A1,Free thing,G,Nos,');
    expect(r.valid[0].product.standard_rate).toBe(0);
    expect(r.warnings[0].message).toContain('price of 0');
  });

  it('reads yes/no columns and rejects nonsense in them', () => {
    const ok = check('item_code,item_name,is_stock_item,is_purchase_item\nA1,One,no,yes');
    expect(ok.valid[0].product).toMatchObject({ is_stock_item: false, is_purchase_item: true });
    const bad = check('item_code,item_name,is_stock_item\nA1,One,maybe');
    expect(bad.invalid[0].problems[0]).toContain('is_stock_item must be yes/no');
  });

  it('refuses files above the row limit with a clear instruction', () => {
    const rows = [['item_code', 'item_name']];
    for (let i = 0; i < MAX_ROWS + 1; i += 1) rows.push([`C${i}`, `N${i}`]);
    expect(checkProductSheet(rows).fileProblems[0]).toContain('split it');
  });

  it('works on Excel cells once they are turned into text (numbers, blanks, dates)', () => {
    const sheet = cellsToText([
      ['item_code', 'item_name', 'standard_rate'],
      [1001, 'Bread', 65.5],
      ['1002', 'Milk', null],
    ]);
    const r = checkProductSheet(sheet);
    expect(r.valid.map((v) => v.product.item_code)).toEqual(['1001', '1002']);
    expect(r.valid[0].product.standard_rate).toBe(65.5);
  });
});

describe('problemRowsCsv', () => {
  it('lists the failed rows with their reasons so they can be fixed and re-imported', () => {
    const r = check(H + 'A1,Good,G,Nos,10\nA2,"Bad, name",G,Nos,abc');
    const csv = problemRowsCsv(r);
    expect(csv.split('\r\n')[0]).toBe('"item_code","item_name","item_group","stock_uom","standard_rate","problem"');
    expect(csv).toContain('"Bad, name"');
    expect(csv).toContain('is not a number');
    // and what we wrote can be read back by our own reader
    expect(parseCsv(csv).rows[1][1]).toBe('Bad, name');
  });
});

describe('summarizeBulkCreate', () => {
  it('reports counts and failures the server gave', () => {
    const s = summarizeBulkCreate({ created: 8, skipped: 1, failed: [{ item_code: 'X1', error: 'Duplicate code.' }] }, 10);
    expect(s.problems).toBe(true);
    expect(s.text).toBe('8 products saved. 1 already existed, so it was left as is. 1 could not be saved.');
    expect(s.failures).toEqual(['X1: Duplicate code']);
  });

  it('understands the other count names', () => {
    expect(summarizeBulkCreate({ success_count: 3, failed_count: 0 }, 3)).toMatchObject({ created: 3, failed: 0, problems: false, text: '3 products saved.' });
    expect(summarizeBulkCreate({ items_created: ['a', 'b'] }, 2).created).toBe(2);
  });

  it('treats zero saved as a problem', () => {
    expect(summarizeBulkCreate({ created: 0, failed: 0 }, 5).problems).toBe(true);
  });

  it('does not claim success when the server gives no counts', () => {
    const s = summarizeBulkCreate({}, 4);
    expect(s.created).toBeNull();
    expect(s.text).toContain('4 products sent. The server did not say how many were saved');
    expect(s.problems).toBe(false);
  });

  it('uses the server message when there are no counts', () => {
    expect(summarizeBulkCreate({ message: 'Import queued' }, 4).text).toBe('Import queued');
  });

  it('survives a reply that is not an object', () => {
    expect(summarizeBulkCreate(null, 1).text).toContain('1 product sent');
    expect(summarizeBulkCreate('Done', 1).text).toBe('Done');
  });
});
