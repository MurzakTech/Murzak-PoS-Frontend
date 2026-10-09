import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Inventory API endpoints
const ENDPOINTS = {
  getStockBalance: 'techsavanna_pos.api.inventory_api.get_stock_balance_api',
  getStockBalanceMultiple: 'techsavanna_pos.api.inventory_api.get_stock_balance_multiple',
  createStockEntry: 'techsavanna_pos.api.inventory_api.create_stock_entry',
  createMaterialReceipt: 'techsavanna_pos.api.inventory_api.create_material_receipt',
  createMaterialIssue: 'techsavanna_pos.api.inventory_api.create_material_issue',
  createMaterialTransfer: 'techsavanna_pos.api.inventory_api.create_material_transfer',
  createStockReconciliation: 'techsavanna_pos.api.inventory_api.create_stock_reconciliation',
  checkStockAvailability: 'techsavanna_pos.api.inventory_api.check_stock_availability',
  getStockLedgerEntries: 'techsavanna_pos.api.inventory_api.get_stock_ledger_entries',
  getStockSummary: 'techsavanna_pos.api.inventory_api.get_stock_summary',
  repostStock: 'techsavanna_pos.api.inventory_api.repost_stock',
  getLowStockItems: 'techsavanna_pos.api.inventory_api.get_low_stock_items',
  getInventoryItemDetails: 'techsavanna_pos.api.inventory_api.get_inventory_item_details',
  listInventoryItems: 'techsavanna_pos.api.inventory_api.list_inventory_items',
  updateInventoryItemDetails: 'techsavanna_pos.api.inventory_api.update_inventory_item_details',
  // Stock Entry List endpoints
  listStockEntries: 'techsavanna_pos.api.inventory_api.list_stock_entries',
  listMaterialReceipts: 'techsavanna_pos.api.inventory_api.list_material_receipts',
  listMaterialIssues: 'techsavanna_pos.api.inventory_api.list_material_issues',
  listMaterialTransfers: 'techsavanna_pos.api.inventory_api.list_material_transfers',
  getStockEntryDetails: 'techsavanna_pos.api.inventory_api.get_stock_entry_details',
  // Stock Entry Management endpoints
  updateStockEntry: 'techsavanna_pos.api.inventory_api.update_stock_entry',
  submitStockEntry: 'techsavanna_pos.api.inventory_api.submit_stock_entry',
  cancelStockEntry: 'techsavanna_pos.api.inventory_api.cancel_stock_entry',
  // Multi-Level Stock Reconciliation endpoints
  createMultiLevelReconciliation: 'techsavanna_pos.api.inventory_api.create_multi_level_stock_reconciliation',
  addSalesPersonStockTake: 'techsavanna_pos.api.inventory_api.add_sales_person_stock_take',
  addStockControllerStockTake: 'techsavanna_pos.api.inventory_api.add_stock_controller_stock_take',
  addStockManagerStockTake: 'techsavanna_pos.api.inventory_api.add_stock_manager_stock_take_and_submit',
  getMultiLevelReconciliation: 'techsavanna_pos.api.inventory_api.get_multi_level_stock_reconciliation',
  listMultiLevelReconciliations: 'techsavanna_pos.api.inventory_api.list_multi_level_stock_reconciliations',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // New API structure: { success: true, message: "...", data: {...} }
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  // Legacy nested structure: { message: { success: true, data: {...} } }
  if (response.data?.message?.success && response.data?.message?.data) {
    return response.data.message.data;
  }
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  if (response.data?.message && typeof response.data.message === 'object') {
    // If message is an object but doesn't have the nested structure, return it
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract error message
// Can handle both error objects (from catch blocks) and response objects (when success: false in response body)
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to extract error message from response/error data
const extractErrorMessageFromData = (errorData) => friendlyErrorMessage({ response: { data: errorData } });

// Helper function to determine notification severity based on HTTP status code
const getErrorSeverity = (error) => errorSeverity(error);

// Helper function to extract success message
const extractSuccessMessage = (response) => {
  // New API structure: { success: true, message: "...", data: {...} }
  if (response.data?.success && response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  // Legacy structure
  if (response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  if (response.data?.message?.message) {
    return response.data.message.message;
  }
  return null;
};

// Get stock balance for a single item
export const getStockBalance = createAsyncThunk(
  'inventory/getStockBalance',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.getStockBalance, requestParams);
      const data = extractResponseData(response);
      return { balance: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Get stock balance for multiple items
export const getStockBalanceMultiple = createAsyncThunk(
  'inventory/getStockBalanceMultiple',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // API expects 'items' parameter (array of item codes)
      // Map item_codes to items if provided (for backward compatibility)
      const { item_codes, ...restParams } = params;
      const requestParams = {
        ...restParams,
        // Use items if provided, otherwise map item_codes to items
        items: params.items || item_codes || [],
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };
      
      // Ensure items is always present and is an array (required by API)
      if (!requestParams.items || !Array.isArray(requestParams.items) || requestParams.items.length === 0) {
        return rejectWithValue('items parameter is required and must be a non-empty array');
      }

      const response = await axiosInstance.post(ENDPOINTS.getStockBalanceMultiple, requestParams);
      const data = extractResponseData(response);
      return {
        balances: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Check stock availability
export const checkStockAvailability = createAsyncThunk(
  'inventory/checkStockAvailability',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.checkStockAvailability, requestParams);
      const data = extractResponseData(response);
      return { availability: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Create stock entry
export const createStockEntry = createAsyncThunk(
  'inventory/createStockEntry',
  async (entryData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...entryData,
        ...(entryData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createStockEntry, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock entry created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { entry: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create stock entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create material receipt
export const createMaterialReceipt = createAsyncThunk(
  'inventory/createMaterialReceipt',
  async (receiptData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...receiptData,
        ...(receiptData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createMaterialReceipt, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Material receipt created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { receipt: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create material receipt',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create material issue
export const createMaterialIssue = createAsyncThunk(
  'inventory/createMaterialIssue',
  async (issueData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...issueData,
        ...(issueData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createMaterialIssue, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Material issue created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { issue: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create material issue',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create material transfer
export const createMaterialTransfer = createAsyncThunk(
  'inventory/createMaterialTransfer',
  async (transferData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...transferData,
        ...(transferData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createMaterialTransfer, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Material transfer created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { transfer: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create material transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create stock reconciliation
export const createStockReconciliation = createAsyncThunk(
  'inventory/createStockReconciliation',
  async (reconciliationData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...reconciliationData,
        ...(reconciliationData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createStockReconciliation, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock reconciliation created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { reconciliation: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create stock reconciliation',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get stock ledger entries
export const getStockLedgerEntries = createAsyncThunk(
  'inventory/getStockLedgerEntries',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      // Use POST if params object has many fields, otherwise GET
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.getStockLedgerEntries, requestParams)
        : await axiosInstance.get(ENDPOINTS.getStockLedgerEntries, { params: requestParams });

      const data = extractResponseData(response);
      return {
        entries: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch stock ledger entries',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get stock summary
export const getStockSummary = createAsyncThunk(
  'inventory/getStockSummary',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      // Use POST if params object has many fields, otherwise GET
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.getStockSummary, requestParams)
        : await axiosInstance.get(ENDPOINTS.getStockSummary, { params: requestParams });

      const data = extractResponseData(response);
      return {
        summary: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch stock summary',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get low stock items
export const getLowStockItems = createAsyncThunk(
  'inventory/getLowStockItems',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      // Use POST if params object has many fields, otherwise GET
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.getLowStockItems, requestParams)
        : await axiosInstance.get(ENDPOINTS.getLowStockItems, { params: requestParams });

      const data = extractResponseData(response);
      return {
        items: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
        threshold: response.data?.threshold || params.threshold || 10.0,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch low stock items',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Repost stock
export const repostStock = createAsyncThunk(
  'inventory/repostStock',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.repostStock, requestParams);
      const successMessage = extractSuccessMessage(response) || 'Stock reposted successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to repost stock',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get inventory item details
export const getInventoryItemDetails = createAsyncThunk(
  'inventory/getInventoryItemDetails',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.getInventoryItemDetails, requestParams);
      const data = extractResponseData(response);
      return { inventoryItem: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch inventory item details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List inventory items
export const listInventoryItems = createAsyncThunk(
  'inventory/listInventoryItems',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.listInventoryItems, requestParams);
      const data = extractResponseData(response);
      return {
        items: data?.items || [],
        pagination: data?.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch inventory items',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update inventory item details
export const updateInventoryItemDetails = createAsyncThunk(
  'inventory/updateInventoryItemDetails',
  async (updateData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...updateData,
        ...(updateData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.updateInventoryItemDetails, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Inventory item details updated successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return { inventoryItem: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update inventory item details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List stock entries
export const listStockEntries = createAsyncThunk(
  'inventory/listStockEntries',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.listStockEntries, requestParams);
      const data = extractResponseData(response);
      return {
        entries: data?.entries || [],
        pagination: data?.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch stock entries',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List material receipts
export const listMaterialReceipts = createAsyncThunk(
  'inventory/listMaterialReceipts',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.listMaterialReceipts, requestParams);
      const data = extractResponseData(response);
      return {
        receipts: data?.entries || data?.receipts || [],
        pagination: data?.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch material receipts',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List material issues
export const listMaterialIssues = createAsyncThunk(
  'inventory/listMaterialIssues',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.listMaterialIssues, requestParams);
      const data = extractResponseData(response);
      return {
        issues: data?.entries || data?.issues || [],
        pagination: data?.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch material issues',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List material transfers
export const listMaterialTransfers = createAsyncThunk(
  'inventory/listMaterialTransfers',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.listMaterialTransfers, requestParams);
      const data = extractResponseData(response);
      return {
        transfers: data?.entries || data?.transfers || [],
        pagination: data?.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch material transfers',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get stock entry details
export const getStockEntryDetails = createAsyncThunk(
  'inventory/getStockEntryDetails',
  async ({ stock_entry_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.getStockEntryDetails, {
        stock_entry_name,
      });
      const data = extractResponseData(response);
      return { stockEntry: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch stock entry details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update stock entry (only works for draft entries, docstatus=0)
export const updateStockEntry = createAsyncThunk(
  'inventory/updateStockEntry',
  async (entryData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...entryData,
        ...(entryData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.updateStockEntry, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock entry updated successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || entryData.stock_entry_name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return { entry: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update stock entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Submit stock entry (only works for draft entries, docstatus=0)
export const submitStockEntry = createAsyncThunk(
  'inventory/submitStockEntry',
  async ({ stock_entry_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.submitStockEntry, {
        stock_entry_name,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock entry submitted successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || stock_entry_name}`,
        severity: 'success',
        title: 'Success',
      }));

      return { entry: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to submit stock entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel stock entry (only works for submitted entries, docstatus=1)
export const cancelStockEntry = createAsyncThunk(
  'inventory/cancelStockEntry',
  async ({ stock_entry_name, reason }, { dispatch, rejectWithValue }) => {
    try {
      const requestData = {
        stock_entry_name,
        ...(reason && { reason }),
      };

      const response = await axiosInstance.post(ENDPOINTS.cancelStockEntry, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock entry cancelled successfully';

      dispatch(showNotification({
        message: `${successMessage}. Document: ${data?.name || stock_entry_name}`,
        severity: 'success',
        title: 'Success',
      }));

      return { entry: data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to cancel stock entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ==================== Multi-Level Stock Reconciliation ====================

// Create multi-level stock reconciliation
export const createMultiLevelReconciliation = createAsyncThunk(
  'inventory/createMultiLevelReconciliation',
  async (reconciliationData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...reconciliationData,
        ...(reconciliationData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createMultiLevelReconciliation, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Multi-level stock reconciliation created successfully';

      dispatch(showNotification({
        message: `${successMessage}. Reconciliation: ${data?.name || 'N/A'}`,
        severity: 'success',
        title: 'Success',
      }));

      return {
        reconciliation: data,
        name: data?.name,
        workflow_state: data?.workflow_state || data?.workflow_status || 'Pending Sales User',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create multi-level reconciliation',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Add sales person stock take
export const addSalesPersonStockTake = createAsyncThunk(
  'inventory/addSalesPersonStockTake',
  async (stockTakeData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.addSalesPersonStockTake, stockTakeData);
      
      // Check if response indicates failure (success: false)
      if (response.data?.success === false || response.data?.message?.success === false) {
        const errorMessage = extractErrorMessage({ data: response.data });
        dispatch(showNotification({
          message: errorMessage,
          severity: 'warning',
          title: 'Unable to add sales person stock take',
        }));
        return rejectWithValue(errorMessage);
      }
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Sales person stock take added successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        reconciliation_name: data?.reconciliation_name || stockTakeData.reconciliation_name,
        items_counted: data?.items_counted || 0,
        workflow_state: data?.workflow_state || data?.workflow_status || 'Pending Quality Manager',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Determine severity: warning if success: false, error otherwise
      const severity = (error.response?.data?.success === false || error.response?.data?.message?.success === false) 
        ? 'warning' 
        : 'error';
      dispatch(showNotification({
        message: errorMessage,
        severity: severity,
        title: severity === 'warning' ? 'Unable to add sales person stock take' : 'Failed to add sales person stock take',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Add stock controller (Quality Manager) stock take
export const addStockControllerStockTake = createAsyncThunk(
  'inventory/addStockControllerStockTake',
  async (stockTakeData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.addStockControllerStockTake, stockTakeData);
      
      // Check if response indicates failure (success: false)
      if (response.data?.success === false || response.data?.message?.success === false) {
        const errorMessage = extractErrorMessage({ data: response.data });
        dispatch(showNotification({
          message: errorMessage,
          severity: 'warning',
          title: 'Unable to add stock controller stock take',
        }));
        return rejectWithValue(errorMessage);
      }
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock controller stock take added successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        reconciliation_name: data?.reconciliation_name || stockTakeData.reconciliation_name,
        items_counted: data?.items_counted || 0,
        workflow_state: data?.workflow_state || data?.workflow_status || 'Pending Stock Manager',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Determine severity: warning if success: false, error otherwise
      const severity = (error.response?.data?.success === false || error.response?.data?.message?.success === false) 
        ? 'warning' 
        : 'error';
      dispatch(showNotification({
        message: errorMessage,
        severity: severity,
        title: severity === 'warning' ? 'Unable to add stock controller stock take' : 'Failed to add stock controller stock take',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Add stock manager stock take and optionally submit
export const addStockManagerStockTake = createAsyncThunk(
  'inventory/addStockManagerStockTake',
  async (stockTakeData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.addStockManagerStockTake, stockTakeData);
      
      // Check if response indicates failure (success: false)
      if (response.data?.success === false || response.data?.message?.success === false) {
        const errorMessage = extractErrorMessage({ data: response.data });
        dispatch(showNotification({
          message: errorMessage,
          severity: 'warning',
          title: 'Unable to add stock manager stock take',
        }));
        return rejectWithValue(errorMessage);
      }
      
      const data = extractResponseData(response);
      
      // New API structure: { success: true, data: { reconciliation_name, items_counted, workflow_state, submission, docstatus } }
      // extractResponseData already extracts the data object
      const submissionData = data?.submission || {};
      
      let successMessage = extractSuccessMessage(response);
      if (!successMessage) {
        if (submissionData.submitted) {
          successMessage = 'Stock manager stock take added and reconciliation submitted successfully';
        } else {
          successMessage = 'Stock manager stock take added successfully';
        }
      }

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        reconciliation_name: data?.reconciliation_name || stockTakeData.reconciliation_name,
        items_counted: data?.items_counted || 0,
        workflow_state: data?.workflow_state || data?.workflow_status || (submissionData.submitted ? 'Completed' : 'Pending Stock Manager'),
        submission: submissionData,
        docstatus: data?.docstatus || (submissionData.submitted ? 1 : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Determine severity: warning if success: false, error otherwise
      const severity = (error.response?.data?.success === false || error.response?.data?.message?.success === false) 
        ? 'warning' 
        : 'error';
      dispatch(showNotification({
        message: errorMessage,
        severity: severity,
        title: severity === 'warning' ? 'Unable to add stock manager stock take' : 'Failed to add stock manager stock take',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get multi-level stock reconciliation
export const getMultiLevelReconciliation = createAsyncThunk(
  'inventory/getMultiLevelReconciliation',
  async ({ reconciliation_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getMultiLevelReconciliation, {
        params: { reconciliation_name },
      });
      const data = extractResponseData(response);
      
      // New API structure: { success: true, data: {...} }
      // extractResponseData already handles this, so data is the reconciliation object
      return {
        reconciliation: data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch multi-level reconciliation',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List multi-level stock reconciliations
export const listMultiLevelReconciliations = createAsyncThunk(
  'inventory/listMultiLevelReconciliations',
  async (filters = {}, { dispatch, rejectWithValue }) => {
    try {
      // Support both GET (query params) and POST (body) methods
      const params = {
        workflow_state: filters.workflow_state || filters.workflow_status,
        warehouse: filters.warehouse,
        company: filters.company,
        from_date: filters.from_date,
        to_date: filters.to_date,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      };

      // Remove undefined/null values
      Object.keys(params).forEach(key => params[key] === undefined || params[key] === null ? delete params[key] : {});

      const response = await axiosInstance.post(ENDPOINTS.listMultiLevelReconciliations, params);
      const data = extractResponseData(response);

      return {
        reconciliations: data?.reconciliations || [],
        total_count: data?.total_count || 0,
        limit: data?.limit || 20,
        offset: data?.offset || 0,
        has_more: data?.has_more || false,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to list multi-level reconciliations',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  stockBalance: null,
  stockBalances: [],
  stockSummary: [],
  lowStockItems: [],
  stockLedgerEntries: [],
  stockAvailability: null,
  inventoryItems: [],
  inventoryItemDetails: null,
  // Stock Entry List state
  stockEntries: [],
  materialReceipts: [],
  materialIssues: [],
  materialTransfers: [],
  selectedStockEntry: null,
  stockEntryPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  materialReceiptPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  materialIssuePagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  materialTransferPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  inventoryPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    warehouse: '',
    item_code: '',
    from_date: '',
    to_date: '',
    item_group: '',
    threshold: 10.0,
  },
  isLoading: false,
  isLoadingBalance: false,
  isLoadingSummary: false,
  isLoadingLedger: false,
  isLoadingLowStock: false,
  isLoadingInventoryItems: false,
  isLoadingInventoryDetails: false,
  isLoadingStockEntries: false,
  isLoadingMaterialReceipts: false,
  isLoadingMaterialIssues: false,
  isLoadingMaterialTransfers: false,
  isLoadingStockEntryDetails: false,
  error: null,
  // Multi-Level Stock Reconciliation state
  multiLevelReconciliation: null,
  multiLevelReconciliations: [],
  isLoadingMultiLevelReconciliation: false,
  isLoadingMultiLevelReconciliationAction: false,
  multiLevelReconciliationListPagination: {
    limit: 20,
    offset: 0,
    total_count: 0,
    has_more: false,
  },
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearStockBalance: (state) => {
      state.stockBalance = null;
    },
    clearStockBalances: (state) => {
      state.stockBalances = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset to page 1 when filters change
      state.pagination.page = 1;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    setPageSize: (state, action) => {
      state.pagination.page_size = action.payload;
      // Reset to page 1 when page size changes
      state.pagination.page = 1;
    },
    setInventoryPage: (state, action) => {
      state.inventoryPagination.page = action.payload;
    },
    setStockEntryPage: (state, action) => {
      state.stockEntryPagination.page = action.payload;
    },
    setMaterialReceiptPage: (state, action) => {
      state.materialReceiptPagination.page = action.payload;
    },
    setMaterialIssuePage: (state, action) => {
      state.materialIssuePagination.page = action.payload;
    },
    setMaterialTransferPage: (state, action) => {
      state.materialTransferPagination.page = action.payload;
    },
    clearSelectedStockEntry: (state) => {
      state.selectedStockEntry = null;
    },
    clearMultiLevelReconciliation: (state) => {
      state.multiLevelReconciliation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get stock balance
      .addCase(getStockBalance.pending, (state) => {
        state.isLoadingBalance = true;
        state.error = null;
      })
      .addCase(getStockBalance.fulfilled, (state, action) => {
        state.isLoadingBalance = false;
        state.stockBalance = action.payload.balance;
      })
      .addCase(getStockBalance.rejected, (state, action) => {
        state.isLoadingBalance = false;
        state.error = action.payload;
      })
      // Get stock balance multiple
      .addCase(getStockBalanceMultiple.pending, (state) => {
        state.isLoadingBalance = true;
        state.error = null;
      })
      .addCase(getStockBalanceMultiple.fulfilled, (state, action) => {
        state.isLoadingBalance = false;
        state.stockBalances = action.payload.balances || [];
      })
      .addCase(getStockBalanceMultiple.rejected, (state, action) => {
        state.isLoadingBalance = false;
        state.error = action.payload;
      })
      // Check stock availability
      .addCase(checkStockAvailability.pending, (state) => {
        state.isLoadingBalance = true;
        state.error = null;
      })
      .addCase(checkStockAvailability.fulfilled, (state, action) => {
        state.isLoadingBalance = false;
        state.stockAvailability = action.payload.availability;
      })
      .addCase(checkStockAvailability.rejected, (state, action) => {
        state.isLoadingBalance = false;
        state.error = action.payload;
      })
      // Get stock summary
      .addCase(getStockSummary.pending, (state) => {
        state.isLoadingSummary = true;
        state.error = null;
      })
      .addCase(getStockSummary.fulfilled, (state, action) => {
        state.isLoadingSummary = false;
        state.stockSummary = action.payload.summary || [];
        state.pagination.total = action.payload.count || 0;
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(getStockSummary.rejected, (state, action) => {
        state.isLoadingSummary = false;
        state.error = action.payload;
      })
      // Get low stock items
      .addCase(getLowStockItems.pending, (state) => {
        state.isLoadingLowStock = true;
        state.error = null;
      })
      .addCase(getLowStockItems.fulfilled, (state, action) => {
        state.isLoadingLowStock = false;
        state.lowStockItems = action.payload.items || [];
        state.filters.threshold = action.payload.threshold || state.filters.threshold;
      })
      .addCase(getLowStockItems.rejected, (state, action) => {
        state.isLoadingLowStock = false;
        state.error = action.payload;
      })
      // Get stock ledger entries
      .addCase(getStockLedgerEntries.pending, (state) => {
        state.isLoadingLedger = true;
        state.error = null;
      })
      .addCase(getStockLedgerEntries.fulfilled, (state, action) => {
        state.isLoadingLedger = false;
        state.stockLedgerEntries = action.payload.entries || [];
        state.pagination.total = action.payload.count || 0;
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(getStockLedgerEntries.rejected, (state, action) => {
        state.isLoadingLedger = false;
        state.error = action.payload;
      })
      // Create operations
      .addCase(createStockEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStockEntry.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createStockEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createMaterialReceipt.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaterialReceipt.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createMaterialReceipt.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createMaterialIssue.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaterialIssue.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createMaterialIssue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createMaterialTransfer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaterialTransfer.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createMaterialTransfer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createStockReconciliation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStockReconciliation.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createStockReconciliation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(repostStock.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(repostStock.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(repostStock.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get inventory item details
      .addCase(getInventoryItemDetails.pending, (state) => {
        state.isLoadingInventoryDetails = true;
        state.error = null;
      })
      .addCase(getInventoryItemDetails.fulfilled, (state, action) => {
        state.isLoadingInventoryDetails = false;
        state.inventoryItemDetails = action.payload.inventoryItem;
      })
      .addCase(getInventoryItemDetails.rejected, (state, action) => {
        state.isLoadingInventoryDetails = false;
        state.error = action.payload;
      })
      // List inventory items
      .addCase(listInventoryItems.pending, (state) => {
        state.isLoadingInventoryItems = true;
        state.error = null;
      })
      .addCase(listInventoryItems.fulfilled, (state, action) => {
        state.isLoadingInventoryItems = false;
        state.inventoryItems = action.payload.items || [];
        state.inventoryPagination = action.payload.pagination || state.inventoryPagination;
      })
      .addCase(listInventoryItems.rejected, (state, action) => {
        state.isLoadingInventoryItems = false;
        state.error = action.payload;
      })
      // Update inventory item details
      .addCase(updateInventoryItemDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateInventoryItemDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the item in the list if it exists
        const index = state.inventoryItems.findIndex(
          (item) => item.name === action.payload.inventoryItem?.name
        );
        if (index !== -1) {
          state.inventoryItems[index] = action.payload.inventoryItem;
        }
        // Update details if currently viewing
        if (state.inventoryItemDetails?.name === action.payload.inventoryItem?.name) {
          state.inventoryItemDetails = action.payload.inventoryItem;
        }
      })
      .addCase(updateInventoryItemDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // List stock entries
      .addCase(listStockEntries.pending, (state) => {
        state.isLoadingStockEntries = true;
        state.error = null;
      })
      .addCase(listStockEntries.fulfilled, (state, action) => {
        state.isLoadingStockEntries = false;
        state.stockEntries = action.payload.entries || [];
        state.stockEntryPagination = action.payload.pagination || state.stockEntryPagination;
      })
      .addCase(listStockEntries.rejected, (state, action) => {
        state.isLoadingStockEntries = false;
        state.error = action.payload;
      })
      // List material receipts
      .addCase(listMaterialReceipts.pending, (state) => {
        state.isLoadingMaterialReceipts = true;
        state.error = null;
      })
      .addCase(listMaterialReceipts.fulfilled, (state, action) => {
        state.isLoadingMaterialReceipts = false;
        state.materialReceipts = action.payload.receipts || [];
        state.materialReceiptPagination = action.payload.pagination || state.materialReceiptPagination;
      })
      .addCase(listMaterialReceipts.rejected, (state, action) => {
        state.isLoadingMaterialReceipts = false;
        state.error = action.payload;
      })
      // List material issues
      .addCase(listMaterialIssues.pending, (state) => {
        state.isLoadingMaterialIssues = true;
        state.error = null;
      })
      .addCase(listMaterialIssues.fulfilled, (state, action) => {
        state.isLoadingMaterialIssues = false;
        state.materialIssues = action.payload.issues || [];
        state.materialIssuePagination = action.payload.pagination || state.materialIssuePagination;
      })
      .addCase(listMaterialIssues.rejected, (state, action) => {
        state.isLoadingMaterialIssues = false;
        state.error = action.payload;
      })
      // List material transfers
      .addCase(listMaterialTransfers.pending, (state) => {
        state.isLoadingMaterialTransfers = true;
        state.error = null;
      })
      .addCase(listMaterialTransfers.fulfilled, (state, action) => {
        state.isLoadingMaterialTransfers = false;
        state.materialTransfers = action.payload.transfers || [];
        state.materialTransferPagination = action.payload.pagination || state.materialTransferPagination;
      })
      .addCase(listMaterialTransfers.rejected, (state, action) => {
        state.isLoadingMaterialTransfers = false;
        state.error = action.payload;
      })
      // Get stock entry details
      .addCase(getStockEntryDetails.pending, (state) => {
        state.isLoadingStockEntryDetails = true;
        state.error = null;
      })
      .addCase(getStockEntryDetails.fulfilled, (state, action) => {
        state.isLoadingStockEntryDetails = false;
        state.selectedStockEntry = action.payload.stockEntry;
      })
      .addCase(getStockEntryDetails.rejected, (state, action) => {
        state.isLoadingStockEntryDetails = false;
        state.error = action.payload;
      })
      // Update stock entry
      .addCase(updateStockEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStockEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the selected stock entry if it's the one being updated
        if (state.selectedStockEntry?.name === action.payload.entry?.name) {
          state.selectedStockEntry = action.payload.entry;
        }
      })
      .addCase(updateStockEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit stock entry
      .addCase(submitStockEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitStockEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the selected stock entry if it's the one being submitted
        if (state.selectedStockEntry?.name === action.payload.entry?.name) {
          state.selectedStockEntry = { ...state.selectedStockEntry, ...action.payload.entry, docstatus: 1 };
        }
      })
      .addCase(submitStockEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Cancel stock entry
      .addCase(cancelStockEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelStockEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the selected stock entry if it's the one being cancelled
        if (state.selectedStockEntry?.name === action.payload.entry?.name) {
          state.selectedStockEntry = { ...state.selectedStockEntry, ...action.payload.entry, docstatus: 2 };
        }
      })
      .addCase(cancelStockEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Multi-Level Stock Reconciliation
      .addCase(createMultiLevelReconciliation.pending, (state) => {
        state.isLoadingMultiLevelReconciliationAction = true;
        state.error = null;
      })
      .addCase(createMultiLevelReconciliation.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        if (action.payload.reconciliation) {
          state.multiLevelReconciliation = action.payload.reconciliation;
        }
      })
      .addCase(createMultiLevelReconciliation.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        state.error = action.payload;
      })
      .addCase(addSalesPersonStockTake.pending, (state) => {
        state.isLoadingMultiLevelReconciliationAction = true;
        state.error = null;
      })
      .addCase(addSalesPersonStockTake.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        if (state.multiLevelReconciliation && 
            state.multiLevelReconciliation.name === action.payload.reconciliation_name) {
          state.multiLevelReconciliation.workflow_state = action.payload.workflow_state || action.payload.workflow_status;
        }
      })
      .addCase(addSalesPersonStockTake.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        state.error = action.payload;
      })
      .addCase(addStockControllerStockTake.pending, (state) => {
        state.isLoadingMultiLevelReconciliationAction = true;
        state.error = null;
      })
      .addCase(addStockControllerStockTake.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        if (state.multiLevelReconciliation && 
            state.multiLevelReconciliation.name === action.payload.reconciliation_name) {
          state.multiLevelReconciliation.workflow_state = action.payload.workflow_state || action.payload.workflow_status;
        }
      })
      .addCase(addStockControllerStockTake.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        state.error = action.payload;
      })
      .addCase(addStockManagerStockTake.pending, (state) => {
        state.isLoadingMultiLevelReconciliationAction = true;
        state.error = null;
      })
      .addCase(addStockManagerStockTake.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        if (state.multiLevelReconciliation && 
            state.multiLevelReconciliation.name === action.payload.reconciliation_name) {
          state.multiLevelReconciliation.workflow_state = action.payload.workflow_state || action.payload.workflow_status;
          state.multiLevelReconciliation.docstatus = action.payload.docstatus;
        }
      })
      .addCase(addStockManagerStockTake.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliationAction = false;
        state.error = action.payload;
      })
      .addCase(getMultiLevelReconciliation.pending, (state) => {
        state.isLoadingMultiLevelReconciliation = true;
        state.error = null;
      })
      .addCase(getMultiLevelReconciliation.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliation = false;
        state.multiLevelReconciliation = action.payload.reconciliation;
      })
      .addCase(getMultiLevelReconciliation.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliation = false;
        state.error = action.payload;
      })
      .addCase(listMultiLevelReconciliations.pending, (state) => {
        state.isLoadingMultiLevelReconciliation = true;
        state.error = null;
      })
      .addCase(listMultiLevelReconciliations.fulfilled, (state, action) => {
        state.isLoadingMultiLevelReconciliation = false;
        state.multiLevelReconciliations = action.payload.reconciliations || [];
        state.multiLevelReconciliationListPagination = {
          limit: action.payload.limit || 20,
          offset: action.payload.offset || 0,
          total_count: action.payload.total_count || 0,
          has_more: action.payload.has_more || false,
        };
      })
      .addCase(listMultiLevelReconciliations.rejected, (state, action) => {
        state.isLoadingMultiLevelReconciliation = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearStockBalance,
  clearStockBalances,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  setInventoryPage,
  setStockEntryPage,
  setMaterialReceiptPage,
  setMaterialIssuePage,
  setMaterialTransferPage,
  clearSelectedStockEntry,
  clearMultiLevelReconciliation,
} = inventorySlice.actions;

export default inventorySlice.reducer;

