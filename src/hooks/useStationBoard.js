import { useCallback, useEffect, useRef, useState } from 'react';
import * as serverApi from '../api/kitchenApi';

const OPEN = ['New', 'Preparing', 'Ready'];
const DAY = 24 * 60 * 60 * 1000;

/**
 * What a station screen shows: the open tickets for one station, kept up to date, and (when asked for)
 * the cancellations of the last day, which are kept as a record.
 *
 *  - board: tickets that are New, Preparing or Ready, oldest first.
 *  - mark(id, status): moves a ticket along. The screen changes at once and is put back if the server refuses.
 *  - onNew(tickets): called when tickets arrive that were not there before (never for the first look),
 *    for the sound.
 *  - history: tickets from the last day that cancel something, when withHistory is true.
 *
 * status: 'checking', 'online', 'offline' (showing the last tickets it had, still trying) or 'unavailable'.
 */
const useStationBoard = ({ company, warehouse, station, withHistory = false, onNew, api = serverApi, pollMs = 5000, historyMs = 30000 }) => {
  const [board, setBoard] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const seen = useRef(null);
  const statusRef = useRef('checking');
  const generation = useRef(0);
  const latest = useRef({});
  latest.current = { company, warehouse, station, api, onNew };

  const setStatusNow = (next) => { statusRef.current = next; setStatus(next); };
  const oldestFirst = (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const refresh = useCallback(async () => {
    const { company: c, warehouse: w, station: st, api: a } = latest.current;
    if (!c || !st || statusRef.current === 'unavailable') return;
    const gen = generation.current;
    try {
      const list = await a.listTickets({ company: c, warehouse: w, station: st, statuses: OPEN });
      if (gen !== generation.current) return;
      setStatusNow('online');
      setBoard([...list].sort(oldestFirst));
      if (seen.current === null) {
        seen.current = new Set(list.map((t) => t.id));
      } else {
        const fresh = list.filter((t) => !seen.current.has(t.id));
        fresh.forEach((t) => seen.current.add(t.id));
        if (fresh.length && latest.current.onNew) latest.current.onNew(fresh);
      }
    } catch (e) {
      if (gen === generation.current) setStatusNow(e.kind === 'unavailable' ? 'unavailable' : 'offline');
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    const { company: c, warehouse: w, station: st, api: a } = latest.current;
    if (!c || !st || statusRef.current === 'unavailable') return;
    const gen = generation.current;
    try {
      const list = await a.listTickets({ company: c, warehouse: w, station: st, since: new Date(Date.now() - DAY).toISOString() });
      if (gen === generation.current) setHistory(list.filter((t) => t.voids.length > 0).sort((x, y) => oldestFirst(y, x)));
    } catch (e) {
      // the board shows the connection problem; the record is simply not updated
    }
  }, []);

  useEffect(() => {
    generation.current += 1;
    seen.current = null;
    setBoard([]);
    setHistory([]);
    setStatusNow('checking');
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, warehouse, station]);

  useEffect(() => {
    if (!company || !station) return undefined;
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, pollMs);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', tick);
    };
  }, [company, station, pollMs, refresh]);

  useEffect(() => {
    if (!withHistory || !company || !station) return undefined;
    refreshHistory();
    const timer = setInterval(refreshHistory, historyMs);
    return () => clearInterval(timer);
  }, [withHistory, company, station, historyMs, refreshHistory]);

  const mark = useCallback(async (id, next) => {
    const { company: c, api: a } = latest.current;
    const key = String(id);
    const before = board;
    setError('');
    // Show the change at once; a ticket marked Served leaves the board
    setBoard((prev) => (next === 'Served' ? prev.filter((t) => t.id !== key) : prev.map((t) => (t.id === key ? { ...t, status: next } : t))));
    try {
      await a.setTicketStatus({ company: c, id: key, status: next });
      return { ok: true };
    } catch (e) {
      setBoard(before);
      setError(e.message);
      return { ok: false, message: e.message };
    }
  }, [board]);

  return { board, history, status, error, mark, refresh };
};

export default useStationBoard;
