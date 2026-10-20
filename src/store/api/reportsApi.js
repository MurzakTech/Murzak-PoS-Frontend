import { apiSlice } from './apiSlice';

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReportData: builder.query({
      query: ({ reportName, params }) => ({
        url: `murzak_pos.api.reports_api.get_${reportName.replace(/-/g, '_')}`,
        params,
      }),
      providesTags: (result, error, { reportName }) => [{ type: 'Report', id: reportName }],
    }),

    getSalesAnalytics: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.reports_api.get_sales_analytics',
        params,
      }),
      providesTags: ['Report', 'Sale'],
    }),

    getInventorySummary: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.reports_api.get_inventory_summary',
        params,
      }),
      providesTags: ['Report', 'Stock'],
    }),

    getInventoryValuation: builder.query({
      query: (params) => ({
        url: 'murzak_pos.api.reports_api.get_inventory_valuation',
        params,
      }),
      providesTags: ['Report', 'Stock'],
    }),
  }),
});

export const {
  useGetReportDataQuery,
  useGetSalesAnalyticsQuery,
  useGetInventorySummaryQuery,
  useGetInventoryValuationQuery,
} = reportsApi;
