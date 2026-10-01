import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';

// Purchase API endpoints - matching API_DOCUMENTATION_PURCHASE.md
const ENDPOINTS = {
  createPurchaseInvoice: 'techsavanna_pos.api.purchase.create_purchase_order',
  updatePurchaseInvoice: 'techsavanna_pos.api.purchase.update_purchase_order', // Deprecated: Use upsertPurchaseOrder
  upsertPurchaseOrder: 'techsavanna_pos.api.purchase.upsert_purchase_order',
  submitPurchaseOrder: 'techsavanna_pos.api.purchase.submit_purchase_order',
  getPurchaseInvoice: 'techsavanna_pos.api.purchase.get_purchase_order',
  listPurchaseOrders: 'techsavanna_pos.api.purchase.list_purchase_orders', // Purchase Orders (LPO)
  submitToETIMS: 'techsavanna_pos.api.submit_purchase_invoice_to_etims',
  cancelPurchaseInvoice: 'techsavanna_pos.api.cancel_purchase_invoice',
  // Purchase Receipt endpoints
  createPurchaseReceipt: 'techsavanna_pos.api.purchase.create_purchase_receipt',
  createStockReceipt: 'techsavanna_pos.api.purchase.create_stock_receipt',
  getPurchaseReceipt: 'techsavanna_pos.api.purchase.get_purchase_receipt',
  listPurchaseReceipts: 'techsavanna_pos.api.purchase.list_purchase_receipts',
  // GRN endpoints (based on PURCHASE_API_DOCUMENTATION.md)
  createGRN: 'techsavanna_pos.api.purchase.create_grn',
  fetchRegisteredPurchases: 'techsavanna_pos.api.purchase.fetch_registered_purchases',
  listRegisteredPurchases: 'techsavanna_pos.api.purchase.list_registered_purchases',
  createFromRegisteredPurchase: 'techsavanna_pos.api.purchase.create_purchase_invoice_from_registered_purchase',
  createPurchaseReturn: 'techsavanna_pos.api.purchase.create_purchase_return',
  bulkSubmitToETIMS: 'techsavanna_pos.api.purchase.bulk_submit_purchase_invoices',
  checkETIMSStatus: 'techsavanna_pos.api.check_etims_registration_status',
  // Bank and Account Management endpoints
  createCashOrBankAccount: 'techsavanna_pos.api.create_cash_or_bank_account',
  listCashAndBankAccounts: 'techsavanna_pos.api.list_cash_and_bank_accounts',
  getAccountDetails: 'techsavanna_pos.api.get_account_details',
  updateAccount: 'techsavanna_pos.api.update_account',
  createBank: 'techsavanna_pos.api.create_bank',
  listBanks: 'techsavanna_pos.api.list_banks',
  createBankAccount: 'techsavanna_pos.api.create_bank_account',
  listBankAccounts: 'techsavanna_pos.api.list_bank_accounts',
  getBankAccountDetails: 'techsavanna_pos.api.get_bank_account_details',
  // Purchase Invoice endpoints (based on PURCHASE_INVOICE_API_DOCUMENTATION.md)
  listPurchaseInvoices: 'techsavanna_pos.api.purchase.list_purchase_invoices',
  getPurchaseInvoiceDetails: 'techsavanna_pos.api.purchase.get_purchase_invoice_details',
  createPurchaseInvoiceFromGRN: 'techsavanna_pos.api.purchase.create_purchase_invoice_from_grn',
  updatePurchaseInvoiceAPI: 'techsavanna_pos.api.purchase.update_purchase_invoice',
  payPurchaseInvoice: 'techsavanna_pos.api.purchase.pay_purchase_invoice',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // API returns { success: true, message: {...}, data: {...} }
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract error message
const extractErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.exc_type) {
    return error.response.data.exc_type;
  }
  if (error.response?.data?.exc) {
    return error.response.data.exc;
  }
  return error.message || 'An error occurred';
};

// Helper function to determine notification severity based on HTTP status code
const getErrorSeverity = (error) => {
  // 409 Conflict should be shown as warning instead of error
  if (error.response?.status === 409) {
    return 'warning';
  }
  return 'error';
};

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

