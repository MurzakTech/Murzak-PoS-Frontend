import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

// Loyalty API endpoints - matching LOYALTY_API_DOCUMENTATION.md
const ENDPOINTS = {
  createLoyaltyProgram: 'techsavanna_pos.api.loyalty.create_loyalty_program',
  listLoyaltyPrograms: 'techsavanna_pos.api.loyalty.list_loyalty_programs',
  getLoyaltyProgramRules: 'techsavanna_pos.api.loyalty.get_loyalty_program_rules',
  assignLoyaltyProgram: 'techsavanna_pos.api.loyalty.assign_loyalty_program',
  earnLoyaltyPoints: 'techsavanna_pos.api.loyalty.earn_loyalty_points',
  getLoyaltyBalance: 'techsavanna_pos.api.loyalty.get_loyalty_balance',
  redeemPoints: 'techsavanna_pos.api.loyalty.redeem_points',
  getPointsHistory: 'techsavanna_pos.api.loyalty.get_points_history',
  // Loyalty Points Redemption endpoints
  getCustomerLoyaltyDetails: 'techsavanna_pos.api.loyalty.get_customer_loyalty_details',
  calculateLoyaltyRedemption: 'techsavanna_pos.api.loyalty.calculate_loyalty_redemption',
};

// Helper function to extract data from API response
const extractResponseData = (response) => {
  // API returns { status: "success|failure", message: {...}, ... }
  // The message can be a string or an object containing the data
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  // Sometimes data is directly in response.data
  if (response.data?.status === 'success' && response.data?.message) {
    return typeof response.data.message === 'object' ? response.data.message : response.data;
  }
  return response.data?.message || response.data;
};

// Helper function to extract error message
const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to extract success message
const extractSuccessMessage = (response) => {
  if (response.data?.message && typeof response.data.message === 'string') {
    return response.data.message;
  }
  if (response.data?.message?.message) {
    return response.data.message.message;
  }
  // Check if status indicates success
  if (response.data?.status === 'success' && response.data?.message) {
    return typeof response.data.message === 'string' ? response.data.message : 'Operation completed successfully';
  }
  return null;
};

