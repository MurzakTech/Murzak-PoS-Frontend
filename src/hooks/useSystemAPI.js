import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  listModules,
  listDoctypes,
  getDoctypeDetails,
  setFilters,
  setPagination,
  clearFilters,
  setSelectedDoctype,
  clearSelectedDoctype,
} from '../store/systemSlice';

/**
 * Custom hook for System API operations
 * Provides access to modules, doctypes, and doctype details
 * 
 * @returns {Object} System API state and actions
 * 
 * @example
 * const {
 *   modules,
 *   doctypes,
 *   doctypeDetails,
 *   listModules,
 *   listDoctypes,
 *   getDoctypeDetails,
 * } = useSystemAPI();
 * 
 * // Load modules
 * useEffect(() => {
 *   listModules();
 * }, []);
 * 
 * // Search doctypes
 * const handleSearch = async () => {
 *   await listDoctypes({
 *     module: 'Stock',
 *     search: 'Entry',
 *     is_submittable: true,
 *   });
 * };
 */
export const useSystemAPI = () => {
  const dispatch = useAppDispatch();
  const {
    modules,
    doctypes,
    selectedDoctype,
    doctypeDetails,
    isLoadingModules,
    isLoadingDoctypes,
    isLoadingDetails,
    filters,
    pagination,
    error,
  } = useAppSelector((state) => state.system);

  const handleListModules = useCallback(async () => {
    return await dispatch(listModules());
  }, [dispatch]);

  const handleListDoctypes = useCallback(
    async (listFilters = {}, paginationOptions = {}) => {
      return await dispatch(
        listDoctypes({
          ...filters,
          ...listFilters,
          page: paginationOptions.page || pagination.page,
          page_size: paginationOptions.pageSize || pagination.pageSize,
        })
      );
    },
    [dispatch, filters, pagination]
  );

  const handleGetDoctypeDetails = useCallback(
    async (doctype) => {
      return await dispatch(getDoctypeDetails(doctype));
    },
    [dispatch]
  );

  const handleSetFilters = useCallback(
    (newFilters) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch]
  );

  const handleSetPagination = useCallback(
    (newPagination) => {
      dispatch(setPagination(newPagination));
    },
    [dispatch]
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const handleSetSelectedDoctype = useCallback(
    (doctype) => {
      dispatch(setSelectedDoctype(doctype));
    },
    [dispatch]
  );

  const handleClearSelectedDoctype = useCallback(() => {
    dispatch(clearSelectedDoctype());
  }, [dispatch]);

  return {
    // Data
    modules,
    doctypes,
    selectedDoctype,
    doctypeDetails,

    // Loading states
    isLoadingModules,
    isLoadingDoctypes,
    isLoadingDetails,

    // Filters & Pagination
    filters,
    pagination,

    // Error
    error,

    // Actions
    listModules: handleListModules,
    listDoctypes: handleListDoctypes,
    getDoctypeDetails: handleGetDoctypeDetails,
    setFilters: handleSetFilters,
    setPagination: handleSetPagination,
    clearFilters: handleClearFilters,
    setSelectedDoctype: handleSetSelectedDoctype,
    clearSelectedDoctype: handleClearSelectedDoctype,
  };
};

export default useSystemAPI;

