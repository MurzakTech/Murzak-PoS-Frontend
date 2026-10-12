import axiosInstance from './axiosInstance';
import { DEFAULT_LANGUAGES, getLanguages, setLanguage } from './languageApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

afterEach(() => jest.resetAllMocks());

it('reads the choices and the language in use', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { languages: [{ code: 'en', name: 'English' }, { code: 'sw', name: 'Kiswahili' }], current: 'sw' } } } });
  expect(await getLanguages()).toEqual({ languages: DEFAULT_LANGUAGES, current: 'sw' });
});

it('falls back to English and Kiswahili when the server lists none', async () => {
  axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: {} } } });
  expect(await getLanguages()).toEqual({ languages: DEFAULT_LANGUAGES, current: 'en' });
});

it('asks the server to change the language', async () => {
  axiosInstance.post.mockResolvedValue({ data: { message: { success: true, data: { current: 'sw' } } } });
  expect(await setLanguage('sw')).toBe('sw');
  expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.language_api.set_language', { language: 'sw' });
});
