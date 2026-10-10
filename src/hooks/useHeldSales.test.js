import { act, renderHook, waitFor } from '@testing-library/react';
import useHeldSales from './useHeldSales';
import { HeldSalesError } from '../api/heldSalesApi';
import { heldKey } from '../utils/heldSales';

jest.mock('../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const sale = (id, over = {}) => ({ id, heldAt: new Date(2026, 9, 10, 10, Number(String(id).replace(/\D/g, '')) % 60).toISOString(), label: '', customer: 'Walk-in Customer', cart: [{ subtotal: 100 }], ...over });
const serverBill = (id, over = {}) => ({ ...sale(id), id: String(id), heldBy: 'Amina', ...over });

const fakeStorage = (initial = {}, { failWrites = false } = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { if (failWrites) throw new Error('quota'); data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};
const localList = (storage, company = 'Shop A') => JSON.parse(storage.data[heldKey(company)] || '[]');

const fakeApi = (over = {}) => ({
  listHeldSales: jest.fn().mockResolvedValue([]),
  saveHeldSale: jest.fn().mockImplementation(async ({ held }) => ({ ...held, id: String(held.id), heldBy: 'Amina' })),
  deleteHeldSale: jest.fn().mockResolvedValue({ deleted: true }),
  ...over,
});
const failed = (message = 'No connection') => new HeldSalesError('failed', message);
const unavailable = () => new HeldSalesError('unavailable', 'no calls');

const setup = async ({ api = fakeApi(), storage = fakeStorage(), company = 'Shop A', warehouse = 'Main Store - SA', settle = true, pollMs = 1e9 } = {}) => {
  const hook = renderHook((props) => useHeldSales({ storage, api, pollMs, ...props }), { initialProps: { company, warehouse } });
  if (settle) await waitFor(() => expect(hook.result.current.status).not.toBe('checking'));
  return { ...hook, api, storage };
};

describe('when the server supports held sales', () => {
  it('shows the bills on the server, marked as shared', async () => {
    const api = fakeApi({ listHeldSales: jest.fn().mockResolvedValue([serverBill('a1', { label: 'Table 4' })]) });
    const { result } = await setup({ api });
    expect(result.current.status).toBe('online');
    expect(result.current.held).toMatchObject([{ id: 'a1', label: 'Table 4', where: 'server', heldBy: 'Amina' }]);
    expect(api.listHeldSales).toHaveBeenCalledWith({ company: 'Shop A', warehouse: 'Main Store - SA' });
  });

  it('holds a bill on the server, recording the store', async () => {
    const { result, api, storage } = await setup();
    let r;
    await act(async () => { r = await result.current.hold(sale(11, { label: 'Bar' })); });
    expect(r).toMatchObject({ ok: true, where: 'server' });
    expect(api.saveHeldSale).toHaveBeenCalledWith({ company: 'Shop A', warehouse: 'Main Store - SA', held: expect.objectContaining({ id: 11, label: 'Bar', warehouse: 'Main Store - SA' }) });
    expect(result.current.held.map((h) => [h.id, h.where])).toEqual([['11', 'server']]);
    expect(localList(storage)).toEqual([]); // nothing left on the device
  });

  it('waits for the first answer from the server before deciding where to hold', async () => {
    let release;
    const api = fakeApi({ listHeldSales: jest.fn(() => new Promise((resolve) => { release = () => resolve([]); })) });
    const { result } = await setup({ api, settle: false });
    let r;
    let pending;
    act(() => { pending = result.current.hold(sale(12)).then((x) => { r = x; }); });
    expect(api.saveHeldSale).not.toHaveBeenCalled(); // still waiting for the probe
    await act(async () => { release(); await pending; });
    expect(r.where).toBe('server');
  });

  it('keeps the bill on this device when the server cannot be reached, and sends it when the connection returns', async () => {
    const api = fakeApi();
    api.saveHeldSale.mockRejectedValueOnce(failed()); // the first save fails; later ones use the normal fake
    const { result, storage } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.hold(sale(13)); });
    expect(r).toMatchObject({ ok: true, where: 'device', fellBack: true });
    expect(result.current.status).toBe('offline');
    expect(result.current.held.map((h) => h.where)).toEqual(['device']);
    expect(localList(storage)).toHaveLength(1);

    await act(async () => { await result.current.refresh(); }); // connection is back
    expect(result.current.status).toBe('online');
    expect(result.current.held.map((h) => [h.id, h.where])).toEqual([['13', 'server']]);
    expect(localList(storage)).toEqual([]);
  });

  it('never loses a bill: if the server and the device both refuse, the hold fails and nothing is listed', async () => {
    const api = fakeApi({ saveHeldSale: jest.fn().mockRejectedValue(failed()) });
    const { result } = await setup({ api, storage: fakeStorage({}, { failWrites: true }) });
    let r;
    await act(async () => { r = await result.current.hold(sale(14)); });
    expect(r).toEqual({ ok: false, error: 'storage' });
    expect(result.current.held).toEqual([]);
  });

  it('uploads bills held on the device before the server was available, once it is', async () => {
    const storage = fakeStorage({ [heldKey('Shop A')]: JSON.stringify([sale(15), sale(16)]) });
    const { result, api } = await setup({ storage });
    await waitFor(() => expect(localList(storage)).toEqual([]));
    expect(api.saveHeldSale).toHaveBeenCalledTimes(2);
    expect(result.current.held.map((h) => h.where)).toEqual(['server', 'server']);
  });

  it('stops uploading at the first failure and keeps the rest on the device', async () => {
    const storage = fakeStorage({ [heldKey('Shop A')]: JSON.stringify([sale(15), sale(16)]) });
    const api = fakeApi({ saveHeldSale: jest.fn().mockResolvedValueOnce({ ...sale(15), id: '15' }).mockRejectedValue(failed()) });
    await setup({ api, storage });
    await waitFor(() => expect(localList(storage).map((h) => h.id)).toEqual([16]));
  });
});

