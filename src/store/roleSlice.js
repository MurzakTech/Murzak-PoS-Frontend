import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

const ENDPOINTS = {
  createRole: 'techsavanna_pos.api.role_api.create_role',
  updateRole: 'techsavanna_pos.api.role_api.update_role',
  deleteRole: 'techsavanna_pos.api.role_api.delete_role',
  disableRole: 'techsavanna_pos.api.role_api.disable_role',
  enableRole: 'techsavanna_pos.api.role_api.enable_role',
  assignPermissions: 'techsavanna_pos.api.role_api.assign_permissions_to_role',
  getRolePermissions: 'techsavanna_pos.api.role_api.get_role_permissions',
  removePermissions: 'techsavanna_pos.api.role_api.remove_permissions_from_role',
  listRoles: 'techsavanna_pos.api.role_api.list_roles',
  getRoleDetails: 'techsavanna_pos.api.role_api.get_role_details',
};

const extractResponseData = (response) => {
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

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

const extractErrorMessage = (error) => friendlyErrorMessage(error);

const createFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? 1 : 0);
      } else {
        formData.append(key, value);
      }
    }
  });
  return formData;
};

const normalizeRole = (role) => {
  if (!role) return null;
  return {
    ...role,
    disabled: Boolean(role.disabled),
    desk_access: Boolean(role.desk_access),
    two_factor_auth: Boolean(role.two_factor_auth),
    is_custom: Boolean(role.is_custom),
  };
};

const prepareRoleForAPI = (roleData) => {
  const prepared = { ...roleData };
  if ('disabled' in prepared && typeof prepared.disabled === 'boolean') {
    prepared.disabled = prepared.disabled ? 1 : 0;
  }
  if ('desk_access' in prepared && typeof prepared.desk_access === 'boolean') {
    prepared.desk_access = prepared.desk_access ? 1 : 0;
  }
  if ('two_factor_auth' in prepared && typeof prepared.two_factor_auth === 'boolean') {
    prepared.two_factor_auth = prepared.two_factor_auth ? 1 : 0;
  }
  if ('is_custom' in prepared && typeof prepared.is_custom === 'boolean') {
    prepared.is_custom = prepared.is_custom ? 1 : 0;
  }
  return prepared;
};

