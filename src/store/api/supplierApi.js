import { apiSlice } from './apiSlice';

export const supplierApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.suppliers_list_api.list_suppliers',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'Supplier', id: 'LIST' }],
    }),
    getSupplierOverview: builder.query({
      query: ({ id, company }) => ({
        url: 'murzak_pos.api.suppliers_list_api.get_supplier_overview',
        method: 'GET',
        params: { id, company },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Supplier', id }],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierOverviewQuery,
} = supplierApi;