// List Purchase Orders (LPO) - for backward compatibility, keeping as listPurchaseInvoices
// Note: This is for Purchase Orders, not Purchase Invoices
export const listPurchaseInvoices = createAsyncThunk(
  'purchase/listPurchaseInvoices',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      // Enforce company filter as per API documentation
      // Company filtering is NOT automatically applied by the API
      if (!params.company && !params.filters) {
        return rejectWithValue('Company filter is required for listing purchase orders');
      }
      
      // If filters is a string (JSON), parse it and ensure company is included
      // If filters is an object, ensure company is included
      let filters = params.filters;
      if (typeof filters === 'string') {
        try {
          filters = JSON.parse(filters);
        } catch (e) {
          // If parsing fails, treat as invalid
          filters = {};
        }
      }
      
      // If company is in params but not in filters, add it to filters
      if (params.company && filters && !filters.company) {
        filters.company = params.company;
      } else if (params.company && !filters) {
        filters = { company: params.company };
      }
      
      // Build final params
      const finalParams = {
        ...params,
        filters: filters ? JSON.stringify(filters) : undefined,
      };
      
      const response = await axiosInstance.get(ENDPOINTS.listPurchaseOrders, { 
        params: finalParams 
      });
      const data = extractResponseData(response);
      // Handle response structure: { status: "success", total_count: 9, purchase_orders: [...] }
      return {
        purchases: data?.purchase_orders || data?.data || (Array.isArray(data) ? data : []),
        count: data?.total_count || data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchases',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Purchase Invoice Details (Purchase Order - for backward compatibility)
export const getPurchaseInvoice = createAsyncThunk(
  'purchase/getPurchaseInvoice',
  async ({ name, po_name }, { dispatch, rejectWithValue }) => {
    try {
      // Support both name (for backward compatibility) and po_name (API standard)
      const poName = po_name || name;
      if (!poName) {
        throw new Error('Purchase Order name is required');
      }
      
      const response = await axiosInstance.get(ENDPOINTS.getPurchaseInvoice, {
        params: { po_name: poName },
      });
      const data = extractResponseData(response);
      
      // Handle response structure: { status: "success", purchase_order: {...} }
      const purchaseOrder = data?.purchase_order || data?.data || data;
      
      return {
        purchase: purchaseOrder,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchase details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Purchase Invoices (Purchase Invoice API - separate from Purchase Orders)
export const listPurchaseInvoicesAPI = createAsyncThunk(
  'purchase/listPurchaseInvoicesAPI',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      // Get company from state if not provided
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Build query parameters according to API documentation
      const requestParams = {
        page: params.page || 1,
        page_size: params.page_size || 20,
        ...(params.supplier && { supplier: params.supplier }),
        ...(params.company || userCompany ? { company: params.company || userCompany } : {}),
        ...(params.purchase_order && { purchase_order: params.purchase_order }),
        ...(params.purchase_receipt && { purchase_receipt: params.purchase_receipt }),
        ...(params.from_date && { from_date: params.from_date }),
        ...(params.to_date && { to_date: params.to_date }),
        ...(params.docstatus !== undefined && params.docstatus !== '' && { docstatus: params.docstatus }),
        ...(params.status && { status: params.status }),
        ...(params.bill_no && { bill_no: params.bill_no }),
      };

      const response = await axiosInstance.get(ENDPOINTS.listPurchaseInvoices, {
        params: requestParams,
      });

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Purchase Invoice API Response:', response.data);
      }

      // Extract response data - API wraps in message object
      // Response structure: { message: { status: "success", message: string, data: [], meta: {...} } }
      let responseData = response.data;
      if (response.data?.message && typeof response.data.message === 'object' && !Array.isArray(response.data.message)) {
        responseData = response.data.message;
      }

      // Handle response structure: { status: "success"|"error", message: string, data: [], meta: {...} }
      if (responseData?.status === 'success') {
        // Ensure data is an array
        const invoices = Array.isArray(responseData.data) ? responseData.data : [];
        
        return {
          invoices,
          pagination: {
            page: responseData.meta?.page || requestParams.page,
            page_size: responseData.meta?.page_size || requestParams.page_size,
            total: responseData.meta?.total || 0,
            total_pages: responseData.meta?.total_pages || 0,
          },
        };
      } else {
        // Handle error response
        const errorMessage = typeof responseData?.message === 'string' 
          ? responseData.message 
          : 'Failed to fetch purchase invoices';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Failed to fetch purchase invoices',
        }));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchase invoices',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Purchase Invoice Details (Purchase Invoice API)
export const getPurchaseInvoiceDetails = createAsyncThunk(
  'purchase/getPurchaseInvoiceDetails',
  async ({ invoice_no }, { dispatch, rejectWithValue }) => {
    try {
      if (!invoice_no) {
        throw new Error('Purchase Invoice number (invoice_no) is required');
      }

      const response = await axiosInstance.get(ENDPOINTS.getPurchaseInvoiceDetails, {
        params: { invoice_no },
      });

      // Extract response data - API wraps in message object
      // Response structure: { message: { status: "success", message: string, data: {...} } }
      let responseData = response.data;
      if (response.data?.message && typeof response.data.message === 'object' && !Array.isArray(response.data.message)) {
        responseData = response.data.message;
      }

      // Handle response structure: { status: "success"|"error", message: string, data: {...} }
      if (responseData?.status === 'success') {
        return {
          invoice: responseData.data || null,
        };
      } else {
        // Handle error response
        const errorMessage = responseData?.message || 'Failed to fetch purchase invoice details';
        const errorCode = responseData?.code;
        
        // Handle specific error codes
        if (errorCode === 'LPO_NOT_FOUND' || errorCode === 'INVALID_REQUEST') {
          dispatch(showNotification({
            message: errorMessage,
            severity: 'error',
            title: 'Purchase Invoice Not Found',
          }));
        } else if (errorCode === 'PERMISSION_DENIED') {
          dispatch(showNotification({
            message: errorMessage,
            severity: 'error',
            title: 'Permission Denied',
          }));
        } else {
          dispatch(showNotification({
            message: errorMessage,
            severity: getErrorSeverity({ response }),
            title: 'Failed to fetch purchase invoice details',
          }));
        }
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchase invoice details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Purchase Invoice from GRN
export const createPurchaseInvoiceFromGRN = createAsyncThunk(
  'purchase/createPurchaseInvoiceFromGRN',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!invoiceData.grn_no) {
        throw new Error('GRN number (grn_no) is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.createPurchaseInvoiceFromGRN, invoiceData);
      
      // Extract response data - API might wrap in message object
      let responseData = response.data;
      if (response.data?.message && typeof response.data.message === 'object' && !Array.isArray(response.data.message)) {
        responseData = response.data.message;
      }

      // Handle response structure: { status: "success", code: "PI_CREATED", message: string, data: {...} }
      if (responseData?.status === 'success') {
        const successMessage = responseData.message || 'Purchase Invoice created successfully from GRN';
        const invoiceResponseData = responseData.data || {};
        
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Purchase Invoice Created',
        }));
        
        return {
          invoice: {
            name: invoiceResponseData.invoice_name,
            invoice_no: invoiceResponseData.invoice_name,
            docstatus: invoiceResponseData.docstatus || 0,
            submitted: invoiceResponseData.submitted || false,
            grand_total: invoiceResponseData.grand_total || 0,
            items_count: invoiceResponseData.items_count || 0,
            supplier: invoiceResponseData.supplier,
            company: invoiceResponseData.company,
            bill_no: invoiceResponseData.bill_no,
            bill_date: invoiceResponseData.bill_date,
            supplier_invoice_attached: invoiceResponseData.supplier_invoice_attached || false,
          },
          grn_no: responseData.grn_no || invoiceResponseData.grn_no,
        };
      } else {
        // Handle error response
        const errorMessage = responseData?.message || 'Failed to create purchase invoice from GRN';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Failed to Create Purchase Invoice',
        }));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create purchase invoice from GRN',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Purchase Invoice (Purchase Invoice API - separate from Purchase Order update)
export const updatePurchaseInvoiceAPI = createAsyncThunk(
  'purchase/updatePurchaseInvoiceAPI',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!invoiceData.invoice_no) {
        throw new Error('Purchase Invoice number (invoice_no) is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.updatePurchaseInvoiceAPI, invoiceData);
      
      // Extract response data - API might wrap in message object
      let responseData = response.data;
      if (response.data?.message && typeof response.data.message === 'object' && !Array.isArray(response.data.message)) {
        responseData = response.data.message;
      }

      // Handle response structure: { status: "success"|"error", message: string, data: {...} }
      if (responseData?.status === 'success') {
        const successMessage = responseData.message || 'Purchase Invoice updated successfully';
        
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Purchase Invoice Updated',
        }));
        
        return {
          invoice: responseData.data || { invoice_name: invoiceData.invoice_no },
        };
      } else {
        // Handle error response
        const errorMessage = responseData?.message || 'Failed to update purchase invoice';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Failed to Update Purchase Invoice',
        }));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update purchase invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Pay Purchase Invoice
export const payPurchaseInvoice = createAsyncThunk(
  'purchase/payPurchaseInvoice',
  async (paymentData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!paymentData.invoice_no) {
        throw new Error('Purchase Invoice number (invoice_no) is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.payPurchaseInvoice, paymentData);
      
      // Extract response data - API might wrap in message object
      let responseData = response.data;
      if (response.data?.message && typeof response.data.message === 'object' && !Array.isArray(response.data.message)) {
        responseData = response.data.message;
      }

      // Handle response structure: { status: "success"|"error", message: string, data: {...} }
      if (responseData?.status === 'success') {
        const successMessage = responseData.message || 'Payment Entry created successfully';
        
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Payment Processed',
        }));
        
        return {
          payment_entry: responseData.data?.payment_entry || null,
          purchase_invoice: responseData.data?.purchase_invoice || null,
          invoice_no: paymentData.invoice_no,
        };
      } else {
        // Handle error response
        const errorMessage = responseData?.message || 'Failed to process payment';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Payment Failed',
        }));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to process payment',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Purchase Invoice
