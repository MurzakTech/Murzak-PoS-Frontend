import S from '../strings';
import fill from '../labels/fill';
import { formatMoney } from '../components/format';
import { changeInfo } from '../home/homeModel';
import { dayMonth, shortDate } from '../charts/chartFormat';
import T from './strings.reports';

/**
 * The small decisions the Reports pages make about the numbers they are given, kept free of drawing so each can be
 * tested alone: which report is which question, the columns of each table (one list used by the table and by the CSV, so
 * they always agree), the figures above the charts, the one-line answers on the landing page, and the "More reports"
 * list that keeps every current report and sub-report reachable.
 */
export const REPORT_NAMES = ['sales', 'profit', 'owed', 'running-costs', 'stock-summary', 'stock-value', 'aging-stock'];

// question: the landing page question the report belongs to. asOf: the report is about the shop as it is now (no period).
export const REPORT_META = {
  sales: { question: 'sold', asOf: false },
  profit: { question: 'profit', asOf: false },
  owed: { question: 'owed', asOf: true },
  'running-costs': { question: 'costs', asOf: false },
  'stock-summary': { question: 'stock', asOf: true, tab: 'summary' },
  'stock-value': { question: 'stock', asOf: true, tab: 'value' },
  'aging-stock': { question: 'not_selling', asOf: true },
};

export const isReportName = (name) => Object.prototype.hasOwnProperty.call(REPORT_META, name);

export const reportAddress = (name) => `/reports/${name}`;

/** The two views of the stock question, as tabs */
export const STOCK_TABS = ['stock-summary', 'stock-value'];

/** The current screen that holds more detail than a new report, if there is one (opened with oldScreen) */
export const DETAIL_SCREEN = {
  sales: '/reports/sales-analytics',
  'stock-summary': '/reports/inventory-summary',
  'stock-value': '/reports/inventory-valuation',
  'aging-stock': '/reports/aging-stock',
};

/**
 * The "More reports" list: the six current reports and their 13 sub-reports, each with the address of its current
 * screen. Every one stays reachable (AC-40). `links` names the words in strings.reports.js.
 */
export const MORE_REPORTS = [
  { key: 'sales', links: [{ key: 'main', path: '/reports/sales-analytics' }] },
  { key: 'summary', links: [{ key: 'main', path: '/reports/inventory-summary' }] },
  {
    key: 'value',
    links: [
      { key: 'main', path: '/reports/inventory-valuation' },
      { key: 'byCategory', path: '/reports/inventory-valuation/value-by-category' },
      { key: 'costMethod', path: '/reports/inventory-valuation/cost-method-comparison' },
      { key: 'trends', path: '/reports/inventory-valuation/value-trends' },
    ],
  },
  {
    key: 'movement',
    links: [
      { key: 'main', path: '/reports/stock-movement' },
      { key: 'turnover', path: '/reports/stock-movement/turnover' },
      { key: 'daysOnHand', path: '/reports/stock-movement/days-on-hand' },
      { key: 'patterns', path: '/reports/stock-movement/movement-patterns' },
    ],
  },
  {
    key: 'aging',
    links: [
      { key: 'main', path: '/reports/aging-stock' },
      { key: 'aging', path: '/reports/aging-stock/stock-aging' },
      { key: 'risk', path: '/reports/aging-stock/obsolescence-risk' },
      { key: 'advice', path: '/reports/aging-stock/aging-recommendations' },
    ],
  },
  {
    key: 'performance',
    links: [
      { key: 'main', path: '/reports/performance-metrics' },
      { key: 'accuracy', path: '/reports/performance-metrics/accuracy' },
      { key: 'variance', path: '/reports/performance-metrics/variance' },
      { key: 'adjustments', path: '/reports/performance-metrics/adjustment-trends' },
      { key: 'transfers', path: '/reports/performance-metrics/transfer-efficiency' },
    ],
  },
];

// ---------- Words for dates ----------

