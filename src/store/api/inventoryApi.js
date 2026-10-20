import { apiSlice } from './apiSlice';

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStockLevels: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.stock_levels_api.get_stock_levels',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'Stock', id: 'LIST' }],
    }),
    getCountSheet: builder.query({
      query: (params = {}) => ({
        url: 'murzak_pos.api.stock_levels_api.get_count_sheet',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'Stock', id: 'COUNT_SHEET' }],
    }),
  }),
});

export const {
  useGetStockLevelsQuery,
  useGetCountSheetQuery,
} = inventoryApi;
