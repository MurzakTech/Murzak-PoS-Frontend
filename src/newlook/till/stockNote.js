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

/**
 * Cart lines the shop cannot sell because there is not enough in stock, as plain sentences for the cashier.
 * The server refuses such a sale (negative stock is off), so the till says so before the payment screen instead of
 * letting the cashier go all the way to "Complete sale" and fail.
 *
 * `stockOf(line)` returns the stock figure for a line, or null when it is not known (a service, or the till is
 * offline); a line with no known figure is never blocked.
 */
export const stockShortfalls = (cart, stockOf) =>
  (cart || [])
    .map((line) => {
      const note = stockNote(line.qty, stockOf(line));
      if (!note) return null;
      const name = line.item_name || line.item_code;
      const have = Number(stockOf(line));
      return have <= 0 ? fill(T.stock.blockedNone, { name }) : fill(T.stock.blockedOnly, { name, qty: Number.isInteger(have) ? have : Math.round(have * 100) / 100 });
    })
    .filter(Boolean);
