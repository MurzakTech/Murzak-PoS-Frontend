import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  GridLegacy as Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
  Alert,
  InputAdornment,
  Chip,
  alpha,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Warehouse,
  CalendarToday,
  SwapHoriz,
  Inventory,
  EventAvailable,
  Send,
  Drafts,
  Business,
  Add,
  Remove,
  RequestQuote,
  Info,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createMaterialRequest } from '../../store/stockTransferSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';
import { getDefaultPostingDate } from '../../utils/stockTransferHelpers';
import { showNotification } from '../../store/notificationSlice';

/**
 * Create Material Request Page
 * Form for creating a Material Request of type "Material Transfer"
 */
const CreateMaterialRequest = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { warehouses, isLoading: isLoadingWarehouses } = useAppSelector((state) => state.warehouse);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading, isCreating } = useAppSelector((state) => state.stockTransfer);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [warehouseError, setWarehouseError] = useState('');
  const [submitOption, setSubmitOption] = useState('draft');

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      company: userCompany || '',
      transaction_date: getDefaultPostingDate(),
      from_warehouse: '',
      to_warehouse: '',
      items: [{ item_code: '', qty: 1, description: '' }],
      schedule_date: '',
      submit: false,
    },
  });
  const theme = useTheme();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const fromWarehouse = watch('from_warehouse');
  const toWarehouse = watch('to_warehouse');
  const items = watch('items');
  const submitValue = watch('submit');

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

  // Sync submit option with form value
  useEffect(() => {
    setValue('submit', submitOption === 'submit');
  }, [submitOption, setValue]);

  const onSubmit = async (data) => {
    // Validate warehouses are different
    if (data.from_warehouse === data.to_warehouse) {
      dispatch(showNotification({
        message: 'Source and destination warehouses must be different',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // Format and validate items
    const formattedItems = data.items
      .filter((item) => item.item_code && item.qty > 0)
      .map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        description: item.description || '',
      }));

    if (formattedItems.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one item with quantity greater than 0',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    try {
      const result = await dispatch(createMaterialRequest({
        company: data.company,
        transaction_date: data.transaction_date,
        from_warehouse: data.from_warehouse,
        to_warehouse: data.to_warehouse,
        items: formattedItems,
        schedule_date: data.schedule_date || undefined,
        submit: data.submit || false,
      }));

      if (result.type === 'stockTransfer/createMaterialRequest/fulfilled') {
        const materialRequestName = result.payload?.material_request || result.payload?.name;
        const status = result.payload?.status || 'Draft';
        
        navigate('/stock-transfers/list', {
          state: {
            message: `Material request created successfully${materialRequestName ? `: ${materialRequestName}` : ''}${status === 'Submitted' ? ' (Submitted)' : ''}`,
            severity: 'success',
          },
        });
      }
    } catch (error) {
      console.error('Error creating material request:', error);
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
                  Create Transfer Request
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Request stock transfer between warehouses
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<RequestQuote />}
                label="Material Transfer"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<Inventory />}
                label={`${fields.length} item(s)`}
                color="info"
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Submission Status */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={600}>
                Submission Status
              </Typography>
            </Stack>
            <Divider />
            
            <ToggleButtonGroup
              value={submitOption}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) setSubmitOption(newValue);
              }}
              fullWidth
              sx={{ 
                '& .MuiToggleButton-root': { 
                  py: 1.5,
                  textTransform: 'none'
                }
              }}
            >
              <ToggleButton value="draft" color="primary">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Drafts />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Save as Draft</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Save for later review and submission
                    </Typography>
                  </Box>
                </Stack>
              </ToggleButton>
              <ToggleButton value="submit" color="primary">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Send />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Submit for Approval</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submit immediately for approval process
                    </Typography>
                  </Box>
                </Stack>
              </ToggleButton>
            </ToggleButtonGroup>

            {submitOption === 'submit' && (
              <Alert severity="info" icon={<Send />}>
                This material request will be submitted for approval immediately.
                It will appear in the approval workflow after creation.
              </Alert>
            )}
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
              
              {/* Basic Information */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <RequestQuote color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Request Information
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  {/* Company */}
                  <Grid item xs={12} md={6}>
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

                  {/* Transaction Date */}
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="transaction_date"
                      control={control}
                      rules={{ required: 'Transaction date is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Request Date"
                          type="date"
                          required
                          InputLabelProps={{ shrink: true }}
                          error={!!errors.transaction_date}
                          helperText={errors.transaction_date?.message}
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
                </Grid>
              </Box>

              {/* Warehouse Selection */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Warehouse color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Warehouse Selection
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  {/* From Warehouse */}
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="from_warehouse"
                      control={control}
                      rules={{ required: 'Source warehouse is required' }}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.from_warehouse}>
                          <InputLabel>From Warehouse *</InputLabel>
                          <Select 
                            {...field} 
                            label="From Warehouse *"
                            disabled={isLoadingWarehouses}
                            InputLabelProps={{ shrink: true }}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                          >
                            <MenuItem value="">
                              <em>Select Source Warehouse</em>
                            </MenuItem>
                            {warehouses.map((wh) => (
                              <MenuItem key={wh.name || wh.warehouse_name} value={wh.name || wh.warehouse_name}>
                                <Stack spacing={0.5}>
                                  <Typography variant="body2">
                                    {wh.warehouse_name || wh.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {wh.warehouse_type || 'Warehouse'} • {wh.city || 'Unknown'}
                                  </Typography>
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.from_warehouse && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                              {errors.from_warehouse.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>

                  {/* To Warehouse */}
                  <Grid item xs={12} md={6}>
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
                          <InputLabel>To Warehouse *</InputLabel>
                          <Select 
                            {...field} 
                            label="To Warehouse *"
                            InputLabelProps={{ shrink: true }}
                            disabled={isLoadingWarehouses}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                          >
                            <MenuItem value="">
                              <em>Select Destination Warehouse</em>
                            </MenuItem>
                            {warehouses
                              .filter((wh) => {
                                const whName = wh.name || wh.warehouse_name;
                                return !fromWarehouse || whName !== fromWarehouse;
                              })
                              .map((wh) => (
                                <MenuItem key={wh.name || wh.warehouse_name} value={wh.name || wh.warehouse_name}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2">
                                      {wh.warehouse_name || wh.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {wh.warehouse_type || 'Warehouse'} • {wh.city || 'Unknown'}
                                    </Typography>
                                  </Stack>
                                </MenuItem>
                              ))}
                          </Select>
                          {errors.to_warehouse && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                              {errors.to_warehouse.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>

                {warehouseError && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {warehouseError}
                  </Alert>
                )}

                {/* Warehouse Comparison Card */}
                {fromWarehouse && toWarehouse && !warehouseError && (
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mt: 3,
                      borderColor: 'info.light',
                      backgroundColor: alpha(theme.palette.info.main, 0.03)
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack alignItems="center" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            FROM
                          </Typography>
                          <Typography variant="h6" fontWeight={600} color="error">
                            {getWarehouseInfo(fromWarehouse)?.warehouse_name || fromWarehouse}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getWarehouseInfo(fromWarehouse)?.city || 'Unknown Location'}
                          </Typography>
                        </Stack>
                        
                        <SwapHoriz color="primary" sx={{ fontSize: 40 }} />
                        
                        <Stack alignItems="center" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            TO
                          </Typography>
                          <Typography variant="h6" fontWeight={600} color="success">
                            {getWarehouseInfo(toWarehouse)?.warehouse_name || toWarehouse}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getWarehouseInfo(toWarehouse)?.city || 'Unknown Location'}
                          </Typography>
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
                      Requested Items
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
                    No items added yet. Click "Add Item" to start adding items to request.
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
                                            Code: {product.item_code} • Available: {product.stock_qty || 0}
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
                                  InputLabelProps={{ shrink: true }}
                                  label="Requested Quantity *"
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
                                <strong>{getProductName(field.item_code)}</strong> • {field.qty} units requested
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
                            Request Summary
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {calculateTotalItems()} total units requested
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

              {/* Schedule Date */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <EventAvailable color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Scheduling Information
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="schedule_date"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Expected Transfer Date"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          helperText="When do you need this transfer? (Optional)"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EventAvailable fontSize="small" color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Alert 
                      severity="info" 
                      icon={<EventAvailable />}
                      sx={{ height: '100%', display: 'flex', alignItems: 'center' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Scheduled Transfer
                        </Typography>
                        <Typography variant="caption">
                          This date is informational only. Actual transfer will happen after approval.
                        </Typography>
                      </Box>
                    </Alert>
                  </Grid>
                </Grid>
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
                    startIcon={isCreating ? <CircularProgress size={20} /> : (
                      submitOption === 'submit' ? <Send /> : <Save />
                    )}
                    color={submitOption === 'submit' ? 'primary' : 'success'}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      minWidth: 200
                    }}
                  >
                    {isCreating ? (
                      <>
                        <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                        {submitOption === 'submit' ? 'Submitting...' : 'Saving...'}
                      </>
                    ) : submitOption === 'submit' ? (
                      'Submit Material Request'
                    ) : (
                      'Save as Draft'
                    )}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Paper>

        {/* Information Footer */}
        <Paper 
          variant="outlined" 
          sx={{ 
            mt: 3, 
            p: 3, 
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.info.main, 0.03)
          }}
        >
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Info fontSize="small" color="info" />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                About Material Requests
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Material Requests are used to request stock transfers between warehouses. 
                They go through an approval workflow before being converted to actual stock transfers.
                {submitOption === 'draft' && ' Draft requests can be submitted for approval later.'}
                {submitOption === 'submit' && ' Submitted requests will appear in the approval workflow immediately.'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateMaterialRequest;