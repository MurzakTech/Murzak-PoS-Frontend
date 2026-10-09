import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Staff API endpoints
const ENDPOINTS = {
  getAllRoles: 'techsavanna_pos.api.staff_api.get_all_roles',
  createStaffUser: 'techsavanna_pos.api.staff_api.create_staff_user',
  assignRoles: 'techsavanna_pos.api.staff_api.assign_roles_to_staff',
  getStaffUsers: 'techsavanna_pos.api.staff_api.get_staff_users',
  getStaffUserDetails: 'techsavanna_pos.api.staff_api.get_staff_user_details',
  updateStaffUser: 'techsavanna_pos.api.staff_api.update_staff_user',
  removeRoles: 'techsavanna_pos.api.staff_api.remove_roles_from_staff',
  disableStaffUser: 'techsavanna_pos.api.staff_api.disable_staff_user',
  enableStaffUser: 'techsavanna_pos.api.staff_api.enable_staff_user',
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

// Helper function to determine notification severity based on HTTP status code
const getErrorSeverity = (error) => errorSeverity(error);

// Async thunks
export const getAllRoles = createAsyncThunk(
  'staff/getAllRoles',
  async ({ search } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = {};
      if (search) params.search = search;
      
      const response = await axiosInstance.get(ENDPOINTS.getAllRoles, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch roles',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getStaffUsers = createAsyncThunk(
  'staff/getStaffUsers',
  async ({ company, enabledOnly } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = {};
      if (company) params.company = company;
      if (enabledOnly !== undefined) params.enabled_only = enabledOnly;
      
      const response = await axiosInstance.get(ENDPOINTS.getStaffUsers, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch staff users',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getStaffUserDetails = createAsyncThunk(
  'staff/getStaffUserDetails',
  async (userEmail, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getStaffUserDetails, {
        params: { user_email: userEmail },
      });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch staff user details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const createStaffUser = createAsyncThunk(
  'staff/createStaffUser',
  async (staffData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createStaffUser, staffData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Staff user created successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create staff user',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateStaffUser = createAsyncThunk(
  'staff/updateStaffUser',
  async ({ userEmail, ...updateData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(ENDPOINTS.updateStaffUser, {
        user_email: userEmail,
        ...updateData,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Staff user updated successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update staff user',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const assignRolesToStaff = createAsyncThunk(
  'staff/assignRoles',
  async ({ userEmail, roles, replaceExisting = false }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.assignRoles, {
        user_email: userEmail,
        roles,
        replace_existing: replaceExisting,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Roles assigned successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to assign roles',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeRolesFromStaff = createAsyncThunk(
  'staff/removeRoles',
  async ({ userEmail, roles }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.removeRoles, {
        user_email: userEmail,
        roles,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Roles removed successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to remove roles',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const disableStaffUser = createAsyncThunk(
  'staff/disableStaffUser',
  async (userEmail, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.disableStaffUser, {
        user_email: userEmail,
      });
      const successMessage = extractSuccessMessage(response) || 'Staff user disabled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { userEmail };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to disable staff user',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const enableStaffUser = createAsyncThunk(
  'staff/enableStaffUser',
  async (userEmail, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.enableStaffUser, {
        user_email: userEmail,
      });
      const successMessage = extractSuccessMessage(response) || 'Staff user enabled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { userEmail };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to enable staff user',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  staffUsers: [],
  roles: [],
  selectedStaffUser: null,
  isLoading: false,
  isLoadingRoles: false,
  error: null,
  count: 0,
  company: null,
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearSelectedStaffUser: (state) => {
      state.selectedStaffUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all roles
      .addCase(getAllRoles.pending, (state) => {
        state.isLoadingRoles = true;
        state.error = null;
      })
      .addCase(getAllRoles.fulfilled, (state, action) => {
        state.isLoadingRoles = false;
        state.roles = action.payload.roles || [];
      })
      .addCase(getAllRoles.rejected, (state, action) => {
        state.isLoadingRoles = false;
        state.error = action.payload;
      })
      // Get staff users
      .addCase(getStaffUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStaffUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.staffUsers = action.payload.staff_users || [];
        state.count = action.payload.count || 0;
        state.company = action.payload.company || null;
      })
      .addCase(getStaffUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get staff user details
      .addCase(getStaffUserDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStaffUserDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedStaffUser = action.payload.staff_user || null;
      })
      .addCase(getStaffUserDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create staff user
      .addCase(createStaffUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStaffUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.staff_user) {
          state.staffUsers.push(action.payload.staff_user);
          state.count += 1;
        }
      })
      .addCase(createStaffUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update staff user
      .addCase(updateStaffUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStaffUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.staff_user) {
          const index = state.staffUsers.findIndex(
            (user) => user.email === action.payload.staff_user.email
          );
          if (index !== -1) {
            state.staffUsers[index] = action.payload.staff_user;
          }
          if (state.selectedStaffUser?.email === action.payload.staff_user.email) {
            state.selectedStaffUser = action.payload.staff_user;
          }
        }
      })
      .addCase(updateStaffUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Assign roles
      .addCase(assignRolesToStaff.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignRolesToStaff.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.staff_user) {
          const index = state.staffUsers.findIndex(
            (user) => user.email === action.payload.staff_user.email
          );
          if (index !== -1) {
            state.staffUsers[index] = action.payload.staff_user;
          }
          if (state.selectedStaffUser?.email === action.payload.staff_user.email) {
            state.selectedStaffUser = action.payload.staff_user;
          }
        }
      })
      .addCase(assignRolesToStaff.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Remove roles
      .addCase(removeRolesFromStaff.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeRolesFromStaff.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.staff_user) {
          const index = state.staffUsers.findIndex(
            (user) => user.email === action.payload.staff_user.email
          );
          if (index !== -1) {
            state.staffUsers[index] = action.payload.staff_user;
          }
          if (state.selectedStaffUser?.email === action.payload.staff_user.email) {
            state.selectedStaffUser = action.payload.staff_user;
          }
        }
      })
      .addCase(removeRolesFromStaff.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Disable staff user
      .addCase(disableStaffUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disableStaffUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.staffUsers.findIndex(
          (user) => user.email === action.payload.userEmail
        );
        if (index !== -1) {
          state.staffUsers[index].enabled = 0;
        }
        if (state.selectedStaffUser?.email === action.payload.userEmail) {
          state.selectedStaffUser.enabled = 0;
        }
      })
      .addCase(disableStaffUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Enable staff user
      .addCase(enableStaffUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(enableStaffUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.staffUsers.findIndex(
          (user) => user.email === action.payload.userEmail
        );
        if (index !== -1) {
          state.staffUsers[index].enabled = 1;
        }
        if (state.selectedStaffUser?.email === action.payload.userEmail) {
          state.selectedStaffUser.enabled = 1;
        }
      })
      .addCase(enableStaffUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedStaffUser, clearError } = staffSlice.actions;
export default staffSlice.reducer;

