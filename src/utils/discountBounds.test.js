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

describe('discountPreview', () => {
  const { discountPreview } = require('./discountBounds');

  it('turns a percentage into money', () => {
    expect(discountPreview('percentage', '10', 1500)).toEqual({ amount: 150, tooMuch: false });
  });
  it('says so when more than the sale is asked for', () => {
    expect(discountPreview('percentage', '150', 1000)).toEqual({ amount: 1000, tooMuch: true });
    expect(discountPreview('amount', '700', 500)).toEqual({ amount: 500, tooMuch: true });
  });
  it('shows nothing for an empty or zero box', () => {
    expect(discountPreview('percentage', '', 1000)).toEqual({ amount: 0, tooMuch: false });
    expect(discountPreview('amount', '0', 1000)).toEqual({ amount: 0, tooMuch: false });
  });
});
