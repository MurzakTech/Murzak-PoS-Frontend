import { cashSuggestions, fmt, formatBuffer, money, nextBuffer, round2 } from './money';

describe('till money helpers', () => {
  test('whole amounts drop decimals, others keep two', () => {
    expect(fmt(1250)).toBe('1,250');
    expect(fmt(1250.5)).toBe('1,250.50');
    expect(fmt(0)).toBe('0');
    expect(fmt(undefined)).toBe('0');
    expect(money(712, 'KES')).toBe('KES 712');
  });

  test('round2 removes floating point noise', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(193.49999999)).toBe(193.5);
  });

  test('quick-cash buttons start with the exact amount and never go below it', () => {
    expect(cashSuggestions(712)).toEqual([712, 750, 800, 1000]);
    expect(cashSuggestions(1284)).toEqual([1284, 1300, 1500, 2000]);
    expect(cashSuggestions(500)).toEqual([500, 1000]);
    expect(cashSuggestions(0)).toEqual([]);
    cashSuggestions(37.5).forEach((v) => expect(v).toBeGreaterThanOrEqual(37.5));
  });

  test('number pad input never shows leading zeros or more than two decimals', () => {
    expect(nextBuffer('', '5')).toBe('5');
    expect(nextBuffer('', '00')).toBe('0');
    expect(nextBuffer('0', '7')).toBe('7');
    expect(nextBuffer('5', '00')).toBe('500');
    expect(nextBuffer('', '.')).toBe('0.');
    expect(nextBuffer('1.5', '00')).toBe('1.50');
    expect(nextBuffer('1.50', '3')).toBe('1.50');
    expect(nextBuffer('12', 'back')).toBe('1');
    expect(nextBuffer('12', 'clear')).toBe('');
    expect(formatBuffer('1250.5')).toBe('1,250.5');
    expect(formatBuffer('1250')).toBe('1,250');
  });
});
