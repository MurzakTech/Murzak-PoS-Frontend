import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Product Seeding API endpoints
const ENDPOINTS = {
  getPOSIndustries: 'techsavanna_pos.api.product_seeding.get_pos_industries',
  seedProducts: 'techsavanna_pos.api.product_seeding.seed_products',
  bulkUploadProducts: 'techsavanna_pos.api.product_seeding.bulk_upload_products',
  createSeedItem: 'techsavanna_pos.api.product_seeding.create_seed_item',
};

// Helper function to extract data from response
const extractResponseData = (response) => {
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Bulk upload products from seed data file
export const bulkUploadProducts = createAsyncThunk(
  'productSeeding/bulkUploadProducts',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.bulkUploadProducts);
      const data = extractResponseData(response);

      // Response structure: { status, created, skipped, failed, ignored_industries, failed_items, total_processed }
      if (data.status === 'error') {
        const errorMessage = data.message || 'Bulk upload failed';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Upload Failed',
        }));
        return rejectWithValue(errorMessage);
      }

      // Show success notification
      const message = `Upload completed: ${data.created || 0} created, ${data.skipped || 0} skipped`;
      dispatch(showNotification({
        message,
        severity: 'success',
        title: 'Products Uploaded',
      }));

      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Upload Failed',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get products for a specific industry
export const getSeedProducts = createAsyncThunk(
  'productSeeding/getSeedProducts',
  async (industry, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.seedProducts, { industry });
      const data = extractResponseData(response);

      // Response structure: { status, industry, total_products, products, message }
      if (data.status === 'error') {
        const errorMessage = data.message || 'Failed to fetch products';
        return rejectWithValue(errorMessage);
      }

      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Create seed items (actual Item master records)
export const createSeedItems = createAsyncThunk(
  'productSeeding/createSeedItems',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createSeedItem, payload);
      const data = extractResponseData(response);

      // New response structure: { status, company, company_abbr, industry, items_created[], items_skipped[], items_failed[], total_received, stock_entry: {created, name, error}, note }
      if (data.status === 'failed' || data.status !== 'success') {
        const errorMessage = data.message || data.note || 'Failed to create items';
        dispatch(showNotification({
          message: errorMessage,
          severity: 'error',
          title: 'Creation Failed',
        }));
        return rejectWithValue(errorMessage);
      }

      // Build success message
      const itemsCreatedCount = data.items_created?.length || 0;
      const itemsSkippedCount = data.items_skipped?.length || 0;
      const itemsFailedCount = data.items_failed?.length || 0;
      const totalReceived = data.total_received || 0;
      
      let message = `Successfully processed ${totalReceived} item(s): ${itemsCreatedCount} created`;
      if (itemsSkippedCount > 0) {
        message += `, ${itemsSkippedCount} skipped`;
      }
      if (itemsFailedCount > 0) {
        message += `, ${itemsFailedCount} failed`;
      }
      
      // Add stock entry info if available
      if (data.stock_entry?.created && data.stock_entry?.name) {
        message += `. Stock entry created: ${data.stock_entry.name}`;
      }
      
      // Add note if available
      if (data.note) {
        message += `. ${data.note}`;
      }

      dispatch(showNotification({
        message,
        severity: 'success',
        title: 'Items Created',
      }));

      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Creation Failed',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  seedProducts: [],
  totalProducts: 0,
  isLoadingSeedProducts: false,
  seedProductsError: null,
  isUploading: false,
  uploadResult: null,
  uploadError: null,
  isCreating: false,
  createResult: null,
  createError: null,
};

const productSeedingSlice = createSlice({
  name: 'productSeeding',
  initialState,
  reducers: {
    clearSeedProducts: (state) => {
      state.seedProducts = [];
      state.totalProducts = 0;
      state.seedProductsError = null;
    },
    clearUploadResult: (state) => {
      state.uploadResult = null;
      state.uploadError = null;
    },
    clearCreateResult: (state) => {
      state.createResult = null;
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    // Bulk upload products
    builder
      .addCase(bulkUploadProducts.pending, (state) => {
        state.isUploading = true;
        state.uploadError = null;
        state.uploadResult = null;
      })
      .addCase(bulkUploadProducts.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadResult = action.payload;
      })
      .addCase(bulkUploadProducts.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadError = action.payload;
      });

    // Get seed products
    builder
      .addCase(getSeedProducts.pending, (state) => {
        state.isLoadingSeedProducts = true;
        state.seedProductsError = null;
      })
      .addCase(getSeedProducts.fulfilled, (state, action) => {
        state.isLoadingSeedProducts = false;
        state.seedProducts = action.payload.products || [];
        state.totalProducts = action.payload.total_products || 0;
      })
      .addCase(getSeedProducts.rejected, (state, action) => {
        state.isLoadingSeedProducts = false;
        state.seedProductsError = action.payload;
        state.seedProducts = [];
        state.totalProducts = 0;
      });

    // Create seed items
    builder
      .addCase(createSeedItems.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
        state.createResult = null;
      })
      .addCase(createSeedItems.fulfilled, (state, action) => {
        state.isCreating = false;
        state.createResult = action.payload;
      })
      .addCase(createSeedItems.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload;
      });
  },
});

export const { clearSeedProducts, clearUploadResult, clearCreateResult } = productSeedingSlice.actions;
export default productSeedingSlice.reducer;
