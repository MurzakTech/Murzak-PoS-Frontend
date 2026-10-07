import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Link,
  useTheme,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  GridLegacy as Grid,
  Divider,
  LinearProgress,
  InputAdornment,
  Chip,
  Autocomplete,
  Paper,
  Avatar,
  Stack,
  InputLabel,
  FormHelperText,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  PointOfSale as POSIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  LocationOn as LocationIcon,
  BusinessCenter as IndustryIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CorporateFare as CorporateIcon,
  AccountBalance as TaxIcon,
  Language as LanguageIcon,
  AttachMoney as CurrencyIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerUser, clearError as clearAuthError, getPOSIndustries } from '../store/authSlice';
import {
  createCompany,
  createPOSProfile,
  createETIMSSettings,
  clearError,
  setCurrentStep,
  checkAbbreviationExists,
  clearAbbreviationCheck,
} from '../store/onboardingSlice';
import { showNotification } from '../store/notificationSlice';
import logoMain from '../assets/logo_mark.png';
import { normalizeKenyanPhone, isValidKenyanMobile, PHONE_ERROR } from '../utils/phone';
import logoIcon from '../assets/logo_mark.png';
import posIcon from '../assets/pos-icon.png';

const MotionCard = motion(Card);
const MotionButton = motion(Button);
const MotionBox = motion(Box);

const steps = [
  'Account Setup',
  'Company Details',
  'POS Configuration',
  'Tax Compliance',
  'Complete',
];

const stepIcons = [PersonIcon, BusinessIcon, POSIcon, SettingsIcon, CheckCircleIcon];
const stepDescriptions = [
  'Create your admin account',
  'Enter your business information',
  'Configure your POS settings',
  'Set up tax integration (optional)',
  'Ready to start using Murzak POS',
];

