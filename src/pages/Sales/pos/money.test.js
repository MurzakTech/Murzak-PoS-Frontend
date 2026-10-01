import { cashSuggestions, fmt, money, round2 } from './money';

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
});
