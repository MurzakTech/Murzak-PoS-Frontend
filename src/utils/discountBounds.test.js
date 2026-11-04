import { clampDiscount, discountWasClamped } from './discountBounds';

describe('clampDiscount', () => {
  it('keeps a percentage between 0 and 100', () => {
    expect(clampDiscount('percentage', 150)).toBe(100);
    expect(clampDiscount('percentage', 101)).toBe(100);
    expect(clampDiscount('percentage', 100)).toBe(100);
    expect(clampDiscount('percentage', 12.5)).toBe(12.5);
    expect(clampDiscount('percentage', -5)).toBe(0);
  });

  it('keeps a flat amount from going below 0 or above the sale', () => {
    expect(clampDiscount('fixed', 700, 500)).toBe(500);
    expect(clampDiscount('fixed', 200, 500)).toBe(200);
    expect(clampDiscount('fixed', -1, 500)).toBe(0);
  });

  it('treats anything that is not a number as no discount', () => {
    expect(clampDiscount('percentage', 'abc')).toBe(0);
    expect(clampDiscount('percentage', undefined)).toBe(0);
  });

  it('says when a value was pulled back', () => {
    expect(discountWasClamped('percentage', 150)).toBe(true);
    expect(discountWasClamped('percentage', 50)).toBe(false);
  });
});
