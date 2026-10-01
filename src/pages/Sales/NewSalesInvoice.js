import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Divider,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

import { createSalesInvoice, updateSalesInvoice, getSalesInvoice } from '../../store/salesSlice';
import { getProducts } from '../../store/productSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { listCustomers } from '../../store/customerSlice';
import { showNotification } from '../../store/notificationSlice';

const NewSalesInvoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const draftName = searchParams.get('draft');
  
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { warehouses, isLoading: isLoadingWarehouses } = useAppSelector((state) => state.warehouse);
  const { isLoading, isLoadingDetails, selectedSalesInvoice } = useAppSelector((state) => state.sales);
  const { customers, isLoading: isLoadingCustomers } = useAppSelector((state) => state.customer);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [isDraft, setIsDraft] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      customer: '',
      posting_date: new Date().toISOString().split('T')[0],
      due_date: '',
      warehouse: '',
      is_pos: false,
      pos_profile: '',
      items: [{ item_code: '', qty: 1, rate: 0, warehouse: '', discount_percentage: 0, discount_amount: 0 }],
      apply_discount_on: 'Net Total',
      additional_discount_percentage: 0,
      discount_amount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedWarehouse = watch('warehouse');
  const watchedDiscountType = watch('apply_discount_on');
  const watchedAdditionalDiscountPercentage = watch('additional_discount_percentage');
  const watchedDiscountAmount = watch('discount_amount');
  const watchedIsPOS = watch('is_pos');

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => {
      const itemQty = parseFloat(item.qty || 0);
      const itemRate = parseFloat(item.rate || 0);
      const itemDiscountPct = parseFloat(item.discount_percentage || 0);
      const itemDiscountAmt = parseFloat(item.discount_amount || 0);
      
      let itemAmount = itemQty * itemRate;
      
      // Apply item-level discount
      if (itemDiscountPct > 0) {
        itemAmount = itemAmount * (1 - itemDiscountPct / 100);
      } else if (itemDiscountAmt > 0) {
        itemAmount = itemAmount - itemDiscountAmt;
      }
      
      return sum + itemAmount;
    }, 0);

    // Calculate invoice-level discount
    let discount = 0;
    if (watchedAdditionalDiscountPercentage > 0) {
      discount = subtotal * (watchedAdditionalDiscountPercentage / 100);
    } else if (watchedDiscountAmount > 0) {
      discount = parseFloat(watchedDiscountAmount);
    }

    const netTotal = subtotal - discount;
    const taxAmount = 0; // TODO: Calculate from taxes array
    const grandTotal = netTotal + taxAmount;

    return {
      subtotal,
      discount,
      netTotal,
      taxAmount,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  // Fetch data on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(listCustomers({ company: userCompany, limit: 1000, disabled: false }));
      
      // Load draft if editing
      if (draftName) {
        dispatch(getSalesInvoice({ name: draftName })).then((result) => {
          if (result.type === 'sales/getSalesInvoice/fulfilled' && result.payload.salesInvoice) {
            const invoice = result.payload.salesInvoice;
            reset({
              customer: invoice.customer || '',
              posting_date: invoice.posting_date || new Date().toISOString().split('T')[0],
              due_date: invoice.due_date || '',
              warehouse: invoice.items?.[0]?.warehouse || '',
              is_pos: invoice.is_pos || false,
              pos_profile: invoice.pos_profile || '',
              items: invoice.items?.map(item => ({
                item_code: item.item_code || '',
                qty: item.qty || 1,
                rate: item.rate || 0,
                warehouse: item.warehouse || '',
                discount_percentage: item.discount_percentage || 0,
                discount_amount: item.discount_amount || 0,
              })) || [{ item_code: '', qty: 1, rate: 0, warehouse: '', discount_percentage: 0, discount_amount: 0 }],
              apply_discount_on: invoice.apply_discount_on || 'Net Total',
              additional_discount_percentage: invoice.additional_discount_percentage || 0,
              discount_amount: invoice.discount_amount || 0,
            });
            setIsDraft(invoice.docstatus === 0);
          }
        });
      }
    }
  }, [dispatch, userCompany, draftName, reset]);

  // Update warehouse for all items when default warehouse changes
  useEffect(() => {
    if (watchedWarehouse) {
      watchedItems.forEach((_, index) => {
        if (!watchedItems[index].warehouse) {
          setValue(`items.${index}.warehouse`, watchedWarehouse);
        }
      });
    }
  }, [watchedWarehouse, watchedItems, setValue]);

  const onSubmit = async (data, saveAsDraft = false) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Validate items
    const validItems = data.items.filter(item => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one item to the invoice.',
        severity: 'error',
        title: 'Items Required',
      }));
      return;
    }

    // Validate customer
    if (!data.customer || data.customer.trim() === '') {
      dispatch(showNotification({
        message: 'Customer is required.',
        severity: 'error',
        title: 'Customer Required',
      }));
      return;
    }

    const invoiceData = {
      customer: data.customer.trim(),
      company: userCompany,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate) || undefined,
        warehouse: item.warehouse || data.warehouse || undefined,
        discount_percentage: item.discount_percentage > 0 ? parseFloat(item.discount_percentage) : undefined,
        discount_amount: item.discount_amount > 0 ? parseFloat(item.discount_amount) : undefined,
      })),
      posting_date: data.posting_date,
      due_date: data.due_date || undefined,
      is_pos: data.is_pos || false,
      pos_profile: data.pos_profile || undefined,
      apply_discount_on: data.apply_discount_on || undefined,
      additional_discount_percentage: data.additional_discount_percentage > 0 ? parseFloat(data.additional_discount_percentage) : undefined,
      discount_amount: data.discount_amount > 0 ? parseFloat(data.discount_amount) : undefined,
      do_not_submit: saveAsDraft || isDraft,
    };

    let result;
    if (draftName && isDraft) {
      result = await dispatch(updateSalesInvoice({
        name: draftName,
        ...invoiceData,
      }));
    } else {
      result = await dispatch(createSalesInvoice(invoiceData));
    }

    if (result.type.includes('/fulfilled')) {
      const invoiceName = result.payload?.salesInvoice?.name || draftName;
      if (saveAsDraft || isDraft) {
        dispatch(showNotification({
          message: 'Sales Invoice saved as draft successfully',
          severity: 'success',
          title: 'Draft Saved',
        }));
        navigate(`/sales/invoice/${invoiceName}/edit`);
      } else {
        navigate('/sales/history');
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
            onClick={() => navigate('/sales/history')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            {draftName ? 'Edit Sales Invoice' : 'New Sales Invoice'}
          </Typography>
          {isDraft && (
            <Chip label="Draft" color="default" size="small" sx={{ ml: 2 }} />
          )}
        </Box>

        {/* Form */}
        <Paper elevation={2} sx={{ p: 4 }}>
          <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="customer"
                  control={control}
                  rules={{ required: 'Customer is required' }}
                  render={({ field }) => {
                    const customerValue = customers.find((c) => c.name === field.value) || null;
                    return (
                      <Autocomplete
                        options={customers}
                        value={customerValue}
                        getOptionLabel={(option) => option?.customer_name || option?.name || ''}
                        isOptionEqualToValue={(option, value) => option?.name === value?.name}
                        loading={isLoadingCustomers}
                        onChange={(e, value) => field.onChange(value?.name || '')}
                        onBlur={field.onBlur}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Customer"
                            required
                            placeholder="Search by customer name..."
                            error={!!errors.customer}
                            helperText={errors.customer?.message}
                          />
                        )}
                      />
                    );
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Controller
                  name="posting_date"
                  control={control}
                  rules={{ required: 'Posting date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Posting Date"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.posting_date}
                      helperText={errors.posting_date?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Controller
                  name="due_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Due Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="warehouse"
                  control={control}
                  render={({ field }) => {
                    const warehouseValue = warehouses.find(
                      (w) => w.name === field.value || w.warehouse_name === field.value
                    ) || null;
                    return (
                      <Autocomplete
                        options={warehouses}
                        value={warehouseValue}
                        getOptionLabel={(option) => option?.warehouse_name || option?.name || ''}
                        isOptionEqualToValue={(option, value) =>
                          option?.name === value?.name || option?.warehouse_name === value?.warehouse_name
                        }
                        loading={isLoadingWarehouses}
                        onChange={(e, value) => field.onChange(value?.name || '')}
                        onBlur={field.onBlur}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Default Warehouse"
                            fullWidth
                            placeholder="Select warehouse"
                          />
                        )}
                      />
                    );
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Controller
                  name="is_pos"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="POS Invoice"
                    />
                  )}
                />
              </Grid>

              {watchedIsPOS && (
                <Grid item xs={12} sm={3}>
                  <Controller
                    name="pos_profile"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="POS Profile"
                        fullWidth
                        placeholder="Enter POS profile"
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Items Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Items</Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={() => append({ item_code: '', qty: 1, rate: 0, warehouse: '', discount_percentage: 0, discount_amount: 0 })}
                    variant="outlined"
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Code</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Discount</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Warehouse</TableCell>
                        <TableCell align="right" width={100}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fields.map((field, index) => {
                        const item = watchedItems[index];
                        const itemQty = parseFloat(item?.qty || 0);
                        const itemRate = parseFloat(item?.rate || 0);
                        const itemDiscountPct = parseFloat(item?.discount_percentage || 0);
                        const itemDiscountAmt = parseFloat(item?.discount_amount || 0);
                        
                        let itemAmount = itemQty * itemRate;
                        if (itemDiscountPct > 0) {
                          itemAmount = itemAmount * (1 - itemDiscountPct / 100);
                        } else if (itemDiscountAmt > 0) {
                          itemAmount = itemAmount - itemDiscountAmt;
                        }

                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Controller
                                name={`items.${index}.item_code`}
                                control={control}
                                rules={{ required: 'Item code is required' }}
                                render={({ field }) => {
                                  const productValue = products.find(
                                    (p) => p.item_code === field.value || p.name === field.value
                                  ) || null;
                                  return (
                                    <Autocomplete
                                      options={products}
                                      value={productValue}
                                      getOptionLabel={(option) => option?.item_code || option?.name || ''}
                                      isOptionEqualToValue={(option, value) =>
                                        option?.item_code === value?.item_code || option?.name === value?.name
                                      }
                                      loading={isLoadingProducts}
                                      onChange={(e, value) => {
                                        field.onChange(value?.item_code || value?.name || '');
                                        // Auto-fill rate if available
                                        if (value?.standard_rate) {
                                          setValue(`items.${index}.rate`, value.standard_rate);
                                        }
                                      }}
                                      onBlur={field.onBlur}
                                      sx={{ minWidth: 200 }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          placeholder="Item Code"
                                          size="small"
                                          error={!!errors.items?.[index]?.item_code}
                                        />
                                      )}
                                    />
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`items.${index}.qty`}
                                control={control}
                                rules={{ required: 'Quantity is required', min: { value: 0.01, message: 'Must be greater than 0' } }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    size="small"
                                    inputProps={{ step: '0.01', min: '0.01' }}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    error={!!errors.items?.[index]?.qty}
                                    sx={{ width: 100 }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`items.${index}.rate`}
                                control={control}
                                rules={{ required: 'Rate is required', min: { value: 0, message: 'Must be >= 0' } }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    size="small"
                                    inputProps={{ step: '0.01', min: '0' }}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    error={!!errors.items?.[index]?.rate}
                                    sx={{ width: 120 }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Controller
                                  name={`items.${index}.discount_type`}
                                  control={control}
                                  defaultValue="percentage"
                                  render={({ field }) => (
                                    <Select
                                      {...field}
                                      size="small"
                                      sx={{ width: 70 }}
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        setValue(`items.${index}.discount_percentage`, 0);
                                        setValue(`items.${index}.discount_amount`, 0);
                                      }}
                                    >
                                      <MenuItem value="percentage">%</MenuItem>
                                      <MenuItem value="amount">KES</MenuItem>
                                    </Select>
                                  )}
                                />
                                {watchedItems[index]?.discount_type === 'amount' ? (
                                  <Controller
                                    name={`items.${index}.discount_amount`}
                                    control={control}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        type="number"
                                        size="small"
                                        value={field.value || ''}
                                        placeholder="0"
                                        inputProps={{ step: '0.01', min: '0' }}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        sx={{ width: 100 }}
                                      />
                                    )}
                                  />
                                ) : (
                                  <Controller
                                    name={`items.${index}.discount_percentage`}
                                    control={control}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        type="number"
                                        size="small"
                                        value={field.value || ''}
                                        placeholder="0"
                                        inputProps={{ step: '0.01', min: '0', max: '100' }}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        sx={{ width: 100 }}
                                      />
                                    )}
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                KES {itemAmount.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`items.${index}.warehouse`}
                                control={control}
                                render={({ field }) => {
                                  const warehouseValue = warehouses.find(
                                    (w) => w.name === field.value || w.warehouse_name === field.value
                                  ) || (watchedWarehouse ? warehouses.find(
                                    (w) => w.name === watchedWarehouse || w.warehouse_name === watchedWarehouse
                                  ) : null);
                                  return (
                                    <Autocomplete
                                      options={warehouses}
                                      value={warehouseValue}
                                      getOptionLabel={(option) => option?.warehouse_name || option?.name || ''}
                                      isOptionEqualToValue={(option, value) =>
                                        option?.name === value?.name || option?.warehouse_name === value?.warehouse_name
                                      }
                                      loading={isLoadingWarehouses}
                                      onChange={(e, value) => field.onChange(value?.name || '')}
                                      onBlur={field.onBlur}
                                      size="small"
                                      sx={{ minWidth: 150 }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          placeholder="Warehouse"
                                        />
                                      )}
                                    />
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Discount Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Discount
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Controller
                  name="apply_discount_on"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Apply Discount On</InputLabel>
                      <Select
                        {...field}
                        label="Apply Discount On"
                      >
                        <MenuItem value="Net Total">Net Total</MenuItem>
                        <MenuItem value="Grand Total">Grand Total</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Controller
                  name="invoice_discount_type"
                  control={control}
                  defaultValue="percentage"
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Discount Type</InputLabel>
                      <Select
                        {...field}
                        label="Discount Type"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setValue('additional_discount_percentage', 0);
                          setValue('discount_amount', 0);
                        }}
                      >
                        <MenuItem value="percentage">Percentage</MenuItem>
                        <MenuItem value="amount">Flat Amount</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                {watch('invoice_discount_type') === 'amount' ? (
                  <Controller
                    name="discount_amount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Discount Amount"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        placeholder="0"
                        inputProps={{ step: '0.01', min: '0' }}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        helperText="Enter flat discount amount"
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="additional_discount_percentage"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Discount Percentage"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        placeholder="0"
                        inputProps={{ step: '0.01', min: '0', max: '100' }}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        helperText="Enter percentage (0-100)"
                      />
                    )}
                  />
                )}
              </Grid>

              {/* Totals Summary */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="h6">
                        KES {totals.subtotal.toFixed(2)}
                      </Typography>
                    </Grid>
                    {totals.discount > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Discount
                        </Typography>
                        <Typography variant="h6" color="error">
                          - KES {totals.discount.toFixed(2)}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Net Total
                      </Typography>
                      <Typography variant="h6">
                        KES {totals.netTotal.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Tax
                      </Typography>
                      <Typography variant="h6">
                        KES {totals.taxAmount.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Grand Total
                      </Typography>
                      <Typography variant="h4" color="primary" fontWeight={600}>
                        KES {totals.grandTotal.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/sales/history')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : 'Save as Draft'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={20} /> : isDraft ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default NewSalesInvoice;

