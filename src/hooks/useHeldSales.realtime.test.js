import { act, renderHook, waitFor } from '@testing-library/react';
import useHeldSales from './useHeldSales';
import { HeldSalesError } from '../api/heldSalesApi';
import * as realtime from '../realtime/realtimeClient';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../realtime/realtimeClient');

const bill = (id) => ({ id: String(id), heldAt: new Date(2026, 9, 10, 10, id).toISOString(), label: `Table ${id}`, customer: 'Walk-in Customer', cart: [{ subtotal: 100 }], heldBy: 'Amina' });
const storage = () => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
const held = (over = {}) => ({ kind: 'held', action: 'saved', held_id: '2', company: 'Shop A', warehouse: 'Main Store - SA', ...over });

const setup = async ({ list = jest.fn().mockResolvedValue([bill(1)]), company = 'Shop A', pollMs = 1e9 } = {}) => {
  const api = { listHeldSales: list, saveHeldSale: jest.fn(), deleteHeldSale: jest.fn() };
  const view = renderHook(() => useHeldSales({ company, warehouse: 'Main Store - SA', storage: storage(), api, pollMs }));
  await waitFor(() => expect(view.result.current.status).toBe('online'));
  return { ...view, api };
};

beforeEach(() => realtime.resetRealtime());
afterEach(() => jest.useRealTimers());

it('shows a bill held on another till the moment the server says so', async () => {
  const { result, api } = await setup({ list: jest.fn().mockResolvedValueOnce([bill(1)]).mockResolvedValue([bill(1), bill(2)]) });
  expect(result.current.held).toHaveLength(1);
  await act(async () => { realtime.emit(held()); });
  await waitFor(() => expect(result.current.held.map((h) => h.id)).toEqual(['1', '2']));
  expect(api.listHeldSales).toHaveBeenCalledTimes(2);
});

it('drops a bill another till brought back or threw away', async () => {
  const { result } = await setup({ list: jest.fn().mockResolvedValueOnce([bill(1), bill(2)]).mockResolvedValue([bill(1)]) });
  expect(result.current.held).toHaveLength(2);
  await act(async () => { realtime.emit(held({ action: 'removed' })); });
  await waitFor(() => expect(result.current.held.map((h) => h.id)).toEqual(['1']));
});

it('ignores other kinds of message, another business and another store', async () => {
  const { api } = await setup();
  await act(async () => {
    realtime.emit({ kind: 'kitchen', status: 'Ready', company: 'Shop A' });
    realtime.emit(held({ company: 'Shop B' }));
    realtime.emit(held({ warehouse: 'Branch Store - SA' }));
  });
  expect(api.listHeldSales).toHaveBeenCalledTimes(1);
});

it('reads the list for a bill held with no store, and for a message that names no store', async () => {
  const { api } = await setup();
  await act(async () => { realtime.emit(held({ warehouse: null })); });
  await waitFor(() => expect(api.listHeldSales).toHaveBeenCalledTimes(2));
  await act(async () => { realtime.emit({ kind: 'held', company: 'Shop A' }); });
  await waitFor(() => expect(api.listHeldSales).toHaveBeenCalledTimes(3));
});

it('reads the list again when the live connection comes back, for messages missed while it was down', async () => {
  const { api } = await setup();
  await act(async () => { realtime.setConnected(true); });
  await waitFor(() => expect(api.listHeldSales).toHaveBeenCalledTimes(2));
});

it('does not ask a server that has no held-sales calls', async () => {
  const list = jest.fn().mockRejectedValue(new HeldSalesError('unavailable', 'no calls'));
  const { result } = renderHook(() => useHeldSales({ company: 'Shop A', warehouse: 'Main Store - SA', storage: storage(), api: { listHeldSales: list }, pollMs: 1e9 }));
  await waitFor(() => expect(result.current.status).toBe('unavailable'));
  await act(async () => { realtime.emit(held()); });
  expect(list).toHaveBeenCalledTimes(1);
});

it('listens to nothing without a business', () => {
  renderHook(() => useHeldSales({ company: '', warehouse: '', storage: storage(), api: { listHeldSales: jest.fn() }, pollMs: 1e9 }));
  expect(realtime.timesOpened()).toBe(0);
});

it('keeps its normal pace while live (never faster) and its normal pace while down', async () => {
  jest.useFakeTimers();
  const list = jest.fn().mockResolvedValue([]);
  const api = { listHeldSales: list };
  renderHook(() => useHeldSales({ company: 'Shop A', warehouse: 'Main Store - SA', storage: storage(), api, pollMs: 20000 }));
  await act(async () => { await Promise.resolve(); });
  expect(list).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(list).toHaveBeenCalledTimes(2);
  await act(async () => { realtime.setConnected(true); });
  const afterConnect = list.mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(19000); });
  expect(list).toHaveBeenCalledTimes(afterConnect);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(list).toHaveBeenCalledTimes(afterConnect + 1);
});
