import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Warehouse API endpoints - matching PURCHASE_API_DOCUMENTATION.md
const ENDPOINTS = {
  createWarehouse: 'techsavanna_pos.api.warehouse_api.create_warehouse',
  listWarehouses: 'techsavanna_pos.api.warehouse_api.list_warehouses',
  getWarehouseDetails: 'techsavanna_pos.api.warehouse_api.get_warehouse_details',
  updateWarehouse: 'techsavanna_pos.api.warehouse_api.update_warehouse',
  assignWarehousesToStaff: 'techsavanna_pos.api.warehouse_api.assign_warehouses_to_staff',
  getStaffWarehouses: 'techsavanna_pos.api.warehouse_api.get_staff_warehouses',
  getWarehouseStaff: 'techsavanna_pos.api.warehouse_api.get_warehouse_staff',
  removeWarehouseFromStaff: 'techsavanna_pos.api.warehouse_api.remove_warehouse_from_staff',
  listWarehouseTypes: 'techsavanna_pos.api.warehouse_api.list_warehouse_types',
  setDefaultWarehouse: 'techsavanna_pos.api.warehouse_api.set_default_warehouse',
  getDefaultWarehouse: 'techsavanna_pos.api.warehouse_api.get_default_warehouse',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
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
const getErrorSeverity = (error) => {
  // 409 Conflict should be shown as warning instead of error
  if (error.response?.status === 409) {
    return 'warning';
  }
  return 'error';
};

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

// Create warehouse
export const createWarehouse = createAsyncThunk(
  'warehouse/createWarehouse',
  async (warehouseData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createWarehouse, warehouseData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Warehouse created successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        warehouse: {
          name: data?.name || response.data?.name,
          warehouse_name: data?.warehouse_name || warehouseData.warehouse_name,
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create warehouse',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List warehouses (supports search, filters, and pagination)
export const listWarehouses = createAsyncThunk(
  'warehouse/listWarehouses',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Build request parameters with new API structure
      const requestParams = {
        // Optional: company
        ...(params.company ? { company: params.company } : (userCompany ? { company: userCompany } : {})),
        // Optional: warehouse_type
        ...(params.warehouse_type ? { warehouse_type: params.warehouse_type } : {}),
        // Optional: is_group (boolean)
        ...(params.is_group !== undefined && params.is_group !== null ? { is_group: Boolean(params.is_group) } : {}),
        // Optional: is_main_depot (boolean)
        ...(params.is_main_depot !== undefined && params.is_main_depot !== null ? { is_main_depot: Boolean(params.is_main_depot) } : {}),
        // Optional: parent_warehouse
        ...(params.parent_warehouse ? { parent_warehouse: params.parent_warehouse } : {}),
        // Optional: search (search term for warehouse name)
        ...(params.search ? { search: params.search } : {}),
        // Pagination: limit (default: 100)
        limit: params.limit || 100,
        // Pagination: offset (default: 0)
        offset: params.offset !== undefined ? params.offset : 0,
      };

      // Always use POST for consistency with new API structure
      const response = await axiosInstance.post(ENDPOINTS.listWarehouses, requestParams);

      const data = extractResponseData(response);
      return {
        warehouses: Array.isArray(data) ? data : (data?.data || data?.warehouses || []),
        count: response.data?.count || data?.count || (Array.isArray(data) ? data.length : 0),
        total: response.data?.total || response.data?.count || data?.total || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch warehouses',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get warehouse details
export const getWarehouseDetails = createAsyncThunk(
  'warehouse/getWarehouseDetails',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getWarehouseDetails, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        warehouse: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch warehouse details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update warehouse
export const updateWarehouse = createAsyncThunk(
  'warehouse/updateWarehouse',
  async (warehouseData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateWarehouse, warehouseData);
      const successMessage = extractSuccessMessage(response) || 'Warehouse updated successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        warehouse: { name: warehouseData.name },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to update warehouse',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Assign warehouses to staff
export const assignWarehousesToStaff = createAsyncThunk(
  'warehouse/assignWarehousesToStaff',
  async ({ user_email, warehouses, replace_existing = true }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.assignWarehousesToStaff, {
        user_email,
        warehouses,
        replace_existing,
      });
      const successMessage = extractSuccessMessage(response) || 'Warehouses assigned successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        user_email,
        warehouses,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to assign warehouses',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get staff warehouses
export const getStaffWarehouses = createAsyncThunk(
  'warehouse/getStaffWarehouses',
  async ({ user_email }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getStaffWarehouses, {
        params: { user_email },
      });
      const data = extractResponseData(response);
      return {
        warehouses: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
        user_email: response.data?.user || user_email,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch staff warehouses',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get warehouse staff
export const getWarehouseStaff = createAsyncThunk(
  'warehouse/getWarehouseStaff',
  async ({ warehouse }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getWarehouseStaff, {
        params: { warehouse },
      });
      const data = extractResponseData(response);
      return {
        staff: Array.isArray(data) ? data : (data?.data || []),
        count: response.data?.count || (Array.isArray(data) ? data.length : 0),
        warehouse,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch warehouse staff',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Remove warehouse from staff
export const removeWarehouseFromStaff = createAsyncThunk(
  'warehouse/removeWarehouseFromStaff',
  async ({ user_email, warehouse }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.removeWarehouseFromStaff, {
        user_email,
        warehouse,
      });
      const successMessage = extractSuccessMessage(response) || 'Warehouse removed successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        user_email,
        warehouse,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to remove warehouse',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List warehouse types
export const listWarehouseTypes = createAsyncThunk(
  'warehouse/listWarehouseTypes',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.listWarehouseTypes);
      const data = extractResponseData(response);
      return {
        types: Array.isArray(data) ? data : (data?.data || []),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Set default warehouse
export const setDefaultWarehouse = createAsyncThunk(
  'warehouse/setDefaultWarehouse',
  async ({ company, warehouse }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.setDefaultWarehouse, {
        company,
        warehouse,
      });
      const successMessage = extractSuccessMessage(response) || 'Default warehouse set successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return { company, warehouse };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to set default warehouse',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get default warehouse
export const getDefaultWarehouse = createAsyncThunk(
  'warehouse/getDefaultWarehouse',
  async ({ company }, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = company || 
                         state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      if (!userCompany) {
        return rejectWithValue('Company is required');
      }

      const response = await axiosInstance.get(ENDPOINTS.getDefaultWarehouse, {
        params: { company: userCompany },
      });
      const data = extractResponseData(response);
      return {
        warehouse: data?.data || data || null,
        company: userCompany,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Don't show error notification for "no default warehouse" case
      if (!errorMessage.includes('No default warehouse') && !errorMessage.includes('not found')) {
        dispatch(showNotification({
          message: errorMessage,
          severity: getErrorSeverity(error),
          title: 'Failed to fetch default warehouse',
        }));
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// Load active warehouse from localStorage
const loadActiveWarehouseFromStorage = () => {
  try {
    const stored = localStorage.getItem('activeWarehouse');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading active warehouse from localStorage:', error);
    return null;
  }
};

const initialState = {
  warehouses: [],
  warehouseTypes: [],
  selectedWarehouse: null,
  activeWarehouse: loadActiveWarehouseFromStorage(), // Globally selected warehouse for AppBar
  staffWarehouses: [],
  warehouseStaff: [],
  defaultWarehouse: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    company: '',
    warehouse_type: '',
    is_group: null,
    is_main_depot: null,
    parent_warehouse: '',
    search: '',
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingTypes: false,
  isLoadingStaff: false,
  isLoadingDefault: false,
  error: null,
};

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState,
  reducers: {
    clearSelectedWarehouse: (state) => {
      state.selectedWarehouse = null;
    },
    setActiveWarehouse: (state, action) => {
      state.activeWarehouse = action.payload;
      // Persist to localStorage
      try {
        if (action.payload) {
          localStorage.setItem('activeWarehouse', JSON.stringify(action.payload));
        } else {
          localStorage.removeItem('activeWarehouse');
        }
      } catch (error) {
        console.error('Error saving active warehouse to localStorage:', error);
      }
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
    clearStaffWarehouses: (state) => {
      state.staffWarehouses = [];
    },
    clearWarehouseStaff: (state) => {
      state.warehouseStaff = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // List warehouses
      .addCase(listWarehouses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listWarehouses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.warehouses = action.payload.warehouses || [];
        const total = action.payload.total || action.payload.count || 0;
        state.pagination.total = total;
        state.pagination.total_pages = Math.ceil(
          total / state.pagination.page_size
        );
        // Update default warehouse reference if found in list
        const defaultWarehouse = action.payload.warehouses?.find((w) => w.is_default);
        if (defaultWarehouse) {
          state.defaultWarehouse = defaultWarehouse;
        }
        // Initialize or validate activeWarehouse
        if (action.payload.warehouses?.length > 0) {
          if (state.activeWarehouse) {
            // Verify current activeWarehouse still exists in the list
            const foundWarehouse = action.payload.warehouses.find(
              (w) => w.name === state.activeWarehouse.name || 
                     w.warehouse_name === state.activeWarehouse.warehouse_name ||
                     w.name === state.activeWarehouse.warehouse_name ||
                     w.warehouse_name === state.activeWarehouse.name
            );
            if (!foundWarehouse) {
              // Current activeWarehouse no longer exists, use default or first
              state.activeWarehouse = defaultWarehouse || action.payload.warehouses[0];
              try {
                localStorage.setItem('activeWarehouse', JSON.stringify(state.activeWarehouse));
              } catch (error) {
                console.error('Error saving active warehouse to localStorage:', error);
              }
            } else {
              // Update activeWarehouse with latest data from the list
              state.activeWarehouse = foundWarehouse;
            }
          } else {
            // No activeWarehouse set, initialize it
            const storedWarehouse = loadActiveWarehouseFromStorage();
            if (storedWarehouse) {
              // Verify stored warehouse still exists in the list
              const foundWarehouse = action.payload.warehouses.find(
                (w) => w.name === storedWarehouse.name || 
                       w.warehouse_name === storedWarehouse.warehouse_name ||
                       w.name === storedWarehouse.warehouse_name ||
                       w.warehouse_name === storedWarehouse.name
              );
              if (foundWarehouse) {
                state.activeWarehouse = foundWarehouse;
              } else {
                // Stored warehouse no longer exists, use default or first
                state.activeWarehouse = defaultWarehouse || action.payload.warehouses[0];
                try {
                  localStorage.setItem('activeWarehouse', JSON.stringify(state.activeWarehouse));
                } catch (error) {
                  console.error('Error saving active warehouse to localStorage:', error);
                }
              }
            } else {
              // No stored value, use default or first warehouse
              state.activeWarehouse = defaultWarehouse || action.payload.warehouses[0];
              try {
                localStorage.setItem('activeWarehouse', JSON.stringify(state.activeWarehouse));
              } catch (error) {
                console.error('Error saving active warehouse to localStorage:', error);
              }
            }
          }
        }
      })
      .addCase(listWarehouses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get warehouse details
      .addCase(getWarehouseDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getWarehouseDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedWarehouse = action.payload.warehouse || null;
      })
      .addCase(getWarehouseDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Create warehouse
      .addCase(createWarehouse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWarehouse.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update warehouse
      .addCase(updateWarehouse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWarehouse.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get staff warehouses
      .addCase(getStaffWarehouses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getStaffWarehouses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.staffWarehouses = action.payload.warehouses || [];
      })
      .addCase(getStaffWarehouses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get warehouse staff
      .addCase(getWarehouseStaff.pending, (state) => {
        state.isLoadingStaff = true;
        state.error = null;
      })
      .addCase(getWarehouseStaff.fulfilled, (state, action) => {
        state.isLoadingStaff = false;
        state.warehouseStaff = action.payload.staff || [];
      })
      .addCase(getWarehouseStaff.rejected, (state, action) => {
        state.isLoadingStaff = false;
        state.error = action.payload;
      })
      // List warehouse types
      .addCase(listWarehouseTypes.pending, (state) => {
        state.isLoadingTypes = true;
      })
      .addCase(listWarehouseTypes.fulfilled, (state, action) => {
        state.isLoadingTypes = false;
        state.warehouseTypes = action.payload.types || [];
      })
      .addCase(listWarehouseTypes.rejected, (state) => {
        state.isLoadingTypes = false;
      })
      // Set default warehouse
      .addCase(setDefaultWarehouse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setDefaultWarehouse.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the default warehouse in the warehouses list
        state.warehouses = state.warehouses.map((w) => ({
          ...w,
          is_default: w.name === action.payload.warehouse,
        }));
        // Update default warehouse reference
        const warehouse = state.warehouses.find((w) => w.name === action.payload.warehouse);
        if (warehouse) {
          state.defaultWarehouse = { ...warehouse, is_default: true };
        }
      })
      .addCase(setDefaultWarehouse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get default warehouse
      .addCase(getDefaultWarehouse.pending, (state) => {
        state.isLoadingDefault = true;
        state.error = null;
      })
      .addCase(getDefaultWarehouse.fulfilled, (state, action) => {
        state.isLoadingDefault = false;
        state.defaultWarehouse = action.payload.warehouse;
      })
      .addCase(getDefaultWarehouse.rejected, (state, action) => {
        state.isLoadingDefault = false;
        state.defaultWarehouse = null;
      });
  },
});

export const {
  clearSelectedWarehouse,
  setActiveWarehouse,
  clearError,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  clearStaffWarehouses,
  clearWarehouseStaff,
} = warehouseSlice.actions;

export default warehouseSlice.reducer;

