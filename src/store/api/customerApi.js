import { apiSlice } from './apiSlice';

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.customers_list_api.list_customers',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.customers || Array.isArray(result)
          ? [
              ...(Array.isArray(result) ? result : result.customers).map(({ name, id }) => ({
                type: 'Customer',
                id: id || name,
              })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),
    getCustomer: builder.query({
      query: (customerId) => ({
        url: 'murzak_pos.api.customer_api.get_customer',
        method: 'GET',
        params: { customer: customerId },
      }),
      providesTags: (result, error, id) => [{ type: 'Customer', id }],
    }),
    getCustomerOverview: builder.query({
      query: ({ id, company }) => ({
        url: 'murzak_pos.api.customers_list_api.get_customer_overview',
        method: 'GET',
        params: { customer: id, company },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Customer', id }],
    }),
    getCreditLimit: builder.query({
      query: ({ customer, company }) => ({
        url: 'murzak_pos.api.customer_api.get_customer_credit_limit',
        method: 'GET',
        params: { customer, company },
      }),
      providesTags: (result, error, { customer }) => [{ type: 'Customer', id: customer }],
    }),
    createCustomer: builder.mutation({
      query: (customerData) => ({
        url: 'murzak_pos.api.customer_api.create_customer',
        method: 'POST',
        data: customerData,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    updateCustomer: builder.mutation({
      query: (customerData) => ({
        url: 'murzak_pos.api.customer_api.update_customer',
        method: 'POST',
        data: customerData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useGetCustomerOverviewQuery,
  useGetCreditLimitQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} = customerApi;
