import { useCallback, useEffect, useRef, useState } from 'react';
import { getSale, listSales } from '../../api/salesListApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes tab or page while an answer is on its way, the
 * late answer is thrown away instead of overwriting the newer one. `key` is the text that identifies the question.
 * Returns { status: 'loading' | 'ready' | 'error', data, error, reload }.
 */
const useFetched = (key, load, enabled = true) => {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: '' });
  const ticket = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(() => {
    ticket.current += 1;
    const mine = ticket.current;
    setState((prev) => ({ status: 'loading', data: prev.data, error: '' }));
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

/** One page of the list; `query` is what listSales takes */
export const useSalesList = (query) => useFetched(JSON.stringify(query), () => listSales(query));

/** One receipt; nothing is asked while id is empty */
export const useSale = (id, doctype) => useFetched(`${id}|${doctype}`, () => getSale(id, doctype), Boolean(id));
