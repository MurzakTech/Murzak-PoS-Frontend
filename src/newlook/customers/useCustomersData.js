import { getCreditHistory, getCreditLimit, getCustomerFormOptions, getCustomerOverview, getCustomerStatement, getLoyaltyBalance, listCustomers } from '../../api/customersListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listCustomers takes. Nothing is asked while `enabled` is false. */
export const useCustomersList = (query, enabled = true) => useFetched(`customers:list:${JSON.stringify(query)}`, () => listCustomers(query), enabled);

/** The panel of one customer; nothing is asked while id is empty */
export const useCustomerOverview = (id, company) => useFetched(`customers:overview:${id}|${company}`, () => getCustomerOverview(id, company), Boolean(id));

/** The statement for a period; nothing is asked while `enabled` is false (a person who may not see statements) */
export const useStatement = (id, company, from, to, enabled = true) =>
  useFetched(`customers:statement:${id}|${company}|${from}|${to}`, () => getCustomerStatement({ customer: id, company, from, to }), Boolean(id) && enabled);

/** The credit limit, what is owed and what is left */
export const useCreditLimit = (id, company, enabled = true) => useFetched(`customers:credit-limit:${id}|${company}`, () => getCreditLimit(id, company), Boolean(id) && enabled);

/** The credit history for a period */
export const useCreditHistory = (id, company, from, to, enabled = true) =>
  useFetched(`customers:credit-history:${id}|${company}|${from}|${to}`, () => getCreditHistory({ customer: id, company, from, to }), Boolean(id) && enabled);

/** The points balance of the customer */
export const useLoyaltyBalance = (id, company) => useFetched(`customers:loyalty:${id}|${company}`, () => getLoyaltyBalance(id, company), Boolean(id));

/** Whether the forms show the group and area, and the choices */
export const useFormOptions = (company) => useFetched(`customers:options:${company}`, () => getCustomerFormOptions(company));
