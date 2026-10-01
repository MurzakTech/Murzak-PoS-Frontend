import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Stack,
  Divider,
  Alert,
  InputAdornment,
  Chip,
  alpha,
  Card,
  useTheme,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Warehouse,
  CalendarToday,
  Schedule,
  SwapHoriz,
  Inventory,
  Description,
  Business,
  Add,
  Remove,
  LocalShipping,
  ArrowUpward,
  ArrowDownward,
  Star,
  Warning,
  LocationOn,
  Info,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import {
  getDefaultPostingDate,
  getDefaultPostingTime,
  validateTransferForm,
} from '../../utils/stockTransferHelpers';

/**
 * Create Stock Transfer Page
 * Form for creating a direct stock transfer (immediate transfer)
 */
const CreateStockTransfer = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { warehouses, isLoading: isLoadingWarehouses } = useAppSelector((state) => state.warehouse);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);
  const { createTransfer, isCreating } = useStockTransfer();

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      company: userCompany || '',
      posting_date: getDefaultPostingDate(),
      posting_time: getDefaultPostingTime(),
      from_warehouse: '',
      to_warehouse: '',
      items: [{ item_code: '', qty: 1, description: '' }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const fromWarehouse = watch('from_warehouse');
  const toWarehouse = watch('to_warehouse');
  const items = watch('items');
  const [warehouseError, setWarehouseError] = useState('');

  // Fetch warehouses and products on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Validate warehouses are different
  useEffect(() => {
    if (fromWarehouse && toWarehouse && fromWarehouse === toWarehouse) {
      setWarehouseError('Source and destination warehouses must be different');
    } else {
      setWarehouseError('');
    }
  }, [fromWarehouse, toWarehouse]);

  const onSubmit = async (data) => {
    // Validate form
    const validation = validateTransferForm(data);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      dispatch(showNotification({
        message: firstError,
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // Ensure warehouses are different
    if (data.from_warehouse === data.to_warehouse) {
      dispatch(showNotification({
        message: 'Source and destination warehouses must be different',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // Format items for API
    const formattedItems = data.items
      .filter((item) => item.item_code && item.qty > 0)
      .map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        description: item.description || '',
      }));

    if (formattedItems.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one item to transfer',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    try {
      const result = await createTransfer({
        company: data.company,
        posting_date: data.posting_date,
        posting_time: data.posting_time,
        from_warehouse: data.from_warehouse,
        to_warehouse: data.to_warehouse,
        items: formattedItems,
        notes: data.notes || '',
      });

      if (result.type === 'stockTransfer/createStockTransfer/fulfilled') {
        const stockEntry = result.payload?.stock_entry;
        if (stockEntry) {
          navigate('/stock-transfers/list', {
            state: { 
              message: `Stock transfer created successfully. Stock Entry: ${stockEntry}`,
              severity: 'success'
            }
          });
        } else {
          navigate('/stock-transfers/list');
        }
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const getProductName = (itemCode) => {
    const product = products.find(p => p.item_code === itemCode);
    return product?.item_name || itemCode;
  };

  const calculateTotalItems = () => {
    return items.reduce((total, item) => total + (parseFloat(item.qty) || 0), 0);
  };

  const getWarehouseInfo = (warehouseName) => {
    const warehouse = warehouses.find(w => 
      w.name === warehouseName || w.warehouse_name === warehouseName
    );
    return warehouse;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3,
            background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton 
                onClick={() => navigate('/stock-transfers')}
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
                  Create Stock Transfer
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Transfer inventory between warehouses
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<Inventory />}
                label={`${items.length} item(s)`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<LocalShipping />}
                label={`${calculateTotalItems()} total units`}
                color="success"
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Main Form */}
        <Paper 
          elevation={0}
          sx={{ 
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 4 }}>
            <Stack spacing={4}>
              
              {/* Transfer Details Section */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <SwapHoriz color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Transfer Details
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  {/* Company */}
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="company"
                      control={control}
                      rules={{ required: 'Company is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company"
                          required
                          disabled
                          error={!!errors.company}
                          helperText={errors.company?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Business fontSize="small" color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Posting Date */}
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="posting_date"
                      control={control}
                      rules={{ required: 'Posting date is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Posting Date"
                          type="date"
                          required
                          InputLabelProps={{ shrink: true }}
                          error={!!errors.posting_date}
                          helperText={errors.posting_date?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarToday fontSize="small" color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Posting Time */}
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="posting_time"
                      control={control}
                      rules={{ required: 'Posting time is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Posting Time"
                          type="time"
                          required
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 1 }}
                          error={!!errors.posting_time}
                          helperText={errors.posting_time?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Schedule fontSize="small" color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Warehouse Selection Section */}
{/* Warehouse Selection Section */}
<Box>
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
    <Warehouse color="primary" />
    <Typography variant="h6" fontWeight={600}>
      Warehouse Selection
    </Typography>
  </Stack>
  <Divider sx={{ mb: 3 }} />
  
  {/* Warehouse Selection Explanation */}
  <Alert 
    severity="info" 
    icon={<SwapHoriz />}
    sx={{ 
      mb: 3,
      borderRadius: 2,
      '& .MuiAlert-message': { width: '100%' }
    }}
  >
    <Stack spacing={1}>
      <Typography variant="body2" fontWeight={600}>
        Select source and destination warehouses
      </Typography>
      <Typography variant="body2">
        Choose where the items are coming from and where they should be transferred to. 
        Make sure you have sufficient stock in the source warehouse.
      </Typography>
    </Stack>
  </Alert>
  
  <Grid container spacing={3}>
    {/* From Warehouse */}
    <Grid item xs={12} md={6}>
      <Box sx={{ position: 'relative' }}>
        <Controller
          name="from_warehouse"
          control={control}
          rules={{ required: 'Source warehouse is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.from_warehouse}>
              <InputLabel id="from-warehouse-label">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Warehouse fontSize="small" />
                  <span>From Warehouse *</span>
                </Stack>
              </InputLabel>
              <Select 
                {...field}
                labelId="from-warehouse-label"
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Warehouse fontSize="small" />
                    <span>From Warehouse *</span>
                  </Stack>
                }
                disabled={isLoadingWarehouses}
                MenuProps={{ 
                  PaperProps: { 
                    sx: { 
                      maxHeight: 400,
                      '& .MuiMenuItem-root': { minHeight: 48 }
                    } 
                  } 
                }}
                sx={{
                  '& .MuiSelect-select': { 
                    display: 'flex', 
                    alignItems: 'center' 
                  }
                }}
              >
                <MenuItem value="">
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Select Source Warehouse
                    </Typography>
                  </Box>
                </MenuItem>
                {warehouses.map((wh) => {
                  const isDefault = wh.is_default === 1 || wh.is_default === true;
                  const isMainDepot = wh.is_main_depot === 1 || wh.is_main_depot === true;
                  return (
                    <MenuItem 
                      key={wh.name || wh.warehouse_name} 
                      value={wh.name || wh.warehouse_name}
                      sx={{ py: 1.5 }}
                    >
                      <Stack spacing={0.5} sx={{ width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {wh.warehouse_name || wh.name}
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            {isDefault && (
                              <Chip
                                label="Default"
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            {isMainDepot && (
                              <Chip
                                label="Main"
                                size="small"
                                color="secondary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Stack>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            <Warehouse fontSize="inherit" sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                            {wh.warehouse_type || 'Warehouse'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <LocationOn fontSize="inherit" sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                            {wh.city || 'Unknown City'}
                          </Typography>
                        </Stack>
                        {wh.address_line_1 && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {wh.address_line_1}
                          </Typography>
                        )}
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
              {errors.from_warehouse && (
                <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                  {errors.from_warehouse.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
        
        {/* Selected Warehouse Details */}
        {fromWarehouse && getWarehouseInfo(fromWarehouse) && (
          <Paper 
            variant="outlined" 
            sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: 2,
              borderColor: 'error.light',
              backgroundColor: alpha(theme.palette.error.light, 0.05)
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" fontWeight={600} color="error">
                  <ArrowUpward fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Source Warehouse Selected
                </Typography>
                {getWarehouseInfo(fromWarehouse).is_default && (
                  <Chip
                    label="Default Warehouse"
                    size="small"
                    color="primary"
                    icon={<Star fontSize="small" />}
                  />
                )}
              </Stack>
              
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Type
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(fromWarehouse).warehouse_type || 'Warehouse'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(fromWarehouse).city || 'Unknown'}
                    </Typography>
                  </Box>
                </Stack>
                
                {getWarehouseInfo(fromWarehouse).address_line_1 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(fromWarehouse).address_line_1}
                      {getWarehouseInfo(fromWarehouse).address_line_2 && `, ${getWarehouseInfo(fromWarehouse).address_line_2}`}
                    </Typography>
                  </Box>
                )}
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contact
                  </Typography>
                  <Typography variant="body2">
                    {getWarehouseInfo(fromWarehouse).phone_no || getWarehouseInfo(fromWarehouse).mobile_no || 'No contact'}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>
    </Grid>

    {/* To Warehouse */}
    <Grid item xs={12} md={6}>
      <Box sx={{ position: 'relative' }}>
        <Controller
          name="to_warehouse"
          control={control}
          rules={{
            required: 'Destination warehouse is required',
            validate: (value) =>
              value !== fromWarehouse || 'Source and destination must be different',
          }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.to_warehouse}>
              <InputLabel id="to-warehouse-label">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Warehouse fontSize="small" />
                  <span>To Warehouse *</span>
                </Stack>
              </InputLabel>
              <Select 
                {...field}
                labelId="to-warehouse-label"
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Warehouse fontSize="small" />
                    <span>To Warehouse *</span>
                  </Stack>
                }
                disabled={isLoadingWarehouses}
                MenuProps={{ 
                  PaperProps: { 
                    sx: { 
                      maxHeight: 400,
                      '& .MuiMenuItem-root': { minHeight: 48 }
                    } 
                  } 
                }}
                sx={{
                  '& .MuiSelect-select': { 
                    display: 'flex', 
                    alignItems: 'center' 
                  }
                }}
              >
                <MenuItem value="">
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Select Destination Warehouse
                    </Typography>
                  </Box>
                </MenuItem>
                {warehouses
                  .filter((wh) => {
                    const whName = wh.name || wh.warehouse_name;
                    return !fromWarehouse || whName !== fromWarehouse;
                  })
                  .map((wh) => {
                    const isDefault = wh.is_default === 1 || wh.is_default === true;
                    const isMainDepot = wh.is_main_depot === 1 || wh.is_main_depot === true;
                    return (
                      <MenuItem 
                        key={wh.name || wh.warehouse_name} 
                        value={wh.name || wh.warehouse_name}
                        sx={{ py: 1.5 }}
                      >
                        <Stack spacing={0.5} sx={{ width: '100%' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {wh.warehouse_name || wh.name}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              {isDefault && (
                                <Chip
                                  label="Default"
                                  size="small"
                                  color="primary"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              {isMainDepot && (
                                <Chip
                                  label="Main"
                                  size="small"
                                  color="secondary"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                              <Warehouse fontSize="inherit" sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                              {wh.warehouse_type || 'Warehouse'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <LocationOn fontSize="inherit" sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                              {wh.city || 'Unknown City'}
                            </Typography>
                          </Stack>
                          {wh.address_line_1 && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {wh.address_line_1}
                            </Typography>
                          )}
                        </Stack>
                      </MenuItem>
                    );
                  })}
              </Select>
              {errors.to_warehouse && (
                <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                  {errors.to_warehouse.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
        
        {/* Selected Warehouse Details */}
        {toWarehouse && getWarehouseInfo(toWarehouse) && (
          <Paper 
            variant="outlined" 
            sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: 2,
              borderColor: 'success.light',
              backgroundColor: alpha(theme.palette.success.light, 0.05)
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" fontWeight={600} color="success">
                  <ArrowDownward fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Destination Warehouse Selected
                </Typography>
                {getWarehouseInfo(toWarehouse).is_default && (
                  <Chip
                    label="Default Warehouse"
                    size="small"
                    color="primary"
                    icon={<Star fontSize="small" />}
                  />
                )}
              </Stack>
              
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Type
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(toWarehouse).warehouse_type || 'Warehouse'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(toWarehouse).city || 'Unknown'}
                    </Typography>
                  </Box>
                </Stack>
                
                {getWarehouseInfo(toWarehouse).address_line_1 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body2">
                      {getWarehouseInfo(toWarehouse).address_line_1}
                      {getWarehouseInfo(toWarehouse).address_line_2 && `, ${getWarehouseInfo(toWarehouse).address_line_2}`}
                    </Typography>
                  </Box>
                )}
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contact
                  </Typography>
                  <Typography variant="body2">
                    {getWarehouseInfo(toWarehouse).phone_no || getWarehouseInfo(toWarehouse).mobile_no || 'No contact'}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>
    </Grid>
  </Grid>

  {warehouseError && (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <Typography variant="body2" fontWeight={600}>
        <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
        Warehouse Selection Issue
      </Typography>
      <Typography variant="body2">
        {warehouseError}
      </Typography>
    </Alert>
  )}

  {/* Warehouse Comparison Card */}
  {fromWarehouse && toWarehouse && !warehouseError && (
    <Card 
      variant="outlined" 
      sx={{ 
        mt: 3,
        borderColor: 'primary.main',
        borderWidth: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.dark'
        }
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700} color="primary">
              <SwapHoriz sx={{ mr: 1, verticalAlign: 'middle' }} />
              Transfer Route
            </Typography>
            <Chip
              label={`${getWarehouseInfo(fromWarehouse)?.city || 'Unknown'} → ${getWarehouseInfo(toWarehouse)?.city || 'Unknown'}`}
              color="primary"
              variant="outlined"
            />
          </Stack>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'error.light',
                  backgroundColor: alpha(theme.palette.error.light, 0.05)
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <Avatar sx={{ 
                    bgcolor: 'error.main', 
                    color: 'error.contrastText',
                    width: 48,
                    height: 48,
                    mb: 1
                  }}>
                    <ArrowUpward />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={700} color="error" align="center">
                    SOURCE
                  </Typography>
                  <Typography variant="h6" fontWeight={600} align="center">
                    {getWarehouseInfo(fromWarehouse)?.warehouse_name || fromWarehouse}
                  </Typography>
                  
                  <Stack spacing={0.5} sx={{ width: '100%', mt: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Type:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {getWarehouseInfo(fromWarehouse)?.warehouse_type || 'Warehouse'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Location:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {getWarehouseInfo(fromWarehouse)?.city || 'Unknown'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Status:
                      </Typography>
                      <Chip
                        label={getWarehouseInfo(fromWarehouse)?.disabled ? 'Inactive' : 'Active'}
                        size="small"
                        color={getWarehouseInfo(fromWarehouse)?.disabled ? 'error' : 'success'}
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
              }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  width: 56,
                  height: 56
                }}>
                  <SwapHoriz sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'success.light',
                  backgroundColor: alpha(theme.palette.success.light, 0.05)
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <Avatar sx={{ 
                    bgcolor: 'success.main', 
                    color: 'success.contrastText',
                    width: 48,
                    height: 48,
                    mb: 1
                  }}>
                    <ArrowDownward />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={700} color="success" align="center">
                    DESTINATION
                  </Typography>
                  <Typography variant="h6" fontWeight={600} align="center">
                    {getWarehouseInfo(toWarehouse)?.warehouse_name || toWarehouse}
                  </Typography>
                  
                  <Stack spacing={0.5} sx={{ width: '100%', mt: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Type:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {getWarehouseInfo(toWarehouse)?.warehouse_type || 'Warehouse'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Location:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {getWarehouseInfo(toWarehouse)?.city || 'Unknown'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Status:
                      </Typography>
                      <Chip
                        label={getWarehouseInfo(toWarehouse)?.disabled ? 'Inactive' : 'Active'}
                        size="small"
                        color={getWarehouseInfo(toWarehouse)?.disabled ? 'error' : 'success'}
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
          
          <Divider />
          
          <Stack direction="row" justifyContent="center" spacing={3}>
            <Chip
              icon={<Warehouse />}
              label={`Source: ${getWarehouseInfo(fromWarehouse)?.warehouse_type || 'Warehouse'}`}
              color="error"
              variant="outlined"
            />
            <Chip
              icon={<LocalShipping />}
              label="Material Transfer"
              color="primary"
            />
            <Chip
              icon={<Warehouse />}
              label={`Destination: ${getWarehouseInfo(toWarehouse)?.warehouse_type || 'Warehouse'}`}
              color="success"
              variant="outlined"
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )}
</Box>

              {/* Items Section */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Inventory color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Transfer Items
                    </Typography>
                  </Stack>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => append({ item_code: '', qty: 1, description: '' })}
                    disabled={isLoadingProducts}
                  >
                    Add Item
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                {fields.length === 0 ? (
                  <Alert 
                    severity="info" 
                    icon={<Inventory />}
                    sx={{ mb: 3 }}
                  >
                    No items added yet. Click "Add Item" to start adding items to transfer.
                  </Alert>
                ) : (
                  <Stack spacing={3}>
                    {fields.map((field, index) => (
                      <Paper 
                        key={field.id} 
                        variant="outlined" 
                        sx={{ 
                          p: 3, 
                          borderRadius: 2,
                          position: 'relative'
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Item #{index + 1}
                          </Typography>
                          {fields.length > 1 && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => remove(index)}
                              sx={{ 
                                position: 'absolute',
                                top: 8,
                                right: 8
                              }}
                            >
                              <Remove />
                            </IconButton>
                          )}
                        </Stack>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Controller
                              name={`items.${index}.item_code`}
                              control={control}
                              rules={{ required: 'Item is required' }}
                              render={({ field }) => (
                                <FormControl fullWidth error={!!errors.items?.[index]?.item_code}>
                                  <InputLabel>Select Item *</InputLabel>
                                  <Select 
                                    {...field} 
                                    label="Select Item *"
                                    disabled={isLoadingProducts}
                                  >
                                    <MenuItem value="">
                                      <em>Select an item</em>
                                    </MenuItem>
                                    {products.map((product) => (
                                      <MenuItem key={product.item_code} value={product.item_code}>
                                        <Stack spacing={0.5}>
                                          <Typography variant="body2">
                                            {product.item_name || product.item_code}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Code: {product.item_code} • Stock: {product.actual_qty || 0}
                                          </Typography>
                                        </Stack>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  {errors.items?.[index]?.item_code && (
                                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                                      {errors.items[index].item_code.message}
                                    </Typography>
                                  )}
                                </FormControl>
                              )}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={3}>
                            <Controller
                              name={`items.${index}.qty`}
                              control={control}
                              rules={{ 
                                required: 'Quantity is required',
                                min: { value: 0.01, message: 'Quantity must be greater than 0' }
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Quantity *"
                                  type="number"
                                  inputProps={{ step: "0.01", min: "0.01" }}
                                  error={!!errors.items?.[index]?.qty}
                                  helperText={errors.items?.[index]?.qty?.message}
                                />
                              )}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={3}>
                            <Controller
                              name={`items.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Description"
                                  placeholder="Optional description"
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                        
                        {field.item_code && (
                          <Alert 
                            severity="info" 
                            sx={{ mt: 2, py: 1 }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">
                                <strong>{getProductName(field.item_code)}</strong> • {field.qty} units
                              </Typography>
                              <Typography variant="caption">
                                Item Code: {field.item_code}
                              </Typography>
                            </Stack>
                          </Alert>
                        )}
                      </Paper>
                    ))}
                    
                    {/* Summary Card */}
                    <Card variant="outlined" sx={{ mt: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight={600}>
                            Transfer Summary
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {calculateTotalItems()} total units
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Across {fields.length} item{fields.length !== 1 ? 's' : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
              </Box>

              {/* Notes Section */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Description color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Additional Information
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Transfer Notes"
                      multiline
                      rows={4}
                      placeholder="Add any notes about this transfer (purpose, handling instructions, etc.)..."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                            <Description fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              {/* Form Actions */}
              <Box sx={{ pt: 2 }}>
                <Divider sx={{ mb: 4 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/stock-transfers')}
                    disabled={isCreating}
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      minWidth: 120
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isCreating || !fromWarehouse || !toWarehouse || items.length === 0}
                    size="large"
                    startIcon={isCreating ? <CircularProgress size={20} /> : <Save />}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      minWidth: 180
                    }}
                  >
                    {isCreating ? (
                      <>
                        <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                        Creating Transfer...
                      </>
                    ) : (
                      'Create Stock Transfer'
                    )}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateStockTransfer;