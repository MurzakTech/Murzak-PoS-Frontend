import { useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getInventoryDiscountForItem } from '../store/inventoryDiscountSlice';

/**
 * Custom hook to fetch inventory discount for a single item
 * Uses caching to avoid redundant API calls
 * 
 * @param {Object} params - Item parameters
 * @param {string} params.item_code - Item code (required)
 * @param {string} [params.company] - Company name (optional, will use user's company)
 * @param {string} [params.warehouse] - Warehouse name (optional)
 * @param {string} [params.batch_no] - Batch number (optional)
 * @param {string} [params.item_group] - Item group (optional, auto-fetched if not provided)
 * @param {string} [params.posting_date] - Date for validation (YYYY-MM-DD format)
 * @param {boolean} [params.autoFetch=true] - Whether to automatically fetch on mount/change
 * 
 * @returns {Object} - { discount, loading, error, refetch }
 * 
 * @example
 * const { discount, loading } = useItemDiscount({
 *   item_code: 'ITEM-001',
 *   company: 'My Company',
 *   warehouse: 'Main Warehouse',
 *   batch_no: 'BATCH-123',
 * });
 */
export const useItemDiscount = ({
  item_code,
  company,
  warehouse,
  batch_no,
  item_group,
  posting_date,
  autoFetch = true,
} = {}) => {
  const dispatch = useAppDispatch();
  const { itemDiscounts, isLoadingItem, error } = useAppSelector(
    (state) => state.inventoryDiscount
  );

  // Get user's company from auth state if not provided
  const { user } = useAppSelector((state) => state.auth);
  const userCompany = useMemo(() => {
    if (company) return company;
    
    return user?.company ||
           user?.custom_company ||
           user?.company_name ||
           user?.company_data?.name ||
           user?.company_data?.company_name;
  }, [company, user]);

  // Create cache key
  const cacheKey = useMemo(() => {
    if (!item_code) return null;
    return `${item_code}|${batch_no || ''}|${warehouse || ''}`;
  }, [item_code, batch_no, warehouse]);

  // Get discount from cache
  const cachedDiscount = useMemo(() => {
    if (!cacheKey) return undefined;
    return itemDiscounts[cacheKey];
  }, [cacheKey, itemDiscounts]);

  // Fetch discount
  const refetch = useCallback(async () => {
    if (!item_code || !userCompany) {
      return;
    }

    await dispatch(getInventoryDiscountForItem({
      item_code,
      company: userCompany,
      warehouse,
      batch_no,
      item_group,
      posting_date,
    }));
  }, [dispatch, item_code, userCompany, warehouse, batch_no, item_group, posting_date]);

  // Auto-fetch if not in cache and autoFetch is enabled
  useEffect(() => {
    if (autoFetch && item_code && userCompany && cachedDiscount === undefined) {
      refetch();
    }
  }, [autoFetch, item_code, userCompany, cachedDiscount, refetch]);

  // Return cached discount or null
  const discount = cachedDiscount !== undefined ? cachedDiscount : null;

  return {
    discount,
    loading: isLoadingItem && cachedDiscount === undefined,
    error,
    refetch,
  };
};

