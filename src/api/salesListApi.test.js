import axiosInstance from './axiosInstance';
import { getSale, listSales, takePayment } from './salesListApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const URL = 'murzak_pos.api.sales_list_api';

beforeEach(() => jest.resetAllMocks());

describe('listSales', () => {
  test('asks for the tab, period and page, and sends dates only for a custom range', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], summary: {}, total: 0 }));
    await listSales({ tab: 'unpaid', period: '7d', from: '2026-10-01', to: '2026-10-07', search: '', page: 2, pageSize: 50 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.list_sales`, { params: { tab: 'unpaid', period: '7d', page: 2, page_size: 50 } });
    await listSales({ period: 'custom', from: '2026-10-01', to: '2026-10-07', search: 'wanjiru', cashier: 'a@b.test', store: 'Main - DS' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${URL}.list_sales`, {
      params: { tab: 'all', period: 'custom', from_date: '2026-10-01', to_date: '2026-10-07', search: 'wanjiru', cashier: 'a@b.test', store: 'Main - DS', page: 1, page_size: 20 },
    });
  });

  test('an unknown tab is asked for as All sales', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listSales({ tab: 'nonsense' });
    expect(axiosInstance.get.mock.calls[0][1].params.tab).toBe('all');
  });

  test('returns the rows, the summary and the counts', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }, { id: 'B' }], summary: { sold: 100, unpaid: 20, returned: 5 }, total: 41, page: 2, page_size: 20, pages: 3 }));
    await expect(listSales({ page: 2 })).resolves.toEqual({ rows: [{ id: 'A' }, { id: 'B' }], summary: { sold: 100, unpaid: 20, returned: 5 }, total: 41, page: 2, pageSize: 20, pages: 3 });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }] }));
    await expect(listSales()).resolves.toEqual({ rows: [{ id: 'A' }], summary: { sold: 0, unpaid: 0, returned: 0 }, total: 1, page: 1, pageSize: 20, pages: 1 });
  });

  test('turns a refusal, a missing answer or a network failure into a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the sales. Please try again.' } } });
    await expect(listSales()).rejects.toThrow('Could not load the sales. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listSales()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listSales()).rejects.toThrow(/internet|connection/i);
  });
});

describe('getSale', () => {
  test('asks for one receipt by id and kind of invoice', async () => {
    axiosInstance.get.mockResolvedValue(reply({ id: 'ACC-PSINV-1', receipt: '#0001' }));
    await expect(getSale('ACC-PSINV-1', 'POS Invoice')).resolves.toEqual({ id: 'ACC-PSINV-1', receipt: '#0001' });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.get_sale`, { params: { id: 'ACC-PSINV-1', doctype: 'POS Invoice' } });
  });

  test('a refusal becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'You cannot see that sale.' } } });
    await expect(getSale('X', 'POS Invoice')).rejects.toThrow('You cannot see that sale.');
  });
});

describe('takePayment', () => {
  test('sends the amount, the way it was paid, the M-Pesa code and the request id that stops a double entry', async () => {
    axiosInstance.post.mockResolvedValue(reply({ outstanding: 0 }));
    await expect(takePayment({ id: 'S1', doctype: 'Sales Invoice', amount: 500, mode: 'mpesa', reference: 'SJK4D9X2LM', requestId: 'pay-abc' })).resolves.toEqual({ outstanding: 0 });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${URL}.take_payment`, { id: 'S1', doctype: 'Sales Invoice', amount: 500, mode: 'mpesa', reference: 'SJK4D9X2LM', request_id: 'pay-abc' }, { allowRefusal: true });
  });

  test('a refusal becomes a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'That is more than is owed.' } } });
    await expect(takePayment({ id: 'S1', doctype: 'Sales Invoice', amount: 9, mode: 'cash' })).rejects.toThrow('That is more than is owed.');
  });
});
