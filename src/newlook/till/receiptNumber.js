/**
 * The number printed on a sale receipt in the New look. The system's own reference (ACC-PSINV-2026-00045) is long and repeats the
 * year; a customer and a cashier say "receipt 45". So the receipt leads with the short number, written exactly as the Sales list and
 * its search write it (#0045 for a till sale, #S0045 for an invoice), and keeps the full reference in smaller type underneath, because
 * that is the number the books, the tax receipt and any query to the shop use, and it never repeats.
 *
 * Mirrors the server's short_receipt (sales_list_calc.py): the digits at the end of the name, at least four, with an S for a Sales
 * Invoice. A name with no digits at the end (an offline sale not yet uploaded has only a temporary name) is returned as it is.
 */
const TRAILING_DIGITS = /(\d+)\s*$/;
const MIN_DIGITS = 4;

export const shortReceiptNumber = (doctype, name) => {
  const text = String(name || '');
  const found = TRAILING_DIGITS.exec(text);
  if (!found) return text;
  const letter = doctype === 'Sales Invoice' ? 'S' : '';
  return `#${letter}${String(Number(found[1])).padStart(MIN_DIGITS, '0')}`;
};
