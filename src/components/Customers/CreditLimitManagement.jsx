import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  GridLegacy as Grid,
  Alert,
  LinearProgress,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Warning, CheckCircle } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setCustomerCreditLimit,
  getCustomerCreditLimit,
  removeCustomerCreditLimit,
  clearCreditLimit,
} from '../../store/customerSlice';

const CreditLimitManagement = ({ customer, company, onUpdate }) => {
  const dispatch = useAppDispatch();
  const {
    creditLimit,
    isLoadingCreditLimit,
    isUpdatingCreditLimit,
    creditLimitError,
  } = useAppSelector((state) => state.customer);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from props or user profile
  const userCompany =
    company ||
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [formData, setFormData] = useState({
    credit_limit: '',
    bypass_credit_limit_check: false,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      credit_limit: '',
      bypass_credit_limit_check: false,
    },
  });

  // Fetch credit limit on mount and when customer/company changes
  useEffect(() => {
    if (customer && userCompany) {
      dispatch(getCustomerCreditLimit({ customer, company: userCompany }));
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearCreditLimit());
    };
  }, [customer, userCompany, dispatch]);

  // Update form when credit limit data is loaded
  useEffect(() => {
    if (creditLimit) {
      // Handle both single company object and array response
      const creditInfo = Array.isArray(creditLimit)
        ? creditLimit.find((cl) => cl.company === userCompany) || creditLimit[0]
        : creditLimit;

      if (creditInfo) {
        const creditLimitValue =
          creditInfo.credit_limit !== null && creditInfo.credit_limit !== undefined
            ? creditInfo.credit_limit.toString()
            : '';
        
        setFormData({
          credit_limit: creditLimitValue,
          bypass_credit_limit_check: creditInfo.bypass_credit_limit_check || false,
        });

        setValue('credit_limit', creditLimitValue);
        setValue('bypass_credit_limit_check', creditInfo.bypass_credit_limit_check || false);
      }
    }
  }, [creditLimit, userCompany, setValue]);

  const handleFormSubmit = async (data) => {
    if (!customer || !userCompany) {
      return;
    }

    const result = await dispatch(
      setCustomerCreditLimit({
        customer,
        company: userCompany,
        credit_limit: data.credit_limit === '' || data.credit_limit === '0' ? 0 : parseFloat(data.credit_limit),
        bypass_credit_limit_check: data.bypass_credit_limit_check,
      })
    );

    if (result.type === 'customer/setCustomerCreditLimit/fulfilled') {
      // Refresh credit limit data
      await dispatch(getCustomerCreditLimit({ customer, company: userCompany }));
      if (onUpdate) {
        onUpdate();
      }
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove the credit limit? It will fall back to customer group or company default.')) {
      return;
    }

    if (!customer || !userCompany) {
      return;
    }

    const result = await dispatch(
      removeCustomerCreditLimit({
        customer,
        company: userCompany,
      })
    );

    if (result.type === 'customer/removeCustomerCreditLimit/fulfilled') {
      // Refresh credit limit data
      await dispatch(getCustomerCreditLimit({ customer, company: userCompany }));
      if (onUpdate) {
        onUpdate();
      }
    }
  };

  // Get credit info (handle both single object and array)
  const getCreditInfo = () => {
    if (!creditLimit) return null;
    
    if (Array.isArray(creditLimit)) {
      return creditLimit.find((cl) => cl.company === userCompany) || creditLimit[0];
    }
    
    return creditLimit;
  };

  const creditInfo = getCreditInfo();

  // Calculate utilization color
  const getUtilizationColor = (percent) => {
    if (!percent && percent !== 0) return 'default';
    if (percent > 100) return 'error'; // Over limit
    if (percent > 80) return 'warning'; // High utilization
    if (percent > 50) return 'info'; // Medium utilization
    return 'success'; // Low utilization
  };

  // Get utilization color for display
  const getUtilizationDisplayColor = (percent) => {
    if (!percent && percent !== 0) return '#757575';
    if (percent > 100) return '#d32f2f'; // Red - over limit
    if (percent > 80) return '#ed6c02'; // Orange - high
    if (percent > 50) return '#0288d1'; // Blue - medium
    return '#2e7d32'; // Green - low
  };

  if (isLoadingCreditLimit && !creditLimit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!creditInfo) {
    return (
      <Alert severity="info">
        No credit limit information available. Please set a credit limit to begin.
      </Alert>
    );
  }

  const effectiveLimit = creditInfo.effective_credit_limit || creditInfo.credit_limit || 0;
  const outstanding = creditInfo.outstanding_amount || 0;
  const available = creditInfo.available_credit !== undefined 
    ? creditInfo.available_credit 
    : (effectiveLimit > 0 ? effectiveLimit - outstanding : null);
  const utilization = creditInfo.credit_utilization_percent || 
    (effectiveLimit > 0 ? (outstanding / effectiveLimit) * 100 : 0);
  const isOverLimit = creditInfo.is_over_limit || (effectiveLimit > 0 && outstanding > effectiveLimit);
  const limitSource = creditInfo.limit_source || 'Unknown';

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Credit Limit Management
      </Typography>

      {/* Over Limit Warning */}
      {isOverLimit && (
        <Alert 
          severity="error" 
          icon={<Warning />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Credit Limit Exceeded!
          </Typography>
          <Typography variant="body2">
            This customer has exceeded their credit limit. Outstanding amount: {outstanding.toLocaleString()}
          </Typography>
        </Alert>
      )}

      {/* Credit Summary Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Credit Summary
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Credit Limit
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {effectiveLimit === 0 
                  ? 'Unlimited' 
                  : effectiveLimit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Source: {limitSource}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Outstanding Amount
              </Typography>
              <Typography variant="h6" fontWeight="bold" color={isOverLimit ? 'error.main' : 'text.primary'}>
                {outstanding.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Available Credit
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                color={available !== null && available < 0 ? 'error.main' : 'success.main'}
              >
                {available === null 
                  ? 'N/A' 
                  : available.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" display="block">
                Utilization
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(utilization, 100)}
                    sx={{
                      flexGrow: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getUtilizationDisplayColor(utilization),
                      },
                    }}
                  />
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    sx={{ color: getUtilizationDisplayColor(utilization), minWidth: 50 }}
                  >
                    {utilization.toFixed(1)}%
                  </Typography>
                </Box>
                {utilization > 100 && (
                  <Typography variant="caption" color="error">
                    Over limit by {((utilization - 100) * effectiveLimit / 100).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Credit Limit Form */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Update Credit Limit
        </Typography>
        <Divider sx={{ my: 2 }} />

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="credit_limit"
                control={control}
                rules={{
                  validate: (value) => {
                    if (value === '' || value === null || value === undefined) {
                      return true; // Allow empty (unlimited)
                    }
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                      return 'Please enter a valid number';
                    }
                    if (numValue < 0) {
                      return 'Credit limit cannot be negative';
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Credit Limit"
                    type="number"
                    fullWidth
                    inputProps={{
                      step: '0.01',
                      min: '0',
                    }}
                    placeholder="0 = Unlimited"
                    error={!!errors.credit_limit}
                    helperText={
                      errors.credit_limit?.message ||
                      'Enter 0 for unlimited credit, or a positive number for a specific limit'
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="bypass_credit_limit_check"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={field.onChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          Bypass credit limit check at Sales Order
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Allow sales orders even when credit limit is exceeded
                        </Typography>
                      </Box>
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdatingCreditLimit}
                  startIcon={
                    isUpdatingCreditLimit ? (
                      <CircularProgress size={16} />
                    ) : (
                      <CheckCircle />
                    )
                  }
                >
                  {isUpdatingCreditLimit ? 'Updating...' : 'Update Credit Limit'}
                </Button>

                {limitSource === 'Customer' && (
                  <Button
                    type="button"
                    variant="outlined"
                    color="error"
                    onClick={handleRemove}
                    disabled={isUpdatingCreditLimit}
                  >
                    Remove Credit Limit
                  </Button>
                )}

                {limitSource !== 'Customer' && (
                  <Alert severity="info" sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                      Credit limit is inherited from {limitSource}. 
                      {limitSource === 'Customer Group' 
                        ? ' Set a customer-specific limit to override.' 
                        : ' Set a customer or group limit to override.'}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Error Display */}
      {creditLimitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {creditLimitError}
        </Alert>
      )}
    </Box>
  );
};

export default CreditLimitManagement;

