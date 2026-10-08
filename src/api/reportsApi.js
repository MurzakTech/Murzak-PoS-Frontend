import axiosInstance from './axiosInstance';
import { friendlyErrorMessage } from '../utils/friendlyError';

const REPORTS_API_BASE = 'techsavanna_pos.api.reports';

// Helper to build endpoint URL
// Note: The baseURL in axiosInstance already includes /api/method/, so we just return the endpoint string
const buildEndpoint = (endpoint) => 
  `${REPORTS_API_BASE}.${endpoint}`;

// Helper to extract response data
const extractResponseData = (response) => {
  // New API structure: { success: true, message: "...", data: {...} }
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  // Legacy nested structure: { message: { success: true, data: {...} } }
  if (response.data?.message?.success && response.data?.message?.data) {
    return response.data.message.data;
  }
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// ============================================================================
// SALES ANALYTICS REPORTS
// ============================================================================

/**
 * Fetch Sales Analytics Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, optional)
 * @param {string} params.end_date - End date (YYYY-MM-DD, optional)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.item_group - Item group filter (optional)
 * @param {string} params.customer - Customer filter (optional)
 * @param {string} params.group_by - Group by: date, item_group, or customer (optional, default: date)
 * @returns {Promise<Object>} Report data
 */
export const fetchSalesAnalyticsReport = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('sales_analytics_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Export Sales Analytics Report
 * @param {Object} params - Report parameters (same as fetchSalesAnalyticsReport)
 * @param {string} params.format - Export format: csv, excel, or pdf (default: csv)
 * @returns {Promise<Blob>} File blob for download
 */
export const exportSalesAnalyticsReport = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('export_sales_analytics_report'),
      params,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// INVENTORY VALUATION REPORTS
// ============================================================================

/**
 * Fetch Inventory Value by Category Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.item_group - Item group filter (optional)
 * @returns {Promise<Array>} Report data array
 */
export const fetchInventoryValueByCategory = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_value_by_category_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Cost Method Comparison Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {Array<string>} params.cost_methods - Array of cost methods: ["FIFO", "LIFO", "Weighted Average"] (optional)
 * @returns {Promise<Object>} Comparison data
 */
export const fetchCostMethodComparison = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_cost_method_comparison_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Value Trends Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, required)
 * @param {string} params.end_date - End date (YYYY-MM-DD, required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.period - Period grouping: daily, weekly, or monthly (optional, default: daily)
 * @returns {Promise<Array>} Trends data array
 */
export const fetchInventoryValueTrends = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_value_trends_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// STOCK MOVEMENT ANALYSIS REPORTS
// ============================================================================

/**
 * Fetch Inventory Turnover Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, required)
 * @param {string} params.end_date - End date (YYYY-MM-DD, required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.item_group - Item group filter (optional)
 * @returns {Promise<Array>} Turnover data array
 */
export const fetchInventoryTurnover = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_turnover_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Days on Hand Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.item_group - Item group filter (optional)
 * @param {number} params.period_days - Days to calculate average consumption (optional, default: 30)
 * @returns {Promise<Array>} Days on hand data array
 */
export const fetchDaysOnHand = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_days_on_hand_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Movement Patterns Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, required)
 * @param {string} params.end_date - End date (YYYY-MM-DD, required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.analysis_type - Analysis type: seasonal, trend, or forecast (optional, default: trend)
 * @returns {Promise<Object>} Movement patterns data
 */
export const fetchMovementPatterns = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_movement_patterns_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// AGING STOCK REPORTS
// ============================================================================

/**
 * Fetch Stock Aging Report (Enhanced)
 * @param {Object} params - Report parameters
 * @param {number} params.slow_moving_threshold - Threshold for slow moving items (optional)
 * @returns {Promise<Object>} Stock aging data by brackets
 */
export const fetchStockAging = async (params = {}) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('stock_aging_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Obsolescence Risk Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.risk_level - Filter by risk level: low, medium, or high (optional, default: all)
 * @returns {Promise<Array>} Obsolescence risk data array
 */
export const fetchObsolescenceRisk = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_obsolescence_risk_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Aging Recommendations Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @returns {Promise<Array>} Aging recommendations data array
 */
export const fetchAgingRecommendations = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_aging_recommendations_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// PERFORMANCE METRICS REPORTS
// ============================================================================

/**
 * Fetch Inventory Accuracy Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date for stock counts (YYYY-MM-DD, optional)
 * @param {string} params.end_date - End date for stock counts (YYYY-MM-DD, optional)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @returns {Promise<Object>} Accuracy metrics data
 */
export const fetchInventoryAccuracy = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_accuracy_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Variance Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date for stock counts (YYYY-MM-DD, optional)
 * @param {string} params.end_date - End date for stock counts (YYYY-MM-DD, optional)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {number} params.variance_threshold - Minimum variance value to include (optional)
 * @returns {Promise<Array>} Variance data array
 */
export const fetchInventoryVariance = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_variance_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Adjustment Trends Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, required)
 * @param {string} params.end_date - End date (YYYY-MM-DD, required)
 * @param {string} params.warehouse - Warehouse filter (optional)
 * @param {string} params.adjustment_type - Filter by: increase, decrease, or all (optional, default: all)
 * @returns {Promise<Array>} Adjustment trends data array
 */
export const fetchAdjustmentTrends = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_adjustment_trends_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch Inventory Transfer Efficiency Report
 * @param {Object} params - Report parameters
 * @param {string} params.company - Company name (required)
 * @param {string} params.start_date - Start date (YYYY-MM-DD, required)
 * @param {string} params.end_date - End date (YYYY-MM-DD, required)
 * @param {string} params.from_warehouse - Source warehouse filter (optional)
 * @param {string} params.to_warehouse - Destination warehouse filter (optional)
 * @returns {Promise<Object>} Transfer efficiency metrics data
 */
export const fetchTransferEfficiency = async (params) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_transfer_efficiency_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// INVENTORY SUMMARY REPORT
// ============================================================================

/**
 * Fetch Inventory Summary Report
 * @param {Object} params - Report parameters (optional, endpoint accepts no parameters)
 * @returns {Promise<Array>} Report data array with { warehouse, total_qty, total_value }
 */
export const fetchInventorySummary = async (params = {}) => {
  try {
    const response = await axiosInstance.post(
      buildEndpoint('inventory_summary_report'),
      params
    );
    return extractResponseData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ============================================================================
// GRN (GOODS RECEIPT NOTE) REPORTS
// ============================================================================

/**
 * Fetch GRN List Report
 * @param {Object} params - Query parameters
 * @param {string} params.company - Company name (optional, defaults to user's default)
 * @param {string} params.supplier - Supplier name filter (optional)
 * @param {string} params.purchase_order - Purchase Order number filter (optional)
 * @param {string} params.warehouse - Warehouse name filter (optional)
 * @param {string} params.start_date - Start date filter (YYYY-MM-DD, optional)
 * @param {string} params.end_date - End date filter (YYYY-MM-DD, optional)
 * @param {string} params.status - GRN status filter (optional, e.g., "Received", "To Bill", "Completed")
 * @param {number} params.docstatus - Document status (optional, 0=Draft, 1=Submitted, 2=Cancelled)
 * @param {number} params.page - Page number for pagination (optional, default: 1)
 * @param {number} params.page_size - Number of records per page (optional, default: 20, max: 100)
 * @returns {Promise<Object>} Response object with { success: boolean, data: GRN[], meta: PaginationMeta }
 */
export const fetchGRNList = async (params = {}) => {
  try {
    // Validate page_size doesn't exceed maximum
    if (params.page_size && params.page_size > 100) {
      throw new Error('Page size cannot exceed 100');
    }

    // Validate date format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (params.start_date && !dateRegex.test(params.start_date)) {
      throw new Error('Invalid start_date format. Expected YYYY-MM-DD');
    }
    if (params.end_date && !dateRegex.test(params.end_date)) {
      throw new Error('Invalid end_date format. Expected YYYY-MM-DD');
    }

    const response = await axiosInstance.get(
      buildEndpoint('grn_list_report'),
      { params }
    );

    // Extract response data - handle both direct response and nested structures
    const data = extractResponseData(response);
    
    // If the response already has success/data/meta structure, return as is
    if (data?.success !== undefined) {
      return data;
    }
    
    // Otherwise, wrap in standard structure for consistency
    return {
      success: true,
      data: Array.isArray(data) ? data : (data?.data || []),
      meta: data?.meta || {
        page: params.page || 1,
        page_size: params.page_size || 20,
        total: Array.isArray(data) ? data.length : (data?.total || 0),
        total_pages: Math.ceil(
          (Array.isArray(data) ? data.length : (data?.total || 0)) / (params.page_size || 20)
        ),
      },
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Fetch GRN Detail Report
 * @param {Object} params - Query parameters
 * @param {string} params.grn_no - GRN number (Purchase Receipt name) (required)
 * @returns {Promise<Object>} Response object with { success: boolean, data: GRNDetail }
 */
export const fetchGRNDetails = async (params) => {
  try {
    // Validate required parameter
    if (!params || !params.grn_no) {
      throw new Error('GRN number (grn_no) is required');
    }

    const response = await axiosInstance.get(
      buildEndpoint('grn_detail_report'),
      { params: { grn_no: params.grn_no } }
    );

    // Extract response data
    const data = extractResponseData(response);
    
    // If the response already has success/data structure, return as is
    if (data?.success !== undefined) {
      return data;
    }
    
    // Otherwise, wrap in standard structure for consistency
    return {
      success: true,
      data: data || {},
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

