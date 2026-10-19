import axiosInstance from './axiosInstance';
import { getBrand, setBrand, uploadLogo } from './brandApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const file = (type, size, name = 'logo.png') => ({ type, size, name });

beforeEach(() => jest.resetAllMocks());

describe('reading the brand', () => {
  test('asks for the brand and tidies the answer', async () => {
    axiosInstance.get.mockResolvedValue(reply({ company: 'Shop A', accent: 'teal', style: 'a4', tagline: 'Fresh', logo: '/files/l.png', social: '@a', website: 'a.co.ke', footer: '' }));
    await expect(getBrand('Shop A')).resolves.toMatchObject({ accent: 'teal', style: 'a4', tagline: 'Fresh', logo: '/files/l.png' });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.brand_api.get_brand', { params: { company: 'Shop A' } });
  });
  test('an answer with a colour that is not on the list falls back to the default', async () => {
    axiosInstance.get.mockResolvedValue(reply({ accent: '#ff0000' }));
    await expect(getBrand()).resolves.toMatchObject({ accent: 'indigo' });
  });
  test('a failure becomes a plain sentence', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getBrand()).rejects.toThrow(/could not reach|offline/i);
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Please sign in first.' } } });
    await expect(getBrand()).rejects.toThrow('Please sign in first.');
  });
});

describe('saving the brand', () => {
  test('sends only the named fields as JSON and does not show a pop-up for a refusal', async () => {
    axiosInstance.post.mockResolvedValue(reply({ accent: 'red', style: 'thermal80' }));
    const saved = await setBrand({ accent: 'red' }, 'Shop A');
    expect(saved.accent).toBe('red');
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.brand_api.set_brand', { brand: '{"accent":"red"}', company: 'Shop A' }, { allowRefusal: true });
  });
  test('a refusal comes back as the server sentence', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Only a business owner can do this.' } } });
    await expect(setBrand({ accent: 'red' })).rejects.toThrow('Only a business owner can do this.');
  });
});

describe('uploading the logo', () => {
  test('refuses a wrong type or a file over 1 MB before sending anything', async () => {
    await expect(uploadLogo(file('image/svg+xml', 10))).rejects.toThrow(/JPG, PNG or WebP/);
    await expect(uploadLogo(file('image/png', 1024 * 1024 + 1))).rejects.toThrow(/1 MB/);
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });
  test('sends the picture as a public file, as it is, and returns its address', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { file_url: '/files/logo.png' } } });
    const f = new File(['x'], 'logo.png', { type: 'image/png' });
    await expect(uploadLogo(f)).resolves.toBe('/files/logo.png');
    const [url, form, config] = axiosInstance.post.mock.calls[0];
    expect(url).toBe('upload_file');
    expect(form.get('is_private')).toBe('0');
    expect(form.get('file')).toBeInstanceOf(File);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });
  test('says so when the server does not confirm the file', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: {} } });
    await expect(uploadLogo(new File(['x'], 'l.png', { type: 'image/png' }))).rejects.toThrow(/did not confirm/);
  });
});
