import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSalesAnalytics,
  exportSalesAnalytics,
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
  clearSalesAnalytics,
  clearInventoryValuation,
  clearStockMovement,
  clearAgingStock,
  clearPerformanceMetrics,
  clearAllReports,
} from '../store/reportsSlice';

/**
 * Main hook for reports management
 * Provides access to all report data and actions
 */
export const useReports = () => {
  const dispatch = useAppDispatch();
  const reportsState = useAppSelector((state) => state.reports);

  const clearAll = useCallback(() => {
    dispatch(clearAllReports());
  }, [dispatch]);

  return {
    // State
    salesAnalytics: reportsState.salesAnalytics,
    inventoryValuation: reportsState.inventoryValuation,
    stockMovement: reportsState.stockMovement,
    agingStock: reportsState.agingStock,
    performanceMetrics: reportsState.performanceMetrics,
    exportStatus: reportsState.exportStatus,

    // Actions
    fetchSalesAnalytics: (params) => dispatch(fetchSalesAnalytics(params)),
    exportSalesAnalytics: (params) => dispatch(exportSalesAnalytics(params)),
    fetchInventoryValueByCategory: (params) => dispatch(fetchInventoryValueByCategory(params)),
    fetchCostMethodComparison: (params) => dispatch(fetchCostMethodComparison(params)),
    fetchInventoryValueTrends: (params) => dispatch(fetchInventoryValueTrends(params)),
    fetchInventoryTurnover: (params) => dispatch(fetchInventoryTurnover(params)),
    fetchDaysOnHand: (params) => dispatch(fetchDaysOnHand(params)),
    fetchMovementPatterns: (params) => dispatch(fetchMovementPatterns(params)),
    fetchStockAging: (params) => dispatch(fetchStockAging(params)),
    fetchObsolescenceRisk: (params) => dispatch(fetchObsolescenceRisk(params)),
    fetchAgingRecommendations: (params) => dispatch(fetchAgingRecommendations(params)),
    fetchInventoryAccuracy: (params) => dispatch(fetchInventoryAccuracy(params)),
    fetchInventoryVariance: (params) => dispatch(fetchInventoryVariance(params)),
    fetchAdjustmentTrends: (params) => dispatch(fetchAdjustmentTrends(params)),
    fetchTransferEfficiency: (params) => dispatch(fetchTransferEfficiency(params)),

    // Clear actions
    clearSalesAnalytics: () => dispatch(clearSalesAnalytics()),
    clearInventoryValuation: () => dispatch(clearInventoryValuation()),
    clearStockMovement: () => dispatch(clearStockMovement()),
    clearAgingStock: () => dispatch(clearAgingStock()),
    clearPerformanceMetrics: () => dispatch(clearPerformanceMetrics()),
    clearAll,
  };
};

