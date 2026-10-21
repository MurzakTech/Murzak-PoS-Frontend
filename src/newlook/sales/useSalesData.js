import { getSale, listSales } from '../../api/salesListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listSales takes */
export const useSalesList = (query) => useFetched(`sales:list:${JSON.stringify(query)}`, () => listSales(query));

/** One receipt; nothing is asked while id is empty */
export const useSale = (id, doctype) => useFetched(`sales:doc:${id}|${doctype}`, () => getSale(id, doctype), Boolean(id));
