import axiosInstance from './axiosInstance';
import { getCompany, readCompany, toCompanyPayload, updateCompany } from './businessApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const serverCompany = {
  name: 'Shop A',
  company_name: 'Shop A',
  abbr: 'SA',
  country: 'Kenya',
  default_currency: 'KES',
  tax_id: 'P000000000A',
  phone_no: '0700000000',
  email: 'info@shop-a.test',
  company_address: { address_line1: '1 Test Road', address_line2: null, city: 'Nairobi', state: '', country: 'Kenya', pincode: '00100', phone: '0711000000', email: 'desk@shop-a.test' },
  company_contact: { first_name: 'Amina', last_name: 'Otieno', email: 'amina@shop-a.test', mobile: '0722000000', phone: null },
};

beforeEach(() => jest.resetAllMocks());

describe('readCompany', () => {
  test('reads the shape the server sends: { success, data }', () => {
    const company = readCompany({ success: true, data: serverCompany });
    expect(company).toMatchObject({ name: 'Shop A', companyName: 'Shop A', abbr: 'SA', taxId: 'P000000000A', country: 'Kenya', currency: 'KES', phone: '0711000000', email: 'desk@shop-a.test' });
    expect(company.address).toEqual({ line1: '1 Test Road', line2: '', city: 'Nairobi', state: '', pincode: '00100' });
    expect(company.contact).toEqual({ firstName: 'Amina', lastName: 'Otieno', email: 'amina@shop-a.test', mobile: '0722000000', phone: '' });
  });

  test('reads the shape the current screen expects: { company } with an address object', () => {
    const company = readCompany({ company: { ...serverCompany, company_address: undefined, address: { address_line1: '2 Other Road', city: 'Mombasa', email_id: 'x@shop-a.test' } } });
    expect(company.address.line1).toBe('2 Other Road');
    expect(company.email).toBe('x@shop-a.test');
  });

  test('falls back to the company phone and email when there is no address yet', () => {
    const company = readCompany({ data: { ...serverCompany, company_address: null } });
    expect(company.phone).toBe('0700000000');
    expect(company.email).toBe('info@shop-a.test');
    expect(company.address.line1).toBe('');
  });

  test('an empty reply gives empty text, never undefined', () => {
    const company = readCompany(null);
    expect(company.companyName).toBe('');
    expect(company.contact.firstName).toBe('');
  });
});

describe('the payload', () => {
  test('is the shape the current Business screen sends, and leaves empty optional fields out', () => {
    const payload = toCompanyPayload(readCompany({ data: serverCompany }));
    expect(payload).toMatchObject({ name: 'Shop A', company_name: 'Shop A', abbr: 'SA', country: 'Kenya', default_currency: 'KES', tax_id: 'P000000000A' });
    expect(payload.company_address).toMatchObject({ address_line1: '1 Test Road', address_line2: undefined, city: 'Nairobi', state: undefined, pincode: '00100', phone: '0711000000', email_id: 'desk@shop-a.test', email: 'desk@shop-a.test' });
    expect(payload.company_contact).toEqual({ first_name: 'Amina', last_name: 'Otieno', email: 'amina@shop-a.test', mobile: '0722000000', phone: undefined });
  });
});

describe('getCompany', () => {
  test('asks the existing call for the signed-in business', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: serverCompany } } });
    const company = await getCompany('Shop A');
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.get_company', { params: { company: 'Shop A', company_name: 'Shop A' } });
    expect(company.companyName).toBe('Shop A');
  });

  test('a refusal or a network failure becomes a plain sentence', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: "Company 'X' does not exist" } } });
    await expect(getCompany('X')).rejects.toThrow(/does not exist/);
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getCompany('X')).rejects.toThrow(/could not reach|offline/i);
  });
});

describe('updateCompany', () => {
  test('posts the existing call and lets a refusal show on the card', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, message: 'Company updated successfully', data: {} } } });
    const company = readCompany({ data: serverCompany });
    await expect(updateCompany(company)).resolves.toBe(company);
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.onboarding_api.update_company', expect.objectContaining({ company_name: 'Shop A' }), { allowRefusal: true });
  });

  test('keeps the server sentence when it refuses', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Validation error: Phone number is not valid' } } });
    await expect(updateCompany(readCompany({ data: serverCompany }))).rejects.toThrow('Phone number is not valid');
  });
});
