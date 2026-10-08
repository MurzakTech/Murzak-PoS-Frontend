import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { createWarehouse } from './warehouseSlice';
import { accountProvisioningClient } from '../api/accountProvisioningClient';
import { fetchCurrentUser } from './authSlice';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Onboarding API endpoints
const ENDPOINTS = {
  createCompany: 'techsavanna_pos.api.onboarding_api.create_company',
  createPOSProfile: 'techsavanna_pos.api.onboarding_api.create_pos_profile',
  createETIMSSettings: 'techsavanna_pos.api.onboarding_api.create_etims_settings',
  completeOnboarding: 'techsavanna_pos.api.onboarding_api.complete_onboarding',
  updateCompany: 'techsavanna_pos.api.onboarding_api.update_company',
  updatePOSProfile: 'techsavanna_pos.api.onboarding_api.update_pos_profile',
  updateETIMSSettings: 'techsavanna_pos.api.onboarding_api.update_etims_settings',
  getCompany: 'techsavanna_pos.api.onboarding_api.get_company',
  getPOSProfile: 'techsavanna_pos.api.onboarding_api.get_pos_profile',
  getETIMSSettings: 'techsavanna_pos.api.onboarding_api.get_etims_settings',
  checkAbbreviationExists: 'techsavanna_pos.api.onboarding_api.check_abbreviation_exists',
};

// Helper function to extract data from nested message response
const extractResponseData = (response) => {
  // API returns data wrapped in message object based on documentation
  // Check if response.data.message exists, otherwise use response.data
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract success message from response
const extractSuccessMessage = (response) => {
  // API documentation shows message field in response
  if (response.data?.message) {
    if (typeof response.data.message === 'string') {
      return response.data.message;
    }
    if (typeof response.data.message === 'object' && response.data.message.message) {
      return response.data.message.message;
    }
  }
  return null;
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Complete onboarding (all-in-one)
export const completeOnboarding = createAsyncThunk(
  'onboarding/complete',
  async (onboardingData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.completeOnboarding, onboardingData);
      const data = extractResponseData(response);
      
      // Store onboarding completion status
      localStorage.setItem('onboarding_completed', 'true');
      if (data.company) {
        localStorage.setItem('company', JSON.stringify(data.company));
      }
      
      return data;
    } catch (error) {
      const errorMessage = friendlyErrorMessage(error, 'We could not finish setting up your business. Please try again.');
      return rejectWithValue(errorMessage);
    }
  }
);

// Auto-provision account after company creation (background, silent)
export const autoProvisionAccount = createAsyncThunk(
  'onboarding/autoProvisionAccount',
  async (companyName, { rejectWithValue }) => {
    try {
      const response = await accountProvisioningClient.autoConfigure(companyName, {
        createAccountIfMissing: true,
      });
      
      // Log success in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Account auto-provisioned for company:', companyName, response);
      }
      
      return { company: companyName, accountData: response };
    } catch (error) {
      // Log error but don't block user flow or show notification
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Account auto-provisioning failed';
      
      // Log error in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('⚠️ Account auto-provisioning failed for company:', companyName, errorMessage);
      }
      
      // Don't reject - allow user to continue, they can configure manually later
      return { company: companyName, error: errorMessage };
    }
  }
);

