import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Sales API endpoints - matching SALES_API_DOCUMENTATION.md
const ENDPOINTS = {
  // Sales Invoice Management
  createSalesInvoice: 'techsavanna_pos.api.sales_api.create_sales_invoice',
  updateSalesInvoice: 'techsavanna_pos.api.sales_api.update_sales_invoice',
  getSalesInvoice: 'techsavanna_pos.api.sales_api.get_sales_invoice',
  listSalesInvoices: 'techsavanna_pos.api.sales_api.list_sales_invoices',
  cancelSalesInvoice: 'techsavanna_pos.api.sales_api.cancel_sales_invoice',
  submitInvoice: 'techsavanna_pos.api.sales_api.submit_invoice',
  
  // POS Invoice Management
  createPOSInvoice: 'techsavanna_pos.api.sales_api.create_pos_invoice',
  updatePOSInvoice: 'techsavanna_pos.api.sales_api.update_pos_invoice',
  getPOSInvoice: 'techsavanna_pos.api.sales_api.get_pos_invoice',
  listPOSInvoices: 'techsavanna_pos.api.sales_api.list_pos_invoices',
  cancelPOSInvoice: 'techsavanna_pos.api.sales_api.cancel_pos_invoice',
  createPOSOpeningEntry: 'techsavanna_pos.api.sales_api.create_pos_opening_entry',
  listPOSOpeningEntries: 'techsavanna_pos.api.sales_api.list_pos_opening_entries',
  getPOSOpeningEntry: 'techsavanna_pos.api.sales_api.get_pos_opening_entry',
  closePOSOpeningEntry: 'techsavanna_pos.api.sales_api.close_pos_opening_entry',
  cancelPOSOpeningEntry: 'techsavanna_pos.api.sales_api.cancel_pos_opening_entry',
  
  // Sales Returns (Credit Notes)
  createSalesReturn: 'techsavanna_pos.api.sales_api.create_sales_return',
  getSalesReturn: 'techsavanna_pos.api.sales_api.get_sales_return',
  listSalesReturns: 'techsavanna_pos.api.sales_api.list_sales_returns',
  cancelSalesReturn: 'techsavanna_pos.api.sales_api.cancel_sales_return',
  
  // Payment Methods
  listPaymentMethods: 'techsavanna_pos.api.sales_api.list_payment_methods',
  getReceivableAccount: 'techsavanna_pos.api.sales_api.get_receivable_account',
  createCreditModeOfPayment: 'techsavanna_pos.api.sales_api.create_credit_mode_of_payment',
  
  // POS Invoice Type
  getPOSInvoiceType: 'techsavanna_pos.api.sales_api.get_pos_invoice_type',
  setPOSInvoiceType: 'techsavanna_pos.api.sales_api.set_pos_invoice_type',
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
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Many sales endpoints report a refusal inside a normal reply: { message: { success: false,
// message: "..." } }. Without this check the till treated "could not open the shift" as
// success, let the cashier sell without a shift, and only failed later at payment.
const ensureSucceeded = (response) => {
  const body = response?.data;
  const result = body?.message && typeof body.message === 'object' ? body.message : body;
  if (result && result.success === false) {
    throw new Error(result.message || result.error || 'The server could not complete this.');
  }
  return response;
};

// Helper function to determine notification severity based on HTTP status code
const getErrorSeverity = (error) => errorSeverity(error);

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

// ============================================
// SALES INVOICE MANAGEMENT - Async Thunks
// ============================================

// List Sales Invoices
export const listSalesInvoices = createAsyncThunk(
  'sales/listSalesInvoices',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listSalesInvoices, { params });
      const data = extractResponseData(response);
      return {
        salesInvoices: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch sales invoices',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Sales Invoice Details
export const getSalesInvoice = createAsyncThunk(
  'sales/getSalesInvoice',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getSalesInvoice, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        salesInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch sales invoice details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Sales Invoice
export const createSalesInvoice = createAsyncThunk(
  'sales/createSalesInvoice',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createSalesInvoice, invoiceData);
      const data = extractResponseData(response);

      // Backend returns HTTP 200 even on failure, as { success: false, message: "..." }.
      // Treat that as a real failure instead of trusting the HTTP status alone.
      if (data && data.success === false) {
        dispatch(showNotification({
          message: data.message || 'Failed to create sales invoice',
          severity: 'warning',
          title: 'Failed to create sales invoice',
        }));
        return rejectWithValue(data.message || 'Failed to create sales invoice');
      }

      const successMessage = extractSuccessMessage(response) || 'Sales Invoice created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        salesInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create sales invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Sales Invoice
export const updateSalesInvoice = createAsyncThunk(
  'sales/updateSalesInvoice',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateSalesInvoice, invoiceData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Sales Invoice updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        salesInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update sales invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel Sales Invoice
export const cancelSalesInvoice = createAsyncThunk(
  'sales/cancelSalesInvoice',
  async ({ name, reason }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.cancelSalesInvoice, { name, reason });
      const successMessage = extractSuccessMessage(response) || 'Sales Invoice cancelled successfully';
      
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
        title: 'Failed to cancel sales invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Submit Draft Invoice
export const submitInvoice = createAsyncThunk(
  'sales/submitInvoice',
  async ({ name, invoice_type }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.submitInvoice, { name, invoice_type });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Invoice submitted successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        invoice: data?.data || data,
        invoice_type: invoice_type || 'sales_invoice',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to submit invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================
// POS INVOICE MANAGEMENT - Async Thunks
// ============================================

// List POS Invoices
export const listPOSInvoices = createAsyncThunk(
  'sales/listPOSInvoices',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listPOSInvoices, { params });
      const data = extractResponseData(response);
      return {
        posInvoices: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch POS invoices',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get POS Invoice Details
export const getPOSInvoice = createAsyncThunk(
  'sales/getPOSInvoice',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getPOSInvoice, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        posInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch POS invoice details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create POS Invoice
export const createPOSInvoice = createAsyncThunk(
  'sales/createPOSInvoice',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createPOSInvoice, invoiceData);
      const data = extractResponseData(response);

      if (data && data.success === false) {
        dispatch(showNotification({
          message: data.message || 'Failed to create POS invoice',
          severity: 'warning',
          title: 'Failed to create POS invoice',
        }));
        return rejectWithValue(data.message || 'Failed to create POS invoice');
      }

      // The till shows its own "Sale complete" screen; this is just a short confirmation
      dispatch(showNotification({
        message: 'Sale saved.',
        severity: 'success',
        duration: 2500,
      }));
      
      return {
        posInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create POS invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update POS Invoice
export const updatePOSInvoice = createAsyncThunk(
  'sales/updatePOSInvoice',
  async (invoiceData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updatePOSInvoice, invoiceData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'POS Invoice updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        posInvoice: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update POS invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel POS Invoice
export const cancelPOSInvoice = createAsyncThunk(
  'sales/cancelPOSInvoice',
  async ({ name, reason }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.cancelPOSInvoice, { name, reason });
      const successMessage = extractSuccessMessage(response) || 'POS Invoice cancelled successfully';
      
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
        title: 'Failed to cancel POS invoice',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create POS Opening Entry
export const createPOSOpeningEntry = createAsyncThunk(
  'sales/createPOSOpeningEntry',
  async (openingData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const user = state?.auth?.user;
      const userEmail = user?.email || user?.name || user?.user || '';
      
      // Get company from user profile
      const userCompany = user?.company ||
                         user?.custom_company ||
                         user?.company_name ||
                         user?.company_data?.name ||
                         user?.company_data?.company_name;

      const requestData = {
        pos_profile: openingData.pos_profile,
        company: openingData.company || userCompany,
        user: openingData.user || userEmail,
        ...(openingData.balance_details && { balance_details: openingData.balance_details }),
      };

      const response = await axiosInstance.post(ENDPOINTS.createPOSOpeningEntry, requestData);
      ensureSucceeded(response);
      const data = extractResponseData(response);
      // Plain words for the cashier; the server's message is about records, not selling
      dispatch(showNotification({
        message: 'Till open. You can start selling.',
        severity: 'success',
        title: 'Till open',
      }));
      
      return {
        openingEntry: data?.data || data,
        pos_profile: requestData.pos_profile,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Try to extract a user-friendly title from _server_messages
      let errorTitle = 'Failed to create POS opening entry';
      if (error.response?.data?._server_messages) {
        try {
          const messages = JSON.parse(error.response.data._server_messages);
          const validationError = messages.find(msg => {
            try {
              const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
              return parsed && 
                     parsed.title && 
                     parsed.title !== 'Value too big' && 
                     parsed.title !== 'Message' &&
                     parsed.message &&
                     parsed.indicator === 'red';
            } catch (e) {
              return false;
            }
          });
          
          if (validationError) {
            const parsed = typeof validationError === 'string' ? JSON.parse(validationError) : validationError;
            errorTitle = parsed.title || errorTitle;
          }
        } catch (e) {
          // Use default title if parsing fails
        }
      }
      
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: errorTitle,
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List POS Opening Entries
export const listPOSOpeningEntries = createAsyncThunk(
  'sales/listPOSOpeningEntries',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listPOSOpeningEntries, { params });
      ensureSucceeded(response);
      const data = extractResponseData(response);
      return {
        posOpeningEntries: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch POS opening entries',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get POS Opening Entry Details
export const getPOSOpeningEntry = createAsyncThunk(
  'sales/getPOSOpeningEntry',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getPOSOpeningEntry, {
        params: { name },
      });
      ensureSucceeded(response);
      const data = extractResponseData(response);
      return {
        posOpeningEntry: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch POS opening entry details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Close POS Opening Entry
export const closePOSOpeningEntry = createAsyncThunk(
  'sales/closePOSOpeningEntry',
  async ({ pos_opening_entry, do_not_submit = false }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.closePOSOpeningEntry, {
        pos_opening_entry,
        do_not_submit,
      });
      ensureSucceeded(response);
      const data = extractResponseData(response);
      dispatch(showNotification({
        message: 'Till closed. Your shift has ended.',
        severity: 'success',
        title: 'Till closed',
      }));
      
      return {
        closingEntry: data?.closing_entry || data?.data?.closing_entry,
        openingEntry: data?.opening_entry || data?.data?.opening_entry,
        fullData: data?.data || data,
        requestedName: pos_opening_entry,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to close POS opening entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel POS Opening Entry
export const cancelPOSOpeningEntry = createAsyncThunk(
  'sales/cancelPOSOpeningEntry',
  async ({ name, reason }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.cancelPOSOpeningEntry, { name, reason });
      ensureSucceeded(response);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'POS Opening Entry cancelled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'POS Opening Entry Cancelled',
      }));
      
      return {
        posOpeningEntry: data?.data || data,
        name,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to cancel POS opening entry',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================
// SALES RETURNS (CREDIT NOTES) - Async Thunks
// ============================================

// List Sales Returns
export const listSalesReturns = createAsyncThunk(
  'sales/listSalesReturns',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listSalesReturns, { params });
      const data = extractResponseData(response);
      return {
        salesReturns: Array.isArray(data) ? data : (data?.data || []),
        count: data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch sales returns',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Sales Return Details
export const getSalesReturn = createAsyncThunk(
  'sales/getSalesReturn',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getSalesReturn, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        salesReturn: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch sales return details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create Sales Return (Credit Note)
export const createSalesReturn = createAsyncThunk(
  'sales/createSalesReturn',
  async (returnData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createSalesReturn, returnData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Sales Return created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        salesReturn: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create sales return',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Cancel Sales Return
export const cancelSalesReturn = createAsyncThunk(
  'sales/cancelSalesReturn',
  async ({ name, reason }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.cancelSalesReturn, { name, reason });
      const successMessage = extractSuccessMessage(response) || 'Sales Return cancelled successfully';
      
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
        title: 'Failed to cancel sales return',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================
// PAYMENT METHODS - Async Thunks
// ============================================

// List Payment Methods
export const listPaymentMethods = createAsyncThunk(
  'sales/listPaymentMethods',
  async ({ company, only_enabled = true }, { dispatch, rejectWithValue }) => {
    try {
      const params = { only_enabled };
      if (company) {
        params.company = company;
      }
      const response = await axiosInstance.get(ENDPOINTS.listPaymentMethods, { params });
      const data = extractResponseData(response);
      return {
        paymentMethods: Array.isArray(data) ? data : (data?.data || []),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Don't show error notification for payment methods - it's not critical
      // The UI will fallback to hardcoded payment methods
      console.warn('Failed to fetch payment methods:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Receivable Account
export const getReceivableAccount = createAsyncThunk(
  'sales/getReceivableAccount',
  async ({ customer, company }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getReceivableAccount, {
        params: { customer, company },
      });
      const data = extractResponseData(response);
      return {
        receivableAccount: data?.account || data?.data?.account || null,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Show error notification as this is important for credit payments
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch receivable account',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create/Enable Credit Mode of Payment
export const createCreditModeOfPayment = createAsyncThunk(
  'sales/createCreditModeOfPayment',
  async ({ company, default_account, mop_type, currency, enabled }, { dispatch, rejectWithValue }) => {
    try {
      const payload = {
        company,
        default_account,
        ...(mop_type && { mop_type }),
        ...(currency && { currency }),
        ...(enabled !== undefined && { enabled }),
      };
      
      const response = await axiosInstance.post(ENDPOINTS.createCreditModeOfPayment, payload);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Credit mode of payment created/enabled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        paymentMethod: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create/enable credit mode of payment',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get POS Invoice Type
export const getPOSInvoiceType = createAsyncThunk(
  'sales/getPOSInvoiceType',
  async ({ company } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = {};
      if (company) {
        params.company = company;
      }
      const response = await axiosInstance.get(ENDPOINTS.getPOSInvoiceType, { params });
      const data = extractResponseData(response);
      return {
        invoiceType: data?.invoice_type || data?.data?.invoice_type || 'POS Invoice',
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Don't show error notification - it's not critical, will use default
      console.warn('Failed to fetch POS invoice type:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Set POS Invoice Type
export const setPOSInvoiceType = createAsyncThunk(
  'sales/setPOSInvoiceType',
  async ({ invoice_type, company }, { dispatch, rejectWithValue }) => {
    try {
      const payload = { invoice_type };
      if (company) {
        payload.company = company;
      }
      
      const response = await axiosInstance.post(ENDPOINTS.setPOSInvoiceType, payload);
      const successMessage = extractSuccessMessage(response) || 'POS invoice type updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        invoiceType: invoice_type,
        company: company || null,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update POS invoice type',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  // Sales Invoices
  salesInvoices: [],
  selectedSalesInvoice: null,
  
  // POS Invoices
  posInvoices: [],
  selectedPOSInvoice: null,
  posOpeningEntry: null,
  isPOSSessionOpen: false,
  
  // POS Opening Entries
  posOpeningEntries: [],
  selectedPOSOpeningEntry: null,
  posOpeningEntriesPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  posOpeningEntriesFilters: {
    pos_profile: '',
    company: '',
    user: '',
    status: '',
    from_date: '',
    to_date: '',
  },
  
  // Sales Returns
  salesReturns: [],
  selectedSalesReturn: null,
  
  // Payment Methods
  paymentMethods: [],
  receivableAccount: null,
  
  // POS Invoice Type
  posInvoiceType: 'POS Invoice', // Default value
  isLoadingPOSInvoiceType: false,
  
  // Pagination
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  posPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  returnsPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  
  // Filters
  filters: {
    search_term: '',
    customer: '',
    status: '',
    from_date: '',
    to_date: '',
    is_pos: undefined,
    company: '',
  },
  posFilters: {
    search_term: '',
    customer: '',
    status: '',
    from_date: '',
    to_date: '',
    pos_profile: '',
    company: '',
  },
  returnsFilters: {
    search_term: '',
    customer: '',
    status: '',
    from_date: '',
    to_date: '',
    return_against: '',
    company: '',
  },
  
  // Loading states
  isLoading: false,
  isLoadingDetails: false,
  isLoadingPOS: false,
  isLoadingPOSDetails: false,
  isLoadingPOSOpening: false,
  isLoadingPOSOpeningEntries: false,
  isLoadingPOSOpeningDetails: false,
  isClosingPOSOpening: false,
  isCancellingPOSOpening: false,
  isLoadingReturns: false,
  isLoadingReturnDetails: false,
  isLoadingPaymentMethods: false,
  isLoadingReceivableAccount: false,
  
  // Errors
  error: null,
};

// ============================================
// REDUX SLICE
// ============================================

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    clearSelectedSalesInvoice: (state) => {
      state.selectedSalesInvoice = null;
    },
    clearSelectedPOSInvoice: (state) => {
      state.selectedPOSInvoice = null;
    },
    clearSelectedSalesReturn: (state) => {
      state.selectedSalesReturn = null;
    },
    clearSelectedPOSOpeningEntry: (state) => {
      state.selectedPOSOpeningEntry = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Adopt a shift that is already open on the server (e.g. after a refresh or a restart of the till)
    resumePOSSession: (state, action) => {
      state.posOpeningEntry = action.payload;
      state.isPOSSessionOpen = true;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset to page 1 when filters change
      state.pagination.page = 1;
    },
    setPOSFilters: (state, action) => {
      state.posFilters = { ...state.posFilters, ...action.payload };
      // Reset to page 1 when filters change
      state.posPagination.page = 1;
    },
    setReturnsFilters: (state, action) => {
      state.returnsFilters = { ...state.returnsFilters, ...action.payload };
    },
    setPOSOpeningEntriesFilters: (state, action) => {
      state.posOpeningEntriesFilters = { ...state.posOpeningEntriesFilters, ...action.payload };
      // Reset to page 1 when filters change
      state.posOpeningEntriesPagination.page = 1;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    resetPOSFilters: (state) => {
      state.posFilters = initialState.posFilters;
      state.posPagination.page = 1;
    },
    resetReturnsFilters: (state) => {
      state.returnsFilters = initialState.returnsFilters;
    },
    resetPOSOpeningEntriesFilters: (state) => {
      state.posOpeningEntriesFilters = initialState.posOpeningEntriesFilters;
      state.posOpeningEntriesPagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    setPOSPage: (state, action) => {
      state.posPagination.page = action.payload;
    },
    setPageSize: (state, action) => {
      state.pagination.page_size = action.payload;
      // Reset to page 1 when page size changes
      state.pagination.page = 1;
    },
    setPOSPageSize: (state, action) => {
      state.posPagination.page_size = action.payload;
      // Reset to page 1 when page size changes
      state.posPagination.page = 1;
    },
    setReturnsPage: (state, action) => {
      state.returnsPagination.page = action.payload;
    },
    setPOSOpeningEntriesPage: (state, action) => {
      state.posOpeningEntriesPagination.page = action.payload;
    },
    setPOSOpeningEntriesPageSize: (state, action) => {
      state.posOpeningEntriesPagination.page_size = action.payload;
      // Reset to page 1 when page size changes
      state.posOpeningEntriesPagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // ============================================
      // SALES INVOICE REDUCERS
      // ============================================
      
      // List Sales Invoices
      .addCase(listSalesInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listSalesInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.salesInvoices = action.payload.salesInvoices || [];
        state.pagination.total = action.payload.count || 0;
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(listSalesInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get Sales Invoice
      .addCase(getSalesInvoice.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getSalesInvoice.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedSalesInvoice = action.payload.salesInvoice || null;
        // Update in list if exists
        const index = state.salesInvoices.findIndex(
          (inv) => inv.name === action.payload.salesInvoice?.name
        );
        if (index !== -1) {
          state.salesInvoices[index] = action.payload.salesInvoice;
        }
      })
      .addCase(getSalesInvoice.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      
      // Create Sales Invoice
      .addCase(createSalesInvoice.fulfilled, (state, action) => {
        if (action.payload.salesInvoice) {
          const newInvoice = action.payload.salesInvoice;
          // Add to beginning of list if not already there
          const exists = state.salesInvoices.some((inv) => inv.name === newInvoice.name);
          if (!exists) {
            state.salesInvoices.unshift(newInvoice);
            state.pagination.total += 1;
          }
          state.selectedSalesInvoice = newInvoice;
        }
      })
      
      // Update Sales Invoice
      .addCase(updateSalesInvoice.fulfilled, (state, action) => {
        if (action.payload.salesInvoice) {
          const updatedInvoice = action.payload.salesInvoice;
          const index = state.salesInvoices.findIndex(
            (inv) => inv.name === updatedInvoice.name
          );
          if (index !== -1) {
            state.salesInvoices[index] = { ...state.salesInvoices[index], ...updatedInvoice };
          }
          if (state.selectedSalesInvoice?.name === updatedInvoice.name) {
            state.selectedSalesInvoice = { ...state.selectedSalesInvoice, ...updatedInvoice };
          }
        }
      })
      
      // Cancel Sales Invoice
      .addCase(cancelSalesInvoice.fulfilled, (state, action) => {
        const index = state.salesInvoices.findIndex(
          (inv) => inv.name === action.payload.name
        );
        if (index !== -1) {
          state.salesInvoices[index] = {
            ...state.salesInvoices[index],
            status: 'Cancelled',
            docstatus: 2,
          };
        }
        if (state.selectedSalesInvoice?.name === action.payload.name) {
          state.selectedSalesInvoice = {
            ...state.selectedSalesInvoice,
            status: 'Cancelled',
            docstatus: 2,
          };
        }
      })
      
      // Submit Invoice
      .addCase(submitInvoice.fulfilled, (state, action) => {
        const invoiceType = action.payload.invoice_type || 'sales_invoice';
        const invoiceName = action.payload.invoice?.name;
        
        if (invoiceType === 'sales_invoice' && invoiceName) {
          const index = state.salesInvoices.findIndex((inv) => inv.name === invoiceName);
          if (index !== -1) {
            state.salesInvoices[index] = {
              ...state.salesInvoices[index],
              ...action.payload.invoice,
              docstatus: 1,
            };
          }
          if (state.selectedSalesInvoice?.name === invoiceName) {
            state.selectedSalesInvoice = {
              ...state.selectedSalesInvoice,
              ...action.payload.invoice,
              docstatus: 1,
            };
          }
        } else if (invoiceType === 'pos_invoice' && invoiceName) {
          const index = state.posInvoices.findIndex((inv) => inv.name === invoiceName);
          if (index !== -1) {
            state.posInvoices[index] = {
              ...state.posInvoices[index],
              ...action.payload.invoice,
              docstatus: 1,
            };
          }
          if (state.selectedPOSInvoice?.name === invoiceName) {
            state.selectedPOSInvoice = {
              ...state.selectedPOSInvoice,
              ...action.payload.invoice,
              docstatus: 1,
            };
          }
        }
      })
      
      // ============================================
      // POS INVOICE REDUCERS
      // ============================================
      
      // List POS Invoices
      .addCase(listPOSInvoices.pending, (state) => {
        state.isLoadingPOS = true;
        state.error = null;
      })
      .addCase(listPOSInvoices.fulfilled, (state, action) => {
        state.isLoadingPOS = false;
        state.posInvoices = action.payload.posInvoices || [];
        state.posPagination.total = action.payload.count || 0;
        state.posPagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.posPagination.page_size
        );
      })
      .addCase(listPOSInvoices.rejected, (state, action) => {
        state.isLoadingPOS = false;
        state.error = action.payload;
      })
      
      // Get POS Invoice
      .addCase(getPOSInvoice.pending, (state) => {
        state.isLoadingPOSDetails = true;
        state.error = null;
      })
      .addCase(getPOSInvoice.fulfilled, (state, action) => {
        state.isLoadingPOSDetails = false;
        state.selectedPOSInvoice = action.payload.posInvoice || null;
        const index = state.posInvoices.findIndex(
          (inv) => inv.name === action.payload.posInvoice?.name
        );
        if (index !== -1) {
          state.posInvoices[index] = action.payload.posInvoice;
        }
      })
      .addCase(getPOSInvoice.rejected, (state, action) => {
        state.isLoadingPOSDetails = false;
        state.error = action.payload;
      })
      
      // Create POS Invoice
      .addCase(createPOSInvoice.fulfilled, (state, action) => {
        if (action.payload.posInvoice) {
          const newInvoice = action.payload.posInvoice;
          const exists = state.posInvoices.some((inv) => inv.name === newInvoice.name);
          if (!exists) {
            state.posInvoices.unshift(newInvoice);
            state.posPagination.total += 1;
          }
          state.selectedPOSInvoice = newInvoice;
        }
      })
      
      // Update POS Invoice
      .addCase(updatePOSInvoice.fulfilled, (state, action) => {
        if (action.payload.posInvoice) {
          const updatedInvoice = action.payload.posInvoice;
          const index = state.posInvoices.findIndex(
            (inv) => inv.name === updatedInvoice.name
          );
          if (index !== -1) {
            state.posInvoices[index] = { ...state.posInvoices[index], ...updatedInvoice };
          }
          if (state.selectedPOSInvoice?.name === updatedInvoice.name) {
            state.selectedPOSInvoice = { ...state.selectedPOSInvoice, ...updatedInvoice };
          }
        }
      })
      
      // Cancel POS Invoice
      .addCase(cancelPOSInvoice.fulfilled, (state, action) => {
        const index = state.posInvoices.findIndex(
          (inv) => inv.name === action.payload.name
        );
        if (index !== -1) {
          state.posInvoices[index] = {
            ...state.posInvoices[index],
            status: 'Cancelled',
            docstatus: 2,
          };
        }
        if (state.selectedPOSInvoice?.name === action.payload.name) {
          state.selectedPOSInvoice = {
            ...state.selectedPOSInvoice,
            status: 'Cancelled',
            docstatus: 2,
          };
        }
      })
      
      // Create POS Opening Entry
      .addCase(createPOSOpeningEntry.pending, (state) => {
        state.isLoadingPOSOpening = true;
        state.error = null;
      })
      .addCase(createPOSOpeningEntry.fulfilled, (state, action) => {
        state.isLoadingPOSOpening = false;
        state.posOpeningEntry = action.payload.openingEntry;
        state.isPOSSessionOpen = true;
        state.posFilters.pos_profile = action.payload.pos_profile;
        // Add to list if not already there
        const exists = state.posOpeningEntries.some(
          (entry) => entry.name === action.payload.openingEntry?.name
        );
        if (!exists && action.payload.openingEntry) {
          state.posOpeningEntries.unshift(action.payload.openingEntry);
          state.posOpeningEntriesPagination.total += 1;
        }
      })
      .addCase(createPOSOpeningEntry.rejected, (state, action) => {
        state.isLoadingPOSOpening = false;
        state.error = action.payload;
        state.isPOSSessionOpen = false;
      })
      
      // List POS Opening Entries
      .addCase(listPOSOpeningEntries.pending, (state) => {
        state.isLoadingPOSOpeningEntries = true;
        state.error = null;
      })
      .addCase(listPOSOpeningEntries.fulfilled, (state, action) => {
        state.isLoadingPOSOpeningEntries = false;
        state.posOpeningEntries = action.payload.posOpeningEntries || [];
        state.posOpeningEntriesPagination.total = action.payload.count || 0;
        state.posOpeningEntriesPagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.posOpeningEntriesPagination.page_size
        );
      })
      .addCase(listPOSOpeningEntries.rejected, (state, action) => {
        state.isLoadingPOSOpeningEntries = false;
        state.error = action.payload;
      })
      
      // Get POS Opening Entry
      .addCase(getPOSOpeningEntry.pending, (state) => {
        state.isLoadingPOSOpeningDetails = true;
        state.error = null;
      })
      .addCase(getPOSOpeningEntry.fulfilled, (state, action) => {
        state.isLoadingPOSOpeningDetails = false;
        state.selectedPOSOpeningEntry = action.payload.posOpeningEntry || null;
        // Update in list if exists
        const index = state.posOpeningEntries.findIndex(
          (entry) => entry.name === action.payload.posOpeningEntry?.name
        );
        if (index !== -1) {
          state.posOpeningEntries[index] = action.payload.posOpeningEntry;
        }
        // Update current opening entry if it matches
        if (state.posOpeningEntry?.name === action.payload.posOpeningEntry?.name) {
          state.posOpeningEntry = action.payload.posOpeningEntry;
        }
      })
      .addCase(getPOSOpeningEntry.rejected, (state, action) => {
        state.isLoadingPOSOpeningDetails = false;
        state.error = action.payload;
      })
      
      // Close POS Opening Entry
      .addCase(closePOSOpeningEntry.pending, (state) => {
        state.isClosingPOSOpening = true;
        state.error = null;
      })
      .addCase(closePOSOpeningEntry.fulfilled, (state, action) => {
        state.isClosingPOSOpening = false;
        const closedName = action.payload.openingEntry?.name || action.payload.requestedName;

        const index = state.posOpeningEntries.findIndex((entry) => entry.name === closedName);
        if (index !== -1) {
          state.posOpeningEntries[index] = {
            ...state.posOpeningEntries[index],
            ...(action.payload.openingEntry || {}),
            status: 'Closed',
          };
        }
        if (state.selectedPOSOpeningEntry?.name === closedName) {
          state.selectedPOSOpeningEntry = {
            ...state.selectedPOSOpeningEntry,
            ...(action.payload.openingEntry || {}),
            status: 'Closed',
          };
        }
        // Always close the current session if it's the one we asked to close,
        // regardless of whether the backend echoed back an "opening_entry" object
        if (state.posOpeningEntry?.name === closedName) {
          state.posOpeningEntry = {
            ...state.posOpeningEntry,
            ...(action.payload.openingEntry || {}),
            status: 'Closed',
          };
          state.isPOSSessionOpen = false;
        }
      })
      .addCase(closePOSOpeningEntry.rejected, (state, action) => {
        state.isClosingPOSOpening = false;
        state.error = action.payload;
      })
      
      // Cancel POS Opening Entry
      .addCase(cancelPOSOpeningEntry.pending, (state) => {
        state.isCancellingPOSOpening = true;
        state.error = null;
      })
      .addCase(cancelPOSOpeningEntry.fulfilled, (state, action) => {
        state.isCancellingPOSOpening = false;
        // Update opening entry in list
        if (action.payload.posOpeningEntry) {
          const index = state.posOpeningEntries.findIndex(
            (entry) => entry.name === action.payload.name
          );
          if (index !== -1) {
            state.posOpeningEntries[index] = {
              ...state.posOpeningEntries[index],
              ...action.payload.posOpeningEntry,
              status: 'Cancelled',
              docstatus: 2,
            };
          }
          // Update selected entry if it matches
          if (state.selectedPOSOpeningEntry?.name === action.payload.name) {
            state.selectedPOSOpeningEntry = {
              ...state.selectedPOSOpeningEntry,
              ...action.payload.posOpeningEntry,
              status: 'Cancelled',
              docstatus: 2,
            };
          }
          // Update current opening entry if it matches
          if (state.posOpeningEntry?.name === action.payload.name) {
            state.posOpeningEntry = {
              ...state.posOpeningEntry,
              ...action.payload.posOpeningEntry,
              status: 'Cancelled',
              docstatus: 2,
            };
            state.isPOSSessionOpen = false;
          }
        }
      })
      .addCase(cancelPOSOpeningEntry.rejected, (state, action) => {
        state.isCancellingPOSOpening = false;
        state.error = action.payload;
      })
      
      // ============================================
      // SALES RETURNS REDUCERS
      // ============================================
      
      // List Sales Returns
      .addCase(listSalesReturns.pending, (state) => {
        state.isLoadingReturns = true;
        state.error = null;
      })
      .addCase(listSalesReturns.fulfilled, (state, action) => {
        state.isLoadingReturns = false;
        state.salesReturns = action.payload.salesReturns || [];
        state.returnsPagination.total = action.payload.count || 0;
        state.returnsPagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.returnsPagination.page_size
        );
      })
      .addCase(listSalesReturns.rejected, (state, action) => {
        state.isLoadingReturns = false;
        state.error = action.payload;
      })
      
      // Get Sales Return
      .addCase(getSalesReturn.pending, (state) => {
        state.isLoadingReturnDetails = true;
        state.error = null;
      })
      .addCase(getSalesReturn.fulfilled, (state, action) => {
        state.isLoadingReturnDetails = false;
        state.selectedSalesReturn = action.payload.salesReturn || null;
        const index = state.salesReturns.findIndex(
          (ret) => ret.name === action.payload.salesReturn?.name
        );
        if (index !== -1) {
          state.salesReturns[index] = action.payload.salesReturn;
        }
      })
      .addCase(getSalesReturn.rejected, (state, action) => {
        state.isLoadingReturnDetails = false;
        state.error = action.payload;
      })
      
      // Create Sales Return
      .addCase(createSalesReturn.fulfilled, (state, action) => {
        if (action.payload.salesReturn) {
          const newReturn = action.payload.salesReturn;
          const exists = state.salesReturns.some((ret) => ret.name === newReturn.name);
          if (!exists) {
            state.salesReturns.unshift(newReturn);
            state.returnsPagination.total += 1;
          }
          state.selectedSalesReturn = newReturn;
        }
      })
      
      // Cancel Sales Return
      .addCase(cancelSalesReturn.fulfilled, (state, action) => {
        const index = state.salesReturns.findIndex(
          (ret) => ret.name === action.payload.name
        );
        if (index !== -1) {
          state.salesReturns[index] = {
            ...state.salesReturns[index],
            status: 'Cancelled',
            docstatus: 2,
          };
        }
        if (state.selectedSalesReturn?.name === action.payload.name) {
          state.selectedSalesReturn = {
            ...state.selectedSalesReturn,
            status: 'Cancelled',
            docstatus: 2,
          };
        }
      })
      
      // ============================================
      // PAYMENT METHODS REDUCERS
      // ============================================
      
      // List Payment Methods
      .addCase(listPaymentMethods.pending, (state) => {
        state.isLoadingPaymentMethods = true;
        state.error = null;
      })
      .addCase(listPaymentMethods.fulfilled, (state, action) => {
        state.isLoadingPaymentMethods = false;
        state.paymentMethods = action.payload.paymentMethods || [];
      })
      .addCase(listPaymentMethods.rejected, (state, action) => {
        state.isLoadingPaymentMethods = false;
        // Don't set error for payment methods - UI will fallback to hardcoded list
        // state.error = action.payload;
      })
      
      // Get Receivable Account
      .addCase(getReceivableAccount.pending, (state) => {
        state.isLoadingReceivableAccount = true;
        state.error = null;
      })
      .addCase(getReceivableAccount.fulfilled, (state, action) => {
        state.isLoadingReceivableAccount = false;
        state.receivableAccount = action.payload.receivableAccount || null;
      })
      .addCase(getReceivableAccount.rejected, (state, action) => {
        state.isLoadingReceivableAccount = false;
        state.receivableAccount = null;
        // Error is already handled in the thunk with notification
      })
      
      // ============================================
      // POS INVOICE TYPE REDUCERS
      // ============================================
      
      // Get POS Invoice Type
      .addCase(getPOSInvoiceType.pending, (state) => {
        state.isLoadingPOSInvoiceType = true;
      })
      .addCase(getPOSInvoiceType.fulfilled, (state, action) => {
        state.isLoadingPOSInvoiceType = false;
        state.posInvoiceType = action.payload.invoiceType || 'POS Invoice';
      })
      .addCase(getPOSInvoiceType.rejected, (state, action) => {
        state.isLoadingPOSInvoiceType = false;
        // Keep default value on error
      })
      
      // Set POS Invoice Type
      .addCase(setPOSInvoiceType.fulfilled, (state, action) => {
        state.posInvoiceType = action.payload.invoiceType || 'POS Invoice';
      });
  },
});

// Export actions
export const {
  resumePOSSession,
  clearSelectedSalesInvoice,
  clearSelectedPOSInvoice,
  clearSelectedSalesReturn,
  clearSelectedPOSOpeningEntry,
  clearError,
  setFilters,
  setPOSFilters,
  setReturnsFilters,
  setPOSOpeningEntriesFilters,
  resetFilters,
  resetPOSFilters,
  resetReturnsFilters,
  resetPOSOpeningEntriesFilters,
  setPage,
  setPOSPage,
  setPageSize,
  setPOSPageSize,
  setReturnsPage,
  setPOSOpeningEntriesPage,
  setPOSOpeningEntriesPageSize,
} = salesSlice.actions;

// Export reducer
export default salesSlice.reducer;

