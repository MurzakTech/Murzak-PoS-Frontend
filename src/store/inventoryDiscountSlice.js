import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';

// Inventory Discount API endpoints - matching INVENTORY_DISCOUNT_API.md
const ENDPOINTS = {
  createInventoryDiscountRule: 'techsavanna_pos.api.inventory_api.create_inventory_discount_rule',
  updateInventoryDiscountRule: 'techsavanna_pos.api.inventory_api.update_inventory_discount_rule',
  deleteInventoryDiscountRule: 'techsavanna_pos.api.inventory_api.delete_inventory_discount_rule',
  getInventoryDiscountRule: 'techsavanna_pos.api.inventory_api.get_inventory_discount_rule',
  listInventoryDiscountRules: 'techsavanna_pos.api.inventory_api.list_inventory_discount_rules',
  getInventoryDiscountForItem: 'techsavanna_pos.api.inventory_api.get_inventory_discount_for_item',
  bulkGetInventoryDiscounts: 'techsavanna_pos.api.inventory_api.bulk_get_inventory_discounts',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // Handle nested structure: response.data.message.data
  if (response.data?.message?.data && typeof response.data.message.data === 'object') {
    return response.data.message.data;
  }
  // Handle direct structure: response.data.data
  if (response.data?.success && response.data?.data) {
    return response.data.data;
  }
  // Handle message object structure: response.data.message
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract error message
const extractErrorMessage = (error) => {
  if (error.response?.data?.exc_type) {
    return error.response.data.exc_type;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.exc) {
    return error.response.data.exc;
  }
  return error.message || 'An error occurred';
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

// ============================================
// INVENTORY DISCOUNT RULE MANAGEMENT - Async Thunks
// ============================================

// Create Inventory Discount Rule
export const createInventoryDiscountRule = createAsyncThunk(
  'inventoryDiscount/createInventoryDiscountRule',
  async (ruleData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createInventoryDiscountRule, ruleData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Discount rule created successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        rule: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to create discount rule',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Inventory Discount Rule
export const updateInventoryDiscountRule = createAsyncThunk(
  'inventoryDiscount/updateInventoryDiscountRule',
  async (ruleData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateInventoryDiscountRule, ruleData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Discount rule updated successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        rule: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to update discount rule',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Delete Inventory Discount Rule
export const deleteInventoryDiscountRule = createAsyncThunk(
  'inventoryDiscount/deleteInventoryDiscountRule',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.deleteInventoryDiscountRule, { name });
      const successMessage = extractSuccessMessage(response) || 'Discount rule deleted successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return { name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to delete discount rule',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Inventory Discount Rule
export const getInventoryDiscountRule = createAsyncThunk(
  'inventoryDiscount/getInventoryDiscountRule',
  async ({ name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getInventoryDiscountRule, {
        params: { name },
      });
      const data = extractResponseData(response);
      return {
        rule: data?.data || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch discount rule',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List Inventory Discount Rules
export const listInventoryDiscountRules = createAsyncThunk(
  'inventoryDiscount/listInventoryDiscountRules',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestParams = {
        ...params,
        ...(params.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      // Use POST if params object has many fields, otherwise GET
      const response = Object.keys(requestParams).length > 3
        ? await axiosInstance.post(ENDPOINTS.listInventoryDiscountRules, requestParams)
        : await axiosInstance.get(ENDPOINTS.listInventoryDiscountRules, { params: requestParams });

      const data = extractResponseData(response);
      return {
        rules: Array.isArray(data) ? data : (data?.rules || data?.data || []),
        pagination: data?.pagination || {
          page: params.page || 1,
          page_size: params.page_size || 20,
          total: Array.isArray(data) ? data.length : (data?.count || 0),
          total_pages: Math.ceil((Array.isArray(data) ? data.length : (data?.count || 0)) / (params.page_size || 20)),
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch discount rules',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get Inventory Discount for Item
export const getInventoryDiscountForItem = createAsyncThunk(
  'inventoryDiscount/getInventoryDiscountForItem',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = params.company ||
                         state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      if (!params.item_code || !userCompany) {
        return rejectWithValue('Item code and company are required');
      }

      const requestParams = {
        ...params,
        company: userCompany,
      };

      const response = await axiosInstance.post(ENDPOINTS.getInventoryDiscountForItem, requestParams);
      const data = extractResponseData(response);
      
      return {
        item_code: params.item_code,
        batch_no: params.batch_no,
        warehouse: params.warehouse,
        rule: data?.data || data || null,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Don't show error notification for item lookups - it's expected that many items won't have discounts
      // Only log for debugging
      console.warn(`No discount found for item ${params.item_code}:`, errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Bulk Get Inventory Discounts
export const bulkGetInventoryDiscounts = createAsyncThunk(
  'inventoryDiscount/bulkGetInventoryDiscounts',
  async (params, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = params.company ||
                         state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
        return rejectWithValue('Items array is required and must not be empty');
      }

      if (!userCompany) {
        return rejectWithValue('Company is required');
      }

      const requestParams = {
        ...params,
        company: userCompany,
      };

      const response = await axiosInstance.post(ENDPOINTS.bulkGetInventoryDiscounts, requestParams);
      const data = extractResponseData(response);
      
      return {
        discounts: Array.isArray(data) ? data : (data?.data || []),
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch discounts',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  rules: [],
  selectedRule: null,
  itemDiscounts: {}, // Cache: { "item_code|batch_no|warehouse": rule }
  bulkDiscounts: [], // Results from bulk fetch
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    rule_type: '',
    company: '',
    item_code: '',
    batch_no: '',
    item_group: '',
    warehouse: '',
    is_active: null,
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingItem: false,
  isLoadingBulk: false,
  error: null,
};

// ============================================
// REDUX SLICE
// ============================================

const inventoryDiscountSlice = createSlice({
  name: 'inventoryDiscount',
  initialState,
  reducers: {
    clearSelectedRule: (state) => {
      state.selectedRule = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearItemDiscounts: (state) => {
      state.itemDiscounts = {};
    },
    clearBulkDiscounts: (state) => {
      state.bulkDiscounts = [];
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
      // ============================================
      // CREATE DISCOUNT RULE
      // ============================================
      .addCase(createInventoryDiscountRule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createInventoryDiscountRule.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.rule) {
          const newRule = action.payload.rule;
          // Add to beginning of list if not already there
          const exists = state.rules.some((r) => r.name === newRule.name);
          if (!exists) {
            state.rules.unshift(newRule);
            state.pagination.total += 1;
          }
          state.selectedRule = newRule;
        }
      })
      .addCase(createInventoryDiscountRule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // ============================================
      // UPDATE DISCOUNT RULE
      // ============================================
      .addCase(updateInventoryDiscountRule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateInventoryDiscountRule.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.rule) {
          const updatedRule = action.payload.rule;
          const index = state.rules.findIndex((r) => r.name === updatedRule.name);
          if (index !== -1) {
            state.rules[index] = { ...state.rules[index], ...updatedRule };
          }
          if (state.selectedRule?.name === updatedRule.name) {
            state.selectedRule = { ...state.selectedRule, ...updatedRule };
          }
          // Clear item discounts cache as rules may have changed
          state.itemDiscounts = {};
        }
      })
      .addCase(updateInventoryDiscountRule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // ============================================
      // DELETE DISCOUNT RULE
      // ============================================
      .addCase(deleteInventoryDiscountRule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteInventoryDiscountRule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rules = state.rules.filter((r) => r.name !== action.payload.name);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (state.selectedRule?.name === action.payload.name) {
          state.selectedRule = null;
        }
        // Clear item discounts cache
        state.itemDiscounts = {};
      })
      .addCase(deleteInventoryDiscountRule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // ============================================
      // GET DISCOUNT RULE
      // ============================================
      .addCase(getInventoryDiscountRule.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getInventoryDiscountRule.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedRule = action.payload.rule || null;
        // Update in list if exists
        const index = state.rules.findIndex((r) => r.name === action.payload.rule?.name);
        if (index !== -1) {
          state.rules[index] = action.payload.rule;
        }
      })
      .addCase(getInventoryDiscountRule.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      
      // ============================================
      // LIST DISCOUNT RULES
      // ============================================
      .addCase(listInventoryDiscountRules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listInventoryDiscountRules.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure rules is always an array
        const rules = action.payload?.rules;
        state.rules = Array.isArray(rules) ? rules : [];
        if (action.payload.pagination) {
          state.pagination = {
            ...state.pagination,
            ...action.payload.pagination,
          };
        }
      })
      .addCase(listInventoryDiscountRules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // ============================================
      // GET DISCOUNT FOR ITEM
      // ============================================
      .addCase(getInventoryDiscountForItem.pending, (state) => {
        state.isLoadingItem = true;
        state.error = null;
      })
      .addCase(getInventoryDiscountForItem.fulfilled, (state, action) => {
        state.isLoadingItem = false;
        // Cache the discount result
        const cacheKey = `${action.payload.item_code}|${action.payload.batch_no || ''}|${action.payload.warehouse || ''}`;
        if (action.payload.rule) {
          state.itemDiscounts[cacheKey] = action.payload.rule;
        } else {
          // Store null to indicate we checked and there's no discount
          state.itemDiscounts[cacheKey] = null;
        }
      })
      .addCase(getInventoryDiscountForItem.rejected, (state, action) => {
        state.isLoadingItem = false;
        // Don't set error for item lookups - it's expected that many items won't have discounts
      })
      
      // ============================================
      // BULK GET DISCOUNTS
      // ============================================
      .addCase(bulkGetInventoryDiscounts.pending, (state) => {
        state.isLoadingBulk = true;
        state.error = null;
      })
      .addCase(bulkGetInventoryDiscounts.fulfilled, (state, action) => {
        state.isLoadingBulk = false;
        state.bulkDiscounts = action.payload.discounts || [];
        // Also cache individual item discounts
        if (Array.isArray(action.payload.discounts)) {
          action.payload.discounts.forEach((item) => {
            if (item.rule) {
              const cacheKey = `${item.item_code}|${item.batch_no || ''}|${item.warehouse || ''}`;
              state.itemDiscounts[cacheKey] = item.rule;
            }
          });
        }
      })
      .addCase(bulkGetInventoryDiscounts.rejected, (state, action) => {
        state.isLoadingBulk = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedRule,
  clearError,
  clearItemDiscounts,
  clearBulkDiscounts,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} = inventoryDiscountSlice.actions;

export default inventoryDiscountSlice.reducer;

