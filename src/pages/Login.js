import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  TextField,
  Link,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearError, fetchCurrentUser } from '../store/authSlice';
import { checkOnboardingStatus } from '../store/onboardingSlice';
import BrandLogo from '../components/Common/BrandLogo';
import posIcon from '../assets/pos-icon.png';
import { classifyLoginId, looksLikePhone, LOGIN_ID_ERROR } from '../utils/phone';

const SUPPORT_EMAIL = 'murzaktechnologies@gmail.com';

const FEATURES = [
  'Secure cloud-based POS',
  'Real-time sales tracking',
  'Inventory management',
  'Multi-store support',
  'Tax compliance ready',
  'Customer support when you need it',
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ defaultValues: { loginId: '', password: '' } });

  // One box for email or phone: the icon follows what is being typed
  const isPhoneEntry = looksLikePhone(watch('loginId'));

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

  const onSubmit = async (data) => {
    dispatch(clearError());

    const id = classifyLoginId(data.loginId);
    const loginData = id.type === 'email' ? { email: id.value, password: data.password } : { phone: id.value, password: data.password };

    const result = await dispatch(loginUser(loginData));
    if (!loginUser.fulfilled.match(result)) return;

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
        return;
      }
    }
    // Signed in; even if the profile fetch failed, let them in
    navigate(redirectPath, { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Brand panel (large screens) */}
      <Box
        sx={{
          width: { lg: '42%' },
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          py: 6,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: (t) => t.custom.gradientSoft,
          },
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: 480, width: '100%', mx: 'auto' }}>
          <RouterLink to="/" aria-label="Murzak POS home" style={{ textDecoration: 'none' }}>
            <BrandLogo size={40} textVariant="h4" />
          </RouterLink>

          <Box
            component="img"
            src={posIcon}
            alt=""
            sx={{ display: 'block', width: '100%', height: 'auto', my: 5, filter: (t) => (t.palette.mode === 'dark' ? 'brightness(0.92)' : 'none') }}
          />

          <Typography variant="h4" sx={{ mb: 2.5 }}>
            Run your shop with confidence
          </Typography>
          <Stack spacing={1.5}>
            {FEATURES.map((feature) => (
              <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                <Typography variant="body1">{feature}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Form panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: { xs: 2.5, sm: 6 }, py: { xs: 3, md: 4 } }}>
        <Box sx={{ display: { lg: 'none' }, mb: 4 }}>
          <RouterLink to="/" aria-label="Murzak POS home" style={{ textDecoration: 'none' }}>
            <BrandLogo size={34} />
          </RouterLink>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Typography variant="h2" sx={{ mb: 0.75 }}>
              Welcome back
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
              Sign in to continue to your dashboard.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => dispatch(clearError())} role="alert">
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email or phone number"
                  autoComplete="username"
                  autoFocus
                  inputProps={{ autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }}
                  {...register('loginId', {
                    required: 'Enter your email address or phone number',
                    validate: (v) => classifyLoginId(v).type !== null || LOGIN_ID_ERROR,
                  })}
                  error={!!errors.loginId}
                  helperText={errors.loginId?.message || (isPhoneEntry ? 'Any format works: 0712 345 678 or +254 712 345 678' : ' ')}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {isPhoneEntry ? (
                          <PhoneIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        ) : (
                          <EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        )}
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { required: 'Enter your password' })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
                  {/* No self-service reset exists yet, so route to support with the request pre-written */}
                  <Link
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Password reset request')}`}
                    variant="body2"
                    underline="hover"
                    sx={{ fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isLoading}
                  endIcon={!isLoading && <ArrowForwardIcon />}
                  sx={{ boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.3)}` }}
                >
                  {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              New to Murzak POS?{' '}
              <Link component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 700 }}>
                Create your free account
              </Link>
            </Typography>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" align="center" component="div" sx={{ mt: 3 }}>
          By signing in, you agree to our{' '}
          <Link component={RouterLink} to="/terms-of-service" sx={{ fontWeight: 600 }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link component={RouterLink} to="/privacy-policy" sx={{ fontWeight: 600 }}>
            Privacy Policy
          </Link>
          .<br />
          Need help?{' '}
          <Link href={`mailto:${SUPPORT_EMAIL}`} sx={{ fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
