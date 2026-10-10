import { act, renderHook, waitFor } from '@testing-library/react';
import useKitchenSettings from './useKitchenSettings';
import { KitchenApiError } from '../api/kitchenApi';
import { defaultSettings, kitchenKey, sharedPart } from '../utils/kitchenTickets';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const fakeStorage = (initial = {}, { failWrites = false } = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { if (failWrites) throw new Error('quota'); data[k] = String(v); } };
};
const stored = (st, company = 'Shop A') => JSON.parse(st.data[kitchenKey(company)] || 'null');
const withLocal = (over = {}, company = 'Shop A') => fakeStorage({ [kitchenKey(company)]: JSON.stringify({ ...defaultSettings(), ...over }) });

const fakeApi = (over = {}) => ({
  getKitchenSettings: jest.fn().mockResolvedValue(null),
  saveKitchenSettings: jest.fn().mockResolvedValue(true),
  ...over,
});
const failed = (m = 'No connection') => new KitchenApiError('failed', m);
const unavailable = () => new KitchenApiError('unavailable', 'no calls');

const setup = async ({ api = fakeApi(), storage = fakeStorage(), company = 'Shop A', pollMs = 1e9 } = {}) => {
  const hook = renderHook((props) => useKitchenSettings({ storage, api, pollMs, ...props }), { initialProps: { company } });
  await waitFor(() => expect(hook.result.current.status).not.toBe('checking'));
  return { ...hook, api, storage };
};

describe('without the server\'s kitchen calls', () => {
  it('works from the device alone, as before, and never asks again', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi({ getKitchenSettings: jest.fn().mockRejectedValue(unavailable()) });
      const storage = withLocal({ enabled: true, printNow: false });
      const { result } = await setup({ api, storage, pollMs: 1000 });
      expect(result.current.status).toBe('unavailable');
      expect(result.current.settings).toMatchObject({ enabled: true, printNow: false });
      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(api.getKitchenSettings).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('saves to the device only', async () => {
    const api = fakeApi({ getKitchenSettings: jest.fn().mockRejectedValue(unavailable()) });
    const { result, storage } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.save({ ...defaultSettings(), enabled: true }); });
    expect(r).toEqual({ ok: true, localOnly: false, message: '' });
    expect(stored(storage).enabled).toBe(true);
    expect(api.saveKitchenSettings).not.toHaveBeenCalled();
  });
});

