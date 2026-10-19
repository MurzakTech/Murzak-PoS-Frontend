/** P6-4: the number formats of the language sweep (percentages to one decimal, counts with their noun, rows) */
import { formatCount, formatMoney, formatPercent, percentNumber, rowsWords } from './format';

describe('percentages: one decimal at most', () => {
  test.each([
    [25, '25%'],
    [21.5, '21.5%'],
    [13.2345, '13.2%'],
    [99.96, '100%'],
    [0.04, '0%'],
    [-3.46, '-3.5%'],
    [-0.01, '0%'],
    ['12.25', '12.3%'],
    [0, '0%'],
  ])('%s shows as %s', (value, text) => {
    expect(formatPercent(value)).toBe(text);
  });

  test('missing or odd values show 0%, never NaN or undefined', () => {
    ['', null, undefined, 'abc', NaN].forEach((v) => expect(formatPercent(v)).toBe('0%'));
  });

  test('percentNumber gives the rounded number for texts that already carry the % sign', () => {
    expect(percentNumber(14.2857)).toBe(14.3);
    expect(percentNumber(70)).toBe(70);
    expect(percentNumber('x')).toBe(0);
  });
});

describe('counts with their noun', () => {
  test('rowsWords says 1 row and 20 rows', () => {
    expect(rowsWords(1)).toBe('1 row');
    expect(rowsWords(0)).toBe('0 rows');
    expect(rowsWords(20)).toBe('20 rows');
    expect(rowsWords(1200)).toBe('1,200 rows');
  });

  test('formatCount keeps the singular for exactly one', () => {
    expect(formatCount(1, 'day')).toBe('1 day');
    expect(formatCount(2, 'day')).toBe('2 days');
  });
});

describe('money', () => {
  test('KES prefix, a space, thousands comma, cents only when there are cents', () => {
    expect(formatMoney(2350)).toBe('KES 2,350');
    expect(formatMoney(1480200)).toBe('KES 1,480,200');
    expect(formatMoney(1234.5)).toBe('KES 1,234.50');
    expect(formatMoney(0)).toBe('KES 0');
    expect(formatMoney(-500)).toBe('-KES 500');
  });
});
