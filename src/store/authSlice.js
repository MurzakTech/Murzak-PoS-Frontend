import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Full endpoint paths from your API
const ENDPOINTS = {
  login: 'techsavanna_pos.api.auth_api.login_user',
  register: 'techsavanna_pos.api.auth_api.register_user',
  me: 'techsavanna_pos.api.auth_api.get_current_user',
  refreshToken: 'techsavanna_pos.api.auth_api.refresh_token',
  updateProfile: 'techsavanna_pos.api.auth_api.update_user_profile',
  changePassword: 'techsavanna_pos.api.auth_api.change_password',
  getPOSIndustries: 'techsavanna_pos.api.industry_api.get_pos_industries',
  getUserIndustry: 'techsavanna_pos.api.industry_api.get_user_industry',
};

// Helper function to extract data from nested message response
const extractResponseData = (response) => {
  // API returns data wrapped in message object based on documentation
  // Response structure: { data: { message: { user: {...}, company: {...}, ... } } }
  
  // Debug: Log raw response structure
  if (process.env.NODE_ENV === 'development') {
    console.log('extractResponseData - Raw response.data:', response.data);
  }
  
  if (response.data?.message && typeof response.data.message === 'object') {
    // Check if message is the actual data object (has user, company, etc.) or if it's nested further
    const messageData = response.data.message;
    
    // Debug: Log message data
    if (process.env.NODE_ENV === 'development') {
      console.log('extractResponseData - messageData:', messageData);
    }
    
    // If message has a 'message' property that's an object, it might be double-nested
    if (messageData.message && typeof messageData.message === 'object') {
      if (process.env.NODE_ENV === 'development') {
        console.log('extractResponseData - Double-nested, returning messageData.message');
      }
      return messageData.message;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('extractResponseData - Returning messageData');
    }
    return messageData;
  }
  
  const result = response.data?.message || response.data;
  if (process.env.NODE_ENV === 'development') {
    console.log('extractResponseData - Fallback, returning:', result);
  }
  return result;
};

// Helper function to extract success message from response
const extractSuccessMessage = (response) => {
  // Check if message is a string at root level
  if (response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  // Check if message is nested in message object (new structure)
  if (response.data?.message && typeof response.data.message === 'object') {
    // The message object contains a 'message' property with the success message
    if (response.data.message.message && typeof response.data.message.message === 'string') {
      return response.data.message.message;
    }
  }
  return null;
};

// Helper function to extract error message
// Helper function to determine notification severity based on HTTP status code
const getErrorSeverity = (error) => errorSeverity(error);

const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to check if token is valid
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
};

/**
 * Initialize state from localStorage
 * 
 * isAuthenticated is determined by:
 * 1. Presence of a valid access_token in localStorage
 * 2. Token validity (not expired) checked via jwtDecode
 * 
 * The token is considered valid if:
 * - It exists in localStorage
 * - It can be decoded as a JWT
 * - The expiration time (exp) is greater than the current time
 * 
 * Note: isAuthenticated does NOT depend on the user object being present,
 * only on the token validity. This allows the app to remain authenticated
 * even if the user data hasn't been fetched yet.
 */
const getInitialState = () => {
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const userStr = localStorage.getItem('user');
  const apiKey = localStorage.getItem('api_key');
  const apiSecret = localStorage.getItem('api_secret');

  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }

  // isAuthenticated is determined solely by token presence and validity
  // It does NOT depend on user object being present
  const isAuthenticated = token && isTokenValid(token);

  return {
    user,
    token,
    refreshToken,
    apiKey,
    apiSecret,
    isAuthenticated,
    isLoading: false,
    error: null,
    passwordRequirements: null,
    industries: [],
    isLoadingIndustries: false,
  };
};

