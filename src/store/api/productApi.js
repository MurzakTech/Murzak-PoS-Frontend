import { apiSlice } from './apiSlice';

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.products_list_api.list_products',
        method: 'GET',
        params,
      }),
      providesTags: (result) =>
        result?.rows
          ? [
              ...result.rows.map(({ item_code }) => ({ type: 'Product', id: item_code })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getProduct: builder.query({
      query: (item_code) => ({
        url: 'murzak_pos.api.product_api.get_product',
        method: 'GET',
        params: { item_code },
      }),
      providesTags: (result, error, item_code) => [{ type: 'Product', id: item_code }],
    }),
    getCategories: builder.query({
      query: () => ({
        url: 'murzak_pos.api.products_list_api.list_categories',
        method: 'GET',
      }),
      providesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    getUnits: builder.query({
      query: () => ({
        url: 'murzak_pos.api.products_list_api.list_units',
        method: 'GET',
      }),
    }),
    createProduct: builder.mutation({
      query: (productData) => ({
        url: 'murzak_pos.api.products_list_api.create_product',
        method: 'POST',
        data: productData,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Category', id: 'LIST' }],
    }),
    updateProduct: builder.mutation({
      query: ({ code, changes, warehouse, company }) => ({
        url: 'murzak_pos.api.products_list_api.update_product',
        method: 'POST',
        data: { code, changes, warehouse, company },
      }),
      invalidatesTags: (result, error, { code }) => [
        { type: 'Product', id: code },
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useGetCategoriesQuery,
  useGetUnitsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} = productApi;
