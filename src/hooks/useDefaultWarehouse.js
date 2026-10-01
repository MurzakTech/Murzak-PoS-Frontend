import { useAppSelector } from '../store/hooks';
import { useMemo } from 'react';

/**
 * Custom hook to access the default warehouse from user profile
 * The default warehouse is now included in the get_current_user API response
 * and stored in the auth state, so no API call is needed.
 * 
 * @returns {Object} - { defaultWarehouse, company }
 * 
 * @example
 * const { defaultWarehouse } = useDefaultWarehouse();
 * // defaultWarehouse will be the warehouse name string (e.g., "Labrave WH - LBT")
 * // or null if not set
 */
export const useDefaultWarehouse = () => {
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = 
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Get default warehouse from user profile (set by get_current_user API)
  const defaultWarehouseName = user?.default_warehouse || null;

  // Create a warehouse object structure for consistency with previous API
  // This allows existing code to work without changes
  const defaultWarehouse = useMemo(() => {
    if (!defaultWarehouseName) return null;
    
    return {
      name: defaultWarehouseName,
      warehouse_name: defaultWarehouseName,
      is_default: true,
    };
  }, [defaultWarehouseName]);

  return {
    defaultWarehouse,
    isLoadingDefault: false, // Always false since it's from auth state
    company: userCompany,
  };
};

