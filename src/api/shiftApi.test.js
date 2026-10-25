import axiosInstance from './axiosInstance';
import { getShiftReport, listCashMovements, recordCashMovement } from './shiftApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const refusal = (message) => ({ data: { message: { success: false, message } } });

beforeEach(() => jest.resetAllMocks());

describe('recordCashMovement', () => {
  const entry = { session: 'POS-OPE-1', kind: 'Paid Out', amount: '300', reason: 'Petty cash', note: 'tea', clientId: 'c-1' };

  test('sends the movement with the till reference and lets a refusal reach the dialog', async () => {
    axiosInstance.post.mockResolvedValue(reply({ movement: { id: 'M1', kind: 'Paid Out', amount: '300' }, duplicate: false, cash_in_till: '2710' }));
    const got = await recordCashMovement(entry);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.shift_api.record_cash_movement',
      { session: 'POS-OPE-1', kind: 'Paid Out', amount: 300, reason: 'Petty cash', note: 'tea', client_id: 'c-1' },
      { allowRefusal: true }
    );
    expect(got).toEqual({ movement: { id: 'M1', kind: 'Paid Out', amount: 300 }, duplicate: false, cash_in_till: 2710 });
  });

  test('leaves out an empty note and an unknown till total', async () => {
    axiosInstance.post.mockResolvedValue(reply({ movement: { id: 'M1', amount: 5 }, duplicate: true }));
    const got = await recordCashMovement({ ...entry, note: '' });
    expect(axiosInstance.post.mock.calls[0][1].note).toBeUndefined();
    expect(got.cash_in_till).toBeNull();
    expect(got.duplicate).toBe(true);
  });

  test('a refusal comes back as an error with the server words', async () => {
    axiosInstance.post.mockResolvedValue(refusal('That is more than the till holds. Expected cash in the till is 100.00.'));
    await expect(recordCashMovement(entry)).rejects.toThrow(/more than the till holds/);
  });

  test('a call that fails is an error in plain words', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network Error'));
    await expect(recordCashMovement(entry)).rejects.toThrow();
  });
});

describe('listCashMovements', () => {
  test('asks for one shift and fills the gaps', async () => {
    axiosInstance.get.mockResolvedValue(reply({ session: 'POS-OPE-1', movements: [{ id: 'A', amount: '1000', kind: 'Paid In' }], totals: { 'Paid In': '1000' } }));
    const got = await listCashMovements('POS-OPE-1');
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.shift_api.list_cash_movements', { params: { session: 'POS-OPE-1' } });
    expect(got.movements[0].amount).toBe(1000);
    expect(got.totals).toEqual({ 'Paid In': 1000, 'Paid Out': 0, 'Safe Drop': 0 });
    expect(got.reasons).toEqual({});
  });
});

describe('getShiftReport', () => {
  test('turns every figure into a number and leaves uncounted figures empty', async () => {
    axiosInstance.get.mockResolvedValue(
      reply({
        kind: 'X',
        sales: { count: '2', gross: '1450', net: '818.97', tax: '131.04', discounts: '50', average: '725' },
        returns: { count: 1, total: '500' },
        credit_sales: '0',
        by_method: [{ mode: 'Cash', key: 'cash', sales: '1450', refunds: 0, expected: '1850', counted: null, difference: null }],
        cash: { opening: '0', sales: '1450', paid_in: '1000', paid_out: '200', safe_drops: '400', refunds: 0, expected: '1850', counted: null, difference: null, word: null },
        totals: { expected: '1850', counted: null, difference: null, word: null },
        movements: [{ id: 'A', amount: '1000' }],
        movement_totals: { 'Paid In': '1000', 'Paid Out': '200', 'Safe Drop': '400' },
      })
    );
    const got = await getShiftReport('POS-OPE-1');
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.shift_api.get_shift_report', { params: { session: 'POS-OPE-1' } });
    expect(got.kind).toBe('X');
    expect(got.sales).toEqual({ count: 2, gross: 1450, net: 818.97, tax: 131.04, discounts: 50, average: 725 });
    expect(got.by_method[0]).toMatchObject({ expected: 1850, counted: null, difference: null });
    expect(got.cash).toMatchObject({ paid_in: 1000, safe_drops: 400, counted: null });
    expect(got.movement_totals).toEqual({ 'Paid In': 1000, 'Paid Out': 200, 'Safe Drop': 400 });
  });

  test('a shift with no cash line has no drawer', async () => {
    axiosInstance.get.mockResolvedValue(reply({ kind: 'Z', sales: {}, returns: {}, by_method: [], cash: null, totals: {}, movements: [], movement_totals: {} }));
    const got = await getShiftReport('POS-OPE-1');
    expect(got.cash).toBeNull();
    expect(got.sales.count).toBe(0);
  });

  test('a report that is not ready is an error with the server words', async () => {
    axiosInstance.get.mockResolvedValue(refusal('This shift is closed but its closing record is not ready yet. Try again in a minute.'));
    await expect(getShiftReport('POS-OPE-1')).rejects.toThrow(/not ready yet/);
  });
});
