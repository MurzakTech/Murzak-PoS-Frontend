import { getPaymentModes, getPurchase, listPurchases, listSuppliers } from '../../api/purchasesListApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listPurchases takes */
export const usePurchasesList = (query, enabled = true) => useFetched(`purchases:list:${JSON.stringify(query)}`, () => listPurchases(query), enabled);

/** One purchase; nothing is asked while id is empty */
export const usePurchase = (id, doctype, company) => useFetched(`purchases:doc:${id}|${doctype || ''}|${company || ''}`, () => (company ? getPurchase(id, doctype, company) : getPurchase(id, doctype)), Boolean(id));

/** The suppliers for the choosers */
export const useSuppliers = () => useFetched('purchases:suppliers', () => listSuppliers());

/** The ways the shop pays a supplier */
export const usePaymentModes = (enabled = true) => useFetched('purchases:modes', () => getPaymentModes(), enabled);
