import React, { useEffect, useState } from 'react';
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
  Alert,
  Autocomplete,
  Chip,
  IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts } from '../../store/productSlice';

/**
 * Create Reconciliation Component
 * Form to create a new multi-level stock reconciliation
 * 
 * @param {Object} props
 * @param {Function} props.onSuccess - Callback when reconciliation is created successfully
 * @returns {JSX.Element}
 */
const CreateReconciliation = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const { createReconciliation, loading, error } = useStockReconciliation();
  const { warehouses, isLoading: isLoadingWarehouses } = useAppSelector((state) => state.warehouse);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);
  const { activeWarehouse } = useAppSelector((state) => state.warehouse);

  const [items, setItems] = useState([{ item_code: '' }]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

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
      posting_time: new Date().toTimeString().slice(0, 8), // HH:MM:SS format
      purpose: 'Stock Reconciliation',
      expense_account: '',
      cost_center: '',
    },
  });

  const warehouse = watch('warehouse');

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Sync warehouse with active warehouse
  useEffect(() => {
    if (activeWarehouse && !warehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      setValue('warehouse', warehouseName);
    }
  }, [activeWarehouse, warehouse, setValue]);

  const addItem = () => {
    setItems([...items, { item_code: '' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const onSubmit = async (data) => {
    if (!userCompany) {
      return;
    }

    if (!data.warehouse) {
      return;
    }

    try {
      const payload = {
        warehouse: data.warehouse,
        posting_date: data.posting_date,
        ...(data.posting_time && { posting_time: data.posting_time }),
        purpose: data.purpose || 'Stock Reconciliation',
        ...(data.expense_account && { expense_account: data.expense_account }),
        ...(data.cost_center && { cost_center: data.cost_center }),
        ...(items.length > 0 && items.some(item => item.item_code) && {
          items: items.filter(item => item.item_code).map(item => ({ item_code: item.item_code })),
        }),
      };

      const result = await createReconciliation(payload);

      if (result.type === 'inventory/createMultiLevelReconciliation/fulfilled') {
        if (onSuccess) {
          onSuccess(result.payload.name || result.payload.reconciliation?.name);
        }
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Error creating reconciliation:', err);
    }
  };

  // Filter products for autocomplete
  const filteredProducts = products.filter((product) => {
    if (!itemSearchTerm) return true;
    const searchLower = itemSearchTerm.toLowerCase();
    return (
      (product.item_code && product.item_code.toLowerCase().includes(searchLower)) ||
      (product.item_name && product.item_name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create Multi-Level Stock Reconciliation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a new stock reconciliation that will go through a multi-level approval process
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {!userCompany && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Company information is required to create reconciliations. Please update your profile settings.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Warehouse */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.warehouse}>
              <InputLabel>Warehouse *</InputLabel>
              <Controller
                name="warehouse"
                control={control}
                rules={{ required: 'Warehouse is required' }}
                render={({ field }) => (
                  <Select {...field} label="Warehouse *" disabled={loading || isLoadingWarehouses}>
                    {warehouses.map((wh) => (
                      <MenuItem key={wh.name || wh.warehouse_name} value={wh.name || wh.warehouse_name}>
                        {wh.name || wh.warehouse_name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.warehouse && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.warehouse.message}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Posting Date */}
          <Grid item xs={12} md={3}>
            <Controller
              name="posting_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Posting Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              )}
            />
          </Grid>

          {/* Posting Time */}
          <Grid item xs={12} md={3}>
            <Controller
              name="posting_time"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Posting Time"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              )}
            />
          </Grid>

          {/* Purpose */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Purpose</InputLabel>
              <Controller
                name="purpose"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Purpose" disabled={loading}>
                    <MenuItem value="Stock Reconciliation">Stock Reconciliation</MenuItem>
                    <MenuItem value="Opening Stock">Opening Stock</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          {/* Expense Account (Optional) */}
          <Grid item xs={12} md={3}>
            <Controller
              name="expense_account"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Expense Account"
                  fullWidth
                  disabled={loading}
                />
              )}
            />
          </Grid>

          {/* Cost Center (Optional) */}
          <Grid item xs={12} md={3}>
            <Controller
              name="cost_center"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Cost Center"
                  fullWidth
                  disabled={loading}
                />
              )}
            />
          </Grid>

          {/* Initial Items (Optional) */}
          <Grid item xs={12}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Initial Items (Optional)</Typography>
                <Button
                  startIcon={<Add />}
                  onClick={addItem}
                  size="small"
                  disabled={loading || isLoadingProducts}
                >
                  Add Item
                </Button>
              </Box>

              {items.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                  <Autocomplete
                    options={filteredProducts}
                    getOptionLabel={(option) => `${option.item_code} - ${option.item_name || option.item_code}`}
                    value={products.find((p) => p.item_code === item.item_code) || null}
                    onChange={(event, newValue) => {
                      updateItem(index, 'item_code', newValue?.item_code || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      setItemSearchTerm(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={`Item ${index + 1}`}
                        placeholder="Search item code or name"
                        fullWidth
                        disabled={loading || isLoadingProducts}
                      />
                    )}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    onClick={() => removeItem(index)}
                    disabled={loading}
                    color="error"
                    sx={{ mt: 0.5 }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}

              {items.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  You can add items now or add them later during stock taking
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !userCompany || !warehouse}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Creating...' : 'Create Reconciliation'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CreateReconciliation;

