import { getExpenseOptions, getReceipt, listExpenses } from '../../api/expensesApi';
import { useFetched } from '../suppliers/useSuppliersData';

/** One page of the list; `query` is what listExpenses takes. Nothing is asked until `enabled` (the person's role is known). */
export const useExpensesList = (query, enabled = true) => useFetched(JSON.stringify(query), () => listExpenses(query), enabled);

/** The choices the form and the Category filter offer */
export const useExpenseOptions = (company, enabled = true) => useFetched(`options|${company || ''}`, () => getExpenseOptions(company), enabled);

/** The receipt photo of one expense; nothing is asked while id is empty */
export const useReceipt = (id, enabled = true) => useFetched(`receipt|${id}`, () => getReceipt(id), Boolean(id) && enabled);
