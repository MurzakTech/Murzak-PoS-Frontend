import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, clearError, fetchCurrentUser } from '../../store/authSlice';
import { checkOnboardingStatus } from '../../store/onboardingSlice';
import { classifyLoginId } from '../../utils/phone';

/**
 * The sign-in steps of the redesigned page (ticket P5-5): the SAME actions, in the same order, as the current page (src/pages/Login.js).
 * Nothing about how a person is signed in, how the two-step code is asked for, where they go afterwards or how the session is kept is
 * new here; only the screen differs. If the sign-in rules ever change, change both together (the test signInFlow.test.jsx runs this
 * hook against the real store and the real thunks to keep them honest).
 *
 *   1. dispatch loginUser({ email | phone, password })
 *   2. if the account needs a code (TWO_FACTOR_REQUIRED), keep the details in memory only and ask for the code; loginUser is sent
 *      again with the code
 *   3. dispatch fetchCurrentUser, then checkOnboardingStatus; a person with no company goes to /onboarding
 *   4. otherwise go where they were heading (location.state.from) or /dashboard, replacing the sign-in page in the history
 *   5. if someone who is already signed in opens the page, skip the form the same way
 */
export const useSignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Set after the password is accepted for an account with two-step sign-in; kept only in memory until the code is entered
  const [pendingSignIn, setPendingSignIn] = useState(null);

  // Where to go after signing in (the page they were trying to open, or the dashboard)
  const from = location.state?.from?.pathname || location.state?.from || '/dashboard';
  const redirectPath = typeof from === 'string' ? from : from.pathname || '/dashboard';

  // Already signed in when the page loads: skip the form
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const hasCompany = user?.company || user?.company_name || user?.company_data;
      const hasCompanyInStorage = !!localStorage.getItem('company');
      const onboardingDone = localStorage.getItem('onboarding_completed') === 'true';

      if (!onboardingDone && !hasCompany && !hasCompanyInStorage) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, redirectPath, user]);

  useEffect(() => () => dispatch(clearError()), [dispatch]);

  const signIn = async (loginData) => {
    const result = await dispatch(loginUser(loginData));
    if (!loginUser.fulfilled.match(result)) {
      if (result.payload?.code === 'TWO_FACTOR_REQUIRED') {
        const { otp, ...credentials } = loginData;
        setPendingSignIn(credentials);
        return 'code-needed';
      }
      return 'failed';
    }
    setPendingSignIn(null);

    // Load the full profile (company, roles, permissions) before deciding where to go
    const fetchResult = await dispatch(fetchCurrentUser());

    if (fetchCurrentUser.fulfilled.match(fetchResult)) {
      dispatch(checkOnboardingStatus());

      const profile = fetchResult.payload;
      const hasCompany = profile?.company || profile?.company_name || profile?.company_data;
      const hasCompanyInStorage = !!localStorage.getItem('company');
      const onboardingDone = localStorage.getItem('onboarding_completed') === 'true';

      if (!onboardingDone && !hasCompany && !hasCompanyInStorage) {
        navigate('/onboarding', { replace: true });
        return 'signed-in';
      }
    }
    // Signed in; even if the profile fetch failed, let them in
    navigate(redirectPath, { replace: true });
    return 'signed-in';
  };

  /** Step one. The caller has checked the box is an email or a phone number; this sends it the way the current page does. Resolves 'signed-in', 'code-needed' or 'failed'. */
  const submitPassword = async ({ loginId, password }) => {
    dispatch(clearError());
    const id = classifyLoginId(loginId);
    const loginData = id.type === 'email' ? { email: id.value, password } : { phone: id.value, password };
    return signIn(loginData);
  };

  /** Step two: the 6 digits from the authenticator app. Resolves 'code-needed' when the code was refused and a new one is wanted. */
  const submitCode = async (digits) => {
    if (!pendingSignIn || String(digits).replace(/\D/g, '').length !== 6) return 'ignored';
    return signIn({ ...pendingSignIn, otp: String(digits).replace(/\D/g, '') });
  };

  const backToPassword = () => {
    setPendingSignIn(null);
    dispatch(clearError());
  };

  const dismissError = () => dispatch(clearError());

  return {
    isLoading,
    error,
    step: pendingSignIn ? 'code' : 'password',
    submitPassword,
    submitCode,
    backToPassword,
    dismissError,
  };
};

export default useSignIn;
