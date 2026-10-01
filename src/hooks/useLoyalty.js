import { useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createLoyaltyProgram,
  listLoyaltyPrograms,
  getLoyaltyProgramRules,
  assignLoyaltyProgram,
  earnLoyaltyPoints,
  getLoyaltyBalance,
  redeemPoints,
  getPointsHistory,
  getCustomerLoyaltyDetails,
  calculateLoyaltyRedemption,
  clearBalance,
  clearHistory,
  clearLoyaltyDetails,
  clearRedemptionCalculation,
  setHistoryFilters,
  resetHistoryFilters,
  setHistoryPage,
  setHistoryLimit,
} from '../store/loyaltySlice';

/**
 * Custom hook for loyalty program operations
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.customerId - Customer ID for loyalty operations (optional if only managing programs)
 * @param {boolean} [options.autoFetchBalance=false] - Whether to automatically fetch balance on mount/change
 * @param {boolean} [options.autoFetchHistory=false] - Whether to automatically fetch history on mount/change
 * @param {number} [options.balanceLimit=5] - Number of recent transactions to fetch with balance (default: 5)
 * 
 * @returns {Object} - Hook return object with state and methods
 * 
 * @example
 * // Basic usage with customer ID
 * const { balance, getBalance, earnPoints, redeem } = useLoyalty({
 *   customerId: 'CUST-001',
 *   autoFetchBalance: true,
 * });
 * 
 * @example
 * // Usage without customer (for program management only)
 * const { createProgram, assignProgram } = useLoyalty();
 * 
 * @example
 * // Loyalty redemption usage
 * const { getLoyaltyDetails, calculateRedemption, loyaltyDetails, redemptionCalculation } = useLoyalty({
 *   customerId: 'CUST-001',
 * });
 * 
 * // Fetch loyalty details
 * await getLoyaltyDetails(invoiceAmount, company);
 * 
 * // Calculate redemption
 * await calculateRedemption(3000, invoiceAmount, company);
 */
