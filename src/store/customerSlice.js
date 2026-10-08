import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Customer API endpoints - matching CUSTOMER_API_DOCUMENTATION.md
const ENDPOINTS = {
  createCustomer: 'techsavanna_pos.api.customer_api.create_customer',
  listCustomers: 'techsavanna_pos.api.customer_api.list_customers',
  getCustomer: 'techsavanna_pos.api.customer_api.get_customer',
  updateCustomer: 'techsavanna_pos.api.customer_api.update_customer',
  // Credit Limit endpoints
  setCreditLimit: 'techsavanna_pos.api.customer_api.set_customer_credit_limit',
  getCreditLimit: 'techsavanna_pos.api.customer_api.get_customer_credit_limit',
  getCreditHistory: 'techsavanna_pos.api.customer_api.get_customer_credit_history',
  removeCreditLimit: 'techsavanna_pos.api.customer_api.remove_customer_credit_limit',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // API returns { success: true, data: {...}, count: ... }
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

// Get Customer Groups (standard Frappe doctype, via generic get_list)
export const getCustomerGroups = createAsyncThunk(
  'customer/getCustomerGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('frappe.client.get_list', {
        params: {
          doctype: 'Customer Group',
          fields: JSON.stringify(['name', 'customer_group_name', 'is_group']),
          filters: JSON.stringify([['is_group', '=', 0]]),
          limit_page_length: 0,
          order_by: 'name asc',
        },
      });
      return response.data?.message || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch customer groups');
    }
  }
);

// Get Territories (standard Frappe doctype, via generic get_list)
export const getTerritories = createAsyncThunk(
  'customer/getTerritories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('frappe.client.get_list', {
        params: {
          doctype: 'Territory',
          fields: JSON.stringify(['name', 'territory_name', 'is_group']),
          filters: JSON.stringify([['is_group', '=', 0]]),
          limit_page_length: 0,
          order_by: 'name asc',
        },
      });
      return response.data?.message || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch territories');
    }
  }
);

