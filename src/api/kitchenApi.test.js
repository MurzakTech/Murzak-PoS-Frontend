import axiosInstance from './axiosInstance';
import {
  ENDPOINTS,
  KitchenApiError,
  getKitchenSettings,
  saveKitchenSettings,
  sendTickets,
  listTickets,
  setTicketStatus,
  toServer,
  fromServer,
} from './kitchenApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const reply = (message) => Promise.resolve({ data: { message } });
const fail = (response, message) => Promise.reject(Object.assign(new Error(message || 'Request failed'), response ? { response } : { request: {} }));
const kindOf = (p) => p.then(() => null, (e) => e);

const ticket = (over = {}) => ({
  clientId: 'k_1-1', station: 'Kitchen', number: 0, round: 2, label: 'Table 4', orderType: 'table', waiter: 'Amina',
  createdAt: '2026-10-10T16:00:00.000Z', adds: [{ item_name: 'Pilau', qty: 2, note: 'no pilipili' }], changes: [], voids: [], ...over,
});

beforeEach(() => axiosInstance.post.mockReset());

describe('what is sent', () => {
  it('describes a ticket with its own id and lines, and leaves the number to the server', () => {
    const body = toServer(ticket());
    expect(body).toEqual({
      client_id: 'k_1-1', station: 'Kitchen', label: 'Table 4', order_type: 'table', round: 2, created_at: '2026-10-10T16:00:00.000Z',
      lines: { adds: [{ item_name: 'Pilau', qty: 2, note: 'no pilipili' }], changes: [], voids: [] },
    });
    expect(body).not.toHaveProperty('number');
  });

  it('sends tickets with the business and store', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { tickets: [{ id: 'T1', client_id: 'k_1-1', station: 'Kitchen', number: 14 }] } }));
    await sendTickets({ company: 'Shop A', warehouse: 'Main Store - SA', tickets: [ticket()] });
    const [url, body] = axiosInstance.post.mock.calls[0];
    expect(url).toBe(ENDPOINTS.send);
    expect(body).toMatchObject({ company: 'Shop A', warehouse: 'Main Store - SA' });
    expect(body.tickets).toHaveLength(1);
  });

  it('asks for tickets with only the filters given', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { tickets: [] } }));
    await listTickets({ company: 'Shop A', station: 'Bar', statuses: ['New', 'Preparing'] });
    expect(axiosInstance.post).toHaveBeenCalledWith(ENDPOINTS.list, { company: 'Shop A', station: 'Bar', statuses: ['New', 'Preparing'] });
    await listTickets({ company: 'Shop A', warehouse: 'W', statuses: [] , since: '2026-10-10T00:00:00Z'});
    expect(axiosInstance.post).toHaveBeenLastCalledWith(ENDPOINTS.list, { company: 'Shop A', warehouse: 'W', since: '2026-10-10T00:00:00Z' });
  });

  it('sends the id as text when changing a status', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { id: 'T1', station: 'Kitchen', status: 'Ready' } }));
    const t = await setTicketStatus({ company: 'Shop A', id: 12, status: 'Ready' });
    expect(axiosInstance.post).toHaveBeenCalledWith(ENDPOINTS.setStatus, { company: 'Shop A', id: '12', status: 'Ready' });
    expect(t.status).toBe('Ready');
  });
});

