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
  GridLegacy as Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createMaterialReceipt } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const MaterialReceipt = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.inventory);
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
      target_warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      posting_date: new Date().toISOString().split('T')[0],
      items: [{ item_code: '', qty: 1, basic_rate: 0 }],
      do_not_submit: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

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
      setValue('target_warehouse', warehouseName);
    }
  }, [activeWarehouse, setValue]);

  const onSubmit = async (data) => {
    if (!data.target_warehouse) {
      dispatch(
        showNotification({
          message: 'Target warehouse is required',
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
        t_warehouse: data.target_warehouse, // Add target warehouse to each item
        ...(item.basic_rate > 0 && { basic_rate: parseFloat(item.basic_rate) }),
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

    const result = await dispatch(
      createMaterialReceipt({
        items,
        target_warehouse: data.target_warehouse,
        posting_date: data.posting_date,
        do_not_submit: data.do_not_submit,
      })
    );

    if (result.type === 'inventory/createMaterialReceipt/fulfilled') {
      const receiptName = result.payload?.receipt?.name;
      // Navigate to receipts list to see the new entry
      navigate('/inventory/material-receipts');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/inventory/material-receipts')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Material Receipt
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/inventory/material-receipts')}
          >
            View History
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="target_warehouse"
                  control={control}
                  rules={{ required: 'Target warehouse is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.target_warehouse}>
                      <InputLabel>Target Warehouse *</InputLabel>
                      <Select {...field} label="Target Warehouse *">
                        <MenuItem value="">Select Warehouse</MenuItem>
                        {warehouses.map((wh) => (
                          <MenuItem key={wh.name} value={wh.name}>
                            {wh.warehouse_name || wh.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.target_warehouse && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.target_warehouse.message}
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
                    <TableCell>Basic Rate</TableCell>
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
                                field.onChange(
                                  typeof newValue === 'string' ? newValue : newValue?.item_code || ''
                                );
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
                              sx={{ width: 120 }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`items.${index}.basic_rate`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 120 }}
                            />
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

            <Button
              startIcon={<Add />}
              onClick={() => append({ item_code: '', qty: 1, basic_rate: 0 })}
              sx={{ mt: 2 }}
            >
              Add Item
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button variant="outlined" onClick={() => navigate('/inventory/material-receipts')}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                disabled={isLoading}
              >
                Create Receipt
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default MaterialReceipt;

