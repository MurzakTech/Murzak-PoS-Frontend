import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  GridLegacy as Grid,
  Container,
  Switch,
  FormControlLabel,
  IconButton,
  Divider,
  Alert,
  Stack,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Business,
  LocationOn,
  Phone,
  Email,
  AccountTree,
  Category,
  Home
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createWarehouse,
  updateWarehouse,
  getWarehouseDetails,
  listWarehouseTypes,
  listWarehouses,
} from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isEditMode = !!id;
  const { selectedWarehouse, warehouseTypes, warehouses, isLoading, isLoadingDetails, isLoadingTypes } =
    useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      warehouse_name: '',
      company: userCompany || '',
      warehouse_type: '',
      parent_warehouse: '',
      is_group: false,
      is_main_depot: false,
      set_as_default: false,
      account: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      pin: '',
      phone_no: '',
      mobile_no: '',
      email_id: '',
    },
  });

  useEffect(() => {
    dispatch(listWarehouseTypes());
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  useEffect(() => {
    if (isEditMode && id) {
      dispatch(getWarehouseDetails({ name: id }));
    }
  }, [dispatch, isEditMode, id]);

  useEffect(() => {
    if (isEditMode && selectedWarehouse) {
      reset({
        warehouse_name: selectedWarehouse.warehouse_name || '',
        company: selectedWarehouse.company || userCompany || '',
        warehouse_type: selectedWarehouse.warehouse_type || '',
        parent_warehouse: selectedWarehouse.parent_warehouse || '',
        is_group: selectedWarehouse.is_group === 1 || selectedWarehouse.is_group === true,
        is_main_depot: selectedWarehouse.is_main_depot === 1 || selectedWarehouse.is_main_depot === true,
        account: selectedWarehouse.account || '',
        address_line_1: selectedWarehouse.address_line_1 || '',
        address_line_2: selectedWarehouse.address_line_2 || '',
        city: selectedWarehouse.city || '',
        state: selectedWarehouse.state || '',
        pin: selectedWarehouse.pin || '',
        phone_no: selectedWarehouse.phone_no || '',
        mobile_no: selectedWarehouse.mobile_no || '',
        email_id: selectedWarehouse.email_id || '',
      });
    }
  }, [isEditMode, selectedWarehouse, reset, userCompany]);

  const onSubmit = async (data) => {
    if (!userCompany && !data.company) {
      dispatch(
        showNotification({
          message: 'Company information is required',
          severity: 'error',
          title: 'Company Required',
        })
      );
      return;
    }

    const warehouseData = {
      ...data,
      company: data.company || userCompany,
    };

    if (isEditMode) {
      warehouseData.name = id;
      const result = await dispatch(updateWarehouse(warehouseData));
      if (result.type === 'warehouse/updateWarehouse/fulfilled') {
        navigate(`/warehouses/${id}`);
      }
    } else {
      const result = await dispatch(createWarehouse(warehouseData));
      if (result.type === 'warehouse/createWarehouse/fulfilled') {
        navigate('/warehouses');
      }
    }
  };

  const parentWarehouseOptions = warehouses.filter(
    (w) => !isEditMode || w.name !== id
  );

  if (isEditMode && isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <IconButton 
            onClick={() => navigate(isEditMode ? `/warehouses/${id}` : '/warehouses')}
            size="large"
            sx={{ 
              border: 1, 
              borderColor: 'divider',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              {isEditMode ? 'Edit Warehouse' : 'Create New Warehouse'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isEditMode 
                ? 'Update warehouse details and configuration' 
                : 'Add a new warehouse to your inventory management system'
              }
            </Typography>
          </Box>
        </Stack>

        {isEditMode && !isDirty && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are viewing warehouse details. Edit any field to enable update.
          </Alert>
        )}

        <Paper elevation={0} sx={{ 
          p: 4, 
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={4}>

              {/* ===== BASIC INFORMATION SECTION ===== */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Business color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Basic Information
                  </Typography>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Controller
                      name="warehouse_name"
                      control={control}
                      rules={{ required: 'Warehouse name is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Warehouse Name"
                          fullWidth
                          required
                          size="medium"
                          error={!!errors.warehouse_name}
                          helperText={errors.warehouse_name?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Home fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="warehouse_type"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Warehouse Type"
                          select
                          fullWidth
                          size="medium"
                          SelectProps={{ native: true }}
                          disabled={isLoadingTypes}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Category fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        >
                          <option value="">Select Type</option>
                          {warehouseTypes.map((type) => (
                            <option key={type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="parent_warehouse"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Parent Warehouse"
                          select
                          fullWidth
                          size="medium"
                          SelectProps={{ native: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccountTree fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        >
                          <option value="">None (Top Level)</option>
                          {parentWarehouseOptions.map((w) => (
                            <option key={w.name} value={w.name}>
                              {w.warehouse_name || w.name}
                            </option>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="account"
                      control={control}
                      render={({ field }) => (
                        <TextField 
                          {...field} 
                          label="Account Code" 
                          fullWidth 
                          size="medium" 
                          placeholder="e.g., WH-001"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* ===== WAREHOUSE SETTINGS ===== */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Warehouse Settings
                </Typography>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Controller
                        name="is_group"
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
                                <Typography variant="body2" fontWeight={500}>
                                  Group Warehouse
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Contains sub-warehouses
                                </Typography>
                              </Box>
                            }
                            sx={{ m: 0 }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Controller
                        name="is_main_depot"
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
                                <Typography variant="body2" fontWeight={500}>
                                  Main Depot
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Primary distribution center
                                </Typography>
                              </Box>
                            }
                            sx={{ m: 0 }}
                          />
                        )}
                      />
                    </Grid>

                    {!isEditMode && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Controller
                          name="set_as_default"
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
                                  <Typography variant="body2" fontWeight={500}>
                                    Default Warehouse
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Auto-selected when unspecified
                                  </Typography>
                                </Box>
                              }
                              sx={{ m: 0 }}
                            />
                          )}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Box>

              <Divider />

              {/* ===== ADDRESS INFORMATION ===== */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <LocationOn color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Address Information
                  </Typography>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Controller
                      name="address_line_1"
                      control={control}
                      rules={{ required: 'Address line 1 is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Street Address"
                          fullWidth
                          required
                          size="medium"
                          error={!!errors.address_line_1}
                          helperText={errors.address_line_1?.message}
                          placeholder="Street name, building, floor"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="address_line_2"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Address Line 2"
                          fullWidth
                          size="medium"
                          placeholder="Landmark, area, or additional info"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Controller
                      name="city"
                      control={control}
                      rules={{ required: 'City is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="City"
                          fullWidth
                          required
                          size="medium"
                          error={!!errors.city}
                          helperText={errors.city?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Controller
                      name="state"
                      control={control}
                      rules={{ required: 'State is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="State / Province"
                          fullWidth
                          required
                          size="medium"
                          error={!!errors.state}
                          helperText={errors.state?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Controller
                      name="pin"
                      control={control}
                      rules={{ 
                        required: 'PIN Code is required',
                        pattern: {
                          value: /^\d{6}$/,
                          message: 'Must be 6 digits'
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="PIN Code"
                          fullWidth
                          required
                          size="medium"
                          error={!!errors.pin}
                          helperText={errors.pin?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* ===== CONTACT INFORMATION ===== */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Phone color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Contact Information
                  </Typography>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="phone_no"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Phone Number"
                          fullWidth
                          size="medium"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="mobile_no"
                      control={control}
                      rules={{
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: 'Must be 10 digits'
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Mobile Number"
                          fullWidth
                          size="medium"
                          error={!!errors.mobile_no}
                          helperText={errors.mobile_no?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="email_id"
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
                          label="Email Address"
                          type="email"
                          fullWidth
                          size="medium"
                          error={!!errors.email_id}
                          helperText={errors.email_id?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* ===== FORM ACTIONS ===== */}
              <Box sx={{ pt: 2 }}>
                <Divider sx={{ mb: 4 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate(isEditMode ? `/warehouses/${id}` : '/warehouses')}
                    size="large"
                    sx={{ minWidth: 120 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading || (isEditMode && !isDirty)}
                    size="large"
                    sx={{ minWidth: 180 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : isEditMode ? (
                      'Update Warehouse'
                    ) : (
                      'Create Warehouse'
                    )}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default WarehouseForm;