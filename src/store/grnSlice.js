import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchGRNList, fetchGRNDetails } from '../api/reportsApi';
import { showNotification } from './notificationSlice';
import { errorSeverity } from '../utils/friendlyError';

// Async thunks
export const listGRNs = createAsyncThunk(
  'grn/listGRNs',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetchGRNList(params);
      
      // Handle API response structure: { success: true, data: [...], meta: {...} }
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch GRNs');
      }
      
      return {
        grns: response.data || [],
        meta: response.meta || {
          page: params.page || 1,
          page_size: params.page_size || 20,
          total: 0,
          total_pages: 0,
        },
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch GRNs';
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Error',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getGRNDetails = createAsyncThunk(
  'grn/getGRNDetails',
  async ({ grn_no }, { dispatch, rejectWithValue }) => {
    try {
      if (!grn_no) {
        throw new Error('GRN number is required');
      }
      
      const response = await fetchGRNDetails({ grn_no });
      
      // Handle API response structure: { success: true, data: {...} }
      if (!response.success) {
        throw new Error(response.message || 'GRN not found');
      }
      
      return {
        grn: response.data,
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch GRN details';
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Error',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Initial state
const initialState = {
  grns: [],
  selectedGRN: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    company: '',
    supplier: '',
    purchase_order: '',
    warehouse: '',
    start_date: '',
    end_date: '',
    status: '',
    docstatus: undefined, // undefined = exclude cancelled by default
  },
  isLoading: false,
  isLoadingDetails: false,
  error: null,
};

// Slice
const grnSlice = createSlice({
  name: 'grn',
  initialState,
  reducers: {
    clearSelectedGRN: (state) => {
      state.selectedGRN = null;
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
      state.pagination.page = 1; // Reset to first page when page size changes
    },
  },
  extraReducers: (builder) => {
    builder
      // List GRNs
      .addCase(listGRNs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listGRNs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.grns = action.payload.grns || [];
        state.pagination = {
          ...state.pagination,
          ...action.payload.meta,
        };
      })
      .addCase(listGRNs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get GRN Details
      .addCase(getGRNDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getGRNDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedGRN = action.payload.grn || null;
      })
      .addCase(getGRNDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedGRN,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} = grnSlice.actions;

export default grnSlice.reducer;
