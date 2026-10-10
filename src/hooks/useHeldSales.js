import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as serverApi from '../api/heldSalesApi';
import { readHeld, writeHeld, renameHeld as renameInList, cleanLabel } from '../utils/heldSales';

/**
 * Held sales for the till, kept on the server when the server supports it and
 * on this device otherwise. Everything the till does with held sales goes
 * through here, so the rules live in one place:
 *
 *  - Nothing is lost. If the server cannot be reached, a bill is kept on this
 *    device and sent to the server automatically when the connection returns.
 *    If even the device refuses, the hold fails and the till keeps the sale.
 *  - A bill is brought back by deleting it from the server first. Only the till
 *    whose delete succeeds gets it, so two tills can never both take one tab.
 *    If the server cannot be reached, the bill is not brought back (a stale
 *    copy could be paid twice).
 *  - A server without the held-sales calls is detected once and the till then
 *    behaves exactly as it did before they existed.
 *
 * status: 'checking' (asking the server), 'online', 'offline' (could not reach
 * it just now), 'unavailable' (this server has no held-sales calls).
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const idOf = (h) => String(h.id);
const byTime = (a, b) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime();

const upsert = (list, item) => (list.some((h) => idOf(h) === idOf(item)) ? list.map((h) => (idOf(h) === idOf(item) ? item : h)) : [...list, item]);

// Server bills first; a device copy of a bill the server also has is not shown twice
const combine = (server, local) => {
  const onServer = new Set(server.map(idOf));
  return [
    ...server.map((h) => ({ ...h, where: 'server' })),
    ...local.filter((h) => !onServer.has(idOf(h))).map((h) => ({ ...h, where: 'device' })),
  ].sort(byTime);
};

const useHeldSales = ({ company, warehouse, storage = window.localStorage, api = serverApi, pollMs = 20000 }) => {
  const [status, setStatus] = useState('checking');
  const [serverHeld, setServerHeld] = useState([]);
  const [localHeld, setLocalHeld] = useState(() => readHeld(storage, company));

  // The same values as refs, so functions that finish later see the latest, not the value at the time they started
  const statusRef = useRef('checking');
  const serverRef = useRef([]);
  const localRef = useRef(localHeld);
  const generation = useRef(0); // bumped when the business or store changes, so a slow answer for the old one is ignored
  const refreshing = useRef(null);
  const busy = useRef(new Set());
  const latest = useRef({});
  latest.current = { company, warehouse, storage, api };

  const setStatusNow = (next) => { statusRef.current = next; setStatus(next); };
  const setServer = (list) => { serverRef.current = list; setServerHeld(list); };
  const setLocal = (list) => { localRef.current = list; setLocalHeld(list); };

  const markFailure = (error) => setStatusNow(error.kind === 'unavailable' ? 'unavailable' : 'offline');

  // Send bills kept on this device to the server, one by one; stop at the first that fails
  const pushLocal = async (gen) => {
    const { company: c, warehouse: w, storage: s, api: a } = latest.current;
    for (const h of localRef.current.slice()) {
      try {
        const saved = await a.saveHeldSale({ company: c, warehouse: h.warehouse || w, held: h });
        if (gen !== generation.current) return;
        setServer(upsert(serverRef.current, saved));
        const rest = localRef.current.filter((x) => idOf(x) !== idOf(h));
        writeHeld(s, c, rest);
        setLocal(rest);
      } catch (error) {
        if (gen === generation.current) markFailure(error);
        return;
      }
    }
  };

  const refresh = useCallback(() => {
    const { company: c, warehouse: w, api: a } = latest.current;
    if (!c || statusRef.current === 'unavailable') return Promise.resolve();
    if (refreshing.current) return refreshing.current;
    const gen = generation.current;
    const run = (async () => {
      try {
        const list = await a.listHeldSales({ company: c, warehouse: w });
        if (gen !== generation.current) return;
        setStatusNow('online');
        setServer(list);
        await pushLocal(gen);
      } catch (error) {
        if (gen === generation.current) markFailure(error);
      } finally {
        if (gen === generation.current) refreshing.current = null;
      }
    })();
    refreshing.current = run;
    return run;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start again for a different business or store
  useEffect(() => {
    generation.current += 1;
    refreshing.current = null;
    setStatusNow('checking');
    setServer([]);
    setLocal(readHeld(storage, company));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, warehouse]);

  // Keep up with what other tills do
  useEffect(() => {
    if (!company) return undefined;
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, pollMs);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', tick);
    };
  }, [company, pollMs, refresh]);

  const held = useMemo(() => combine(serverHeld, localHeld), [serverHeld, localHeld]);
  const find = (id) => combine(serverRef.current, localRef.current).find((h) => idOf(h) === String(id));

  const saveLocal = (list) => {
    const { company: c, storage: s } = latest.current;
    if (!writeHeld(s, c, list)) return false;
    setLocal(list);
    return true;
  };

  /** Put a sale on hold. Resolves { ok, where: 'server' | 'device', fellBack } or { ok: false, error } */
  const hold = useCallback(async (sale) => {
    const { company: c, warehouse: w, api: a } = latest.current;
    const item = { ...sale, warehouse: w || '' };
    if (statusRef.current === 'checking' && refreshing.current) await Promise.race([refreshing.current, sleep(2500)]);

    let fellBack = false;
    if (statusRef.current === 'online') {
      try {
        const saved = await a.saveHeldSale({ company: c, warehouse: w, held: item });
        setServer(upsert(serverRef.current, saved));
        return { ok: true, where: 'server', held: saved };
      } catch (error) {
        markFailure(error);
        fellBack = error.kind !== 'unavailable';
      }
    }
    if (!saveLocal([...localRef.current, item])) return { ok: false, error: 'storage' };
    return { ok: true, where: 'device', fellBack, held: item };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Takes a bill off the list for good (bringing it back, or throwing it away)
  const take = async (id, { goneIsFine }) => {
    const { company: c, api: a } = latest.current;
    const key = String(id);
    if (busy.current.has(key)) return { ok: false, reason: 'busy' };
    const entry = find(key);
    if (!entry) return { ok: false, reason: 'missing' };
    busy.current.add(key);
    try {
      if (entry.where === 'server') {
        let deleted;
        try {
          ({ deleted } = await a.deleteHeldSale({ company: c, id: key }));
        } catch (error) {
          markFailure(error);
          return { ok: false, reason: 'offline', message: error.message };
        }
        setServer(serverRef.current.filter((h) => idOf(h) !== key));
        if (!deleted && !goneIsFine) {
          refresh();
          return { ok: false, reason: 'taken' };
        }
      }
      // Also remove any copy kept on this device, so it cannot come back as a second bill
      const rest = localRef.current.filter((h) => idOf(h) !== key);
      if (rest.length !== localRef.current.length) saveLocal(rest);
      return { ok: true, entry };
    } finally {
      busy.current.delete(key);
    }
  };

  /** Bring a bill back: resolves { ok: true, entry } or { ok: false, reason: 'taken' | 'offline' | 'busy' | 'missing' } */
  const claim = useCallback((id) => take(id, { goneIsFine: false }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const discard = useCallback((id) => take(id, { goneIsFine: true }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const rename = useCallback(async (id, label) => {
    const { company: c, warehouse: w, api: a } = latest.current;
    const entry = find(id);
    if (!entry) return { ok: false, reason: 'missing' };
    if (entry.where === 'device') {
      return saveLocal(renameInList(localRef.current, id, label)) ? { ok: true } : { ok: false, reason: 'storage' };
    }
    try {
      const saved = await a.saveHeldSale({ company: c, warehouse: entry.warehouse || w, held: { ...entry, label: cleanLabel(label) } });
      setServer(upsert(serverRef.current, { ...saved, label: cleanLabel(label) }));
      return { ok: true };
    } catch (error) {
      markFailure(error);
      return { ok: false, reason: 'offline', message: error.message };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { held, status, hold, claim, discard, rename, refresh };
};

export default useHeldSales;