export const useLoyalty = ({
  customerId,
  autoFetchBalance = false,
  autoFetchHistory = false,
  balanceLimit = 5,
} = {}) => {
  const dispatch = useAppDispatch();
  const {
    programs,
    balance,
    history,
    historyPagination,
    historyFilters,
    loyaltyDetails,
    redemptionCalculation,
    isLoadingPrograms,
    isLoadingBalance,
    isLoadingHistory,
    isLoadingLoyaltyDetails,
    isCalculatingRedemption,
    isEarningPoints,
    isRedeemingPoints,
    isAssigningProgram,
    isCreatingProgram,
    error,
    balanceError,
    historyError,
    loyaltyDetailsError,
    redemptionError,
  } = useAppSelector((state) => state.loyalty);

  // Memoize customerId to prevent unnecessary refetches
  const customerIdMemoized = useMemo(() => customerId, [customerId]);

  // Fetch loyalty balance
  const fetchBalance = useCallback(async (limit = balanceLimit) => {
    if (!customerIdMemoized) {
      console.warn('useLoyalty: customerId is required to fetch balance');
      return;
    }
    await dispatch(getLoyaltyBalance({ customer_id: customerIdMemoized, limit }));
  }, [dispatch, customerIdMemoized, balanceLimit]);

  // Fetch points history
  const fetchHistory = useCallback(async (filters = {}) => {
    if (!customerIdMemoized) {
      console.warn('useLoyalty: customerId is required to fetch history');
      return;
    }
    await dispatch(getPointsHistory({
      customer_id: customerIdMemoized,
      ...historyFilters,
      ...filters,
    }));
  }, [dispatch, customerIdMemoized, historyFilters]);

  // Auto-fetch balance on mount and when customerId changes
  useEffect(() => {
    if (autoFetchBalance && customerIdMemoized) {
      fetchBalance();
    }
  }, [autoFetchBalance, customerIdMemoized, fetchBalance]);

  // Auto-fetch history on mount and when customerId changes
  useEffect(() => {
    if (autoFetchHistory && customerIdMemoized) {
      fetchHistory();
    }
  }, [autoFetchHistory, customerIdMemoized, fetchHistory]);

  // List loyalty programs
  const listPrograms = useCallback(async (activeOnly = false) => {
    return await dispatch(listLoyaltyPrograms({ active_only: activeOnly }));
  }, [dispatch]);

  // Create loyalty program
  const createProgram = useCallback(async (programData) => {
    const { 
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
    } = programData;
    return await dispatch(createLoyaltyProgram({
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
    }));
  }, [dispatch]);

  // Assign loyalty program to customer
  const assignProgram = useCallback(async (customerId, programName) => {
    if (!customerId || !programName) {
      throw new Error('Customer ID and program name are required');
    }
    return await dispatch(assignLoyaltyProgram({
      customer_id: customerId,
      loyalty_program_name: programName,
    }));
  }, [dispatch]);

  // Earn loyalty points
  const earnPoints = useCallback(async (customerId, purchaseAmount) => {
    if (!customerId || purchaseAmount === undefined || purchaseAmount === null) {
      throw new Error('Customer ID and purchase amount are required');
    }
    const result = await dispatch(earnLoyaltyPoints({
      customer_id: customerId,
      purchase_amount: purchaseAmount,
    }));
    // Refresh balance if this is the same customer
    if (customerId === customerIdMemoized && result.type === 'loyalty/earnLoyaltyPoints/fulfilled') {
      await fetchBalance();
    }
    return result;
  }, [dispatch, customerIdMemoized, fetchBalance]);

  // Redeem points
  const redeem = useCallback(async (customerId, points, referenceDocument = null) => {
    if (!customerId || !points) {
      throw new Error('Customer ID and points are required');
    }
    const result = await dispatch(redeemPoints({
      customer_id: customerId,
      points_to_redeem: points,
      reference_document: referenceDocument,
    }));
    // Refresh balance if this is the same customer
    if (customerId === customerIdMemoized && result.type === 'loyalty/redeemPoints/fulfilled') {
      await fetchBalance();
      await fetchHistory();
    }
    return result;
  }, [dispatch, customerIdMemoized, fetchBalance, fetchHistory]);

  // Get customer loyalty details for redemption
  const getLoyaltyDetails = useCallback(async (invoiceAmount = null, company = null) => {
    if (!customerIdMemoized) {
      console.warn('useLoyalty: customerId is required to fetch loyalty details');
      return;
    }
    return await dispatch(getCustomerLoyaltyDetails({
      customer_id: customerIdMemoized,
      invoice_amount: invoiceAmount,
      company: company,
    }));
  }, [dispatch, customerIdMemoized]);

  // Calculate loyalty redemption
  const calculateRedemption = useCallback(async (pointsToRedeem, invoiceAmount = null, company = null) => {
    if (!customerIdMemoized) {
      console.warn('useLoyalty: customerId is required to calculate redemption');
      return;
    }
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      throw new Error('Points to redeem must be a positive number');
    }
    return await dispatch(calculateLoyaltyRedemption({
      customer_id: customerIdMemoized,
      points_to_redeem: pointsToRedeem,
      invoice_amount: invoiceAmount,
      company: company,
    }));
  }, [dispatch, customerIdMemoized]);

  // Clear loyalty details from state
  const clearLoyaltyDetailsState = useCallback(() => {
    dispatch(clearLoyaltyDetails());
  }, [dispatch]);

  // Clear redemption calculation from state
  const clearRedemptionCalculationState = useCallback(() => {
    dispatch(clearRedemptionCalculation());
  }, [dispatch]);

  // Clear balance from state
  const clearBalanceState = useCallback(() => {
    dispatch(clearBalance());
  }, [dispatch]);

  // Clear history from state
  const clearHistoryState = useCallback(() => {
    dispatch(clearHistory());
  }, [dispatch]);

  // Set history filters
  const updateHistoryFilters = useCallback((filters) => {
    dispatch(setHistoryFilters(filters));
  }, [dispatch]);

  // Reset history filters
  const resetFilters = useCallback(() => {
    dispatch(resetHistoryFilters());
  }, [dispatch]);

  // Set history page
  const setPage = useCallback((page) => {
    dispatch(setHistoryPage(page));
  }, [dispatch]);

  // Set history limit
  const setLimit = useCallback((limit) => {
    dispatch(setHistoryLimit(limit));
  }, [dispatch]);

  // Computed loading state (true if any operation is loading)
  const loading = useMemo(() => {
    return isLoadingPrograms || isLoadingBalance || isLoadingHistory || isLoadingLoyaltyDetails || 
           isCalculatingRedemption || isEarningPoints || isRedeemingPoints || 
           isAssigningProgram || isCreatingProgram;
  }, [isLoadingPrograms, isLoadingBalance, isLoadingHistory, isLoadingLoyaltyDetails, 
      isCalculatingRedemption, isEarningPoints, isRedeemingPoints, 
      isAssigningProgram, isCreatingProgram]);

  // Computed error (prioritize operation-specific errors)
  const computedError = useMemo(() => {
    return redemptionError || loyaltyDetailsError || balanceError || historyError || error || null;
  }, [redemptionError, loyaltyDetailsError, balanceError, historyError, error]);

  return {
    // State
    programs: programs || [],
    balance: balance ? {
      customerId: balance.customerId,
      pointsBalance: balance.pointsBalance,
      recentTransactions: balance.recentTransactions || [],
      customer: balance.customer,
    } : null,
    history: history || [],
    historyPagination,
    historyFilters,
    loyaltyDetails: loyaltyDetails ? {
      status: loyaltyDetails.status,
      hasLoyaltyProgram: loyaltyDetails.hasLoyaltyProgram || false,
      customer: loyaltyDetails.customer,
      loyaltyProgram: loyaltyDetails.loyaltyProgram,
      loyaltyProgramName: loyaltyDetails.loyaltyProgramName,
      loyaltyPoints: loyaltyDetails.loyaltyPoints || 0,
      conversionFactor: loyaltyDetails.conversionFactor || 0,
      maxRedeemableAmount: loyaltyDetails.maxRedeemableAmount || 0,
      maxRedeemablePoints: loyaltyDetails.maxRedeemablePoints || 0,
      expenseAccount: loyaltyDetails.expenseAccount,
      costCenter: loyaltyDetails.costCenter,
      tierName: loyaltyDetails.tierName,
      totalSpent: loyaltyDetails.totalSpent,
      message: loyaltyDetails.message,
    } : null,
    redemptionCalculation: redemptionCalculation ? {
      status: redemptionCalculation.status,
      pointsToRedeem: redemptionCalculation.pointsToRedeem,
      discountAmount: redemptionCalculation.discountAmount || 0,
      conversionFactor: redemptionCalculation.conversionFactor || 0,
      remainingPoints: redemptionCalculation.remainingPoints || 0,
      expenseAccount: redemptionCalculation.expenseAccount,
      costCenter: redemptionCalculation.costCenter,
      loyaltyProgram: redemptionCalculation.loyaltyProgram,
      message: redemptionCalculation.message,
      availablePoints: redemptionCalculation.availablePoints,
      requestedPoints: redemptionCalculation.requestedPoints,
      invoiceAmount: redemptionCalculation.invoiceAmount,
      maxRedeemablePoints: redemptionCalculation.maxRedeemablePoints,
    } : null,
    
    // Loading states
    loading,
    isLoadingPrograms,
    isLoadingBalance,
    isLoadingHistory,
    isLoadingLoyaltyDetails,
    isCalculatingRedemption,
    isEarningPoints,
    isRedeemingPoints,
    isAssigningProgram,
    isCreatingProgram,
    
    // Errors
    error: computedError,
    balanceError,
    historyError,
    loyaltyDetailsError,
    redemptionError,
    
    // Actions - Program Management
    listPrograms,
    createProgram,
    assignProgram,
    
    // Actions - Points Operations
    earnPoints,
    redeem,
    
    // Actions - Data Fetching
    getBalance: fetchBalance,
    getHistory: fetchHistory,
    getLoyaltyDetails,
    calculateRedemption,
    refetchBalance: fetchBalance,
    refetchHistory: fetchHistory,
    
    // Actions - State Management
    clearBalance: clearBalanceState,
    clearHistory: clearHistoryState,
    clearLoyaltyDetails: clearLoyaltyDetailsState,
    clearRedemptionCalculation: clearRedemptionCalculationState,
    setHistoryFilters: updateHistoryFilters,
    resetHistoryFilters: resetFilters,
    setHistoryPage: setPage,
    setHistoryLimit: setLimit,
  };
};

export default useLoyalty;

