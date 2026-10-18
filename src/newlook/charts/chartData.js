import { paymentKey } from '../components/Chip';
import { MARKS } from './chartTheme';
import { percent } from './chartFormat';

/**
 * The arithmetic behind the charts, kept free of drawing so it can be tested alone. Each function takes the shapes
 * in docs/redesign/P2-1-overview-contract.md and returns what a chart needs.
 */
export const COLUMNS_BELOW_DAYS = 7; // columns when there are fewer than 7 days of history, a line from 7 days up

export const METRICS = ['revenue', 'profit', 'count'];

export const drawsColumns = (daysOfData) => (Number(daysOfData) || 0) < COLUMNS_BELOW_DAYS;

/**
 * Rows for the sales chart. `value` is the chosen metric; `previous` the previous period's value for the same day.
 * Today ("so far") never joins the line: it has `soFar: true` and a `soFarValue` for its lighter column.
 */
export const salesRows = (points, metric = 'revenue') =>
  (points || []).map((p) => {
    const value = Number(p[metric]) || 0;
    const previous = p.previous && p.previous[metric] !== undefined && p.previous[metric] !== null ? Number(p.previous[metric]) : null;
    const soFar = Boolean(p.so_far);
    return {
      date: p.date,
      value,
      line: soFar ? null : value,
      soFarValue: soFar ? value : null,
      previous,
      soFar,
      count: Number(p.count) || 0,
      revenue: Number(p.revenue) || 0,
      profit: p.profit === undefined || p.profit === null ? null : Number(p.profit),
      empty: (Number(p.count) || 0) === 0 && value === 0,
    };
  });

/** The highest completed day (or the highest day at all when only today exists); null when every value is 0 */
export const peakRow = (rows) => {
  const done = rows.filter((r) => !r.soFar);
  const pool = done.length ? done : rows;
  const best = pool.reduce((a, b) => (b.value > (a ? a.value : -1) ? b : a), null);
  return best && best.value > 0 ? best : null;
};

export const latestRow = (rows) => {
  const done = rows.filter((r) => !r.soFar);
  return done.length ? done[done.length - 1] : rows[rows.length - 1] || null;
};

/**
 * One stacked bar of at most four parts (M-Pesa, Cash, Card, On credit in their own colours order), everything else
 * folded into Other. Zero parts are dropped. Parts under 2% stay in the legend but are not drawn in the bar.
 */
export const PAYMENT_ORDER = ['mpesa', 'cash', 'card', 'credit'];
export const MIN_DRAWN_PERCENT = 2;

export const groupPayments = (rows, names) => {
  const totals = { mpesa: 0, cash: 0, card: 0, credit: 0, other: 0 };
  (rows || []).forEach((row) => {
    const key = paymentKey(row.method);
    totals[key] = (totals[key] || 0) + (Number(row.amount) || 0);
  });
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const parts = [...PAYMENT_ORDER, 'other']
    .filter((key) => totals[key] > 0)
    .map((key) => ({ key, name: names[key], amount: totals[key], percent: percent(totals[key], total), drawn: total > 0 && (totals[key] / total) * 100 >= MIN_DRAWN_PERCENT }));
  return { total, parts };
};

/** Every hour from 8 to 19, with the peak marked and the average of the day */
export const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export const hoursRows = (rows) => {
  const byHour = new Map((rows || []).map((r) => [Number(r.hour), Number(r.average_sales) || 0]));
  const data = HOURS.map((hour) => ({ hour, value: byHour.get(hour) || 0, peak: false }));
  const max = Math.max(...data.map((d) => d.value));
  if (max > 0) {
    const first = data.find((d) => d.value === max);
    first.peak = true;
  }
  const average = data.reduce((a, d) => a + d.value, 0) / data.length;
  return { data, max, average, peak: data.find((d) => d.peak) || null };
};

/** The optional one-line tip: only when the peak hour is at least twice the average ("a second cashier from 4pm to 6pm") */
export const hoursTip = ({ peak, max, average }) => (peak && average > 0 && max >= 2 * average ? { from: peak.hour, to: peak.hour + 2 } : null);

/** Five rows at most, highest first */
export const topProductRows = (rows, limit = 5) =>
  [...(rows || [])]
    .map((r) => ({ ...r, revenue: Number(r.revenue) || 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

/** Every chart uses at most four colours: a fifth series becomes Other */
export const capSeries = (items, other) => {
  if (items.length <= MARKS.maxColours) return items;
  const head = items.slice(0, MARKS.maxColours - 1);
  const rest = items.slice(MARKS.maxColours - 1);
  return [...head, { ...other, value: rest.reduce((a, b) => a + (b.value || 0), 0) }];
};
