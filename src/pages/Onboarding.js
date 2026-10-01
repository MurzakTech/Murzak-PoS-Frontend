import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  GridLegacy as Grid,
  Divider,
  useTheme,
  Paper,
  Stack,
  InputAdornment,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccountBalance as TaxIcon,
  Language as LanguageIcon,
  AttachMoney as CurrencyIcon,
  PointOfSale as POSIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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

const MotionCard = motion(Card);
const MotionButton = motion(Button);

const steps = ['Company Information', 'POS Profile', 'eTIMS Settings (Optional)'];

const Onboarding = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading, error, isCompleted, currentStep, company, posProfile, abbreviationCheck } = useAppSelector((state) => state.onboarding);
  const { user } = useAppSelector((state) => state.auth);
  
  const [enableETIMS, setEnableETIMS] = useState(false);
  const [stepCompleted, setStepCompleted] = useState({
    step1: false,
    step2: false,
    step3: false,
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      // Company defaults
      country: 'Kenya',
      default_currency: 'KES',
      // POS Profile defaults
      update_stock: true,
      allow_discount_change: true,
      allow_rate_change: true,
      allow_partial_payment: false,
      // eTIMS defaults
      sandbox: true,
      is_active: true,
      sales_auto_submission_enabled: true,
      purchase_auto_submission_enabled: false,
      stock_auto_submission_enabled: false,
    },
  });

  const companyName = watch('company_name');
  const companyAbbr = watch('abbr');

  // Debounce timer for abbreviation checking
  const abbreviationCheckTimer = useRef(null);

  // Auto-generate abbreviation from company name
  useEffect(() => {
    if (companyName && !companyAbbr) {
      const words = companyName
        .split(' ')
        .filter((word) => word.trim().length > 0); // Filter out empty strings
      
      let abbr = '';
      if (words.length >= 2) {
        // If multiple words, take first letter of each word (up to 3 words)
        abbr = words
          .slice(0, 3)
          .map((word) => word[0].toUpperCase())
          .join('');
      } else if (words.length === 1) {
        // If single word, take first 2-3 characters
        abbr = words[0].substring(0, 3).toUpperCase();
      }
      
      // Ensure abbreviation is 2-3 characters (required by validation)
      if (abbr.length >= 2) {
        setValue('abbr', abbr);
      }
    }
  }, [companyName, companyAbbr, setValue]);

  // Check abbreviation availability when it changes (debounced)
  useEffect(() => {
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
  }, [companyAbbr, dispatch]);

  // Check if steps are already completed
  useEffect(() => {
    if (company) {
      setStepCompleted((prev) => ({ ...prev, step1: true }));
    }
    if (posProfile) {
      setStepCompleted((prev) => ({ ...prev, step2: true }));
    }
  }, [company, posProfile]);

  // Redirect if onboarding is completed
  useEffect(() => {
    if (isCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [isCompleted, navigate]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleNext = async (e) => {
    e?.preventDefault();
    
    // If step is already completed, just move to next step
    if (currentStep === 1 && stepCompleted.step1) {
      dispatch(setCurrentStep(currentStep + 1));
      return;
    }
    if (currentStep === 2 && stepCompleted.step2) {
      dispatch(setCurrentStep(currentStep + 1));
      return;
    }

    // Otherwise, validate and submit the current step
    const values = watch();
    
    if (currentStep === 1) {
      // Validate required fields for step 1
      const requiredFields = ['company_name', 'abbr', 'country', 'default_currency', 'address_line1', 'city'];
      const missingFields = requiredFields.filter(field => !values[field]);
      
      if (missingFields.length > 0) {
        // Trigger form validation by submitting
        const form = e?.target?.closest('form');
        if (form) {
          form.requestSubmit();
        }
        return;
      }
      
      // Submit company creation
      await handleSubmitCompany(values);
    } else if (currentStep === 2) {
      // Submit POS profile creation (no required fields, can proceed)
      await handleSubmitPOSProfile(values);
    }
  };

  const handleSubmitCompany = async (data) => {
    dispatch(clearError());

    // Check if abbreviation is taken before submitting
    if (abbreviationCheck.exists && abbreviationCheck.abbr === data.abbr?.toUpperCase()) {
      dispatch(showNotification({
        message: abbreviationCheck.message || `Abbreviation '${data.abbr}' is already taken. Please choose a different one.`,
        severity: 'error',
        title: 'Abbreviation Not Available',
      }));
      return;
    }

    const companyData = {
      company_name: data.company_name,
      abbr: data.abbr,
      country: data.country,
      default_currency: data.default_currency,
      tax_id: data.tax_id || undefined,
      company_logo: data.company_logo || undefined,
      company_address: {
        address_line1: data.address_line1,
        address_line2: data.address_line2 || undefined,
        city: data.city,
        state: data.state || undefined,
        country: data.country,
        pincode: data.pincode || undefined,
        phone: data.company_phone || undefined,
        email: data.company_email || user?.email,
      },
      company_contact: {
        first_name: user?.first_name || data.contact_first_name,
        last_name: user?.last_name || data.contact_last_name,
        email: user?.email || data.contact_email,
        mobile: data.contact_mobile || undefined,
        phone: data.contact_phone || undefined,
      },
    };

    const result = await dispatch(createCompany(companyData));
    
    if (createCompany.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step1: true }));
      dispatch(setCurrentStep(2));
    }
  };

  const handleSubmitPOSProfile = async (data) => {
    dispatch(clearError());

    if (!company) {
      dispatch(clearError());
      // This shouldn't happen, but handle it gracefully
      return;
    }

    const posProfileData = {
      company: company.name || company.company_name,
      profile_name: data.profile_name || `${company.company_name || company.name} POS`,
      update_stock: data.update_stock ?? true,
      allow_discount_change: data.allow_discount_change ?? true,
      allow_rate_change: data.allow_rate_change ?? true,
      allow_partial_payment: data.allow_partial_payment ?? false,
    };

    const result = await dispatch(createPOSProfile(posProfileData));
    
    if (createPOSProfile.fulfilled.match(result)) {
      setStepCompleted((prev) => ({ ...prev, step2: true }));
      dispatch(setCurrentStep(3));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1));
    }
  };

  const onSubmit = async (data) => {
    dispatch(clearError());

    // This is called on the final step (step 3 - eTIMS)
    // If eTIMS is enabled, create eTIMS settings, otherwise mark onboarding as complete
    if (enableETIMS) {
      if (!company) {
        dispatch(clearError());
        return;
      }

      const etimsData = {
        company: company.name || company.company_name,
        server_url: data.server_url,
        auth_server_url: data.auth_server_url || undefined,
        tin: data.tin,
        bhfid: data.bhfid || '00',
        sandbox: data.sandbox ?? true,
        is_active: data.is_active ?? true,
        client_id: data.client_id || undefined,
        client_secret: data.client_secret || undefined,
        auth_username: data.auth_username || undefined,
        auth_password: data.auth_password || undefined,
        sales_auto_submission_enabled: data.sales_auto_submission_enabled ?? true,
        purchase_auto_submission_enabled: data.purchase_auto_submission_enabled ?? false,
        stock_auto_submission_enabled: data.stock_auto_submission_enabled ?? false,
      };

      const result = await dispatch(createETIMSSettings(etimsData));
      
      if (createETIMSSettings.fulfilled.match(result)) {
        setStepCompleted((prev) => ({ ...prev, step3: true }));
        // Small delay to show success notification before redirect
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
    } else {
      // Skip eTIMS, mark onboarding as completed
      // Show success notification
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

  const renderStepContent = (step) => {
    switch (step) {
      case 1:
        return (
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="Company Name"
              size="small"
              {...register('company_name', {
                required: 'Company name is required',
                minLength: {
                  value: 2,
                  message: 'Company name must be at least 2 characters',
                },
              })}
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
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Abbreviation"
                  size="small"
                  placeholder="e.g., MBL"
                  {...register('abbr', {
                    required: 'Abbreviation is required',
                    minLength: { value: 2, message: 'Must be at least 2 characters' },
                    maxLength: { value: 3, message: 'Must be at most 3 characters' },
                    pattern: {
                      value: /^[A-Z]{2,3}$/,
                      message: 'Must be 2-3 uppercase letters',
                    },
                    validate: (value) => {
                      if (abbreviationCheck.exists && abbreviationCheck.abbr === value?.toUpperCase()) {
                        return abbreviationCheck.message || 'This abbreviation is already taken';
                      }
                      return true;
                    },
                  })}
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
                  inputProps={{ style: { textTransform: 'uppercase' } }}
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tax ID (optional)"
                  size="small"
                  placeholder="e.g., P123456789A"
                  {...register('tax_id')}
                  error={!!errors.tax_id}
                  helperText={errors.tax_id?.message}
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  size="small"
                  {...register('country', { required: 'Country is required' })}
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  size="small"
                  {...register('default_currency', { required: 'Currency is required' })}
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
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Address Line 1"
              size="small"
              {...register('address_line1', { required: 'Address is required' })}
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
            <TextField
              fullWidth
              label="City"
              size="small"
              {...register('city', { required: 'City is required' })}
              error={!!errors.city}
              helperText={errors.city?.message}
              disabled={isLoading}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            />
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="POS Profile Name (optional)"
              size="small"
              placeholder="Leave empty for default"
              {...register('profile_name')}
              error={!!errors.profile_name}
              helperText={errors.profile_name?.message || 'Leave empty to use default'}
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
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                POS Settings
              </Typography>
              <Grid container spacing={0.5}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox {...register('update_stock')} defaultChecked size="small" disabled={isLoading} />}
                    label={<Typography variant="caption">Auto update stock</Typography>}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox {...register('allow_discount_change')} defaultChecked size="small" disabled={isLoading} />}
                    label={<Typography variant="caption">Allow discounts</Typography>}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox {...register('allow_rate_change')} defaultChecked size="small" disabled={isLoading} />}
                    label={<Typography variant="caption">Allow rate change</Typography>}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox {...register('allow_partial_payment')} size="small" disabled={isLoading} />}
                    label={<Typography variant="caption">Partial payments</Typography>}
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={1.5}>
            <Alert severity="info" sx={{ py: 0.25, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              eTIMS is optional. You can configure it later.
            </Alert>
            <FormControlLabel
              control={<Checkbox checked={enableETIMS} onChange={(e) => setEnableETIMS(e.target.checked)} size="small" disabled={isLoading} />}
              label={<Typography variant="caption" fontWeight={500}>Enable eTIMS Integration</Typography>}
            />
            {enableETIMS && (
              <Stack spacing={1.5}>
                <TextField
                  fullWidth
                  label="Server URL"
                  size="small"
                  placeholder="https://api.erp.release.slade360edi.com"
                  {...register('server_url', {
                    required: enableETIMS ? 'Server URL is required' : false,
                  })}
                  error={!!errors.server_url}
                  helperText={errors.server_url?.message}
                  disabled={isLoading}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="TIN"
                      size="small"
                      {...register('tin', {
                        required: enableETIMS ? 'TIN is required' : false,
                      })}
                      error={!!errors.tin}
                      helperText={errors.tin?.message}
                      disabled={isLoading}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Branch ID"
                      size="small"
                      defaultValue="00"
                      {...register('bhfid')}
                      disabled={isLoading}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    Auto Submission
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <FormControlLabel
                      control={<Checkbox {...register('sales_auto_submission_enabled')} defaultChecked size="small" disabled={isLoading} />}
                      label={<Typography variant="caption">Sales</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox {...register('purchase_auto_submission_enabled')} size="small" disabled={isLoading} />}
                      label={<Typography variant="caption">Purchases</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox {...register('stock_auto_submission_enabled')} size="small" disabled={isLoading} />}
                      label={<Typography variant="caption">Stock</Typography>}
                    />
                  </Stack>
                </Box>
                <FormControlLabel
                  control={<Checkbox {...register('sandbox')} defaultChecked size="small" disabled={isLoading} />}
                  label={<Typography variant="caption">Use sandbox environment</Typography>}
                />
              </Stack>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{
            boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                component="img"
                src={logoMain}
                alt="Murzak POS"
                sx={{ height: 50, mb: 2 }}
              />
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                Welcome! Let's Set Up Your Business
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete your business profile to get started
              </Typography>
            </Box>

            <Stepper activeStep={currentStep - 1} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={currentStep === 3 ? handleSubmit(onSubmit) : (e) => { e.preventDefault(); handleNext(e); }}>
              <Paper sx={{ p: 3, mb: 3, minHeight: 400 }}>
                {renderStepContent(currentStep)}
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  onClick={handleBack}
                  disabled={currentStep === 1 || isLoading}
                  variant="outlined"
                >
                  Back
                </Button>
                {currentStep < steps.length ? (
                  <MotionButton
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    onClick={handleNext}
                    variant="contained"
                    disabled={isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : stepCompleted[`step${currentStep}`] ? (
                      'Next'
                    ) : (
                      'Save & Continue'
                    )}
                  </MotionButton>
                ) : (
                  <MotionButton
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : enableETIMS ? (
                      'Save eTIMS & Complete'
                    ) : (
                      'Complete Setup'
                    )}
                  </MotionButton>
                )}
              </Box>
            </Box>
          </CardContent>
        </MotionCard>
      </Container>
    </Box>
  );
};

export default Onboarding;

