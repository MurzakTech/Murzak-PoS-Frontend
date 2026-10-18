/**
 * Made-up answers of the Reports calls, in the shape of the back end's contract (docs/redesign/P5-2-contract.md). No real
 * shop data. The numbers are chosen so the expected totals are easy to check by eye.
 */
const isoDay = (offset) => {
  const day = new Date(Date.UTC(2026, 8, 14 + offset)); // 14 Sep 2026 is day 0 of a 30 day period ending 13 Oct
  return day.toISOString().slice(0, 10);
};

const PERIOD = { key: '30d', from: '2026-09-14', to: '2026-10-13', days: 30, previous_from: '2026-08-15', previous_to: '2026-09-13', days_of_data: 30 };
const base = (name, extra) => ({ name, role: 'owner', period: PERIOD, as_of: '2026-10-13', updated_at: '14:52', cached: false, errors: {}, ...extra });

// Thirty days of sales: 1,000 on every day, 5 sales a day, so 30,000 and 150 sales; the period before was 25,000
const salesRows = Array.from({ length: 30 }, (_, i) => ({
  date: isoDay(i),
  revenue: 1000,
  count: 5,
  average_basket: 200,
  previous_revenue: 800,
  previous_count: 4,
  so_far: i === 29,
}));

export const SALES = base('sales', {
  summary: {
    revenue: 30000,
    gross_total: 34800,
    previous_revenue: 25000,
    change_pct: 20,
    count: 150,
    previous_count: 120,
    count_change_pct: 25,
    average_basket: 200,
    days_with_sales: 30,
    best_day: { date: '2026-09-14', revenue: 1000 },
  },
  rows: salesRows,
  rows_total: 30,
  series: {
    sales: salesRows.map((r) => ({ date: r.date, revenue: r.revenue, count: r.count, previous: { revenue: r.previous_revenue, count: r.previous_count }, ...(r.so_far ? { so_far: true } : {}) })),
    days_of_data: 30,
    payments: [
      { method: 'M-Pesa', amount: 18000 },
      { method: 'Cash', amount: 9000 },
      { method: 'On credit', amount: 3000 },
    ],
    top_products: [
      { item_code: 'ITM-1', name: 'Soap bar', revenue: 9000 },
      { item_code: 'ITM-2', name: 'Maize flour 2kg', revenue: 6000 },
      { item_code: 'ITM-3', name: 'Cooking oil 1 litre', revenue: 4500 },
    ],
  },
});

export const SALES_EMPTY = base('sales', {
  summary: { revenue: 0, gross_total: 0, previous_revenue: 0, change_pct: null, count: 0, previous_count: 0, count_change_pct: null, average_basket: 0, days_with_sales: 0, best_day: null },
  rows: [],
  rows_total: 0,
  series: { sales: [], days_of_data: 0, payments: [], top_products: [] },
  period: { ...PERIOD, days_of_data: 0 },
});

// The Build Pack's example: revenue 100,000, cost of goods 62,000, running costs 15,000 gives 23,000 and 23%
const profitRows = [
  { period: '2026-10-05', sales: 100000, cost_of_goods: 62000, gross_profit: 38000, running_costs: 0, net_profit: 38000, margin_pct: 38, so_far: false },
  { period: '2026-10-06', sales: 0, cost_of_goods: 0, gross_profit: 0, running_costs: 15000, net_profit: -15000, margin_pct: 0, so_far: false },
  { period: '2026-10-13', sales: 0, cost_of_goods: 0, gross_profit: 0, running_costs: 0, net_profit: 0, margin_pct: 0, so_far: true },
];
export const PROFIT = base('profit', {
  group_by: 'day',
  summary: {
    revenue: 100000,
    previous_revenue: 80000,
    revenue_change_pct: 25,
    sales_counted: 100000,
    sales_not_counted: 0,
    cost_of_goods: 62000,
    previous_cost_of_goods: 50000,
    gross_profit: 38000,
    gross_margin_pct: 38,
    running_costs: 15000,
    previous_running_costs: 15000,
    net_profit: 23000,
    previous_net_profit: 15000,
    change_pct: 53.3,
    margin_pct: 23,
    previous_margin_pct: 18.8,
    uncosted_products: 0,
    estimated: false,
  },
  rows: profitRows,
  rows_total: 3,
  series: {
    waterfall: [
      { key: 'sales', amount: 100000 },
      { key: 'cost_of_goods', amount: 62000 },
      { key: 'running_costs', amount: 15000 },
      { key: 'net_profit', amount: 23000 },
    ],
    over_time: profitRows.map((r) => ({ period: r.period, net_profit: r.net_profit, so_far: r.so_far })),
  },
});

export const PROFIT_WITH_GAPS = {
  ...PROFIT,
  summary: { ...PROFIT.summary, revenue: 104200, sales_not_counted: 4200, uncosted_products: 3, estimated: true },
};

export const OWED = base('owed', {
  period: null,
  summary: {
    amount: 24500,
    customers: 2,
    oldest_days: 42,
    over_30_amount: 3500,
    over_30_share_pct: 14.3,
    bands: [
      { key: '0_7', from: 0, to: 7, amount: 21000, customers: 1 },
      { key: '8_14', from: 8, to: 14, amount: 0, customers: 0 },
      { key: '15_30', from: 15, to: 30, amount: 0, customers: 0 },
      { key: 'over_30', from: 31, to: null, amount: 3500, customers: 1 },
    ],
  },
  rows: [
    { customer: 'CUST-0002', name: 'Brian Otieno', mobile: null, amount: 21000, oldest_days: 3, oldest_sale: '2026-10-10', bands: { '0_7': 21000, '8_14': 0, '15_30': 0, over_30: 0 } },
    { customer: 'CUST-0001', name: 'Wanjiru Kamau', mobile: '0712345678', amount: 3500, oldest_days: 42, oldest_sale: '2026-09-01', bands: { '0_7': 0, '8_14': 0, '15_30': 0, over_30: 3500 } },
  ],
  rows_total: 2,
  series: {
    age_bands: [
      { key: '0_7', from: 0, to: 7, amount: 21000, customers: 1 },
      { key: '8_14', from: 8, to: 14, amount: 0, customers: 0 },
      { key: '15_30', from: 15, to: 30, amount: 0, customers: 0 },
      { key: 'over_30', from: 31, to: null, amount: 3500, customers: 1 },
    ],
  },
});