describe('with the server', () => {
  it('takes the business-wide settings from the server and keeps the device\'s own', async () => {
    const server = { ...sharedPart(defaultSettings()), enabled: true, screens: true, stations: [{ id: 'grill', name: 'Grill', groups: ['Meat'] }] };
    const api = fakeApi({ getKitchenSettings: jest.fn().mockResolvedValue(server) });
    const storage = withLocal({ printNow: false, nextTicket: 9, ticketDate: '2026-10-10' });
    const { result } = await setup({ api, storage });
    await waitFor(() => expect(result.current.settings.enabled).toBe(true));
    expect(result.current.settings).toMatchObject({ screens: true, printNow: false, nextTicket: 9 });
    expect(result.current.settings.stations.map((s) => s.name)).toEqual(['Grill']);
    expect(stored(storage).enabled).toBe(true); // the device keeps a copy for when the connection drops
  });

  it('sends up settings that were set up on the device before the server could keep them, once', async () => {
    const storage = withLocal({ enabled: true, quickNotes: ['No onions'] });
    const { api } = await setup({ storage });
    expect(api.saveKitchenSettings).toHaveBeenCalledTimes(1);
    const sent = api.saveKitchenSettings.mock.calls[0][0].settings;
    expect(sent).toMatchObject({ enabled: true, quickNotes: ['No onions'] });
    expect(sent).not.toHaveProperty('printNow');
    expect(sent).not.toHaveProperty('nextTicket');
  });

  it('sends up nothing when the device was never set up', async () => {
    const { api } = await setup();
    expect(api.saveKitchenSettings).not.toHaveBeenCalled();
  });

  it('ignores damaged settings from the server', async () => {
    const api = fakeApi({ getKitchenSettings: jest.fn().mockResolvedValue({ enabled: 'maybe', stations: 'x', screens: 5 }) });
    const { result } = await setup({ api, storage: withLocal({ enabled: true }) });
    expect(result.current.status).toBe('online');
    expect(result.current.settings.stations.length).toBeGreaterThan(0);
    expect(result.current.settings.screens).toBe(false);
  });

  it('saves the shared part to the server and the whole to the device', async () => {
    const { result, api, storage } = await setup();
    let r;
    await act(async () => { r = await result.current.save({ ...defaultSettings(), enabled: true, screens: true, printNow: false }); });
    expect(r).toEqual({ ok: true });
    expect(api.saveKitchenSettings).toHaveBeenCalledWith({ company: 'Shop A', settings: expect.objectContaining({ enabled: true, screens: true }) });
    expect(api.saveKitchenSettings.mock.calls[0][0].settings).not.toHaveProperty('printNow');
    expect(stored(storage)).toMatchObject({ enabled: true, printNow: false });
  });

  it('says so when the server refuses (for example, not a manager), and still keeps the change on the device', async () => {
    const api = fakeApi({ saveKitchenSettings: jest.fn().mockRejectedValue(failed('Only a manager can change kitchen settings.')) });
    const { result, storage } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.save({ ...defaultSettings(), enabled: true }); });
    expect(r).toMatchObject({ ok: true, localOnly: true });
    expect(r.message).toContain('Only a manager');
    expect(stored(storage).enabled).toBe(true);
  });

  it('reports when not even the device can keep the settings', async () => {
    const { result } = await setup({ storage: fakeStorage({}, { failWrites: true }) });
    let r;
    await act(async () => { r = await result.current.save({ ...defaultSettings(), enabled: true }); });
    expect(r).toEqual({ ok: false, reason: 'storage' });
    expect(result.current.settings.enabled).toBe(false);
  });

  it('keeps the ticket counter on the device and never sends it to the server', async () => {
    const { result, api, storage } = await setup();
    act(() => { result.current.saveDevice({ nextTicket: 5, ticketDate: '2026-10-10' }); });
    expect(stored(storage)).toMatchObject({ nextTicket: 5, ticketDate: '2026-10-10' });
    expect(result.current.settings.nextTicket).toBe(5);
    expect(api.saveKitchenSettings).not.toHaveBeenCalled();
  });
});

describe('when the connection drops', () => {
  it('carries on with the device\'s copy, and picks up changes when it returns', async () => {
    const api = fakeApi({ getKitchenSettings: jest.fn().mockRejectedValueOnce(failed()) });
    const storage = withLocal({ enabled: true });
    const { result } = await setup({ api, storage });
    expect(result.current.status).toBe('offline');
    expect(result.current.settings.enabled).toBe(true);

    api.getKitchenSettings.mockResolvedValue({ ...sharedPart(defaultSettings()), enabled: true, screens: true });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe('online');
    expect(result.current.settings.screens).toBe(true);
  });

  it('saves to the device only while offline', async () => {
    const api = fakeApi({ getKitchenSettings: jest.fn().mockRejectedValue(failed()) });
    const { result, storage } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.save({ ...defaultSettings(), enabled: true }); });
    expect(r).toMatchObject({ ok: true, localOnly: true });
    expect(api.saveKitchenSettings).not.toHaveBeenCalled();
    expect(stored(storage).enabled).toBe(true);
  });
});

describe('other businesses and other tills', () => {
  it('loads the other business\'s settings when the business changes', async () => {
    const storage = fakeStorage({
      [kitchenKey('Shop A')]: JSON.stringify({ ...defaultSettings(), enabled: true }),
      [kitchenKey('Shop B')]: JSON.stringify({ ...defaultSettings(), enabled: false, quickNotes: ['Spicy'] }),
    });
    const { result, rerender } = await setup({ storage });
    rerender({ company: 'Shop B' });
    await waitFor(() => expect(result.current.settings.quickNotes).toEqual(['Spicy']));
    expect(result.current.settings.enabled).toBe(false);
  });

  it('notices a change made on another till at the next look', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi();
      const { result } = await setup({ api, pollMs: 1000 });
      expect(result.current.settings.enabled).toBe(false);
      api.getKitchenSettings.mockResolvedValue({ ...sharedPart(defaultSettings()), enabled: true });
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(result.current.settings.enabled).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does nothing without a business', async () => {
    const api = fakeApi();
    const hook = renderHook(() => useKitchenSettings({ storage: fakeStorage(), api, company: null, pollMs: 1e9 }));
    expect(api.getKitchenSettings).not.toHaveBeenCalled();
    expect(hook.result.current.settings.enabled).toBe(false);
  });
});
