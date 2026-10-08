import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Supplier API endpoints - matching PURCHASE_API_DOCUMENTATION.md
const ENDPOINTS = {
  createSupplier: 'techsavanna_pos.api.supplier_api.create_supplier',
  getSuppliers: 'techsavanna_pos.api.supplier_api.get_suppliers',
  getSupplierDetails: 'techsavanna_pos.api.supplier_api.get_supplier_details',
  updateSupplier: 'techsavanna_pos.api.supplier_api.update_supplier',
  getSupplierGroups: 'techsavanna_pos.api.supplier_api.get_supplier_groups',
  createSupplierGroup: 'techsavanna_pos.api.supplier_api.create_supplier_group',
  updateSupplierGroup: 'techsavanna_pos.api.supplier_api.update_supplier_group',
  getSupplierGroupDetails: 'techsavanna_pos.api.supplier_api.get_supplier_group_details',
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

// Get suppliers (supports both GET and POST as per documentation)
export const getSuppliers = createAsyncThunk(
  'supplier/getSuppliers',
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
        ? await axiosInstance.post(ENDPOINTS.getSuppliers, requestParams)
        : await axiosInstance.get(ENDPOINTS.getSuppliers, { params: requestParams });
      
      const data = extractResponseData(response);
      return {
        suppliers: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch suppliers',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get supplier details
export const getSupplierDetails = createAsyncThunk(
  'supplier/getSupplierDetails',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getSupplierDetails, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        supplier: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch supplier details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Create supplier
export const createSupplier = createAsyncThunk(
  'supplier/createSupplier',
  async (supplierData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createSupplier, supplierData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Supplier created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        supplier: {
          name: data?.name || response.data?.name,
          supplier_name: data?.supplier_name || supplierData.supplier_name,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create supplier',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update supplier
export const updateSupplier = createAsyncThunk(
  'supplier/updateSupplier',
  async (supplierData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateSupplier, supplierData);
      const successMessage = extractSuccessMessage(response) || 'Supplier updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        supplier: { name: supplierData.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update supplier',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get supplier groups (supports both GET and POST)
export const getSupplierGroups = createAsyncThunk(
  'supplier/getSupplierGroups',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      // Use POST if params object is provided, otherwise GET
      const response = Object.keys(params).length > 0
        ? await axiosInstance.post(ENDPOINTS.getSupplierGroups, params)
        : await axiosInstance.get(ENDPOINTS.getSupplierGroups, { params });
      const data = extractResponseData(response);
      return {
        supplierGroups: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Create supplier group
export const createSupplierGroup = createAsyncThunk(
  'supplier/createSupplierGroup',
  async (groupData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createSupplierGroup, groupData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Supplier Group created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        supplierGroup: {
          name: data?.name || response.data?.name,
          supplier_group_name: data?.supplier_group_name || groupData.supplier_group_name,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create supplier group',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update supplier group
export const updateSupplierGroup = createAsyncThunk(
  'supplier/updateSupplierGroup',
  async (groupData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateSupplierGroup, groupData);
      const successMessage = extractSuccessMessage(response) || 'Supplier Group updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return {
        supplierGroup: { name: groupData.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update supplier group',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get supplier group details
export const getSupplierGroupDetails = createAsyncThunk(
  'supplier/getSupplierGroupDetails',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getSupplierGroupDetails, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        supplierGroup: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch supplier group details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  suppliers: [],
  supplierGroups: [],
  selectedSupplier: null,
  selectedSupplierGroup: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    search_term: '',
    supplier_group: '',
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingGroups: false,
  error: null,
};

const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
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
  },
  extraReducers: (builder) => {
    builder
      // Get suppliers
      .addCase(getSuppliers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.suppliers = action.payload.suppliers || [];
        state.pagination.total = action.payload.count || 0;
        // Calculate total pages
        state.pagination.total_pages = Math.ceil(
          (action.payload.count || 0) / state.pagination.page_size
        );
      })
      .addCase(getSuppliers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get supplier details
      .addCase(getSupplierDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getSupplierDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedSupplier = action.payload.supplier || null;
      })
      .addCase(getSupplierDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Create supplier
      .addCase(createSupplier.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.supplier) {
          state.suppliers.unshift(action.payload.supplier);
          state.pagination.total += 1;
        }
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update supplier
      .addCase(updateSupplier.fulfilled, (state, action) => {
        if (action.payload.supplier) {
          const index = state.suppliers.findIndex(
            (s) => s.name === action.payload.supplier.name
          );
          if (index !== -1) {
            // Refresh the list to get updated data
            // The list will be refreshed by the component
          }
          if (state.selectedSupplier?.name === action.payload.supplier.name) {
            state.selectedSupplier = null; // Clear to force refresh
          }
        }
      })
      // Get supplier groups
      .addCase(getSupplierGroups.pending, (state) => {
        state.isLoadingGroups = true;
      })
      .addCase(getSupplierGroups.fulfilled, (state, action) => {
        state.isLoadingGroups = false;
        state.supplierGroups = action.payload.supplierGroups || [];
      })
      .addCase(getSupplierGroups.rejected, (state) => {
        state.isLoadingGroups = false;
      })
      // Get supplier group details
      .addCase(getSupplierGroupDetails.pending, (state) => {
        state.isLoadingDetails = true;
      })
      .addCase(getSupplierGroupDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedSupplierGroup = action.payload.supplierGroup || null;
      })
      .addCase(getSupplierGroupDetails.rejected, (state) => {
        state.isLoadingDetails = false;
      })
      // Create supplier group
      .addCase(createSupplierGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSupplierGroup.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createSupplierGroup.rejected, (state) => {
        state.isLoading = false;
      })
      // Update supplier group
      .addCase(updateSupplierGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateSupplierGroup.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateSupplierGroup.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearSelectedSupplier, clearError, setFilters, resetFilters, setPage, setPageSize } = supplierSlice.actions;
export default supplierSlice.reducer;