// Async thunks
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.register, userData);
      
      // Handle structured backend validation errors
      if (response.data && response.data.success === false) {
          return rejectWithValue(response.data);
      }
      
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      // New response structure: access_token, refresh_token are directly in message object
      const { access_token, refresh_token, user, api_key, api_secret, token_type, expires_in, expires_at, pos_industry } = data;
      
      // Store in localStorage
      if (access_token) localStorage.setItem('access_token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      if (api_key) localStorage.setItem('api_key', api_key);
      if (api_secret) localStorage.setItem('api_secret', api_secret);

      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Registration Successful',
        }));
      }

      return {
        user,
        token: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
        expiresAt: expires_at,
        apiKey: api_key,
        apiSecret: api_secret,
        pos_industry: pos_industry || null,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Registration Failed',
      }));
      
      const backendError = error.response?.data?.message || error.response?.data;

      if (backendError && typeof backendError === "object") {
        return rejectWithValue({
          code: backendError.code || "ERROR",
          message: errorMessage,
          requirements: Array.isArray(backendError.requirements) ? backendError.requirements : null,
        });
      }

      return rejectWithValue({
        code: "NETWORK_ERROR",
        message: errorMessage,
        requirements: null,
      });
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, phone, password }, { rejectWithValue, dispatch }) => {
    try {
      // The server's login_user takes a single "email" field and drops any other, so a
      // phone number travels in that field too. The server (Frappe) then finds the user by
      // mobile number when System Settings > "Allow Login using Mobile Number" is on.
      const response = await axiosInstance.post(ENDPOINTS.login, {
        email: email || phone,
        password,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      // New response structure: access_token, refresh_token are directly in message object
      const { access_token, refresh_token, user, api_key, token_type, expires_in, expires_at } = data;
      
      // Store in localStorage
      if (access_token) localStorage.setItem('access_token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      if (api_key) localStorage.setItem('api_key', api_key);

      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Login Successful',
        }));
      }

      return {
        user,
        token: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
        expiresAt: expires_at,
        apiKey: api_key,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Login Failed',
      }));
      
      const backendError = error.response?.data?.message || error.response?.data;
      if (backendError && typeof backendError === "object") {
        return rejectWithValue({
          code: backendError.code || "ERROR",
          message: errorMessage,
        });
      }

      return rejectWithValue({ code: "NETWORK_ERROR", message: errorMessage });
    }
  }
);