export const createPurchaseInvoice = createAsyncThunk(
  'purchase/createPurchaseInvoice',
  async (purchaseData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createPurchaseInvoice, purchaseData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Purchase Invoice created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        purchase: { name: data?.name || response.data?.name },
        has_etims: data?.has_etims || response.data?.has_etims || false,
        etims_submission: data?.etims_submission || response.data?.etims_submission,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create purchase invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Purchase Invoice (Deprecated: Use upsertPurchaseOrder instead)
export const updatePurchaseInvoice = createAsyncThunk(
  'purchase/updatePurchaseInvoice',
  async (purchaseData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updatePurchaseInvoice, purchaseData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Purchase Invoice updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        purchase: { name: data?.name || purchaseData.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update purchase invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Upsert Purchase Order (Create or Update)
export const upsertPurchaseOrder = createAsyncThunk(
  'purchase/upsertPurchaseOrder',
  async (purchaseData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!purchaseData.supplier) {
        throw new Error('Supplier is required');
      }
      if (!purchaseData.company) {
        throw new Error('Company is required');
      }
      if (!purchaseData.items || !Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
        throw new Error('At least one item is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.upsertPurchaseOrder, purchaseData);
      const data = extractResponseData(response);
      
      // Handle response structure: { status: "success", purchase_order: string, docstatus: number, grand_total: number }
      if (data?.status === 'success') {
        const successMessage = data?.message || 'Purchase Order saved successfully';
        
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Success',
        }));
        
        return {
          purchase: {
            name: data.purchase_order || data.name,
            docstatus: data.docstatus,
            grand_total: data.grand_total,
          },
        };
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to save purchase order',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Submit Purchase Order
export const submitPurchaseOrder = createAsyncThunk(
  'purchase/submitPurchaseOrder',
  async ({ lpo_no, purchase_order }, { dispatch, rejectWithValue }) => {
    try {
      // Accept either lpo_no or purchase_order parameter
      const poName = lpo_no || purchase_order;
      if (!poName) {
        throw new Error('Purchase Order name is required (provide either lpo_no or purchase_order)');
      }

      const response = await axiosInstance.post(ENDPOINTS.submitPurchaseOrder, {
        lpo_no: poName,
      });
      
      // Handle response structure: 
      // { message: { status: "success", code: "PO_SUBMITTED", message: "LPO submitted successfully", data: {...}, lpo_no: string } }
      // extractResponseData will extract response.data.message (the nested message object)
      const messageData = extractResponseData(response);
      
      // messageData is the nested message object: { status, code, message, data, lpo_no }
      if (messageData?.status === 'success') {
        const successMsg = messageData.message || 'Purchase Order submitted successfully';
        const lpoNo = messageData.lpo_no || poName;
        const responseData = messageData.data || {};
        
        dispatch(showNotification({
          message: successMsg,
          severity: 'success',
          title: 'Purchase Order Submitted',
        }));
        
        return {
          purchase_order: lpoNo,
          docstatus: responseData.docstatus || 1, // Submitted
          grand_total: responseData.grand_total,
          company: responseData.company,
          supplier: responseData.supplier,
          items_count: responseData.items_count,
          code: messageData.code,
        };
      } else {
        // Handle error response from API
        const errorMsg = messageData?.message || messageData?.error || 'Unknown error occurred while submitting purchase order';
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to Submit Purchase Order',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel Purchase Invoice
export const cancelPurchaseInvoice = createAsyncThunk(
  'purchase/cancelPurchaseInvoice',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.cancelPurchaseInvoice, { name });
      const successMessage = extractSuccessMessage(response) || 'Purchase Invoice cancelled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to cancel purchase invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Purchase Receipt
export const createPurchaseReceipt = createAsyncThunk(
  'purchase/createPurchaseReceipt',
  async (receiptData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createPurchaseReceipt, receiptData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Purchase Receipt created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        receipt: { name: data?.name || response.data?.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create purchase receipt',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Stock Receipt from GRN
export const createStockReceipt = createAsyncThunk(
  'purchase/createStockReceipt',
  async ({ grn_no }, { dispatch, rejectWithValue }) => {
    try {
      if (!grn_no) {
        throw new Error('GRN number (grn_no) is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.createStockReceipt, {
        grn_no: grn_no,
      });
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Stock receipt created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        stockReceipt: { name: data?.name || response.data?.name },
        grn_no: grn_no,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create stock receipt',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Purchase Receipt
export const getPurchaseReceipt = createAsyncThunk(
  'purchase/getPurchaseReceipt',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getPurchaseReceipt, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        receipt: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchase receipt details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Purchase Receipts
export const listPurchaseReceipts = createAsyncThunk(
  'purchase/listPurchaseReceipts',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listPurchaseReceipts, { params });
      const data = extractResponseData(response);
      return {
        receipts: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch purchase receipts',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Submit Purchase Invoice to eTIMS
export const submitPurchaseInvoiceToETIMS = createAsyncThunk(
  'purchase/submitPurchaseInvoiceToETIMS',
  async ({ name, settings_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.submitToETIMS, {
        name,
        settings_name,
      });
      const successMessage = extractSuccessMessage(response) || 'Purchase Invoice submitted to eTIMS successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to submit to eTIMS',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Bulk Submit Purchase Invoices to eTIMS
export const bulkSubmitPurchaseInvoicesToETIMS = createAsyncThunk(
  'purchase/bulkSubmitPurchaseInvoicesToETIMS',
  async ({ purchase_invoice_names, settings_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.bulkSubmitToETIMS, {
        purchase_invoice_names,
        settings_name,
      });
      const data = extractResponseData(response);
      
      dispatch(showNotification({
        message: `Submitted ${data?.submitted_count || 0} purchase(s) to eTIMS`,
        severity: 'success',
        title: 'Bulk Submit Complete',
      }));
      
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to submit purchases to eTIMS',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Fetch Registered Purchases from eTIMS
export const fetchRegisteredPurchases = createAsyncThunk(
  'purchase/fetchRegisteredPurchases',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.fetchRegisteredPurchases, params);
      const successMessage = extractSuccessMessage(response) || 'Fetching registered purchases from eTIMS';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'info',
        title: 'Fetch Initiated',
      }));
      
      return { success: true };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch registered purchases',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Registered Purchases
export const listRegisteredPurchases = createAsyncThunk(
  'purchase/listRegisteredPurchases',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listRegisteredPurchases, { params });
      const data = extractResponseData(response);
      return {
        registeredPurchases: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch registered purchases',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Purchase Invoice from Registered Purchase
export const createPurchaseInvoiceFromRegisteredPurchase = createAsyncThunk(
  'purchase/createPurchaseInvoiceFromRegisteredPurchase',
  async ({ registered_purchase_name, company, warehouse }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createFromRegisteredPurchase, {
        registered_purchase_name,
        company,
        warehouse,
      });
      const successMessage = extractSuccessMessage(response) || 'Purchase Invoice created from Registered Purchase successfully';
      
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
        title: 'Failed to create purchase invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Purchase Return
export const createPurchaseReturn = createAsyncThunk(
  'purchase/createPurchaseReturn',
  async (returnData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createPurchaseReturn, returnData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Purchase Return created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        purchaseReturn: { name: data?.name || response.data?.name },
        return_against: data?.return_against || returnData.return_against,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create purchase return',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create GRN (Goods Receipt Note) - Based on PURCHASE_API_DOCUMENTATION.md
export const createGRN = createAsyncThunk(
  'purchase/createGRN',
  async (grnData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!grnData.lpo_no) {
        throw new Error('Purchase Order number (lpo_no) is required');
      }
      if (!grnData.warehouse) {
        throw new Error('Warehouse is required');
      }
      if (!grnData.items || !Array.isArray(grnData.items) || grnData.items.length === 0) {
        throw new Error('At least one item is required');
      }

      const response = await axiosInstance.post(ENDPOINTS.createGRN, grnData);
      const data = extractResponseData(response);
      
      // Handle response structure: { status: "success", grn_no: string, lpo_no: string, message: string, data: {...} }
      if (data?.status === 'success' || response.data?.status === 'success') {
        const responseData = data || response.data;
        const successMessage = responseData?.message || 'GRN created successfully';
        
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Success',
        }));
        
        return {
          grn_no: responseData.grn_no,
          lpo_no: responseData.lpo_no || grnData.lpo_no,
          data: responseData.data,
        };
      } else {
        // Handle error response format: { status: "error", code: string, message: string }
        const errorData = data || response.data;
        throw new Error(errorData?.message || 'Unknown error occurred');
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create GRN',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Check eTIMS Registration Status
export const checkETIMSStatus = createAsyncThunk(
  'purchase/checkETIMSStatus',
  async ({ company }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.checkETIMSStatus, {
        params: { company },
      });
      const data = extractResponseData(response);
      return {
        has_etims: data?.has_etims || false,
        settings_name: data?.settings_name || null,
        is_active: data?.is_active || false,
        company: data?.company || company,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Bank and Account Management

// Create Cash or Bank Account
export const createCashOrBankAccount = createAsyncThunk(
  'purchase/createCashOrBankAccount',
  async (accountData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createCashOrBankAccount, accountData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Account created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        account: {
          name: data?.name || response.data?.name,
          account_name: data?.account_name,
          account_type: data?.account_type,
          company: data?.company,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create account',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Cash and Bank Accounts
export const listCashAndBankAccounts = createAsyncThunk(
  'purchase/listCashAndBankAccounts',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listCashAndBankAccounts, { params });
      const data = extractResponseData(response);
      return {
        accounts: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Account Details
export const getAccountDetails = createAsyncThunk(
  'purchase/getAccountDetails',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getAccountDetails, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        account: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Account
export const updateAccount = createAsyncThunk(
  'purchase/updateAccount',
  async (accountData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateAccount, accountData);
      const successMessage = extractSuccessMessage(response) || 'Account updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { name: accountData.name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update account',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Bank
export const createBank = createAsyncThunk(
  'purchase/createBank',
  async (bankData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createBank, bankData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Bank created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        bank: {
          name: data?.name || response.data?.name,
          bank_name: data?.bank_name,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create bank',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Banks
export const listBanks = createAsyncThunk(
  'purchase/listBanks',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listBanks, { params });
      const data = extractResponseData(response);
      return {
        banks: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Bank Account
export const createBankAccount = createAsyncThunk(
  'purchase/createBankAccount',
  async (bankAccountData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createBankAccount, bankAccountData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Bank Account created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        bankAccount: {
          name: data?.name || response.data?.name,
          account_name: data?.account_name,
          bank: data?.bank,
          account: data?.account,
          company: data?.company,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create bank account',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Bank Accounts
export const listBankAccounts = createAsyncThunk(
  'purchase/listBankAccounts',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listBankAccounts, { params });
      const data = extractResponseData(response);
      return {
        bankAccounts: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Bank Account Details
export const getBankAccountDetails = createAsyncThunk(
  'purchase/getBankAccountDetails',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getBankAccountDetails, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        bankAccount: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  purchases: [],
  registeredPurchases: [],
  selectedPurchase: null,
  // Purchase Receipt state
  purchaseReceipts: [],
  selectedPurchaseReceipt: null,
  purchaseReceiptPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  isLoadingPurchaseReceipts: false,
  isLoadingPurchaseReceiptDetails: false,
  // Purchase Invoice state (separate from Purchase Orders)
  purchaseInvoices: [],
  selectedPurchaseInvoice: null,
  purchaseInvoicePagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  isLoadingPurchaseInvoices: false,
  isLoadingPurchaseInvoiceDetails: false,
  purchaseInvoiceFilters: {
    supplier: '',
    company: '',
    purchase_order: '',
    purchase_receipt: '',
    from_date: '',
    to_date: '',
    docstatus: '',
    status: '',
    bill_no: '',
  },
  etimsStatus: {
    has_etims: false,
    settings_name: null,
    is_active: false,
  },
  // Bank and Account Management state
  cashBankAccounts: [],
  banks: [],
  bankAccounts: [],
  selectedAccount: null,
  selectedBankAccount: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  registeredPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    search_term: '',
    supplier: '',
    status: '',
    from_date: '',
    to_date: '',
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingRegistered: false,
  isLoadingAccounts: false,
  error: null,
};

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    clearSelectedPurchase: (state) => {
      state.selectedPurchase = null;
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
    clearSelectedPurchaseReceipt: (state) => {
      state.selectedPurchaseReceipt = null;
    },
    setPurchaseReceiptPage: (state, action) => {
      state.purchaseReceiptPagination.page = action.payload;
    },
    // Purchase Invoice reducers
    clearSelectedPurchaseInvoice: (state) => {
      state.selectedPurchaseInvoice = null;
    },
    setPurchaseInvoiceFilters: (state, action) => {
      state.purchaseInvoiceFilters = { ...state.purchaseInvoiceFilters, ...action.payload };
      // Reset to page 1 when filters change
      state.purchaseInvoicePagination.page = 1;
    },
    resetPurchaseInvoiceFilters: (state) => {
      state.purchaseInvoiceFilters = initialState.purchaseInvoiceFilters;
      state.purchaseInvoicePagination.page = 1;
    },
    setPurchaseInvoicePage: (state, action) => {
      state.purchaseInvoicePagination.page = action.payload;
    },
    setPurchaseInvoicePageSize: (state, action) => {
      state.purchaseInvoicePagination.page_size = action.payload;
      // Reset to page 1 when page size changes
      state.purchaseInvoicePagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // List Purchase Invoices
      .addCase(listPurchaseInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listPurchaseInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.purchases = action.payload.purchases || [];
        state.pagination.total = action.payload.count || 0;
        // Calculate total pages
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(listPurchaseInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Purchase Invoice Details
      .addCase(getPurchaseInvoice.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getPurchaseInvoice.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedPurchase = action.payload.purchase || null;
      })
      .addCase(getPurchaseInvoice.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Create Purchase Invoice
      .addCase(createPurchaseInvoice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPurchaseInvoice.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.purchase) {
          state.purchases.unshift(action.payload.purchase);
          state.pagination.total += 1;
        }
      })
      .addCase(createPurchaseInvoice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update Purchase Invoice
      .addCase(updatePurchaseInvoice.fulfilled, (state, action) => {
        if (action.payload.purchase) {
          const index = state.purchases.findIndex(
            (p) => p.name === action.payload.purchase.name
          );
          if (index !== -1) {
            state.purchases[index] = { ...state.purchases[index], ...action.payload.purchase };
          }
          if (state.selectedPurchase?.name === action.payload.purchase.name) {
            state.selectedPurchase = { ...state.selectedPurchase, ...action.payload.purchase };
          }
        }
      })
      // Upsert Purchase Order
      .addCase(upsertPurchaseOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(upsertPurchaseOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.purchase) {
          const index = state.purchases.findIndex(
            (p) => p.name === action.payload.purchase.name
          );
          if (index !== -1) {
            // Update existing purchase
            state.purchases[index] = { ...state.purchases[index], ...action.payload.purchase };
          } else {
            // Add new purchase
            state.purchases.unshift(action.payload.purchase);
            state.pagination.total += 1;
          }
          // Update selected purchase if it matches
          if (state.selectedPurchase?.name === action.payload.purchase.name) {
            state.selectedPurchase = { ...state.selectedPurchase, ...action.payload.purchase };
          }
        }
      })
      .addCase(upsertPurchaseOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit Purchase Order
      .addCase(submitPurchaseOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitPurchaseOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.purchase_order) {
          const index = state.purchases.findIndex(
            (p) => p.name === action.payload.purchase_order
          );
          if (index !== -1) {
            state.purchases[index] = {
              ...state.purchases[index],
              docstatus: 1,
              status: 'Submitted',
            };
          }
          if (state.selectedPurchase?.name === action.payload.purchase_order) {
            state.selectedPurchase = {
              ...state.selectedPurchase,
              docstatus: 1,
              status: 'Submitted',
            };
          }
        }
      })
      .addCase(submitPurchaseOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Cancel Purchase Invoice
      .addCase(cancelPurchaseInvoice.fulfilled, (state, action) => {
        const index = state.purchases.findIndex((p) => p.name === action.payload.name);
        if (index !== -1) {
          state.purchases[index] = { ...state.purchases[index], status: 'Cancelled' };
        }
        if (state.selectedPurchase?.name === action.payload.name) {
          state.selectedPurchase = { ...state.selectedPurchase, status: 'Cancelled' };
        }
      })
      // List Registered Purchases
      .addCase(listRegisteredPurchases.pending, (state) => {
        state.isLoadingRegistered = true;
      })
      .addCase(listRegisteredPurchases.fulfilled, (state, action) => {
        state.isLoadingRegistered = false;
        state.registeredPurchases = action.payload.registeredPurchases || [];
        state.registeredPagination.total = action.payload.count || 0;
        state.registeredPagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.registeredPagination.page_size
        );
      })
      .addCase(listRegisteredPurchases.rejected, (state) => {
        state.isLoadingRegistered = false;
      })
      // Check eTIMS Status
      .addCase(checkETIMSStatus.fulfilled, (state, action) => {
        state.etimsStatus = {
          has_etims: action.payload.has_etims || false,
          settings_name: action.payload.settings_name || null,
          is_active: action.payload.is_active || false,
        };
      })
      // List Cash and Bank Accounts
      .addCase(listCashAndBankAccounts.pending, (state) => {
        state.isLoadingAccounts = true;
      })
      .addCase(listCashAndBankAccounts.fulfilled, (state, action) => {
        state.isLoadingAccounts = false;
        state.cashBankAccounts = action.payload.accounts || [];
      })
      .addCase(listCashAndBankAccounts.rejected, (state) => {
        state.isLoadingAccounts = false;
      })
      // List Banks
      .addCase(listBanks.fulfilled, (state, action) => {
        state.banks = action.payload.banks || [];
      })
      // List Bank Accounts
      .addCase(listBankAccounts.fulfilled, (state, action) => {
        state.bankAccounts = action.payload.bankAccounts || [];
      })
      // Get Account Details
      .addCase(getAccountDetails.fulfilled, (state, action) => {
        state.selectedAccount = action.payload.account || null;
      })
      // Get Bank Account Details
      .addCase(getBankAccountDetails.fulfilled, (state, action) => {
        state.selectedBankAccount = action.payload.bankAccount || null;
      })
      // List Purchase Receipts
      .addCase(listPurchaseReceipts.pending, (state) => {
        state.isLoadingPurchaseReceipts = true;
        state.error = null;
      })
      .addCase(listPurchaseReceipts.fulfilled, (state, action) => {
        state.isLoadingPurchaseReceipts = false;
        state.purchaseReceipts = action.payload.receipts || [];
        state.purchaseReceiptPagination.total = action.payload.count || 0;
        state.purchaseReceiptPagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.purchaseReceiptPagination.page_size
        );
      })
      .addCase(listPurchaseReceipts.rejected, (state, action) => {
        state.isLoadingPurchaseReceipts = false;
        state.error = action.payload;
      })
      // Get Purchase Receipt Details
      .addCase(getPurchaseReceipt.pending, (state) => {
        state.isLoadingPurchaseReceiptDetails = true;
        state.error = null;
      })
      .addCase(getPurchaseReceipt.fulfilled, (state, action) => {
        state.isLoadingPurchaseReceiptDetails = false;
        state.selectedPurchaseReceipt = action.payload.receipt || null;
      })
      .addCase(getPurchaseReceipt.rejected, (state, action) => {
        state.isLoadingPurchaseReceiptDetails = false;
        state.error = action.payload;
      })
      // Create Purchase Receipt
      .addCase(createPurchaseReceipt.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPurchaseReceipt.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.receipt) {
          state.purchaseReceipts.unshift(action.payload.receipt);
          state.purchaseReceiptPagination.total += 1;
        }
      })
      .addCase(createPurchaseReceipt.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create GRN
      .addCase(createGRN.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGRN.fulfilled, (state, action) => {
        state.isLoading = false;
        // GRN creation success - stock is automatically updated on backend
        // Could refresh purchase receipts list if needed
      })
      .addCase(createGRN.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // List Purchase Invoices (Purchase Invoice API)
      .addCase(listPurchaseInvoicesAPI.pending, (state) => {
        state.isLoadingPurchaseInvoices = true;
        state.error = null;
      })
      .addCase(listPurchaseInvoicesAPI.fulfilled, (state, action) => {
        state.isLoadingPurchaseInvoices = false;
        // Ensure invoices is always an array
        const invoices = action.payload?.invoices;
        state.purchaseInvoices = Array.isArray(invoices) ? invoices : [];
        
        if (action.payload?.pagination) {
          state.purchaseInvoicePagination = {
            ...state.purchaseInvoicePagination,
            ...action.payload.pagination,
          };
        }
      })
      .addCase(listPurchaseInvoicesAPI.rejected, (state, action) => {
        state.isLoadingPurchaseInvoices = false;
        state.error = action.payload;
        // Clear invoices on error
        state.purchaseInvoices = [];
      })
      // Get Purchase Invoice Details (Purchase Invoice API)
      .addCase(getPurchaseInvoiceDetails.pending, (state) => {
        state.isLoadingPurchaseInvoiceDetails = true;
        state.error = null;
      })
      .addCase(getPurchaseInvoiceDetails.fulfilled, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        state.selectedPurchaseInvoice = action.payload.invoice || null;
      })
      .addCase(getPurchaseInvoiceDetails.rejected, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        state.error = action.payload;
      })
      // Create Purchase Invoice from GRN
      .addCase(createPurchaseInvoiceFromGRN.pending, (state) => {
        state.isLoadingPurchaseInvoices = true;
        state.error = null;
      })
      .addCase(createPurchaseInvoiceFromGRN.fulfilled, (state, action) => {
        state.isLoadingPurchaseInvoices = false;
        if (action.payload.invoice) {
          // Add the new invoice to the list if it exists
          const existingIndex = state.purchaseInvoices.findIndex(
            (inv) => inv.name === action.payload.invoice.invoice_no || inv.name === action.payload.invoice.name
          );
          if (existingIndex !== -1) {
            state.purchaseInvoices[existingIndex] = { ...state.purchaseInvoices[existingIndex], ...action.payload.invoice };
          } else {
            state.purchaseInvoices.unshift(action.payload.invoice);
            state.purchaseInvoicePagination.total += 1;
          }
          // Update selected invoice if it matches
          if (state.selectedPurchaseInvoice?.invoice_no === action.payload.invoice.invoice_no || 
              state.selectedPurchaseInvoice?.name === action.payload.invoice.name) {
            state.selectedPurchaseInvoice = { ...state.selectedPurchaseInvoice, ...action.payload.invoice };
          }
        }
      })
      .addCase(createPurchaseInvoiceFromGRN.rejected, (state, action) => {
        state.isLoadingPurchaseInvoices = false;
        state.error = action.payload;
      })
      // Update Purchase Invoice (Purchase Invoice API)
      .addCase(updatePurchaseInvoiceAPI.pending, (state) => {
        state.isLoadingPurchaseInvoiceDetails = true;
        state.error = null;
      })
      .addCase(updatePurchaseInvoiceAPI.fulfilled, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        if (action.payload.invoice) {
          const invoiceName = action.payload.invoice.invoice_name || action.payload.invoice.name;
          // Update in list if exists
          const index = state.purchaseInvoices.findIndex(
            (inv) => inv.name === invoiceName || inv.invoice_no === invoiceName
          );
          if (index !== -1) {
            state.purchaseInvoices[index] = { ...state.purchaseInvoices[index], ...action.payload.invoice };
          }
          // Update selected invoice if it matches
          if (state.selectedPurchaseInvoice?.invoice_no === invoiceName || 
              state.selectedPurchaseInvoice?.name === invoiceName) {
            state.selectedPurchaseInvoice = { ...state.selectedPurchaseInvoice, ...action.payload.invoice };
            // Refresh details
            // Note: We could dispatch getPurchaseInvoiceDetails here, but that would require a thunk
          }
        }
      })
      .addCase(updatePurchaseInvoiceAPI.rejected, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        state.error = action.payload;
      })
      // Pay Purchase Invoice
      .addCase(payPurchaseInvoice.pending, (state) => {
        state.isLoadingPurchaseInvoiceDetails = true;
        state.error = null;
      })
      .addCase(payPurchaseInvoice.fulfilled, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        if (action.payload.purchase_invoice) {
          const invoiceName = action.payload.invoice_no;
          // Update in list if exists
          const index = state.purchaseInvoices.findIndex(
            (inv) => inv.name === invoiceName || inv.invoice_no === invoiceName
          );
          if (index !== -1) {
            state.purchaseInvoices[index] = { 
              ...state.purchaseInvoices[index], 
              ...action.payload.purchase_invoice 
            };
          }
          // Update selected invoice if it matches
          if (state.selectedPurchaseInvoice?.invoice_no === invoiceName || 
              state.selectedPurchaseInvoice?.name === invoiceName) {
            state.selectedPurchaseInvoice = { 
              ...state.selectedPurchaseInvoice, 
              ...action.payload.purchase_invoice 
            };
          }
        }
      })
      .addCase(payPurchaseInvoice.rejected, (state, action) => {
        state.isLoadingPurchaseInvoiceDetails = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedPurchase,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  clearSelectedPurchaseReceipt,
  setPurchaseReceiptPage,
  clearSelectedPurchaseInvoice,
  setPurchaseInvoiceFilters,
  resetPurchaseInvoiceFilters,
  setPurchaseInvoicePage,
  setPurchaseInvoicePageSize,
} = purchaseSlice.actions;
export default purchaseSlice.reducer;
