import { useCallback, useEffect, useRef, useState } from 'react';
import { getCreditHistory, getCreditLimit, getCustomerFormOptions, getCustomerOverview, getCustomerStatement, getLoyaltyBalance, listCustomers } from '../../api/customersListApi';

/**
 * Fetches with a "latest answer wins" rule: if the person changes tab or page while an answer is on its way, the late answer is
 * thrown away instead of overwriting the newer one. `key` is the text that identifies the question.
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

/** One page of the list; `query` is what listCustomers takes. Nothing is asked while `enabled` is false. */
export const useCustomersList = (query, enabled = true) => useFetched(JSON.stringify(query), () => listCustomers(query), enabled);

/** The panel of one customer; nothing is asked while id is empty */
export const useCustomerOverview = (id, company) => useFetched(`${id}|${company}`, () => getCustomerOverview(id, company), Boolean(id));

/** The statement for a period; nothing is asked while `enabled` is false (a person who may not see statements) */
export const useStatement = (id, company, from, to, enabled = true) =>
  useFetched(`${id}|${company}|${from}|${to}`, () => getCustomerStatement({ customer: id, company, from, to }), Boolean(id) && enabled);

/** The credit limit, what is owed and what is left */
export const useCreditLimit = (id, company, enabled = true) => useFetched(`${id}|${company}`, () => getCreditLimit(id, company), Boolean(id) && enabled);

/** The credit history for a period */
export const useCreditHistory = (id, company, from, to, enabled = true) =>
  useFetched(`${id}|${company}|${from}|${to}`, () => getCreditHistory({ customer: id, company, from, to }), Boolean(id) && enabled);

/** The points balance of the customer */
export const useLoyaltyBalance = (id, company) => useFetched(`${id}|${company}`, () => getLoyaltyBalance(id, company), Boolean(id));

/** Whether the forms show the group and area, and the choices */
export const useFormOptions = (company) => useFetched(`${company}`, () => getCustomerFormOptions(company));
