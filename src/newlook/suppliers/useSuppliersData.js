import { getSupplierOverview, listSupplierGroups, listSuppliers } from '../../api/suppliersListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listSuppliers takes. Nothing is asked while `enabled` is false. */
export const useSuppliersList = (query, enabled = true) => useFetched(`suppliers:list:${JSON.stringify(query)}`, () => listSuppliers(query), enabled);

/** The panel of one supplier; nothing is asked while id is empty */
export const useSupplierOverview = (id, company) => useFetched(`suppliers:overview:${id}|${company}`, () => getSupplierOverview(id, company), Boolean(id));

/** The supplier groups to choose from, as [{ value, label }] */
export const useSupplierGroups = () => useFetched('suppliers:groups', () => listSupplierGroups());