// Create company only
export const createCompany = createAsyncThunk(
  'onboarding/createCompany',
  async (companyData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createCompany, companyData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      if (data.company) {
        localStorage.setItem('company', JSON.stringify(data.company));
        
        // Refresh user profile to include company information in Redux state
        // This ensures components that rely on user?.company have the latest data
        dispatch(fetchCurrentUser()).catch((err) => {
          // Log but don't block - company is already created
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to refresh user profile after company creation:', err);
          }
        });
        
        // Trigger background autoprovisioning (fire and forget)
        const companyName = data.company.name || data.company.company_name;
        if (companyName) {
          // Dispatch autoprovisioning in background - don't await
          // Errors are handled silently in autoProvisionAccount
          dispatch(autoProvisionAccount(companyName)).catch((err) => {
            // Silent failure - log only in development
            if (process.env.NODE_ENV === 'development') {
              console.error('Background autoprovisioning error:', err);
            }
          });
        }
      }
      
      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Company Created',
        }));
      }
      
      return { company: data.company, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Company Creation Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Auto-provision default warehouse after POS profile creation
export const autoProvisionDefaultWarehouse = createAsyncThunk(
  'onboarding/autoProvisionDefaultWarehouse',
  async ({ company, companyData }, { rejectWithValue, dispatch }) => {
    try {
      // Extract warehouse data from company information
      const warehouseData = {
        warehouse_name: company.company_name || company.name,
        company: company.name || company.company_name,
        warehouse_type: 'Company Warehouse',
        set_as_default: true, // Always set as default
        is_main_depot: false,
        // Address from company
        address_line_1: companyData?.company_address?.address_line1 || '',
        address_line_2: companyData?.company_address?.address_line2 || '',
        city: companyData?.company_address?.city || '',
        state: companyData?.company_address?.state || '',
        pin: companyData?.company_address?.pincode || '',
        // Contact from company
        phone_no: companyData?.company_contact?.phone || companyData?.company_address?.phone || '',
        mobile_no: companyData?.company_contact?.mobile || '',
        email_id: companyData?.company_contact?.email || companyData?.company_address?.email_id || '',
      };

      // Call createWarehouse from warehouseSlice
      const result = await dispatch(createWarehouse(warehouseData));
      
      if (createWarehouse.fulfilled.match(result)) {
        // Don't show notification - it's automatic and createWarehouse already shows one
        return { warehouse: result.payload.warehouse };
      } else {
        // Log error but don't fail onboarding
        console.error('Auto-provision warehouse failed:', result.error);
        return rejectWithValue('Failed to create default warehouse');
      }
    } catch (error) {
      console.error('Auto-provision warehouse error:', error);
      return rejectWithValue(error.message || 'Failed to provision warehouse');
    }
  }
);

// Create POS profile only
export const createPOSProfile = createAsyncThunk(
  'onboarding/createPOSProfile',
  async (posProfileData, { rejectWithValue, dispatch, getState }) => {
    try {
      // Extract companyData before sending to API (API doesn't need it)
      const { companyData, ...apiPayload } = posProfileData;
      
      const response = await axiosInstance.post(ENDPOINTS.createPOSProfile, apiPayload);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'POS Profile Created',
        }));
      }
      
      const posProfile = data.pos_profile;
      
      // Auto-provision default warehouse in background
      const state = getState();
      const company = state.onboarding.company;
      
      if (company && companyData) {
        // Auto-provision warehouse (non-blocking)
        dispatch(autoProvisionDefaultWarehouse({
          company,
          companyData, // Use extracted company data from form
        })).catch((error) => {
          // Log but don't block
          console.error('Auto-provision warehouse failed:', error);
          dispatch(showNotification({
            message: 'POS profile created, but default warehouse creation failed. You can create it manually.',
            severity: 'warning',
            title: 'Warehouse Provision Warning',
          }));
        });
      }
      
      return { posProfile, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'POS Profile Creation Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Create eTIMS settings only
export const createETIMSSettings = createAsyncThunk(
  'onboarding/createETIMSSettings',
  async (etimsData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createETIMSSettings, etimsData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      // Show success notification
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'eTIMS Settings Created',
        }));
      }
      
      return { etimsSettings: data.etims_settings, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      
      // Show error notification
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'eTIMS Settings Creation Failed',
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Get company details
export const getCompany = createAsyncThunk(
  'onboarding/getCompany',
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;
      
      if (!userCompany) {
        return rejectWithValue('Company not found');
      }

      const response = await axiosInstance.get(ENDPOINTS.getCompany, {
        params: { company: userCompany },
      });
      const data = extractResponseData(response);
      
      return { company: data.company || data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Update company
export const updateCompany = createAsyncThunk(
  'onboarding/updateCompany',
  async (companyData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateCompany, companyData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'Company Updated',
        }));
      }
      
      return { company: data.company, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Company Update Failed',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get POS profile
export const getPOSProfile = createAsyncThunk(
  'onboarding/getPOSProfile',
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;
      
      if (!userCompany) {
        return rejectWithValue('Company not found');
      }

      const response = await axiosInstance.get(ENDPOINTS.getPOSProfile, {
        params: { company: userCompany },
      });
      const data = extractResponseData(response);
      
      return { posProfile: data.pos_profile || data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Update POS profile
export const updatePOSProfile = createAsyncThunk(
  'onboarding/updatePOSProfile',
  async (posProfileData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updatePOSProfile, posProfileData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'POS Profile Updated',
        }));
      }
      
      return { posProfile: data.pos_profile, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'POS Profile Update Failed',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get eTIMS settings
export const getETIMSSettings = createAsyncThunk(
  'onboarding/getETIMSSettings',
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company || 
                         state?.auth?.user?.custom_company || 
                         state?.auth?.user?.company_name || 
                         state?.auth?.user?.company_data?.name || 
                         state?.auth?.user?.company_data?.company_name;
      
      if (!userCompany) {
        return rejectWithValue('Company not found');
      }

      const response = await axiosInstance.get(ENDPOINTS.getETIMSSettings, {
        params: { company: userCompany },
      });
      const data = extractResponseData(response);
      
      return { etimsSettings: data.etims_settings || data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Update eTIMS settings
export const updateETIMSSettings = createAsyncThunk(
  'onboarding/updateETIMSSettings',
  async (etimsData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateETIMSSettings, etimsData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response);
      
      if (successMessage) {
        dispatch(showNotification({
          message: successMessage,
          severity: 'success',
          title: 'eTIMS Settings Updated',
        }));
      }
      
      return { etimsSettings: data.etims_settings, message: successMessage };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'eTIMS Settings Update Failed',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Check if abbreviation exists
export const checkAbbreviationExists = createAsyncThunk(
  'onboarding/checkAbbreviationExists',
  async (abbr, { rejectWithValue }) => {
    try {
      if (!abbr || abbr.length < 2) {
        return { exists: false, abbr, valid: false };
      }

      const response = await axiosInstance.post(ENDPOINTS.checkAbbreviationExists, {
        abbr: abbr.toUpperCase(),
      });
      
      const data = extractResponseData(response);
      
      // extractResponseData already unwraps response.data.message, so data is the message object
      // Response structure: { message: { exists, abbr, company, message } }
      // After extractResponseData, data = { exists, abbr, company, message }
      return {
        exists: data.exists || false,
        abbr: data.abbr || abbr,
        company: data.company || null,
        message: data.message || null,
        valid: data.valid !== false,
      };
    } catch (error) {
      // If it's a 404 or similar, abbreviation doesn't exist (available)
      if (error.response?.status === 404) {
        return { exists: false, abbr, valid: true };
      }
      
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Check if onboarding is completed
// Onboarding is considered completed if:
// 1. onboarding_completed flag is set to true in localStorage, OR
// 2. User has company data in localStorage (staff users work for a company, so they don't need onboarding)
const isOnboardingCompleted = () => {
  const onboardingFlag = localStorage.getItem('onboarding_completed') === 'true';
  const companyStr = localStorage.getItem('company');
  const hasCompanyInStorage = !!companyStr;
  
  // If user has company data, they don't need onboarding (staff users)
  return onboardingFlag || hasCompanyInStorage;
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState: {
    company: null,
    posProfile: null,
    etimsSettings: null,
    isCompleted: isOnboardingCompleted(),
    isLoading: false,
    error: null,
    currentStep: 1,
    isCreatingWarehouse: false,
    defaultWarehouse: null,
    abbreviationCheck: {
      checking: false,
      exists: false,
      abbr: null,
      company: null,
      message: null,
      valid: true,
    },
  },
  reducers: {
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAbbreviationCheck: (state) => {
      state.abbreviationCheck = {
        checking: false,
        exists: false,
        abbr: null,
        company: null,
        message: null,
        valid: true,
      };
    },
    resetOnboarding: (state) => {
      state.company = null;
      state.posProfile = null;
      state.etimsSettings = null;
      state.isCompleted = false;
      state.currentStep = 1;
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('company');
    },
    // Update onboarding completion status based on company data
    // This is useful when company data is loaded after login (e.g., for staff users)
    checkOnboardingStatus: (state) => {
      const onboardingFlag = localStorage.getItem('onboarding_completed') === 'true';
      const companyStr = localStorage.getItem('company');
      const hasCompanyInStorage = !!companyStr;
      state.isCompleted = onboardingFlag || hasCompanyInStorage;
    },
  },
  extraReducers: (builder) => {
    // Complete onboarding
    builder
      .addCase(completeOnboarding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.company = action.payload.company;
        state.posProfile = action.payload.pos_profile;
        state.etimsSettings = action.payload.etims_settings;
        state.isCompleted = true;
        state.error = null;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Create company
    builder
      .addCase(createCompany.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.isLoading = false;
        state.company = action.payload.company;
        state.error = null;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Create POS profile
    builder
      .addCase(createPOSProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPOSProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posProfile = action.payload.posProfile;
        state.error = null;
        // Mark onboarding as completed if company and POS profile are both created
        if (state.company && state.posProfile) {
          state.isCompleted = true;
          localStorage.setItem('onboarding_completed', 'true');
        }
      })
      .addCase(createPOSProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Create eTIMS settings
    builder
      .addCase(createETIMSSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createETIMSSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.etimsSettings = action.payload.etimsSettings;
        state.error = null;
        // Mark onboarding as completed
        state.isCompleted = true;
        localStorage.setItem('onboarding_completed', 'true');
      })
      .addCase(createETIMSSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Auto-provision default warehouse
    builder
      .addCase(autoProvisionDefaultWarehouse.pending, (state) => {
        state.isCreatingWarehouse = true;
      })
      .addCase(autoProvisionDefaultWarehouse.fulfilled, (state, action) => {
        state.isCreatingWarehouse = false;
        state.defaultWarehouse = action.payload.warehouse;
      })
      .addCase(autoProvisionDefaultWarehouse.rejected, (state, action) => {
        state.isCreatingWarehouse = false;
        // Don't set error - allow onboarding to continue
      });

    // Get company
    builder
      .addCase(getCompany.fulfilled, (state, action) => {
        state.company = action.payload.company;
      });

    // Update company
    builder
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.company = action.payload.company;
      });

    // Get POS profile
    builder
      .addCase(getPOSProfile.fulfilled, (state, action) => {
        state.posProfile = action.payload.posProfile;
      });

    // Update POS profile
    builder
      .addCase(updatePOSProfile.fulfilled, (state, action) => {
        state.posProfile = action.payload.posProfile;
      });

    // Get eTIMS settings
    builder
      .addCase(getETIMSSettings.fulfilled, (state, action) => {
        state.etimsSettings = action.payload.etimsSettings;
      });

    // Update eTIMS settings
    builder
      .addCase(updateETIMSSettings.fulfilled, (state, action) => {
        state.etimsSettings = action.payload.etimsSettings;
      });

    // Check abbreviation exists
    builder
      .addCase(checkAbbreviationExists.pending, (state) => {
        state.abbreviationCheck.checking = true;
      })
      .addCase(checkAbbreviationExists.fulfilled, (state, action) => {
        state.abbreviationCheck.checking = false;
        state.abbreviationCheck.exists = action.payload.exists;
        state.abbreviationCheck.abbr = action.payload.abbr;
        state.abbreviationCheck.company = action.payload.company;
        state.abbreviationCheck.message = action.payload.message;
        state.abbreviationCheck.valid = action.payload.valid;
      })
      .addCase(checkAbbreviationExists.rejected, (state, action) => {
        state.abbreviationCheck.checking = false;
        state.abbreviationCheck.valid = true; // Assume valid on error to not block user
      });
  },
});

export const { setCurrentStep, clearError, clearAbbreviationCheck, resetOnboarding, checkOnboardingStatus } = onboardingSlice.actions;
export default onboardingSlice.reducer;

