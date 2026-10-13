/**
 * Made-up numbers for the chart sample page and the tests. None of this is shop data: the names are invented and the
 * figures come from a fixed pattern, so every run draws the same charts.
 */
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** `days` consecutive days ending 2026-10-12; the last one is "so far" when `soFar` is set */
export const sampleSales = (days = 30, { soFar = true, gaps = [] } = {}) =>
  Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 12 - (days - 1 - i)));
    const wave = 40000 + ((i * 7919) % 31000);
    const empty = gaps.includes(i);
    const revenue = empty ? 0 : wave;
    const count = empty ? 0 : 20 + ((i * 13) % 40);
    return {
      date: iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      revenue,
      profit: Math.round(revenue * 0.24),
      count,
      previous: { revenue: Math.round(revenue * 0.88) + 1500, profit: Math.round(revenue * 0.2), count: Math.max(count - 3, 0) },
      so_far: soFar && i === days - 1,
    };
  });

export const samplePayments = [
  { method: 'M-Pesa', amount: 412000 },
  { method: 'Cash', amount: 268000 },
  { method: 'Card', amount: 91000 },
  { method: 'On credit', amount: 53000 },
];

export const sampleProducts = [
  { name: 'Physiotherapy session, 45 minutes', revenue: 185000 },
  { name: 'Knee support brace', revenue: 96000 },
  { name: 'Resistance band set', revenue: 71500 },
  { name: 'Massage oil 500ml', revenue: 48000 },
  { name: 'Hot and cold gel pack', revenue: 31200 },
  { name: 'Foam roller', revenue: 20000 },
];

export const sampleHours = [
  { hour: 8, average_sales: 2 },
  { hour: 9, average_sales: 4 },
  { hour: 10, average_sales: 6 },
  { hour: 11, average_sales: 5 },
  { hour: 12, average_sales: 3 },
  { hour: 13, average_sales: 2 },
  { hour: 14, average_sales: 4 },
  { hour: 15, average_sales: 7 },
  { hour: 16, average_sales: 21 },
  { hour: 17, average_sales: 14 },
  { hour: 18, average_sales: 5 },
  { hour: 19, average_sales: 1 },
];
