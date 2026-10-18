/**
 * One report (ticket P5-2, AC-31): it opens ready for the last 30 days without pressing anything, with the period row, the
 * charts with their Chart and Table toggle, the table, Export CSV in the header, and its own loading, empty and error
 * states. Also the new reports (profit, who owes you, running costs) and the two stock views.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import ReportPage from './ReportPage';
import { runReport } from '../../api/reportsApi';
import { saveTextFile } from '../../utils/saveTextFile';
import { AGING, COSTS, OWED, OWED_EMPTY, PROFIT, PROFIT_WITH_GAPS, SALES, SALES_EMPTY, STOCK_SUMMARY, STOCK_VALUE } from './__fixtures__/reportAnswers';

jest.mock('../../api/reportsApi', () => ({ runReport: jest.fn() }));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: [{ name: 'Main - DS', warehouse_name: 'Main' }, { name: 'Annex - DS', warehouse_name: 'Annex' }] } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));
jest.mock('../home/MissingCostList', () => ({
  MissingCostDialog: ({ open }) => (open ? <div role="dialog">Products without a cost price</div> : null),
}));

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
};

const draw = (path) =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/new-look/reports/:name" element={<ReportPage />} />
          <Route path="/new-look/reports" element={<p>The landing page</p>} />
        </Routes>
        <Where />
      </MemoryRouter>
    </ToastProvider>
  );

const ANSWERS = { sales: SALES, profit: PROFIT, owed: OWED, 'running-costs': COSTS, 'stock-summary': STOCK_SUMMARY, 'stock-value': STOCK_VALUE, 'aging-stock': AGING };

beforeEach(() => {
  jest.resetAllMocks();
  runReport.mockImplementation(async ({ name }) => ANSWERS[name]);
});

describe('it opens ready (AC-31)', () => {
  test('the report is asked for the last 30 days as soon as the page opens, with nothing pressed', async () => {
    draw('/new-look/reports/sales');
    expect(await screen.findByText('KES 30,000')).toBeInTheDocument();
    expect(runReport).toHaveBeenCalledTimes(1);
    expect(runReport).toHaveBeenCalledWith({ name: 'sales', period: '30d', from: '', to: '', store: '', groupBy: undefined });
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });

  test('the page is named by its question and has a way back to all reports', async () => {
    draw('/new-look/reports/sales');
    expect(await screen.findByRole('heading', { level: 1, name: 'How much did I sell?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'All reports' }));
    expect(screen.getByText('The landing page')).toBeInTheDocument();
  });

  test('the period row has Today, 7 days, 30 days and Custom, with 30 days chosen', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    const group = screen.getByRole('radiogroup', { name: 'Period' });
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-checked') === 'true' && r.textContent)).toEqual([false, false, '30 days', false]);
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
  });

  test('choosing 7 days asks again for 7 days and keeps the choice in the address', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(runReport).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'sales', period: '7d' })));
    expect(screen.getByTestId('where')).toHaveTextContent('period=7d');
  });

  test('a shared link opens the same view', async () => {
    draw('/new-look/reports/sales?period=custom&from=2026-10-01&to=2026-10-07');
    await screen.findByText('KES 30,000');
    expect(runReport).toHaveBeenCalledWith({ name: 'sales', period: 'custom', from: '2026-10-01', to: '2026-10-07', store: '', groupBy: undefined });
  });

  test('Custom waits for both dates instead of asking the server with half a question', async () => {
    draw('/new-look/reports/sales?period=custom');
    expect(await screen.findByText('Choose a start date and an end date to see this report.')).toBeInTheDocument();
    expect(runReport).not.toHaveBeenCalled();
  });

  test('a store box appears when the shop has two stores, and narrows the report', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    await userEvent.click(screen.getByRole('combobox', { name: /Store/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Annex' }));
    await waitFor(() => expect(runReport).toHaveBeenLastCalledWith(expect.objectContaining({ store: 'Annex - DS' })));
  });

  test('an unknown report gets a plain notice and a way back', async () => {
    draw('/new-look/reports/balance-sheet');
    expect(await screen.findByText('We do not have that report')).toBeInTheDocument();
    expect(runReport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'See all reports' }));
    expect(screen.getByText('The landing page')).toBeInTheDocument();
  });
});

describe('How much did I sell?', () => {
  test('shows the figures, the three charts and the table of days', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    expect(screen.getAllByText('Number of sales').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Average sale').length).toBeGreaterThan(0);
    expect(screen.getByText('Up 20% on the period before')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: 'Table' })).toHaveLength(3);
    expect(screen.getByRole('table', { name: /Sales by day/ })).toBeInTheDocument();
  });

  test('each chart has a Chart and Table toggle, and the table view gives the same total as the report', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    await userEvent.click(screen.getAllByRole('radio', { name: 'Table' })[1]);
    const tables = screen.getAllByRole('table');
    const payments = tables.find((t) => within(t).queryByText('M-Pesa'));
    expect(within(payments).getByRole('cell', { name: 'KES 30,000' })).toBeInTheDocument();
  });

  test('the table pages through 30 days at 20 a page', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    expect(screen.getByText('Showing 20 of 30')).toBeInTheDocument();
  });

  test('no sales in the period says so with one action, instead of empty charts', async () => {
    runReport.mockResolvedValue(SALES_EMPTY);
    draw('/new-look/reports/sales');
    expect(await screen.findByText('No sales in this period')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to the till' })).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  test('a link to the current Sales analysis keeps the Excel and PDF files and the group by choices reachable', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    expect(screen.getByRole('link', { name: 'Open the detailed report' })).toHaveAttribute('href', '/reports/sales-analytics?legacy=1');
  });
});

describe('export', () => {
  test('Export CSV in the header saves the rows of the table with the same numbers', async () => {
    draw('/new-look/reports/sales');
    await screen.findByText('KES 30,000');
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^report-sales-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = text.trim().split('\n');
    expect(lines).toHaveLength(31);
    expect(lines[0]).toBe('"Date","Revenue (KES)","Number of sales","Average sale (KES)","Period before (KES)"');
    expect(lines[1]).toBe('"2026-09-14","1000","5","200","800"');
    expect(await screen.findByText('Saved 30 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('every report can be exported', async () => {
    for (const name of Object.keys(ANSWERS)) {
      saveTextFile.mockClear();
      const { unmount } = draw(`/new-look/reports/${name}`);
      const button = await screen.findByRole('button', { name: 'Export CSV' });
      await waitFor(() => expect(button).toBeEnabled());
      await userEvent.click(button);
      expect(saveTextFile).toHaveBeenCalledTimes(1);
      expect(saveTextFile.mock.calls[0][0].trim().split('\n')).toHaveLength(ANSWERS[name].rows.length + 1);
      unmount();
    }
  });

  test('Export is off while loading and when there is nothing to export', async () => {
    runReport.mockReturnValue(new Promise(() => {}));
    draw('/new-look/reports/sales');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });
});

describe('loading and errors', () => {
  test('while loading the page keeps its header and shows grey shapes', async () => {
    runReport.mockReturnValue(new Promise(() => {}));
    draw('/new-look/reports/profit');
    expect(screen.getByRole('heading', { level: 1, name: 'What is my profit?' })).toBeInTheDocument();
    expect(screen.queryByText('KES 23,000')).not.toBeInTheDocument();
  });

  test('a failure says so and Try again asks once more', async () => {
    runReport.mockRejectedValueOnce(Object.assign(new Error('We could not reach the server.'), { forbidden: false }));
    draw('/new-look/reports/sales');
    expect(await screen.findByText('We could not load this report')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('KES 30,000')).toBeInTheDocument();
  });

  test('a person the server refuses is told who may open the report, not that something broke', async () => {
    runReport.mockRejectedValue(Object.assign(new Error('Only an owner or a manager can see this.'), { forbidden: true }));
    draw('/new-look/reports/profit');
    expect(await screen.findByText('This report is for owners and managers')).toBeInTheDocument();
    expect(screen.queryByText('We could not load this report')).not.toBeInTheDocument();
  });

  test('a part that could not be loaded is named, and the rest is still shown', async () => {
    runReport.mockResolvedValue({ ...SALES, errors: { payments: 'Could not load this.' }, series: { ...SALES.series, payments: null } });
    draw('/new-look/reports/sales');
    expect(await screen.findByText('Part of this report could not be loaded. The rest is shown.')).toBeInTheDocument();
    expect(screen.getByText('KES 30,000')).toBeInTheDocument();
  });

  test('an answer to an earlier period is thrown away when the period changed', async () => {
    let first;
    runReport.mockImplementationOnce(() => new Promise((resolve) => { first = resolve; }));
    draw('/new-look/reports/sales');
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    expect(await screen.findByText('KES 30,000')).toBeInTheDocument();
    first({ ...SALES, summary: { ...SALES.summary, revenue: 1 } });
    await waitFor(() => expect(screen.queryByText('KES 1')).not.toBeInTheDocument());
  });
});

describe('What is my profit?', () => {
  test('shows revenue, cost of goods, running costs, net profit and margin (the Build Pack example)', async () => {
    draw('/new-look/reports/profit');
    expect(await screen.findByText('KES 23,000')).toBeInTheDocument();
    ['KES 100,000', 'KES 62,000', 'KES 15,000', '23%'].forEach((text) => expect(screen.getAllByText(text).length).toBeGreaterThan(0));
    ['Revenue', 'Cost of goods', 'Running costs', 'Net profit', 'Margin'].forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
  });

  test('draws the waterfall and net profit by day, and is open to owners and managers only through the server', async () => {
    draw('/new-look/reports/profit');
    await screen.findByText('KES 23,000');
    expect(screen.getByRole('figure', { name: /From sales to profit/ })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /Net profit by day/ })).toBeInTheDocument();
  });

  test('can be shown by day or by month', async () => {
    draw('/new-look/reports/profit');
    await screen.findByText('KES 23,000');
    await userEvent.click(screen.getByRole('radio', { name: 'Month' }));
    await waitFor(() => expect(runReport).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'month' })));
  });

  test('says how many products were left out and offers to add their costs', async () => {
    runReport.mockResolvedValue(PROFIT_WITH_GAPS);
    draw('/new-look/reports/profit');
    expect(await screen.findByText(/Profit leaves out 3 products without a cost price, which is KES 4,200 of sales/)).toBeInTheDocument();
    expect(screen.getByText('Some costs are estimated from the current cost of the product.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add the costs' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('no note when every product has a cost', async () => {
    draw('/new-look/reports/profit');
    await screen.findByText('KES 23,000');
    expect(screen.queryByText(/leaves out/)).not.toBeInTheDocument();
  });
});

describe('Who owes me money?', () => {
  test('has no period row, says as at today, and lists customers biggest first with their ages', async () => {
    draw('/new-look/reports/owed');
    expect(await screen.findByText('KES 24,500')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Period' })).not.toBeInTheDocument();
    expect(screen.getByText(/As at 13 Oct/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /Customers who owe you money/ });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Brian Otieno')).toBeInTheDocument();
    expect(within(rows[2]).getByText('42 days')).toBeInTheDocument();
  });

  test('a customer with a phone number can be reminded on WhatsApp, and one without cannot', async () => {
    draw('/new-look/reports/owed');
    await screen.findByText('KES 24,500');
    const link = screen.getByRole('link', { name: 'Remind Wanjiru Kamau on WhatsApp' });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/254712345678\?text=/);
    expect(screen.queryByRole('link', { name: /Remind Brian/ })).not.toBeInTheDocument();
  });

  test('asks for no period', async () => {
    draw('/new-look/reports/owed?period=7d');
    await screen.findByText('KES 24,500');
    expect(runReport.mock.calls[0][0].period).toBeUndefined();
  });

  test('nobody owing money is a good empty state', async () => {
    runReport.mockResolvedValue(OWED_EMPTY);
    draw('/new-look/reports/owed');
    expect(await screen.findByText('Nobody owes you money')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See all sales' })).toBeInTheDocument();
  });
});

describe('Where did my money go?', () => {
  test('shows the total, the biggest cost, and costs by category and by day', async () => {
    draw('/new-look/reports/running-costs');
    expect(await screen.findByText('KES 16,400')).toBeInTheDocument();
    expect(screen.getByText('KES 12,000, 73.2% of your running costs')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /Running costs by category/ })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /Running costs by day/ })).toBeInTheDocument();
  });

  test('no costs offers to add an expense', async () => {
    runReport.mockResolvedValue({ ...COSTS, summary: { ...COSTS.summary, total: 0, biggest: null }, rows: [], rows_total: 0, series: { categories: [], by_day: [] } });
    draw('/new-look/reports/running-costs');
    expect(await screen.findByText('No running costs in this period')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/expenses');
  });
});

describe('What is in stock, and what is it worth? and What is not selling?', () => {
  test('the stock question has two views as tabs that are links, and keeps the same title', async () => {
    draw('/new-look/reports/stock-summary');
    await screen.findByText('KES 40,000');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['In stock', 'What it is worth']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('href', '/new-look/reports/stock-value');
    expect(screen.getByRole('heading', { level: 1, name: 'What is in stock, and what is it worth?' })).toBeInTheDocument();
  });

  test('the stock view lists each store, and compares them when there are two', async () => {
    draw('/new-look/reports/stock-summary');
    await screen.findByText('KES 40,000');
    expect(screen.getByRole('figure', { name: /Stock value by store/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Stock in each store/ })).toBeInTheDocument();
  });

  test('with one store there is nothing to compare, so no chart', async () => {
    runReport.mockResolvedValue({ ...STOCK_SUMMARY, rows: STOCK_SUMMARY.rows.slice(0, 1), series: { by_store: [{ store: 'Stores', amount: 30000 }] } });
    draw('/new-look/reports/stock-summary');
    await screen.findByRole('table', { name: /Stock in each store/ });
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  test('what it is worth is by category and links to the current Stock value screen for more', async () => {
    draw('/new-look/reports/stock-value');
    await screen.findByText('KES 20,000');
    expect(screen.getAllByText('Snacks').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open the detailed report' })).toHaveAttribute('href', '/reports/inventory-valuation?legacy=1');
  });

  test('what is not selling lists the products with the money tied up in them', async () => {
    draw('/new-look/reports/aging-stock');
    expect(await screen.findByText('KES 800')).toBeInTheDocument();
    expect(screen.getAllByText('Rice 5kg').length).toBeGreaterThan(0);
    expect(screen.getByText('200 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the detailed report' })).toHaveAttribute('href', '/reports/aging-stock?legacy=1');
  });

  test('everything selling is a happy empty state', async () => {
    runReport.mockResolvedValue({ ...AGING, summary: { ...AGING.summary, products: 0, value: 0, oldest_days: 0 }, rows: [], rows_total: 0 });
    draw('/new-look/reports/aging-stock');
    expect(await screen.findByText('Everything is selling')).toBeInTheDocument();
  });
});
