import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { bulkGetInventoryDiscounts } from '../store/inventoryDiscountSlice';

/**
 * Custom hook to fetch inventory discounts for multiple items in bulk
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.company - Company name (optional, will use user's company if not provided)
 * @param {string} [options.warehouse] - Warehouse name (optional)
 * @param {Array} options.items - Array of items to fetch discounts for
 *   Each item: { item_code, batch_no?, warehouse?, item_group? }
 * @param {string} [options.posting_date] - Date for validation (YYYY-MM-DD format)
 * @param {boolean} [options.autoFetch=true] - Whether to automatically fetch on mount/change
 * 
 * @returns {Object} - { discounts, loading, error, refetch }
 * 
 * @example
 * const { discounts, loading } = useInventoryDiscounts({
 *   company: 'My Company',
 *   warehouse: 'Main Warehouse',
 *   items: [
 *     { item_code: 'ITEM-001' },
 *     { item_code: 'ITEM-002', batch_no: 'BATCH-1' },
 *   ],
 * });
 */
export const useInventoryDiscounts = ({
  company,
  warehouse,
  items = [],
  posting_date,
  autoFetch = true,
} = {}) => {
  const dispatch = useAppDispatch();
  const { bulkDiscounts, isLoadingBulk, error } = useAppSelector(
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

  // Memoize items to prevent unnecessary refetches
  const itemsKey = useMemo(() => {
    if (!items || items.length === 0) return null;
    return JSON.stringify(items);
  }, [items]);

  // Use ref to store latest items without causing re-renders
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Fetch discounts
  const refetch = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (!currentItems || currentItems.length === 0 || !userCompany) {
      return;
    }

    await dispatch(bulkGetInventoryDiscounts({
      company: userCompany,
      warehouse,
      items: currentItems,
      posting_date,
    }));
  }, [dispatch, userCompany, warehouse, posting_date]);

  // Auto-fetch on mount and when dependencies change
  // Note: We use itemsKey to detect content changes, not items array reference
  // This prevents infinite loops when items array is recreated with same content
  useEffect(() => {
    if (autoFetch && itemsKey && userCompany) {
      const currentItems = itemsRef.current;
      if (currentItems && currentItems.length > 0) {
        dispatch(bulkGetInventoryDiscounts({
          company: userCompany,
          warehouse,
          items: currentItems,
          posting_date,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, itemsKey, userCompany, warehouse, posting_date]);

  // Create a map of discounts by item_code for easy lookup
  const discountsMap = useMemo(() => {
    if (!bulkDiscounts || !Array.isArray(bulkDiscounts)) {
      return {};
    }

    const map = {};
    bulkDiscounts.forEach((item) => {
      const key = `${item.item_code}|${item.batch_no || ''}|${item.warehouse || ''}`;
      map[key] = item.rule;
      // Also create a simple item_code key for quick lookup
      if (!map[item.item_code]) {
        map[item.item_code] = item.rule;
      }
    });
    return map;
  }, [bulkDiscounts]);

  return {
    discounts: bulkDiscounts || [],
    discountsMap,
    loading: isLoadingBulk,
    error,
    refetch,
  };
};

