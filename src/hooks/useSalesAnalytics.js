import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSalesAnalytics,
  exportSalesAnalytics,
  clearSalesAnalytics,
  setSalesAnalyticsFilters,
} from '../store/reportsSlice';

/**
 * Specialized hook for Sales Analytics reports
 * @param {string} company - Company name (optional, can be passed in params)
 */
export const useSalesAnalytics = (company = null) => {
  const dispatch = useAppDispatch();
  const { salesAnalytics, exportStatus } = useAppSelector((state) => state.reports);

  const loadReport = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for sales analytics report');
        return;
      }
      dispatch(fetchSalesAnalytics(requestParams));
    },
    [dispatch, company]
  );

  const exportReport = useCallback(
    async (format = 'csv', params = {}) => {
      const requestParams = company
        ? { company, format, ...salesAnalytics.filters, ...params }
        : { format, ...salesAnalytics.filters, ...params };
      if (!requestParams.company) {
        console.warn('Company is required for sales analytics export');
        return;
      }
      return dispatch(exportSalesAnalytics(requestParams));
    },
    [dispatch, company, salesAnalytics.filters]
  );

  const updateFilters = useCallback(
    (filters) => {
      dispatch(setSalesAnalyticsFilters(filters));
    },
    [dispatch]
  );

  const clear = useCallback(() => {
    dispatch(clearSalesAnalytics());
  }, [dispatch]);

  return {
    data: salesAnalytics.data,
    loading: salesAnalytics.loading,
    error: salesAnalytics.error,
    filters: salesAnalytics.filters,
    exportLoading: exportStatus.loading,
    exportError: exportStatus.error,
    loadReport,
    exportReport,
    updateFilters,
    clear,
  };
};

