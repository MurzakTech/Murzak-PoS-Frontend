import { act, renderHook, waitFor } from '@testing-library/react';
import useKitchenTickets from './useKitchenTickets';
import { KitchenApiError } from '../api/kitchenApi';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const t = (id, over = {}) => ({ id: String(id), clientId: `c${id}`, station: 'Kitchen', number: Number(id), round: 1, label: 'Table 4', status: 'Ready', ...over });
const fakeApi = (over = {}) => ({
  listTickets: jest.fn().mockResolvedValue([]),
  sendTickets: jest.fn().mockImplementation(async ({ tickets }) => tickets.map((x, i) => ({ ...x, id: `S${i + 1}`, number: 14 }))),
  setTicketStatus: jest.fn().mockResolvedValue({}),
  ...over,
});
const failed = (m = 'No connection') => new KitchenApiError('failed', m);
const unavailable = () => new KitchenApiError('unavailable', 'no calls');

const setup = async ({ api = fakeApi(), enabled = true, company = 'Shop A', warehouse = 'Main Store - SA', pollMs = 1e9, settle = true } = {}) => {
  const hook = renderHook((props) => useKitchenTickets({ api, pollMs, ...props }), { initialProps: { company, warehouse, enabled } });
  if (settle && enabled) await waitFor(() => expect(['checking']).not.toContain(hook.result.current.status));
  return { ...hook, api };
};

describe('when station screens are off', () => {
  it('does nothing at all', async () => {
    const { result, api } = await setup({ enabled: false });
    expect(result.current.status).toBe('off');
    expect(api.listTickets).not.toHaveBeenCalled();
    expect(result.current.ready).toEqual([]);
  });
});

describe('the ready tray', () => {
  it('shows the tickets a station has marked Ready for this store', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1), t(2, { station: 'Bar' })]) });
    const { result } = await setup({ api });
    expect(result.current.status).toBe('online');
    expect(result.current.ready.map((x) => x.id)).toEqual(['1', '2']);
    expect(api.listTickets).toHaveBeenCalledWith({ company: 'Shop A', warehouse: 'Main Store - SA', statuses: ['Ready'] });
  });

  it('does not announce what was already ready when the till opened, only what becomes ready later', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValueOnce([t(1)]).mockResolvedValue([t(1), t(2)]) });
    const { result } = await setup({ api });
    expect(result.current.newlyReady).toEqual([]);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.newlyReady.map((x) => x.id)).toEqual(['2']);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.newlyReady).toHaveLength(1); // not announced twice
    act(() => result.current.clearNewlyReady());
    expect(result.current.newlyReady).toEqual([]);
  });

  it('takes a ticket off the tray when it is served', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1), t(2)]) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.markServed('1'); });
    expect(r).toEqual({ ok: true });
    expect(api.setTicketStatus).toHaveBeenCalledWith({ company: 'Shop A', id: '1', status: 'Served' });
    expect(result.current.ready.map((x) => x.id)).toEqual(['2']);
  });

  it('keeps the ticket and says why when it could not be marked served', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1)]), setTicketStatus: jest.fn().mockRejectedValue(failed('No connection')) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.markServed('1'); });
    expect(r).toEqual({ ok: false, message: 'No connection' });
    expect(result.current.ready).toHaveLength(1);
  });

  it('keeps showing the last tickets while the connection is down, and recovers', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValueOnce([t(1)]).mockRejectedValueOnce(failed()).mockResolvedValue([t(1)]) });
    const { result } = await setup({ api });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('offline');
    expect(result.current.ready).toHaveLength(1);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('online');
  });

  it('stops asking when the server has no kitchen calls', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi({ listTickets: jest.fn().mockRejectedValue(unavailable()) });
      const { result } = await setup({ api, pollMs: 1000 });
      expect(result.current.status).toBe('unavailable');
      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(api.listTickets).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('empties the tray and stops when station screens are switched off', async () => {
    const api = fakeApi({ listTickets: jest.fn().mockResolvedValue([t(1)]) });
    const { result, rerender } = await setup({ api });
    expect(result.current.ready).toHaveLength(1);
    rerender({ company: 'Shop A', warehouse: 'Main Store - SA', enabled: false });
    await waitFor(() => expect(result.current.status).toBe('off'));
    expect(result.current.ready).toEqual([]);
  });
});

describe('sending tickets', () => {
  const tickets = [{ clientId: 'k-1', station: 'Kitchen' }, { clientId: 'k-2', station: 'Bar' }];

  it('hands them to the server with the business and store, and returns what it saved', async () => {
    const { result, api } = await setup();
    let r;
    await act(async () => { r = await result.current.send(tickets); });
    expect(api.sendTickets).toHaveBeenCalledWith({ company: 'Shop A', warehouse: 'Main Store - SA', tickets });
    expect(r.ok).toBe(true);
    expect(r.tickets.map((x) => x.number)).toEqual([14, 14]);
  });

  it('reports a failure with its reason, so the till can offer to try again or to print only', async () => {
    const api = fakeApi({ sendTickets: jest.fn().mockRejectedValue(failed('We could not reach the server.')) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.send(tickets); });
    expect(r).toEqual({ ok: false, kind: 'failed', message: 'We could not reach the server.' });
    expect(result.current.status).toBe('offline');
  });

  it('knows when the server cannot take tickets at all', async () => {
    const api = fakeApi({ sendTickets: jest.fn().mockRejectedValue(unavailable()) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.send(tickets); });
    expect(r.kind).toBe('unavailable');
    expect(result.current.status).toBe('unavailable');
  });

  it('resends the same ids on a retry, so the server can recognise them', async () => {
    const api = fakeApi({ sendTickets: jest.fn().mockRejectedValueOnce(failed()).mockImplementation(async ({ tickets: ts }) => ts.map((x, i) => ({ ...x, id: `S${i}`, number: 3 }))) });
    const { result } = await setup({ api });
    await act(async () => { await result.current.send(tickets); });
    await act(async () => { await result.current.send(tickets); });
    expect(api.sendTickets.mock.calls[0][0].tickets.map((x) => x.clientId)).toEqual(['k-1', 'k-2']);
    expect(api.sendTickets.mock.calls[1][0].tickets.map((x) => x.clientId)).toEqual(['k-1', 'k-2']);
  });
});