describe('bringing a bill back', () => {
  const withBill = () => fakeApi({ listHeldSales: jest.fn().mockResolvedValue([serverBill('a1', { label: 'Table 4' })]) });

  it('deletes it from the server first, then hands it over', async () => {
    const { result, api } = await setup({ api: withBill() });
    let r;
    await act(async () => { r = await result.current.claim('a1'); });
    expect(api.deleteHeldSale).toHaveBeenCalledWith({ company: 'Shop A', id: 'a1' });
    expect(r.ok).toBe(true);
    expect(r.entry).toMatchObject({ id: 'a1', label: 'Table 4' });
    expect(result.current.held).toEqual([]);
  });

  it('refuses when another till already took it, and refreshes the list', async () => {
    const api = withBill();
    api.deleteHeldSale.mockResolvedValue({ deleted: false });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.claim('a1'); });
    expect(r).toEqual({ ok: false, reason: 'taken' });
    expect(api.listHeldSales.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not bring it back when the server cannot be reached, because a stale copy could be paid twice', async () => {
    const api = withBill();
    api.deleteHeldSale.mockRejectedValue(failed());
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.claim('a1'); });
    expect(r).toMatchObject({ ok: false, reason: 'offline' });
    expect(result.current.held.map((h) => h.id)).toEqual(['a1']); // still listed
  });

  it('lets only one of two quick taps through', async () => {
    const api = withBill();
    let finish;
    api.deleteHeldSale.mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ deleted: true }); }));
    const { result } = await setup({ api });
    let first;
    let second;
    act(() => { first = result.current.claim('a1'); second = result.current.claim('a1'); });
    await act(async () => { finish(); });
    expect(await second).toEqual({ ok: false, reason: 'busy' });
    expect((await first).ok).toBe(true);
    expect(api.deleteHeldSale).toHaveBeenCalledTimes(1);
  });

  it('brings back a bill that is only on this device without asking the server', async () => {
    const storage = fakeStorage({ [heldKey('Shop A')]: JSON.stringify([sale(20)]) });
    const api = fakeApi({ listHeldSales: jest.fn().mockRejectedValue(failed()), saveHeldSale: jest.fn().mockRejectedValue(failed()) });
    const { result } = await setup({ api, storage });
    let r;
    await act(async () => { r = await result.current.claim(20); });
    expect(r.ok).toBe(true);
    expect(api.deleteHeldSale).not.toHaveBeenCalled();
    expect(localList(storage)).toEqual([]);
  });

  it('removes a leftover device copy of the same bill so it cannot return as a second bill', async () => {
    const storage = fakeStorage({ [heldKey('Shop A')]: JSON.stringify([sale('a1')]) });
    const api = fakeApi({ listHeldSales: jest.fn().mockResolvedValue([serverBill('a1')]), saveHeldSale: jest.fn().mockRejectedValue(failed()) });
    const { result } = await setup({ api, storage });
    expect(result.current.held).toHaveLength(1); // shown once, not twice
    await act(async () => { await result.current.claim('a1'); });
    expect(localList(storage)).toEqual([]);
    expect(result.current.held).toEqual([]);
  });

  it('treats throwing away a bill that is already gone as done', async () => {
    const api = withBill();
    api.deleteHeldSale.mockResolvedValue({ deleted: false });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.discard('a1'); });
    expect(r.ok).toBe(true);
    expect(result.current.held).toEqual([]);
  });

  it('says so for a bill that is not in the list', async () => {
    const { result } = await setup();
    let r;
    await act(async () => { r = await result.current.claim('nope'); });
    expect(r).toEqual({ ok: false, reason: 'missing' });
  });
});

