/**
 * A discount can never be more than the sale. A percentage is kept between 0 and 100, and a flat amount is not
 * negative. (The till once accepted 150 percent, which made the total KES 0 and left "Pay KES 0" switched on.)
 * `limit` is the most a flat amount may be (the sale's total before the discount).
 */
export const clampDiscount = (type, value, limit = Infinity) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (type === 'percentage') return Math.min(number, 100);
  return Math.min(number, Number.isFinite(limit) ? Math.max(limit, 0) : number);
};

/** True when the typed value had to be pulled back, so the screen can say so */
export const discountWasClamped = (type, value, limit = Infinity) => clampDiscount(type, value, limit) !== (Number(value) || 0);
