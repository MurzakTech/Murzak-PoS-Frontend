import { useAppSelector } from '../store/hooks';

/**
 * Custom hook to access the currently active/selected warehouse from the AppBar
 * This warehouse is selected globally and persisted in localStorage
 * 
 * @returns {Object|null} - The active warehouse object or null if not set
 * 
 * @example
 * const activeWarehouse = useActiveWarehouse();
 * // activeWarehouse will be the warehouse object (e.g., { name: "...", warehouse_name: "...", ... })
 * // or null if not set
 */
export const useActiveWarehouse = () => {
  const activeWarehouse = useAppSelector((state) => state.warehouse.activeWarehouse);
  return activeWarehouse;
};
