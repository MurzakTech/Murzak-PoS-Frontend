import { act, renderHook, waitFor } from '@testing-library/react';
import useKitchenTickets from './useKitchenTickets';
import * as realtime from '../realtime/realtimeClient';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../realtime/realtimeClient');

const ticket = (id) => ({ id: String(id), station: 'Bar', number: id, round: 1, label: 'Table 4', status: 'Ready', createdAt: new Date(Date.UTC(2026, 9, 10, 16, id)).toISOString(), adds: [], changes: [], voids: [] });

beforeEach(() => realtime.resetRealtime());

it('shows a ticket as ready the moment the server says so', async () => {
  const api = { listTickets: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([ticket(1)]), sendTickets: jest.fn(), setTicketStatus: jest.fn() };
  const { result } = renderHook(() => useKitchenTickets({ company: 'Shop A', warehouse: 'Main', enabled: true, api, pollMs: 1e9 }));
  await waitFor(() => expect(result.current.status).toBe('online'));
  expect(result.current.ready).toHaveLength(0);

  await act(async () => { realtime.emit({ kind: 'kitchen', status: 'Ready', station: 'Bar', company: 'Shop A' }); });
  await waitFor(() => expect(result.current.ready).toHaveLength(1));
  expect(result.current.newlyReady.map((x) => x.id)).toEqual(['1']);
});

it('listens to nothing while station screens are switched off', async () => {
  const api = { listTickets: jest.fn().mockResolvedValue([]), sendTickets: jest.fn(), setTicketStatus: jest.fn() };
  renderHook(() => useKitchenTickets({ company: 'Shop A', warehouse: 'Main', enabled: false, api }));
  expect(realtime.timesOpened()).toBe(0);
  expect(api.listTickets).not.toHaveBeenCalled();
});
