import { act, renderHook, waitFor } from '@testing-library/react';
import useStationBoard from './useStationBoard';
import { KitchenApiError } from '../api/kitchenApi';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const at = (m) => new Date(Date.UTC(2026, 9, 10, 16, m)).toISOString();
const t = (id, over = {}) => ({ id: String(id), station: 'Kitchen', number: Number(id), round: 1, label: 'Table 4', status: 'New', createdAt: at(Number(id)), adds: [{ item_name: 'Pilau', qty: 1 }], changes: [], voids: [], ...over });
const fakeApi = (over = {}) => ({
  listTickets: jest.fn().mockResolvedValue([]),
  setTicketStatus: jest.fn().mockResolvedValue({}),
  ...over,
});
const failed = (m = 'No connection') => new KitchenApiError('failed', m);

const setup = async ({ api = fakeApi(), station = 'Kitchen', withHistory = false, onNew, pollMs = 1e9, historyMs = 1e9 } = {}) => {
  const hook = renderHook((props) => useStationBoard({ company: 'Shop A', warehouse: 'Main Store - SA', api, onNew, pollMs, historyMs, ...props }), { initialProps: { station, withHistory } });
  await waitFor(() => expect(hook.result.current.status).not.toBe('checking'));
  return { ...hook, api };
};

describe('the board', () => {
  it('shows the open tickets for its station, oldest first', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(3), t(1), t(2, { status: 'Preparing' })]) });
    const { result } = await setup({ api });
    expect(result.current.board.map((x) => x.id)).toEqual(['1', '2', '3']);
    expect(api.listTickets).toHaveBeenCalledWith({ company: 'Shop A', warehouse: 'Main Store - SA', station: 'Kitchen', statuses: ['New', 'Preparing', 'Ready'] });
  });

  it('calls onNew for tickets that arrive later, never for the first look, never twice', async () => {
    const onNew = jest.fn();
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValueOnce([t(1)]).mockResolvedValue([t(1), t(2)]) });
    const { result } = await setup({ api, onNew });
    expect(onNew).not.toHaveBeenCalled();
    await act(async () => { await result.current.refresh(); });
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onNew.mock.calls[0][0].map((x) => x.id)).toEqual(['2']);
    await act(async () => { await result.current.refresh(); });
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('keeps the last tickets on screen while the connection is down, and recovers', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValueOnce([t(1)]).mockRejectedValueOnce(failed()).mockResolvedValue([t(1), t(2)]) });
    const { result } = await setup({ api });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('offline');
    expect(result.current.board).toHaveLength(1);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('online');
    expect(result.current.board).toHaveLength(2);
  });

  it('stops asking when the server has no kitchen calls', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi({ listTickets: jest.fn().mockRejectedValue(new KitchenApiError('unavailable', 'no')) });
      const { result } = await setup({ api, pollMs: 1000 });
      expect(result.current.status).toBe('unavailable');
      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(api.listTickets).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('asks again every few seconds', async () => {
    jest.useFakeTimers();
    try {
      const { api } = await setup({ pollMs: 1000 });
      await act(async () => { jest.advanceTimersByTime(2000); });
      expect(api.listTickets.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts again when the station changes', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockImplementation(async ({ station }) => [t(station === 'Bar' ? 9 : 1, { station })]) });
    const { result, rerender } = await setup({ api });
    expect(result.current.board[0].id).toBe('1');
    rerender({ station: 'Bar', withHistory: false });
    await waitFor(() => expect(result.current.board[0]?.id).toBe('9'));
  });
});

describe('moving a ticket along', () => {
  it('shows the change at once and tells the server', async () => {
    let release;
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1)]), setTicketStatus: jest.fn(() => new Promise((resolve) => { release = resolve; })) });
    const { result } = await setup({ api });
    let pending;
    act(() => { pending = result.current.mark('1', 'Preparing'); });
    expect(result.current.board[0].status).toBe('Preparing'); // before the server has answered
    await act(async () => { release({}); await pending; });
    expect(api.setTicketStatus).toHaveBeenCalledWith({ company: 'Shop A', id: '1', status: 'Preparing' });
  });

  it('puts the ticket back and says why when the server refuses', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1)]), setTicketStatus: jest.fn().mockRejectedValue(failed('Not permitted')) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.mark('1', 'Ready'); });
    expect(r).toEqual({ ok: false, message: 'Not permitted' });
    expect(result.current.board[0].status).toBe('New');
    expect(result.current.error).toBe('Not permitted');
  });

  it('takes a served ticket off the board', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1, { status: 'Ready' }), t(2)]) });
    const { result } = await setup({ api });
    await act(async () => { await result.current.mark('1', 'Served'); });
    expect(result.current.board.map((x) => x.id)).toEqual(['2']);
  });
});

describe('the record of cancellations', () => {
  const day = [t(1), t(2, { status: 'Served', voids: [{ item_name: 'Tusker', qty: 1 }] }), t(3, { voids: [{ item_name: 'Pilau', qty: 2 }] })];

  it('is not fetched unless asked for', async () => {
    const { api } = await setup();
    expect(api.listTickets.mock.calls.every(([q]) => !q.since)).toBe(true);
  });

  it('lists the last day\'s tickets that cancel something, newest first, including ones already finished', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockImplementation(async ({ since }) => (since ? day : [])) });
    const { result } = await setup({ api, withHistory: true });
    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.history.map((x) => x.id)).toEqual(['3', '2']);
    const call = api.listTickets.mock.calls.find(([q]) => q.since)[0];
    expect(call).toMatchObject({ station: 'Kitchen', warehouse: 'Main Store - SA' });
    expect(new Date(call.since).getTime()).toBeLessThan(Date.now());
  });
});
