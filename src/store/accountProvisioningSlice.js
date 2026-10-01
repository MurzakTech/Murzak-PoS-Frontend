import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountProvisioningClient } from '../api/accountProvisioningClient';
import { showNotification } from './notificationSlice';
import { extractAccountProvisioningError, handleAccountProvisioningError } from '../utils/accountProvisioningErrorHandler';

// Note: accountProvisioningClient already extracts response data
// So we work with the extracted data directly

// Initial state
const initialState = {
  status: null,
  accounts: [],
  accountsCount: 0,
  recommendedTypes: [],
  validation: null,
  loading: false,
  error: null,
  autoProvisioningStatus: null, // Track background provisioning status
};

// Async thunks

/**
 * Fetch provisional accounting status for a company
 */
export const fetchStatus = createAsyncThunk(
  'accountProvisioning/fetchStatus',
  async (company, { rejectWithValue }) => {
    try {
      const response = await accountProvisioningClient.getStatus(company);
      
      // Response is already extracted by the client
      if (response.success === false) {
        const error = extractAccountProvisioningError({ response: { data: response } });
        return rejectWithValue(error);
      }
      
      return response.data || response;
    } catch (error) {
      const normalizedError = extractAccountProvisioningError(error);
      return rejectWithValue(normalizedError);
    }
  }
);

/**
 * Fetch available provisional accounts
 */
export const fetchAccounts = createAsyncThunk(
  'accountProvisioning/fetchAccounts',
  async ({ company, options = {} }, { rejectWithValue }) => {
    try {
      const response = await accountProvisioningClient.listAccounts(company, options);
      
      // Response is already extracted by the client
      if (response.success === false) {
        const error = extractAccountProvisioningError({ response: { data: response } });
        return rejectWithValue(error);
      }
      
      const data = response.data || response;
      return {
        accounts: data.data || data.accounts || [],
        count: data.count || 0,
        recommendedTypes: data.recommended_types || data.recommendedTypes || [],
      };
    } catch (error) {
      const normalizedError = extractAccountProvisioningError(error);
      return rejectWithValue(normalizedError);
    }
  }
);

/**
 * Set default provisional account
 */
export const setAccount = createAsyncThunk(
  'accountProvisioning/setAccount',
  async ({ company, account, autoEnable = false }, { rejectWithValue, dispatch }) => {
    try {
      const response = await accountProvisioningClient.setDefaultAccount(company, account, {
        autoEnable,
      });
      
      // Response is already extracted by the client
      if (response.success === false) {
        const error = extractAccountProvisioningError({ response: { data: response } });
        return rejectWithValue(error);
      }
      
      const successMessage = response.message || 'Account set successfully';
      
      // Show success notification
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Account Set Successfully',
      }));
      
      // Refresh status after setting account
      dispatch(fetchStatus(company));
      
      return response.data || response;
    } catch (error) {
      const normalizedError = extractAccountProvisioningError(error);
      
      // Show error notification
      const errorInfo = handleAccountProvisioningError(normalizedError);
      dispatch(showNotification({
        message: errorInfo.message,
        severity: errorInfo.severity,
        title: 'Failed to Set Account',
      }));
      
      return rejectWithValue(normalizedError);
    }
  }
);

/**
 * Auto-configure provisional account
 */
export const autoConfigure = createAsyncThunk(
  'accountProvisioning/autoConfigure',
  async ({ company, options = {} }, { rejectWithValue, dispatch }) => {
    try {
      const response = await accountProvisioningClient.autoConfigure(company, options);
      
      // Response is already extracted by the client
      if (response.success === false) {
        const error = extractAccountProvisioningError({ response: { data: response } });
        return rejectWithValue(error);
      }
      
      const successMessage = response.message || 'Account auto-configured successfully';
      
      // Show success notification
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Account Auto-Configured',
      }));
      
      // Refresh status after auto-configuration
      dispatch(fetchStatus(company));
      
      return response.data || response;
    } catch (error) {
      const normalizedError = extractAccountProvisioningError(error);
      
      // Show error notification
      const errorInfo = handleAccountProvisioningError(normalizedError);
      dispatch(showNotification({
        message: errorInfo.message,
        severity: errorInfo.severity,
        title: 'Auto-Configuration Failed',
      }));
      
      return rejectWithValue(normalizedError);
    }
  }
);

/**
 * Validate provisional accounting setup
 */
export const validateSetup = createAsyncThunk(
  'accountProvisioning/validateSetup',
  async (company, { rejectWithValue }) => {
    try {
      const response = await accountProvisioningClient.validate(company);
      
      // Response is already extracted by the client
      if (response.success === false) {
        const error = extractAccountProvisioningError({ response: { data: response } });
        return rejectWithValue(error);
      }
      
      return response.data || response;
    } catch (error) {
      const normalizedError = extractAccountProvisioningError(error);
      return rejectWithValue(normalizedError);
    }
  }
);

// Slice
const accountProvisioningSlice = createSlice({
  name: 'accountProvisioning',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearStatus: (state) => {
      state.status = null;
    },
    clearAccounts: (state) => {
      state.accounts = [];
      state.accountsCount = 0;
      state.recommendedTypes = [];
    },
    clearValidation: (state) => {
      state.validation = null;
    },
    reset: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Status
      .addCase(fetchStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.error = null;
      })
      .addCase(fetchStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.accounts;
        state.accountsCount = action.payload.count;
        state.recommendedTypes = action.payload.recommendedTypes;
        state.error = null;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Set Account
      .addCase(setAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setAccount.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(setAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Auto Configure
      .addCase(autoConfigure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(autoConfigure.fulfilled, (state, action) => {
        state.loading = false;
        state.autoProvisioningStatus = 'success';
        state.error = null;
      })
      .addCase(autoConfigure.rejected, (state, action) => {
        state.loading = false;
        state.autoProvisioningStatus = 'failed';
        state.error = action.payload;
      })
      
      // Validate Setup
      .addCase(validateSetup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateSetup.fulfilled, (state, action) => {
        state.loading = false;
        state.validation = action.payload;
        state.error = null;
      })
      .addCase(validateSetup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearError, clearStatus, clearAccounts, clearValidation, reset } = 
  accountProvisioningSlice.actions;

// Export selectors
export const selectAccountProvisioning = (state) => state.accountProvisioning;
export const selectStatus = (state) => state.accountProvisioning.status;
export const selectAccounts = (state) => state.accountProvisioning.accounts;
export const selectAccountsCount = (state) => state.accountProvisioning.accountsCount;
export const selectRecommendedTypes = (state) => state.accountProvisioning.recommendedTypes;
export const selectValidation = (state) => state.accountProvisioning.validation;
export const selectLoading = (state) => state.accountProvisioning.loading;
export const selectError = (state) => state.accountProvisioning.error;
export const selectAutoProvisioningStatus = (state) => 
  state.accountProvisioning.autoProvisioningStatus;

// Export reducer
export default accountProvisioningSlice.reducer;

