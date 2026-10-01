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
} from '@mui/material';
import { ArrowBack, Save, Add, Delete } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createStockEntry } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const STOCK_ENTRY_TYPES = [
  'Material Receipt',
  'Material Issue',
  'Material Transfer',
  'Manufacture',
  'Repack',
  'Material Transfer for Manufacture',
  'Material Consumption for Manufacture',
  'Material Transfer for Repack',
  'Subcontract',
];

const StockEntry = () => {
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
      stock_entry_type: 'Material Receipt',
      posting_date: new Date().toISOString().split('T')[0],
      posting_time: new Date().toTimeString().slice(0, 8), // HH:MM:SS format
      from_warehouse: '',
      to_warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      purpose: '',
      items: [{ item_code: '', qty: 1, s_warehouse: '', t_warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '', basic_rate: 0 }],
      do_not_save: false,
      do_not_submit: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Helper function to determine warehouse requirements
  const getWarehouseRequirements = (type) => {
    const needsSource = type === 'Material Issue' || 
                        type === 'Material Transfer' ||
                        type === 'Material Consumption for Manufacture' ||
                        type === 'Material Transfer for Manufacture' ||
                        type === 'Material Transfer for Repack';
    const needsTarget = type === 'Material Receipt' || 
                        type === 'Material Transfer' ||
                        type === 'Manufacture' ||
                        type === 'Repack' ||
                        type === 'Material Transfer for Manufacture' ||
                        type === 'Material Transfer for Repack';
    return { needsSource, needsTarget };
  };

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, page_size: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Update form when active warehouse changes to sync with global selection
  useEffect(() => {
    if (activeWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      const stockEntryType = watch('stock_entry_type');
      const warehouseReqs = getWarehouseRequirements(stockEntryType);
      
      // Set from_warehouse for Material Issue types
      if (warehouseReqs.needsSource) {
        setValue('from_warehouse', warehouseName);
      }
      
      // Set to_warehouse for Material Receipt types
      if (warehouseReqs.needsTarget) {
        setValue('to_warehouse', warehouseName);
      }
    }
  }, [activeWarehouse, setValue, watch]);

  const onSubmit = async (data) => {
    const items = data.items
      .filter((item) => item.item_code && item.qty > 0)
      .map((item) => {
        const itemData = {
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        };
        
        // Add warehouses per item if specified, otherwise use document-level defaults
        const warehouseReqs = getWarehouseRequirements(data.stock_entry_type);
        
        if (item.s_warehouse) {
          itemData.s_warehouse = item.s_warehouse;
        } else if (data.from_warehouse && warehouseReqs.needsSource) {
          itemData.s_warehouse = data.from_warehouse;
        }
        
        if (item.t_warehouse) {
          itemData.t_warehouse = item.t_warehouse;
        } else if (data.to_warehouse && warehouseReqs.needsTarget) {
          itemData.t_warehouse = data.to_warehouse;
        }
        
        if (item.basic_rate > 0) {
          itemData.basic_rate = parseFloat(item.basic_rate);
        }
        
        return itemData;
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

    // Build request data
    const requestData = {
        stock_entry_type: data.stock_entry_type,
        items,
      ...(data.posting_date && { posting_date: data.posting_date }),
      ...(data.posting_time && { posting_time: data.posting_time }),
      ...(data.from_warehouse && { from_warehouse: data.from_warehouse }),
      ...(data.to_warehouse && { to_warehouse: data.to_warehouse }),
      ...(data.purpose && { purpose: data.purpose }),
      ...(data.do_not_save && { do_not_save: data.do_not_save }),
      ...(data.do_not_submit && { do_not_submit: data.do_not_submit }),
    };

    const result = await dispatch(createStockEntry(requestData));

    if (result.type === 'inventory/createStockEntry/fulfilled') {
      const entryName = result.payload?.entry?.name;
      if (entryName) {
        // Navigate to stock entries list to see the new entry
        navigate('/inventory/stock-entries');
      } else {
      navigate('/inventory');
      }
    }
  };

  const stockEntryType = watch('stock_entry_type');
  const fromWarehouse = watch('from_warehouse');
  const toWarehouse = watch('to_warehouse');
  
  const { needsSource: needsSourceWarehouse, needsTarget: needsTargetWarehouse } = getWarehouseRequirements(stockEntryType);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/inventory')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Stock Entry
          </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/inventory/stock-entries')}
          >
            View History
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Controller
                  name="stock_entry_type"
                  control={control}
                  rules={{ required: 'Stock entry type is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.stock_entry_type}>
                      <InputLabel>Stock Entry Type *</InputLabel>
                      <Select {...field} label="Stock Entry Type *">
                        {STOCK_ENTRY_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.stock_entry_type && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.stock_entry_type.message}
                        </Typography>
                      )}
                    </FormControl>
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
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.posting_date}
                      helperText={errors.posting_date?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="posting_time"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Posting Time"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 1 }}
                      helperText="Optional (HH:MM:SS)"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="purpose"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Purpose"
                      placeholder="Auto-determined if empty"
                      helperText="Optional - auto-determined from type"
                    />
                  )}
                />
              </Grid>
              {/* Document-level warehouses (optional, can override per item) */}
              {(needsSourceWarehouse || needsTargetWarehouse) && (
                <>
                  {needsSourceWarehouse && (
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="from_warehouse"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Default Source Warehouse</InputLabel>
                            <Select {...field} label="Default Source Warehouse">
                              <MenuItem value="">None (specify per item)</MenuItem>
                              {warehouses.map((wh) => (
                                <MenuItem key={wh.name} value={wh.name}>
                                  {wh.warehouse_name || wh.name}
                                </MenuItem>
                              ))}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              Optional - can be specified per item instead
                            </Typography>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  )}
                  {needsTargetWarehouse && (
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="to_warehouse"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Default Target Warehouse</InputLabel>
                            <Select {...field} label="Default Target Warehouse">
                              <MenuItem value="">None (specify per item)</MenuItem>
                              {warehouses.map((wh) => (
                                <MenuItem key={wh.name} value={wh.name}>
                                  {wh.warehouse_name || wh.name}
                                </MenuItem>
                              ))}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              Optional - can be specified per item instead
                            </Typography>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Items
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {fromWarehouse || toWarehouse 
                ? `Default warehouses set. You can override per item or leave blank to use defaults.`
                : needsSourceWarehouse || needsTargetWarehouse
                ? `Specify warehouses per item or set defaults above.`
                : 'Add items to this stock entry.'}
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code *</TableCell>
                    <TableCell>Quantity *</TableCell>
                    {needsSourceWarehouse && <TableCell>Source Warehouse</TableCell>}
                    {needsTargetWarehouse && <TableCell>Target Warehouse</TableCell>}
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
                      {needsSourceWarehouse && (
                        <TableCell>
                          <Controller
                            name={`items.${index}.s_warehouse`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth>
                                <InputLabel>Source Warehouse</InputLabel>
                                <Select 
                                  {...field} 
                                  label="Source Warehouse"
                                  value={field.value || ''}
                                >
                                  <MenuItem value="">Use default or none</MenuItem>
                                  {warehouses.map((wh) => (
                                    <MenuItem key={wh.name} value={wh.name}>
                                      {wh.warehouse_name || wh.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                                {fromWarehouse && !field.value && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Default: {warehouses.find(w => w.name === fromWarehouse)?.warehouse_name || fromWarehouse}
                                  </Typography>
                                )}
                              </FormControl>
                            )}
                          />
                        </TableCell>
                      )}
                      {needsTargetWarehouse && (
                        <TableCell>
                          <Controller
                            name={`items.${index}.t_warehouse`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth>
                                <InputLabel>Target Warehouse</InputLabel>
                                <Select 
                                  {...field} 
                                  label="Target Warehouse"
                                  value={field.value || ''}
                                >
                                  <MenuItem value="">Use default or none</MenuItem>
                                  {warehouses.map((wh) => (
                                    <MenuItem key={wh.name} value={wh.name}>
                                      {wh.warehouse_name || wh.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                                {toWarehouse && !field.value && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Default: {warehouses.find(w => w.name === toWarehouse)?.warehouse_name || toWarehouse}
                                  </Typography>
                                )}
                              </FormControl>
                            )}
                          />
                        </TableCell>
                      )}
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
              onClick={() => {
                const watchedToWarehouse = watch('to_warehouse');
                const watchedFromWarehouse = watch('from_warehouse');
                const warehouseName = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
                append({
                  item_code: '',
                  qty: 1,
                  s_warehouse: watchedFromWarehouse || warehouseName,
                  t_warehouse: watchedToWarehouse || warehouseName,
                  basic_rate: 0,
                });
              }}
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
                Create Entry
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default StockEntry;

