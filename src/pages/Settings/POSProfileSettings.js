import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { PointOfSale as POSIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getPOSProfile, updatePOSProfile } from '../../store/onboardingSlice';
import { fetchCurrentUser } from '../../store/authSlice';
import { getPOSInvoiceType, setPOSInvoiceType } from '../../store/salesSlice';

const POSProfileSettings = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading: isLoadingUser } = useAppSelector((state) => state.auth);
  const { posProfile: fullPosProfile, isLoading: isLoadingPosProfile } = useAppSelector((state) => state.onboarding);
  const { posInvoiceType, isLoadingPOSInvoiceType } = useAppSelector((state) => state.sales);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingInvoiceType, setIsSavingInvoiceType] = useState(false);

  // Get POS profile name from user profile (already fetched via fetchCurrentUser)
  const posProfileFromUser = user?.pos_profile_data || null;
  
  // Use full POS profile if available (has settings fields), otherwise use basic info from user profile
  const posProfile = fullPosProfile || posProfileFromUser;

  const userCompany = user?.company || user?.custom_company || user?.company_name || 
                      user?.company_data?.name || user?.company_data?.company_name;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      profile_name: '',
      update_stock: true,
      allow_discount_change: true,
      allow_rate_change: true,
      allow_partial_payment: false,
    },
  });

  // Fetch full POS profile details to get settings fields (update_stock, etc.)
  useEffect(() => {
    if (userCompany && !fullPosProfile) {
      dispatch(getPOSProfile());
    }
  }, [dispatch, userCompany, fullPosProfile]);

  // Fetch POS invoice type
  useEffect(() => {
    if (userCompany) {
      dispatch(getPOSInvoiceType({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  // Reset form when POS profile is loaded
  useEffect(() => {
    if (posProfile) {
      // Use name from user profile if available, otherwise from full profile
      const profileName = posProfileFromUser?.name || posProfile.name || posProfile.profile_name || '';
      
      reset({
        profile_name: profileName,
        // Settings fields might not be in user profile, so use full profile or defaults
        update_stock: fullPosProfile?.update_stock ?? posProfile.update_stock ?? true,
        allow_discount_change: fullPosProfile?.allow_discount_change ?? posProfile.allow_discount_change ?? true,
        allow_rate_change: fullPosProfile?.allow_rate_change ?? posProfile.allow_rate_change ?? true,
        allow_partial_payment: fullPosProfile?.allow_partial_payment ?? posProfile.allow_partial_payment ?? false,
      });
    }
  }, [posProfile, fullPosProfile, posProfileFromUser, reset]);

  const onSubmit = async (data) => {
    if (!userCompany || !posProfile) {
      return;
    }

    setIsSaving(true);
    const posProfileData = {
      name: posProfile.name || posProfile.profile_name,
      company: userCompany,
      profile_name: data.profile_name,
      update_stock: data.update_stock,
      allow_discount_change: data.allow_discount_change,
      allow_rate_change: data.allow_rate_change,
      allow_partial_payment: data.allow_partial_payment,
    };

    const result = await dispatch(updatePOSProfile(posProfileData));
    setIsSaving(false);

    if (updatePOSProfile.fulfilled.match(result)) {
      // Refresh user profile to get updated POS profile data
      await dispatch(fetchCurrentUser());
      // Form will be reset automatically by the useEffect
    }
  };

  const handleInvoiceTypeChange = async (newInvoiceType) => {
    if (!userCompany) {
      return;
    }

    setIsSavingInvoiceType(true);
    const result = await dispatch(setPOSInvoiceType({
      invoice_type: newInvoiceType,
      company: userCompany, // Set company override
    }));
    setIsSavingInvoiceType(false);

    if (setPOSInvoiceType.fulfilled.match(result)) {
      // State will be updated automatically by the reducer
    }
  };

  // Show loading if user is still being fetched or POS profile is being fetched
  if ((isLoadingUser && !posProfileFromUser) || (isLoadingPosProfile && !fullPosProfile && !posProfileFromUser)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <POSIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            POS Profile Settings
          </Typography>
        </Box>

        {!posProfile && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            POS Profile not found. Please complete your onboarding first.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="profile_name"
                control={control}
                rules={{
                  required: 'Profile name is required',
                  minLength: { value: 2, message: 'Profile name must be at least 2 characters' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="POS Profile Name"
                    variant="outlined"
                    error={!!errors.profile_name}
                    helperText={errors.profile_name?.message}
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: <POSIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                POS Behavior Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="update_stock"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSaving}
                      />
                    }
                    label="Update Stock Inventory"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Automatically update inventory when completing sales
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="allow_discount_change"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSaving}
                      />
                    }
                    label="Allow Discount Changes"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Allow cashiers to modify discounts during sales
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="allow_rate_change"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSaving}
                      />
                    }
                    label="Allow Rate Changes"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Allow cashiers to modify product prices during sales
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="allow_partial_payment"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSaving}
                      />
                    }
                    label="Allow Partial Payment"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Allow customers to pay in installments
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Invoice Type Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>POS Invoice Type</InputLabel>
                <Select
                  value={posInvoiceType || 'POS Invoice'}
                  onChange={(e) => handleInvoiceTypeChange(e.target.value)}
                  label="POS Invoice Type"
                  disabled={isSavingInvoiceType || isLoadingPOSInvoiceType}
                >
                  <MenuItem value="POS Invoice">POS Invoice</MenuItem>
                  <MenuItem value="Sales Invoice">Sales Invoice</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Select the invoice type to use when creating POS transactions. This is a company-specific setting.
              </Typography>
              {isLoadingPOSInvoiceType && (
                <CircularProgress size={16} sx={{ mt: 1 }} />
              )}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => reset()}
                  disabled={isSaving || !isDirty}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={isSaving || !isDirty}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default POSProfileSettings;

