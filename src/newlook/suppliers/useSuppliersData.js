import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupplierOverview, listSupplierGroups, listSuppliers } from '../../api/suppliersListApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes the filter or the page while an answer is on its way, the late
 * answer is thrown away instead of overwriting the newer one. `key` is the text that identifies the question.
 * Returns { status: 'idle' | 'loading' | 'ready' | 'error', data, error, reload }.
 */
export const useFetched = (key, load, enabled = true) => {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: '' });
  const ticket = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback((keep = false) => {
    ticket.current += 1;
    const mine = ticket.current;
    // A reload keeps what is on screen until the new answer arrives; a new question starts empty
    setState((prev) => ({ status: 'loading', data: keep ? prev.data : null, error: '' }));
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
    run(false);
    return () => {
      ticket.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const reload = useCallback(() => run(true), [run]);
  return { ...state, reload };
};

/** One page of the list; `query` is what listSuppliers takes. Nothing is asked while `enabled` is false. */
export const useSuppliersList = (query, enabled = true) => useFetched(JSON.stringify(query), () => listSuppliers(query), enabled);

/** The panel of one supplier; nothing is asked while id is empty */
export const useSupplierOverview = (id, company) => useFetched(`${id}|${company}`, () => getSupplierOverview(id, company), Boolean(id));

/** The supplier groups to choose from, as [{ value, label }] */
export const useSupplierGroups = () => useFetched('groups', () => listSupplierGroups());
