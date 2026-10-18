import { useCallback, useEffect, useRef, useState } from 'react';
import { getCountSheet, getStockLevels } from '../../api/stockLevelsApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes tab or page while an answer is on its way, the
 * late answer is thrown away instead of overwriting the newer one. `key` is the text that identifies the question.
 * Returns { status: 'loading' | 'ready' | 'error' | 'idle', data, error, reload }.
 */
const useFetched = (key, load, enabled = true) => {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: '' });
  const ticket = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(() => {
    ticket.current += 1;
    const mine = ticket.current;
    setState({ status: 'loading', data: null, error: '' });
    loader
      .current()
      .then((data) => {
        if (ticket.current === mine) setState({ status: 'ready', data, error: '' });
      })
      .catch((error) => {
        if (ticket.current === mine) setState({ status: 'error', data: null, error: error.message });
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      ticket.current += 1;
      setState({ status: 'idle', data: null, error: '' });
      return undefined;
    }
    run();
    return () => {
      ticket.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { ...state, reload: run };
};

/** One page of a tab; `query` is what getStockLevels takes */
export const useStockLevels = (query) => useFetched(JSON.stringify(query), () => getStockLevels(query));

/** The count sheet; nothing is asked while `query` is null */
export const useCountSheet = (query) => useFetched(JSON.stringify(query), () => getCountSheet(query), Boolean(query));
