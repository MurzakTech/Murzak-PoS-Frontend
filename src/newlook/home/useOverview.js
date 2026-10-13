import { useCallback, useEffect, useRef, useState } from 'react';
import { getOverview } from '../../api/overviewApi';

/**
 * Loads the Home numbers for the chosen period and keeps them fresh: every 60 seconds while the tab is visible, and at
 * once when the tab comes back after a minute away. A refresh never blanks the page: the old numbers stay until the new
 * ones arrive. Changing the period, store or staff starts a fresh load (the cards show skeletons after 200ms).
 *
 * Returns { status: 'loading' | 'ready' | 'error', data, error, reload }.
 */
export const REFRESH_MS = 60 * 1000;

const sameQuery = (a, b) => a.period === b.period && a.from === b.from && a.to === b.to && a.store === b.store && a.staff === b.staff;

const useOverview = (query, { fetcher = getOverview, refreshMs = REFRESH_MS } = {}) => {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const queryRef = useRef(query);
  const latest = useRef(0);
  const lastLoaded = useRef(0);
  const { period, from, to, store, staff } = query;

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      const ticket = ++latest.current;
      if (!quiet) setState((prev) => ({ status: 'loading', data: prev.data && sameQuery(prev.query || {}, queryRef.current) ? prev.data : null, error: null, query: queryRef.current }));
      try {
        const data = await fetcher(queryRef.current);
        if (ticket !== latest.current) return;
        lastLoaded.current = Date.now();
        setState({ status: 'ready', data, error: null, query: queryRef.current });
      } catch (error) {
        if (ticket !== latest.current) return;
        // A failed quiet refresh keeps what is on screen; only a visible load turns into the error state
        setState((prev) => (quiet && prev.data ? prev : { status: 'error', data: null, error, query: queryRef.current }));
      }
    },
    [fetcher]
  );

  useEffect(() => {
    queryRef.current = { period, from, to, store, staff };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, store, staff, load]);

  useEffect(() => {
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const timer = setInterval(() => {
      if (visible()) load({ quiet: true });
    }, refreshMs);
    const onVisibility = () => {
      if (visible() && Date.now() - lastLoaded.current >= refreshMs) load({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      latest.current += 1; // answers that arrive after the page is gone are ignored
    };
  }, [load, refreshMs]);

  const reload = useCallback(() => load(), [load]);
  return { status: state.status, data: state.data, error: state.error, reload };
};

export default useOverview;
