import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Stock Transfer API endpoints - matching STOCK_TRANSFER_API_DOCUMENTATION.md
const ENDPOINTS = {
  createStockTransfer: 'techsavanna_pos.api.stock.create_stock_transfer',
  createStockTransferRequest: 'techsavanna_pos.api.stock.create_stock_transfer_request',
  submitStockTransferRequest: 'techsavanna_pos.api.stock.submit_stock_transfer_request',
  listStockTransferRequests: 'techsavanna_pos.api.stock.list_stock_transfer_requests',
  getStockTransferRequest: 'techsavanna_pos.api.stock.get_stock_transfer_request',
  approveStockTransfer: 'techsavanna_pos.api.stock.approve_stock_transfer',
  approveStockTransferWorkflow: 'techsavanna_pos.api.stock.approve_stock_transfer_workflow',
  dispatchStock: 'techsavanna_pos.api.stock.dispatch_stock',
  receiveStockDestination: 'techsavanna_pos.api.stock.receive_stock_destination',
  cancelStockTransferRequest: 'techsavanna_pos.api.stock.cancel_stock_transfer_request',
  confirmReceiveTransfer: 'techsavanna_pos.api.stock.confirm_receive_transfer',
};

// Helper function to extract data from API response
// Frappe APIs typically return: { message: { success: true, data: {...} } } or { message: { status: "success", ... } }
const extractResponseData = (response) => {
  // First, check if response.data.message exists (Frappe standard)
  const message = response.data?.message;
  
  if (message) {
    // Handle: { message: { success: true, data: {...} } }
    if (message.success && message.data) {
      return message.data;
    }
    // Handle: { message: { status: "success", stock_entry: "..." } }
    if (message.status === 'success' || message.status === 'error') {
      return message;
    }
    // Handle: { message: { ... } } where message itself is the data
    if (typeof message === 'object' && !message.success && !message.status) {
      return message;
    }
    // Return message if it's an object
    if (typeof message === 'object') {
      return message;
    }
  }
  
  // Fallback: check direct response.data structure
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  if (response.data?.status === 'success' || response.data?.status === 'error') {
    return response.data;
  }
  
  // Final fallback
  return response.data?.message || response.data;
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to extract success message
const extractSuccessMessage = (response) => {
  if (response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  if (response.data?.message?.message) {
    return response.data.message.message;
  }
  return null;
};

// Create Stock Transfer (Direct Transfer)
export const createStockTransfer = createAsyncThunk(
  'stockTransfer/createStockTransfer',
  async (transferData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!transferData.company) {
        throw new Error('Company is required');
      }
      if (!transferData.posting_date) {
        throw new Error('Posting date is required');
      }
      if (!transferData.posting_time) {
        throw new Error('Posting time is required');
      }
      if (!transferData.from_warehouse) {
        throw new Error('Source warehouse is required');
      }
      if (!transferData.to_warehouse) {
        throw new Error('Destination warehouse is required');
      }
      if (!transferData.items || !Array.isArray(transferData.items) || transferData.items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Use application/x-www-form-urlencoded as per API documentation
      const response = await axiosInstance.post(
        ENDPOINTS.createStockTransfer,
        new URLSearchParams({
          company: transferData.company,
          posting_date: transferData.posting_date,
          posting_time: transferData.posting_time,
          from_warehouse: transferData.from_warehouse,
          to_warehouse: transferData.to_warehouse,
          items: JSON.stringify(transferData.items),
          notes: transferData.notes || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { status: "success", message: "...", stock_entry: "..." }
      // After extraction, data should be: { status: "success", stock_entry: "..." }
      const successMessage = data?.message || extractSuccessMessage(response) || 'Stock transfer completed successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        stock_entry: data?.stock_entry,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to create stock transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Stock Transfer Requests (Material Requests)
export const listStockTransferRequests = createAsyncThunk(
  'stockTransfer/listStockTransferRequests',
  async (filters = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Use application/json as per API documentation
      const requestFilters = {
        ...filters,
        ...(userCompany ? { company: userCompany } : {}),
      };

      const response = await axiosInstance.post(
        ENDPOINTS.listStockTransferRequests,
        requestFilters,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response structure from API: { message: { success: true, message: "...", data: { requests: [...] } } }
      // extractResponseData returns message.data when message.success && message.data exists
      // So data should be: { requests: [...] }
      let requests = [];
      
      // Primary path: data.requests (extractResponseData returns message.data)
      if (data?.requests && Array.isArray(data.requests)) {
        requests = data.requests;
      } 
      // Fallback: if extractResponseData returned the full message object instead
      else if (data?.data?.requests && Array.isArray(data.data.requests)) {
        requests = data.data.requests;
      }
      // Fallback: if data is directly an array
      else if (Array.isArray(data)) {
        requests = data;
      }
      // If none match, log for debugging
      else {
        console.warn('listStockTransferRequests: Unexpected response structure', { 
          responseData: response.data, 
          extractedData: data 
        });
        requests = [];
      }

      return {
        requests,
        count: data?.count || requests.length,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch stock transfer requests',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Direct Stock Transfers (Stock Entries of type Material Transfer)
export const listDirectStockTransfers = createAsyncThunk(
  'stockTransfer/listDirectStockTransfers',
  async (filters = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Use the inventory API to list Material Transfer Stock Entries
      const requestParams = {
        stock_entry_type: 'Material Transfer',
        ...(userCompany ? { company: userCompany } : {}),
        ...filters,
      };

      const response = await axiosInstance.post(
        'techsavanna_pos.api.inventory_api.list_material_transfers',
        requestParams
      );

      const data = extractResponseData(response);
      
      // Handle response structure - could be entries, transfers, or data array
      const transfers = data?.entries || data?.transfers || data?.data || (Array.isArray(data) ? data : []);

      // Format direct transfers to match Material Request structure for display
      const formattedTransfers = transfers.map((transfer) => {
        // Find source and target warehouses from items
        const sourceWarehouse = transfer.items?.[0]?.s_warehouse || 
                               transfer.items?.[0]?.source_warehouse ||
                               transfer.from_warehouse;
        const targetWarehouse = transfer.items?.[0]?.t_warehouse || 
                               transfer.items?.[0]?.target_warehouse ||
                               transfer.to_warehouse;

        return {
          name: transfer.name || transfer.stock_entry_name,
          type: 'direct',
          status: transfer.docstatus === 1 ? 'Completed' : transfer.docstatus === 2 ? 'Cancelled' : 'Draft',
          origin_warehouse: sourceWarehouse,
          destination_warehouse: targetWarehouse,
          posting_date: transfer.posting_date,
          posting_time: transfer.posting_time,
          requested_by: transfer.owner || transfer.modified_by || transfer.created_by,
          requested_on: transfer.creation || transfer.modified || transfer.posting_date,
          items: transfer.items || [],
          stock_entry: transfer.name || transfer.stock_entry_name,
          is_direct_transfer: true,
        };
      });

      return {
        transfers: formattedTransfers,
        count: data?.count || formattedTransfers.length,
      };
    } catch (error) {
      // Don't show error for direct transfers if API fails - just return empty
      console.warn('Failed to fetch direct stock transfers:', error);
      return {
        transfers: [],
        count: 0,
      };
    }
  }
);

// List All Stock Transfers (combines both Material Requests and Direct Transfers)
export const listAllStockTransfers = createAsyncThunk(
  'stockTransfer/listAllStockTransfers',
  async (filters = {}, { dispatch }) => {
    // Fetch both Material Requests and Direct Transfers in parallel
    const [requestsResult, transfersResult] = await Promise.allSettled([
      dispatch(listStockTransferRequests(filters)),
      dispatch(listDirectStockTransfers(filters)),
    ]);

    // When a thunk is dispatched, the result is an action object with a payload property
    // So we need to access .payload to get the actual return value
    const requests = requestsResult.status === 'fulfilled' 
      ? (requestsResult.value?.payload?.requests || [])
      : [];
    
    const transfers = transfersResult.status === 'fulfilled'
      ? (transfersResult.value?.payload?.transfers || [])
      : [];

    // Combine and sort by date (newest first)
    const allTransfers = [...requests, ...transfers].sort((a, b) => {
      const dateA = new Date(a.requested_on || a.posting_date || a.creation || 0);
      const dateB = new Date(b.requested_on || b.posting_date || b.creation || 0);
      return dateB - dateA;
    });

    return {
      requests: allTransfers,
      count: allTransfers.length,
    };
  }
);

// Get Stock Transfer Request Details
export const getStockTransferRequest = createAsyncThunk(
  'stockTransfer/getStockTransferRequest',
  async ({ request_id }, { dispatch, rejectWithValue }) => {
    try {
      if (!request_id) {
        throw new Error('Request ID is required');
      }

      const response = await axiosInstance.get(ENDPOINTS.getStockTransferRequest, {
        params: { request_id },
      });

      const data = extractResponseData(response);
      
      // Handle response structure from API: { success: true, message: "...", data: { name: "...", items: [...] } }
      // After extraction, data should be: { name: "...", items: [...] }
      const request = data;

      return {
        request,
        items: request?.items || [],
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch stock transfer request',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Approve Stock Transfer (No Workflow)
export const approveStockTransfer = createAsyncThunk(
  'stockTransfer/approveStockTransfer',
  async ({ request_id, approved_by, approval_notes, is_approved }, { dispatch, rejectWithValue }) => {
    try {
      if (!request_id) {
        throw new Error('Request ID is required');
      }
      if (!approved_by) {
        throw new Error('Approver email is required');
      }

      // Build payload - include is_approved if provided (required for Pending status)
      const payload = {
        request_id,
        approved_by,
        approval_notes: approval_notes || '',
      };
      
      // Include is_approved: true in payload for Pending status
      if (is_approved !== undefined) {
        payload.is_approved = is_approved;
      }

      // Use JSON format as per new API documentation
      const response = await axiosInstance.post(
        ENDPOINTS.approveStockTransfer,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { request_id: "...", status: "Approved", approved_by: "..." } } }
      // extractResponseData returns message.data, so data is the data object
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || 'Stock Transfer Request approved successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        request_id: responseData?.request_id || request_id,
        status: responseData?.status || 'Approved',
        approved_by: responseData?.approved_by || approved_by,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to approve stock transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Approve Stock Transfer (With Workflow)
export const approveStockTransferWorkflow = createAsyncThunk(
  'stockTransfer/approveStockTransferWorkflow',
  async ({ request_id, approved_by, approval_notes }, { dispatch, rejectWithValue, getState }) => {
    try {
      if (!request_id) {
        throw new Error('Request ID is required');
      }
      if (!approved_by) {
        throw new Error('Approver email is required');
      }

      // Verify that approved_by matches logged-in user (as per API requirement)
      const state = getState();
      const currentUser = state?.auth?.user?.email || state?.auth?.user?.name;
      if (currentUser && currentUser !== approved_by) {
        dispatch(showNotification({
          message: 'API user must match approved_by',
          severity: 'error',
          title: 'Authorization Error',
        }));
        return rejectWithValue('API user must match approved_by');
      }

      // Use JSON format as per new API documentation
      const response = await axiosInstance.post(
        ENDPOINTS.approveStockTransferWorkflow,
        {
          request_id,
          approved_by,
          approval_notes: approval_notes || '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { request_id: "...", workflow_state: "Approved" } } }
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || 'Stock Transfer Request approved';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        request_id: responseData?.request_id || request_id,
        workflow_state: responseData?.workflow_state || 'Approved',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to approve stock transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Dispatch Stock
export const dispatchStock = createAsyncThunk(
  'stockTransfer/dispatchStock',
  async (dispatchData, { dispatch, rejectWithValue, getState }) => {
    try {
      if (!dispatchData.request_id) {
        throw new Error('Request ID is required');
      }
      if (!dispatchData.origin_warehouse) {
        throw new Error('Origin warehouse is required');
      }
      if (!dispatchData.items || !Array.isArray(dispatchData.items) || dispatchData.items.length === 0) {
        throw new Error('At least one item is required');
      }
      if (!dispatchData.dispatched_by) {
        throw new Error('Dispatched by is required');
      }

      // Verify that dispatched_by matches logged-in user (recommended)
      const state = getState();
      const currentUser = state?.auth?.user?.email || state?.auth?.user?.name;
      if (currentUser && currentUser !== dispatchData.dispatched_by) {
        dispatch(showNotification({
          message: 'Dispatched by should match logged-in user',
          severity: 'warning',
          title: 'Warning',
        }));
      }

      // Use JSON format as per new API documentation
      const response = await axiosInstance.post(
        ENDPOINTS.dispatchStock,
        {
          request_id: dispatchData.request_id,
          origin_warehouse: dispatchData.origin_warehouse,
          items: dispatchData.items,
          dispatched_by: dispatchData.dispatched_by,
          dispatch_notes: dispatchData.dispatch_notes || '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Check if response indicates an error (success: false)
      const responseMessage = response.data?.message;
      if (responseMessage && typeof responseMessage === 'object' && responseMessage.success === false) {
        const errorMsg = responseMessage.message || 'Dispatch failed';
        throw new Error(errorMsg);
      }

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { status: "...", stock_entry: "..." } } }
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || 'Stock dispatched successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        status: responseData?.status || 'In Transit',
        stock_entry: responseData?.stock_entry,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to dispatch stock',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Receive Stock at Destination
export const receiveStockDestination = createAsyncThunk(
  'stockTransfer/receiveStockDestination',
  async (receiveData, { dispatch, rejectWithValue }) => {
    try {
      if (!receiveData.request_id) {
        throw new Error('Request ID is required');
      }
      if (!receiveData.destination_warehouse) {
        throw new Error('Destination warehouse is required');
      }
      if (!receiveData.items || !Array.isArray(receiveData.items) || receiveData.items.length === 0) {
        throw new Error('At least one item is required');
      }
      if (!receiveData.received_by) {
        throw new Error('Received by is required');
      }

      // Use application/json as per API documentation
      const response = await axiosInstance.post(
        ENDPOINTS.receiveStockDestination,
        {
          request_id: receiveData.request_id,
          destination_warehouse: receiveData.destination_warehouse,
          items: receiveData.items,
          received_by: receiveData.received_by,
          receive_notes: receiveData.receive_notes || '',
          goods_received_note: receiveData.goods_received_note || '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { status: "...", stock_entry: "...", goods_received_note: "..." } } }
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || 'Stock received successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        status: responseData?.status || 'Completed',
        stock_entry: responseData?.stock_entry,
        goods_received_note: responseData?.goods_received_note || receiveData.goods_received_note,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to receive stock',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Stock Transfer Request (Material Request)
export const createMaterialRequest = createAsyncThunk(
  'stockTransfer/createMaterialRequest',
  async (requestData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Validate required fields
      if (!requestData.company && !userCompany) {
        throw new Error('Company is required');
      }
      if (!requestData.from_warehouse) {
        throw new Error('Source warehouse is required');
      }
      if (!requestData.to_warehouse) {
        throw new Error('Destination warehouse is required');
      }
      if (!requestData.items || !Array.isArray(requestData.items) || requestData.items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Validate items
      const validItems = requestData.items.filter(item => item.item_code && item.qty > 0);
      if (validItems.length === 0) {
        throw new Error('At least one valid item is required');
      }

      // Format request according to API documentation
      const requestBody = {
        company: requestData.company || userCompany,
        from_warehouse: requestData.from_warehouse,
        to_warehouse: requestData.to_warehouse,
        items: validItems.map((item) => ({
          item_code: item.item_code,
          qty: parseFloat(item.qty),
          ...(item.uom && { uom: item.uom }),
        })),
        ...(requestData.transaction_date && { transaction_date: requestData.transaction_date }),
        ...(requestData.schedule_date && { schedule_date: requestData.schedule_date }),
        ...(requestData.submit !== undefined && { submit: requestData.submit }),
      };

      // Use the documented endpoint
      const response = await axiosInstance.post(
        ENDPOINTS.createStockTransferRequest,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract response data
      // Expected: { message: { success: true, message: "...", data: { material_request: "...", status: "...", docstatus: ..., submitted: ... } } }
      const data = extractResponseData(response);
      
      // Handle response structure - extractResponseData returns message.data when message.success && message.data exists
      const responseData = data?.data || data;
      const materialRequestName = responseData?.material_request || responseData?.name;
      const status = responseData?.status || 'Draft';
      const submitted = responseData?.submitted || false;

      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || 
        `Stock transfer request created successfully${materialRequestName ? `: ${materialRequestName}` : ''}`;

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        material_request: materialRequestName,
        name: materialRequestName,
        status,
        docstatus: responseData?.docstatus || (submitted ? 1 : 0),
        submitted,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to create stock transfer request',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Submit Stock Transfer Request
export const submitMaterialRequest = createAsyncThunk(
  'stockTransfer/submitMaterialRequest',
  async ({ request_id }, { dispatch, rejectWithValue }) => {
    try {
      if (!request_id) {
        throw new Error('Request ID is required');
      }

      // Use the new dedicated endpoint
      const response = await axiosInstance.post(
        ENDPOINTS.submitStockTransferRequest,
        {
          request_id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { request_id: "...", status: "Submitted", docstatus: 1 } } }
      // extractResponseData returns message.data when message.success && message.data exists
      // So data is: { request_id: "...", status: "Submitted", docstatus: 1 }
      // But we also need to get the message text, so check if data has message property (full message object) or just data
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || `Stock transfer request ${request_id} submitted successfully`;

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        name: responseData?.request_id || request_id,
        request_id: responseData?.request_id || request_id,
        status: responseData?.status || 'Submitted',
        docstatus: responseData?.docstatus || 1,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to submit stock transfer request',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel Stock Transfer Request
export const cancelStockTransferRequest = createAsyncThunk(
  'stockTransfer/cancelStockTransferRequest',
  async ({ request_id, reason }, { dispatch, rejectWithValue }) => {
    try {
      if (!request_id) {
        throw new Error('Request ID is required');
      }

      const response = await axiosInstance.post(
        ENDPOINTS.cancelStockTransferRequest,
        {
          request_id,
          reason: reason || '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = extractResponseData(response);
      
      // Handle response: { message: { success: true, message: "...", data: { request_id: "...", status: "Cancelled", docstatus: 2 } } }
      const responseData = data?.data || data;
      const messageText = data?.message || response.data?.message?.message || extractSuccessMessage(response);
      const successMessage = messageText || `Stock transfer request ${request_id} cancelled successfully`;

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        request_id: responseData?.request_id || request_id,
        status: responseData?.status || 'Cancelled',
        docstatus: responseData?.docstatus || 2,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to cancel stock transfer request',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Confirm Receive Transfer
export const confirmReceiveTransfer = createAsyncThunk(
  'stockTransfer/confirmReceiveTransfer',
  async ({ stock_entry_name }, { dispatch, rejectWithValue }) => {
    try {
      if (!stock_entry_name) {
        throw new Error('Stock Entry name is required');
      }

      const response = await axiosInstance.post(
        `${ENDPOINTS.confirmReceiveTransfer}?stock_entry_name=${stock_entry_name}`
      );

      const data = extractResponseData(response);
      
      // Handle response: { status: "success", message: "...", data: { stock_entry_name: "...", transfer_status: "..." } }
      // After extraction, if message.status exists, data is the message object itself
      // Otherwise, data is the extracted data object
      const responseData = data?.data || data;
      const successMessage = data?.message || extractSuccessMessage(response) || 'Stock transfer processed successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        stock_entry_name: responseData?.stock_entry_name || stock_entry_name,
        transfer_status: responseData?.transfer_status || 'Received',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to confirm receive transfer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  // Direct transfers (Stock Entries)
  stockEntries: [],
  
  // Transfer requests (Material Requests)
  transferRequests: [],
  selectedTransferRequest: null,
  
  // Pagination
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  
  // Filters
  filters: {
    status: '',
    origin_warehouse: '',
    destination_warehouse: '',
    from_date: '',
    to_date: '',
  },
  
  // Loading states
  isLoading: false,
  isLoadingDetails: false,
  isLoadingList: false,
  isCreating: false,
  isApproving: false,
  isDispatching: false,
  isReceiving: false,
  
  // Error state
  error: null,
  
  // Workflow state
  currentWorkflowStep: null,
};

const stockTransferSlice = createSlice({
  name: 'stockTransfer',
  initialState,
  reducers: {
    clearSelectedTransferRequest: (state) => {
      state.selectedTransferRequest = null;
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
    setWorkflowStep: (state, action) => {
      state.currentWorkflowStep = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Stock Transfer
      .addCase(createStockTransfer.pending, (state) => {
        state.isCreating = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStockTransfer.fulfilled, (state, action) => {
        state.isCreating = false;
        state.isLoading = false;
        if (action.payload.stock_entry) {
          state.stockEntries.unshift({ name: action.payload.stock_entry });
        }
      })
      .addCase(createStockTransfer.rejected, (state, action) => {
        state.isCreating = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create Material Request
      .addCase(createMaterialRequest.pending, (state) => {
        state.isCreating = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaterialRequest.fulfilled, (state, action) => {
        state.isCreating = false;
        state.isLoading = false;
        // Material Request will appear in the list after refetch
      })
      .addCase(createMaterialRequest.rejected, (state, action) => {
        state.isCreating = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit Material Request
      .addCase(submitMaterialRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitMaterialRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update request status if it exists in the list
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.payload.name
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: 'Submitted',
          };
        }
      })
      .addCase(submitMaterialRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // List Stock Transfer Requests
      .addCase(listStockTransferRequests.pending, (state) => {
        state.isLoadingList = true;
        state.error = null;
      })
      .addCase(listStockTransferRequests.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.transferRequests = action.payload.requests || [];
        state.pagination.total = action.payload.count || 0;
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(listStockTransferRequests.rejected, (state, action) => {
        state.isLoadingList = false;
        state.error = action.payload;
      })
      // List All Stock Transfers (combined)
      .addCase(listAllStockTransfers.pending, (state) => {
        state.isLoadingList = true;
        state.error = null;
      })
      .addCase(listAllStockTransfers.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.transferRequests = action.payload.requests || [];
        state.pagination.total = action.payload.count || 0;
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(listAllStockTransfers.rejected, (state, action) => {
        state.isLoadingList = false;
        state.error = action.payload;
      })
      // Get Stock Transfer Request
      .addCase(getStockTransferRequest.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getStockTransferRequest.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedTransferRequest = action.payload.request || null;
      })
      .addCase(getStockTransferRequest.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Approve Stock Transfer
      .addCase(approveStockTransfer.pending, (state) => {
        state.isApproving = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveStockTransfer.fulfilled, (state, action) => {
        state.isApproving = false;
        state.isLoading = false;
        // Update request in list if it exists
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.payload.request_id
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: action.payload.status,
          };
        }
        // Update selected request if it matches
        if (state.selectedTransferRequest?.name === action.payload.request_id) {
          state.selectedTransferRequest = {
            ...state.selectedTransferRequest,
            status: action.payload.status,
          };
        }
      })
      .addCase(approveStockTransfer.rejected, (state, action) => {
        state.isApproving = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Approve Stock Transfer Workflow
      .addCase(approveStockTransferWorkflow.pending, (state) => {
        state.isApproving = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveStockTransferWorkflow.fulfilled, (state, action) => {
        state.isApproving = false;
        state.isLoading = false;
        // Update request in list if it exists
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.payload.request_id
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: 'Approved',
            workflow_state: action.payload.workflow_state,
          };
        }
        // Update selected request if it matches
        if (state.selectedTransferRequest?.name === action.payload.request_id) {
          state.selectedTransferRequest = {
            ...state.selectedTransferRequest,
            status: 'Approved',
            workflow_state: action.payload.workflow_state,
          };
        }
      })
      .addCase(approveStockTransferWorkflow.rejected, (state, action) => {
        state.isApproving = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Dispatch Stock
      .addCase(dispatchStock.pending, (state) => {
        state.isDispatching = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(dispatchStock.fulfilled, (state, action) => {
        state.isDispatching = false;
        state.isLoading = false;
        // Update request status
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.meta.arg.request_id
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: action.payload.status,
          };
        }
        if (state.selectedTransferRequest?.name === action.meta.arg.request_id) {
          state.selectedTransferRequest = {
            ...state.selectedTransferRequest,
            status: action.payload.status,
          };
        }
      })
      .addCase(dispatchStock.rejected, (state, action) => {
        state.isDispatching = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Receive Stock Destination
      .addCase(receiveStockDestination.pending, (state) => {
        state.isReceiving = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(receiveStockDestination.fulfilled, (state, action) => {
        state.isReceiving = false;
        state.isLoading = false;
        // Update request status
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.meta.arg.request_id
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: action.payload.status,
            goods_received_note: action.payload.goods_received_note,
          };
        }
        if (state.selectedTransferRequest?.name === action.meta.arg.request_id) {
          state.selectedTransferRequest = {
            ...state.selectedTransferRequest,
            status: action.payload.status,
            goods_received_note: action.payload.goods_received_note,
          };
        }
      })
      .addCase(receiveStockDestination.rejected, (state, action) => {
        state.isReceiving = false;
        state.isLoading = false;
        state.error = action.payload;
      })
      // Cancel Stock Transfer Request
      .addCase(cancelStockTransferRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelStockTransferRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update request in list if it exists
        const index = state.transferRequests.findIndex(
          (r) => r.name === action.payload.request_id
        );
        if (index !== -1) {
          state.transferRequests[index] = {
            ...state.transferRequests[index],
            status: action.payload.status,
          };
        }
        // Update selected request if it matches
        if (state.selectedTransferRequest?.name === action.payload.request_id) {
          state.selectedTransferRequest = {
            ...state.selectedTransferRequest,
            status: action.payload.status,
          };
        }
      })
      .addCase(cancelStockTransferRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Confirm Receive Transfer
      .addCase(confirmReceiveTransfer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmReceiveTransfer.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update stock entry if needed
        const index = state.stockEntries.findIndex(
          (e) => e.name === action.payload.stock_entry_name
        );
        if (index !== -1) {
          state.stockEntries[index] = {
            ...state.stockEntries[index],
            transfer_status: action.payload.transfer_status,
          };
        }
      })
      .addCase(confirmReceiveTransfer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedTransferRequest,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  setWorkflowStep,
} = stockTransferSlice.actions;

export default stockTransferSlice.reducer;

