import axiosInstance from './axiosInstance';
import {
  checkStoreSlug,
  createInvoiceForOnlineOrder,
  getOnlineOrder,
  getOnlineStore,
  listOnlineOrders,
  markOnlineOrderPaid,
  saveOnlineStore,
  setItemsOnline,
  setOnlineOrderStatus,
} from './onlineStoreApi';
import { getOrderWebhook, regenerateOrderWebhook } from './ecommerceApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data, extra = {}) => ({ data: { message: { success: true, data, ...extra } } });
const refusal = (message) => ({ data: { message: { success: false, message } } });

beforeEach(() => jest.resetAllMocks());

describe('the store settings', () => {
  test('reads them with safe defaults', async () => {
    axiosInstance.get.mockResolvedValue(reply({ slug: 'duka', product_count: '12' }));
    const store = await getOnlineStore('Duka Ltd');
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.online_store_api.get_online_store', { params: { company: 'Duka Ltd' } });
    expect(store).toMatchObject({ slug: 'duka', product_count: 12, delivery_areas: [], links: {} });
  });

  test('asks whether a web address name is free', async () => {
    axiosInstance.get.mockResolvedValue(reply({ available: false, message: 'That name is already taken.' }));
    expect(await checkStoreSlug({ slug: 'duka', company: 'Duka Ltd' })).toEqual({ available: false, message: 'That name is already taken.' });
  });

  test('saves them, and the server\'s refusal reaches the owner in plain words', async () => {
    axiosInstance.post.mockResolvedValue(reply({ slug: 'duka' }));
    await saveOnlineStore({ slug: 'duka', enabled: true }, 'Duka Ltd');
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.online_store_api.save_online_store',
      { settings: { slug: 'duka', enabled: true }, company: 'Duka Ltd' },
      { allowRefusal: true }
    );
    axiosInstance.post.mockResolvedValue(refusal('To open the store, choose a way to pay.'));
    await expect(saveOnlineStore({ enabled: true }, 'Duka Ltd')).rejects.toThrow('To open the store, choose a way to pay.');
  });

  test('shows or hides products', async () => {
    axiosInstance.post.mockResolvedValue(reply({ updated: 2, skipped: 0, show: false }));
    await setItemsOnline({ itemCodes: ['A', 'B'], show: false, company: 'Duka Ltd' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ item_codes: ['A', 'B'], show: 0, company: 'Duka Ltd' });
  });
});

describe('online orders', () => {
  test('lists with only the filters that were given', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ name: 'SO-1' }], total: 31, page: 2, page_size: 10 }));
    const result = await listOnlineOrders({ company: 'Duka Ltd', status: 'New', channel: '', page: 2, pageSize: 10 });
    expect(axiosInstance.get.mock.calls[0][1].params).toEqual({ company: 'Duka Ltd', status: 'New', page: 2, page_size: 10 });
    expect(result).toEqual({ rows: [{ name: 'SO-1' }], total: 31, page: 2, pageSize: 10 });
  });

  test('an empty reply is an empty list', async () => {
    axiosInstance.get.mockResolvedValue(reply(undefined));
    expect(await listOnlineOrders()).toEqual({ rows: [], total: 0, page: 1, pageSize: 20 });
  });

  test('opens one order with its lines', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'SO-1', lines: [{ item_code: 'RICE', qty: 2 }] }));
    const order = await getOnlineOrder('SO-1', 'Duka Ltd');
    expect(order.lines).toHaveLength(1);
  });

  test('moves an order along, marks it paid and makes the invoice', async () => {
    axiosInstance.post.mockResolvedValue(reply({ order: 'SO-1', status: 'Ready' }));
    await setOnlineOrderStatus({ order: 'SO-1', status: 'Ready', company: 'Duka Ltd' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ order: 'SO-1', status: 'Ready', company: 'Duka Ltd' });
    await markOnlineOrderPaid('SO-1', 'Duka Ltd');
    axiosInstance.post.mockResolvedValue(reply({ invoice: 'ACC-SINV-1' }));
    expect(await createInvoiceForOnlineOrder('SO-1', 'Duka Ltd')).toBe('ACC-SINV-1');
  });

  test('a refusal is an error with the server\'s words', async () => {
    axiosInstance.post.mockResolvedValue(refusal('An order that is Delivered cannot be changed to Ready.'));
    await expect(setOnlineOrderStatus({ order: 'SO-1', status: 'Ready' })).rejects.toThrow('cannot be changed');
  });
});

describe('the website order connection', () => {
  test('reads the address and secret', async () => {
    axiosInstance.post.mockResolvedValue(reply({ delivery_url: 'https://pos.example/hook?t=abc', secret: 's3cret', steps: ['Open WooCommerce'] }));
    expect(await getOrderWebhook('Duka Ltd')).toEqual({ deliveryUrl: 'https://pos.example/hook?t=abc', secret: 's3cret', steps: ['Open WooCommerce'] });
    await regenerateOrderWebhook('Duka Ltd');
    expect(axiosInstance.post.mock.calls[1][0]).toBe('murzak_pos.api.ecommerce_api.regenerate_order_webhook');
  });
});
