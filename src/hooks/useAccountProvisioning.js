import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchStatus,
  fetchAccounts,
  setAccount,
  autoConfigure,
  validateSetup,
  clearError,
  selectStatus,
  selectAccounts,
  selectAccountsCount,
  selectRecommendedTypes,
  selectValidation,
  selectLoading,
  selectError,
  selectAutoProvisioningStatus,
} from '../store/accountProvisioningSlice';
import { getUserCompany } from '../utils/getUserCompany';

/**
 * Custom hook for account provisioning operations
 * @param {string|null} company - Company name
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Automatically fetch status on mount (default: true)
 * @param {Function} options.onError - Error callback
 * @returns {Object} Hook return value with status, loading, error, and actions
 */
export function useAccountProvisioning(company, options = {}) {
  const { autoFetch = true, onError } = options;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Get company from parameter, user state, or localStorage fallback
  const resolvedCompany = useMemo(() => {
    if (company) return company;
    return getUserCompany(user);
  }, [company, user]);

  // Selectors
  const status = useAppSelector(selectStatus);
  const accounts = useAppSelector(selectAccounts);
  const accountsCount = useAppSelector(selectAccountsCount);
  const recommendedTypes = useAppSelector(selectRecommendedTypes);
  const validation = useAppSelector(selectValidation);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const autoProvisioningStatus = useAppSelector(selectAutoProvisioningStatus);

  // Fetch status
  const refetch = useCallback(async () => {
    if (!resolvedCompany) return;
    try {
      await dispatch(fetchStatus(resolvedCompany)).unwrap();
    } catch (err) {
      if (onError) {
        onError(err);
      }
    }
  }, [resolvedCompany, dispatch, onError]);

  // Auto-configure
  const handleAutoConfigure = useCallback(
    async (configOptions = {}) => {
      if (!resolvedCompany) {
        throw new Error('Company is required');
      }
      try {
        const result = await dispatch(
          autoConfigure({ company: resolvedCompany, options: configOptions })
        ).unwrap();
        return result;
      } catch (err) {
        if (onError) {
          onError(err);
        }
        throw err;
      }
    },
    [resolvedCompany, dispatch, onError]
  );

  // Set default account
  const handleSetDefaultAccount = useCallback(
    async (account, autoEnable = false) => {
      if (!resolvedCompany) {
        throw new Error('Company is required');
      }
      try {
        const result = await dispatch(
          setAccount({ company: resolvedCompany, account, autoEnable })
        ).unwrap();
        return result;
      } catch (err) {
        if (onError) {
          onError(err);
        }
        throw err;
      }
    },
    [resolvedCompany, dispatch, onError]
  );

  // Fetch accounts
  const handleFetchAccounts = useCallback(
    async (fetchOptions = {}) => {
      if (!resolvedCompany) {
        throw new Error('Company is required');
      }
      try {
        const result = await dispatch(
          fetchAccounts({ company: resolvedCompany, options: fetchOptions })
        ).unwrap();
        return result;
      } catch (err) {
        if (onError) {
          onError(err);
        }
        throw err;
      }
    },
    [resolvedCompany, dispatch, onError]
  );

  // Validate setup
  const handleValidate = useCallback(async () => {
    if (!resolvedCompany) {
      throw new Error('Company is required');
    }
    try {
      const result = await dispatch(validateSetup(resolvedCompany)).unwrap();
      return result;
    } catch (err) {
      if (onError) {
        onError(err);
      }
      throw err;
    }
  }, [resolvedCompany, dispatch, onError]);

  // Clear error
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && resolvedCompany) {
      refetch();
    }
  }, [autoFetch, resolvedCompany, refetch]);

  // Call onError when error changes
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return {
    // State
    status,
    accounts,
    accountsCount,
    recommendedTypes,
    validation,
    loading,
    error,
    autoProvisioningStatus,
    
    // Actions
    refetch,
    autoConfigure: handleAutoConfigure,
    setDefaultAccount: handleSetDefaultAccount,
    fetchAccounts: handleFetchAccounts,
    validate: handleValidate,
    clearError: handleClearError,
  };
}

