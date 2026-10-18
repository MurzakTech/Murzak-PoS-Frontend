import { REDIRECTS } from '../redirects/redirectTable';
import {
  ageParts,
  answerFor,
  barRows,
  columnRows,
  columnsFor,
  csvName,
  customersWords,
  figuresFor,
  formatCell,
  isEmptyReport,
  isReportName,
  MORE_REPORTS,
  periodLabel,
  productsWords,
  profitNotes,
  rawCell,
  REPORT_META,
  REPORT_NAMES,
  reportCsv,
  tableColumns,
  tickLabel,
  uncostedWords,
  waterfallSteps,
  withKeys,
} from './reportsModel';
import T from './strings.reports';
import { AGING, COSTS, OWED, OWED_EMPTY, PROFIT, PROFIT_WITH_GAPS, SALES, SALES_EMPTY, STOCK_SUMMARY, STOCK_VALUE } from './__fixtures__/reportAnswers';

const ANSWERS = { sales: SALES, profit: PROFIT, owed: OWED, 'running-costs': COSTS, 'stock-summary': STOCK_SUMMARY, 'stock-value': STOCK_VALUE, 'aging-stock': AGING };

describe('the reports and their questions', () => {
  test('there are seven reports under six questions, and the stock question has two views', () => {
    expect(REPORT_NAMES).toHaveLength(7);
    expect(new Set(Object.values(REPORT_META).map((m) => m.question)).size).toBe(6);
    expect(REPORT_NAMES.filter((n) => REPORT_META[n].question === 'stock')).toEqual(['stock-summary', 'stock-value']);
  });

  test('every report has a question to name it', () => {
    REPORT_NAMES.forEach((name) => expect(T.questions[REPORT_META[name].question].title).toMatch(/\?$/));
  });

  test('only the reports about now ignore the period', () => {
    expect(REPORT_NAMES.filter((n) => REPORT_META[n].asOf)).toEqual(['owed', 'stock-summary', 'stock-value', 'aging-stock']);
  });

  test('an unknown name is not a report', () => {
    expect(isReportName('profit')).toBe(true);
    expect(isReportName('stock-movement')).toBe(false);
    expect(isReportName('toString')).toBe(false);
    expect(isReportName(undefined)).toBe(false);
  });

  test('the file name says the report and the day', () => {
    expect(csvName('profit', '2026-10-13')).toBe('report-profit-2026-10-13.csv');
  });
});

