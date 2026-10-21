import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerUser, clearError as clearAuthError, fetchCurrentUser } from '../../store/authSlice';
import {
  createCompany,
  createPOSProfile,
  clearError as clearOnboardingError,
} from '../../store/onboardingSlice';
import { normalizeKenyanPhone } from '../../utils/phone';

/**
 * Hook for SaaS self-onboarding registration.
 *
 * 1. Dispatches registerUser to create user account and store auth tokens.
 * 2. Automatically provisions the default tenant setup (Company, POS Profile, default Warehouse & Accounts).
 * 3. Marks onboarding complete and routes immediately to Home ('/'), where the SetupWizard banner
 *    is available for optional deeper configuration.
 */
export const useSignUp = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading: authLoading, error: authError, isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading: onboardingLoading, error: onboardingError } = useAppSelector((state) => state.onboarding);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const isLoading = authLoading || onboardingLoading || isProvisioning;
  const error = internalError || authError || onboardingError;

  // If already authenticated and not currently in the process of signing up, redirect to Home
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
      dispatch(clearOnboardingError());
    };
  }, [dispatch]);

  const dismissError = () => {
    setInternalError(null);
    dispatch(clearAuthError());
    dispatch(clearOnboardingError());
  };

  const submitSignUp = async ({ fullName, shopName, email, phone, password }) => {
    dismissError();

    const nameParts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || '';
    // Backend requires last_name; ensure it is never empty
    const lastName = nameParts.slice(1).join(' ') || (firstName ? `${firstName}` : 'Admin');
    const cleanPhone = phone ? normalizeKenyanPhone(phone) : undefined;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanShop = String(shopName || '').trim();

    // 1. Register User Account
    const userPayload = {
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      password,
      phone: cleanPhone,
      send_welcome_email: true,
    };

    const registerResult = await dispatch(registerUser(userPayload));
    if (!registerUser.fulfilled.match(registerResult)) {
      const msg = registerResult.payload?.message || registerResult.error?.message || 'Registration failed';
      setInternalError(msg);
      return 'failed';
    }

    setIsProvisioning(true);

    try {
      // 2. Derive company abbreviation (strictly 2 to 3 characters for ERPNext)
      const words = cleanShop.split(/\s+/).filter(Boolean);
      let abbr = words.length >= 2
        ? words.slice(0, 3).map((w) => w[0].toUpperCase()).join('')
        : (words[0] || 'POS').slice(0, 3).toUpperCase();
      if (abbr.length < 2) abbr = `${abbr}S`.slice(0, 3);
      abbr = abbr.slice(0, 3);

      const companyPayload = {
        company_name: cleanShop,
        abbr,
        country: 'Kenya',
        default_currency: 'KES',
        company_address: {
          city: 'Nairobi',
          country: 'Kenya',
          phone: cleanPhone,
          email_id: cleanEmail,
        },
        company_contact: {
          first_name: firstName,
          last_name: lastName,
          email: cleanEmail,
          phone: cleanPhone,
          mobile: cleanPhone,
        },
      };

      // 3. Create Company (triggers backend autoprovisioning for accounts/warehouse)
      const companyResult = await dispatch(createCompany(companyPayload));
      const createdCompany = companyResult?.payload?.company;
      const finalCompanyName = createdCompany?.name || createdCompany?.company_name || cleanShop;

      // 4. Create POS Profile (backend auto-creates default warehouse and walk-in customer if missing)
      try {
        await dispatch(
          createPOSProfile({
            company: finalCompanyName,
            profile_name: `${cleanShop} POS`,
            update_stock: true,
            allow_discount_change: true,
            allow_rate_change: true,
            allow_partial_payment: false,
          })
        );
      } catch (profileErr) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Initial POS profile creation warning:', profileErr);
        }
      }

      // Mark onboarding completed and store company
      localStorage.setItem('onboarding_completed', 'true');
      if (createdCompany) {
        localStorage.setItem('company', JSON.stringify(createdCompany));
      }

      // Refresh user profile with newly assigned company
      try {
        await dispatch(fetchCurrentUser());
      } catch (userErr) {
        // Non-blocking
      }

      setIsProvisioning(false);
      navigate('/', { replace: true });
      return 'signed-up';
    } catch (provisionErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Post-registration provisioning warning:', provisionErr);
      }
      localStorage.setItem('onboarding_completed', 'true');
      setIsProvisioning(false);
      navigate('/', { replace: true });
      return 'signed-up';
    }
  };

  return {
    isLoading,
    error,
    dismissError,
    submitSignUp,
  };
};

export default useSignUp;
