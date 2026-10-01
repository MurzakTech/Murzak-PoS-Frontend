import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getDashboardMetrics } from '../store/dashboardSlice';

/**
 * Custom hook to fetch and manage dashboard metrics
 * @param {Object} filters - Filter parameters
 * @param {string} filters.period - Time period: '30days', 'month', 'year', or 'custom'
 * @param {string} filters.warehouse - Warehouse name to filter by
 * @param {string} filters.staff - Staff/user name to filter by
 * @param {string} filters.from_date - Start date for custom period (YYYY-MM-DD)
 * @param {string} filters.to_date - End date for custom period (YYYY-MM-DD)
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useDashboardMetrics = (filters = {}) => {
  const dispatch = useAppDispatch();
  const {
    stats,
    salesLast30Days,
    monthlySales,
    salesDue,
    purchasesDue,
    stockAlerts,
    pendingShipments,
    isLoading,
    error,
  } = useAppSelector((state) => state.dashboard);

  // Fetch dashboard data when filters change
  useEffect(() => {
    // Format dates to YYYY-MM-DD if they are Date objects
    const formatDate = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      return date;
    };

    const params = {
      period: filters.period || '30days',
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.staff && { staff: filters.staff }),
      ...(filters.from_date && { from_date: formatDate(filters.from_date) }),
      ...(filters.to_date && { to_date: formatDate(filters.to_date) }),
    };

    dispatch(getDashboardMetrics(params));
  }, [
    dispatch,
    filters.period,
    filters.warehouse,
    filters.staff,
    filters.from_date,
    filters.to_date,
  ]);

  // Refetch function
  const refetch = () => {
    // Format dates to YYYY-MM-DD if they are Date objects
    const formatDate = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      return date;
    };

    const params = {
      period: filters.period || '30days',
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.staff && { staff: filters.staff }),
      ...(filters.from_date && { from_date: formatDate(filters.from_date) }),
      ...(filters.to_date && { to_date: formatDate(filters.to_date) }),
    };
    dispatch(getDashboardMetrics(params));
  };

  // Combine all data into a single object matching the API response structure
  const data = stats ? {
    stats,
    salesLast30Days,
    monthlySales,
    salesDue,
    purchasesDue,
    stockAlerts,
    pendingShipments,
  } : null;

  return {
    data,
    loading: isLoading,
    error,
    refetch,
  };
};

