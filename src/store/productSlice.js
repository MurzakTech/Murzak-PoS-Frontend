import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity, humanizeMessage } from '../utils/friendlyError';
import { summarizeBulkCreate } from '../utils/productImport';

// Product API endpoints
const ENDPOINTS = {
  createProduct: 'techsavanna_pos.api.product_api.create_product',
  getProducts: 'techsavanna_pos.api.product_api.get_products',
  getProductDetails: 'techsavanna_pos.api.product_api.get_product_details',
  updateProduct: 'techsavanna_pos.api.product_api.update_product',
  deleteProduct: 'techsavanna_pos.api.product_api.delete_product',
  enableProduct: 'techsavanna_pos.api.product_api.enable_product',
  addBarcode: 'techsavanna_pos.api.product_api.add_barcode',
  removeBarcode: 'techsavanna_pos.api.product_api.remove_barcode',
  getProductPrice: 'techsavanna_pos.api.product_api.get_product_price',
  setProductPrice: 'techsavanna_pos.api.product_api.set_product_price',
  getStockQuantity: 'techsavanna_pos.api.product_api.get_stock_quantity',
  bulkCreateProducts: 'techsavanna_pos.api.product_api.bulk_create_products',
  getItemGroups: 'techsavanna_pos.api.product_api.get_item_groups',
  getBrands: 'techsavanna_pos.api.product_api.get_brands',
  getUOMs: 'techsavanna_pos.api.product_api.get_uoms',
  // New endpoints
  bulkUpdatePrices: 'techsavanna_pos.api.product_api.bulk_update_prices',
  createProductVariant: 'techsavanna_pos.api.product_api.create_product_variant',
  getProductVariants: 'techsavanna_pos.api.product_api.get_product_variants',
  bulkImportProducts: 'techsavanna_pos.api.product_api.bulk_import_products',
  bulkImportOpeningStock: 'techsavanna_pos.api.product_api.bulk_import_opening_stock',
  createPriceList: 'techsavanna_pos.api.product_api.create_price_list',
  getPriceLists: 'techsavanna_pos.api.product_api.get_price_lists',
  updatePriceList: 'techsavanna_pos.api.product_api.update_price_list',
  deletePriceList: 'techsavanna_pos.api.product_api.delete_price_list',
  createUOM: 'techsavanna_pos.api.product_api.create_uom',
  updateUOM: 'techsavanna_pos.api.product_api.update_uom',
  deleteUOM: 'techsavanna_pos.api.product_api.delete_uom',
  createItemGroup: 'techsavanna_pos.api.product_api.create_item_group',
  updateItemGroup: 'techsavanna_pos.api.product_api.update_item_group',
  deleteItemGroup: 'techsavanna_pos.api.product_api.delete_item_group',
  createBrand: 'techsavanna_pos.api.product_api.create_brand',
  updateBrand: 'techsavanna_pos.api.product_api.update_brand',
  deleteBrand: 'techsavanna_pos.api.product_api.delete_brand',
  setProductWarranty: 'techsavanna_pos.api.product_api.set_product_warranty',
  getProductWarranty: 'techsavanna_pos.api.product_api.get_product_warranty',
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
export const getProducts = createAsyncThunk(
  'product/getProducts',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Build request body according to API format
      const requestBody = {
        company: params.company || userCompany,
        warehouse: params.warehouse || '',
        ...(params.item_group && params.item_group !== '' ? { item_group: params.item_group } : {}),
        ...(params.brand && params.brand !== '' ? { brand: params.brand } : {}),
        is_stock_item: params.is_stock_item !== undefined ? params.is_stock_item : true,
        is_sales_item: params.is_sales_item !== undefined ? params.is_sales_item : true,
        disabled: params.disabled !== undefined ? params.disabled : true,
        search_term: params.search_term || '',
        page: params.page || 1,
        page_size: params.page_size || 20,
        price_list: params.price_list || 'Standard Selling',
      };
      
      // disabled: true = returns all products (enabled + disabled)
      // disabled: false = returns only enabled products

      const response = await axiosInstance.post(ENDPOINTS.getProducts, requestBody);
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch products',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getProductDetails = createAsyncThunk(
  'product/getProductDetails',
  async ({ itemCode, company }, { dispatch, rejectWithValue }) => {
    try {
      const params = { item_code: itemCode };
      if (company) params.company = company;
      
      const response = await axiosInstance.get(ENDPOINTS.getProductDetails, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch product details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const createProduct = createAsyncThunk(
  'product/createProduct',
  async (productData, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      const requestData = {
        ...productData,
        ...(productData.company ? {} : (userCompany ? { company: userCompany } : {})),
      };

      const response = await axiosInstance.post(ENDPOINTS.createProduct, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Product created successfully';
      
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
        title: 'Failed to create product',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateProduct = createAsyncThunk(
  'product/updateProduct',
  async (productData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.updateProduct, productData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Product updated successfully';
      
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
        title: 'Failed to update product',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'product/deleteProduct',
  async (itemCode, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.deleteProduct, {
        item_code: itemCode,
      });
      const successMessage = extractSuccessMessage(response) || 'Product disabled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { itemCode };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to disable product',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const enableProduct = createAsyncThunk(
  'product/enableProduct',
  async (itemCode, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.enableProduct, {
        item_code: itemCode,
      });
      const successMessage = extractSuccessMessage(response) || 'Product enabled successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { itemCode };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to enable product',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const addBarcode = createAsyncThunk(
  'product/addBarcode',
  async ({ itemCode, barcode }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.addBarcode, {
        item_code: itemCode,
        barcode,
      });
      const successMessage = extractSuccessMessage(response) || 'Barcode added successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { itemCode, barcode };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to add barcode',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeBarcode = createAsyncThunk(
  'product/removeBarcode',
  async ({ itemCode, barcode }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.removeBarcode, {
        item_code: itemCode,
        barcode,
      });
      const successMessage = extractSuccessMessage(response) || 'Barcode removed successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { itemCode, barcode };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to remove barcode',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getProductPrice = createAsyncThunk(
  'product/getProductPrice',
  async ({ itemCode, priceList, company }, { dispatch, rejectWithValue }) => {
    try {
      const params = { item_code: itemCode };
      if (priceList) params.price_list = priceList;
      if (company) params.company = company;
      
      const response = await axiosInstance.get(ENDPOINTS.getProductPrice, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch product price',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const setProductPrice = createAsyncThunk(
  'product/setProductPrice',
  async ({ itemCode, price, priceList, currency = 'KES' }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.setProductPrice, {
        item_code: itemCode,
        price,
        price_list: priceList,
        currency,
      });
      const successMessage = extractSuccessMessage(response) || 'Product price set successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { itemCode, price, priceList, currency };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to set product price',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getStockQuantity = createAsyncThunk(
  'product/getStockQuantity',
  async ({ itemCode, company, warehouse }, { dispatch, rejectWithValue }) => {
    try {
      const params = { item_code: itemCode };
      if (company) params.company = company;
      if (warehouse) params.warehouse = warehouse;
      
      const response = await axiosInstance.get(ENDPOINTS.getStockQuantity, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch stock quantity',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// payload: { company, products: [...] }. Sent as is: wrapping it again would bury the list
// one level too deep for the server. Resolves with the server's reply and the summary of it.
export const bulkCreateProducts = createAsyncThunk(
  'product/bulkCreateProducts',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.bulkCreateProducts, payload);
      const data = extractResponseData(response);

      // Some replies refuse the whole request with a normal 200 status
      if (data && typeof data === 'object' && (data.status === 'error' || data.success === false)) {
        const errorMessage = humanizeMessage(data.message, 'The products could not be imported.');
        dispatch(showNotification({ message: errorMessage, severity: 'error', title: 'Import failed' }));
        return rejectWithValue(errorMessage);
      }

      const summary = summarizeBulkCreate(data, payload?.products?.length || 0);
      dispatch(showNotification({
        message: summary.text,
        severity: summary.problems ? 'warning' : 'success',
        title: summary.problems ? 'Some products need attention' : 'Products imported',
      }));

      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to create products',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getItemGroups = createAsyncThunk(
  'product/getItemGroups',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getItemGroups);
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch item groups',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getBrands = createAsyncThunk(
  'product/getBrands',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getBrands);
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch brands',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getUOMs = createAsyncThunk(
  'product/getUOMs',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getUOMs, { params });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch units of measure',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Bulk Update Prices
export const bulkUpdatePrices = createAsyncThunk(
  'product/bulkUpdatePrices',
  async (priceData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.bulkUpdatePrices, priceData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Prices updated successfully';
      
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
        title: 'Failed to update prices',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Product Variants
export const createProductVariant = createAsyncThunk(
  'product/createProductVariant',
  async (variantData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createProductVariant, variantData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Product variant created successfully';
      
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
        title: 'Failed to create product variant',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getProductVariants = createAsyncThunk(
  'product/getProductVariants',
  async ({ itemCode, company }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getProductVariants, {
        params: { item_code: itemCode, company },
      });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch product variants',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Bulk Import Opening Stock
export const bulkImportOpeningStock = createAsyncThunk(
  'product/bulkImportOpeningStock',
  async (importData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.bulkImportOpeningStock, importData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Opening stock imported successfully';
      
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
        title: 'Failed to import opening stock',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Price Lists
export const createPriceList = createAsyncThunk(
  'product/createPriceList',
  async (priceListData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createPriceList, priceListData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Price list created successfully';
      
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
        title: 'Failed to create price list',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getPriceLists = createAsyncThunk(
  'product/getPriceLists',
  async (params = {}, { dispatch, rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userCompany = params.company || 
                         state?.auth?.user?.company ||
                         state?.auth?.user?.custom_company ||
                         state?.auth?.user?.company_name ||
                         state?.auth?.user?.company_data?.name ||
                         state?.auth?.user?.company_data?.company_name;

      // Build request parameters with filters and pagination
      // API expects: { company, filters: { selling: null, buying: null, enabled: 'all' }, limit, offset }
      const page = params.page || params.pagination?.page || 1;
      const pageSize = params.page_size || params.pagination?.page_size || params.limit || 20;
      
      // Ensure filters object has correct structure: { selling: null, buying: null, enabled: 'all' }
      const filters = params.filters || {
        selling: null,
        buying: null,
        enabled: 'all',
      };

      const requestParams = {
        company: userCompany,
        filters: {
          selling: filters.selling !== undefined && filters.selling !== null ? Boolean(filters.selling) : null,
          buying: filters.buying !== undefined && filters.buying !== null ? Boolean(filters.buying) : null,
          enabled: filters.enabled !== undefined ? filters.enabled : 'all',
        },
        limit: pageSize,
        offset: params.offset !== undefined ? params.offset : (page - 1) * pageSize,
        ...(params.search_term && { search_term: params.search_term }),
      };

      // Use POST for requests with nested filters (similar to inventory listing)
      const response = await axiosInstance.post(ENDPOINTS.getPriceLists, requestParams);
      const data = extractResponseData(response);
      
      // Handle response structure: { price_lists: [], pagination: { page, page_size, total, total_pages } }
      const priceListsArray = data?.price_lists || data?.data?.price_lists || (Array.isArray(data) ? data : []);
      const paginationData = data?.pagination || response.data?.pagination;
      
      return {
        price_lists: priceListsArray,
        pagination: paginationData || {
          page: page,
          page_size: pageSize,
          total: data?.total || response.data?.count || priceListsArray.length || 0,
          total_pages: data?.total_pages || 
            (data?.total && pageSize ? Math.ceil(data.total / pageSize) : 0) ||
            (response.data?.count && pageSize ? Math.ceil(response.data.count / pageSize) : 0) ||
            (priceListsArray.length > 0 && pageSize ? Math.ceil(priceListsArray.length / pageSize) : 0),
        },
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch price lists',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updatePriceList = createAsyncThunk(
  'product/updatePriceList',
  async (priceListData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required parameter
      if (!priceListData.name) {
        return rejectWithValue('Price list name (identifier) is required');
      }

      // API expects: { name (required), new_price_list_name?, currency?, selling?, buying?, enabled? }
      // Ensure boolean fields are properly typed as booleans
      const payload = {
        name: priceListData.name,
        ...(priceListData.new_price_list_name && { new_price_list_name: priceListData.new_price_list_name }),
        ...(priceListData.currency && { currency: priceListData.currency }),
        ...(priceListData.selling !== undefined && { selling: Boolean(priceListData.selling) }),
        ...(priceListData.buying !== undefined && { buying: Boolean(priceListData.buying) }),
        ...(priceListData.enabled !== undefined && { enabled: Boolean(priceListData.enabled) }),
      };

      const response = await axiosInstance.put(ENDPOINTS.updatePriceList, payload);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Price list updated successfully';
      
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
        title: 'Failed to update price list',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deletePriceList = createAsyncThunk(
  'product/deletePriceList',
  async ({ name, company }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(ENDPOINTS.deletePriceList, {
        params: { name, company },
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Price list deleted successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { ...data, name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to delete price list',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// UOM Management
export const createUOM = createAsyncThunk(
  'product/createUOM',
  async (uomData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createUOM, uomData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Unit of measure created successfully';
      
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
        title: 'Failed to create unit of measure',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUOM = createAsyncThunk(
  'product/updateUOM',
  async (uomData, { dispatch, rejectWithValue }) => {
    try {
      // Validate required parameter
      if (!uomData.name) {
        return rejectWithValue('UOM name (identifier) is required');
      }

      // API expects payload structure: { name (required), new_uom_name?, must_be_whole_number? }
      const payload = {
        name: uomData.name,
        ...(uomData.new_uom_name && { new_uom_name: uomData.new_uom_name }),
        ...(uomData.must_be_whole_number !== undefined && { 
          must_be_whole_number: Boolean(uomData.must_be_whole_number) 
        }),
      };

      const response = await axiosInstance.put(ENDPOINTS.updateUOM, payload);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Unit of measure updated successfully';
      
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
        title: 'Failed to update unit of measure',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteUOM = createAsyncThunk(
  'product/deleteUOM',
  async ({ uom_name, company }, { dispatch, rejectWithValue }) => {
    try {
      // API expects payload: { uom_name: "..." }
      const payload = { uom_name };
      
      const response = await axiosInstance.delete(ENDPOINTS.deleteUOM, {
        data: payload,
        params: company ? { company } : undefined,
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Unit of measure deleted successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { ...data, uom_name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to delete unit of measure',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Item Groups Management
export const createItemGroup = createAsyncThunk(
  'product/createItemGroup',
  async (groupData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createItemGroup, groupData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Item group created successfully';
      
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
        title: 'Failed to create item group',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateItemGroup = createAsyncThunk(
  'product/updateItemGroup',
  async (groupData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(ENDPOINTS.updateItemGroup, groupData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Item group updated successfully';
      
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
        title: 'Failed to update item group',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteItemGroup = createAsyncThunk(
  'product/deleteItemGroup',
  async ({ name, company }, { dispatch, rejectWithValue }) => {
    try {
      if (!name) {
        return rejectWithValue('Category name is required');
      }

      // API expects JSON body with only name field: { "name": "Sub Assemblies" }
      const response = await axiosInstance.delete(ENDPOINTS.deleteItemGroup, {
        data: {
          name,
        },
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Item group deleted successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { ...data, name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to delete item group',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Brands Management
export const createBrand = createAsyncThunk(
  'product/createBrand',
  async (brandData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.createBrand, brandData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Brand created successfully';
      
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
        title: 'Failed to create brand',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateBrand = createAsyncThunk(
  'product/updateBrand',
  async (brandData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(ENDPOINTS.updateBrand, brandData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Brand updated successfully';
      
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
        title: 'Failed to update brand',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteBrand = createAsyncThunk(
  'product/deleteBrand',
  async ({ brand_name, company }, { dispatch, rejectWithValue }) => {
    try {
      if (!brand_name) {
        return rejectWithValue('Brand name is required');
      }

      // API expects JSON body with brand_name
      const response = await axiosInstance.delete(ENDPOINTS.deleteBrand, {
        data: {
          brand_name,
          ...(company && { company }),
        },
      });
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Brand deleted successfully';
      
      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));
      
      return { ...data, brand_name };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to delete brand',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Warranty Management
export const setProductWarranty = createAsyncThunk(
  'product/setProductWarranty',
  async (warrantyData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(ENDPOINTS.setProductWarranty, warrantyData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Warranty set successfully';
      
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
        title: 'Failed to set warranty',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getProductWarranty = createAsyncThunk(
  'product/getProductWarranty',
  async ({ itemCode, company }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.getProductWarranty, {
        params: { item_code: itemCode, company },
      });
      const data = extractResponseData(response);
      return data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: getErrorSeverity(error),
        title: 'Failed to fetch warranty',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  products: [],
  selectedProduct: null,
  itemGroups: [],
  brands: [],
  uoms: [],
  priceLists: [],
  variants: [],
  warranties: {},
  bulkImportResults: null,
  bulkUpdateResults: null,
  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  filters: {
    search_term: '',
    item_group: '',
    brand: '',
    is_stock_item: undefined,
    is_sales_item: undefined,
    disabled: true, // true = all products (enabled + disabled), false = only enabled products
    warehouse: '',
    price_list: 'Standard Selling',
  },
  // Price list filters and pagination
  priceListFilters: {
    selling: null,  // null = all, true = selling only, false = non-selling only
    buying: null,   // null = all, true = buying only, false = non-buying only
    enabled: 'all', // 'all' = all, 'enabled' = enabled only, 'disabled' = disabled only
  },
  priceListPagination: {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  },
  isLoading: false,
  isLoadingDetails: false,
  isLoadingReference: false,
  error: null,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
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
    // Price list filters and pagination
    setPriceListFilters: (state, action) => {
      state.priceListFilters = { ...state.priceListFilters, ...action.payload };
      // Reset to page 1 when filters change
      state.priceListPagination.page = 1;
    },
    resetPriceListFilters: (state) => {
      state.priceListFilters = initialState.priceListFilters;
      state.priceListPagination.page = 1;
    },
    setPriceListPage: (state, action) => {
      state.priceListPagination.page = action.payload;
    },
    setPriceListPageSize: (state, action) => {
      state.priceListPagination.page_size = action.payload;
      state.priceListPagination.page = 1; // Reset to page 1 when page size changes
    },
  },
  extraReducers: (builder) => {
    builder
      // Get products
      .addCase(getProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Always clear products on pending to avoid showing stale data
        // This ensures fresh data on navigation and filter changes
        state.products = [];
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Handle different response structures
        // Expected structure: { products: [], pagination: {} }
        let productsArray = [];
        if (Array.isArray(action.payload)) {
          // If payload is directly an array
          productsArray = action.payload;
        } else if (Array.isArray(action.payload?.products)) {
          // Standard structure: { products: [...] }
          productsArray = action.payload.products;
        } else if (Array.isArray(action.payload?.data)) {
          // Alternative structure: { data: [...] }
          productsArray = action.payload.data;
        }
        
        // Ensure we always have an array
        if (!Array.isArray(productsArray)) {
          productsArray = [];
        }
        
        state.products = productsArray;
        
        // Handle pagination - check nested pagination object first
        const paginationData = action.payload?.pagination || action.payload;
        const productsCount = productsArray.length;
        
        // Debug logging (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('getProducts.fulfilled:', {
            payloadKeys: Object.keys(action.payload || {}),
            hasProducts: !!action.payload?.products,
            productsArrayLength: productsArray.length,
            paginationData,
            products: productsArray.map(p => ({ item_code: p.item_code, item_name: p.item_name })),
          });
        }
        
        // Update pagination state - use API pagination data, not products count
        state.pagination = {
          page: paginationData?.page || state.pagination.page,
          page_size: paginationData?.page_size || state.pagination.page_size,
          total: paginationData?.total || paginationData?.count || productsCount || 0,
          total_pages: paginationData?.total_pages || 
            ((paginationData?.total || paginationData?.count || productsCount) && (paginationData?.page_size || state.pagination.page_size)
              ? Math.ceil((paginationData.total || paginationData.count || productsCount) / (paginationData.page_size || state.pagination.page_size))
              : 0),
        };
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get product details
      .addCase(getProductDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getProductDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.selectedProduct = action.payload.product || null;
      })
      .addCase(getProductDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.product) {
          state.products.unshift(action.payload.product);
          state.pagination.total += 1;
        }
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.product) {
          const index = state.products.findIndex(
            (p) => p.item_code === action.payload.product.item_code
          );
          if (index !== -1) {
            state.products[index] = { ...state.products[index], ...action.payload.product };
          }
          if (state.selectedProduct?.item_code === action.payload.product.item_code) {
            state.selectedProduct = { ...state.selectedProduct, ...action.payload.product };
          }
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(
          (p) => p.item_code === action.payload.itemCode
        );
        if (index !== -1) {
          state.products[index].disabled = 1;
        }
        if (state.selectedProduct?.item_code === action.payload.itemCode) {
          state.selectedProduct.disabled = 1;
        }
      })
      // Enable product
      .addCase(enableProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(
          (p) => p.item_code === action.payload.itemCode
        );
        if (index !== -1) {
          state.products[index].disabled = 0;
        }
        if (state.selectedProduct?.item_code === action.payload.itemCode) {
          state.selectedProduct.disabled = 0;
        }
      })
      // Add barcode
      .addCase(addBarcode.fulfilled, (state, action) => {
        const index = state.products.findIndex(
          (p) => p.item_code === action.payload.itemCode
        );
        if (index !== -1 && !state.products[index].barcodes) {
          state.products[index].barcodes = [];
        }
        if (index !== -1 && !state.products[index].barcodes.includes(action.payload.barcode)) {
          state.products[index].barcodes.push(action.payload.barcode);
        }
        if (state.selectedProduct?.item_code === action.payload.itemCode) {
          if (!state.selectedProduct.barcodes) {
            state.selectedProduct.barcodes = [];
          }
          if (!state.selectedProduct.barcodes.includes(action.payload.barcode)) {
            state.selectedProduct.barcodes.push(action.payload.barcode);
          }
        }
      })
      // Remove barcode
      .addCase(removeBarcode.fulfilled, (state, action) => {
        const index = state.products.findIndex(
          (p) => p.item_code === action.payload.itemCode
        );
        if (index !== -1 && state.products[index].barcodes) {
          state.products[index].barcodes = state.products[index].barcodes.filter(
            (b) => b !== action.payload.barcode
          );
        }
        if (state.selectedProduct?.item_code === action.payload.itemCode) {
          if (state.selectedProduct.barcodes) {
            state.selectedProduct.barcodes = state.selectedProduct.barcodes.filter(
              (b) => b !== action.payload.barcode
            );
          }
        }
      })
      // Get item groups
      .addCase(getItemGroups.pending, (state) => {
        state.isLoadingReference = true;
      })
      .addCase(getItemGroups.fulfilled, (state, action) => {
        state.isLoadingReference = false;
        state.itemGroups = action.payload.item_groups || [];
      })
      .addCase(getItemGroups.rejected, (state) => {
        state.isLoadingReference = false;
      })
      // Get brands
      .addCase(getBrands.pending, (state) => {
        state.isLoadingReference = true;
      })
      .addCase(getBrands.fulfilled, (state, action) => {
        state.isLoadingReference = false;
        state.brands = action.payload.brands || [];
      })
      .addCase(getBrands.rejected, (state) => {
        state.isLoadingReference = false;
      })
      // Get UOMs
      .addCase(getUOMs.pending, (state) => {
        state.isLoadingReference = true;
      })
      .addCase(getUOMs.fulfilled, (state, action) => {
        state.isLoadingReference = false;
        state.uoms = action.payload.uoms || [];
      })
      .addCase(getUOMs.rejected, (state) => {
        state.isLoadingReference = false;
      })
      // Bulk update prices
      .addCase(bulkUpdatePrices.fulfilled, (state, action) => {
        state.bulkUpdateResults = action.payload;
      })
      // Product variants
      .addCase(getProductVariants.fulfilled, (state, action) => {
        state.variants = action.payload.variants || [];
      })
      .addCase(createProductVariant.fulfilled, (state, action) => {
        if (action.payload.variant) {
          state.variants.push(action.payload.variant);
        }
      })
      // Bulk import opening stock
      .addCase(bulkImportOpeningStock.fulfilled, (state, action) => {
        state.bulkImportResults = action.payload;
      })
      // Price lists
      .addCase(getPriceLists.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPriceLists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.priceLists = action.payload.price_lists || [];
        
        // Update pagination state from response
        if (action.payload.pagination) {
          const total = action.payload.pagination.total || action.payload.pagination.count || 0;
          const pageSize = action.payload.pagination.page_size || state.priceListPagination.page_size;
          
          state.priceListPagination = {
            page: action.payload.pagination.page || state.priceListPagination.page,
            page_size: pageSize,
            total: total,
            total_pages: action.payload.pagination.total_pages || 
              (total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 0),
          };
        }
      })
      .addCase(getPriceLists.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createPriceList.fulfilled, (state, action) => {
        if (action.payload.price_list) {
          state.priceLists.push(action.payload.price_list);
        }
      })
      .addCase(updatePriceList.fulfilled, (state, action) => {
        if (action.payload.price_list) {
          const index = state.priceLists.findIndex(
            (pl) => pl.name === action.payload.price_list.name
          );
          if (index !== -1) {
            state.priceLists[index] = action.payload.price_list;
          }
        }
      })
      .addCase(deletePriceList.fulfilled, (state, action) => {
        state.priceLists = state.priceLists.filter(
          (pl) => pl.name !== action.payload.name
        );
      })
      // UOM management
      .addCase(createUOM.fulfilled, (state, action) => {
        if (action.payload.uom) {
          state.uoms.push(action.payload.uom);
        }
      })
      .addCase(updateUOM.fulfilled, (state, action) => {
        if (action.payload.uom) {
          const index = state.uoms.findIndex(
            (uom) => uom.name === action.payload.uom.name
          );
          if (index !== -1) {
            state.uoms[index] = action.payload.uom;
          }
        }
      })
      .addCase(deleteUOM.fulfilled, (state, action) => {
        const deletedUomName = action.payload.uom_name;
        state.uoms = state.uoms.filter((uom) => 
          uom.name !== deletedUomName && uom.uom_name !== deletedUomName
        );
      })
      // Item groups management
      .addCase(createItemGroup.fulfilled, (state, action) => {
        if (action.payload.item_group) {
          state.itemGroups.push(action.payload.item_group);
        }
      })
      .addCase(updateItemGroup.fulfilled, (state, action) => {
        if (action.payload.item_group) {
          const index = state.itemGroups.findIndex(
            (ig) => ig.name === action.payload.item_group.name
          );
          if (index !== -1) {
            state.itemGroups[index] = action.payload.item_group;
          }
        }
      })
      .addCase(deleteItemGroup.fulfilled, (state, action) => {
        state.itemGroups = state.itemGroups.filter(
          (ig) => ig.name !== action.payload.name
        );
      })
      // Brands management
      .addCase(createBrand.fulfilled, (state, action) => {
        if (action.payload.brand) {
          state.brands.push(action.payload.brand);
        }
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        if (action.payload.brand) {
          const index = state.brands.findIndex(
            (b) => b.name === action.payload.brand.name
          );
          if (index !== -1) {
            state.brands[index] = action.payload.brand;
          }
        }
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.brands = state.brands.filter((b) => b.name !== action.payload.name);
      })
      // Warranty management
      .addCase(getProductWarranty.fulfilled, (state, action) => {
        if (action.payload.warranty && action.payload.item_code) {
          state.warranties[action.payload.item_code] = action.payload.warranty;
        }
      })
      .addCase(setProductWarranty.fulfilled, (state, action) => {
        if (action.payload.warranty && action.payload.item_code) {
          state.warranties[action.payload.item_code] = action.payload.warranty;
        }
      });
  },
});

export const { 
  clearSelectedProduct, 
  clearError, 
  setFilters, 
  resetFilters, 
  setPage, 
  setPageSize,
  setPriceListFilters,
  resetPriceListFilters,
  setPriceListPage,
  setPriceListPageSize,
} = productSlice.actions;
export default productSlice.reducer;

