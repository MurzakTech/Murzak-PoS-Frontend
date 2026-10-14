import { useCallback, useEffect, useRef, useState } from 'react';
import { listCategories, listProducts, listUnits } from '../../api/productsListApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes the page or a filter while an answer is on its way, the
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
    setState((prev) => ({ status: 'loading', data: null, error: '', previous: prev.data }));
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

  return { status: state.status, data: state.data, error: state.error, reload: run };
};

/** One page of the list; `query` is what listProducts takes */
export const useProductList = (query) => useFetched(JSON.stringify(query), () => listProducts(query));

/** The categories with their product counts */
export const useCategories = () => useFetched('categories', () => listCategories());

/** The units the shop can choose from */
export const useUnits = () => useFetched('units', () => listUnits());

/** One product by its code, for a shared link to a product that is not on the page; nothing is asked while code is empty */
export const useProductByCode = (code) =>
  useFetched(
    `code:${code}`,
    async () => {
      const answer = await listProducts({ search: code, status: 'all', pageSize: 10 });
      return answer.rows.find((r) => r.item_code === code) || null;
    },
    Boolean(code)
  );
