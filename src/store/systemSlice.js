import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

const ENDPOINTS = {
  listModules: 'techsavanna_pos.api.system_api.list_modules',
  listDoctypes: 'techsavanna_pos.api.system_api.list_doctypes',
  getDoctypeDetails: 'techsavanna_pos.api.system_api.get_doctype_details',
};

// Helper function to extract data from nested message response
const extractResponseData = (response) => {
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract success message
const extractSuccessMessage = (response) => {
  if (response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  if (response.data?.message && typeof response.data.message === 'object') {
    if (response.data.message.message && typeof response.data.message.message === 'string') {
      return response.data.message.message;
    }
  }
  return null;
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// List all modules
export const listModules = createAsyncThunk(
  'system/listModules',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listModules, {
        credentials: 'include',
      });
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch modules',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List doctypes with optional filters and pagination
export const listDoctypes = createAsyncThunk(
  'system/listDoctypes',
  async (
    {
      module,
      is_submittable,
      is_custom,
      is_virtual,
      search,
      page = 1,
      page_size = 50,
    } = {},
    { dispatch, rejectWithValue }
  ) => {
    try {
      const params = {};
      if (module) params.module = module;
      if (is_submittable !== undefined && is_submittable !== null) {
        params.is_submittable = is_submittable;
      }
      if (is_custom !== undefined && is_custom !== null) {
        params.is_custom = is_custom;
      }
      if (is_virtual !== undefined && is_virtual !== null) {
        params.is_virtual = is_virtual;
      }
      if (search) params.search = search;
      params.page = page;
      params.page_size = page_size;

      const response = await axiosInstance.get(ENDPOINTS.listDoctypes, {
        params,
        credentials: 'include',
      });
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch doctypes',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get detailed information about a specific doctype
export const getDoctypeDetails = createAsyncThunk(
  'system/getDoctypeDetails',
  async (doctype, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getDoctypeDetails, {
        params: { doctype },
        credentials: 'include',
      });
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch doctype details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  modules: [],
  doctypes: [],
  selectedDoctype: null,
  doctypeDetails: null,
  isLoadingModules: false,
  isLoadingDoctypes: false,
  isLoadingDetails: false,
  filters: {
    module: null,
    is_submittable: null,
    is_custom: null,
    is_virtual: null,
    search: '',
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  error: null,
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSelectedDoctype: (state, action) => {
      state.selectedDoctype = action.payload;
    },
    clearSelectedDoctype: (state) => {
      state.selectedDoctype = null;
      state.doctypeDetails = null;
    },
  },
  extraReducers: (builder) => {
    // listModules
    builder
      .addCase(listModules.pending, (state) => {
        state.isLoadingModules = true;
        state.error = null;
      })
      .addCase(listModules.fulfilled, (state, action) => {
        state.isLoadingModules = false;
        state.modules = action.payload.modules || action.payload || [];
      })
      .addCase(listModules.rejected, (state, action) => {
        state.isLoadingModules = false;
        state.error = action.payload;
      });

    // listDoctypes
    builder
      .addCase(listDoctypes.pending, (state) => {
        state.isLoadingDoctypes = true;
        state.error = null;
      })
      .addCase(listDoctypes.fulfilled, (state, action) => {
        state.isLoadingDoctypes = false;
        state.doctypes = action.payload.doctypes || action.payload || [];
        
        // Normalize pagination response from server
        const serverPagination = action.payload.pagination || {};
        state.pagination = {
          page: serverPagination.page || state.pagination.page,
          pageSize: serverPagination.page_size || serverPagination.pageSize || state.pagination.pageSize,
          total: serverPagination.total || 0,
          totalPages: serverPagination.total_pages || serverPagination.totalPages || 0,
        };
      })
      .addCase(listDoctypes.rejected, (state, action) => {
        state.isLoadingDoctypes = false;
        state.error = action.payload;
      });

    // getDoctypeDetails
    builder
      .addCase(getDoctypeDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getDoctypeDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.doctypeDetails = action.payload;
        if (action.payload?.name) {
          state.selectedDoctype = action.payload.name;
        }
      })
      .addCase(getDoctypeDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  setPagination,
  clearFilters,
  setSelectedDoctype,
  clearSelectedDoctype,
} = systemSlice.actions;

export default systemSlice.reducer;

