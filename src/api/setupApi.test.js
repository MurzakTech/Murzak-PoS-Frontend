import axiosInstance from './axiosInstance';
import { featuresFrom, getBusinessFeatures, getSetupState, getShopDetails, NO_FEATURES, saveBusinessKind, saveOpeningCash, saveSetupProgress, saveTaxId } from './setupApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const SETUP = 'murzak_pos.api.setup_api';

beforeEach(() => jest.resetAllMocks());

describe('the features of the shop', () => {
  test('are read by the names the screens use, and a missing one is off', () => {
    expect(featuresFrom({ features: { expiry: true, prescription_only: true, barcodes_first: false } })).toEqual({
      expiry: true,
      prescriptionOnly: true,
      barcodesFirst: false,
      unitsFirst: false,
      servicesFirst: false,
    });
    expect(featuresFrom(null)).toEqual(NO_FEATURES);
    expect(Object.values(NO_FEATURES).some(Boolean)).toBe(false);
    expect(featuresFrom({ features: { expiry: 'yes' } }).expiry).toBe(false);
  });

  test('getBusinessFeatures asks with or without a company and shapes the answer', async () => {
    axiosInstance.get.mockResolvedValue(reply({ company: 'Shop A', kind: 'retail', features: { barcodes_first: true, units_first: true }, opening_cash: 5000 }));
    const result = await getBusinessFeatures();
    expect(axiosInstance.get).toHaveBeenCalledWith(`${SETUP}.get_business_features`, undefined);
    expect(result).toEqual({ company: 'Shop A', kind: 'retail', features: { ...NO_FEATURES, barcodesFirst: true, unitsFirst: true }, openingCash: 5000 });
    await getBusinessFeatures('Shop A');
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${SETUP}.get_business_features`, { params: { company: 'Shop A' } });
  });

  test('a kind the server does not know about is no kind', async () => {
    axiosInstance.get.mockResolvedValue(reply({ kind: 'bakery', features: {} }));
    expect((await getBusinessFeatures()).kind).toBeNull();
  });
});

describe('the set-up state', () => {
  test('carries the offer, the kind, the steps passed and what the person may do', async () => {
    axiosInstance.get.mockResolvedValue(
      reply({ company: 'Shop A', kind: null, features: {}, opening_cash: 0, needs_setup: true, in_progress: false, offer: true, suggested_kind: 'pharmacy', industry_code: 'PHARMACY', can_edit: true, done_steps: ['business'], skipped_steps: ['cash'], finished: false, next_step: 'shop' })
    );
    const state = await getSetupState();
    expect(state).toMatchObject({ needsSetup: true, offer: true, suggestedKind: 'pharmacy', industryCode: 'PHARMACY', canEdit: true, doneSteps: ['business'], skippedSteps: ['cash'], finished: false, nextStep: 'shop' });
  });

  test('anything missing means no offer and no editing', async () => {
    axiosInstance.get.mockResolvedValue(reply({}));
    expect(await getSetupState()).toMatchObject({ offer: false, needsSetup: false, canEdit: false, doneSteps: [], nextStep: null, kind: null });
  });

  test('a refusal or a network failure is a sentence', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Please sign in first.' } } });
    await expect(getSetupState()).rejects.toThrow('Please sign in first.');
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getSetupState()).rejects.toThrow(/could not reach|offline/i);
  });
});

describe('saving', () => {
  test('the kind goes to the server and the new features come back', async () => {
    axiosInstance.post.mockResolvedValue(reply({ company: 'Shop A', kind: 'pharmacy', features: { expiry: true }, opening_cash: 0, done_steps: ['business'], skipped_steps: [], finished: false, next_step: 'shop' }));
    const result = await saveBusinessKind('pharmacy');
    expect(axiosInstance.post).toHaveBeenCalledWith(`${SETUP}.save_business_kind`, { kind: 'pharmacy' }, { allowRefusal: true });
    expect(result).toMatchObject({ kind: 'pharmacy', doneSteps: ['business'], nextStep: 'shop' });
    expect(result.features.expiry).toBe(true);
  });

  test('a step is saved as done, skipped, or the whole wizard as finished', async () => {
    axiosInstance.post.mockResolvedValue(reply({ done_steps: [], skipped_steps: ['cash'], finished: false, next_step: 'business' }));
    await saveSetupProgress('cash', { skipped: true });
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${SETUP}.save_setup_progress`, { step: 'cash', skipped: 1 }, { allowRefusal: true });
    await saveSetupProgress('shop');
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${SETUP}.save_setup_progress`, { step: 'shop' }, { allowRefusal: true });
    axiosInstance.post.mockResolvedValue(reply({ done_steps: [], skipped_steps: [], finished: true, next_step: 'business' }));
    expect((await saveSetupProgress('finish')).finished).toBe(true);
  });

  test('the opening cash goes as typed, and an empty one clears it', async () => {
    axiosInstance.post.mockResolvedValue(reply({ opening_cash: 5000, done_steps: ['cash'], skipped_steps: [], finished: false }));
    expect((await saveOpeningCash('5000')).openingCash).toBe(5000);
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${SETUP}.save_opening_cash`, { amount: '5000' }, { allowRefusal: true });
    await saveOpeningCash(null);
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${SETUP}.save_opening_cash`, { amount: '' }, { allowRefusal: true });
  });

  test('a refusal (not the owner) keeps the server sentence', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Only a business owner or System Manager can do this.' } } });
    await expect(saveBusinessKind('retail')).rejects.toThrow('Only a business owner');
  });
});

describe('the shop name and tax ID', () => {
  test('are read with the existing company call', async () => {
    axiosInstance.get.mockResolvedValue(reply({ name: 'Shop A', company_name: 'Shop A', tax_id: 'A123456789B' }));
    expect(await getShopDetails('Shop A')).toEqual({ name: 'Shop A', title: 'Shop A', taxId: 'A123456789B' });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.get_company', { params: { company_name: 'Shop A' } });
  });

  test('the tax ID is saved with the existing update call, naming only the company and the tax ID', async () => {
    axiosInstance.post.mockResolvedValue(reply({ name: 'Shop A', company_name: 'Shop A' }));
    await expect(saveTaxId({ company: 'Shop A', taxId: 'A123456789B' })).resolves.toBe('A123456789B');
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.update_company', { company_name: 'Shop A', tax_id: 'A123456789B' }, { allowRefusal: true });
  });

  test('a refusal from the company call is a sentence', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Company does not exist' } } });
    await expect(saveTaxId({ company: 'Shop A', taxId: 'X' })).rejects.toThrow('Company does not exist');
  });
});
