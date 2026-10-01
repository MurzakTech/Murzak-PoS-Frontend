import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Link,
  useTheme,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Avatar,
  Stack,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
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
import logoMain from '../assets/logo_main.png';
import logoIcon from '../assets/logo_icon.png';
import posIcon from '../assets/pos-icon.png';

const MotionCard = motion(Card);
const MotionButton = motion(Button);
const MotionBox = motion(Box);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      email: '',
      phone: '',
      password: '',
    },
  });

  // Get the redirect path from location state
  const from = location.state?.from?.pathname || location.state?.from || '/dashboard';

  // Redirect if already authenticated (for users who are already logged in when component mounts)
  // This useEffect only handles the case where user is already authenticated on page load
  // For new logins, the redirect is handled in onSubmit after fetchCurrentUser completes
  useEffect(() => {
    // Only redirect if authenticated AND not currently loading (to avoid redirecting during login)
    // This ensures we only redirect users who were already authenticated when the page loaded
    if (isAuthenticated && !isLoading) {
      // Debug: Log the user object to see what data is available
      console.log('Login useEffect - User object:', user);
      console.log('Login useEffect - isAuthenticated:', isAuthenticated);
      
      const hasCompany = user?.company || user?.company_name || user?.company_data;
      const companyStr = localStorage.getItem('company');
      const hasCompanyInStorage = !!companyStr;
      const onboardingStatus = localStorage.getItem('onboarding_completed') === 'true';
      
      if (!onboardingStatus && !hasCompany && !hasCompanyInStorage) {
        navigate('/onboarding', { replace: true });
      } else {
        const redirectPath = typeof from === 'string' ? from : (from.pathname || '/dashboard');
        navigate(redirectPath, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, from, user]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = async (data) => {
    dispatch(clearError());
    
    // Prepare login data based on selected method
    const loginData = loginMethod === 'email' 
      ? { email: data.email, password: data.password }
      : { phone: data.phone, password: data.password };
    
    const result = await dispatch(loginUser(loginData));
    
    if (loginUser.fulfilled.match(result)) {
      // Fetch the complete user profile (including company, roles, permissions, etc.)
      const fetchResult = await dispatch(fetchCurrentUser());
      
      // Debug: Log the full user profile after fetchCurrentUser completes
      if (fetchCurrentUser.fulfilled.match(fetchResult)) {
        console.log('Login - Full user profile after fetchCurrentUser:', fetchResult.payload);
        
        // Update onboarding status based on company data (for staff users who have company data)
        dispatch(checkOnboardingStatus());
        
        // Now that we have the complete user profile, handle the redirect
        const userProfile = fetchResult.payload;
        const hasCompany = userProfile?.company || userProfile?.company_name || userProfile?.company_data;
        const companyStr = localStorage.getItem('company');
        const hasCompanyInStorage = !!companyStr;
        const onboardingStatus = localStorage.getItem('onboarding_completed') === 'true';
        
        // Redirect based on onboarding status and company data
        if (!onboardingStatus && !hasCompany && !hasCompanyInStorage) {
          navigate('/onboarding', { replace: true });
        } else {
          const redirectPath = typeof from === 'string' ? from : (from.pathname || '/dashboard');
          navigate(redirectPath, { replace: true });
        }
      } else {
        // If fetchCurrentUser failed, still allow login but log the error
        console.error('Failed to fetch user profile after login:', fetchResult);
        // Still redirect to dashboard - user is authenticated even if profile fetch failed
        const redirectPath = typeof from === 'string' ? from : (from.pathname || '/dashboard');
        navigate(redirectPath, { replace: true });
      }
    }
  };

  const handleSwitchMethod = (method) => {
    setLoginMethod(method);
    // Clear the other field
    if (method === 'email') {
      setValue('phone', '');
    } else {
      setValue('email', '');
    }
    dispatch(clearError());
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      {/* Left Brand Panel - Hidden on mobile */}
      <Box
        sx={{
          width: { xs: 0, lg: '40%' },
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 6,
          py: 4,
          backgroundColor: theme.palette.mode === 'dark' 
            ? '#0f172a' 
            : '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)',
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
          {/* Logo Section */}
          <Box sx={{ mb: 6 }}>
            <Box
              component="img"
              src={logoMain}
              alt="Murzak POS Logo"
              onClick={() => navigate('/')}
              sx={{
                height: 48,
                mb: 2,
                cursor: 'pointer',
              }}
            />

          </Box>
          
          {/* POS Illustration */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Box
              component="img"
              src={posIcon}
              alt="POS System"
              sx={{
                maxWidth: '100%',
                height: 'auto',
                filter: theme.palette.mode === 'dark' 
                  ? 'brightness(0.9)' 
                  : 'none',
              }}
            />
          </Box>
          
          {/* Features List */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Trusted by businesses across Kenya
            </Typography>
            <Stack spacing={2}>
              {[
                'Secure cloud-based POS',
                'Real-time sales tracking',
                'Inventory management',
                'Multi-store support',
                'Tax compliance ready',
                '24/7 customer support',
              ].map((feature, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 2, fontSize: 20 }} />
                  <Typography variant="body2">{feature}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          
          {/* Stats */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(59, 130, 246, 0.05)',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  500+
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Businesses
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  24/7
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Support
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  99.9%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Uptime
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Right Panel - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: { xs: 3, md: 4 },
          px: { xs: 2, sm: 4, md: 6 },
          backgroundColor: theme.palette.mode === 'dark' 
            ? '#0f172a' 
            : '#ffffff',
        }}
      >
        <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile Header */}
          <Box sx={{ display: { lg: 'none' }, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                component="img"
                src={logoIcon}
                alt="Murzak POS"
                onClick={() => navigate('/')}
                sx={{ height: 40, width: 'auto', cursor: 'pointer' }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Murzak POS
              </Typography>
            </Box>
            <Divider />
          </Box>
          

          {/* Login Header */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                mx: 'auto',
                mb: 3,
              }}
            >
              <LockIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to access your dashboard
            </Typography>
          </Box>

          {/* Login Method Selector */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2,
              bgcolor: 'action.hover',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant={loginMethod === 'email' ? 'contained' : 'outlined'}
                onClick={() => handleSwitchMethod('email')}
                startIcon={<EmailIcon />}
                sx={{ 
                  borderRadius: 2,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Email
              </Button>
              <Button
                fullWidth
                variant={loginMethod === 'phone' ? 'contained' : 'outlined'}
                onClick={() => handleSwitchMethod('phone')}
                startIcon={<PhoneIcon />}
                sx={{ 
                  borderRadius: 2,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Phone
              </Button>
            </Box>
          </Paper>

          {/* Error Alert */}
          {error && (
            <MotionBox
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.error.light}`,
                }}
                onClose={() => dispatch(clearError())}
              >
                <Typography variant="body2" fontWeight="medium">
                  {error}
                </Typography>
              </Alert>
            </MotionBox>
          )}

          {/* Login Form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit(onSubmit)} 
            sx={{ flex: 1 }}
          >
            <Stack spacing={1.5}>
              {loginMethod === 'email' ? (
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  size="small"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isLoading}
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Phone Number"
                  type="tel"
                  size="small"
                  autoComplete="tel"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^254[17]\d{8}$/, // Kenyan phone format: 254 followed by 1 or 7, then 8 digits
                      message: 'Must be: 254 followed by 1 or 7, then 8 more digits (12 digits total)',
                    },
                  })}
                  error={!!errors.phone}
                  helperText={errors.phone?.message || 'Format: 254XXXXXXXXX (12 digits total)'}
                  disabled={isLoading}
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                />
              )}

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                size="small"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link 
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Implement forgot password functionality
                    navigate('/forgot-password');
                  }}
                  sx={{ 
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Link>
                
                <Link 
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/register');
                  }}
                  sx={{ 
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Create account
                </Link>
              </Box>

              <MotionButton
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                variant="contained"
                fullWidth
                type="submit"
                disabled={isLoading}
                endIcon={!isLoading && <ArrowForwardIcon />}
                sx={{ 
                  py: 0.875,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)',
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </MotionButton>
            </Stack>
          </Box>
        </Container>
        
        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
            By signing in, you agree to our{' '}
            <Link href="#" sx={{ fontWeight: 500 }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" sx={{ fontWeight: 500 }}>Privacy Policy</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
            © {new Date().getFullYear()} Murzak POS. All rights reserved.
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
            Need help? <Link href="mailto:murzaktechnologies@gmail.com" sx={{ fontWeight: 500 }}>murzaktechnologies@gmail.com</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
