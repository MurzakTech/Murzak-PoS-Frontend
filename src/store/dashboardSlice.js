import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Dashboard API endpoints
const ENDPOINTS = {
  getDashboardMetrics: 'techsavanna_pos.api.dashboard_api.get_dashboard_metrics',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // API returns { message: { success: true, data: {...}, filters: {...} } }
  // Check for nested message structure first
  if (response.data?.message) {
    const message = response.data.message;
    
    // Check if message is an object with success, data, and filters
    if (typeof message === 'object' && message.success && message.data) {
      return {
        data: message.data,
        filters: message.filters || {},
      };
    }
    
    // If message is directly the data object (without success wrapper)
    if (typeof message === 'object' && message.data) {
      return {
        data: message.data,
        filters: message.filters || {},
      };
    }
    
    // If message is the data itself (legacy format)
    return {
      data: message,
      filters: response.data?.filters || {},
    };
  }
  
  // Fallback: check for direct success/data structure (without message wrapper)
  if (response.data?.success && response.data?.data) {
    return {
      data: response.data.data,
      filters: response.data.filters || {},
    };
  }
  
  // Last fallback: assume response.data is the data
  return {
    data: response.data || {},
    filters: {},
  };
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Get dashboard metrics
export const getDashboardMetrics = createAsyncThunk(
  'dashboard/getDashboardMetrics',
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
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.getDashboardMetrics, requestParams)
        : await axiosInstance.get(ENDPOINTS.getDashboardMetrics, { params: requestParams });
      
      const extracted = extractResponseData(response);
      
      return {
        data: extracted.data || {},
        filters: extracted.filters || params,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch dashboard metrics',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  stats: null,
  salesLast30Days: [],
  monthlySales: [],
  salesDue: [],
  purchasesDue: [],
  stockAlerts: [],
  pendingShipments: [],
  filters: {
    period: '30days',
    warehouse: '',
    staff: '',
    from_date: null,
    to_date: null,
  },
  isLoading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDashboardMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDashboardMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        const { data, filters } = action.payload;
        
        // Update all dashboard data
        state.stats = data.stats || null;
        state.salesLast30Days = data.salesLast30Days || [];
        state.monthlySales = data.monthlySales || [];
        state.salesDue = data.salesDue || [];
        state.purchasesDue = data.purchasesDue || [];
        state.stockAlerts = data.stockAlerts || [];
        state.pendingShipments = data.pendingShipments || [];
        state.filters = filters || state.filters;
        state.error = null;
      })
      .addCase(getDashboardMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setFilters, resetFilters } = dashboardSlice.actions;
export default dashboardSlice.reducer;

