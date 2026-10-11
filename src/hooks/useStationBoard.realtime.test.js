import { act, renderHook, waitFor } from '@testing-library/react';
import useStationBoard from './useStationBoard';
import * as realtime from '../realtime/realtimeClient';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../realtime/realtimeClient');

const ticket = (id) => ({ id: String(id), station: 'Bar', number: id, round: 1, label: 'Table 4', status: 'New', createdAt: new Date(Date.UTC(2026, 9, 10, 16, id)).toISOString(), adds: [], changes: [], voids: [] });

const setup = async (list = jest.fn().mockResolvedValue([])) => {
  const api = { listTickets: list, setTicketStatus: jest.fn() };
  const view = renderHook(() => useStationBoard({ company: 'Shop A', warehouse: 'Main', station: 'Bar', api, pollMs: 5000 }));
  await waitFor(() => expect(view.result.current.status).toBe('online'));
  return { ...view, api };
};

beforeEach(() => realtime.resetRealtime());
afterEach(() => { jest.useRealTimers(); });

it('reads the board again the moment a kitchen message arrives for its business', async () => {
  const { result, api } = await setup(jest.fn().mockResolvedValueOnce([]).mockResolvedValue([ticket(1)]));
  expect(api.listTickets).toHaveBeenCalledTimes(1);
  await act(async () => { realtime.emit({ kind: 'kitchen', status: 'New', station: 'Bar', company: 'Shop A' }); });
  await waitFor(() => expect(result.current.board).toHaveLength(1));
  expect(api.listTickets).toHaveBeenCalledTimes(2);
});

it('does not read the board for a payment message or another business', async () => {
  const { api } = await setup();
  await act(async () => {
    realtime.emit({ kind: 'payment', status: 'Success', company: 'Shop A' });
    realtime.emit({ kind: 'kitchen', status: 'New', company: 'Shop B' });
  });
  expect(api.listTickets).toHaveBeenCalledTimes(1);
});

it('reads the board again when the live connection comes back, for messages missed while it was down', async () => {
  const { api } = await setup();
  await act(async () => { realtime.setConnected(true); });
  await waitFor(() => expect(api.listTickets).toHaveBeenCalledTimes(2));
});

it('polls every 15 seconds while the live connection is up, and at its own pace while it is down', async () => {
  jest.useFakeTimers();
  const api = { listTickets: jest.fn().mockResolvedValue([]), setTicketStatus: jest.fn() };
  renderHook(() => useStationBoard({ company: 'Shop A', warehouse: 'Main', station: 'Bar', api, pollMs: 5000 }));
  await act(async () => { await Promise.resolve(); });
  expect(api.listTickets).toHaveBeenCalledTimes(1);

  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(api.listTickets).toHaveBeenCalledTimes(2); // down: every 5 seconds

  await act(async () => { realtime.setConnected(true); });
  const afterConnect = api.listTickets.mock.calls.length; // the catch-up read
  await act(async () => { jest.advanceTimersByTime(14000); });
  expect(api.listTickets).toHaveBeenCalledTimes(afterConnect); // up: nothing before 15 seconds
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(api.listTickets).toHaveBeenCalledTimes(afterConnect + 1);

  await act(async () => { realtime.setConnected(false); });
  const afterDrop = api.listTickets.mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(api.listTickets).toHaveBeenCalledTimes(afterDrop + 1); // down again: back to 5 seconds
});