// List customers (supports both GET and POST as per documentation)
export const listCustomers = createAsyncThunk(
  'customer/listCustomers',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;
      
      const requestParams = {
        ...params,
        // Include company if not already provided and available from state
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      // Use POST if params object has many fields, otherwise GET
      // According to documentation, both GET and POST are supported
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.listCustomers, requestParams)
        : await axiosInstance.get(ENDPOINTS.listCustomers, { params: requestParams });
      
      const data = extractResponseData(response);
      return {
        customers: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch customers',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get customer details (supports both GET and POST as per documentation)
export const getCustomer = createAsyncThunk(
  'customer/getCustomer',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      // Use GET by default, but support POST if needed
      const response = await axiosInstance.get(ENDPOINTS.getCustomer, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        customer: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch customer details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create customer
export const createCustomer = createAsyncThunk(
  'customer/createCustomer',
  async (customerData, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;
      
      const requestData = {
        ...customerData,
        // Include company if not already provided and available from state
        ...(customerData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createCustomer, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Customer created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        customer: {
          name: data?.name || response.data?.name,
          customer_name: data?.customer_name || customerData.customer_name,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create customer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update customer
export const updateCustomer = createAsyncThunk(
  'customer/updateCustomer',
  async (customerData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateCustomer, customerData);
      const successMessage = extractSuccessMessage(response) || 'Customer updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        customer: { name: customerData.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update customer',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Set customer credit limit
export const setCustomerCreditLimit = createAsyncThunk(
  'customer/setCustomerCreditLimit',
  async ({ customer, company, credit_limit, bypass_credit_limit_check = false }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state
      const state = getState();
      const userCompany = company || 
                         state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;

      if (!userCompany) {
        throw new Error('Company is required to set credit limit');
      }

      // Validate credit limit (must be >= 0)
      if (credit_limit < 0) {
        throw new Error('Credit limit cannot be negative');
      }

      const requestData = {
        customer,
        company: userCompany,
        credit_limit: parseFloat(credit_limit),
        bypass_credit_limit_check: Boolean(bypass_credit_limit_check),
      };

      const response = await axiosInstance.post(ENDPOINTS.setCreditLimit, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Credit limit updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        creditLimit: data || response.data?.data,
        customer,
        company: userCompany,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to set credit limit',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get customer credit limit
export const getCustomerCreditLimit = createAsyncThunk(
  'customer/getCustomerCreditLimit',
  async ({ customer, company = null }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state (optional for this endpoint)
      const state = getState();
      const userCompany = company || 
                         state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;

      const params = { customer };
      if (userCompany) {
        params.company = userCompany;
      }

      // Use GET or POST (both supported per documentation)
      const response = company 
        ? await axiosInstance.post(ENDPOINTS.getCreditLimit, params)
        : await axiosInstance.get(ENDPOINTS.getCreditLimit, { params });
      
      const data = extractResponseData(response);
      
      return {
        creditLimit: data?.credit_limits || data?.data?.credit_limits || data,
        customer,
        company: userCompany,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch credit limit',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get customer credit history
export const getCustomerCreditHistory = createAsyncThunk(
  'customer/getCustomerCreditHistory',
  async ({ 
    customer, 
    company = null, 
    from_date = null, 
    to_date = null, 
    limit = 50, 
    offset = 0 
  }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state (optional for this endpoint)
      const state = getState();
      const userCompany = company || 
                         state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;

      const params = {
        customer,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
      
      if (userCompany) {
        params.company = userCompany;
      }
      if (from_date) {
        params.from_date = from_date;
      }
      if (to_date) {
        params.to_date = to_date;
      }

      // Use POST for complex queries, GET for simple ones
      const response = Object.keys(params).length > 3
        ? await axiosInstance.post(ENDPOINTS.getCreditHistory, params)
        : await axiosInstance.get(ENDPOINTS.getCreditHistory, { params });
      
      const data = extractResponseData(response);
      
      return {
        history: data?.transactions || data?.data?.transactions || [],
        totalCount: data?.total_count || data?.data?.total_count || 0,
        creditSummary: data?.credit_summary || data?.data?.credit_summary || null,
        customer,
        company: userCompany,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch credit history',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Remove customer credit limit
export const removeCustomerCreditLimit = createAsyncThunk(
  'customer/removeCustomerCreditLimit',
  async ({ customer, company }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Ensure company is included if available from auth state
      const state = getState();
      const userCompany = company || 
                         state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;

      if (!userCompany) {
        throw new Error('Company is required to remove credit limit');
      }

      const requestData = {
        customer,
        company: userCompany,
      };

      const response = await axiosInstance.post(ENDPOINTS.removeCreditLimit, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Credit limit removed successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        creditLimit: data || response.data?.data,
        customer,
        company: userCompany,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to remove credit limit',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  customers: [],
  selectedCustomer: null,
  customerGroups: [],
  territories: [],
  isLoadingCustomerGroups: false,
  isLoadingTerritories: false,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    search_term: '',
    customer_group: '',
    territory: '',
    customer_type: '',
    disabled: false,
    filter_by_company_transactions: false,
  },
  isLoading: false,
  isLoadingDetails: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  // Credit Limit state
  creditLimit: null,
  creditHistory: [],
  creditHistoryPagination: {
    total: 0,
    limit: 50,
    offset: 0,
  },
  creditSummary: null,
  isLoadingCreditLimit: false,
  isLoadingCreditHistory: false,
  isUpdatingCreditLimit: false,
  creditLimitError: null,
};

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
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
    // Credit Limit reducers
    clearCreditLimit: (state) => {
      state.creditLimit = null;
      state.creditLimitError = null;
    },
    clearCreditHistory: (state) => {
      state.creditHistory = [];
      state.creditSummary = null;
      state.creditHistoryPagination = initialState.creditHistoryPagination;
    },
    clearCreditLimitError: (state) => {
      state.creditLimitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get customer groups
      .addCase(getCustomerGroups.pending, (state) => {
        state.isLoadingCustomerGroups = true;
      })
      .addCase(getCustomerGroups.fulfilled, (state, action) => {
        state.isLoadingCustomerGroups = false;
        state.customerGroups = action.payload || [];
      })
      .addCase(getCustomerGroups.rejected, (state) => {
        state.isLoadingCustomerGroups = false;
      })
      // Get territories
      .addCase(getTerritories.pending, (state) => {
        state.isLoadingTerritories = true;
      })
      .addCase(getTerritories.fulfilled, (state, action) => {
        state.isLoadingTerritories = false;
        state.territories = action.payload || [];
      })
      .addCase(getTerritories.rejected, (state) => {
        state.isLoadingTerritories = false;
      })
      // List customers
      .addCase(listCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload.customers || [];
        state.pagination.total = action.payload.count || 0;
        // Calculate total pages
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(listCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get customer details
      .addCase(getCustomer.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getCustomer.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedCustomer = action.payload.customer || null;
      })
      .addCase(getCustomer.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Create customer
      .addCase(createCustomer.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.customer) {
          // Add new customer to the beginning of the list
          state.customers.unshift(action.payload.customer);
          state.pagination.total += 1;
          // Recalculate total pages
          state.pagination.total_pages = Math.ceil(
            state.pagination.total / state.pagination.page_size
          );
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload;
      })
      // Update customer
      .addCase(updateCustomer.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.customer) {
          // Find and update customer in the list
          const index = state.customers.findIndex(
            (c) => c.name === action.payload.customer.name
          );
          if (index !== -1) {
            // The list will be refreshed by the component to get updated data
            // For now, we'll just mark that an update occurred
          }
          // Clear selected customer to force refresh if viewing details
          if (state.selectedCustomer?.name === action.payload.customer.name) {
            state.selectedCustomer = null;
          }
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })
      // Set customer credit limit
      .addCase(setCustomerCreditLimit.pending, (state) => {
        state.isUpdatingCreditLimit = true;
        state.creditLimitError = null;
      })
      .addCase(setCustomerCreditLimit.fulfilled, (state, action) => {
        state.isUpdatingCreditLimit = false;
        state.creditLimit = action.payload.creditLimit || null;
        // Update credit limit in customer list if it exists
        if (action.payload.customer) {
          const customerIndex = state.customers.findIndex(
            (c) => c.name === action.payload.customer
          );
          if (customerIndex !== -1 && action.payload.creditLimit) {
            state.customers[customerIndex] = {
              ...state.customers[customerIndex],
              credit_limit: action.payload.creditLimit.effective_credit_limit || action.payload.creditLimit.credit_limit,
              outstanding_amount: action.payload.creditLimit.outstanding_amount,
              available_credit: action.payload.creditLimit.available_credit,
              credit_utilization_percent: action.payload.creditLimit.credit_utilization_percent,
              is_over_limit: action.payload.creditLimit.is_over_limit,
            };
          }
        }
        // Update selected customer if it matches
        if (state.selectedCustomer?.name === action.payload.customer && action.payload.creditLimit) {
          if (!state.selectedCustomer.credit_limits) {
            state.selectedCustomer.credit_limits = [];
          }
          const creditLimitIndex = state.selectedCustomer.credit_limits.findIndex(
            (cl) => cl.company === action.payload.company
          );
          if (creditLimitIndex !== -1) {
            state.selectedCustomer.credit_limits[creditLimitIndex] = action.payload.creditLimit;
          } else {
            state.selectedCustomer.credit_limits.push(action.payload.creditLimit);
          }
        }
      })
      .addCase(setCustomerCreditLimit.rejected, (state, action) => {
        state.isUpdatingCreditLimit = false;
        state.creditLimitError = action.payload;
      })
      // Get customer credit limit
      .addCase(getCustomerCreditLimit.pending, (state) => {
        state.isLoadingCreditLimit = true;
        state.creditLimitError = null;
      })
      .addCase(getCustomerCreditLimit.fulfilled, (state, action) => {
        state.isLoadingCreditLimit = false;
        state.creditLimit = action.payload.creditLimit || null;
      })
      .addCase(getCustomerCreditLimit.rejected, (state, action) => {
        state.isLoadingCreditLimit = false;
        state.creditLimitError = action.payload;
      })
      // Get customer credit history
      .addCase(getCustomerCreditHistory.pending, (state) => {
        state.isLoadingCreditHistory = true;
        state.creditLimitError = null;
      })
      .addCase(getCustomerCreditHistory.fulfilled, (state, action) => {
        state.isLoadingCreditHistory = false;
        state.creditHistory = action.payload.history || [];
        state.creditHistoryPagination.total = action.payload.totalCount || 0;
        state.creditHistoryPagination.offset = action.payload.history?.length || 0;
        state.creditSummary = action.payload.creditSummary || null;
      })
      .addCase(getCustomerCreditHistory.rejected, (state, action) => {
        state.isLoadingCreditHistory = false;
        state.creditLimitError = action.payload;
      })
      // Remove customer credit limit
      .addCase(removeCustomerCreditLimit.pending, (state) => {
        state.isUpdatingCreditLimit = true;
        state.creditLimitError = null;
      })
      .addCase(removeCustomerCreditLimit.fulfilled, (state, action) => {
        state.isUpdatingCreditLimit = false;
        state.creditLimit = action.payload.creditLimit || null;
        // Update credit limit in customer list if it exists
        if (action.payload.customer) {
          const customerIndex = state.customers.findIndex(
            (c) => c.name === action.payload.customer
          );
          if (customerIndex !== -1 && action.payload.creditLimit) {
            state.customers[customerIndex] = {
              ...state.customers[customerIndex],
              credit_limit: action.payload.creditLimit.effective_credit_limit || action.payload.creditLimit.credit_limit,
              outstanding_amount: action.payload.creditLimit.outstanding_amount,
              available_credit: action.payload.creditLimit.available_credit,
              credit_utilization_percent: action.payload.creditLimit.credit_utilization_percent,
              is_over_limit: action.payload.creditLimit.is_over_limit,
            };
          }
        }
        // Update selected customer if it matches
        if (state.selectedCustomer?.name === action.payload.customer && action.payload.creditLimit) {
          if (!state.selectedCustomer.credit_limits) {
            state.selectedCustomer.credit_limits = [];
          }
          const creditLimitIndex = state.selectedCustomer.credit_limits.findIndex(
            (cl) => cl.company === action.payload.company
          );
          if (creditLimitIndex !== -1) {
            state.selectedCustomer.credit_limits[creditLimitIndex] = action.payload.creditLimit;
          } else {
            state.selectedCustomer.credit_limits.push(action.payload.creditLimit);
          }
        }
      })
      .addCase(removeCustomerCreditLimit.rejected, (state, action) => {
        state.isUpdatingCreditLimit = false;
        state.creditLimitError = action.payload;
      });
  },
});

export const {
  clearSelectedCustomer,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  clearCreditLimit,
  clearCreditHistory,
  clearCreditLimitError,
} = customerSlice.actions;

export default customerSlice.reducer;

