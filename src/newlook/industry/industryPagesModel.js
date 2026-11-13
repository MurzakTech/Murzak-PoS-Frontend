import fill from '../labels/fill';
import T from './strings.industry';

/**
 * The plain parts of the dispensing register and the waiter cash-up pages, kept here so they can be tested on their own.
 */

const pad = (n) => String(n).padStart(2, '0');

/** A date as yyyy-mm-dd in the browser's own day (not UTC, so a till in Nairobi after 21:00 still gets today) */
export const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The register's first period: the last 30 days, today included */
export const defaultPeriod = (now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return { from: isoDay(start), to: isoDay(now) };
};

// A cell that could be read by a spreadsheet as a formula is made plain text (a patient named "=SUM(...)" stays a name)
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The register as a CSV file's text, with a header row, one line per medicine dispensed */
export const registerCsv = (rows) => {
  const lines = [T.register.csvColumns.map(csvCell).join(',')];
  (rows || []).forEach((r) =>
    lines.push(
      [r.date, r.time, r.invoice, r.item_name, r.item_code, r.qty, r.uom, r.batch_no, r.patient, r.prescriber, r.reference, r.dispensed_by, r.status]
        .map(csvCell)
        .join(',')
    )
  );
  return `${lines.join('\r\n')}\r\n`;
};

export const registerFileName = (from, to) => fill(T.register.fileName, { from, to });

/** A row's key for the table: one sale can dispense several medicines */
export const registerRowKey = (row) => `${row.invoice}:${row.item_code}:${row.batch_no || ''}`;

/** "Cash 1,200 · M-Pesa 500" from a waiter's amounts by payment mode */
export const modesLine = (byMode, formatMoney) =>
  Object.entries(byMode || {})
    .filter(([, amount]) => Number(amount) !== 0)
    .map(([mode, amount]) => `${mode} ${formatMoney(amount)}`)
    .join(' · ');