export const OWED_EMPTY = base('owed', {
  period: null,
  summary: { amount: 0, customers: 0, oldest_days: 0, over_30_amount: 0, over_30_share_pct: 0, bands: [] },
  rows: [],
  rows_total: 0,
  series: { age_bands: [] },
});

export const COSTS = base('running-costs', {
  summary: { total: 16400, previous_total: 12000, change_pct: 36.7, categories: 3, daily_average: 546.67, biggest: { category: 'Rent', amount: 12000, share_pct: 73.2 } },
  rows: [
    { category: 'Rent', account: 'Rent - DS', amount: 12000, share_pct: 73.2, entries: 1 },
    { category: 'Electricity', account: 'Electricity - DS', amount: 4000, share_pct: 24.4, entries: 3 },
    { category: 'Transport', account: 'Transport - DS', amount: 400, share_pct: 2.4, entries: 1 },
  ],
  rows_total: 3,
  series: {
    categories: [
      { category: 'Rent', account: 'Rent - DS', amount: 12000 },
      { category: 'Electricity', account: 'Electricity - DS', amount: 4000 },
      { category: 'Transport', account: 'Transport - DS', amount: 400 },
    ],
    by_day: [
      { date: '2026-10-02', amount: 12000, so_far: false },
      { date: '2026-10-05', amount: 2500, so_far: false },
      { date: '2026-10-13', amount: 400, so_far: true },
    ],
  },
});

export const STOCK_SUMMARY = base('stock-summary', {
  period: null,
  summary: { stores: 2, quantity: 160, value: 40000 },
  rows: [
    { store: 'Stores', warehouse: 'Stores - DS', quantity: 120, value: 30000, share_pct: 75 },
    { store: 'Shop floor', warehouse: 'Shop floor - DS', quantity: 40, value: 10000, share_pct: 25 },
  ],
  rows_total: 2,
  series: { by_store: [{ store: 'Stores', amount: 30000 }, { store: 'Shop floor', amount: 10000 }] },
});

export const STOCK_VALUE = base('stock-value', {
  period: null,
  summary: { value: 20000, categories: 2, items: 13, biggest: { category: 'Snacks', value: 14000, share_pct: 70 } },
  rows: [
    { category: 'Snacks', value: 14000, quantity: 300, items: 9, share_pct: 70 },
    { category: 'Drinks', value: 6000, quantity: 100, items: 4, share_pct: 30 },
  ],
  rows_total: 2,
  series: { by_category: [{ category: 'Snacks', amount: 14000 }, { category: 'Drinks', amount: 6000 }] },
});

export const AGING = base('aging-stock', {
  period: null,
  summary: { products: 2, products_in_stock: 8, value: 800, oldest_days: 200, share_of_products_pct: 25 },
  rows: [
    { item_code: 'ITM-9', name: 'Rice 5kg', quantity: 5, value: 600, age_days: 200, sold_30_days: 0, stores: 1, age_band: 'over_90' },
    { item_code: 'ITM-8', name: 'Salt 500g', quantity: 4, value: 200, age_days: 20, sold_30_days: 0, stores: 1, age_band: '0_30' },
  ],
  rows_total: 2,
  series: {
    age_bands: [
      { key: '0_30', from: 0, to: 30, value: 200, products: 1 },
      { key: '31_60', from: 31, to: 60, value: 0, products: 0 },
      { key: '61_90', from: 61, to: 90, value: 0, products: 0 },
      { key: 'over_90', from: 91, to: null, value: 600, products: 1 },
    ],
  },
});

export const QUESTIONS_OWNER = {
  role: 'owner',
  questions: [
    { key: 'sold', opens: 'sales', reports: ['sales'], as_of: false },
    { key: 'profit', opens: 'profit', reports: ['profit'], as_of: false },
    { key: 'owed', opens: 'owed', reports: ['owed'], as_of: true },
    { key: 'costs', opens: 'running-costs', reports: ['running-costs'], as_of: false },
    { key: 'stock', opens: 'stock-summary', reports: ['stock-summary', 'stock-value'], as_of: true },
    { key: 'not_selling', opens: 'aging-stock', reports: ['aging-stock'], as_of: true },
  ],
};

export const PREVIEWS_OWNER = {
  role: 'owner',
  questions: QUESTIONS_OWNER.questions.map((q) => ({
    ...q,
    preview: {
      sold: { revenue: 30000, count: 150, change_pct: 20 },
      profit: { net_profit: 23000, margin_pct: 23, change_pct: 53.3 },
      owed: { amount: 24500, customers: 2 },
      costs: { total: 16400, change_pct: 36.7 },
      stock: { value: 40000, quantity: 160, stores: 2 },
      not_selling: null,
    }[q.key],
  })),
};

export const QUESTIONS_CASHIER = { role: 'cashier', questions: [{ key: 'sold', opens: 'sales', reports: ['sales'], as_of: false }] };
