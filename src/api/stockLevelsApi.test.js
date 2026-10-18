import axiosInstance from './axiosInstance';
import { findProducts, getCountSheet, getStockLevels, stockIn, stockOut, submitCount } from './stockLevelsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const URL = 'murzak_pos.api.stock_levels_api';

beforeEach(() => jest.resetAllMocks());

describe('getStockLevels', () => {
  test('asks for the tab, filters and page, leaving out what is empty', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], total: 0 }));
    await getStockLevels({ tab: 'low', search: 'maziwa', category: 'Maziwa', store: 'Duka Kuu - DS', status: 'out', page: 2, pageSize: 50 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.get_stock_levels`, {
      params: { tab: 'low', search: 'maziwa', category: 'Maziwa', warehouse: 'Duka Kuu - DS', status: 'out', page: 2, page_size: 50 },
    });
    await getStockLevels();
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${URL}.get_stock_levels`, { params: { tab: 'overview', page: 1, page_size: 20 } });
  });

  test('movements are asked for with their dates, kind and status', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], total: 0 }));
    await getStockLevels({ tab: 'movements', from: '2026-10-01', to: '2026-10-13', kind: 'receipt', status: 'draft' });
    expect(axiosInstance.get.mock.calls[0][1].params).toMatchObject({ tab: 'movements', from_date: '2026-10-01', to_date: '2026-10-13', kind: 'receipt', status: 'draft' });
  });

  test('expiry is asked for with its window', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await getStockLevels({ tab: 'expiry', days: 90 });
    expect(axiosInstance.get.mock.calls[0][1].params).toMatchObject({ tab: 'expiry', days: 90 });
  });

  test('an unknown tab is asked for as the overview', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await getStockLevels({ tab: 'nonsense' });
    expect(axiosInstance.get.mock.calls[0][1].params.tab).toBe('overview');
  });

  test('returns the rows, tiles, counts, features and what the person may do', async () => {
    axiosInstance.get.mockResolvedValue(
      reply({
        tab: 'overview',
        rows: [{ item_code: 'A' }, { item_code: 'B' }],
        tiles: { items: 41, low: 3, out_of_stock: 1, stock_value: 5000 },
        total: 41,
        page: 2,
        page_size: 20,
        pages: 3,
        categories: ['Maziwa'],
        features: { expiry: true, locations: 2 },
        can: { change_stock: true },
        role: 'owner',
      })
    );
    await expect(getStockLevels({ page: 2 })).resolves.toMatchObject({
      rows: [{ item_code: 'A' }, { item_code: 'B' }],
      tiles: { items: 41, low: 3, out_of_stock: 1, stock_value: 5000 },
      total: 41,
      page: 2,
      pageSize: 20,
      pages: 3,
      categories: ['Maziwa'],
      features: { expiry: true, locations: 2 },
      canChange: true,
      role: 'owner',
    });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ item_code: 'A' }] }));
    await expect(getStockLevels()).resolves.toMatchObject({ total: 1, page: 1, pageSize: 20, pages: 1, tiles: null, categories: [], features: { expiry: false, locations: 0 }, canChange: false });
  });

  test('a cashier answer has no stock value and the client does not invent one', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], tiles: { items: 2, low: 1, out_of_stock: 0 } }));
    const result = await getStockLevels();
    expect(result.tiles).not.toHaveProperty('stock_value');
  });

  test('turns a refusal, a missing answer or a network failure into a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the stock levels. Please try again.' } } });
    await expect(getStockLevels()).rejects.toThrow('Could not load the stock levels. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(getStockLevels()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getStockLevels()).rejects.toThrow(/internet|connection/i);
  });
});

