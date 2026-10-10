import { useCallback, useEffect, useRef, useState } from 'react';
import * as serverApi from '../api/kitchenApi';
import { readSettings, writeSettings, normalizeSettings, sharedPart } from '../utils/kitchenTickets';

/**
 * The kitchen settings of a till. What every till of the business should agree on (whether kitchen
 * tickets are used, the stations and their categories, the quick notes, whether station screens are
 * used) is kept on the server when the server supports it. What belongs to one device (printing, the
 * ticket counter used when there is no server) stays on the device.
 *
 *  - Without the server's kitchen calls, everything stays on the device, exactly as before.
 *  - The first time a business has settings on the device and none on the server, they are sent up,
 *    so a till that was already set up does not have to be set up again.
 *  - The device always keeps a copy, so the till still works when the connection drops.
 *
 * status: 'checking', 'online', 'offline' (could not reach the server just now) or 'unavailable'
 * (this server has no kitchen calls).
 */
const useKitchenSettings = ({ company, storage = window.localStorage, api = serverApi, pollMs = 60000 }) => {
  const [settings, setSettings] = useState(() => readSettings(storage, company));
  const [status, setStatus] = useState('checking');
  const settingsRef = useRef(settings);
  const statusRef = useRef('checking');
  const generation = useRef(0);
  const latest = useRef({});
  latest.current = { company, storage, api };

  const setStatusNow = (next) => { statusRef.current = next; setStatus(next); };
  const setNow = (next) => { settingsRef.current = next; setSettings(next); };

  const refresh = useCallback(async () => {
    const { company: c, storage: s, api: a } = latest.current;
    if (!c || statusRef.current === 'unavailable') return;
    const gen = generation.current;
    try {
      const shared = await a.getKitchenSettings({ company: c });
      if (gen !== generation.current) return;
      setStatusNow('online');
      const local = settingsRef.current;
      if (shared) {
        // The business-wide part comes from the server; the device part stays as it is
        const merged = normalizeSettings({ ...local, ...sharedPart(normalizeSettings(shared)) });
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          writeSettings(s, c, merged);
          setNow(merged);
        }
      } else if (local.enabled) {
        // Set up on this device before the server could keep settings: send them up once
        try {
          await a.saveKitchenSettings({ company: c, settings: sharedPart(local) });
        } catch (e) {
          // not critical: it will be tried again at the next refresh
        }
      }
    } catch (error) {
      if (gen === generation.current) setStatusNow(error.kind === 'unavailable' ? 'unavailable' : 'offline');
    }
  }, []);

  useEffect(() => {
    generation.current += 1;
    setStatusNow('checking');
    setNow(readSettings(storage, company));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => {
    if (!company) return undefined;
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, pollMs);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [company, pollMs, refresh]);

  /**
   * Save new settings. Resolves { ok: true } when they were kept everywhere they should be,
   * { ok: true, localOnly: true, message } when only this device kept them (the server refused or could
   * not be reached), or { ok: false } when not even the device could.
   */
  const save = useCallback(async (next) => {
    const { company: c, storage: s, api: a } = latest.current;
    const clean = normalizeSettings(next);
    if (!writeSettings(s, c, clean)) return { ok: false, reason: 'storage' };
    setNow(clean);
    if (statusRef.current !== 'online') return { ok: true, localOnly: statusRef.current !== 'unavailable', message: '' };
    try {
      await a.saveKitchenSettings({ company: c, settings: sharedPart(clean) });
      return { ok: true };
    } catch (error) {
      if (error.kind === 'unavailable') setStatusNow('unavailable');
      return { ok: true, localOnly: true, message: error.message };
    }
  }, []);

  /** Change something that belongs to this device only (the ticket counter): never sent to the server */
  const saveDevice = useCallback((patch) => {
    const { company: c, storage: s } = latest.current;
    const next = { ...settingsRef.current, ...patch };
    writeSettings(s, c, next);
    setNow(next);
  }, []);

  return { settings, status, save, saveDevice, refresh };
};

export default useKitchenSettings;
