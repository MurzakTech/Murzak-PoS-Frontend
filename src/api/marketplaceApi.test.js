import axiosInstance from './axiosInstance';
import { getMarketplace } from './marketplaceApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('getMarketplace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('turns the server reply into plain groups and items', async () => {
    axiosInstance.get.mockResolvedValue({
      data: { message: { success: true, data: { groups: [{ key: 'online', items: [{ id: 'a-b', name: 'Thing', monthly: '500', setup: null, checkout_url: 'https://murzaktech.tech/checkout/new?serviceId=a-b' }] }] } } },
    });
    await expect(getMarketplace()).resolves.toEqual({
      groups: [{ key: 'online', items: [{ id: 'a-b', name: 'Thing', monthly: 500, setup: 0, checkoutUrl: 'https://murzaktech.tech/checkout/new?serviceId=a-b' }] }],
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.marketplace_api.get_marketplace');
  });

  it('gives empty lists for a reply with nothing in it', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: {} } } });
    await expect(getMarketplace()).resolves.toEqual({ groups: [] });
  });

  it('throws the server\'s message when it refuses', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'The marketplace could not be reached just now.' } } });
    await expect(getMarketplace()).rejects.toThrow('could not be reached');
  });

  it('throws a plain sentence when the call itself fails', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getMarketplace()).rejects.toBeInstanceOf(Error);
  });
});
