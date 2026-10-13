import axiosInstance from './axiosInstance';
import { closeTill, getTillState, previewClose } from './tillApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const refusal = (message) => ({ data: { message: { success: false, message } } });

beforeEach(() => jest.resetAllMocks());

describe('getTillState', () => {
  test('asks for the state and sends only the parameters that were given', async () => {
    axiosInstance.get.mockResolvedValue(reply({ state: 'closed', session: null }));
    await getTillState();
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.till_api.get_till_state', { params: {} });
    await getTillState({ pos_profile: 'Main till', warehouse: '', extra: 'x' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.till_api.get_till_state', { params: { pos_profile: 'Main till' } });
  });

  test('returns the open session, the expected rows, the held count and the recent sales', async () => {
    axiosInstance.get.mockResolvedValue(
      reply({
        state: 'open',
        session: { name: 'POS-OPE-1', opened_at: '08:15', cashier_name: 'Wanjiru', opening: [{ mode: 'Cash', amount: 2000 }] },
        expected: [{ mode: 'Cash', key: 'cash', label: 'Cash', opening: '2000', sales: '3500', refunds: 0, expected: '5500' }],
        held_count: 3,
        recent_sales: [{ id: 'S1', receipt: '#0033', time: '14:05', customer: 'Walk-in', total: 350, status: 'paid' }],
      })
    );
    const state = await getTillState();
    expect(state.state).toBe('open');
    expect(state.session.name).toBe('POS-OPE-1');
    expect(state.expected[0]).toMatchObject({ key: 'cash', opening: 2000, sales: 3500, refunds: 0, expected: 5500 });
    expect(state.held_count).toBe(3);
    expect(state.recent_sales).toHaveLength(1);
  });

  test('fills the gaps so a screen never has to check for missing lists', async () => {
    axiosInstance.get.mockResolvedValue(reply({ state: 'something else' }));
    await expect(getTillState()).resolves.toEqual({ state: 'closed', session: null, expected: [], held_count: 0, recent_sales: [] });
  });

  test('turns a refusal, an empty answer and a network failure into plain messages', async () => {
    axiosInstance.get.mockResolvedValue(refusal('You do not have access to the till.'));
    await expect(getTillState()).rejects.toThrow('You do not have access to the till.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(getTillState()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue({ request: {}, isAxiosError: true, message: 'Network Error' });
    await expect(getTillState()).rejects.toThrow(/connect|internet|network|offline/i);
  });
});

describe('previewClose', () => {
  const preview = { closed: false, lines: [{ mode: 'Cash', label: 'Cash', expected: 5500, counted: '5400', difference: '-100' }], total_expected: 5500, total_counted: 5400, difference: -100, word: 'short' };

  test('posts confirm false, so nothing is closed', async () => {
    axiosInstance.post.mockResolvedValue(reply(preview));
    await previewClose({ session: 'POS-OPE-1', counted: [{ mode: 'Cash', amount: '5400' }] });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.till_api.close_till', { session: 'POS-OPE-1', counted: [{ mode: 'Cash', amount: 5400 }], confirm: false }, { allowRefusal: true });
  });

  test('returns the lines and the difference as numbers', async () => {
    axiosInstance.post.mockResolvedValue(reply(preview));
    const result = await previewClose({ session: 'S', counted: [{ mode: 'Cash', amount: 5400 }] });
    expect(result.closed).toBe(false);
    expect(result.lines[0]).toMatchObject({ expected: 5500, counted: 5400, difference: -100 });
    expect(result).toMatchObject({ total_expected: 5500, total_counted: 5400, difference: -100, word: 'short', closing_entry: null });
  });

  test('keeps a missing count as null, not zero', async () => {
    axiosInstance.post.mockResolvedValue(reply({ lines: [{ mode: 'M-Pesa', expected: 900, counted: null, difference: null }], difference: 0, word: 'matches' }));
    const result = await previewClose({ session: 'S', counted: [] });
    expect(result.lines[0].counted).toBeNull();
    expect(result.lines[0].difference).toBeNull();
  });

  test('sends a typed zero, and leaves out blank or invalid amounts', async () => {
    axiosInstance.post.mockResolvedValue(reply(preview));
    await previewClose({ session: 'S', counted: [{ mode: 'Cash', amount: 0 }, { mode: 'Card', amount: '' }, { mode: 'X', amount: 'abc' }, { amount: 5 }, null] });
    expect(axiosInstance.post.mock.calls[0][1].counted).toEqual([{ mode: 'Cash', amount: 0 }]);
  });

  test('turns a refusal into a plain message', async () => {
    axiosInstance.post.mockResolvedValue(refusal('Count the cash first.'));
    await expect(previewClose({ session: 'S', counted: [] })).rejects.toThrow('Count the cash first.');
  });
});

describe('closeTill', () => {
  test('posts confirm true and returns the closing entry', async () => {
    axiosInstance.post.mockResolvedValue(reply({ closed: true, lines: [], total_expected: 5500, total_counted: 5500, difference: 0, word: 'matches', closing_entry: 'POS-CLO-1' }));
    const result = await closeTill({ session: 'POS-OPE-1', counted: [{ mode: 'Cash', amount: 5500 }] });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.till_api.close_till', { session: 'POS-OPE-1', counted: [{ mode: 'Cash', amount: 5500 }], confirm: true }, { allowRefusal: true });
    expect(result).toMatchObject({ closed: true, closing_entry: 'POS-CLO-1', word: 'matches' });
  });

  test('a failure while closing is a plain message and not a closed session', async () => {
    axiosInstance.post.mockRejectedValue({ request: {}, isAxiosError: true, message: 'Network Error' });
    await expect(closeTill({ session: 'S', counted: [{ mode: 'Cash', amount: 1 }] })).rejects.toThrow();
    axiosInstance.post.mockResolvedValue(refusal('This shift is already closed.'));
    await expect(closeTill({ session: 'S', counted: [{ mode: 'Cash', amount: 1 }] })).rejects.toThrow('This shift is already closed.');
  });
});
