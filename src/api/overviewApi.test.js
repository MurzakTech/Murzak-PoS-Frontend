import axiosInstance from './axiosInstance';
import { getOverview, getProductsWithoutCost } from './overviewApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });

beforeEach(() => jest.resetAllMocks());

describe('getOverview', () => {
  test('asks for the period, and sends dates only for a custom range', async () => {
    axiosInstance.get.mockResolvedValue(reply({ role: 'owner' }));
    await getOverview({ period: '7d', from: '2026-10-01', to: '2026-10-07', store: '', staff: '' });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.dashboard_overview.get_overview', { params: { period: '7d' } });
    await getOverview({ period: 'custom', from: '2026-10-01', to: '2026-10-07', store: 'Main - DS', staff: 'a@b.test' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.dashboard_overview.get_overview', { params: { period: 'custom', from_date: '2026-10-01', to_date: '2026-10-07', store: 'Main - DS', staff: 'a@b.test' } });
  });

  test('returns the data part of the answer', async () => {
    axiosInstance.get.mockResolvedValue(reply({ role: 'owner', hero: { today_total: 1 } }));
    await expect(getOverview()).resolves.toEqual({ role: 'owner', hero: { today_total: 1 } });
  });

  test('turns a refusal or a missing answer into a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the overview. Please try again.' } } });
    await expect(getOverview()).rejects.toThrow('Could not load the overview. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(getOverview()).rejects.toThrow();
  });
});

describe('getProductsWithoutCost', () => {
  test('returns the products and passes the range', async () => {
    axiosInstance.get.mockResolvedValue(reply({ count: 1, products: [{ item_code: 'X', item_name: 'Foam roller', units_sold: 3 }] }));
    await expect(getProductsWithoutCost({ from: '2026-10-01', to: '2026-10-12', limit: 20 })).resolves.toEqual([{ item_code: 'X', item_name: 'Foam roller', units_sold: 3 }]);
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.dashboard_overview.get_products_without_cost', { params: { from_date: '2026-10-01', to_date: '2026-10-12', limit: 20 } });
  });
});
