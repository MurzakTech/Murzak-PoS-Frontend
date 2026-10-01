import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createMultiLevelReconciliation,
  addSalesPersonStockTake,
  addStockControllerStockTake,
  addStockManagerStockTake as addStockManagerStockTakeAction,
  getMultiLevelReconciliation,
  listMultiLevelReconciliations,
  clearMultiLevelReconciliation,
  clearError,
} from '../store/inventorySlice';

/**
 * Custom hook for multi-level stock reconciliation operations
 * Provides functions to create, manage, and view stock reconciliations
 * 
 * @returns {Object} Reconciliation operations and state
 * @returns {Function} createReconciliation - Create a new multi-level reconciliation
 * @returns {Function} addSalesUserStockTake - Add stock take from Sales User
 * @returns {Function} addQualityManagerStockTake - Add stock take from Quality Manager
 * @returns {Function} addStockManagerStockTake - Add stock take from Stock Manager
 * @returns {Function} getReconciliation - Fetch reconciliation details
 * @returns {Function} clearReconciliation - Clear selected reconciliation
 * @returns {Function} clearError - Clear error state
 * @returns {Object|null} reconciliation - Current reconciliation data
 * @returns {boolean} loading - Loading state for fetching
 * @returns {boolean} isLoadingAction - Loading state for mutations
 * @returns {string|null} error - Error message
 * 
 * @example
 * const { createReconciliation, reconciliation, loading, error } = useStockReconciliation();
 * 
 * const handleCreate = async () => {
 *   try {
 *     const result = await createReconciliation({
 *       warehouse: 'Stores - HO',
 *       posting_date: '2025-01-20',
 *       purpose: 'Stock Reconciliation',
 *     });
 *     console.log('Reconciliation created:', result);
 *   } catch (err) {
 *     console.error('Error:', err);
 *   }
 * };
 */
export const useStockReconciliation = () => {
  const dispatch = useAppDispatch();
  const {
    multiLevelReconciliation,
    isLoadingMultiLevelReconciliation,
    isLoadingMultiLevelReconciliationAction,
    error,
  } = useAppSelector((state) => state.inventory);

  /**
   * Create a new multi-level stock reconciliation
   * @param {Object} reconciliationData - Reconciliation data
   * @param {string} reconciliationData.warehouse - Warehouse name (required)
   * @param {string} [reconciliationData.posting_date] - Posting date (YYYY-MM-DD)
   * @param {string} [reconciliationData.posting_time] - Posting time (HH:MM:SS)
   * @param {string} [reconciliationData.company] - Company name (auto-filled from user)
   * @param {string} [reconciliationData.expense_account] - Expense account
   * @param {string} [reconciliationData.cost_center] - Cost center
   * @param {string} [reconciliationData.purpose] - Purpose: 'Stock Reconciliation' or 'Opening Stock'
   * @param {Array} [reconciliationData.items] - Initial items [{ item_code: string }]
   * @returns {Promise} Promise that resolves with reconciliation result
   */
  const createReconciliation = useCallback(
    async (reconciliationData) => {
      return dispatch(createMultiLevelReconciliation(reconciliationData));
    },
    [dispatch]
  );

  /**
   * Add stock take from Sales User
   * @param {Object} stockTakeData - Stock take data
   * @param {string} stockTakeData.reconciliation_name - Reconciliation name (required)
   * @param {Array} stockTakeData.items - Array of items [{ item_code: string, qty: number, comment?: string }]
   * @param {string} [stockTakeData.comment] - General comment
   * @returns {Promise} Promise that resolves with stock take result
   */
  const addSalesUserStockTake = useCallback(
    async (stockTakeData) => {
      const result = await dispatch(addSalesPersonStockTake(stockTakeData));
      // Auto-refresh reconciliation after adding stock take
      if (result.type === 'inventory/addSalesPersonStockTake/fulfilled') {
        await dispatch(getMultiLevelReconciliation({ 
          reconciliation_name: stockTakeData.reconciliation_name 
        }));
      }
      return result;
    },
    [dispatch]
  );

  /**
   * Add stock take from Quality Manager (Stock Controller)
   * @param {Object} stockTakeData - Stock take data
   * @param {string} stockTakeData.reconciliation_name - Reconciliation name (required)
   * @param {Array} stockTakeData.items - Array of items [{ item_code: string, qty: number, comment?: string }]
   * @param {string} [stockTakeData.comment] - General comment
   * @returns {Promise} Promise that resolves with stock take result
   */
  const addQualityManagerStockTake = useCallback(
    async (stockTakeData) => {
      const result = await dispatch(addStockControllerStockTake(stockTakeData));
      // Auto-refresh reconciliation after adding stock take
      if (result.type === 'inventory/addStockControllerStockTake/fulfilled') {
        await dispatch(getMultiLevelReconciliation({ 
          reconciliation_name: stockTakeData.reconciliation_name 
        }));
      }
      return result;
    },
    [dispatch]
  );

  /**
   * Add stock take from Stock Manager and optionally submit
   * @param {Object} stockTakeData - Stock take data
   * @param {string} stockTakeData.reconciliation_name - Reconciliation name (required)
   * @param {Array} stockTakeData.items - Array of items [{ item_code: string, qty: number, comment?: string }]
   * @param {string} [stockTakeData.comment] - General comment
   * @param {boolean} [stockTakeData.submit] - Whether to submit reconciliation after adding stock take
   * @returns {Promise} Promise that resolves with stock take result
   */
  const addStockManagerStockTake = useCallback(
    async (stockTakeData) => {
      const result = await dispatch(addStockManagerStockTakeAction(stockTakeData));
      // Auto-refresh reconciliation after adding stock take
      if (result.type === 'inventory/addStockManagerStockTake/fulfilled') {
        await dispatch(getMultiLevelReconciliation({ 
          reconciliation_name: stockTakeData.reconciliation_name 
        }));
      }
      return result;
    },
    [dispatch]
  );

  /**
   * Get reconciliation details with all stock taking records
   * @param {string} reconciliationName - Reconciliation name
   * @returns {Promise} Promise that resolves with reconciliation data
   */
  const getReconciliation = useCallback(
    async (reconciliationName) => {
      return dispatch(getMultiLevelReconciliation({ 
        reconciliation_name: reconciliationName 
      }));
    },
    [dispatch]
  );

  /**
   * Clear selected reconciliation
   */
  const clearReconciliation = useCallback(() => {
    dispatch(clearMultiLevelReconciliation());
  }, [dispatch]);

  /**
   * Clear error state
   */
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Refetch current reconciliation
   */
  const refetchReconciliation = useCallback(() => {
    if (multiLevelReconciliation?.name) {
      return dispatch(getMultiLevelReconciliation({ 
        reconciliation_name: multiLevelReconciliation.name 
      }));
    }
  }, [dispatch, multiLevelReconciliation]);

  /**
   * List multi-level reconciliations with filters
   */
  const listReconciliations = useCallback(
    async (filters = {}) => {
      return dispatch(listMultiLevelReconciliations(filters));
    },
    [dispatch]
  );

  return {
    // State
    reconciliation: multiLevelReconciliation,
    loading: isLoadingMultiLevelReconciliation,
    isLoadingAction: isLoadingMultiLevelReconciliationAction,
    error,

    // Actions
    createReconciliation,
    addSalesUserStockTake,
    addQualityManagerStockTake,
    addStockManagerStockTake,
    getReconciliation,
    listReconciliations,
    clearReconciliation,
    clearError: handleClearError,
    refetchReconciliation,
  };
};

export default useStockReconciliation;

