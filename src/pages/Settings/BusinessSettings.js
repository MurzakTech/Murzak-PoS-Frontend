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
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Save as SaveIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getCompany, updateCompany } from '../../store/onboardingSlice';

const BusinessSettings = () => {
  const dispatch = useAppDispatch();
  const { company, isLoading } = useAppSelector((state) => state.onboarding);
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
      company_name: '',
      abbr: '',
      tax_id: '',
      country: '',
      default_currency: '',
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
    },
  });

  // Fetch company on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getCompany());
    }
  }, [dispatch, userCompany]);

  // Reset form when company is loaded
  useEffect(() => {
    if (company) {
      reset({
        company_name: company.company_name || company.name || '',
        abbr: company.abbr || '',
        tax_id: company.tax_id || '',
        country: company.country || '',
        default_currency: company.default_currency || '',
        address_line1: company.address?.address_line1 || company.company_address?.address_line1 || '',
        address_line2: company.address?.address_line2 || company.company_address?.address_line2 || '',
        city: company.address?.city || company.company_address?.city || '',
        state: company.address?.state || company.company_address?.state || '',
        pincode: company.address?.pincode || company.company_address?.pincode || '',
        company_phone: company.address?.phone || company.company_address?.phone || company.phone_no || '',
        company_email: company.address?.email_id || company.company_address?.email_id || company.email || '',
        contact_first_name: company.company_contact?.first_name || '',
        contact_last_name: company.company_contact?.last_name || '',
        contact_email: company.company_contact?.email || '',
        contact_mobile: company.company_contact?.mobile || '',
        contact_phone: company.company_contact?.phone || '',
      });
    }
  }, [company, reset]);

  const onSubmit = async (data) => {
    if (!userCompany) {
      return;
    }

    setIsSaving(true);
    const companyData = {
      name: company?.name || company?.company_name,
      company_name: data.company_name,
      abbr: data.abbr,
      country: data.country,
      default_currency: data.default_currency,
      tax_id: data.tax_id || undefined,
      company_address: {
        address_line1: data.address_line1,
        address_line2: data.address_line2 || undefined,
        city: data.city,
        state: data.state || undefined,
        country: data.country,
        pincode: data.pincode || undefined,
        phone: data.company_phone || undefined,
        email_id: data.company_email || undefined,
      },
      company_contact: {
        first_name: data.contact_first_name || undefined,
        last_name: data.contact_last_name || undefined,
        email: data.contact_email || undefined,
        mobile: data.contact_mobile || undefined,
        phone: data.contact_phone || undefined,
      },
    };

    const result = await dispatch(updateCompany(companyData));
    setIsSaving(false);

    if (updateCompany.fulfilled.match(result)) {
      // Form will be reset automatically by the useEffect
    }
  };

  if (isLoading && !company) {
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
          <BusinessIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Business Settings
          </Typography>
        </Box>

        {!company && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Company information not found. Please complete your onboarding first.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Company Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="company_name"
                control={control}
                rules={{
                  required: 'Company name is required',
                  minLength: { value: 2, message: 'Company name must be at least 2 characters' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Name"
                    variant="outlined"
                    error={!!errors.company_name}
                    helperText={errors.company_name?.message}
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller
                name="abbr"
                control={control}
                rules={{
                  required: 'Abbreviation is required',
                  minLength: { value: 2, message: 'Must be at least 2 characters' },
                  maxLength: { value: 3, message: 'Must be at most 3 characters' },
                  pattern: {
                    value: /^[A-Z]{2,3}$/,
                    message: 'Must be 2-3 uppercase letters',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Abbreviation"
                    variant="outlined"
                    placeholder="e.g., MBL"
                    error={!!errors.abbr}
                    helperText={errors.abbr?.message}
                    disabled={isSaving}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller
                name="tax_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tax ID"
                    variant="outlined"
                    placeholder="e.g., P123456789A"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

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
                    variant="outlined"
                    error={!!errors.country}
                    helperText={errors.country?.message}
                    disabled={isSaving}
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
                    label="Default Currency"
                    variant="outlined"
                    error={!!errors.default_currency}
                    helperText={errors.default_currency?.message}
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            {/* Company Address */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon color="primary" />
                Company Address
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="address_line1"
                control={control}
                rules={{ required: 'Address line 1 is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Address Line 1"
                    variant="outlined"
                    error={!!errors.address_line1}
                    helperText={errors.address_line1?.message}
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="address_line2"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Address Line 2 (Optional)"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="city"
                control={control}
                rules={{ required: 'City is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="City"
                    variant="outlined"
                    error={!!errors.city}
                    helperText={errors.city?.message}
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="State/Province (Optional)"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Controller
                name="pincode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Postal Code (Optional)"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="company_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Phone"
                    variant="outlined"
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="company_email"
                control={control}
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Email"
                    type="email"
                    variant="outlined"
                    error={!!errors.company_email}
                    helperText={errors.company_email?.message}
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact_first_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact First Name"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact_last_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Last Name"
                    variant="outlined"
                    disabled={isSaving}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact_email"
                control={control}
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Email"
                    type="email"
                    variant="outlined"
                    error={!!errors.contact_email}
                    helperText={errors.contact_email?.message}
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact_mobile"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Mobile"
                    variant="outlined"
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="contact_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact Phone"
                    variant="outlined"
                    disabled={isSaving}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
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

export default BusinessSettings;