describe('renaming', () => {
  it('renames a bill on the server by saving it again under the same id', async () => {
    const api = fakeApi({ listHeldSales: jest.fn().mockResolvedValue([serverBill('a1', { label: 'Table 4' })]) });
    const { result } = await setup({ api });
    await act(async () => { await result.current.rename('a1', '  Patio ' ); });
    expect(api.saveHeldSale).toHaveBeenCalledWith(expect.objectContaining({ held: expect.objectContaining({ id: 'a1', label: 'Patio' }) }));
    expect(result.current.held[0].label).toBe('Patio');
  });

  it('renames a bill kept on the device', async () => {
    const storage = fakeStorage({ [heldKey('Shop A')]: JSON.stringify([sale(30, { label: 'A' })]) });
    const api = fakeApi({ listHeldSales: jest.fn().mockRejectedValue(unavailable()) });
    const { result } = await setup({ api, storage });
    await act(async () => { await result.current.rename(30, 'B'); });
    expect(localList(storage)[0].label).toBe('B');
  });

  it('says when the server could not be reached, and leaves the name alone', async () => {
    const api = fakeApi({ listHeldSales: jest.fn().mockResolvedValue([serverBill('a1', { label: 'Table 4' })]), saveHeldSale: jest.fn().mockRejectedValue(failed()) });
    const { result } = await setup({ api });
    let r;
    await act(async () => { r = await result.current.rename('a1', 'Patio'); });
    expect(r).toMatchObject({ ok: false, reason: 'offline' });
    expect(result.current.held[0].label).toBe('Table 4');
  });
});

describe('when the server has no held-sales calls', () => {
  it('behaves exactly as before: bills are kept on the device, and the server is not asked again', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi({ listHeldSales: jest.fn().mockRejectedValue(unavailable()) });
      const storage = fakeStorage();
      const { result } = await setup({ api, storage, pollMs: 1000 });
      expect(result.current.status).toBe('unavailable');

      let r;
      await act(async () => { r = await result.current.hold(sale(40)); });
      expect(r).toMatchObject({ ok: true, where: 'device', fellBack: false });
      expect(api.saveHeldSale).not.toHaveBeenCalled();
      expect(localList(storage)).toHaveLength(1);

      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(api.listHeldSales).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('still refuses a hold the device cannot save, so the till keeps the sale', async () => {
    const api = fakeApi({ listHeldSales: jest.fn().mockRejectedValue(unavailable()) });
    const { result } = await setup({ api, storage: fakeStorage({}, { failWrites: true }) });
    let r;
    await act(async () => { r = await result.current.hold(sale(41)); });
    expect(r).toEqual({ ok: false, error: 'storage' });
    expect(result.current.held).toEqual([]);
  });
});

describe('keeping up and switching', () => {
  it('asks the server again every so often', async () => {
    jest.useFakeTimers();
    try {
      const { api } = await setup({ pollMs: 1000 });
      expect(api.listHeldSales).toHaveBeenCalledTimes(1);
      await act(async () => { jest.advanceTimersByTime(1000); });
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(api.listHeldSales.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('loads the other business\'s bills when the business changes, and ignores a late answer for the old one', async () => {
    let releaseOld;
    const api = fakeApi({
      listHeldSales: jest.fn()
        .mockImplementationOnce(() => new Promise((resolve) => { releaseOld = () => resolve([serverBill('old')]); }))
        .mockResolvedValue([serverBill('new')]),
    });
    const storage = fakeStorage({ [heldKey('Shop B')]: JSON.stringify([sale(50)]) });
    const { result, rerender } = await setup({ api, storage, settle: false });
    rerender({ company: 'Shop B', warehouse: 'Main Store - SB' });
    await waitFor(() => expect(result.current.status).toBe('online'));
    await act(async () => { releaseOld(); });
    expect(result.current.held.map((h) => h.id)).toContain('new');
    expect(result.current.held.map((h) => h.id)).not.toContain('old');
  });

  it('does nothing without a business', async () => {
    const api = fakeApi();
    const { result } = await setup({ api, company: null, settle: false });
    expect(api.listHeldSales).not.toHaveBeenCalled();
    expect(result.current.held).toEqual([]);
  });
});
