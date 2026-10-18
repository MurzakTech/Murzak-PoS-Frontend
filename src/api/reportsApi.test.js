import axiosInstance from './axiosInstance';
import * as reportsApi from './reportsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const { listReportQuestions, runReport } = reportsApi;
const reply = (data) => ({ data: { message: { success: true, data } } });

beforeEach(() => jest.resetAllMocks());

describe('listReportQuestions', () => {
  test('asks for the list with no numbers unless a preview is wanted', async () => {
    axiosInstance.get.mockResolvedValue(reply({ role: 'owner', questions: [{ key: 'sold', opens: 'sales', reports: ['sales'] }] }));
    await expect(listReportQuestions()).resolves.toEqual({ role: 'owner', questions: [{ key: 'sold', opens: 'sales', reports: ['sales'] }] });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.reports_api.list_reports', { params: {} });
    await listReportQuestions({ preview: true });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.reports_api.list_reports', { params: { preview: 1 } });
  });

  test('a missing list becomes an empty one', async () => {
    axiosInstance.get.mockResolvedValue(reply({ role: 'cashier' }));
    await expect(listReportQuestions()).resolves.toEqual({ role: 'cashier', questions: [] });
  });

  test('turns a refusal or a missing answer into a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load this report. Please try again.' } } });
    await expect(listReportQuestions()).rejects.toThrow('Could not load this report. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listReportQuestions()).rejects.toThrow();
  });

  test('a failed request gives a friendly message, never the raw error', async () => {
    axiosInstance.get.mockRejectedValue({ response: { status: 500, data: { exc: 'Traceback (most recent call last): secret' } } });
    const error = await listReportQuestions().catch((e) => e);
    expect(error.message).not.toMatch(/Traceback|secret/);
    expect(error.forbidden).toBe(false);
  });
});

describe('runReport', () => {
  test('asks for the last 30 days by default and sends dates only for a custom range', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'sales', summary: {}, series: {}, rows: [] }));
    await runReport({ name: 'sales' });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.reports_api.run_report', { params: { name: 'sales', period: '30d' } });
    await runReport({ name: 'sales', period: '7d', from: '2026-10-01', to: '2026-10-07', store: '' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.reports_api.run_report', { params: { name: 'sales', period: '7d' } });
    await runReport({ name: 'profit', period: 'custom', from: '2026-10-01', to: '2026-10-07', store: 'Main - DS', groupBy: 'month' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.reports_api.run_report', {
      params: { name: 'profit', period: 'custom', from_date: '2026-10-01', to_date: '2026-10-07', store: 'Main - DS', group_by: 'month' },
    });
  });

  test('returns the report with the parts it may be missing filled in', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'owed', role: 'owner' }));
    await expect(runReport({ name: 'owed' })).resolves.toEqual({ name: 'owed', role: 'owner', summary: {}, series: {}, rows: [], rows_total: 0, errors: {} });
  });

  test('keeps the rows and the count the server gave', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'owed', rows: [{ customer: 'C1' }], rows_total: 40, errors: { payments: 'Could not load this.' } }));
    const data = await runReport({ name: 'owed' });
    expect(data.rows).toEqual([{ customer: 'C1' }]);
    expect(data.rows_total).toBe(40);
    expect(data.errors).toEqual({ payments: 'Could not load this.' });
  });

  test('without a count the rows are counted', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'owed', rows: [{}, {}] }));
    expect((await runReport({ name: 'owed' })).rows_total).toBe(2);
  });

  test('a refusal from the server is marked, so the page can say who may open the report', async () => {
    axiosInstance.get.mockRejectedValue({ response: { status: 403, data: { exc_type: 'PermissionError' } } });
    const error = await runReport({ name: 'profit' }).catch((e) => e);
    expect(error.forbidden).toBe(true);
    expect(error.message).toBeTruthy();
  });

  test('the server saying it could not load the report is a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load this report. Please try again.' } } });
    await expect(runReport({ name: 'profit' })).rejects.toThrow('Could not load this report. Please try again.');
  });
});

describe('the older report calls are still there', () => {
  test.each(['fetchSalesAnalyticsReport', 'exportSalesAnalyticsReport', 'fetchInventorySummary', 'fetchStockAging', 'fetchGRNList', 'fetchGRNDetails'])('%s', (name) => {
    expect(typeof reportsApi[name]).toBe('function');
  });
});