/** '2026-10' gives 'Oct 2026'; '2026-10-08' gives 'Thu 8 Oct' */
export const periodLabel = (value) => {
  const text = String(value || '');
  const month = text.match(/^(\d{4})-(\d{2})$/);
  if (month) return `${S.charts.months[Number(month[2]) - 1]} ${month[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? shortDate(text) : text;
};

/** '2026-10' gives 'Oct'; '2026-10-08' gives '8 Oct' (the short words under a column) */
export const tickLabel = (value) => {
  const text = String(value || '');
  const month = text.match(/^(\d{4})-(\d{2})$/);
  if (month) return S.charts.months[Number(month[2]) - 1];
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? dayMonth(text) : text;
};

// ---------- Cells ----------

const NUMBER = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });

const FORMAT = {
  money: (value) => formatMoney(value),
  number: (value) => NUMBER(value),
  percent: (value) => `${Number(value || 0)}%`,
  text: (value) => (value === null || value === undefined ? '' : String(value)),
  date: (value, row) => (row && row.so_far ? fill(T.sales.soFar, { date: periodLabel(value) }) : periodLabel(value)),
  days: (value) => (Number(value) > 0 ? fill(T.owed.oldest, { days: NUMBER(value) }) : T.owed.oldestToday),
};
const RIGHT = new Set(['money', 'number', 'percent', 'days']);

const valueOf = (column, row) => (column.get ? column.get(row) : row[column.key]);
export const formatCell = (column, row) => FORMAT[column.kind](valueOf(column, row), row);
/** The plain value for the spreadsheet: numbers stay numbers, dates stay yyyy-mm-dd */
export const rawCell = (column, row) => {
  const value = valueOf(column, row);
  return value === null || value === undefined ? '' : value;
};

const col = (key, header, kind, extra = {}) => ({ key, header, kind, ...extra });

/** The columns of each report's table. The table and the spreadsheet are both made from this list. */
export const columnsFor = (name, data) => {
  const month = data && data.group_by === 'month';
  switch (name) {
    case 'sales': {
      const C = T.sales.columns;
      return [col('date', C.date, 'date'), col('revenue', C.revenue, 'money'), col('count', C.count, 'number'), col('average_basket', C.basket, 'money'), col('previous_revenue', C.previous, 'money')];
    }
    case 'profit': {
      const C = T.profit.columns;
      return [
        col('period', month ? C.periodMonth : C.period, 'date'),
        col('sales', C.sales, 'money'),
        col('cost_of_goods', C.cost, 'money'),
        col('running_costs', C.running, 'money'),
        col('net_profit', C.net, 'money'),
        col('margin_pct', C.margin, 'percent'),
      ];
    }
    case 'owed': {
      const C = T.owed.columns;
      return [
        col('name', C.customer, 'text'),
        col('amount', C.amount, 'money'),
        col('oldest_days', C.oldest, 'days'),
        col('band1', C.band1, 'money', { get: (r) => (r.bands || {})['0_7'] }),
        col('band2', C.band2, 'money', { get: (r) => (r.bands || {})['8_14'] }),
        col('band3', C.band3, 'money', { get: (r) => (r.bands || {})['15_30'] }),
        col('band4', C.band4, 'money', { get: (r) => (r.bands || {}).over_30 }),
        col('mobile', C.phone, 'text'),
      ];
    }
    case 'running-costs': {
      const C = T.costs.columns;
      return [col('category', C.category, 'text'), col('amount', C.amount, 'money'), col('share_pct', C.share, 'percent'), col('entries', C.entries, 'number')];
    }
    case 'stock-summary': {
      const C = T.stock.columnsStore;
      return [col('store', C.store, 'text'), col('quantity', C.quantity, 'number'), col('value', C.value, 'money'), col('share_pct', C.share, 'percent')];
    }
    case 'stock-value': {
      const C = T.stock.columnsCategory;
      return [col('category', C.category, 'text'), col('items', C.items, 'number'), col('quantity', C.quantity, 'number'), col('value', C.value, 'money'), col('share_pct', C.share, 'percent')];
    }
    case 'aging-stock': {
      const C = T.aging.columns;
      return [col('name', C.name, 'text'), col('quantity', C.quantity, 'number'), col('value', C.value, 'money'), col('age_days', C.age, 'number'), col('stores', C.stores, 'number')];
    }
    default:
      return [];
  }
};

/** The same list as columns for the shared Table component */
export const tableColumns = (columns) =>
  columns.map((column) => ({
    key: column.key,
    header: column.header,
    money: column.kind === 'money',
    align: RIGHT.has(column.kind) && column.kind !== 'money' ? 'right' : undefined,
    nowrap: column.kind === 'date' || column.kind === 'days' || undefined,
    render: (row) => formatCell(column, row),
  }));

/** A row key the Table can use */
const KEY_FIELD = { sales: 'date', profit: 'period', owed: 'customer', 'running-costs': 'account', 'stock-summary': 'warehouse', 'stock-value': 'category', 'aging-stock': 'item_code' };
export const withKeys = (name, rows) => (rows || []).map((row, i) => ({ ...row, id: `${row[KEY_FIELD[name]] === undefined ? '' : row[KEY_FIELD[name]]}#${i}` }));

// ---------- The spreadsheet ----------

// A cell that starts with = + - or @ would be read as a formula by a spreadsheet, so a text cell gets a quote in front
const cell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/** The rows of the report as CSV text: the column names, then one line per row, with the same numbers as the table */
export const reportCsv = (columns, rows) => {
  const lines = [columns.map((c) => c.header), ...(rows || []).map((row) => columns.map((c) => rawCell(c, row)))];
  return `${lines.map((line) => line.map(cell).join(',')).join('\n')}\n`;
};

export const csvName = (name, date) => fill(T.page.exportName, { name, date });

// ---------- The figures above the charts ----------

const pctChange = (current, previous) => {
  const before = Number(previous);
  if (!Number.isFinite(before) || before === 0 || previous === null || previous === undefined) return null;
  return Math.round(((Number(current) - before) / Math.abs(before)) * 1000) / 10;
};

const count = (value) => NUMBER(value);
export const customersWords = (n) => (Number(n) === 1 ? T.answers.customerOne : fill(T.answers.customerMany, { count: NUMBER(n) }));

/**
 * The three to five numbers shown above the charts: [{ key, label, value, note?, change?, goodWhen? }]. `change` is
 * { direction, text } (an arrow and words, never colour alone); goodWhen says which way is good news.
 */
export const figuresFor = (name, data) => {
  const s = (data && data.summary) || {};
  switch (name) {
    case 'sales':
      return [
        { key: 'revenue', label: T.sales.summary.revenue, value: formatMoney(s.revenue), change: changeInfo(s.change_pct, T.sales.change), goodWhen: 'up' },
        { key: 'count', label: T.sales.summary.count, value: count(s.count), change: changeInfo(s.count_change_pct, T.sales.change), goodWhen: 'up' },
        { key: 'basket', label: T.sales.summary.basket, value: formatMoney(s.average_basket) },
      ];
    case 'profit':
      return [
        { key: 'revenue', label: T.profit.summary.revenue, value: formatMoney(s.revenue), change: changeInfo(s.revenue_change_pct, T.profit.change), goodWhen: 'up' },
        { key: 'cost', label: T.profit.summary.cost, value: formatMoney(s.cost_of_goods), change: changeInfo(pctChange(s.cost_of_goods, s.previous_cost_of_goods), T.profit.change), goodWhen: 'down' },
        { key: 'running', label: T.profit.summary.running, value: formatMoney(s.running_costs), change: changeInfo(pctChange(s.running_costs, s.previous_running_costs), T.profit.change), goodWhen: 'down' },
        { key: 'net', label: T.profit.summary.net, value: formatMoney(s.net_profit), change: changeInfo(s.change_pct, T.profit.change), goodWhen: 'up', strong: true },
        { key: 'margin', label: T.profit.summary.margin, value: `${Number(s.margin_pct || 0)}%` },
      ];
    case 'owed':
      return [
        { key: 'total', label: T.owed.summary.total, value: formatMoney(s.amount) },
        { key: 'customers', label: T.owed.summary.customers, value: count(s.customers), note: s.customers ? fill(T.owed.customersNote, { days: NUMBER(s.oldest_days) }) : undefined },
        { key: 'older', label: T.owed.summary.older, value: formatMoney(s.over_30_amount), note: Number(s.over_30_amount) > 0 ? fill(T.owed.olderNote, { pct: s.over_30_share_pct }) : T.owed.olderNone },
      ];
    case 'running-costs': {
      const biggest = s.biggest;
      return [
        { key: 'total', label: T.costs.summary.total, value: formatMoney(s.total), change: changeInfo(s.change_pct, T.costs.change), goodWhen: 'down' },
        { key: 'biggest', label: T.costs.summary.biggest, value: biggest ? biggest.category : '-', note: biggest ? fill(T.costs.biggestNote, { amount: formatMoney(biggest.amount), pct: biggest.share_pct }) : T.costs.biggestNone },
        { key: 'daily', label: T.costs.summary.daily, value: formatMoney(s.daily_average) },
      ];
    }
    case 'stock-summary':
      return [
        { key: 'value', label: T.stock.summary.value, value: formatMoney(s.value), note: T.stock.valueOnlyNote },
        { key: 'quantity', label: T.stock.summary.quantity, value: count(s.quantity) },
        { key: 'stores', label: T.stock.summary.stores, value: count(s.stores) },
      ];
    case 'stock-value': {
      const biggest = s.biggest;
      return [
        { key: 'value', label: T.stock.summary.value, value: formatMoney(s.value), note: T.stock.valueOnlyNote },
        { key: 'categories', label: T.stock.summary.categories, value: count(s.categories) },
        { key: 'biggest', label: T.stock.summary.biggest, value: biggest ? biggest.category : '-', note: biggest ? fill(T.stock.biggestNote, { pct: biggest.share_pct }) : undefined },
      ];
    }
    case 'aging-stock':
      return [
        { key: 'products', label: T.aging.summary.products, value: count(s.products), note: s.products ? fill(T.aging.productsNote, { pct: s.share_of_products_pct }) : undefined },
        { key: 'value', label: T.aging.summary.value, value: formatMoney(s.value) },
        { key: 'oldest', label: T.aging.summary.oldest, value: s.products ? fill(T.aging.oldestValue, { days: NUMBER(s.oldest_days) }) : T.aging.oldestNone },
      ];
    default:
      return [];
  }
};

/** True when the report has nothing to show, so the page says so with one action instead of empty charts */
export const isEmptyReport = (name, data) => {
  if (!data) return false;
  const s = data.summary || {};
  switch (name) {
    case 'sales':
      return Number(s.count) === 0 && Number(s.revenue) === 0;
    case 'profit':
      return Number(s.revenue) === 0 && Number(s.cost_of_goods) === 0 && Number(s.running_costs) === 0 && Number(s.net_profit) === 0;
    case 'running-costs':
      return Number(s.total) === 0 && data.rows_total === 0;
    default:
      return data.rows_total === 0;
  }
};

/** The notes under the figures of the profit report: products left out, and costs that are estimates */
export const profitNotes = (data) => {
  const s = (data && data.summary) || {};
  return {
    uncosted: Number(s.uncosted_products) || 0,
    amount: Number(s.sales_not_counted) || 0,
    estimated: Boolean(s.estimated),
  };
};

export const uncostedWords = (n) => (Number(n) === 1 ? T.profit.notCountedOne : fill(T.profit.notCountedMany, { count: NUMBER(n) }));

export const productsWords = (n) => (Number(n) === 1 ? T.aging.productOne : fill(T.aging.productMany, { count: NUMBER(n) }));

// ---------- The landing page ----------

/** The one-line answer for a question card from its preview numbers; '' when there is none */
export const answerFor = (key, preview) => {
  if (!preview) return '';
  switch (key) {
    case 'sold':
      return Number(preview.revenue) > 0 ? fill(T.answers.sold, { amount: formatMoney(preview.revenue) }) : T.answers.soldNone;
    case 'profit': {
      const net = Number(preview.net_profit);
      if (net < 0) return fill(T.answers.profitLoss, { amount: formatMoney(Math.abs(net)) });
      if (net === 0) return T.answers.profitNone;
      return fill(T.answers.profit, { amount: formatMoney(net), margin: Number(preview.margin_pct) || 0 });
    }
    case 'owed':
      return Number(preview.amount) > 0 ? fill(T.answers.owed, { amount: formatMoney(preview.amount), customers: customersWords(preview.customers) }) : T.answers.owedNone;
    case 'costs':
      return Number(preview.total) > 0 ? fill(T.answers.costs, { amount: formatMoney(preview.total) }) : T.answers.costsNone;
    case 'stock':
      return Number(preview.value) > 0 || Number(preview.quantity) > 0 ? fill(T.answers.stock, { amount: formatMoney(preview.value) }) : T.answers.stockNone;
    default:
      return '';
  }
};

// ---------- What the charts draw ----------

/** Columns of one number by day or month, for the net profit and running cost charts */
export const columnRows = (items, valueKey, dateKey = 'period') =>
  (items || []).map((item) => ({ key: item[dateKey], label: tickLabel(item[dateKey]), full: periodLabel(item[dateKey]), value: Number(item[valueKey]) || 0, soFar: Boolean(item.so_far) }));

/** Bars of categories or stores; the folded rest is named "Other (n more)" */
export const barRows = (items, nameKey, otherWords) =>
  (items || []).map((item, i) => ({
    key: `${item.other ? 'other' : item[nameKey]}#${i}`,
    name: item.other ? fill(otherWords, { count: item.count }) : String(item[nameKey]),
    value: Number(item.amount) || 0,
    other: Boolean(item.other),
  }));

/** The parts of the age bar: owed by age of the debt, or stock value by age of the stock */
export const ageParts = (bands, words, amountKey, countKey) =>
  (bands || []).map((band) => ({ key: band.key, label: words[band.key], amount: Number(band[amountKey]) || 0, count: Number(band[countKey]) || 0 }));

export const waterfallSteps = (steps) => (steps || []).map((step) => ({ key: step.key, label: T.profit.steps[step.key], amount: Number(step.amount) || 0 }));

/** The period in words: 'the last 30 days', or the dates the server resolved for a custom range */
export { rangeWords } from '../home/homeModel';
