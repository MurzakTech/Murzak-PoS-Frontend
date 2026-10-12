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
} from '@mui/material';
import { Settings as SettingsIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getETIMSSettings, updateETIMSSettings } from '../../store/onboardingSlice';

// The eTIMS record belongs to the Kenya tax app and carries what KRA certified for the business's device.
// This page shows it and changes only the device serial number and the two switches. The PIN is the
// business's Tax ID (change it in the company details); keys and passwords are never shown.
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
    formState: { isDirty },
  } = useForm({
    defaultValues: { dvcsrlno: '', sandbox: true, is_active: true },
  });

  useEffect(() => {
    if (userCompany) {
      dispatch(getETIMSSettings());
    }
  }, [dispatch, userCompany]);

  useEffect(() => {
    if (etimsSettings) {
      reset({
        dvcsrlno: etimsSettings.dvcsrlno || '',
        sandbox: etimsSettings.sandbox ?? true,
        is_active: etimsSettings.is_active ?? true,
      });
    }
  }, [etimsSettings, reset]);

  const onSubmit = async (data) => {
    if (!userCompany || !etimsSettings) {
      return;
    }
    setIsSaving(true);
    await dispatch(updateETIMSSettings({
      name: etimsSettings.name,
      company: userCompany,
      dvcsrlno: data.dvcsrlno,
      sandbox: data.sandbox,
      is_active: data.is_active,
    }));
    setIsSaving(false);
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

        {!etimsSettings ? (
          <Alert severity="info">
            This business has no eTIMS settings yet. They are set up once, by your administrator,
            when KRA has certified the system.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="KRA PIN"
                  value={etimsSettings.tin || ''}
                  helperText="Taken from the Tax ID in your company details"
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Branch ID"
                  value={etimsSettings.bhfid || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="dvcsrlno"
                  control={control}
                  rules={{ required: 'The device serial number is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Device serial number"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message || 'As certified by KRA'}
                      disabled={isSaving}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Connected to"
                  value={etimsSettings.env || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="sandbox"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={!!field.value} onChange={field.onChange} disabled={isSaving} />}
                      label="Test mode (sandbox)"
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Send to KRA's test system instead of the live one
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={!!field.value} onChange={field.onChange} disabled={isSaving} />}
                      label="Active"
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Sales and purchases are sent to KRA while this is on
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  disabled={isSaving || !isDirty}
                  sx={{ textTransform: 'none' }}
                >
                  Save changes
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ETIMSSettings;