export const createRole = createAsyncThunk(
  'role/createRole',
  async (roleData, { dispatch, rejectWithValue }) => {
    try {
      const preparedData = prepareRoleForAPI(roleData);
      const formData = createFormData(preparedData);
      const response = await axiosInstance.post(ENDPOINTS.createRole, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Role created successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return normalizeRole(data.data || data);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to create role' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateRole = createAsyncThunk(
  'role/updateRole',
  async ({ roleName, ...updates }, { dispatch, rejectWithValue }) => {
    try {
      const preparedData = prepareRoleForAPI({ role_name: roleName, ...updates });
      const formData = createFormData(preparedData);
      const response = await axiosInstance.post(ENDPOINTS.updateRole, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Role updated successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return normalizeRole(data.data || data);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to update role' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteRole = createAsyncThunk(
  'role/deleteRole',
  async (roleName, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({ role_name: roleName });
      const response = await axiosInstance.post(ENDPOINTS.deleteRole, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const successMessage = extractSuccessMessage(response) || 'Role deleted successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return { roleName };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to delete role' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const disableRole = createAsyncThunk(
  'role/disableRole',
  async (roleName, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({ role_name: roleName });
      const response = await axiosInstance.post(ENDPOINTS.disableRole, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Role disabled successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return normalizeRole(data.data || { name: roleName, role_name: roleName, disabled: 1 });
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to disable role' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const enableRole = createAsyncThunk(
  'role/enableRole',
  async (roleName, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({ role_name: roleName });
      const response = await axiosInstance.post(ENDPOINTS.enableRole, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Role enabled successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return normalizeRole(data.data || { name: roleName, role_name: roleName, disabled: 0 });
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to enable role' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const assignPermissions = createAsyncThunk(
  'role/assignPermissions',
  async ({ roleName, doctype, permissions, permlevel = 0, ifOwner = false }, { dispatch, rejectWithValue }) => {
    try {
      const preparedPermissions = {};
      Object.entries(permissions).forEach(([key, value]) => {
        preparedPermissions[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      });
      const formData = createFormData({
        role_name: roleName,
        doctype,
        permissions: preparedPermissions,
        permlevel,
        if_owner: ifOwner ? 1 : 0,
      });
      const response = await axiosInstance.post(ENDPOINTS.assignPermissions, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Permissions assigned successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to assign permissions' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getRolePermissions = createAsyncThunk(
  'role/getRolePermissions',
  async ({ roleName, doctype = null }, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({
        role_name: roleName,
        ...(doctype && { doctype }),
      });
      const response = await axiosInstance.post(ENDPOINTS.getRolePermissions, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to fetch role permissions' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const removePermissions = createAsyncThunk(
  'role/removePermissions',
  async ({ roleName, doctype, permlevel = 0, ifOwner = false }, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({
        role_name: roleName,
        doctype,
        permlevel,
        if_owner: ifOwner ? 1 : 0,
      });
      const response = await axiosInstance.post(ENDPOINTS.removePermissions, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const successMessage = extractSuccessMessage(response) || 'Permissions removed successfully';
      dispatch(showNotification({ message: successMessage, severity: 'success', title: 'Success' }));
      return { roleName, doctype };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to remove permissions' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const listRoles = createAsyncThunk(
  'role/listRoles',
  async ({ disabled, isCustom, deskAccess, restrictToDomain, search, page = 1, pageSize = 20 } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = {};
      if (disabled !== undefined && disabled !== null) params.disabled = disabled ? 1 : 0;
      if (isCustom !== undefined && isCustom !== null) params.is_custom = isCustom ? 1 : 0;
      if (deskAccess !== undefined && deskAccess !== null) params.desk_access = deskAccess ? 1 : 0;
      if (restrictToDomain) params.restrict_to_domain = restrictToDomain;
      if (search) params.search = search;
      params.page = page;
      params.page_size = pageSize;
      const formData = createFormData(params);
      const response = await axiosInstance.post(ENDPOINTS.listRoles, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      const rolesData = data.data || data;
      const normalizedRoles = (rolesData.roles || []).map(role => normalizeRole(role));
      // Normalize pagination response from server (convert snake_case to camelCase)
      const serverPagination = rolesData.pagination || {};
      return {
        roles: normalizedRoles,
        pagination: {
          page: serverPagination.page || page,
          pageSize: serverPagination.page_size || serverPagination.pageSize || pageSize,
          total: serverPagination.total || normalizedRoles.length,
          totalPages: serverPagination.total_pages || serverPagination.totalPages || Math.ceil((serverPagination.total || normalizedRoles.length) / (serverPagination.page_size || serverPagination.pageSize || pageSize)),
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to fetch roles' }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getRoleDetails = createAsyncThunk(
  'role/getRoleDetails',
  async (roleName, { dispatch, rejectWithValue }) => {
    try {
      const formData = createFormData({ role_name: roleName });
      const response = await axiosInstance.post(ENDPOINTS.getRoleDetails, formData, {
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      const data = extractResponseData(response);
      return normalizeRole(data.data || data);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({ message: errorMessage, severity: errorSeverity(error), title: 'Failed to fetch role details' }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  roles: [],
  selectedRole: null,
  rolePermissions: {},
  isLoading: false,
  isLoadingRoles: false,
  isLoadingPermissions: false,
  isLoadingDetails: false,
  error: null,
  filters: {
    disabled: null,
    isCustom: null,
    deskAccess: null,
    restrictToDomain: null,
    search: '',
  },
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
};

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    clearSelectedRole: (state) => {
      state.selectedRole = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { disabled: null, isCustom: null, deskAccess: null, restrictToDomain: null, search: '' };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRole.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createRole.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          const existingIndex = state.roles.findIndex((role) => role.name === action.payload.name || role.role_name === action.payload.role_name);
          if (existingIndex !== -1) {
            state.roles[existingIndex] = action.payload;
          } else {
            state.roles.push(action.payload);
          }
        }
      })
      .addCase(createRole.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(updateRole.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          const index = state.roles.findIndex((role) => role.name === action.payload.name || role.role_name === action.payload.role_name);
          if (index !== -1) state.roles[index] = action.payload;
          if (state.selectedRole?.name === action.payload.name || state.selectedRole?.role_name === action.payload.role_name) {
            state.selectedRole = action.payload;
          }
        }
      })
      .addCase(updateRole.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(deleteRole.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = state.roles.filter((role) => role.name !== action.payload.roleName && role.role_name !== action.payload.roleName);
        if (state.selectedRole?.name === action.payload.roleName || state.selectedRole?.role_name === action.payload.roleName) {
          state.selectedRole = null;
        }
        delete state.rolePermissions[action.payload.roleName];
      })
      .addCase(deleteRole.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(disableRole.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(disableRole.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          const index = state.roles.findIndex((role) => role.name === action.payload.name || role.role_name === action.payload.role_name);
          if (index !== -1) state.roles[index].disabled = true;
          if (state.selectedRole?.name === action.payload.name || state.selectedRole?.role_name === action.payload.role_name) {
            state.selectedRole.disabled = true;
          }
        }
      })
      .addCase(disableRole.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(enableRole.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(enableRole.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          const index = state.roles.findIndex((role) => role.name === action.payload.name || role.role_name === action.payload.role_name);
          if (index !== -1) state.roles[index].disabled = false;
          if (state.selectedRole?.name === action.payload.name || state.selectedRole?.role_name === action.payload.role_name) {
            state.selectedRole.disabled = false;
          }
        }
      })
      .addCase(enableRole.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(assignPermissions.pending, (state) => { state.isLoadingPermissions = true; state.error = null; })
      .addCase(assignPermissions.fulfilled, (state) => { state.isLoadingPermissions = false; })
      .addCase(assignPermissions.rejected, (state, action) => { state.isLoadingPermissions = false; state.error = action.payload; })
      .addCase(getRolePermissions.pending, (state) => { state.isLoadingPermissions = true; state.error = null; })
      .addCase(getRolePermissions.fulfilled, (state, action) => {
        state.isLoadingPermissions = false;
        if (action.payload && action.payload.role) {
          const roleName = action.payload.role;
          state.rolePermissions[roleName] = action.payload.permissions || [];
        }
      })
      .addCase(getRolePermissions.rejected, (state, action) => { state.isLoadingPermissions = false; state.error = action.payload; })
      .addCase(removePermissions.pending, (state) => { state.isLoadingPermissions = true; state.error = null; })
      .addCase(removePermissions.fulfilled, (state, action) => {
        state.isLoadingPermissions = false;
        const { roleName } = action.payload;
        if (state.rolePermissions[roleName]) {
          state.rolePermissions[roleName] = state.rolePermissions[roleName].filter((perm) => perm.doctype !== action.payload.doctype);
        }
      })
      .addCase(removePermissions.rejected, (state, action) => { state.isLoadingPermissions = false; state.error = action.payload; })
      .addCase(listRoles.pending, (state) => { state.isLoadingRoles = true; state.error = null; })
      .addCase(listRoles.fulfilled, (state, action) => {
        state.isLoadingRoles = false;
        state.roles = action.payload.roles || [];
        state.pagination = { ...state.pagination, ...action.payload.pagination };
      })
      .addCase(listRoles.rejected, (state, action) => { state.isLoadingRoles = false; state.error = action.payload; })
      .addCase(getRoleDetails.pending, (state) => { state.isLoadingDetails = true; state.error = null; })
      .addCase(getRoleDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedRole = action.payload;
        const index = state.roles.findIndex((role) => role.name === action.payload.name || role.role_name === action.payload.role_name);
        if (index !== -1) state.roles[index] = action.payload;
      })
      .addCase(getRoleDetails.rejected, (state, action) => { state.isLoadingDetails = false; state.error = action.payload; });
  },
});

export const { clearSelectedRole, clearError, setFilters, clearFilters, setPagination } = roleSlice.actions;
export default roleSlice.reducer;
