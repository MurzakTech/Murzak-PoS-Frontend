import axiosInstance from './axiosInstance';
import { createExpense, getExpenseOptions, getReceipt, listExpenses } from './expensesApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const refusal = (extra) => ({ data: { message: { success: false, ...extra } } });
const EXPENSES = 'murzak_pos.api.expenses_api';

beforeEach(() => jest.resetAllMocks());

describe('getExpenseOptions', () => {
  test('asks for the choices of the business', async () => {
    axiosInstance.get.mockResolvedValue(reply({ categories: [], paid_from: [] }));
    await getExpenseOptions('Demo Shop');
    expect(axiosInstance.get).toHaveBeenCalledWith(`${EXPENSES}.get_expense_options`, { params: { company: 'Demo Shop' } });
    await getExpenseOptions();
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${EXPENSES}.get_expense_options`, { params: {} });
  });

  test('returns the categories, the paid-from choices with whether each can be used, and today', async () => {
    axiosInstance.get.mockResolvedValue(
      reply({
        company: 'Demo Shop',
        today: '2026-10-17',
        categories: [{ id: 'Rent - DS', label: 'Rent', group: 'Indirect Expenses' }],
        paid_from: [
          { key: 'cash', label: 'Cash', available: true, reason: null, mode_of_payment: 'Cash' },
          { key: 'mpesa', label: 'M-Pesa', available: false, reason: 'no_account', mode_of_payment: null },
        ],
        limits: { note_length: 140, receipt_bytes: 5242880 },
      })
    );
    await expect(getExpenseOptions()).resolves.toEqual({
      company: 'Demo Shop',
      today: '2026-10-17',
      categories: [{ id: 'Rent - DS', label: 'Rent', group: 'Indirect Expenses' }],
      paidFrom: [
        { key: 'cash', label: 'Cash', available: true, reason: '', modeOfPayment: 'Cash' },
        { key: 'mpesa', label: 'M-Pesa', available: false, reason: 'no_account', modeOfPayment: '' },
      ],
      limits: { note_length: 140, receipt_bytes: 5242880 },
    });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ today: '2026-10-17' }));
    await expect(getExpenseOptions()).resolves.toMatchObject({ categories: [], paidFrom: [], limits: {} });
  });
});

describe('listExpenses', () => {
  test('asks for the period, the category, the search and the page, leaving out what is empty', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], summary: {}, total: 0 }));
    await listExpenses({ period: '7d', category: 'Rent - DS', search: 'power', page: 2, pageSize: 50, company: 'Demo Shop' });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${EXPENSES}.list_expenses`, { params: { period: '7d', category: 'Rent - DS', search: 'power', page: 2, page_size: 50, company: 'Demo Shop' } });
    await listExpenses();
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${EXPENSES}.list_expenses`, { params: { period: '30d', page: 1, page_size: 20 } });
  });

  test('the dates are sent only for a custom period', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listExpenses({ period: 'custom', from: '2026-10-01', to: '2026-10-10' });
    expect(axiosInstance.get.mock.calls[0][1].params).toEqual({ period: 'custom', from_date: '2026-10-01', to_date: '2026-10-10', page: 1, page_size: 20 });
    await listExpenses({ period: '7d', from: '2026-10-01', to: '2026-10-10' });
    expect(axiosInstance.get.mock.calls[1][1].params).not.toHaveProperty('from_date');
  });

  test('an unknown period is not sent', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listExpenses({ period: 'decade' });
    expect(axiosInstance.get.mock.calls[0][1].params.period).toBe('30d');
  });

  test('returns the rows, the three numbers and the counts', async () => {
    const summary = { total: 6300, count: 5, top_category: { id: 'Power - DS', label: 'Power', amount: 4000 } };
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }], summary, total: 41, page: 2, page_size: 20, pages: 3, period: { key: '30d', from: '2026-09-18', to: '2026-10-17', days: 30 }, spent_in_list: 6300 }));
    await expect(listExpenses({ page: 2 })).resolves.toEqual({
      rows: [{ id: 'A' }],
      summary: { total: 6300, count: 5, topCategory: { id: 'Power - DS', label: 'Power', amount: 4000 } },
      total: 41,
      page: 2,
      pageSize: 20,
      pages: 3,
      period: { key: '30d', from: '2026-09-18', to: '2026-10-17', days: 30 },
      spentInList: 6300,
    });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }] }));
    await expect(listExpenses()).resolves.toEqual({ rows: [{ id: 'A' }], summary: { total: 0, count: 0, topCategory: null }, total: 1, page: 1, pageSize: 20, pages: 1, period: null, spentInList: 0 });
  });

  test('a refusal, a missing answer or a network failure becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue(refusal({ message: 'Could not load the expenses. Please try again.' }));
    await expect(listExpenses()).rejects.toThrow('Could not load the expenses. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listExpenses()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listExpenses()).rejects.toThrow(/internet|connection/i);
  });
});

describe('createExpense', () => {
  const form = { amount: '1500', category: 'Rent - DS', paidFrom: 'cash', date: '2026-10-16', note: 'Rent for October', company: 'Demo Shop', requestId: 'exp-abc123-def456' };

  test('sends the expense in one call, with the names the server expects', async () => {
    axiosInstance.post.mockResolvedValue(reply({ expense: { id: 'ACC-JV-1' }, repeat: false }));
    await expect(createExpense(form)).resolves.toEqual({ expense: { id: 'ACC-JV-1' }, repeat: false });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${EXPENSES}.create_expense`, { amount: '1500', category: 'Rent - DS', paid_from: 'cash', date: '2026-10-16', note: 'Rent for October', company: 'Demo Shop', request_id: 'exp-abc123-def456' });
  });

  test('the receipt photo goes in the same call, and an empty note or photo is left out', async () => {
    axiosInstance.post.mockResolvedValue(reply({ expense: { id: 'ACC-JV-1' } }));
    await createExpense({ ...form, note: '', receipt: 'data:image/png;base64,AAAA' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual(expect.objectContaining({ receipt: 'data:image/png;base64,AAAA' }));
    expect(axiosInstance.post.mock.calls[0][1]).not.toHaveProperty('note');
    await createExpense({ ...form, receipt: '' });
    expect(axiosInstance.post.mock.calls[1][1]).not.toHaveProperty('receipt');
  });

  test('says when the answer is a repeat of one already saved', async () => {
    axiosInstance.post.mockResolvedValue(reply({ expense: { id: 'ACC-JV-1' }, repeat: true }));
    await expect(createExpense(form)).resolves.toMatchObject({ repeat: true });
  });

  test('a refusal carries the server sentence, its code and the field it belongs beside', async () => {
    axiosInstance.post.mockResolvedValue(refusal({ message: 'The date cannot be in the future.', error_type: 'future_date', field: 'date' }));
    const error = await createExpense(form).catch((e) => e);
    expect(error.message).toBe('The date cannot be in the future.');
    expect(error.code).toBe('future_date');
    expect(error.field).toBe('date');
  });

  test('a shop with no account for the choice is told in plain words', async () => {
    axiosInstance.post.mockResolvedValue(refusal({ message: 'This shop has no M-Pesa account set up, so an expense cannot be paid from M-Pesa.', error_type: 'no_account', field: 'paid_from' }));
    await expect(createExpense({ ...form, paidFrom: 'mpesa' })).rejects.toMatchObject({ code: 'no_account', field: 'paid_from' });
  });

  test('a network failure becomes a plain message with no code', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network Error'));
    const error = await createExpense(form).catch((e) => e);
    expect(error.message).toMatch(/internet|connection/i);
    expect(error.code).toBeUndefined();
  });
});

describe('getReceipt', () => {
  test('asks for the photo of one expense and returns it ready to show', async () => {
    axiosInstance.get.mockResolvedValue(reply({ data_url: 'data:image/png;base64,AAAA', content_type: 'image/png', size: 4 }));
    await expect(getReceipt('ACC-JV-1')).resolves.toEqual({ dataUrl: 'data:image/png;base64,AAAA', contentType: 'image/png', size: 4 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${EXPENSES}.get_receipt`, { params: { expense: 'ACC-JV-1' } });
  });

  test('an expense without a photo is an error with a code', async () => {
    axiosInstance.get.mockResolvedValue(refusal({ message: 'This expense has no receipt photo.', error_type: 'no_receipt' }));
    await expect(getReceipt('ACC-JV-1')).rejects.toMatchObject({ code: 'no_receipt' });
  });
});
