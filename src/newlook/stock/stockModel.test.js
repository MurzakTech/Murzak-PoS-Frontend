import {
  changeText,
  countPayload,
  countTotals,
  countedInvalid,
  countedLines,
  countedValue,
  csvFor,
  csvName,
  daysLeftWords,
  differenceInfo,
  entryAddress,
  expiryView,
  formatQty,
  levelView,
  movementKindWords,
  netWords,
  parseQty,
  periodDates,
  qtyWithUnit,
  reasonOptions,
  reorderPath,
  statusView,
  stockCsv,
  stockInProblems,
  stockOutProblems,
  stockRoot,
  tabAddress,
  tabFromPath,
  unitWords,
  visibleTabs,
} from './stockModel';

describe('tabs and their addresses', () => {
  test('the tab comes from the address and anything unknown is Overview', () => {
    expect(tabFromPath('/new-look/stock')).toBe('overview');
    expect(tabFromPath('/new-look/stock/low')).toBe('low');
    expect(tabFromPath('/new-look/stock/movements')).toBe('movements');
    expect(tabFromPath('/new-look/stock/count')).toBe('count');
    expect(tabFromPath('/new-look/stock/count/ABC')).toBe('count');
    expect(tabFromPath('/new-look/stock/nonsense')).toBe('overview');
    expect(tabFromPath(undefined)).toBe('overview');
  });

  test('the root is the page address whatever tab is open', () => {
    expect(stockRoot('/new-look/stock/low')).toBe('/new-look/stock');
    expect(stockRoot('/new-look/stock')).toBe('/new-look/stock');
    expect(stockRoot('/stock/movements')).toBe('/stock');
  });

  test('a shop with one location and no expiry has four tabs for a person who may change stock', () => {
    expect(visibleTabs({ canChange: true }).map((t) => t.key)).toEqual(['overview', 'low', 'movements', 'count']);
  });

  test('a person who may not change stock has no Count stock tab', () => {
    expect(visibleTabs({ canChange: false }).map((t) => t.key)).toEqual(['overview', 'low', 'movements']);
  });

  test('Locations and Transfers appear only with a second location, and Expiry only when expiry is tracked', () => {
    expect(visibleTabs({ canChange: true, locations: true }).map((t) => t.key)).toEqual(['overview', 'low', 'movements', 'count', 'locations', 'transfers']);
    expect(visibleTabs({ canChange: true, expiry: true }).map((t) => t.key)).toEqual(['overview', 'low', 'movements', 'count', 'expiry']);
  });

  test('the open tab is always kept, even when it would be hidden', () => {
    expect(visibleTabs({ current: 'expiry' }).map((t) => t.key)).toContain('expiry');
  });

  test('the tabs carry their words from the strings file', () => {
    expect(visibleTabs({ canChange: true }).map((t) => t.label)).toEqual(['Overview', 'Low stock', 'Movements', 'Count stock']);
  });

  test('a tab address keeps the store and rows per page and drops the search and page', () => {
    expect(tabAddress('/new-look/stock', 'low', 'q=milk&page=3&store=Main&size=50')).toBe('/new-look/stock/low?store=Main&size=50');
    expect(tabAddress('/new-look/stock', 'overview', '')).toBe('/new-look/stock');
  });

  test('only movements keep the period', () => {
    expect(tabAddress('/new-look/stock', 'movements', 'period=7d')).toBe('/new-look/stock/movements?period=7d');
    expect(tabAddress('/new-look/stock', 'low', 'period=7d')).toBe('/new-look/stock/low');
  });
});