describe('findProducts', () => {
  test('searches by name or code and returns the rows', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ item_code: 'MLK', qty: 4 }] }));
    await expect(findProducts({ search: 'maz', store: 'Duka Kuu - DS' })).resolves.toEqual([{ item_code: 'MLK', qty: 4 }]);
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.find_products`, { params: { search: 'maz', warehouse: 'Duka Kuu - DS', limit: 8 } });
  });
});

describe('stockIn and stockOut', () => {
  test('Stock in sends the product, quantity, store, note and cost as a post', async () => {
    axiosInstance.post.mockResolvedValue(reply({ entry: 'MAT-STE-1', in_stock: 16 }));
    await expect(stockIn({ itemCode: 'MLK', qty: 12, store: 'Duka Kuu - DS', note: 'from the depot', unitCost: 55 })).resolves.toEqual({ entry: 'MAT-STE-1', in_stock: 16 });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${URL}.stock_in`, { item_code: 'MLK', qty: 12, warehouse: 'Duka Kuu - DS', note: 'from the depot', unit_cost: 55 }, { allowRefusal: true });
  });

  test('Stock in leaves out what is empty', async () => {
    axiosInstance.post.mockResolvedValue(reply({ entry: 'E' }));
    await stockIn({ itemCode: 'MLK', qty: 1, note: '' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ item_code: 'MLK', qty: 1 });
  });

  test('Stock out sends the reason', async () => {
    axiosInstance.post.mockResolvedValue(reply({ entry: 'MAT-STE-2', in_stock: 2 }));
    await stockOut({ itemCode: 'MLK', qty: 2, reason: 'damaged', note: 'fell' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${URL}.stock_out`, { item_code: 'MLK', qty: 2, reason: 'damaged', note: 'fell' }, { allowRefusal: true });
  });

  test('a refusal from the server becomes its plain sentence', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Insufficient stock' } } });
    await expect(stockOut({ itemCode: 'MLK', qty: 200, reason: 'lost' })).rejects.toThrow('Insufficient stock');
  });

  test('a validation error thrown by the server is made friendly', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 417, data: { _server_messages: JSON.stringify([JSON.stringify({ message: 'Please say why the stock is leaving: damaged, expired, lost, used in the shop or other.' })]) } } });
    await expect(stockOut({ itemCode: 'MLK', qty: 1, reason: '' })).rejects.toThrow(/Please say why the stock is leaving/);
  });
});

describe('the count', () => {
  test('the sheet is asked for by scope, category and store', async () => {
    axiosInstance.get.mockResolvedValue(reply({ warehouse: 'Duka Kuu - DS', rows: [{ item_code: 'MLK', expected: 4 }], total: 1 }));
    await expect(getCountSheet({ scope: 'category', category: 'Maziwa', store: 'Duka Kuu - DS' })).resolves.toEqual({ warehouse: 'Duka Kuu - DS', rows: [{ item_code: 'MLK', expected: 4 }], total: 1, truncated: false });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.get_count_sheet`, { params: { scope: 'category', category: 'Maziwa', warehouse: 'Duka Kuu - DS' } });
  });

  test('submitting a count sends the item codes and counted quantities only', async () => {
    axiosInstance.post.mockResolvedValue(reply({ warehouse: 'Duka Kuu - DS', differences: [{ item_code: 'MLK' }], totals: { lines: 1, short: 1 }, reconciliation: 'MAT-RECO-1' }));
    const result = await submitCount({ counts: [{ item_code: 'MLK', counted: 3, junk: 1 }], store: 'Duka Kuu - DS' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${URL}.submit_count`, { counts: [{ item_code: 'MLK', counted: 3 }], warehouse: 'Duka Kuu - DS' }, { allowRefusal: true });
    expect(result).toMatchObject({ reconciliation: 'MAT-RECO-1', totals: { lines: 1, short: 1, over: 0, matches: 0 } });
  });

  test('a count that changed nothing has no reconciliation', async () => {
    axiosInstance.post.mockResolvedValue(reply({ differences: [], totals: { lines: 2, matches: 2 } }));
    await expect(submitCount({ counts: [{ item_code: 'A', counted: 1 }] })).resolves.toMatchObject({ reconciliation: null });
  });

  test('a count that could not be saved gives the server words', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'The count was not saved. Please try again, or ask your administrator.' } } });
    await expect(submitCount({ counts: [{ item_code: 'A', counted: 1 }] })).rejects.toThrow('The count was not saved.');
  });
});
