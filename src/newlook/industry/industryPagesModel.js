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

/** The last 12 months, newest first, as { value: "yyyy-mm", label: "November 2026" } for the levy month picker */
export const recentMonths = (now = new Date(), count = 12) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  });

/** The controlled medicines register as a CSV file's text: one line per movement, under each medicine */
export const controlledCsv = (medicines) => {
  const lines = [T.controlled.csvColumns.map(csvCell).join(',')];
  (medicines || []).forEach((m) =>
    (m.lines || []).forEach((l) =>
      lines.push([m.item_name, l.date, l.time, l.kind, l.reference, l.qty_in || '', l.qty_out || '', l.balance, l.patient, l.prescriber, l.dispensed_by].map(csvCell).join(','))
    )
  );
  return `${lines.join('\r\n')}\r\n`;
};
