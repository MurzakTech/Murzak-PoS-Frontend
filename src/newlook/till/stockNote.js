import T from './strings.till';
import fill from '../labels/fill';

/**
 * The flag on a cart line when the quantity is above what is in stock (Spec: Till, "Over-stock quantities are flagged on
 * the cart line"; AC-22): in words, such as "Only 13 left". Returns null when there is nothing to say, when stock is not
 * known (a service keeps none, or the till is offline and has no figure), and when the quantity is covered.
 */
export const stockNote = (qty, stockQty) => {
  if (stockQty === null || stockQty === undefined || Number.isNaN(Number(stockQty))) return null;
  const want = Number(qty) || 0;
  const have = Number(stockQty);
  if (want <= have) return null;
  if (have <= 0) return T.stock.none;
  return fill(T.stock.only, { qty: Number.isInteger(have) ? have : Math.round(have * 100) / 100 });
};
