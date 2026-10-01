import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  listStockTransferRequests,
  listAllStockTransfers,
  setFilters,
  setPage,
  resetFilters,
} from '../store/stockTransferSlice';

/**
 * Custom hook for managing stock transfer requests list
 * Provides functions to fetch, filter, and paginate transfer requests
 * 
 * @param {Object} [options] - Hook options
 * @param {Object} [options.filters] - Initial filters
 * @param {boolean} [options.autoFetch=true] - Auto-fetch on mount and filter changes
 * @param {boolean} [options.includeDirectTransfers=true] - Include direct transfers in the list
 * @returns {Object} Transfer requests data and operations
 * @returns {Array} requests - Array of transfer requests
 * @returns {Object} pagination - Pagination info { page, page_size, total, total_pages }
 * @returns {Object} filters - Current filters
 * @returns {boolean} loading - Loading state
 * @returns {Function} refetch - Manually refetch requests
 * @returns {Function} updateFilters - Update filters
 * @returns {Function} resetFilters - Reset filters to initial state
 * @returns {Function} setPageNumber - Set current page
 * 
 * @example
 * const { requests, loading, updateFilters, pagination } = useTransferRequests({
 *   filters: { status: 'In Transit' },
 *   autoFetch: true
 * });
 * 
 * // Update filters
 * updateFilters({ origin_warehouse: 'Stores - HO' });
 * 
 * // Change page
 * setPageNumber(2);
 */
export const useTransferRequests = (options = {}) => {
  const { filters: initialFilters = {}, autoFetch = true, includeDirectTransfers = true } = options;
  
  const dispatch = useAppDispatch();
  const {
    transferRequests,
    pagination,
    filters,
    isLoadingList,
    error,
  } = useAppSelector((state) => state.stockTransfer);

  /**
   * Fetch transfer requests with current filters
   */
  const refetch = useCallback(async () => {
    if (includeDirectTransfers) {
      // Fetch both Material Requests and Direct Transfers
      return dispatch(listAllStockTransfers(filters));
    } else {
      // Fetch only Material Requests
      return dispatch(listStockTransferRequests(filters));
    }
  }, [dispatch, filters, includeDirectTransfers]);

  /**
   * Update filters
   * @param {Object} newFilters - Filters to update
   */
  const updateFilters = useCallback(
    (newFilters) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch]
  );

  /**
   * Reset filters to initial state
   */
  const resetFiltersHandler = useCallback(() => {
    dispatch(resetFilters());
  }, [dispatch]);

  /**
   * Set current page
   * @param {number} page - Page number
   */
  const setPageNumber = useCallback(
    (page) => {
      dispatch(setPage(page));
    },
    [dispatch]
  );

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch, refetch]);

  // Apply initial filters on mount
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      dispatch(setFilters(initialFilters));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize formatted requests with helper data
  const formattedRequests = useMemo(() => {
    return transferRequests.map((request) => ({
      ...request,
      // Add computed properties if needed
      canApprove: request.status === 'Submitted',
      canDispatch: request.status === 'Approved',
      canReceive: request.status === 'In Transit' || request.status === 'Partially In Transit',
    }));
  }, [transferRequests]);

  return {
    requests: formattedRequests,
    pagination,
    filters,
    loading: isLoadingList,
    error,
    refetch,
    updateFilters,
    resetFilters: resetFiltersHandler,
    setPage: setPageNumber,
  };
};

