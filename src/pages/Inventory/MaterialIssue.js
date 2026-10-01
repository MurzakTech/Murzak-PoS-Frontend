import React, { useEffect, useState } from 'react';
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
  Alert,
} from '@mui/material';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createMaterialIssue, checkStockAvailability } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const MaterialIssue = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, stockAvailability } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { products } = useAppSelector((state) => state.product);
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
      source_warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      posting_date: new Date().toISOString().split('T')[0],
      items: [{ item_code: '', qty: 1, purpose: '' }],
      do_not_submit: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const sourceWarehouse = watch('source_warehouse');
  const watchedItems = watch('items');

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Update form when active warehouse changes to sync with global selection
  useEffect(() => {
    if (activeWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      setValue('source_warehouse', warehouseName);
    }
  }, [activeWarehouse, setValue]);

  const checkAvailability = async (itemCode, qty) => {
    if (!itemCode || !qty || !sourceWarehouse) return;

    await dispatch(
      checkStockAvailability({
        item_code: itemCode,
        qty: parseFloat(qty),
        warehouse: sourceWarehouse,
      })
    );
  };

  const onSubmit = async (data) => {
    if (!data.source_warehouse) {
      dispatch(
        showNotification({
          message: 'Source warehouse is required',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    const items = data.items
      .filter((item) => item.item_code && item.qty > 0)
      .map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        s_warehouse: data.source_warehouse, // Add source warehouse to each item
        ...(item.purpose && { purpose: item.purpose }),
      }));

    if (items.length === 0) {
      dispatch(
        showNotification({
          message: 'Please add at least one item',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    // Check stock availability for all items
    for (const item of items) {
      const result = await dispatch(
        checkStockAvailability({
          item_code: item.item_code,
          qty: item.qty,
          warehouse: data.source_warehouse,
        })
      );

      if (result.type === 'inventory/checkStockAvailability/fulfilled') {
        const availability = result.payload.availability;
        if (!availability.available && !availability.allow_negative_stock) {
          dispatch(
            showNotification({
              message: `Insufficient stock for ${item.item_code}. Available: ${availability.available_qty}, Required: ${availability.required_qty}`,
              severity: 'error',
              title: 'Stock Unavailable',
            })
          );
          return;
        }
      }
    }

    const result = await dispatch(
      createMaterialIssue({
        items,
        source_warehouse: data.source_warehouse,
        posting_date: data.posting_date,
        do_not_submit: data.do_not_submit,
      })
    );

    if (result.type === 'inventory/createMaterialIssue/fulfilled') {
      // Navigate to issues list to see the new entry
      navigate('/inventory/material-issues');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/inventory/material-issues')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Material Issue
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/inventory/material-issues')}
          >
            View History
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="source_warehouse"
                  control={control}
                  rules={{ required: 'Source warehouse is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.source_warehouse}>
                      <InputLabel>Source Warehouse *</InputLabel>
                      <Select {...field} label="Source Warehouse *">
                        <MenuItem value="">Select Warehouse</MenuItem>
                        {warehouses.map((wh) => (
                          <MenuItem key={wh.name} value={wh.name}>
                            {wh.warehouse_name || wh.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.source_warehouse && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.source_warehouse.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
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
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.posting_date}
                      helperText={errors.posting_date?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Items
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code *</TableCell>
                    <TableCell>Quantity *</TableCell>
                    <TableCell>Purpose/Reason</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
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
                                const itemCode =
                                  typeof newValue === 'string' ? newValue : newValue?.item_code || '';
                                field.onChange(itemCode);
                                if (watchedItems[index]?.qty && sourceWarehouse) {
                                  checkAvailability(itemCode, watchedItems[index].qty);
                                }
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  error={!!errors.items?.[index]?.item_code}
                                  helperText={errors.items?.[index]?.item_code?.message}
                                  placeholder="Select item"
                                />
                              )}
                              sx={{ minWidth: 250 }}
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
                              inputProps={{ min: 0, step: 0.01 }}
                              error={!!errors.items?.[index]?.qty}
                              helperText={errors.items?.[index]?.qty?.message}
                              onChange={(e) => {
                                field.onChange(e);
                                if (watchedItems[index]?.item_code && sourceWarehouse) {
                                  checkAvailability(watchedItems[index].item_code, e.target.value);
                                }
                              }}
                              sx={{ width: 120 }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`items.${index}.purpose`}
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} placeholder="Purpose/reason" sx={{ width: 200 }} />
                          )}
                        />
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

            {stockAvailability && !stockAvailability.available && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Insufficient stock. Available: {stockAvailability.available_qty}, Required:{' '}
                {stockAvailability.required_qty}
              </Alert>
            )}

            <Button
              startIcon={<Add />}
              onClick={() => append({ item_code: '', qty: 1, purpose: '' })}
              sx={{ mt: 2 }}
            >
              Add Item
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button variant="outlined" onClick={() => navigate('/inventory/material-issues')}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                disabled={isLoading}
              >
                Create Issue
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default MaterialIssue;

