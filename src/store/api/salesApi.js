import { apiSlice } from './apiSlice';

export const salesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSales: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.sales_list_api.list_sales',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.rows
          ? [
              ...result.rows.map(({ name }) => ({ type: 'Sale', id: name })),
              { type: 'Sale', id: 'LIST' },
            ]
          : [{ type: 'Sale', id: 'LIST' }],
    }),
    getSale: builder.query({
      query: ({ id, doctype }) => ({
        url: 'murzak_pos.api.sales_list_api.get_sale',
        method: 'GET',
        params: { name: id, doctype },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Sale', id }],
    }),
    createPOSInvoice: builder.mutation({
      query: (invoiceData) => ({
        url: 'murzak_pos.api.sales_api.create_pos_invoice',
        method: 'POST',
        data: invoiceData,
      }),
      invalidatesTags: [
        { type: 'Sale', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetSaleQuery,
  useCreatePOSInvoiceMutation,
} = salesApi;