describe('quantities, units and levels', () => {
  test('quantities have separators and at most three decimals', () => {
    expect(formatQty(4)).toBe('4');
    expect(formatQty(25.5)).toBe('25.5');
    expect(formatQty(1200)).toBe('1,200');
    expect(formatQty(0.12345)).toBe('0.123');
    expect(formatQty(null)).toBe('–');
    expect(formatQty('abc')).toBe('–');
  });

  test('units are in plain words and agree with the number', () => {
    expect(unitWords('Nos', 4)).toBe('pieces');
    expect(unitWords('Nos', 1)).toBe('piece');
    expect(unitWords('Kg', 25.5)).toBe('kilograms');
    expect(unitWords('Kg', 1)).toBe('kilogram');
    expect(unitWords('Litre', 3)).toBe('litres');
    expect(unitWords('Crate', 3)).toBe('crate');
    expect(unitWords('', 3)).toBe('');
  });

  test('a quantity with its unit', () => {
    expect(qtyWithUnit(4, 'Nos')).toBe('4 pieces');
    expect(qtyWithUnit(25.5, 'Kg')).toBe('25.5 kilograms');
    expect(qtyWithUnit(7, '')).toBe('7');
  });

  test('every level is an icon plus a word', () => {
    expect(levelView('ok')).toMatchObject({ icon: 'check', words: 'In stock', tone: 'good' });
    expect(levelView('low')).toMatchObject({ icon: 'arrowDown', words: 'Low', tone: 'warn' });
    expect(levelView('out')).toMatchObject({ icon: 'alert', words: 'Out', tone: 'bad' });
  });

  test('every entry status is an icon plus a word', () => {
    expect(statusView('draft')).toMatchObject({ icon: 'clock', words: 'Draft' });
    expect(statusView('submitted')).toMatchObject({ icon: 'check', words: 'Submitted' });
    expect(statusView('cancelled')).toMatchObject({ icon: 'x', words: 'Cancelled' });
  });

  test('every expiry state is an icon plus a word', () => {
    expect(expiryView('expired')).toMatchObject({ icon: 'alert', words: 'Expired' });
    expect(expiryView('critical')).toMatchObject({ icon: 'clock', words: 'Within 7 days' });
    expect(expiryView('soon')).toMatchObject({ words: 'Expiring soon' });
  });

  test('days left in words', () => {
    expect(daysLeftWords(7)).toBe('7 days left');
    expect(daysLeftWords(1)).toBe('1 day left');
    expect(daysLeftWords(0)).toBe('Expires today');
    expect(daysLeftWords(-1)).toBe('Expired 1 day ago');
    expect(daysLeftWords(-3)).toBe('Expired 3 days ago');
    expect(daysLeftWords('x')).toBe('');
  });
});

describe('movements', () => {
  test('kinds are in plain words and an unknown kind is Other', () => {
    expect(movementKindWords('stock_in')).toBe('Stock in');
    expect(movementKindWords('sale_return')).toBe('Customer return');
    expect(movementKindWords('whatever')).toBe('Other');
  });

  test('a change has a plain sign', () => {
    expect(changeText(12)).toBe('+12');
    expect(changeText(-3)).toBe('-3');
    expect(changeText(0)).toBe('0');
    expect(changeText(-1200)).toBe('-1,200');
    expect(changeText(null)).toBe('0');
  });

  test('a stock change is opened on the current screen', () => {
    expect(entryAddress('MAT-STE-2026-00004')).toBe('/inventory/stock-entries/MAT-STE-2026-00004?legacy=1');
  });

  test('periods become dates, today included', () => {
    const now = new Date(2026, 9, 13);
    expect(periodDates('today', '', '', now)).toEqual({ from: '2026-10-13', to: '2026-10-13' });
    expect(periodDates('7d', '', '', now)).toEqual({ from: '2026-10-07', to: '2026-10-13' });
    expect(periodDates('30d', '', '', now)).toEqual({ from: '2026-09-14', to: '2026-10-13' });
    expect(periodDates('custom', '2026-10-01', '2026-10-05', now)).toEqual({ from: '2026-10-01', to: '2026-10-05' });
    expect(periodDates('custom', '2026-10-01', '', now)).toEqual({});
  });
});

describe('where Reorder goes', () => {
  test('a new purchase with the product filled in', () => {
    expect(reorderPath('MLK')).toBe('/purchases/new?item=MLK');
    expect(reorderPath('A B/C')).toBe('/purchases/new?item=A%20B%2FC');
  });
});

describe('the spreadsheet', () => {
  const rows = [
    { item_code: 'MLK', item_name: 'Maziwa 500ml', category: 'Maziwa', unit: 'Nos', qty: 4, value: 240, level: 'low', warning_level: 10 },
    { item_code: 'X', item_name: '=SUM(A1)', category: '', unit: 'Kg', qty: 0, value: 0, level: 'out', warning_level: null },
  ];

  test('has the value column only for a person who may see value', () => {
    expect(stockCsv(rows, true).split('\n')[0]).toContain('"Value"');
    expect(stockCsv(rows, false).split('\n')[0]).not.toContain('"Value"');
    expect(stockCsv(rows, false)).not.toContain('240');
  });

  test('writes the unit and the level in words', () => {
    const line = stockCsv(rows, true).split('\n')[1];
    expect(line).toContain('"pieces"');
    expect(line).toContain('"Low"');
  });

  test('a cell that starts like a formula is quoted so a spreadsheet does not run it', () => {
    expect(stockCsv(rows, true)).toContain(`"'=SUM(A1)"`);
  });

  test('the file name names the tab and the day', () => {
    expect(csvName('low', '2026-10-13')).toBe('stock-low-2026-10-13.csv');
  });

  test('each tab has its own columns', () => {
    expect(csvFor('movements', [], true).split('\n')[0]).toContain('"Reference"');
    expect(csvFor('expiry', [], true).split('\n')[0]).toContain('"Expires"');
    expect(csvFor('overview', [], true).split('\n')[0]).toContain('"In stock"');
  });
});

