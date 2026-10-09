import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as reportsApi from '../api/reportsApi';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// ============================================================================
// SALES ANALYTICS REPORTS
// ============================================================================

export const fetchSalesAnalytics = createAsyncThunk(
  'reports/fetchSalesAnalytics',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchSalesAnalyticsReport(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch sales analytics',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const exportSalesAnalytics = createAsyncThunk(
  'reports/exportSalesAnalytics',
  async ({ format = 'csv', ...params }, { dispatch, rejectWithValue }) => {
    try {
      const blob = await reportsApi.exportSalesAnalyticsReport({ ...params, format });
      return { blob, format, filename: `sales_analytics_${new Date().toISOString().split('T')[0]}.${format}` };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to export sales analytics',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// INVENTORY VALUATION REPORTS
// ============================================================================

export const fetchInventoryValueByCategory = createAsyncThunk(
  'reports/fetchInventoryValueByCategory',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventoryValueByCategory(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory value by category',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchCostMethodComparison = createAsyncThunk(
  'reports/fetchCostMethodComparison',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchCostMethodComparison(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch cost method comparison',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchInventoryValueTrends = createAsyncThunk(
  'reports/fetchInventoryValueTrends',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventoryValueTrends(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory value trends',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// STOCK MOVEMENT ANALYSIS REPORTS
// ============================================================================

export const fetchInventoryTurnover = createAsyncThunk(
  'reports/fetchInventoryTurnover',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventoryTurnover(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory turnover',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchDaysOnHand = createAsyncThunk(
  'reports/fetchDaysOnHand',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchDaysOnHand(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch days on hand',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMovementPatterns = createAsyncThunk(
  'reports/fetchMovementPatterns',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchMovementPatterns(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch movement patterns',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// AGING STOCK REPORTS
// ============================================================================

export const fetchStockAging = createAsyncThunk(
  'reports/fetchStockAging',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchStockAging(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch stock aging',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchObsolescenceRisk = createAsyncThunk(
  'reports/fetchObsolescenceRisk',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchObsolescenceRisk(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch obsolescence risk',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAgingRecommendations = createAsyncThunk(
  'reports/fetchAgingRecommendations',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchAgingRecommendations(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch aging recommendations',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// PERFORMANCE METRICS REPORTS
// ============================================================================

export const fetchInventoryAccuracy = createAsyncThunk(
  'reports/fetchInventoryAccuracy',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventoryAccuracy(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory accuracy',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchInventoryVariance = createAsyncThunk(
  'reports/fetchInventoryVariance',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventoryVariance(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory variance',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAdjustmentTrends = createAsyncThunk(
  'reports/fetchAdjustmentTrends',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchAdjustmentTrends(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch adjustment trends',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchTransferEfficiency = createAsyncThunk(
  'reports/fetchTransferEfficiency',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchTransferEfficiency(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch transfer efficiency',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// INVENTORY SUMMARY REPORT
// ============================================================================

export const fetchInventorySummary = createAsyncThunk(
  'reports/fetchInventorySummary',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const data = await reportsApi.fetchInventorySummary(params);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch inventory summary',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Sales Analytics
  salesAnalytics: {
    data: null,
    loading: false,
    error: null,
    filters: {
      company: null,
      start_date: null,
      end_date: null,
      warehouse: null,
      item_group: null,
      customer: null,
      group_by: 'date',
    },
  },
  exportStatus: {
    loading: false,
    error: null,
  },
  
  // Inventory Valuation
  inventoryValuation: {
    valueByCategory: {
      data: null,
      loading: false,
      error: null,
    },
    costMethodComparison: {
      data: null,
      loading: false,
      error: null,
    },
    valueTrends: {
      data: null,
      loading: false,
      error: null,
    },
  },
  
  // Stock Movement
  stockMovement: {
    turnover: {
      data: null,
      loading: false,
      error: null,
    },
    daysOnHand: {
      data: null,
      loading: false,
      error: null,
    },
    movementPatterns: {
      data: null,
      loading: false,
      error: null,
    },
  },
  
  // Aging Stock
  agingStock: {
    stockAging: {
      data: null,
      loading: false,
      error: null,
    },
    obsolescenceRisk: {
      data: null,
      loading: false,
      error: null,
    },
    recommendations: {
      data: null,
      loading: false,
      error: null,
    },
  },
  
  // Performance Metrics
  performanceMetrics: {
    accuracy: {
      data: null,
      loading: false,
      error: null,
    },
    variance: {
      data: null,
      loading: false,
      error: null,
    },
    adjustmentTrends: {
      data: null,
      loading: false,
      error: null,
    },
    transferEfficiency: {
      data: null,
      loading: false,
      error: null,
    },
  },
  
  // Inventory Summary
  inventorySummary: {
    data: null,
    loading: false,
    error: null,
  },
};

// ============================================================================
// SLICE
// ============================================================================

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearSalesAnalytics: (state) => {
      state.salesAnalytics.data = null;
      state.salesAnalytics.error = null;
    },
    setSalesAnalyticsFilters: (state, action) => {
      state.salesAnalytics.filters = { ...state.salesAnalytics.filters, ...action.payload };
    },
    clearInventoryValuation: (state) => {
      state.inventoryValuation.valueByCategory.data = null;
      state.inventoryValuation.valueByCategory.error = null;
      state.inventoryValuation.costMethodComparison.data = null;
      state.inventoryValuation.costMethodComparison.error = null;
      state.inventoryValuation.valueTrends.data = null;
      state.inventoryValuation.valueTrends.error = null;
    },
    clearStockMovement: (state) => {
      state.stockMovement.turnover.data = null;
      state.stockMovement.turnover.error = null;
      state.stockMovement.daysOnHand.data = null;
      state.stockMovement.daysOnHand.error = null;
      state.stockMovement.movementPatterns.data = null;
      state.stockMovement.movementPatterns.error = null;
    },
    clearAgingStock: (state) => {
      state.agingStock.stockAging.data = null;
      state.agingStock.stockAging.error = null;
      state.agingStock.obsolescenceRisk.data = null;
      state.agingStock.obsolescenceRisk.error = null;
      state.agingStock.recommendations.data = null;
      state.agingStock.recommendations.error = null;
    },
    clearPerformanceMetrics: (state) => {
      state.performanceMetrics.accuracy.data = null;
      state.performanceMetrics.accuracy.error = null;
      state.performanceMetrics.variance.data = null;
      state.performanceMetrics.variance.error = null;
      state.performanceMetrics.adjustmentTrends.data = null;
      state.performanceMetrics.adjustmentTrends.error = null;
      state.performanceMetrics.transferEfficiency.data = null;
      state.performanceMetrics.transferEfficiency.error = null;
    },
    clearInventorySummary: (state) => {
      state.inventorySummary.data = null;
      state.inventorySummary.error = null;
    },
    clearAllReports: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sales Analytics
      .addCase(fetchSalesAnalytics.pending, (state) => {
        state.salesAnalytics.loading = true;
        state.salesAnalytics.error = null;
      })
      .addCase(fetchSalesAnalytics.fulfilled, (state, action) => {
        state.salesAnalytics.loading = false;
        state.salesAnalytics.data = action.payload;
      })
      .addCase(fetchSalesAnalytics.rejected, (state, action) => {
        state.salesAnalytics.loading = false;
        state.salesAnalytics.error = action.payload;
      })
      .addCase(exportSalesAnalytics.pending, (state) => {
        state.exportStatus.loading = true;
        state.exportStatus.error = null;
      })
      .addCase(exportSalesAnalytics.fulfilled, (state, action) => {
        state.exportStatus.loading = false;
        // Trigger file download
        const { blob, filename } = action.payload;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .addCase(exportSalesAnalytics.rejected, (state, action) => {
        state.exportStatus.loading = false;
        state.exportStatus.error = action.payload;
      })
      
      // Inventory Valuation
      .addCase(fetchInventoryValueByCategory.pending, (state) => {
        state.inventoryValuation.valueByCategory.loading = true;
        state.inventoryValuation.valueByCategory.error = null;
      })
      .addCase(fetchInventoryValueByCategory.fulfilled, (state, action) => {
        state.inventoryValuation.valueByCategory.loading = false;
        state.inventoryValuation.valueByCategory.data = action.payload;
      })
      .addCase(fetchInventoryValueByCategory.rejected, (state, action) => {
        state.inventoryValuation.valueByCategory.loading = false;
        state.inventoryValuation.valueByCategory.error = action.payload;
      })
      .addCase(fetchCostMethodComparison.pending, (state) => {
        state.inventoryValuation.costMethodComparison.loading = true;
        state.inventoryValuation.costMethodComparison.error = null;
      })
      .addCase(fetchCostMethodComparison.fulfilled, (state, action) => {
        state.inventoryValuation.costMethodComparison.loading = false;
        state.inventoryValuation.costMethodComparison.data = action.payload;
      })
      .addCase(fetchCostMethodComparison.rejected, (state, action) => {
        state.inventoryValuation.costMethodComparison.loading = false;
        state.inventoryValuation.costMethodComparison.error = action.payload;
      })
      .addCase(fetchInventoryValueTrends.pending, (state) => {
        state.inventoryValuation.valueTrends.loading = true;
        state.inventoryValuation.valueTrends.error = null;
      })
      .addCase(fetchInventoryValueTrends.fulfilled, (state, action) => {
        state.inventoryValuation.valueTrends.loading = false;
        state.inventoryValuation.valueTrends.data = action.payload;
      })
      .addCase(fetchInventoryValueTrends.rejected, (state, action) => {
        state.inventoryValuation.valueTrends.loading = false;
        state.inventoryValuation.valueTrends.error = action.payload;
      })
      
      // Stock Movement
      .addCase(fetchInventoryTurnover.pending, (state) => {
        state.stockMovement.turnover.loading = true;
        state.stockMovement.turnover.error = null;
      })
      .addCase(fetchInventoryTurnover.fulfilled, (state, action) => {
        state.stockMovement.turnover.loading = false;
        state.stockMovement.turnover.data = action.payload;
      })
      .addCase(fetchInventoryTurnover.rejected, (state, action) => {
        state.stockMovement.turnover.loading = false;
        state.stockMovement.turnover.error = action.payload;
      })
      .addCase(fetchDaysOnHand.pending, (state) => {
        state.stockMovement.daysOnHand.loading = true;
        state.stockMovement.daysOnHand.error = null;
      })
      .addCase(fetchDaysOnHand.fulfilled, (state, action) => {
        state.stockMovement.daysOnHand.loading = false;
        state.stockMovement.daysOnHand.data = action.payload;
      })
      .addCase(fetchDaysOnHand.rejected, (state, action) => {
        state.stockMovement.daysOnHand.loading = false;
        state.stockMovement.daysOnHand.error = action.payload;
      })
      .addCase(fetchMovementPatterns.pending, (state) => {
        state.stockMovement.movementPatterns.loading = true;
        state.stockMovement.movementPatterns.error = null;
      })
      .addCase(fetchMovementPatterns.fulfilled, (state, action) => {
        state.stockMovement.movementPatterns.loading = false;
        state.stockMovement.movementPatterns.data = action.payload;
      })
      .addCase(fetchMovementPatterns.rejected, (state, action) => {
        state.stockMovement.movementPatterns.loading = false;
        state.stockMovement.movementPatterns.error = action.payload;
      })
      
      // Aging Stock
      .addCase(fetchStockAging.pending, (state) => {
        state.agingStock.stockAging.loading = true;
        state.agingStock.stockAging.error = null;
      })
      .addCase(fetchStockAging.fulfilled, (state, action) => {
        state.agingStock.stockAging.loading = false;
        state.agingStock.stockAging.data = action.payload;
      })
      .addCase(fetchStockAging.rejected, (state, action) => {
        state.agingStock.stockAging.loading = false;
        state.agingStock.stockAging.error = action.payload;
      })
      .addCase(fetchObsolescenceRisk.pending, (state) => {
        state.agingStock.obsolescenceRisk.loading = true;
        state.agingStock.obsolescenceRisk.error = null;
      })
      .addCase(fetchObsolescenceRisk.fulfilled, (state, action) => {
        state.agingStock.obsolescenceRisk.loading = false;
        state.agingStock.obsolescenceRisk.data = action.payload;
      })
      .addCase(fetchObsolescenceRisk.rejected, (state, action) => {
        state.agingStock.obsolescenceRisk.loading = false;
        state.agingStock.obsolescenceRisk.error = action.payload;
      })
      .addCase(fetchAgingRecommendations.pending, (state) => {
        state.agingStock.recommendations.loading = true;
        state.agingStock.recommendations.error = null;
      })
      .addCase(fetchAgingRecommendations.fulfilled, (state, action) => {
        state.agingStock.recommendations.loading = false;
        state.agingStock.recommendations.data = action.payload;
      })
      .addCase(fetchAgingRecommendations.rejected, (state, action) => {
        state.agingStock.recommendations.loading = false;
        state.agingStock.recommendations.error = action.payload;
      })
      
      // Performance Metrics
      .addCase(fetchInventoryAccuracy.pending, (state) => {
        state.performanceMetrics.accuracy.loading = true;
        state.performanceMetrics.accuracy.error = null;
      })
      .addCase(fetchInventoryAccuracy.fulfilled, (state, action) => {
        state.performanceMetrics.accuracy.loading = false;
        state.performanceMetrics.accuracy.data = action.payload;
      })
      .addCase(fetchInventoryAccuracy.rejected, (state, action) => {
        state.performanceMetrics.accuracy.loading = false;
        state.performanceMetrics.accuracy.error = action.payload;
      })
      .addCase(fetchInventoryVariance.pending, (state) => {
        state.performanceMetrics.variance.loading = true;
        state.performanceMetrics.variance.error = null;
      })
      .addCase(fetchInventoryVariance.fulfilled, (state, action) => {
        state.performanceMetrics.variance.loading = false;
        state.performanceMetrics.variance.data = action.payload;
      })
      .addCase(fetchInventoryVariance.rejected, (state, action) => {
        state.performanceMetrics.variance.loading = false;
        state.performanceMetrics.variance.error = action.payload;
      })
      .addCase(fetchAdjustmentTrends.pending, (state) => {
        state.performanceMetrics.adjustmentTrends.loading = true;
        state.performanceMetrics.adjustmentTrends.error = null;
      })
      .addCase(fetchAdjustmentTrends.fulfilled, (state, action) => {
        state.performanceMetrics.adjustmentTrends.loading = false;
        state.performanceMetrics.adjustmentTrends.data = action.payload;
      })
      .addCase(fetchAdjustmentTrends.rejected, (state, action) => {
        state.performanceMetrics.adjustmentTrends.loading = false;
        state.performanceMetrics.adjustmentTrends.error = action.payload;
      })
      .addCase(fetchTransferEfficiency.pending, (state) => {
        state.performanceMetrics.transferEfficiency.loading = true;
        state.performanceMetrics.transferEfficiency.error = null;
      })
      .addCase(fetchTransferEfficiency.fulfilled, (state, action) => {
        state.performanceMetrics.transferEfficiency.loading = false;
        state.performanceMetrics.transferEfficiency.data = action.payload;
      })
      .addCase(fetchTransferEfficiency.rejected, (state, action) => {
        state.performanceMetrics.transferEfficiency.loading = false;
        state.performanceMetrics.transferEfficiency.error = action.payload;
      })
      
      // Inventory Summary
      .addCase(fetchInventorySummary.pending, (state) => {
        state.inventorySummary.loading = true;
        state.inventorySummary.error = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.inventorySummary.loading = false;
        state.inventorySummary.data = action.payload;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.inventorySummary.loading = false;
        state.inventorySummary.error = action.payload;
      });
  },
});

export const {
  clearSalesAnalytics,
  setSalesAnalyticsFilters,
  clearInventoryValuation,
  clearStockMovement,
  clearAgingStock,
  clearPerformanceMetrics,
  clearInventorySummary,
  clearAllReports,
} = reportsSlice.actions;

export default reportsSlice.reducer;

