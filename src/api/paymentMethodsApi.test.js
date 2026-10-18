import axiosInstance from './axiosInstance';
import { getPaymentMethods, getTillPaymentModes, setPaymentMethod } from './paymentMethodsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });

beforeEach(() => jest.resetAllMocks());

test('reads the switches, with or without a company', async () => {
  axiosInstance.get.mockResolvedValue(reply({ methods: [], other: [] }));
  await expect(getPaymentMethods()).resolves.toEqual({ methods: [], other: [] });
  expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.payment_methods_api.get_payment_methods', undefined);
  await getPaymentMethods('Shop A');
  expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.payment_methods_api.get_payment_methods', { params: { company: 'Shop A' } });
});

test('switches one method, naming the mode only for Other, and lets a refusal show beside the switch', async () => {
  axiosInstance.post.mockResolvedValue(reply({ methods: [], other: [] }));
  await setPaymentMethod({ key: 'mpesa', enabled: false });
  expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.payment_methods_api.set_payment_method', { key: 'mpesa', enabled: false }, { allowRefusal: true });
  await setPaymentMethod({ key: 'other', enabled: true, mode: 'Cheque', company: 'Shop A' });
  expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.payment_methods_api.set_payment_method', { key: 'other', enabled: true, mode: 'Cheque', company: 'Shop A' }, { allowRefusal: true });
});

test('a refusal from the server keeps its own sentence', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'At least one way of taking money must stay on. Switch another one on first.' } } });
  await expect(setPaymentMethod({ key: 'cash', enabled: false })).rejects.toThrow('At least one way of taking money must stay on.');
});

test('the till list is the names in order, and empty when the server gives none', async () => {
  axiosInstance.get.mockResolvedValue(reply({ modes: ['Cash', 'Mpesa'] }));
  await expect(getTillPaymentModes()).resolves.toEqual(['Cash', 'Mpesa']);
  axiosInstance.get.mockResolvedValue(reply({}));
  await expect(getTillPaymentModes()).resolves.toEqual([]);
});

test('a network failure becomes a plain sentence', async () => {
  axiosInstance.get.mockRejectedValue(new Error('Network Error'));
  await expect(getPaymentMethods()).rejects.toThrow(/could not reach|offline/i);
});
