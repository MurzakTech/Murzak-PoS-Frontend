import { getPaymentModes, getPurchase, listPurchases, listSuppliers } from '../../api/purchasesListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listPurchases takes */
export const usePurchasesList = (query, enabled = true) => useFetched(JSON.stringify(query), () => listPurchases(query), enabled);

/** One purchase; nothing is asked while id is empty */
export const usePurchase = (id, doctype) => useFetched(`${id}|${doctype || ''}`, () => getPurchase(id, doctype), Boolean(id));

/** The suppliers for the choosers */
export const useSuppliers = () => useFetched('suppliers', () => listSuppliers());

/** The ways the shop pays a supplier */
export const usePaymentModes = (enabled = true) => useFetched('modes', () => getPaymentModes(), enabled);