describe('what comes back', () => {
  it('turns a server row into the till\'s shape, with the number, who sent it and when', () => {
    const t = fromServer({
      id: 'T1', client_id: 'k_1-1', station: 'Kitchen', number: 14, round: 2, label: 'Table 4', order_type: 'table', sent_by_name: 'Amina',
      created_at: '2026-10-10T16:00:00Z', status: 'Preparing', status_by_name: 'Chef Otieno', status_at: '2026-10-10T16:02:00Z',
      lines: { adds: [{ item_name: 'Pilau', qty: 2 }], voids: [{ item_name: 'Tusker', qty: 1 }] },
    });
    expect(t).toMatchObject({ id: 'T1', number: 14, round: 2, label: 'Table 4', orderType: 'table', waiter: 'Amina', status: 'Preparing', statusBy: 'Chef Otieno' });
    expect(t.adds).toHaveLength(1);
    expect(t.voids).toHaveLength(1);
    expect(t.changes).toEqual([]);
  });

  it('accepts the lines as text, and copes with a row that has almost nothing', () => {
    expect(fromServer({ id: 1, station: 'Bar', lines: JSON.stringify({ adds: [{ qty: 1 }] }) }).adds).toHaveLength(1);
    expect(fromServer({ id: 1, station: 'Bar', lines: 'not json' }).adds).toEqual([]);
    expect(fromServer({ id: 1, station: 'Bar', status: 'weird' }).status).toBe('New');
  });

  it('leaves out rows it cannot use rather than breaking the whole list', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { tickets: [{ id: 'a', station: 'Bar' }, { station: 'Bar' }, null, { id: 'b' }] } }));
    expect((await listTickets({ company: 'Shop A' })).map((t) => t.id)).toEqual(['a']);
  });

  it('refuses a list that is not a list', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { something: 1 } }));
    expect((await kindOf(listTickets({ company: 'Shop A' }))).kind).toBe('failed');
  });

  it('does not say the kitchen has a ticket the server did not confirm', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { tickets: [{ id: 'T1', client_id: 'k_1-1', station: 'Kitchen', number: 14 }] } }));
    const e = await kindOf(sendTickets({ company: 'Shop A', tickets: [ticket(), ticket({ clientId: 'k_1-2', station: 'Bar' })] }));
    expect(e.kind).toBe('failed');
    expect(e.message).toContain('Bar');
  });

  it('gives back the numbers the server chose', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { tickets: [{ id: 'T1', client_id: 'k_1-1', station: 'Kitchen', number: 14 }, { id: 'T2', client_id: 'k_1-2', station: 'Bar', number: 14 }] } }));
    const saved = await sendTickets({ company: 'Shop A', tickets: [ticket(), ticket({ clientId: 'k_1-2', station: 'Bar' })] });
    expect(saved.map((t) => [t.station, t.number])).toEqual([['Kitchen', 14], ['Bar', 14]]);
  });
});

describe('settings', () => {
  it('reads the shared settings, or null when none were saved', async () => {
    axiosInstance.post.mockReturnValueOnce(reply({ success: true, data: { settings: { enabled: true, screens: true } } }));
    expect(await getKitchenSettings({ company: 'Shop A' })).toEqual({ enabled: true, screens: true });
    axiosInstance.post.mockReturnValueOnce(reply({ success: true, data: { settings: null } }));
    expect(await getKitchenSettings({ company: 'Shop A' })).toBeNull();
    axiosInstance.post.mockReturnValueOnce(reply({ success: true, data: { settings: '{"enabled":true}' } }));
    expect(await getKitchenSettings({ company: 'Shop A' })).toEqual({ enabled: true });
  });

  it('saves them', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { saved: true } }));
    expect(await saveKitchenSettings({ company: 'Shop A', settings: { enabled: true } })).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(ENDPOINTS.saveSettings, { company: 'Shop A', settings: { enabled: true } });
  });
});

describe('failures', () => {
  it('knows a server that has no such calls', async () => {
    axiosInstance.post.mockReturnValue(fail({ status: 404, data: {} }));
    const e = await kindOf(listTickets({ company: 'Shop A' }));
    expect(e).toBeInstanceOf(KitchenApiError);
    expect(e.kind).toBe('unavailable');
  });

  it('knows Frappe naming the missing method', async () => {
    axiosInstance.post.mockReturnValue(fail({ status: 500, data: { exception: 'AttributeError: module techsavanna_pos.api.kitchen_api has no attribute list_tickets' } }));
    expect((await kindOf(listTickets({ company: 'Shop A' }))).kind).toBe('unavailable');
  });

  it.each([
    ['no answer (offline)', null],
    ['a server error', { status: 500, data: { message: 'boom' } }],
    ['a refusal for permission', { status: 403, data: { message: 'Not permitted' } }],
  ])('treats %s as a failure to retry, not as a missing server', async (_, response) => {
    axiosInstance.post.mockReturnValue(fail(response));
    const e = await kindOf(sendTickets({ company: 'Shop A', tickets: [ticket()] }));
    expect(e.kind).toBe('failed');
    expect(e.message).not.toMatch(/\[object|undefined/);
  });

  it('reports a refusal inside a normal reply with the server\'s reason', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: false, message: 'Only a manager can change kitchen settings.' }));
    const e = await kindOf(saveKitchenSettings({ company: 'Shop A', settings: {} }));
    expect(e.kind).toBe('failed');
    expect(e.message).toContain('Only a manager');
  });
});
