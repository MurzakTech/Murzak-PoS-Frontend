import axiosInstance from './axiosInstance';
import { getEtimsStatus, readEtimsStatus } from './taxApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

test('keeps only whether eTIMS is on and in test mode, never anything else the server sends', () => {
  const status = readEtimsStatus({ etims_settings: { name: 'X', tin: 'P000000000A', bhfid: '00', dvcsrlno: 'SN-1', is_active: 1, sandbox: 0, vendor: 'v' } });
  expect(status).toEqual({ found: true, active: true, test: false });
  expect(JSON.stringify(status)).not.toMatch(/P000000000A|SN-1/);
});

test('no settings means eTIMS is not set up', () => {
  expect(readEtimsStatus({ etims_settings: null })).toEqual({ found: false, active: false, test: false });
  expect(readEtimsStatus(undefined)).toEqual({ found: false, active: false, test: false });
});

test('asks the existing call for the business', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { etims_settings: { is_active: true, sandbox: true } } } });
  await expect(getEtimsStatus('Shop A')).resolves.toEqual({ found: true, active: true, test: true });
  expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.get_etims_settings', { params: { company: 'Shop A' } });
});

test('a refusal (only an owner or an accounts manager may see it) is a plain sentence', async () => {
  const error = new Error('x');
  error.isAxiosError = true;
  error.response = { status: 403, data: { exception: 'frappe.exceptions.PermissionError: Only System Manager or Accounts Manager can see the eTIMS settings' } };
  axiosInstance.get.mockRejectedValue(error);
  await expect(getEtimsStatus('Shop A')).rejects.toThrow(/System Manager|permission/i);
});
