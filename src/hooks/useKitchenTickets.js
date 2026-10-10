import { useCallback, useEffect, useRef, useState } from 'react';
import * as serverApi from '../api/kitchenApi';

/**
 * The till's side of station screens, used only when the business has turned them on:
 *
 *  - send(tickets): hands the tickets to the server, which numbers them. Resolves { ok: true, tickets }
 *    with the numbers, or { ok: false, kind, message } so the till can offer to try again or to print only.
 *  - ready: the tickets a station has marked Ready and nobody has served yet, kept up to date.
 *  - newlyReady: tickets that became ready since the last time it was cleared (the first look never counts),
 *    so the till can tell the waiter once.
 *  - markServed(id): the waiter has taken it to the table or called the number.
 *
 * status: 'off', 'checking', 'online', 'offline' or 'unavailable' (this server has no kitchen calls).
 */
const useKitchenTickets = ({ company, warehouse, enabled, api = serverApi, pollMs = 10000 }) => {
  const [status, setStatus] = useState('off');
  const [ready, setReady] = useState([]);
  const [newlyReady, setNewlyReady] = useState([]);
  const seen = useRef(null); // ids already known; null until the first look
  const statusRef = useRef('off');
  const generation = useRef(0);
  const latest = useRef({});
  latest.current = { company, warehouse, api };

  const setStatusNow = (next) => { statusRef.current = next; setStatus(next); };

  const refresh = useCallback(async () => {
    const { company: c, warehouse: w, api: a } = latest.current;
    if (!c || statusRef.current === 'unavailable' || statusRef.current === 'off') return;
    const gen = generation.current;
    try {
      const list = await a.listTickets({ company: c, warehouse: w, statuses: ['Ready'] });
      if (gen !== generation.current) return;
      setStatusNow('online');
      setReady(list);
      if (seen.current === null) {
        seen.current = new Set(list.map((t) => t.id));
      } else {
        const fresh = list.filter((t) => !seen.current.has(t.id));
        fresh.forEach((t) => seen.current.add(t.id));
        if (fresh.length) setNewlyReady((prev) => [...prev, ...fresh]);
      }
    } catch (error) {
      if (gen === generation.current) setStatusNow(error.kind === 'unavailable' ? 'unavailable' : 'offline');
    }
  }, []);

  useEffect(() => {
    generation.current += 1;
    seen.current = null;
    setReady([]);
    setNewlyReady([]);
    setStatusNow(enabled && company ? 'checking' : 'off');
    if (enabled && company) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, warehouse, enabled]);

  useEffect(() => {
    if (!enabled || !company) return undefined;
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, pollMs);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', tick);
    };
  }, [enabled, company, pollMs, refresh]);

  const send = useCallback(async (tickets) => {
    const { company: c, warehouse: w, api: a } = latest.current;
    try {
      const saved = await a.sendTickets({ company: c, warehouse: w, tickets });
      if (statusRef.current !== 'online') setStatusNow('online');
      return { ok: true, tickets: saved };
    } catch (error) {
      if (error.kind === 'unavailable') setStatusNow('unavailable');
      else setStatusNow('offline');
      return { ok: false, kind: error.kind, message: error.message };
    }
  }, []);

  const markServed = useCallback(async (id) => {
    const { company: c, api: a } = latest.current;
    try {
      await a.setTicketStatus({ company: c, id, status: 'Served' });
      setReady((prev) => prev.filter((t) => t.id !== String(id)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }, []);

  const clearNewlyReady = useCallback(() => setNewlyReady([]), []);

  return { status, ready, newlyReady, clearNewlyReady, send, markServed, refresh };
};

export default useKitchenTickets;
