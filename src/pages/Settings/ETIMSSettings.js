import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  GridLegacy as Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getETIMSSettings, updateETIMSSettings } from '../../store/onboardingSlice';

const ETIMSSettings = () => {
  const dispatch = useAppDispatch();
  const { etimsSettings, isLoading } = useAppSelector((state) => state.onboarding);
  const { user } = useAppSelector((state) => state.auth);
  const [isSaving, setIsSaving] = useState(false);

  const userCompany = user?.company || user?.custom_company || user?.company_name || 
                      user?.company_data?.name || user?.company_data?.company_name;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      server_url: '',
      auth_server_url: '',
      tin: '',
      bhfid: '00',
      sandbox: true,
      is_active: true,
      client_id: '',
      client_secret: '',
      auth_username: '',
      auth_password: '',
      sales_auto_submission_enabled: true,
      purchase_auto_submission_enabled: false,
      stock_auto_submission_enabled: false,
    },
  });

  // Fetch eTIMS settings on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getETIMSSettings());
    }
  }, [dispatch, userCompany]);

  // Reset form when eTIMS settings are loaded
  useEffect(() => {
    if (etimsSettings) {
      reset({
        server_url: etimsSettings.server_url || '',
        auth_server_url: etimsSettings.auth_server_url || '',
        tin: etimsSettings.tin || '',
        bhfid: etimsSettings.bhfid || '00',
        sandbox: etimsSettings.sandbox ?? true,
        is_active: etimsSettings.is_active ?? true,
        client_id: etimsSettings.client_id || '',
        client_secret: etimsSettings.client_secret || '',
        auth_username: etimsSettings.auth_username || '',
        auth_password: etimsSettings.auth_password || '',
        sales_auto_submission_enabled: etimsSettings.sales_auto_submission_enabled ?? true,
        purchase_auto_submission_enabled: etimsSettings.purchase_auto_submission_enabled ?? false,
        stock_auto_submission_enabled: etimsSettings.stock_auto_submission_enabled ?? false,
      });
    }
  }, [etimsSettings, reset]);

  const onSubmit = async (data) => {
    if (!userCompany) {
      return;
    }

    setIsSaving(true);
    const etimsData = {
      name: etimsSettings?.name,
      company: userCompany,
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

    const result = await dispatch(updateETIMSSettings(etimsData));
    setIsSaving(false);

    if (updateETIMSSettings.fulfilled.match(result)) {
      // Form will be reset automatically by the useEffect
    }
  };

  if (isLoading && !etimsSettings) {
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
          <SettingsIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            eTIMS Settings
          </Typography>
        </Box>

        {!etimsSettings && (
          <Alert severity="info" sx={{ mb: 3 }}>
            eTIMS settings not configured. You can set them up here.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Server Configuration */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudIcon color="primary" />
                Server Configuration
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="server_url"
                control={control}
                rules={{ required: 'Server URL is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Server URL"
                    variant="outlined"
                    placeholder="https://etims.example.com"
                    error={!!errors.server_url}
                    helperText={errors.server_url?.message}
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="auth_server_url"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Auth Server URL (Optional)"
                    variant="outlined"
                    placeholder="https://auth.example.com"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            {/* Tax Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Tax Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="tin"
                control={control}
                rules={{ required: 'TIN is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tax Identification Number (TIN)"
                    variant="outlined"
                    error={!!errors.tin}
                    helperText={errors.tin?.message}
                    disabled={isSaving}
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
                    label="Business House ID (BHfID)"
                    variant="outlined"
                    placeholder="00"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            {/* Authentication */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockIcon color="primary" />
                Authentication
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Client ID (Optional)"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="client_secret"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Client Secret (Optional)"
                    type="password"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="auth_username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Auth Username (Optional)"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="auth_password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Auth Password (Optional)"
                    type="password"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            {/* Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="sandbox"
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
                    label="Sandbox Mode"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Use sandbox environment for testing
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="is_active"
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
                    label="Active"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Enable eTIMS integration
              </Typography>
            </Grid>

            {/* Auto Submission */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Auto Submission
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="sales_auto_submission_enabled"
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
                    label="Sales Auto Submission"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Automatically submit sales to eTIMS
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="purchase_auto_submission_enabled"
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
                    label="Purchase Auto Submission"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Automatically submit purchases to eTIMS
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="stock_auto_submission_enabled"
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
                    label="Stock Auto Submission"
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Automatically submit stock changes to eTIMS
              </Typography>
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

export default ETIMSSettings;

