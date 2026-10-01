import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  InputAdornment,
  Stack,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  Add, 
  Delete,
  Business,
  CalendarToday,
  Warehouse,
  QrCodeScanner,
  Numbers,
  AttachMoney,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createPurchaseReceipt } from '../../store/purchaseSlice';
import { getSuppliers } from '../../store/supplierSlice';
import { getProducts } from '../../store/productSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';

const NewPurchaseReceipt = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.purchase);
  const { suppliers, isLoading: isLoadingSuppliers } = useAppSelector((state) => state.supplier);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
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
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      supplier: '',
      posting_date: new Date().toISOString().split('T')[0],
      warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      items: [{ item_code: '', qty: 1, rate: 0, warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedWarehouse = watch('warehouse');

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.qty || 0) * parseFloat(item.rate || 0));
    }, 0);
    return {
      subtotal,
      grandTotal: subtotal,
    };
  };

  const totals = calculateTotals();

  // Fetch data on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getSuppliers({ company: userCompany }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Update item warehouses when default warehouse changes
  useEffect(() => {
    if (watchedWarehouse && watchedItems.length > 0) {
      watchedItems.forEach((_, index) => {
        const currentItemWarehouse = watch(`items.${index}.warehouse`);
        if (!currentItemWarehouse) {
          setValue(`items.${index}.warehouse`, watchedWarehouse);
        }
      });
    }
  }, [watchedWarehouse, setValue, watch]);

  const onSubmit = async (data) => {
    if (!data.supplier) {
      dispatch(
        showNotification({
          message: 'Supplier is required',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    const validItems = data.items.filter((item) => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      dispatch(
        showNotification({
          message: 'Please add at least one item',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    const receiptData = {
      supplier: data.supplier,
      company: userCompany,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate) || 0,
        warehouse: item.warehouse || data.warehouse,
      })),
      posting_date: data.posting_date,
      warehouse: data.warehouse || undefined,
    };

    const result = await dispatch(createPurchaseReceipt(receiptData));

    if (result.type === 'purchase/createPurchaseReceipt/fulfilled') {
      const receiptName = result.payload?.receipt?.name;
      if (receiptName) {
        navigate('/purchases/receipts');
      } else {
        navigate('/purchases');
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases/receipts')}
            sx={{ 
              mr: 2,
              textTransform: 'none',
              fontSize: '0.8125rem'
            }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            New Purchase Receipt
          </Typography>
        </Box>

        {/* Form */}
        <Paper elevation={2} sx={{ p: 4 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="supplier"
                  control={control}
                  rules={{ required: 'Supplier is required' }}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={suppliers}
                      getOptionLabel={(option) =>
                        typeof option === 'string'
                          ? option
                          : `${option.name}${option.supplier_name ? ` - ${option.supplier_name}` : ''}`
                      }
                      isOptionEqualToValue={(option, value) =>
                        (typeof option === 'string' ? option : option.name) ===
                        (typeof value === 'string' ? value : value?.name)
                      }
                      onChange={(_, newValue) => {
                        field.onChange(typeof newValue === 'string' ? newValue : newValue?.name || '');
                      }}
                      loading={isLoadingSuppliers}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Supplier *"
                          size="small"
                          error={!!errors.supplier}
                          helperText={errors.supplier?.message}
                          placeholder="Select supplier"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <Business sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="posting_date"
                  control={control}
                  rules={{ required: 'Posting date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Posting Date *"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.posting_date}
                      helperText={errors.posting_date?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="warehouse"
                  control={control}
                  rules={{ required: 'Warehouse is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.warehouse} size="small">
                      <InputLabel>Default Warehouse *</InputLabel>
                      <Select 
                        {...field} 
                        label="Default Warehouse *"
                        startAdornment={
                          <InputAdornment position="start">
                            <Warehouse sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="">Select Warehouse</MenuItem>
                        {warehouses.map((wh) => (
                          <MenuItem key={wh.name} value={wh.name}>
                            {wh.warehouse_name || wh.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.warehouse && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.warehouse.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            {/* Items Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Items
            </Typography>
            <TableContainer
              sx={{
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Item Code *</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Quantity *</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Rate</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id} hover>
                      <TableCell>
                        <Controller
                          name={`items.${index}.item_code`}
                          control={control}
                          rules={{ required: 'Item code is required' }}
                          render={({ field }) => (
                            <Autocomplete
                              {...field}
                              options={products}
                              getOptionLabel={(option) =>
                                typeof option === 'string'
                                  ? option
                                  : `${option.item_code} - ${option.item_name || ''}`
                              }
                              isOptionEqualToValue={(option, value) =>
                                (typeof option === 'string' ? option : option.item_code) ===
                                (typeof value === 'string' ? value : value?.item_code)
                              }
                              onChange={(_, newValue) => {
                                field.onChange(
                                  typeof newValue === 'string' ? newValue : newValue?.item_code || ''
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  size="small"
                                  error={!!errors.items?.[index]?.item_code}
                                  helperText={errors.items?.[index]?.item_code?.message}
                                  placeholder="Select item"
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start">
                                          <QrCodeScanner sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                  sx={{ 
                                    minWidth: 250,
                                    '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                  }}
                                />
                              )}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`items.${index}.qty`}
                          control={control}
                          rules={{
                            required: 'Quantity is required',
                            min: { value: 0.01, message: 'Quantity must be greater than 0' },
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              inputProps={{ min: 0, step: 0.01 }}
                              error={!!errors.items?.[index]?.qty}
                              helperText={errors.items?.[index]?.qty?.message}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Numbers sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                width: 120,
                                '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                              }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`items.${index}.rate`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              inputProps={{ min: 0, step: 0.01 }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                width: 120,
                                '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                              }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`items.${index}.warehouse`}
                          control={control}
                          render={({ field }) => (
                            <FormControl sx={{ minWidth: 200 }} size="small">
                              <InputLabel>Warehouse</InputLabel>
                              <Select 
                                {...field} 
                                label="Warehouse"
                                startAdornment={
                                  <InputAdornment position="start">
                                    <Warehouse sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                                  </InputAdornment>
                                }
                              >
                                <MenuItem value="">Use default</MenuItem>
                                {warehouses.map((wh) => (
                                  <MenuItem key={wh.name} value={wh.name}>
                                    {wh.warehouse_name || wh.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {(
                            parseFloat(watchedItems[index]?.qty || 0) *
                            parseFloat(watchedItems[index]?.rate || 0)
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => remove(index)}
                          color="error"
                          disabled={fields.length === 1}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Button
              startIcon={<Add />}
              onClick={() =>
                append({
                  item_code: '',
                  qty: 1,
                  rate: 0,
                  warehouse: watchedWarehouse || (activeWarehouse?.name || activeWarehouse?.warehouse_name || ''),
                })
              }
              sx={{ 
                mt: 2,
                textTransform: 'none',
                fontSize: '0.8125rem'
              }}
            >
              Add Item
            </Button>

            {/* Totals */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Paper sx={{ p: 2, minWidth: 300 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body1">Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" fontWeight="bold">
                      KES {totals.subtotal.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total:</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      KES {totals.grandTotal.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/purchases/receipts')}
                sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <Save />}
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? 'Creating...' : 'Create Receipt'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default NewPurchaseReceipt;
