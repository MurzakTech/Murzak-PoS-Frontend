import axiosInstance from './axiosInstance';
import { getPosProfile, readProfile, updatePosProfile } from './tillOptionsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

describe('readProfile', () => {
  test('reads the four switches as yes or no', () => {
    expect(readProfile({ pos_profile: { name: 'Main', update_stock: 1, allow_discount_change: 0, allow_rate_change: true, allow_partial_payment: false } })).toEqual({
      name: 'Main',
      updateStock: true,
      allowDiscountChange: false,
      allowRateChange: true,
      allowPartialPayment: false,
    });
  });

  test('a switch the server does not send takes the current screen default', () => {
    expect(readProfile({ pos_profile: { name: 'Main' } })).toEqual({ name: 'Main', updateStock: true, allowDiscountChange: true, allowRateChange: true, allowPartialPayment: false });
  });

  test('no profile gives null, in either shape', () => {
    expect(readProfile({ pos_profile: null })).toBeNull();
    expect(readProfile({ data: { pos_profile: null } })).toBeNull();
    expect(readProfile(undefined)).toBeNull();
  });
});

test('getPosProfile asks the existing call', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { pos_profile: { name: 'Main', update_stock: 1 } } } });
  const profile = await getPosProfile('Shop A');
  expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.get_pos_profile', { params: { company: 'Shop A' } });
  expect(profile.name).toBe('Main');
});

test('updatePosProfile sends the whole set in the shape the current screen sends', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { pos_profile: {}, message: 'POS Profile updated successfully' } } });
  const profile = { name: 'Main', updateStock: false, allowDiscountChange: true, allowRateChange: false, allowPartialPayment: true };
  await expect(updatePosProfile({ company: 'Shop A', profile })).resolves.toBe(profile);
  expect(axiosInstance.post).toHaveBeenCalledWith(
    'murzak_pos.api.onboarding_api.update_pos_profile',
    { name: 'Main', company: 'Shop A', profile_name: 'Main', update_stock: false, allow_discount_change: true, allow_rate_change: false, allow_partial_payment: true },
    { allowRefusal: true }
  );
});

test('a refusal keeps the server sentence and a network failure is plain', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'You cannot change this till profile.' } } });
  await expect(updatePosProfile({ company: 'Shop A', profile: { name: 'Main' } })).rejects.toThrow('You cannot change this till profile.');
  axiosInstance.get.mockRejectedValue(new Error('Network Error'));
  await expect(getPosProfile('Shop A')).rejects.toThrow(/could not reach|offline/i);
});