const Register = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading: authLoading, error: authError, isAuthenticated, industries, isLoadingIndustries, user } = useAppSelector((state) => state.auth);
  const { isLoading, error, company, posProfile, isCreatingWarehouse, abbreviationCheck } = useAppSelector((state) => state.onboarding);
  
  const [activeStep, setActiveStep] = useState(0);
  const [enableETIMS, setEnableETIMS] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // The POS profile step runs by itself with recommended settings; the manual form only appears if that fails
  const [posAutoAttempted, setPosAutoAttempted] = useState(false);
  const [stepCompleted, setStepCompleted] = useState({
    step0: false,
    step1: false,
    step2: false,
    step3: false,
  });
  
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid: isStepValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      // Step 0: Account
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      pos_industry: '',
      
      // Step 1: Company
      company_name: '',
      abbr: '',
      tax_id: '',
      country: 'Kenya',
      default_currency: 'KES',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      company_phone: '',
      company_email: '',
      contact_first_name: '',
      contact_last_name: '',
      contact_email: '',
      contact_mobile: '',
      contact_phone: '',
      
      // Step 2: POS Profile
      profile_name: '',
      update_stock: true,
      allow_discount_change: true,
      allow_rate_change: true,
      allow_partial_payment: false,
      
      // Step 3: eTIMS
      server_url: '',
      auth_server_url: '',
      tin: '',
      bhfid: '00',
      sandbox: true,
      is_active: true,
      sales_auto_submission_enabled: true,
      purchase_auto_submission_enabled: false,
      stock_auto_submission_enabled: false,
    },
  });

  const companyName = watch('company_name');
  const companyAbbr = watch('abbr');
  const firstName = watch('firstName');
  const lastName = watch('lastName');

  // Debounce timer for abbreviation checking
  const abbreviationCheckTimer = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && activeStep === 0) {
      setActiveStep(1);
    }
  }, [isAuthenticated, activeStep]);

  // Auto-generate abbreviation from company name
  useEffect(() => {
    if (companyName && !companyAbbr && activeStep === 1) {
      const words = companyName
        .split(' ')
        .filter((word) => word.trim().length > 0);
      
      let abbr = '';
      if (words.length >= 2) {
        abbr = words
          .slice(0, 3)
          .map((word) => word[0].toUpperCase())
          .join('');
      } else if (words.length === 1) {
        abbr = words[0].substring(0, 3).toUpperCase();
      }
      
      if (abbr.length >= 2) {
        setValue('abbr', abbr);
      }
    }
  }, [companyName, companyAbbr, activeStep, setValue]);

  // Check abbreviation availability when it changes (debounced)
  useEffect(() => {
    // Only check when on company details step
    if (activeStep !== 1) {
      dispatch(clearAbbreviationCheck());
      return;
    }

    // Clear previous timer
    if (abbreviationCheckTimer.current) {
      clearTimeout(abbreviationCheckTimer.current);
    }

    // Clear check state when abbreviation is cleared
    if (!companyAbbr || companyAbbr.length < 2) {
      dispatch(clearAbbreviationCheck());
      return;
    }

    // Only check if abbreviation is valid format (2-3 uppercase letters)
    if (!/^[A-Z]{2,3}$/.test(companyAbbr)) {
      return;
    }

    // Debounce the check by 500ms
    abbreviationCheckTimer.current = setTimeout(() => {
      dispatch(checkAbbreviationExists(companyAbbr));
    }, 500);

    // Cleanup
    return () => {
      if (abbreviationCheckTimer.current) {
        clearTimeout(abbreviationCheckTimer.current);
      }
    };
  }, [companyAbbr, activeStep, dispatch]);

  // Fetch industries on component mount
  useEffect(() => {
    dispatch(getPOSIndustries({ is_active: true }));
  }, [dispatch]);

  // Check if steps are already completed
  useEffect(() => {
    if (isAuthenticated) {
      setStepCompleted((prev) => ({ ...prev, step0: true }));
    }
    if (company) {
      setStepCompleted((prev) => ({ ...prev, step1: true }));
    }
    if (posProfile) {
      setStepCompleted((prev) => ({ ...prev, step2: true }));
    }
  }, [isAuthenticated, company, posProfile]);

  const handleNext = async () => {
    let isValid = false;

    if (activeStep === 0) {
      return;
    } else if (activeStep === 1) {
      const requiredFields = ['company_name', 'abbr', 'country', 'default_currency', 'address_line1', 'city'];
      isValid = await trigger(requiredFields);
      if (isValid) {
        await handleSubmitCompany();
        return;
      }
    } else if (activeStep === 2) {
      await handleSubmitPOSProfile();
      return;
    } else if (activeStep === 3) {
      if (enableETIMS) {
        isValid = await trigger(['server_url', 'tin']);
        if (isValid) {
          await handleSubmitETIMS();
          return;
        }
      } else {
        isValid = true;
        await handleSubmitETIMS();
        return;
      }
    }

    if (isValid && activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleSubmitAccount = async (data) => {
    dispatch(clearAuthError());
    
    const userData = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      password: data.password,
      phone: data.phone ? normalizeKenyanPhone(data.phone) : undefined,
      send_welcome_email: false,
      pos_industry: data.pos_industry || undefined,
    };

    const result = await dispatch(registerUser(userData));
    
    if (registerUser.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step0: true }));
      setActiveStep(1);
    }
  };

  const handleSubmitCompany = async () => {
    dispatch(clearError());
    const values = watch();

    // Check if abbreviation is taken before submitting
    if (abbreviationCheck.exists && abbreviationCheck.abbr === values.abbr?.toUpperCase()) {
      dispatch(showNotification({
        message: abbreviationCheck.message || `Abbreviation '${values.abbr}' is already taken. Please choose a different one.`,
        severity: 'error',
        title: 'Abbreviation Not Available',
      }));
      return;
    }

    const companyData = {
      company_name: values.company_name,
      abbr: values.abbr,
      country: values.country,
      default_currency: values.default_currency,
      tax_id: values.tax_id || undefined,
      company_address: {
        address_line1: values.address_line1,
        address_line2: values.address_line2 || undefined,
        city: values.city,
        state: values.state || undefined,
        country: values.country,
        pincode: values.pincode || undefined,
        phone: values.company_phone || undefined,
        email_id: values.company_email || values.email,
      },
      company_contact: {
        first_name: values.contact_first_name || values.firstName,
        last_name: values.contact_last_name || values.lastName,
        email: values.contact_email || values.email,
        mobile: values.contact_mobile || undefined,
        phone: values.contact_phone || undefined,
      },
    };

    const result = await dispatch(createCompany(companyData));
    
    if (createCompany.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step1: true }));
      dispatch(showNotification({
        message: 'Company created successfully!',
        severity: 'success',
        title: 'Company Created',
      }));
      setActiveStep(2);
    } else {
      dispatch(showNotification({
        message: 'Failed to create company. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
    }
  };

  const handleSubmitPOSProfile = async () => {
    dispatch(clearError());
    const values = watch();

    if (!company) {
      dispatch(showNotification({
        message: 'Please complete company information first',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    const posProfileData = {
      company: company.name || company.company_name,
      profile_name: values.profile_name || `${company.company_name || company.name} POS`,
      update_stock: values.update_stock ?? true,
      allow_discount_change: values.allow_discount_change ?? true,
      allow_rate_change: values.allow_rate_change ?? true,
      allow_partial_payment: values.allow_partial_payment ?? false,
      companyData: {
        company_address: {
          address_line1: values.address_line1,
          address_line2: values.address_line2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          phone: values.company_phone,
          email_id: values.company_email || values.email,
        },
        company_contact: {
          phone: values.contact_phone,
          mobile: values.contact_mobile,
          email: values.contact_email || values.email,
        },
      },
    };

    const result = await dispatch(createPOSProfile(posProfileData));
    
    if (createPOSProfile.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step2: true }));
      dispatch(showNotification({
        message: 'POS Profile created successfully! Default warehouse is being provisioned...',
        severity: 'success',
        title: 'POS Profile Created',
      }));
      setTimeout(() => {
        setActiveStep(3);
      }, 1000);
    } else {
      dispatch(showNotification({
        message: 'Failed to create POS Profile. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
    }
  };

  const handleSubmitETIMS = async () => {
    dispatch(clearError());
    const values = watch();

    if (!enableETIMS) {
      dispatch(showNotification({
        message: 'Onboarding completed successfully!',
        severity: 'success',
        title: 'Setup Complete',
      }));
      
      localStorage.setItem('onboarding_completed', 'true');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!company) {
      dispatch(clearError());
      return;
    }

    const etimsData = {
      company: company.name || company.company_name,
      server_url: values.server_url,
      auth_server_url: values.auth_server_url || undefined,
      tin: values.tin,
      bhfid: values.bhfid || '00',
      sandbox: values.sandbox ?? true,
      is_active: values.is_active ?? true,
      client_id: values.client_id || undefined,
      client_secret: values.client_secret || undefined,
      auth_username: values.auth_username || undefined,
      auth_password: values.auth_password || undefined,
      sales_auto_submission_enabled: values.sales_auto_submission_enabled ?? true,
      purchase_auto_submission_enabled: values.purchase_auto_submission_enabled ?? false,
      stock_auto_submission_enabled: values.stock_auto_submission_enabled ?? false,
    };

    const result = await dispatch(createETIMSSettings(etimsData));
    
    if (createETIMSSettings.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step3: true }));
      dispatch(showNotification({
        message: 'Onboarding completed successfully!',
        severity: 'success',
        title: 'Setup Complete',
      }));
      localStorage.setItem('onboarding_completed', 'true');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    }
  };

  // Skip a step that has nothing to decide: create the POS profile with the recommended
  // defaults as soon as the company exists. People can change these in Settings later.
  useEffect(() => {
    if (activeStep === 2 && company && !posProfile && !isLoading && !posAutoAttempted) {
      setPosAutoAttempted(true);
      handleSubmitPOSProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, company, posProfile, isLoading, posAutoAttempted]);

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Account Information
        return (
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                Create Admin Account
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Set up your administrator account to manage your business
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="firstName"
                    control={control}
                    rules={{
                      required: 'First name is required',
                      minLength: { value: 2, message: 'Minimum 2 characters' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="First Name"
                        size="small"
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                        disabled={authLoading || isAuthenticated}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="lastName"
                    control={control}
                    rules={{
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Minimum 2 characters' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Last Name"
                        size="small"
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                        disabled={authLoading || isAuthenticated}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email"
                    type="email"
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={authLoading || isAuthenticated}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                rules={{
                  // Optional; when given, accept the usual ways of writing a Kenyan number
                  validate: (v) => !v || isValidKenyanMobile(v) || PHONE_ERROR,
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Phone (optional)"
                    type="tel"
                    size="small"
                    error={!!errors.phone}
                    helperText={errors.phone?.message || 'For example 0712 345 678'}
                    disabled={authLoading || isAuthenticated}
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
              />
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        size="small"
                        error={!!errors.password}
                        helperText={errors.password?.message || 'At least 8 characters. Tap the eye to check what you typed.'}
                        disabled={authLoading || isAuthenticated}
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
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? (
                                  <VisibilityOffIcon sx={{ fontSize: 16 }} />
                                ) : (
                                  <VisibilityIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
              
              <Controller
                name="pos_industry"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={industries || []}
                    getOptionLabel={(option) => {
                      if (!option) return '';
                      if (typeof option === 'string') return option;
                      return option.industry_name || option.industry_code || '';
                    }}
                    value={
                      industries?.find(
                        (ind) => ind.industry_code === field.value || ind.name === field.value
                      ) || null
                    }
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.industry_code || newValue?.name || '');
                    }}
                    loading={isLoadingIndustries}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Business Industry (optional)"
                        size="small"
                        disabled={authLoading || isAuthenticated}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <IndustryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ py: 1.5, px: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Typography variant="body1" fontWeight="medium">
                            {option.industry_name}
                          </Typography>
                          {option.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              {option.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  />
                )}
              />
            </Stack>
          </MotionBox>
        );

      case 1: // Company Information
        return (
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                Company Information
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Tell us about your business
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              <Controller
                name="company_name"
                control={control}
                rules={{
                  required: 'Company name is required',
                  minLength: { value: 2, message: 'Minimum 2 characters' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Name"
                    size="small"
                    error={!!errors.company_name}
                    helperText={errors.company_name?.message}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="abbr"
                    control={control}
                    rules={{
                      required: 'Abbreviation is required',
                      minLength: { value: 2, message: 'Must be 2-3 characters' },
                      maxLength: { value: 3, message: 'Must be 2-3 characters' },
                      pattern: {
                        value: /^[A-Z]{2,3}$/,
                        message: '2-3 uppercase letters only',
                      },
                      validate: (value) => {
                        if (abbreviationCheck.exists && abbreviationCheck.abbr === value?.toUpperCase()) {
                          return abbreviationCheck.message || 'This abbreviation is already taken';
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <>
                        <TextField
                          {...field}
                          fullWidth
                          label="Abbreviation"
                          size="small"
                          error={!!errors.abbr || (abbreviationCheck.exists && abbreviationCheck.abbr === companyAbbr?.toUpperCase())}
                          helperText={
                            errors.abbr?.message ||
                            (abbreviationCheck.checking && 'Checking availability...') ||
                            (abbreviationCheck.exists && abbreviationCheck.abbr === companyAbbr?.toUpperCase() 
                              ? abbreviationCheck.message || 'This abbreviation is already taken'
                              : abbreviationCheck.abbr === companyAbbr?.toUpperCase() && !abbreviationCheck.exists
                              ? '✓ Abbreviation is available'
                              : '2-3 uppercase letters')
                          }
                          disabled={isLoading}
                          inputProps={{ 
                            style: { textTransform: 'uppercase' },
                            maxLength: 3
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                        {abbreviationCheck.exists && abbreviationCheck.abbr === companyAbbr?.toUpperCase() && abbreviationCheck.company && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Abbreviation '{abbreviationCheck.abbr}' is already used by:</strong> {abbreviationCheck.company.name || abbreviationCheck.company.company_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              Please choose a different abbreviation.
                            </Typography>
                          </Alert>
                        )}
                      </>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="tax_id"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Tax ID (optional)"
                        size="small"
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <TaxIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="country"
                    control={control}
                    rules={{ required: 'Country is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Country"
                        size="small"
                        error={!!errors.country}
                        helperText={errors.country?.message}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LanguageIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="default_currency"
                    control={control}
                    rules={{ required: 'Currency is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Currency"
                        size="small"
                        error={!!errors.default_currency}
                        helperText={errors.default_currency?.message}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CurrencyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
              
              <Controller
                name="address_line1"
                control={control}
                rules={{ required: 'Address is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Street Address"
                    size="small"
                    error={!!errors.address_line1}
                    helperText={errors.address_line1?.message}
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />

              <Controller
                name="city"
                control={control}
                rules={{ required: 'City is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="City"
                    size="small"
                    error={!!errors.city}
                    helperText={errors.city?.message}
                    disabled={isLoading}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />
            </Stack>
          </MotionBox>
        );

      case 2: // POS Profile
        return (
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                Setting up your till
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We are applying recommended settings: stock updates automatically, and discounts and price changes are allowed at the till. You can change any of this later in Settings.
              </Typography>
            </Box>

            {isLoading && (
              <Alert 
                severity="info" 
                sx={{ mb: 3, borderRadius: 2 }}
                icon={<CircularProgress size={20} />}
              >
                Creating POS Profile...
              </Alert>
            )}
            
            {posProfile && !isLoading && (
              <Alert 
                severity="success" 
                sx={{ mb: 3, borderRadius: 2 }}
                icon={<CheckCircleIcon />}
              >
                POS Profile created successfully! Default warehouse is being provisioned...
              </Alert>
            )}
            
            {isCreatingWarehouse && posProfile && (
              <Alert 
                severity="info" 
                sx={{ mb: 3, borderRadius: 2 }}
                icon={<CircularProgress size={20} />}
              >
                Creating default warehouse for inventory management...
              </Alert>
            )}

            {posAutoAttempted && !isLoading && !posProfile && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                We could not set this up automatically. Check the options below and press Next to try again.
              </Alert>
            )}

            {posAutoAttempted && !isLoading && !posProfile && (
            <Stack spacing={1.5}>
              <Controller
                name="profile_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="POS Profile Name (optional)"
                    size="small"
                    placeholder="Leave empty for default"
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <POSIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />
              
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  POS Settings
                </Typography>
                <Grid container spacing={0.5}>
                  <Grid item xs={6}>
                    <Controller
                      name="update_stock"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Auto update stock</Typography>}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Controller
                      name="allow_discount_change"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Allow discounts</Typography>}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Controller
                      name="allow_rate_change"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Allow rate change</Typography>}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Controller
                      name="allow_partial_payment"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Partial payments</Typography>}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
            )}
          </MotionBox>
        );

      case 3: // eTIMS Settings
        return (
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                Tax Compliance Settings
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Configure eTIMS integration for tax compliance
              </Typography>
            </Box>

            <Alert severity="info" sx={{ py: 0.25, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              eTIMS is optional. You can configure it later.
            </Alert>

            <FormControlLabel
              control={<Checkbox checked={enableETIMS} onChange={(e) => setEnableETIMS(e.target.checked)} size="small" disabled={isLoading} />}
              label={<Typography variant="caption" fontWeight={500}>Enable eTIMS Integration</Typography>}
            />

            {enableETIMS && (
              <Stack spacing={1.5}>
                <Controller
                  name="server_url"
                  control={control}
                  rules={{ required: enableETIMS ? 'Server URL is required' : false }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Server URL"
                      size="small"
                      placeholder="https://api.etims.gov.ke"
                      error={!!errors.server_url}
                      helperText={errors.server_url?.message}
                      disabled={isLoading}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tin"
                      control={control}
                      rules={{ required: enableETIMS ? 'TIN is required' : false }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="TIN"
                          size="small"
                          error={!!errors.tin}
                          helperText={errors.tin?.message}
                          disabled={isLoading}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="bhfid"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Branch ID"
                          size="small"
                          disabled={isLoading}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Auto Submission
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Controller
                      name="sales_auto_submission_enabled"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Sales</Typography>}
                        />
                      )}
                    />
                    <Controller
                      name="purchase_auto_submission_enabled"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Purchases</Typography>}
                        />
                      )}
                    />
                    <Controller
                      name="stock_auto_submission_enabled"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                          label={<Typography variant="caption">Stock</Typography>}
                        />
                      )}
                    />
                  </Stack>
                </Box>

                <Controller
                  name="sandbox"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} size="small" disabled={isLoading} />}
                      label={<Typography variant="caption">Use sandbox environment</Typography>}
                    />
                  )}
                />
              </Stack>
            )}
          </MotionBox>
        );

      case 4: // Complete
        return (
          <MotionBox
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            sx={{ textAlign: 'center', py: 4 }}
          >
            <Box sx={{ position: 'relative', mb: 4 }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  backgroundColor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
              </Box>
              
              <Box
                component="img"
                src={logoIcon}
                alt="Murzak POS"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  height: 40,
                  width: 'auto',
                }}
              />
            </Box>
            
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
              Welcome to Murzak POS!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Your business is now set up and ready to go. You'll be redirected to your dashboard shortly.
            </Typography>
            
            <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', mb: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.success.light}`,
                      bgcolor: 'success.light',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="medium">
                        Account Created
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.success.light}`,
                      bgcolor: 'success.light',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="medium">
                        Company Setup
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.success.light}`,
                      bgcolor: 'success.light',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="medium">
                        POS Profile
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: `1px solid ${isCreatingWarehouse ? theme.palette.warning.light : theme.palette.success.light}`,
                      bgcolor: isCreatingWarehouse ? 'warning.light' : 'success.light',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {isCreatingWarehouse ? (
                        <CircularProgress size={16} color="warning" />
                      ) : (
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      )}
                      <Typography variant="body2" fontWeight="medium">
                        {isCreatingWarehouse ? 'Creating Warehouse...' : 'Default Warehouse'}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mt: 4 }}>
              <CircularProgress size={24} sx={{ color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Redirecting to dashboard...
              </Typography>
            </Box>
          </MotionBox>
        );

      default:
        return null;
    }
  };

  const progress = ((activeStep + 1) / steps.length) * 100;

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
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
              Murzak POS
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Modern Point of Sale for Growing Businesses
            </Typography>
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
              Everything you need to run your business
            </Typography>
            <Stack spacing={2}>
              {[
                'Real-time inventory tracking',
                'Multiple payment methods',
                'Sales analytics & reports',
                'Customer management',
                'Tax compliance integration',
                'Mobile & tablet ready',
              ].map((feature, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 2, fontSize: 20 }} />
                  <Typography variant="body2">{feature}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          
          {/* Testimonial */}
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
            <Typography variant="body2" fontStyle="italic" color="text.secondary" sx={{ mb: 2 }}>
              "Murzak POS transformed our retail operations. Setup was smooth and the platform is incredibly intuitive."
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 40, height: 40, mr: 2 }}>
                {firstName?.[0] || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {firstName ? `${firstName} ${lastName}` : 'Business Owner'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {companyName || 'Retail Business'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Right Panel - Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: { xs: 3, md: 4 },
          px: { xs: 2, sm: 4, md: 6 },
          overflowY: 'auto',
          backgroundColor: theme.palette.mode === 'dark' 
            ? '#0f172a' 
            : '#ffffff',
        }}
      >
        <Container maxWidth="md" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile Header */}
          <Box sx={{ display: { lg: 'none' }, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              {activeStep > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
              )}
            </Box>
            <Divider />
          </Box>
          
          {/* Desktop Header */}
          <Box sx={{ display: { xs: 'none', lg: 'block' }, mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src={logoIcon}
                  alt="Murzak POS"
                  onClick={() => navigate('/')}
                  sx={{ height: 48, width: 'auto', cursor: 'pointer' }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Murzak POS Setup
                </Typography>
              </Box>
              {activeStep > 0 && (
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Previous Step
                </Button>
              )}
            </Box>
            <Divider />
          </Box>

          {/* Step Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  color: 'white',
                }}
              >
                {React.createElement(stepIcons[activeStep])}
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {steps[activeStep]}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stepDescriptions[activeStep]}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Progress Stepper */}
          {activeStep < 4 && (
            <Box sx={{ mb: 4 }}>
              <Stepper 
                activeStep={activeStep}
                alternativeLabel
                sx={{
                  '& .MuiStepConnector-root': {
                    top: 12,
                    '& .MuiStepConnector-line': {
                      borderColor: theme.palette.divider,
                      borderWidth: 2,
                    },
                    '&.Mui-active .MuiStepConnector-line, &.Mui-completed .MuiStepConnector-line': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              >
                {steps.slice(0, 4).map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconComponent={(props) => {
                        const Icon = stepIcons[index];
                        return (
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: props.active || props.completed 
                                ? 'primary.main' 
                                : theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.08)',
                              color: props.active || props.completed 
                                ? 'white' 
                                : 'text.secondary',
                              border: props.active ? '2px solid white' : 'none',
                              boxShadow: props.active ? '0 0 0 2px primary.main' : 'none',
                            }}
                          >
                            {props.completed ? (
                              <CheckCircleIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <Icon sx={{ fontSize: 14 }} />
                            )}
                          </Box>
                        );
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: activeStep === index ? 600 : 400,
                          fontSize: '0.75rem',
                        }}
                      >
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              {/* Progress Bar */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    {Math.round(progress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.08)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: 'primary.main',
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Error Alerts */}
          <AnimatePresence>
            {(authError || error) && (
              <MotionBox
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3, 
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.error.light}`,
                  }}
                  onClose={() => {
                    if (authError) dispatch(clearAuthError());
                    if (error) dispatch(clearError());
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {authError || error}
                  </Typography>
                </Alert>
              </MotionBox>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <Box sx={{ flex: 1, mb: 4 }}>
            <AnimatePresence mode="wait">
              {renderStepContent(activeStep)}
            </AnimatePresence>
          </Box>

          {/* Navigation Buttons */}
          {activeStep < 4 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
              {activeStep === 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Already have an account?{' '}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate('/login')}
                      sx={{ 
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Sign In
                    </Link>
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  disabled={isLoading || authLoading}
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    borderRadius: 2,
                    px: 3,
                    py: 1.25,
                  }}
                >
                  Back
                </Button>
              )}
              
              <MotionButton
                whileHover={{ scale: isLoading || authLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading || authLoading ? 1 : 0.98 }}
                variant="contained"
                onClick={activeStep === 0 ? handleSubmit(handleSubmitAccount) : () => handleNext()}
                disabled={isLoading || authLoading}
                endIcon={activeStep < 3 && <ArrowForwardIcon />}
                sx={{ 
                  borderRadius: 2,
                  px: 4,
                  py: 1.25,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)',
                  },
                }}
              >
                {isLoading || authLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : activeStep === 3 ? (
                  enableETIMS ? 'Complete Setup' : 'Skip & Complete'
                ) : activeStep === 0 ? (
                  'Create Account'
                ) : (
                  'Continue'
                )}
              </MotionButton>
            </Box>
          )}
        </Container>
        
        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
            By continuing, you agree to our{' '}
            <Link href="#" sx={{ fontWeight: 500 }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" sx={{ fontWeight: 500 }}>Privacy Policy</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
            © {new Date().getFullYear()} Murzak. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
