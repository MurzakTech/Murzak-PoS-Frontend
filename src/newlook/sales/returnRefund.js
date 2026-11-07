/**
 * How a return is paid back. The customer should get the money back the way they paid, so an M-Pesa sale is not
 * refunded in cash from the drawer by default. A sale made on the till (a POS Invoice) is refunded inside the
 * return itself, so it cannot be "kept as credit to pay later"; only an ordinary invoice can.
 */

const isCash = (mode) => /^cash/i.test(String(mode || '').trim());

/** The way the sale was mostly paid (a payment mode's name), or 'Cash' when that is not known */
export const defaultRefundMode = (sale) => {
  let best = null;
  let bestAmount = 0;
  ((sale && sale.payments) || []).forEach((p) => {
    const amount = Number(p.amount) || 0;
    if (p.mode && amount > bestAmount) {
      best = p.mode;
      bestAmount = amount;
    }
  });
  return best || 'Cash';
};

/**
 * The choices shown: Cash from the drawer; the way the sale was paid when that is not cash; and credit, only for a sale that
 * is not a till sale. Returns [{ value, kind }], with kind 'cash' | 'original' | 'credit' (the caller supplies the words).
 */
export const refundChoices = (sale) => {
  const original = defaultRefundMode(sale);
  const choices = [];
  if (!isCash(original)) choices.push({ value: original, kind: 'original' });
  choices.push({ value: 'Cash', kind: 'cash' });
  if (!sale || sale.doctype !== 'POS Invoice') choices.push({ value: 'credit', kind: 'credit' });
  return choices;
};
