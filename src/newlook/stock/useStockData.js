import { getCountSheet, getStockLevels } from '../../api/stockLevelsApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of a tab; `query` is what getStockLevels takes */
export const useStockLevels = (query) => useFetched(`stock:list:${JSON.stringify(query)}`, () => getStockLevels(query));

/** The count sheet; nothing is asked while `query` is null */
export const useCountSheet = (query) => useFetched(`stock:count:${JSON.stringify(query)}`, () => getCountSheet(query), Boolean(query));