describe('More reports keeps every current report and sub-report reachable (AC-40)', () => {
  const links = MORE_REPORTS.flatMap((group) => group.links);

  test('there are the 6 current reports and their 13 sub-reports', () => {
    expect(MORE_REPORTS).toHaveLength(6);
    expect(links).toHaveLength(19);
    expect(links.filter((l) => l.key === 'main')).toHaveLength(6);
  });

  test('each link is a real address of a current screen', () => {
    const known = REDIRECTS.map((r) => r.from);
    expect(links.filter((l) => !known.includes(l.path)).map((l) => l.path)).toEqual([]);
  });

  test('no address is listed twice', () => {
    const paths = links.map((l) => l.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('every link has words', () => {
    MORE_REPORTS.forEach((group) => {
      const words = T.more.groups[group.key];
      expect(words.title).toBeTruthy();
      group.links.forEach((link) => expect(words.links[link.key]).toBeTruthy());
    });
  });

  test('all thirteen sub-report screens of the current Reports pages are among them', () => {
    const subs = [
      '/reports/inventory-valuation/value-by-category',
      '/reports/inventory-valuation/cost-method-comparison',
      '/reports/inventory-valuation/value-trends',
      '/reports/stock-movement/turnover',
      '/reports/stock-movement/days-on-hand',
      '/reports/stock-movement/movement-patterns',
      '/reports/aging-stock/stock-aging',
      '/reports/aging-stock/obsolescence-risk',
      '/reports/aging-stock/aging-recommendations',
      '/reports/performance-metrics/accuracy',
      '/reports/performance-metrics/variance',
      '/reports/performance-metrics/adjustment-trends',
      '/reports/performance-metrics/transfer-efficiency',
    ];
    expect(subs.filter((p) => !links.some((l) => l.path === p))).toEqual([]);
  });
});

describe('the words for dates', () => {
  test('a month and a day', () => {
    expect(periodLabel('2026-10')).toBe('Oct 2026');
    expect(periodLabel('2026-10-08')).toBe('Thu 8 Oct');
    expect(tickLabel('2026-10')).toBe('Oct');
    expect(tickLabel('2026-10-08')).toBe('8 Oct');
  });
  test('anything else is left as it is', () => {
    expect(periodLabel('')).toBe('');
    expect(periodLabel('Rent')).toBe('Rent');
  });
});

describe('the tables and the spreadsheet come from the same columns', () => {
  test.each(REPORT_NAMES)('%s: one table column and one spreadsheet column for each column', (name) => {
    const columns = columnsFor(name, ANSWERS[name]);
    expect(columns.length).toBeGreaterThanOrEqual(3);
    expect(tableColumns(columns).map((c) => c.key)).toEqual(columns.map((c) => c.key));
    const csv = reportCsv(columns, ANSWERS[name].rows).trim().split('\n');
    expect(csv).toHaveLength(ANSWERS[name].rows.length + 1);
    expect(csv[0]).toBe(columns.map((c) => `"${c.header}"`).join(','));
  });

  test.each(REPORT_NAMES)('%s: every header is a plain word with its unit', (name) => {
    columnsFor(name, ANSWERS[name]).forEach((c) => expect(c.header).toMatch(/^[A-Z0-9]/));
  });

  test('money is written as KES in the table and as a plain number in the spreadsheet', () => {
    const [date, revenue] = columnsFor('sales', SALES);
    const row = SALES.rows[0];
    expect(formatCell(revenue, row)).toBe('KES 1,000');
    expect(rawCell(revenue, row)).toBe(1000);
    expect(formatCell(date, row)).toBe('Mon 14 Sep');
    expect(rawCell(date, row)).toBe('2026-09-14');
  });

  test('today is marked so far', () => {
    const [date] = columnsFor('sales', SALES);
    expect(formatCell(date, SALES.rows[29])).toBe('Tue 13 Oct (so far)');
  });

  test('the sales spreadsheet adds up to the sales shown', () => {
    const columns = columnsFor('sales', SALES);
    const lines = reportCsv(columns, SALES.rows).trim().split('\n').slice(1);
    const total = lines.reduce((sum, line) => sum + Number(line.split(',')[1].replace(/"/g, '')), 0);
    expect(total).toBe(SALES.summary.revenue);
  });

  test('a profit row by month has a Month heading and prints the month', () => {
    const month = { ...PROFIT, group_by: 'month' };
    expect(columnsFor('profit', month)[0].header).toBe('Month');
    expect(columnsFor('profit', PROFIT)[0].header).toBe('Day');
    expect(formatCell(columnsFor('profit', month)[0], { period: '2026-10' })).toBe('Oct 2026');
  });

  test('the debt columns read the age bands, and a day count reads as words', () => {
    const columns = columnsFor('owed', OWED);
    const band4 = columns.find((c) => c.key === 'band4');
    expect(rawCell(band4, OWED.rows[1])).toBe(3500);
    const oldest = columns.find((c) => c.key === 'oldest_days');
    expect(formatCell(oldest, OWED.rows[1])).toBe('42 days');
    expect(formatCell(oldest, { oldest_days: 0 })).toBe('Today');
  });

  test('a text that would be read as a formula gets a quote in front', () => {
    const columns = columnsFor('running-costs', COSTS);
    const csv = reportCsv(columns, [{ category: '=SUM(A1)', amount: 1, share_pct: 1, entries: 1 }]);
    expect(csv.split('\n')[1].startsWith("\"'=SUM(A1)\"")).toBe(true);
  });

  test('a comma or a quote in a name stays inside its cell', () => {
    const columns = columnsFor('running-costs', COSTS);
    const csv = reportCsv(columns, [{ category: 'Rent, "shop"', amount: 5, share_pct: 100, entries: 1 }]);
    expect(csv.split('\n')[1]).toBe('"Rent, ""shop""","5","100","1"');
  });

  test('numbers are right-aligned and money is flagged for the table', () => {
    const cols = tableColumns(columnsFor('sales', SALES));
    expect(cols.find((c) => c.key === 'revenue').money).toBe(true);
    expect(cols.find((c) => c.key === 'count').align).toBe('right');
    expect(cols.find((c) => c.key === 'date').nowrap).toBe(true);
  });

  test('rows get a key that stays unique even when a name repeats', () => {
    const keyed = withKeys('running-costs', [{ account: 'A' }, { account: 'A' }]);
    expect(new Set(keyed.map((r) => r.id)).size).toBe(2);
    expect(withKeys('sales', undefined)).toEqual([]);
  });
});

describe('the figures above the charts', () => {
  const byKey = (name, data) => Object.fromEntries(figuresFor(name, data).map((f) => [f.key, f]));

  test('profit follows the Build Pack example: KES 23,000 and 23%', () => {
    const f = byKey('profit', PROFIT);
    expect(f.revenue.value).toBe('KES 100,000');
    expect(f.cost.value).toBe('KES 62,000');
    expect(f.running.value).toBe('KES 15,000');
    expect(f.net.value).toBe('KES 23,000');
    expect(f.margin.value).toBe('23%');
    expect(figuresFor('profit', PROFIT)).toHaveLength(5);
  });

  test('a change says which way and how much, in words', () => {
    const f = byKey('profit', PROFIT);
    expect(f.net.change).toEqual({ direction: 'up', text: 'Up 53.3% on the period before' });
    expect(f.net.goodWhen).toBe('up');
    expect(f.cost.change.direction).toBe('up');
    expect(f.cost.goodWhen).toBe('down');
    expect(f.running.change.direction).toBe('flat');
  });

  test('a loss is shown with a minus sign', () => {
    const f = byKey('profit', { ...PROFIT, summary: { ...PROFIT.summary, net_profit: -700, margin_pct: -3 } });
    expect(f.net.value).toBe('-KES 700');
    expect(f.margin.value).toBe('-3%');
  });

  test('nothing to compare with says so', () => {
    const f = byKey('sales', SALES_EMPTY);
    expect(f.revenue.change.direction).toBe('none');
    expect(f.revenue.value).toBe('KES 0');
  });

  test('sales: revenue, number of sales and the average sale', () => {
    const f = byKey('sales', SALES);
    expect([f.revenue.value, f.count.value, f.basket.value]).toEqual(['KES 30,000', '150', 'KES 200']);
  });

  test('owed: the total, the customers and what is more than 30 days old', () => {
    const f = byKey('owed', OWED);
    expect([f.total.value, f.customers.value, f.older.value]).toEqual(['KES 24,500', '2', 'KES 3,500']);
    expect(f.customers.note).toBe('The oldest debt is 42 days old');
    expect(f.older.note).toBe('14.3% of what is owed');
    expect(byKey('owed', OWED_EMPTY).older.note).toBe('Nothing is more than 30 days old');
  });

  test('running costs: the total, the biggest cost and the daily average', () => {
    const f = byKey('running-costs', COSTS);
    expect(f.total.value).toBe('KES 16,400');
    expect(f.total.goodWhen).toBe('down');
    expect(f.biggest.value).toBe('Rent');
    expect(f.biggest.note).toBe('KES 12,000, 73.2% of your running costs');
    expect(f.daily.value).toBe('KES 546.67');
  });

  test('stock: value, items and stores; value by category names the biggest', () => {
    expect(byKey('stock-summary', STOCK_SUMMARY).quantity.value).toBe('160');
    const v = byKey('stock-value', STOCK_VALUE);
    expect(v.value.value).toBe('KES 20,000');
    expect(v.biggest.value).toBe('Snacks');
  });

  test('not selling: how many products, the money tied up and the oldest', () => {
    const f = byKey('aging-stock', AGING);
    expect([f.products.value, f.value.value, f.oldest.value]).toEqual(['2', 'KES 800', '200 days']);
    expect(f.products.note).toBe('25% of the products you have in stock');
  });

  test('nothing is ever blank: a missing biggest shows a dash', () => {
    const f = byKey('running-costs', { summary: { total: 0, biggest: null } });
    expect(f.biggest.value).toBe('-');
  });
});

describe('when a report has nothing to show', () => {
  test('sales with no sales, profit with nothing, a list with no rows', () => {
    expect(isEmptyReport('sales', SALES_EMPTY)).toBe(true);
    expect(isEmptyReport('sales', SALES)).toBe(false);
    expect(isEmptyReport('profit', { summary: { revenue: 0, cost_of_goods: 0, running_costs: 0, net_profit: 0 } })).toBe(true);
    expect(isEmptyReport('profit', PROFIT)).toBe(false);
    expect(isEmptyReport('owed', OWED_EMPTY)).toBe(true);
    expect(isEmptyReport('owed', OWED)).toBe(false);
    expect(isEmptyReport('running-costs', { summary: { total: 0 }, rows_total: 0 })).toBe(true);
    expect(isEmptyReport('aging-stock', { summary: {}, rows_total: 0 })).toBe(true);
  });
  test('no answer yet is not empty', () => {
    expect(isEmptyReport('sales', null)).toBe(false);
  });
});

describe('the notes under the profit figures', () => {
  test('products left out of profit, and the amount', () => {
    expect(profitNotes(PROFIT_WITH_GAPS)).toEqual({ uncosted: 3, amount: 4200, estimated: true });
    expect(profitNotes(PROFIT)).toEqual({ uncosted: 0, amount: 0, estimated: false });
    expect(profitNotes(null)).toEqual({ uncosted: 0, amount: 0, estimated: false });
  });
  test('one product or several', () => {
    expect(uncostedWords(1)).toBe('1 product');
    expect(uncostedWords(3)).toBe('3 products');
  });
});

describe('the one-line answers on the landing page', () => {
  test('sales, profit, a loss and no profit', () => {
    expect(answerFor('sold', { revenue: 30000 })).toBe('Last 30 days: KES 30,000 sold');
    expect(answerFor('sold', { revenue: 0 })).toBe('Nothing sold in the last 30 days');
    expect(answerFor('profit', { net_profit: 23000, margin_pct: 23 })).toBe('Last 30 days: KES 23,000 profit, 23% of sales');
    expect(answerFor('profit', { net_profit: -700, margin_pct: 0 })).toBe('Last 30 days: a loss of KES 700');
    expect(answerFor('profit', { net_profit: 0, margin_pct: 0 })).toBe('No profit to show for the last 30 days');
  });
  test('money owed uses one or many customers', () => {
    expect(answerFor('owed', { amount: 24500, customers: 2 })).toBe('KES 24,500 owed by 2 customers');
    expect(answerFor('owed', { amount: 500, customers: 1 })).toBe('KES 500 owed by 1 customer');
    expect(answerFor('owed', { amount: 0, customers: 0 })).toBe('Nobody owes you money');
  });
  test('running costs and stock', () => {
    expect(answerFor('costs', { total: 16400 })).toBe('Last 30 days: KES 16,400 spent');
    expect(answerFor('costs', { total: 0 })).toBe('No running costs recorded in the last 30 days');
    expect(answerFor('stock', { value: 40000, quantity: 160 })).toBe('Your stock is worth KES 40,000');
    expect(answerFor('stock', { value: 0, quantity: 0 })).toBe('No stock on your shelves yet');
  });
  test('no preview, no answer; and the not-selling card has none', () => {
    expect(answerFor('sold', null)).toBe('');
    expect(answerFor('not_selling', { anything: 1 })).toBe('');
  });
  test('words for counts', () => {
    expect(customersWords(1)).toBe('1 customer');
    expect(customersWords(12)).toBe('12 customers');
    expect(productsWords(1)).toBe('1 product');
    expect(productsWords(1200)).toBe('1,200 products');
  });
});

describe('what the charts draw', () => {
  test('columns by day or month carry a short word, a full word and the value', () => {
    const rows = columnRows(PROFIT.series.over_time, 'net_profit');
    expect(rows[0]).toEqual({ key: '2026-10-05', label: '5 Oct', full: 'Mon 5 Oct', value: 38000, soFar: false });
    expect(rows[2].soFar).toBe(true);
    expect(columnRows([{ period: '2026-10', net_profit: 5 }], 'net_profit')[0]).toMatchObject({ label: 'Oct', full: 'Oct 2026' });
    expect(columnRows(COSTS.series.by_day, 'amount', 'date')[0].value).toBe(12000);
    expect(columnRows(undefined, 'amount')).toEqual([]);
  });

  test('bars name the folded rest as Other with how many it holds', () => {
    const rows = barRows([{ category: 'Rent', amount: 10 }, { category: null, amount: 3, other: true, count: 4 }], 'category', T.costs.otherCount);
    expect(rows.map((r) => r.name)).toEqual(['Rent', 'Other (4 more)']);
    expect(rows[1].other).toBe(true);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });

  test('the age parts follow the bands in order with their words', () => {
    const parts = ageParts(OWED.series.age_bands, T.owed.bands, 'amount', 'customers');
    expect(parts.map((p) => p.label)).toEqual(['0 to 7 days', '8 to 14 days', '15 to 30 days', 'Over 30 days']);
    expect(parts.map((p) => p.amount)).toEqual([21000, 0, 0, 3500]);
    const stock = ageParts(AGING.series.age_bands, T.aging.bands, 'value', 'products');
    expect(stock.map((p) => p.count)).toEqual([1, 0, 0, 1]);
  });

  test('the waterfall steps are named in plain words', () => {
    const steps = waterfallSteps(PROFIT.series.waterfall);
    expect(steps.map((s) => s.label)).toEqual(['Sales', 'Cost of goods', 'Running costs', 'Net profit']);
    expect(steps[0].amount - steps[1].amount - steps[2].amount).toBe(steps[3].amount);
  });
});
