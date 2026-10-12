import axiosInstance from './axiosInstance';
import { getNewLook, setNewLook } from './newLookApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });

beforeEach(() => jest.resetAllMocks());

describe('reading the New look switch', () => {
  test('is on only when the server says enabled: true', async () => {
    axiosInstance.get.mockResolvedValue(reply({ company: 'Shop A', enabled: true }));
    await expect(getNewLook('Shop A')).resolves.toBe(true);
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.new_look_api.get_new_look', { params: { company: 'Shop A' } });
  });

  test('is off when the server says so, or says nothing useful', async () => {
    axiosInstance.get.mockResolvedValue(reply({ enabled: false }));
    await expect(getNewLook()).resolves.toBe(false);
    axiosInstance.get.mockResolvedValue(reply({}));
    await expect(getNewLook()).resolves.toBe(false);
    axiosInstance.get.mockResolvedValue(reply({ enabled: 'yes' }));
    await expect(getNewLook()).resolves.toBe(false);
  });

  test('asks without a company when none is known', async () => {
    axiosInstance.get.mockResolvedValue(reply({ enabled: true }));
    await getNewLook();
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.new_look_api.get_new_look', undefined);
  });

  test('a network failure becomes a plain sentence', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getNewLook()).rejects.toThrow(/could not reach|offline/i);
  });

  test('a refusal in a normal reply is an error', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Please sign in first.' } } });
    await expect(getNewLook()).rejects.toThrow('Please sign in first.');
  });
});

describe('changing the New look switch', () => {
  test('sends the choice and company, and answers with the new state', async () => {
    axiosInstance.post.mockResolvedValue(reply({ company: 'Shop A', enabled: true }));
    await expect(setNewLook(true, 'Shop A')).resolves.toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.new_look_api.set_new_look',
      { enabled: true, company: 'Shop A' },
      { allowRefusal: true }
    );
  });

  test('leaves the company out when none is known', async () => {
    axiosInstance.post.mockResolvedValue(reply({ enabled: false }));
    await expect(setNewLook(false)).resolves.toBe(false);
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ enabled: false });
  });

  test('a refused change (not an owner) is shown as a sentence, not a code', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 403, data: { exc_type: 'PermissionError' } } });
    const error = await setNewLook(true).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/permission/i);
    expect(error.message).not.toMatch(/403|PermissionError/);
  });

  test('a refusal inside a normal reply is an error with the server wording', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Only a business owner or System Manager can do this.' } } });
    await expect(setNewLook(true)).rejects.toThrow('Only a business owner or System Manager can do this.');
  });
});
