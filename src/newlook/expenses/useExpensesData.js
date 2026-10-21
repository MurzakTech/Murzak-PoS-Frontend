import { getExpenseOptions, getReceipt, listExpenses } from '../../api/expensesApi';
import { useFetched, useDataQuery, invalidateQuery } from '../hooks/useDataQuery';

export { useFetched, useDataQuery, invalidateQuery };

/** One page of the list; `query` is what listExpenses takes. Nothing is asked until `enabled` (the person's role is known). */
export const useExpensesList = (query, enabled = true) => useFetched(`expenses:list:${JSON.stringify(query)}`, () => listExpenses(query), enabled);

/** The choices the form and the Category filter offer */
export const useExpenseOptions = (company, enabled = true) => useFetched(`expenses:options:${company || ''}`, () => getExpenseOptions(company), enabled);

/** The receipt photo of one expense; nothing is asked while id is empty */
export const useReceipt = (id, enabled = true) => useFetched(`expenses:receipt:${id}`, () => getReceipt(id), Boolean(id) && enabled);
