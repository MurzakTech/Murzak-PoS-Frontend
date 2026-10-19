import axiosInstance from './axiosInstance';
import { addCustomUnit, ensureIndustryUnits, getIndustryUnits, setUnitsIndustry, unitsShape } from './unitsApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const data = {
  company: 'Shop A',
  industry: 'pharmacy',
  industries: ['pharmacy', 'retail'],
  units: [
    { name: 'Nos', singular: 'piece', plural: 'pieces', whole: true, note: '', exists: true },
    { name: 'Meter', singular: 'metre', plural: 'metres', whole: false, note: 'Cut to length', exists: false },
  ],
  missing: 1,
  custom: [{ name: 'Jerrycan', plural: 'jerrycans' }],
  created: [],
  can_manage: true,
};
const reply = (d = data) => ({ data: { message: { success: true, data: d } } });

beforeEach(() => jest.resetAllMocks());

describe('reading the units', () => {
  test('asks the new call and shapes the answer', async () => {
    axiosInstance.get.mockResolvedValue(reply());
    const out = await getIndustryUnits({ company: 'Shop A' });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.units_api.get_industry_units', { params: { company: 'Shop A' } });
    expect(out.industry).toBe('pharmacy');
    expect(out.units[1]).toEqual({ name: 'Meter', singular: 'metre', plural: 'metres', whole: false, note: 'Cut to length', exists: false });
    expect(out.custom).toEqual([{ name: 'Jerrycan', plural: 'jerrycans' }]);
    expect(out.missing).toBe(1);
    expect(out.canManage).toBe(true);
  });

  test('sends nothing extra when no industry or company is given', async () => {
    axiosInstance.get.mockResolvedValue(reply());
    await getIndustryUnits();
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.units_api.get_industry_units', { params: {} });
  });

  test('a strange answer becomes empty lists, not a crash', () => {
    expect(unitsShape({})).toMatchObject({ units: [], custom: [], industries: [], missing: 0, canManage: false });
    expect(unitsShape({ units: [{ nothing: true }], custom: [null] }).units).toEqual([]);
  });

  test('a refusal reads as a friendly sentence', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Please sign in first.' } } });
    await expect(getIndustryUnits()).rejects.toThrow(/sign in/i);
  });

  test('a network failure reads as a friendly sentence', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getIndustryUnits()).rejects.toThrow();
  });
});

describe('changing the units', () => {
  test('ensure posts with the refusal shown on the page', async () => {
    axiosInstance.post.mockResolvedValue(reply({ ...data, created: ['Tablet'] }));
    const out = await ensureIndustryUnits({ industry: 'pharmacy', company: 'Shop A' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.units_api.ensure_industry_units', { industry: 'pharmacy', company: 'Shop A' }, { allowRefusal: true });
    expect(out.created).toEqual(['Tablet']);
  });

  test('the kind of shop is sent', async () => {
    axiosInstance.post.mockResolvedValue(reply());
    await setUnitsIndustry('hardware');
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.units_api.set_units_industry', { industry: 'hardware' }, { allowRefusal: true });
  });

  test('a custom unit is sent with whole numbers by default', async () => {
    axiosInstance.post.mockResolvedValue(reply({ ...data, added: 'Jerrycan' }));
    const out = await addCustomUnit({ name: 'Jerrycan', plural: 'jerrycans' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.units_api.add_custom_unit', { name: 'Jerrycan', plural: 'jerrycans', allow_parts: 0 }, { allowRefusal: true });
    expect(out.added).toBe('Jerrycan');
    await addCustomUnit({ name: 'Scoop', plural: 'scoops', allowParts: true });
    expect(axiosInstance.post.mock.calls[1][1].allow_parts).toBe(1);
  });

  test('the server refusing a repeat shows its words', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'There is already a unit called Kg.' } } });
    await expect(addCustomUnit({ name: 'Kg', plural: 'kgs' })).rejects.toThrow(/already a unit called Kg/);
  });
});
