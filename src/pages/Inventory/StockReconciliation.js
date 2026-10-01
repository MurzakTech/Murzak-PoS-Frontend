import React, { useEffect } from 'react';
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
  Autocomplete,
  Chip,
} from '@mui/material';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createStockReconciliation, getStockBalance } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts, getUOMs } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const StockReconciliation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedItem = searchParams.get('item');
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { products, uoms } = useAppSelector((state) => state.product);
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
      warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      posting_date: new Date().toISOString().split('T')[0],
      items: [{
        item_code: '',
        qty: 0,
        valuation_rate: 0,
        system_qty: 0,
        buying_price: '',
        selling_price: '',
        unit_of_measure: '',
        sku: '',
        expiry_date: '',
        batch_no: '',
      }],
      do_not_submit: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const warehouse = watch('warehouse');
  const watchedItems = watch('items');

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
      dispatch(getUOMs());
    }
  }, [dispatch, userCompany]);

  // Update form when active warehouse changes to sync with global selection
  useEffect(() => {
    if (activeWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      setValue('warehouse', warehouseName);
    }
  }, [activeWarehouse, setValue]);

  const fetchSystemBalance = async (itemCode, index) => {
    if (!itemCode || !warehouse) return;

    const result = await dispatch(
      getStockBalance({
        item_code: itemCode,
        warehouse: warehouse,
      })
    );

    if (result.type === 'inventory/getStockBalance/fulfilled' && result.payload.balance) {
      setValue(`items.${index}.system_qty`, result.payload.balance.actual_qty || 0);
    }
  };

  // Pre-fill the first row when arriving with ?item=<code> (e.g. from Stock Summary's "Adjust Stock")
  useEffect(() => {
    if (preselectedItem) {
      setValue('items.0.item_code', preselectedItem);
      if (warehouse) {
        fetchSystemBalance(preselectedItem, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedItem, warehouse]);

  const onSubmit = async (data) => {
    const items = data.items
      .filter((item) => item.item_code)
      .map((item) => {
        const mappedItem = {
          item_code: item.item_code,
          qty: parseFloat(item.qty),
          ...(item.valuation_rate > 0 && { valuation_rate: parseFloat(item.valuation_rate) }),
        };

        // Add inventory detail fields if provided
        if (item.buying_price && parseFloat(item.buying_price) > 0) {
          mappedItem.buying_price = parseFloat(item.buying_price);
        }
        if (item.selling_price && parseFloat(item.selling_price) > 0) {
          mappedItem.selling_price = parseFloat(item.selling_price);
        }
        if (item.unit_of_measure) {
          mappedItem.unit_of_measure = item.unit_of_measure;
        }
        if (item.sku) {
          mappedItem.sku = item.sku.trim();
        }
        if (item.expiry_date) {
          mappedItem.expiry_date = item.expiry_date;
        }
        if (item.batch_no) {
          mappedItem.batch_no = item.batch_no.trim();
        }

        return mappedItem;
      });

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
      createStockReconciliation({
        items,
        warehouse: data.warehouse,
        posting_date: data.posting_date,
        do_not_submit: data.do_not_submit,
      })
    );

    if (result.type === 'inventory/createStockReconciliation/fulfilled') {
      navigate('/inventory');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/inventory')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Stock Reconciliation
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="warehouse"
                  control={control}
                  rules={{ required: 'Warehouse is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.warehouse}>
                      <InputLabel>Warehouse *</InputLabel>
                      <Select {...field} label="Warehouse *">
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Optional: Add inventory details (buying price, selling price, UOM, SKU, expiry, batch) to create/update warehouse-specific inventory details
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowX: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code *</TableCell>
                    <TableCell>System Qty</TableCell>
                    <TableCell>Physical Qty *</TableCell>
                    <TableCell>Difference</TableCell>
                    <TableCell>Valuation Rate</TableCell>
                    <TableCell>Buying Price</TableCell>
                    <TableCell>Selling Price</TableCell>
                    <TableCell>UOM</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Batch No</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => {
                    const systemQty = watchedItems[index]?.system_qty || 0;
                    const physicalQty = parseFloat(watchedItems[index]?.qty || 0);
                    const difference = physicalQty - systemQty;

                    return (
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
                                    typeof newValue === 'string'
                                      ? newValue
                                      : newValue?.item_code || '';
                                  field.onChange(itemCode);
                                  if (itemCode && warehouse) {
                                    fetchSystemBalance(itemCode, index);
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
                          <TextField
                            value={systemQty}
                            disabled
                            sx={{ width: 120 }}
                            InputProps={{ readOnly: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.qty`}
                            control={control}
                            rules={{ required: 'Physical quantity is required' }}
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
                          <Chip
                            label={difference > 0 ? `+${difference}` : difference}
                            color={difference > 0 ? 'success' : difference < 0 ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.valuation_rate`}
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
                        <TableCell>
                          <Controller
                            name={`items.${index}.buying_price`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                inputProps={{ min: 0, step: 0.01 }}
                                placeholder="Optional"
                                sx={{ width: 120 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.selling_price`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                inputProps={{ min: 0, step: 0.01 }}
                                placeholder="Optional"
                                sx={{ width: 120 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.unit_of_measure`}
                            control={control}
                            render={({ field }) => (
                              <Autocomplete
                                {...field}
                                options={uoms}
                                getOptionLabel={(option) =>
                                  typeof option === 'string' ? option : option.name || option
                                }
                                isOptionEqualToValue={(option, value) =>
                                  (typeof option === 'string' ? option : option.name) ===
                                  (typeof value === 'string' ? value : value?.name)
                                }
                                onChange={(_, newValue) => {
                                  const uomValue = typeof newValue === 'string' 
                                    ? newValue 
                                    : newValue?.name || '';
                                  field.onChange(uomValue);
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Optional"
                                    sx={{ width: 120 }}
                                  />
                                )}
                                sx={{ minWidth: 120 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.sku`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                placeholder="Optional"
                                sx={{ width: 150 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.expiry_date`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                placeholder="Optional"
                                sx={{ width: 150 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.batch_no`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                placeholder="Optional"
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
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Button
              startIcon={<Add />}
              onClick={() =>
                append({
                  item_code: '',
                  qty: 0,
                  valuation_rate: 0,
                  system_qty: 0,
                  buying_price: '',
                  selling_price: '',
                  unit_of_measure: '',
                  sku: '',
                  expiry_date: '',
                  batch_no: '',
                })
              }
              sx={{ mt: 2 }}
            >
              Add Item
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button variant="outlined" onClick={() => navigate('/inventory')}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                disabled={isLoading}
              >
                Create Reconciliation
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default StockReconciliation;

