import { useCallback, useEffect, useRef, useState } from 'react';
import { getPaymentModes, getPurchase, listPurchases, listSuppliers } from '../../api/purchasesListApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes tab or page while an answer is on its way, the
 * late answer is thrown away instead of overwriting the newer one. `key` is the text that identifies the question.
 * Returns { status: 'loading' | 'ready' | 'error' | 'idle', data, error, errorType, reload }.
 */
const useFetched = (key, load, enabled = true) => {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: '', errorType: '' });
  const ticket = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(() => {
    ticket.current += 1;
    const mine = ticket.current;
    setState({ status: 'loading', data: null, error: '', errorType: '' });
    loader
      .current()
      .then((data) => {
        if (ticket.current === mine) setState({ status: 'ready', data, error: '', errorType: '' });
      })
      .catch((error) => {
        if (ticket.current === mine) setState({ status: 'error', data: null, error: error.message, errorType: error.errorType || '' });
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      ticket.current += 1;
      setState({ status: 'idle', data: null, error: '', errorType: '' });
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

/** One page of the list; `query` is what listPurchases takes */
export const usePurchasesList = (query, enabled = true) => useFetched(JSON.stringify(query), () => listPurchases(query), enabled);

/** One purchase; nothing is asked while id is empty */
export const usePurchase = (id, doctype) => useFetched(`${id}|${doctype || ''}`, () => getPurchase(id, doctype), Boolean(id));

/** The suppliers for the choosers */
export const useSuppliers = () => useFetched('suppliers', () => listSuppliers());

/** The ways the shop pays a supplier */
export const usePaymentModes = (enabled = true) => useFetched('modes', () => getPaymentModes(), enabled);
