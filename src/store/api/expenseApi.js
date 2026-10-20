import { apiSlice } from './apiSlice';

export const expenseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.expenses_api.list_expenses',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    getExpenseOptions: builder.query({
      query: (company) => ({
        url: 'murzak_pos.api.expenses_api.get_expense_options',
        method: 'GET',
        params: { company },
      }),
      providesTags: [{ type: 'Expense', id: 'OPTIONS' }],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useGetExpenseOptionsQuery,
} = expenseApi;
