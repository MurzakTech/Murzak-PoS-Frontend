import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchInventoryValueByCategory,
  fetchCostMethodComparison,
  fetchInventoryValueTrends,
  fetchInventoryTurnover,
  fetchDaysOnHand,
  fetchMovementPatterns,
  fetchStockAging,
  fetchObsolescenceRisk,
  fetchAgingRecommendations,
  fetchInventoryAccuracy,
  fetchInventoryVariance,
  fetchAdjustmentTrends,
  fetchTransferEfficiency,
  clearInventoryValuation,
  clearStockMovement,
  clearAgingStock,
  clearPerformanceMetrics,
} from '../store/reportsSlice';

/**
 * Specialized hook for Inventory reports
 * @param {string} company - Company name (optional, can be passed in params)
 */
export const useInventoryReports = (company = null) => {
  const dispatch = useAppDispatch();
  const { inventoryValuation, stockMovement, agingStock, performanceMetrics } = useAppSelector(
    (state) => state.reports
  );

  // Inventory Valuation
  const getValueByCategory = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for inventory value by category report');
        return;
      }
      return dispatch(fetchInventoryValueByCategory(requestParams));
    },
    [dispatch, company]
  );

  const getCostMethodComparison = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for cost method comparison report');
        return;
      }
      return dispatch(fetchCostMethodComparison(requestParams));
    },
    [dispatch, company]
  );

  const getValueTrends = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for inventory value trends report');
        return;
      }
      return dispatch(fetchInventoryValueTrends(requestParams));
    },
    [dispatch, company]
  );

  // Stock Movement
  const getTurnoverReport = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for inventory turnover report');
        return;
      }
      return dispatch(fetchInventoryTurnover(requestParams));
    },
    [dispatch, company]
  );

  const getDaysOnHand = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for days on hand report');
        return;
      }
      return dispatch(fetchDaysOnHand(requestParams));
    },
    [dispatch, company]
  );

  const getMovementPatterns = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for movement patterns report');
        return;
      }
      return dispatch(fetchMovementPatterns(requestParams));
    },
    [dispatch, company]
  );

  // Aging Stock
  const getStockAging = useCallback(
    (params = {}) => {
      return dispatch(fetchStockAging(params));
    },
    [dispatch]
  );

  const getObsolescenceRisk = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for obsolescence risk report');
        return;
      }
      return dispatch(fetchObsolescenceRisk(requestParams));
    },
    [dispatch, company]
  );

  const getAgingRecommendations = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for aging recommendations report');
        return;
      }
      return dispatch(fetchAgingRecommendations(requestParams));
    },
    [dispatch, company]
  );

  // Performance Metrics
  const getInventoryAccuracy = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for inventory accuracy report');
        return;
      }
      return dispatch(fetchInventoryAccuracy(requestParams));
    },
    [dispatch, company]
  );

  const getInventoryVariance = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for inventory variance report');
        return;
      }
      return dispatch(fetchInventoryVariance(requestParams));
    },
    [dispatch, company]
  );

  const getAdjustmentTrends = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for adjustment trends report');
        return;
      }
      return dispatch(fetchAdjustmentTrends(requestParams));
    },
    [dispatch, company]
  );

  const getTransferEfficiency = useCallback(
    (params) => {
      const requestParams = company ? { company, ...params } : params;
      if (!requestParams.company) {
        console.warn('Company is required for transfer efficiency report');
        return;
      }
      return dispatch(fetchTransferEfficiency(requestParams));
    },
    [dispatch, company]
  );

  // Clear actions
  const clearValuation = useCallback(() => {
    dispatch(clearInventoryValuation());
  }, [dispatch]);

  const clearMovement = useCallback(() => {
    dispatch(clearStockMovement());
  }, [dispatch]);

  const clearAging = useCallback(() => {
    dispatch(clearAgingStock());
  }, [dispatch]);

  const clearMetrics = useCallback(() => {
    dispatch(clearPerformanceMetrics());
  }, [dispatch]);

  return {
    // Inventory Valuation State
    valueByCategory: inventoryValuation.valueByCategory,
    costMethodComparison: inventoryValuation.costMethodComparison,
    valueTrends: inventoryValuation.valueTrends,

    // Stock Movement State
    turnover: stockMovement.turnover,
    daysOnHand: stockMovement.daysOnHand,
    movementPatterns: stockMovement.movementPatterns,

    // Aging Stock State
    stockAging: agingStock.stockAging,
    obsolescenceRisk: agingStock.obsolescenceRisk,
    recommendations: agingStock.recommendations,

    // Performance Metrics State
    accuracy: performanceMetrics.accuracy,
    variance: performanceMetrics.variance,
    adjustmentTrends: performanceMetrics.adjustmentTrends,
    transferEfficiency: performanceMetrics.transferEfficiency,

    // Inventory Valuation Actions
    getValueByCategory,
    getCostMethodComparison,
    getValueTrends,

    // Stock Movement Actions
    getTurnoverReport,
    getDaysOnHand,
    getMovementPatterns,

    // Aging Stock Actions
    getStockAging,
    getObsolescenceRisk,
    getAgingRecommendations,

    // Performance Metrics Actions
    getInventoryAccuracy,
    getInventoryVariance,
    getAdjustmentTrends,
    getTransferEfficiency,

    // Clear Actions
    clearValuation,
    clearMovement,
    clearAging,
    clearMetrics,
  };
};

