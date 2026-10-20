import { apiSlice } from './apiSlice';

export const warehouseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.warehouse_api.list_warehouses',
        params,
      }),
      providesTags: (result) =>
        result?.warehouses
          ? [
              ...result.warehouses.map(({ name }) => ({ type: 'Warehouse', id: name })),
              { type: 'Warehouse', id: 'LIST' },
            ]
          : [{ type: 'Warehouse', id: 'LIST' }],
    }),

    getWarehouseDetails: builder.query({
      query: (warehouseName) => ({
        url: 'murzak_pos.api.warehouse_api.get_warehouse_details',
        params: { warehouse_name: warehouseName },
      }),
      providesTags: (result, error, warehouseName) => [{ type: 'Warehouse', id: warehouseName }],
    }),

    createWarehouse: builder.mutation({
      query: (warehouseData) => ({
        url: 'murzak_pos.api.warehouse_api.create_warehouse',
        method: 'POST',
        data: warehouseData,
      }),
      invalidatesTags: [{ type: 'Warehouse', id: 'LIST' }, 'Stock'],
    }),

    updateWarehouse: builder.mutation({
      query: (warehouseData) => ({
        url: 'murzak_pos.api.warehouse_api.update_warehouse',
        method: 'POST',
        data: warehouseData,
      }),
      invalidatesTags: (result, error, { warehouse_name, name }) => [
        { type: 'Warehouse', id: warehouse_name || name },
        { type: 'Warehouse', id: 'LIST' },
        'Stock',
      ],
    }),

    getWarehouseTypes: builder.query({
      query: () => ({
        url: 'murzak_pos.api.warehouse_api.list_warehouse_types',
      }),
    }),

    getDefaultWarehouse: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.warehouse_api.get_default_warehouse',
        params,
      }),
      providesTags: ['Warehouse'],
    }),

    setDefaultWarehouse: builder.mutation({
      query: (data) => ({
        url: 'murzak_pos.api.warehouse_api.set_default_warehouse',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Warehouse'],
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useGetWarehouseDetailsQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useGetWarehouseTypesQuery,
  useGetDefaultWarehouseQuery,
  useSetDefaultWarehouseMutation,
} = warehouseApi;