/**
 * Fetches the current user's full profile from the API.
 * 
 * This function retrieves the complete user profile including:
 * - User basic info (name, email, etc.)
 * - Company information
 * - POS profile
 * - Roles and permissions
 * - Default warehouse
 * - POS industry
 * 
 * The response structure from the API is:
 * {
 *   "message": {
 *     "user": {...},
 *     "company": {...},
 *     "pos_profile": {...},
 *     "pos_industry": {...},
 *     "roles": [...],
 *     "permissions": {...},
 *     "default_warehouse": "..."
 *   }
 * }
 * 
 * This function merges all this data into a single userProfile object
 * and stores it in both Redux state and localStorage.
 */
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.me);
      const data = extractResponseData(response);
      
      // New response structure: { user: {...}, company: {...}, pos_profile: {...}, default_warehouse: "...", pos_industry: {...}, roles: [...], permissions: {...} }
      const userData = data.user || data;
      const companyData = data.company || null;
      const posProfileData = data.pos_profile || null;
      const defaultWarehouseName = data.default_warehouse || null;
      const posIndustryData = data.pos_industry || null;
      const userRoles = data.roles || userData.roles || [];
      const userPermissions = data.permissions || null;
      
      // Merge user and company data into a comprehensive userProfile
      const userProfile = {
        ...userData,
        // Store roles array for role-based access control
        roles: Array.isArray(userRoles) ? userRoles : [],
        // Store permissions object
        permissions: userPermissions,
        // Add company information to user object for easy access
        company: companyData?.name || companyData?.company_name || null,
        company_name: companyData?.company_name || companyData?.name || null,
        company_abbr: companyData?.abbr || null,
        company_currency: companyData?.default_currency || null,
        company_country: companyData?.country || null,
        company_tax_id: companyData?.tax_id || null,
        company_phone: companyData?.phone_no || null,
        company_email: companyData?.email || null,
        company_website: companyData?.website || null,
        company_address: companyData?.address || null,
        // Store full company object for reference
        company_data: companyData,
        // Store POS profile information
        pos_profile: posProfileData?.name || null,
        pos_profile_data: posProfileData,
        // Store default warehouse name
        default_warehouse: defaultWarehouseName,
        // Store POS industry information
        pos_industry: posIndustryData,
        pos_industry_code: posIndustryData?.name || posIndustryData?.industry_code || null,
        pos_industry_name: posIndustryData?.industry_name || null,
      };
      
      // Store complete user profile in localStorage
      localStorage.setItem('user', JSON.stringify(userProfile));
      
      // Also store company separately if needed
      if (companyData) {
        localStorage.setItem('company', JSON.stringify(companyData));
      }
      
      // Store POS profile separately if needed
      if (posProfileData) {
        localStorage.setItem('pos_profile', JSON.stringify(posProfileData));
      }
      
      return userProfile;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch user profile',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.refreshToken);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      // New response structure: access_token, refresh_token are directly in message object
      const { access_token, refresh_token, token_type, expires_in, expires_at } = data;
      
      // Store in localStorage
      if (access_token) localStorage.setItem('access_token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Token Refreshed',
        }));
      }
      
      return {
        token: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
        expiresAt: expires_at,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Token Refresh Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(ENDPOINTS.updateProfile, profileData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      const user = data.user;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Profile Updated',
        }));
      }
      
      return user;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Profile Update Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ old_password, new_password }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.changePassword, {
        old_password,
        new_password,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || data.message || 'Password changed successfully';
      
      // Show success notification
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Password Changed',
      }));
      
      return successMessage;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Password Change Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const getPOSIndustries = createAsyncThunk(
  'auth/getPOSIndustries',
  async (params = { is_active: true }, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getPOSIndustries, { params });
      const data = extractResponseData(response);
      return data.industries || [];
    } catch (error) {
      // Check for CORS errors specifically
      const errorMessage = error.message || '';
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('Access-Control-Allow-Origin') ||
                         (!error.response && error.request);
      
      if (isCorsError) {
        const isDuplicateHeaderError = errorMessage.includes('multiple values') && 
                                      errorMessage.includes('Access-Control-Allow-Origin');
        
        const corsErrorMessage = isDuplicateHeaderError
          ? 'Server configuration error: Duplicate CORS headers detected. Please contact the server administrator to fix the CORS configuration.'
          : 'CORS error: Request blocked by browser. Please check server CORS configuration.';
        
        // Show user-friendly notification
        dispatch(showNotification({
          message: corsErrorMessage,
          severity: getErrorSeverity(error),
          title: 'Connection Error',
        }));
        
        return rejectWithValue(corsErrorMessage);
      }
      
      const errorMessageText = extractErrorMessage(error);
      return rejectWithValue(errorMessageText);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.apiKey = null;
      state.apiSecret = null;
      state.isAuthenticated = false;
      state.error = null;
      state.passwordRequirements = null;
      
      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('api_key');
      localStorage.removeItem('api_secret');
    },
    clearError: (state) => {
      state.error = null;
    },
    checkAuth: (state) => {
      const token = localStorage.getItem('access_token');
      if (token && isTokenValid(token)) {
        state.isAuthenticated = true;
        state.token = token;
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            state.user = JSON.parse(userStr);
          } catch (error) {
            console.error('Error parsing user from localStorage:', error);
          }
        }
      } else {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const user = action.payload.user;
        // Extract industry information from registration response if available
        if (action.payload.pos_industry) {
          user.pos_industry = action.payload.pos_industry;
          user.pos_industry_code = action.payload.pos_industry?.name || action.payload.pos_industry?.industry_code || null;
          user.pos_industry_name = action.payload.pos_industry?.industry_name || null;
        }
        state.user = user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.apiKey = action.payload.apiKey;
        state.apiSecret = action.payload.apiSecret;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        state.error = typeof payload === "string" ? payload : (payload?.message || "Registration failed");
        state.passwordRequirements = payload?.requirements || null;
        state.isAuthenticated = false;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.apiKey = action.payload.apiKey;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        state.error = typeof payload === "string" ? payload : (payload?.message || "Login failed");
        state.isAuthenticated = false;
      });

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Don't change isAuthenticated during fetch - keep it as is
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true; // Ensure authenticated state is set
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Don't change isAuthenticated on fetch failure - token might still be valid
        // Only clear auth if token is actually invalid (handled by 401 interceptor)
      });

    // Refresh token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // If token refresh fails, logout user
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      });

    // Update profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Get POS Industries
    builder
      .addCase(getPOSIndustries.pending, (state) => {
        state.isLoadingIndustries = true;
      })
      .addCase(getPOSIndustries.fulfilled, (state, action) => {
        state.isLoadingIndustries = false;
        state.industries = action.payload;
      })
      .addCase(getPOSIndustries.rejected, (state) => {
        state.isLoadingIndustries = false;
      });
  },
});

export const { logout, clearError, checkAuth } = authSlice.actions;
export default authSlice.reducer;

