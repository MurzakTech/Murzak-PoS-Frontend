import { createApi } from '@reduxjs/toolkit/query/react';
import axiosInstance from '../../api/axiosInstance';
import { registerInvalidationBridge } from '../../newlook/hooks/useDataQuery';

/**
 * Custom baseQuery that routes all requests through the configured axiosInstance.
 * Automatically inherits:
 * - JWT Authorization headers
 * - Silent 401 token refresh with request queueing
 * - Friendly error humanization
 * - Frappe envelope extraction ({ message: ... } / { success, data })
 */
export const axiosBaseQuery =
  () =>
  async ({ url, method = 'GET', data, params, headers, allowRefusal = false }) => {
    try {
      const response = await axiosInstance({
        url,
        method,
        data,
        params,
        headers,
        allowRefusal,
      });

      const body = response.data?.message ?? response.data;
      if (body && typeof body === 'object' && body.success === false) {
        return {
          error: {
            status: 400,
            data: body,
            message: body.message || 'Operation refused by server',
          },
        };
      }

      // If response body has a data field, return that as primary payload
      const resultData = body?.data !== undefined ? body.data : body;
      return { data: resultData };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status || 500,
          data: axiosError.response?.data || axiosError.message,
          message: axiosError.message || 'Network request failed',
        },
      };
    }
  };

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Product',
    'Category',
    'Customer',
    'Sale',
    'Stock',
    'Supplier',
    'Expense',
    'Warehouse',
    'Role',
    'Staff',
    'Onboarding',
    'Setup',
    'Report',
  ],
  endpoints: () => ({}),
});

/**
 * Connects the New Look query invalidation system to RTK Query.
 * When any New Look screen invalidates a query prefix, matching RTK Query tags
 * are automatically invalidated across the Redux store.
 */
export const initApiBridge = (dispatch) => {
  registerInvalidationBridge((keyOrPrefix) => {
    if (!dispatch) return;
    if (!keyOrPrefix) {
      dispatch(
        apiSlice.util.invalidateTags([
          'Product',
          'Category',
          'Customer',
          'Sale',
          'Stock',
          'Supplier',
          'Expense',
          'Warehouse',
          'Role',
          'Staff',
          'Onboarding',
          'Setup',
          'Report',
        ])
      );
      return;
    }
    const lower = String(keyOrPrefix).toLowerCase();
    const tagsToInvalidate = [];
    if (lower.includes('product')) tagsToInvalidate.push('Product', 'Category');
    if (lower.includes('customer')) tagsToInvalidate.push('Customer');
    if (lower.includes('sale') || lower.includes('invoice')) tagsToInvalidate.push('Sale');
    if (lower.includes('stock')) tagsToInvalidate.push('Stock');
    if (lower.includes('supplier')) tagsToInvalidate.push('Supplier');
    if (lower.includes('expense')) tagsToInvalidate.push('Expense');
    if (lower.includes('warehouse')) tagsToInvalidate.push('Warehouse', 'Stock');
    if (lower.includes('staff')) tagsToInvalidate.push('Staff');
    if (lower.includes('role')) tagsToInvalidate.push('Role');
    if (lower.includes('setup') || lower.includes('onboarding')) tagsToInvalidate.push('Setup', 'Onboarding');
    if (lower.includes('report')) tagsToInvalidate.push('Report');

    if (tagsToInvalidate.length > 0) {
      dispatch(apiSlice.util.invalidateTags(tagsToInvalidate));
    }
  });
};