describe('the short forms', () => {
  const milk = { item_code: 'MLK', item_name: 'Maziwa', unit: 'Nos', qty: 4 };

  test('typed quantities become numbers', () => {
    expect(parseQty('12')).toBe(12);
    expect(parseQty('2.5')).toBe(2.5);
    expect(parseQty('1,200')).toBe(1200);
    expect(parseQty('abc')).toBe(0);
    expect(parseQty('')).toBe(0);
    expect(parseQty('.')).toBe(0);
    expect(parseQty('-3')).toBe(0);
  });

  test('stock in needs a product and a quantity', () => {
    expect(stockInProblems({ product: milk, qty: '5' })).toEqual({});
    expect(Object.keys(stockInProblems({ product: null, qty: '' }))).toEqual(['product', 'qty']);
  });

  test('a write-off without a reason has a problem on the reason (AC-27)', () => {
    expect(stockOutProblems({ product: milk, qty: '1', reason: '', note: '' })).toEqual({ reason: 'Choose a reason before you save' });
  });

  test('a write-off with a reason has none', () => {
    expect(stockOutProblems({ product: milk, qty: '1', reason: 'damaged', note: '' })).toEqual({});
  });

  test('the reason Other needs a note', () => {
    expect(stockOutProblems({ product: milk, qty: '1', reason: 'other', note: ' ' })).toEqual({ note: 'Add a short note for the reason Other' });
    expect(stockOutProblems({ product: milk, qty: '1', reason: 'other', note: 'a gift' })).toEqual({});
  });

  test('taking out more than is in stock is a problem on the quantity', () => {
    expect(stockOutProblems({ product: milk, qty: '5', reason: 'lost', note: '' })).toEqual({ qty: 'Only 4 in stock' });
  });

  test('the reasons are Damaged, Expired, Lost, Used in the shop and Other', () => {
    expect(reasonOptions().map((o) => o.value)).toEqual(['damaged', 'expired', 'lost', 'used_in_shop', 'other']);
  });
});

describe('the guided count', () => {
  test('a typed count: empty is not counted, letters are not a number, digits are a number', () => {
    expect(countedValue('')).toBeNull();
    expect(countedValue('  ')).toBeNull();
    expect(countedValue('abc')).toBeNaN();
    expect(countedValue('4')).toBe(4);
    expect(countedValue('2.5')).toBe(2.5);
    expect(countedValue('.5')).toBe(0.5);
    expect(countedValue('1,200')).toBe(1200);
    expect(countedValue('-1')).toBeNaN();
    expect(countedInvalid('abc')).toBe(true);
    expect(countedInvalid('')).toBe(false);
  });

  test('the difference is Short, Over or Matches, each with an icon, and nothing until counted', () => {
    expect(differenceInfo(4, 3)).toMatchObject({ kind: 'short', icon: 'alert', amount: -1, words: 'Short by 1' });
    expect(differenceInfo(4, 6.5)).toMatchObject({ kind: 'over', icon: 'arrowUp', amount: 2.5, words: 'Over by 2.5' });
    expect(differenceInfo(4, 4)).toMatchObject({ kind: 'matches', icon: 'check', words: 'Matches' });
    expect(differenceInfo(4, null)).toMatchObject({ kind: 'none', icon: null, words: 'Not counted' });
    expect(differenceInfo(4, NaN).kind).toBe('none');
  });

  test('decimal noise does not make a difference', () => {
    expect(differenceInfo(0.3, 0.1 + 0.2).kind).toBe('matches');
  });

  const rows = [
    { item_code: 'A', item_name: 'A', expected: 4, unit: 'Nos' },
    { item_code: 'B', item_name: 'B', expected: 10, unit: 'Nos' },
    { item_code: 'C', item_name: 'C', expected: 6, unit: 'Nos' },
    { item_code: 'D', item_name: 'D', expected: 1, unit: 'Nos' },
  ];

  test('only the products with a valid count are counted lines', () => {
    const lines = countedLines(rows, { A: '3', B: '10', C: 'x', D: '' });
    expect(lines.map((l) => l.row.item_code)).toEqual(['A', 'B']);
  });

  test('totals count short, over and matching, and add up the net difference', () => {
    const lines = countedLines(rows, { A: '3', B: '10', C: '9' });
    expect(countTotals(lines)).toEqual({ counted: 3, short: 1, over: 1, matches: 1, net: 2 });
  });

  test('the net difference reads with a sign, or Matches', () => {
    expect(netWords(2)).toBe('+2');
    expect(netWords(-1.5)).toBe('-1.5');
    expect(netWords(0)).toBe('Matches');
  });

  test('the payload is the counted lines as item code and counted', () => {
    expect(countPayload(countedLines(rows, { A: '3', D: '1' }))).toEqual([
      { item_code: 'A', counted: 3 },
      { item_code: 'D', counted: 1 },
    ]);
  });
});
