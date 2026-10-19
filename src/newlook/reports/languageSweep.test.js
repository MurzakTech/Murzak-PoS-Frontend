/** P6-4: the report pages follow the format table (phone numbers, days with their noun, percentages to one decimal) */
import { columnsFor, figuresFor, formatCell } from './reportsModel';
import { OWED, AGING, PROFIT, COSTS, STOCK_VALUE } from './__fixtures__/reportAnswers';

const cell = (name, data, key, row) => formatCell(columnsFor(name, data).find((c) => c.key === key), row);

describe('Who owes me money', () => {
  const row = { customer: 'C1', name: 'Brian', mobile: '+254712345678', amount: 100, oldest_days: 1, bands: {} };

  test('the phone number is shown as 0712 345 678', () => {
    expect(cell('owed', OWED, 'mobile', row)).toBe('0712 345 678');
    expect(cell('owed', OWED, 'mobile', { ...row, mobile: '0722000111' })).toBe('0722 000 111');
  });

  test('a missing number is empty, not "null"', () => {
    expect(cell('owed', OWED, 'mobile', { ...row, mobile: null })).toBe('');
  });

  test('the oldest debt says 1 day, 2 days or Today', () => {
    expect(cell('owed', OWED, 'oldest_days', { ...row, oldest_days: 1 })).toBe('1 day');
    expect(cell('owed', OWED, 'oldest_days', { ...row, oldest_days: 5 })).toBe('5 days');
    expect(cell('owed', OWED, 'oldest_days', { ...row, oldest_days: 0 })).toBe('Today');
  });

  test('the note under "Customers who owe" says 1 day old, never 1 days old', () => {
    const one = figuresFor('owed', { ...OWED, summary: { ...OWED.summary, oldest_days: 1 } }).find((f) => f.key === 'customers');
    expect(one.note).toBe('The oldest debt is 1 day old');
    const many = figuresFor('owed', OWED).find((f) => f.key === 'customers');
    expect(many.note).toBe('The oldest debt is 42 days old');
  });

  test('the share older than 30 days has one decimal at most', () => {
    const older = figuresFor('owed', { ...OWED, summary: { ...OWED.summary, over_30_share_pct: 14.285714 } }).find((f) => f.key === 'older');
    expect(older.note).toBe('14.3% of what is owed');
  });
});

describe('Stock that is not selling', () => {
  test('the oldest stock says 1 day or N days', () => {
    expect(figuresFor('aging-stock', { ...AGING, summary: { ...AGING.summary, oldest_days: 1 } }).find((f) => f.key === 'oldest').value).toBe('1 day');
    expect(figuresFor('aging-stock', AGING).find((f) => f.key === 'oldest').value).toBe('200 days');
  });

  test('the share of products has one decimal at most', () => {
    const note = figuresFor('aging-stock', { ...AGING, summary: { ...AGING.summary, share_of_products_pct: 33.3333 } }).find((f) => f.key === 'products').note;
    expect(note).toBe('33.3% of the products you have in stock');
  });
});

describe('percentages in the other reports', () => {
  test('profit margin is rounded to one decimal', () => {
    const margin = figuresFor('profit', { ...PROFIT, summary: { ...PROFIT.summary, margin_pct: 25.857142 } }).find((f) => f.key === 'margin');
    expect(margin.value).toBe('25.9%');
  });

  test('the margin column of the profit table is rounded too', () => {
    expect(cell('profit', PROFIT, 'margin_pct', { ...PROFIT.rows[0], margin_pct: 38.4567 })).toBe('38.5%');
  });

  test('the biggest running cost and the biggest stock category are rounded', () => {
    const costs = figuresFor('running-costs', { ...COSTS, summary: { ...COSTS.summary, biggest: { category: 'Rent', amount: 12000, share_pct: 73.2468 } } }).find((f) => f.key === 'biggest');
    expect(costs.note).toBe('KES 12,000, 73.2% of your running costs');
    const stock = figuresFor('stock-value', { ...STOCK_VALUE, summary: { ...STOCK_VALUE.summary, biggest: { category: 'Snacks', value: 14000, share_pct: 70.0001 } } }).find((f) => f.key === 'biggest');
    expect(stock.note).toBe('70% of your stock value');
  });
});