// Create loyalty program
export const createLoyaltyProgram = createAsyncThunk(
  'loyalty/createLoyaltyProgram',
  async ({ 
    name, 
    pointsPerUnit, 
    programType, 
    tierName, 
    fromDate, 
    toDate,
    conversionFactor,
    expenseAccount,
    costCenter,
    expiryDuration,
  }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!name || pointsPerUnit === undefined || pointsPerUnit === null) {
        throw new Error('Loyalty program name and points per unit are required');
      }

      // Validate pointsPerUnit is a positive number
      const pointsPerUnitNum = parseFloat(pointsPerUnit);
      if (isNaN(pointsPerUnitNum) || pointsPerUnitNum <= 0) {
        throw new Error('Points per unit must be a positive number');
      }

      const requestData = {
        loyalty_program_name: name,
        points_per_unit: pointsPerUnitNum,
        program_type: programType || 'Single Tier Program',
        tier_name: tierName || 'Bronze',
      };

      // Add optional date fields if provided
      if (fromDate) {
        requestData.from_date = fromDate;
      }
      if (toDate) {
        requestData.to_date = toDate;
      }

      // Add optional conversion factor if provided
      if (conversionFactor !== undefined && conversionFactor !== null) {
        const conversionFactorNum = parseFloat(conversionFactor);
        if (isNaN(conversionFactorNum) || conversionFactorNum < 0) {
          throw new Error('Conversion factor must be a non-negative number');
        }
        requestData.conversion_factor = conversionFactorNum;
      }

      // Add optional expense account if provided
      if (expenseAccount) {
        requestData.expense_account = expenseAccount;
      }

      // Add optional cost center if provided
      if (costCenter) {
        requestData.cost_center = costCenter;
      }

      // Add optional expiry duration if provided
      if (expiryDuration !== undefined && expiryDuration !== null) {
        const expiryDurationNum = parseInt(expiryDuration);
        if (isNaN(expiryDurationNum) || expiryDurationNum <= 0) {
          throw new Error('Expiry duration must be a positive integer (days)');
        }
        requestData.expiry_duration = expiryDurationNum;
      }

      const response = await axiosInstance.post(ENDPOINTS.createLoyaltyProgram, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Loyalty program created successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        program: data?.loyalty_program || data,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to create loyalty program',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// List loyalty programs
export const listLoyaltyPrograms = createAsyncThunk(
  'loyalty/listLoyaltyPrograms',
  async ({ active_only = false } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = {};
      if (active_only !== undefined && active_only !== null) {
        params.active_only = Boolean(active_only);
      }

      const response = await axiosInstance.get(ENDPOINTS.listLoyaltyPrograms, { params });
      
      // Extract the message object which contains the actual data
      const messageData = response.data?.message;
      
      // Check if response indicates failure
      if (messageData?.status === 'failure') {
        throw new Error(messageData.message || 'Failed to fetch loyalty programs');
      }

      // Extract programs array from message object
      // Response structure: { message: { status: "success", message: "...", programs: [...], total_programs: N } }
      const programs = messageData?.programs || messageData?.loyalty_programs || [];
      
      return {
        programs: Array.isArray(programs) ? programs : [],
        totalPrograms: messageData?.total_programs || programs.length || 0,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch loyalty programs',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Assign loyalty program to customer
export const assignLoyaltyProgram = createAsyncThunk(
  'loyalty/assignLoyaltyProgram',
  async ({ customer_id, loyalty_program_name }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id || !loyalty_program_name) {
        throw new Error('Customer ID and loyalty program name are required');
      }

      const requestData = {
        customer_id,
        loyalty_program_name,
      };

      const response = await axiosInstance.post(ENDPOINTS.assignLoyaltyProgram, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Loyalty program assigned successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        customer: data?.customer || data,
        customerId: customer_id,
        programName: loyalty_program_name,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to assign loyalty program',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Earn loyalty points (requires authentication)
export const earnLoyaltyPoints = createAsyncThunk(
  'loyalty/earnLoyaltyPoints',
  async ({ customer_id, purchase_amount }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id || purchase_amount === undefined || purchase_amount === null) {
        throw new Error('Customer ID and purchase amount are required');
      }

      // Validate purchase_amount is a positive number
      if (typeof purchase_amount !== 'number' || purchase_amount < 0) {
        throw new Error('Purchase amount must be a non-negative number');
      }

      const requestData = {
        customer_id,
        purchase_amount: parseFloat(purchase_amount),
      };

      const response = await axiosInstance.post(ENDPOINTS.earnLoyaltyPoints, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Points earned successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        pointsEarned: data?.points_earned || 0,
        totalPoints: data?.total_points || 0,
        customerId: customer_id,
        purchaseAmount: purchase_amount,
        debug: data?.debug || [],
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to earn loyalty points',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get loyalty balance (supports both GET and POST)
export const getLoyaltyBalance = createAsyncThunk(
  'loyalty/getLoyaltyBalance',
  async ({ customer_id, limit = 5 }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id) {
        throw new Error('Customer ID is required');
      }

      const params = {
        customer_id,
        limit: parseInt(limit),
      };

      // Use GET by default (lighter), POST is also supported
      const response = await axiosInstance.get(ENDPOINTS.getLoyaltyBalance, { params });
      const data = extractResponseData(response);

      // Check if response indicates failure
      if (data?.status === 'failure') {
        throw new Error(data.message || 'Failed to fetch loyalty balance');
      }

      return {
        customerId: customer_id,
        pointsBalance: data?.points_balance || 0,
        recentTransactions: data?.recent_transactions || [],
        customer: data?.customer || customer_id,
        debug: data?.debug || [],
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch loyalty balance',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Redeem points
export const redeemPoints = createAsyncThunk(
  'loyalty/redeemPoints',
  async ({ customer_id, points_to_redeem, reference_document = null }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id || points_to_redeem === undefined || points_to_redeem === null) {
        throw new Error('Customer ID and points to redeem are required');
      }

      // Validate points_to_redeem is a positive integer
      if (typeof points_to_redeem !== 'number' || points_to_redeem <= 0 || !Number.isInteger(points_to_redeem)) {
        throw new Error('Points to redeem must be a positive integer');
      }

      const requestData = {
        customer_id,
        points_to_redeem: parseInt(points_to_redeem),
      };

      if (reference_document) {
        requestData.reference_document = reference_document;
      }

      const response = await axiosInstance.post(ENDPOINTS.redeemPoints, requestData);
      const data = extractResponseData(response);
      const successMessage = extractSuccessMessage(response) || 'Points redeemed successfully';

      dispatch(showNotification({
        message: successMessage,
        severity: 'success',
        title: 'Success',
      }));

      return {
        redeemedPoints: data?.redeemed_points || points_to_redeem,
        remainingPoints: data?.remaining_points || 0,
        customerId: customer_id,
        referenceDocument: data?.reference_document || reference_document,
        debug: data?.debug || [],
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to redeem points',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get points history (supports both GET and POST, with pagination)
export const getPointsHistory = createAsyncThunk(
  'loyalty/getPointsHistory',
  async ({
    customer_id,
    start_date = null,
    end_date = null,
    transaction_type = null,
    limit = 50,
    page = 1,
  }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id) {
        throw new Error('Customer ID is required');
      }

      // Build params object, only including non-null values
      const params = {
        customer_id,
        limit: parseInt(limit),
        page: parseInt(page),
      };

      if (start_date) {
        params.start_date = start_date;
      }
      if (end_date) {
        params.end_date = end_date;
      }
      if (transaction_type) {
        params.transaction_type = transaction_type;
      }

      // Use POST for complex queries (has filters), GET for simple ones
      const response = Object.keys(params).length > 3
        ? await axiosInstance.post(ENDPOINTS.getPointsHistory, params)
        : await axiosInstance.get(ENDPOINTS.getPointsHistory, { params });

      const data = extractResponseData(response);

      // Check if response indicates failure
      if (data?.status === 'failure') {
        throw new Error(data.message || 'Failed to fetch points history');
      }

      return {
        customerId: customer_id,
        transactions: data?.transactions || [],
        pagination: data?.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total_records: 0,
          total_pages: 0,
        },
        filters: {
          start_date,
          end_date,
          transaction_type,
        },
        customer: data?.customer || customer_id,
        debug: data?.debug || [],
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: errorSeverity(error),
        title: 'Failed to fetch points history',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Get customer loyalty details for redemption
export const getCustomerLoyaltyDetails = createAsyncThunk(
  'loyalty/getCustomerLoyaltyDetails',
  async ({ customer_id, invoice_amount = null, company = null }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Validate required fields
      if (!customer_id) {
        throw new Error('Customer ID is required');
      }

      // Build params object
      const params = {
        customer_id,
      };

      // Add optional parameters if provided
      if (invoice_amount !== null && invoice_amount !== undefined) {
        params.invoice_amount = parseFloat(invoice_amount);
      }

      if (company) {
        params.company = company;
      }

      const response = await axiosInstance.get(ENDPOINTS.getCustomerLoyaltyDetails, { params });
      const data = extractResponseData(response);

      // Check if response indicates error
      if (data?.status === 'error') {
        throw new Error(data.message || 'Failed to fetch customer loyalty details');
      }

      // Don't show notification for customers without loyalty program (normal case)
      if (data?.has_loyalty_program) {
        // Success case - customer has loyalty program
        return {
          status: data.status || 'success',
          hasLoyaltyProgram: data.has_loyalty_program || false,
          customer: data.customer,
          loyaltyProgram: data.loyalty_program,
          loyaltyProgramName: data.loyalty_program_name,
          loyaltyPoints: data.loyalty_points || 0,
          conversionFactor: data.conversion_factor || 0,
          maxRedeemableAmount: data.max_redeemable_amount || 0,
          maxRedeemablePoints: data.max_redeemable_points || 0,
          expenseAccount: data.expense_account,
          costCenter: data.cost_center,
          tierName: data.tier_name,
          totalSpent: data.total_spent,
          message: data.message,
        };
      } else {
        // Customer not enrolled - this is not an error, just informational
        return {
          status: data.status || 'success',
          hasLoyaltyProgram: false,
          loyaltyPoints: 0,
          conversionFactor: 0,
          maxRedeemableAmount: 0,
          maxRedeemablePoints: 0,
          message: data.message || 'Customer is not enrolled in any loyalty program',
        };
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Only show error notification for actual errors (not "no program" case)
      if (!errorMessage.includes('not enrolled') && !errorMessage.includes('loyalty program')) {
        dispatch(showNotification({
          message: errorMessage,
          severity: errorSeverity(error),
          title: 'Failed to fetch customer loyalty details',
        }));
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// Calculate loyalty redemption
export const calculateLoyaltyRedemption = createAsyncThunk(
  'loyalty/calculateLoyaltyRedemption',
  async ({ customer_id, points_to_redeem, invoice_amount = null, company = null }, { dispatch, rejectWithValue }) => {
    try {
      // Validate required fields
      if (!customer_id || points_to_redeem === undefined || points_to_redeem === null) {
        throw new Error('Customer ID and points to redeem are required');
      }

      // Validate points_to_redeem is a positive integer
      const pointsToRedeemNum = parseInt(points_to_redeem);
      if (isNaN(pointsToRedeemNum) || pointsToRedeemNum <= 0 || !Number.isInteger(pointsToRedeemNum)) {
        throw new Error('Points to redeem must be a positive integer');
      }

      // Build params object
      const params = {
        customer_id,
        points_to_redeem: pointsToRedeemNum,
      };

      // Add optional parameters if provided
      if (invoice_amount !== null && invoice_amount !== undefined) {
        params.invoice_amount = parseFloat(invoice_amount);
      }

      if (company) {
        params.company = company;
      }

      const response = await axiosInstance.get(ENDPOINTS.calculateLoyaltyRedemption, { params });
      const data = extractResponseData(response);

      // Check if response indicates error
      if (data?.status === 'error') {
        // Don't show notification here - let the component handle the error display
        return {
          status: 'error',
          message: data.message || 'Failed to calculate redemption',
          availablePoints: data.available_points,
          requestedPoints: data.requested_points,
          discountAmount: data.discount_amount,
          invoiceAmount: data.invoice_amount,
          maxRedeemablePoints: data.max_redeemable_points,
        };
      }

      // Success case
      return {
        status: 'success',
        pointsToRedeem: data.points_to_redeem || pointsToRedeemNum,
        discountAmount: data.discount_amount || 0,
        conversionFactor: data.conversion_factor || 0,
        remainingPoints: data.remaining_points || 0,
        expenseAccount: data.expense_account,
        costCenter: data.cost_center,
        loyaltyProgram: data.loyalty_program,
      };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Don't show notification here - let the component handle the error display
      return rejectWithValue({
        status: 'error',
        message: errorMessage,
      });
    }
  }
);

const initialState = {
  // Loyalty Programs
  programs: [],
  isLoadingPrograms: false,

  // Customer Balance
  balance: null,
  isLoadingBalance: false,

  // Transaction History
  history: [],
  historyPagination: {
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  },
  historyFilters: {
    startDate: null,
    endDate: null,
    transactionType: null,
  },
  isLoadingHistory: false,

  // Loyalty Details for Redemption
  loyaltyDetails: null,
  isLoadingLoyaltyDetails: false,
  loyaltyDetailsError: null,

  // Redemption Calculation
  redemptionCalculation: null,
  isCalculatingRedemption: false,
  redemptionError: null,

  // Operations
  isEarningPoints: false,
  isRedeemingPoints: false,
  isAssigningProgram: false,
  isCreatingProgram: false,

  // Errors
  error: null,
  balanceError: null,
  historyError: null,
};

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {
    clearBalance: (state) => {
      state.balance = null;
      state.balanceError = null;
    },
    clearHistory: (state) => {
      state.history = [];
      state.historyPagination = initialState.historyPagination;
      state.historyFilters = initialState.historyFilters;
      state.historyError = null;
    },
    clearError: (state) => {
      state.error = null;
      state.balanceError = null;
      state.historyError = null;
      state.loyaltyDetailsError = null;
      state.redemptionError = null;
    },
    clearLoyaltyDetails: (state) => {
      state.loyaltyDetails = null;
      state.loyaltyDetailsError = null;
    },
    clearRedemptionCalculation: (state) => {
      state.redemptionCalculation = null;
      state.redemptionError = null;
    },
    setHistoryFilters: (state, action) => {
      state.historyFilters = { ...state.historyFilters, ...action.payload };
    },
    resetHistoryFilters: (state) => {
      state.historyFilters = initialState.historyFilters;
    },
    setHistoryPage: (state, action) => {
      state.historyPagination.page = action.payload;
    },
    setHistoryLimit: (state, action) => {
      state.historyPagination.limit = action.payload;
      // Reset to page 1 when limit changes
      state.historyPagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create loyalty program
      .addCase(createLoyaltyProgram.pending, (state) => {
        state.isCreatingProgram = true;
        state.error = null;
      })
      .addCase(createLoyaltyProgram.fulfilled, (state, action) => {
        state.isCreatingProgram = false;
        if (action.payload.program) {
          // Add new program to the list
          state.programs.push(action.payload.program);
        }
      })
      .addCase(createLoyaltyProgram.rejected, (state, action) => {
        state.isCreatingProgram = false;
        state.error = action.payload;
      })
      // List loyalty programs
      .addCase(listLoyaltyPrograms.pending, (state) => {
        state.isLoadingPrograms = true;
        state.error = null;
      })
      .addCase(listLoyaltyPrograms.fulfilled, (state, action) => {
        state.isLoadingPrograms = false;
        state.programs = action.payload.programs || [];
      })
      .addCase(listLoyaltyPrograms.rejected, (state, action) => {
        state.isLoadingPrograms = false;
        state.error = action.payload;
        state.programs = [];
      })
      // Assign loyalty program
      .addCase(assignLoyaltyProgram.pending, (state) => {
        state.isAssigningProgram = true;
        state.error = null;
      })
      .addCase(assignLoyaltyProgram.fulfilled, (state, action) => {
        state.isAssigningProgram = false;
        // Clear balance to force refresh on next fetch
        state.balance = null;
      })
      .addCase(assignLoyaltyProgram.rejected, (state, action) => {
        state.isAssigningProgram = false;
        state.error = action.payload;
      })
      // Earn loyalty points
      .addCase(earnLoyaltyPoints.pending, (state) => {
        state.isEarningPoints = true;
        state.error = null;
      })
      .addCase(earnLoyaltyPoints.fulfilled, (state, action) => {
        state.isEarningPoints = false;
        // Update balance if it exists
        if (state.balance) {
          state.balance.pointsBalance = action.payload.totalPoints;
          // Add transaction to recent transactions if available
          if (state.balance.recentTransactions && Array.isArray(state.balance.recentTransactions)) {
            state.balance.recentTransactions.unshift({
              points_earned: action.payload.pointsEarned,
              transaction_type: 'Earn',
              purchase_amount: action.payload.purchaseAmount,
              date: new Date().toISOString(),
              reference_document: null,
            });
            // Keep only the most recent transactions (limit to 5)
            if (state.balance.recentTransactions.length > 5) {
              state.balance.recentTransactions = state.balance.recentTransactions.slice(0, 5);
            }
          }
        }
        // Clear history to force refresh on next fetch
        state.history = [];
      })
      .addCase(earnLoyaltyPoints.rejected, (state, action) => {
        state.isEarningPoints = false;
        state.error = action.payload;
      })
      // Get loyalty balance
      .addCase(getLoyaltyBalance.pending, (state) => {
        state.isLoadingBalance = true;
        state.balanceError = null;
      })
      .addCase(getLoyaltyBalance.fulfilled, (state, action) => {
        state.isLoadingBalance = false;
        state.balance = {
          customerId: action.payload.customerId,
          pointsBalance: action.payload.pointsBalance,
          recentTransactions: action.payload.recentTransactions || [],
          customer: action.payload.customer,
          debug: action.payload.debug || [],
        };
      })
      .addCase(getLoyaltyBalance.rejected, (state, action) => {
        state.isLoadingBalance = false;
        state.balanceError = action.payload;
        state.balance = null;
      })
      // Redeem points
      .addCase(redeemPoints.pending, (state) => {
        state.isRedeemingPoints = true;
        state.error = null;
      })
      .addCase(redeemPoints.fulfilled, (state, action) => {
        state.isRedeemingPoints = false;
        // Update balance if it exists
        if (state.balance) {
          state.balance.pointsBalance = action.payload.remainingPoints;
          // Add transaction to recent transactions if available
          if (state.balance.recentTransactions && Array.isArray(state.balance.recentTransactions)) {
            state.balance.recentTransactions.unshift({
              points_earned: -action.payload.redeemedPoints, // Negative for redemption
              transaction_type: 'Redeem',
              purchase_amount: 0,
              date: new Date().toISOString(),
              reference_document: action.payload.referenceDocument,
            });
            // Keep only the most recent transactions (limit to 5)
            if (state.balance.recentTransactions.length > 5) {
              state.balance.recentTransactions = state.balance.recentTransactions.slice(0, 5);
            }
          }
        }
        // Clear history to force refresh on next fetch
        state.history = [];
      })
      .addCase(redeemPoints.rejected, (state, action) => {
        state.isRedeemingPoints = false;
        state.error = action.payload;
      })
      // Get points history
      .addCase(getPointsHistory.pending, (state) => {
        state.isLoadingHistory = true;
        state.historyError = null;
      })
      .addCase(getPointsHistory.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.history = action.payload.transactions || [];
        state.historyPagination = {
          page: action.payload.pagination?.page || 1,
          limit: action.payload.pagination?.limit || 50,
          totalRecords: action.payload.pagination?.total_records || 0,
          totalPages: action.payload.pagination?.total_pages || 0,
        };
        state.historyFilters = {
          ...state.historyFilters,
          ...action.payload.filters,
        };
      })
      .addCase(getPointsHistory.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.historyError = action.payload;
        state.history = [];
      })
      // Get customer loyalty details
      .addCase(getCustomerLoyaltyDetails.pending, (state) => {
        state.isLoadingLoyaltyDetails = true;
        state.loyaltyDetailsError = null;
      })
      .addCase(getCustomerLoyaltyDetails.fulfilled, (state, action) => {
        state.isLoadingLoyaltyDetails = false;
        state.loyaltyDetails = {
          status: action.payload.status,
          hasLoyaltyProgram: action.payload.hasLoyaltyProgram || false,
          customer: action.payload.customer,
          loyaltyProgram: action.payload.loyaltyProgram,
          loyaltyProgramName: action.payload.loyaltyProgramName,
          loyaltyPoints: action.payload.loyaltyPoints || 0,
          conversionFactor: action.payload.conversionFactor || 0,
          maxRedeemableAmount: action.payload.maxRedeemableAmount || 0,
          maxRedeemablePoints: action.payload.maxRedeemablePoints || 0,
          expenseAccount: action.payload.expenseAccount,
          costCenter: action.payload.costCenter,
          tierName: action.payload.tierName,
          totalSpent: action.payload.totalSpent,
          message: action.payload.message,
        };
      })
      .addCase(getCustomerLoyaltyDetails.rejected, (state, action) => {
        state.isLoadingLoyaltyDetails = false;
        state.loyaltyDetailsError = action.payload;
        // Don't clear loyaltyDetails on error - keep previous data if available
      })
      // Calculate loyalty redemption
      .addCase(calculateLoyaltyRedemption.pending, (state) => {
        state.isCalculatingRedemption = true;
        state.redemptionError = null;
      })
      .addCase(calculateLoyaltyRedemption.fulfilled, (state, action) => {
        state.isCalculatingRedemption = false;
        state.redemptionCalculation = {
          status: action.payload.status,
          pointsToRedeem: action.payload.pointsToRedeem,
          discountAmount: action.payload.discountAmount || 0,
          conversionFactor: action.payload.conversionFactor || 0,
          remainingPoints: action.payload.remainingPoints || 0,
          expenseAccount: action.payload.expenseAccount,
          costCenter: action.payload.costCenter,
          loyaltyProgram: action.payload.loyaltyProgram,
          message: action.payload.message,
          // Error fields (when status is error)
          availablePoints: action.payload.availablePoints,
          requestedPoints: action.payload.requestedPoints,
          invoiceAmount: action.payload.invoiceAmount,
          maxRedeemablePoints: action.payload.maxRedeemablePoints,
        };
        // If error, set error message
        if (action.payload.status === 'error') {
          state.redemptionError = action.payload.message;
        }
      })
      .addCase(calculateLoyaltyRedemption.rejected, (state, action) => {
        state.isCalculatingRedemption = false;
        state.redemptionError = action.payload?.message || action.payload || 'Failed to calculate redemption';
        state.redemptionCalculation = null;
      });
  },
});

export const {
  clearBalance,
  clearHistory,
  clearError,
  clearLoyaltyDetails,
  clearRedemptionCalculation,
  setHistoryFilters,
  resetHistoryFilters,
  setHistoryPage,
  setHistoryLimit,
} = loyaltySlice.actions;

export default loyaltySlice.reducer;

