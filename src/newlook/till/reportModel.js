import { formatMoney } from '../components/format';
import { differenceView } from './shiftModel';
import { movementLine } from './cashModel';
import T from './strings.cash';
import fill from '../labels/fill';

/**
 * What the shift report shows, worked out from the server's report so the screen and the printed copy read the same
 * rows. The server does the arithmetic; this only chooses which rows to show and how they read.
 */
const R = T.report;

/** True for the final (Z) report of a closed shift */
export const isFinal = (report) => Boolean(report) && report.kind === 'Z';

export const reportName = (report) => (isFinal(report) ? R.zName : R.xName);
export const reportIntro = (report) => (isFinal(report) ? R.zIntro : R.xIntro);

/** [{ key, name, amount }] the sales rows, in order; the discount row only when there were discounts */
export const salesRows = (report) => {
  const s = report.sales;
  const rows = [
    { key: 'count', name: R.salesCount, amount: String(s.count) },
    { key: 'gross', name: R.salesGross, amount: formatMoney(s.gross) },
    { key: 'net', name: R.salesNet, amount: formatMoney(s.net) },
    { key: 'tax', name: R.salesTax, amount: formatMoney(s.tax) },
  ];
  if (s.discounts > 0) rows.push({ key: 'discounts', name: R.salesDiscounts, amount: formatMoney(s.discounts) });
  if (s.count > 0) rows.push({ key: 'average', name: R.salesAverage, amount: formatMoney(s.average) });
  return rows;
};

/** The returns line, or '' when nothing was returned */
export const returnsLine = (report) => (report.returns.count > 0 ? fill(R.returnsLine, { count: report.returns.count, amount: formatMoney(report.returns.total) }) : '');

/** The credit line, or '' when nothing was sold on credit */
export const creditLine = (report) => (report.credit_sales > 0 ? fill(R.creditLine, { amount: formatMoney(report.credit_sales) }) : '');

/** One row per way of paying: expected always, counted and difference only once counted */
export const methodRows = (report) =>
  report.by_method.map((row) => ({
    key: row.mode,
    name: row.label || row.mode,
    sales: formatMoney(row.sales),
    expected: formatMoney(row.expected),
    counted: row.counted === null ? R.notCounted : formatMoney(row.counted),
    difference: row.difference === null ? '' : differenceView(row.difference, null).text,
  }));

/** The drawer, line by line; refunds and safe drops show only when there were some, and the count only when counted */
export const cashRows = (report) => {
  const c = report.cash;
  if (!c) return [];
  const rows = [
    { key: 'opening', name: R.cashOpening, amount: formatMoney(c.opening) },
    { key: 'sales', name: R.cashSales, amount: formatMoney(c.sales) },
  ];
  if (c.paid_in > 0) rows.push({ key: 'in', name: R.cashPaidIn, amount: formatMoney(c.paid_in) });
  if (c.refunds > 0) rows.push({ key: 'refunds', name: R.cashRefunds, amount: formatMoney(-c.refunds) });
  if (c.paid_out > 0) rows.push({ key: 'out', name: R.cashPaidOut, amount: formatMoney(-c.paid_out) });
  if (c.safe_drops > 0) rows.push({ key: 'drops', name: R.cashDrops, amount: formatMoney(-c.safe_drops) });
  rows.push({ key: 'expected', name: R.cashExpected, amount: formatMoney(c.expected), strong: true });
  if (c.counted !== null) rows.push({ key: 'counted', name: R.cashCounted, amount: formatMoney(c.counted) });
  return rows;
};

/** How the cash difference reads (an icon, a tone and words), or null when the drawer was not counted */
export const cashDifference = (report) => {
  const c = report.cash;
  return c && c.difference !== null ? differenceView(c.difference, c.word) : null;
};

/** The recorded cash in and out as lines */
export const movementLines = (report) => report.movements.map((m) => ({ key: m.id, text: movementLine(m) }));

/** "Opened 24 Oct 08:15" and, for a closed shift, "Closed 24 Oct 18:30" */
export const timeLines = (report) => {
  const lines = [];
  if (report.opened_at) lines.push(fill(`${R.opened} {on} {at}`, { on: report.opened_on || '', at: report.opened_at }).replace(/\s+/g, ' ').trim());
  if (isFinal(report) && report.closed_at) lines.push(fill(`${R.closed} {on} {at}`, { on: report.closed_on || '', at: report.closed_at }).replace(/\s+/g, ' ').trim());
  return lines;
};
