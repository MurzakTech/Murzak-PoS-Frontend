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
  Alert,
  Divider,
  Chip,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Delete,
  Inventory,
  LocalShipping,
  CalendarToday,
  AttachMoney,
  Numbers,
  Business,
  Warehouse,
  QrCodeScanner,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createPurchaseInvoice } from '../../store/purchaseSlice';
import { getSuppliers } from '../../store/supplierSlice';
import { getProducts } from '../../store/productSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * CreatePurchaseOrder Component
 * Enhanced UI/UX with bulk row addition and better product selection
 */
const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.purchase);
  const { suppliers, isLoading: isLoadingSuppliers } = useAppSelector((state) => state.supplier);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const { hasRole, hasAccess } = useRoleAccess();

  // State for bulk row addition
  const [bulkRowCount, setBulkRowCount] = useState('1');
  const [filteredProducts, setFilteredProducts] = useState([]);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Check role-based access
  const canCreatePO = hasRole(['Purchase Manager', 'Purchase User', 'Administrator', 'System Manager']) || 
                      hasAccess('/purchases/new');

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm({
    defaultValues: {
      supplier: '',
      transaction_date: new Date().toISOString().split('T')[0],
      warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      items: [
        {
          item_code: '',
          qty: 1,
          rate: 0,
          warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
          schedule_date: new Date().toISOString().split('T')[0],
          uom: '',
          item_name: '',
        },
      ],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedWarehouse = watch('warehouse');

  // Filter purchase items
  useEffect(() => {
    if (products && Array.isArray(products)) {
      const purchasableProducts = products.filter(
        (product) => product.is_purchase_item === 1 && product.disabled === 0
      );
      setFilteredProducts(purchasableProducts);
    }
  }, [products]);

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      return sum + (qty * rate);
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

  // Add multiple rows at once
  const addMultipleRows = () => {
    const count = parseInt(bulkRowCount) || 1;
    const rowsToAdd = Math.min(count, 50); // Limit to 50 rows at once
    
    if (rowsToAdd <= 0) {
      dispatch(
        showNotification({
          message: 'Please enter a valid number of rows',
          severity: 'warning',
          title: 'Invalid Input',
        })
      );
      return;
    }

    const newRows = Array.from({ length: rowsToAdd }, () => ({
      item_code: '',
      qty: 1,
      rate: 0,
      warehouse: watchedWarehouse || '',
      schedule_date: new Date().toISOString().split('T')[0],
      uom: '',
      item_name: '',
    }));

    append(newRows);
    setBulkRowCount('1');
    
    dispatch(
      showNotification({
        message: `Added ${rowsToAdd} item row${rowsToAdd > 1 ? 's' : ''}`,
        severity: 'success',
        title: 'Rows Added',
      })
    );
  };

  // Handle product selection with auto-fill
  const handleProductSelect = (index, selectedProduct) => {
    if (selectedProduct) {
      // Set item_code and item_name
      setValue(`items.${index}.item_code`, selectedProduct.item_code);
      setValue(`items.${index}.item_name`, selectedProduct.item_name);
      setValue(`items.${index}.uom`, selectedProduct.stock_uom);
      
      // Auto-fill rate (price if available, otherwise standard_rate)
      const rate = selectedProduct.price || selectedProduct.standard_rate || 0;
      setValue(`items.${index}.rate`, rate);
      
      // Trigger validation
      trigger(`items.${index}.item_code`);
      trigger(`items.${index}.rate`);
    }
  };

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(
        showNotification({
          message: 'Company information not found.',
          severity: 'error',
          title: 'Company Required',
        })
      );
      return;
    }

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

    // Prepare purchase order data
    const poData = {
      company: userCompany,
      supplier: data.supplier,
      transaction_date: data.transaction_date,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        qty: Number(item.qty),
        rate: Number(item.rate) || 0,
        warehouse: item.warehouse || data.warehouse,
        schedule_date: item.schedule_date || data.transaction_date,
        uom: item.uom,
        item_name: item.item_name,
      })),
    };

    const result = await dispatch(createPurchaseInvoice(poData));

    if (result.type === 'purchase/createPurchaseInvoice/fulfilled') {
      const lpoNo = result.payload?.purchase?.name;
      if (lpoNo) {
        navigate(`/purchases/${lpoNo}`);
      } else {
        navigate('/purchases');
      }
    }
  };

  // If user doesn't have permission
  if (!canCreatePO) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            You do not have permission to create purchase orders. Please contact your administrator.
          </Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchases')}>
            Back to Purchases
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/purchases')}
              variant="outlined"
              size="small"
            >
              Back
            </Button>
            <Typography variant="h5" component="h1" fontWeight={600}>
              Create Purchase Order
            </Typography>
            <Chip label="Draft" color="info" size="small" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {fields.length} item{fields.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 1 }}>
          Create a draft purchase order. The order must be submitted before goods can be received.
        </Alert>

        <Grid container spacing={1.5}>
          {/* Left Column - Basic Info */}
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShipping fontSize="small" /> Order Details
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Supplier Selection */}
                <Controller
                  name="supplier"
                  control={control}
                  rules={{ required: 'Supplier is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.supplier} size="small">
                      <InputLabel>Supplier *</InputLabel>
                      <Select
                        {...field}
                        label="Supplier *"
                        disabled={isLoadingSuppliers}
                        startAdornment={
                          <InputAdornment position="start">
                            <Business sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="" disabled>
                          Select Supplier
                        </MenuItem>
                        {suppliers.map((supplier) => (
                          <MenuItem key={supplier.name || supplier.supplier_name} value={supplier.name || supplier.supplier_name}>
                            {supplier.supplier_name || supplier.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.supplier && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.supplier.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                {/* Transaction Date */}
                <Controller
                  name="transaction_date"
                  control={control}
                  rules={{ required: 'Transaction date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Order Date *"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      error={!!errors.transaction_date}
                      helperText={errors.transaction_date?.message}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />

                {/* Default Warehouse */}
                <Controller
                  name="warehouse"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Default Warehouse</InputLabel>
                      <Select
                        {...field}
                        label="Default Warehouse"
                        disabled={isLoadingWarehouses}
                        startAdornment={
                          <InputAdornment position="start">
                            <Warehouse sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="">None</MenuItem>
                        {warehouses.map((warehouse) => (
                          <MenuItem key={warehouse.name || warehouse.warehouse_name} value={warehouse.name || warehouse.warehouse_name}>
                            {warehouse.warehouse_name || warehouse.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                {/* Bulk Row Addition */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Add fontSize="small" /> Add Multiple Items
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      value={bulkRowCount}
                      onChange={(e) => setBulkRowCount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Number of rows"
                      size="small"
                      type="number"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Numbers sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        flex: 1,
                        '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                      }}
                    />
                    <Button
                      onClick={addMultipleRows}
                      variant="contained"
                      size="small"
                      disabled={isLoadingProducts}
                    >
                      Add
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Add multiple empty rows at once
                  </Typography>
                </Box>

                {/* Quick Stats */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Order Summary
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption">Total Items</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {fields.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Subtotal</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        KES {totals.subtotal.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Items Table */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory fontSize="small" /> Order Items
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<Add />}
                    onClick={() => append({
                      item_code: '',
                      qty: 1,
                      rate: 0,
                      warehouse: watchedWarehouse || '',
                      schedule_date: new Date().toISOString().split('T')[0],
                      uom: '',
                      item_name: '',
                    })}
                    variant="outlined"
                    size="small"
                  >
                    Add Single Item
                  </Button>
                </Box>
              </Box>

              <TableContainer 
                sx={{ 
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  maxHeight: 500, 
                  overflow: 'auto' 
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="30%" sx={{ fontWeight: 600 }}>Product *</TableCell>
                      <TableCell width="10%" sx={{ fontWeight: 600 }}>Qty</TableCell>
                      <TableCell width="12%" sx={{ fontWeight: 600 }}>UoM</TableCell>
                      <TableCell width="15%" sx={{ fontWeight: 600 }}>Rate (KES)</TableCell>
                      <TableCell width="15%" sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell width="18%" align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, index) => {
                      const item = watchedItems[index];
                      const amount = ((Number(item?.qty) || 0) * (Number(item?.rate) || 0)).toFixed(2);
                      const selectedProduct = filteredProducts.find(p => p.item_code === item?.item_code);
                      
                      return (
                        <TableRow 
                          key={field.id}
                          hover
                          sx={{ 
                            bgcolor: !item?.item_code ? 'action.selected' : 'transparent'
                          }}
                        >
                          {/* Product Selection */}
                          <TableCell>
                            <Controller
                              name={`items.${index}.item_code`}
                              control={control}
                              rules={{ required: 'Product is required' }}
                              render={({ field: { onChange, value, ...fieldProps } }) => (
                                <Autocomplete
                                  {...fieldProps}
                                  value={selectedProduct || null}
                                  onChange={(_, newValue) => {
                                    onChange(newValue?.item_code || '');
                                    handleProductSelect(index, newValue);
                                  }}
                                  options={filteredProducts}
                                  getOptionLabel={(option) => {
                                    if (typeof option === 'string') return option;
                                    return `${option.item_name} (${option.item_code})`;
                                  }}
                                  isOptionEqualToValue={(option, value) => 
                                    option.item_code === value?.item_code
                                  }
                                  loading={isLoadingProducts}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Select product..."
                                      error={!!errors.items?.[index]?.item_code}
                                      helperText={errors.items?.[index]?.item_code?.message}
                                      size="small"
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
                                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                                    />
                                  )}
                                  renderOption={(props, option) => (
                                    <li {...props}>
                                      <Box>
                                        <Typography variant="body2">
                                          {option.item_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Code: {option.item_code} | Stock: {option.stock_qty} {option.stock_uom}
                                        </Typography>
                                      </Box>
                                    </li>
                                  )}
                                />
                              )}
                            />
                          </TableCell>

                          {/* Quantity */}
                          <TableCell>
                            <Controller
                              name={`items.${index}.qty`}
                              control={control}
                              rules={{
                                required: 'Qty required',
                                min: { value: 0.01, message: 'Min 0.01' },
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  inputProps={{ 
                                    step: '0.01', 
                                    min: '0.01',
                                    style: { textAlign: 'right' }
                                  }}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                                    width: '100%',
                                    '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                  }}
                                />
                              )}
                            />
                          </TableCell>

                          {/* UoM */}
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {selectedProduct?.stock_uom || '—'}
                            </Typography>
                          </TableCell>

                          {/* Rate */}
                          <TableCell>
                            <Controller
                              name={`items.${index}.rate`}
                              control={control}
                              rules={{
                                required: 'Rate required',
                                min: { value: 0, message: 'Min 0' },
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  inputProps={{ 
                                    step: '0.01', 
                                    min: '0',
                                    style: { textAlign: 'right' }
                                  }}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  error={!!errors.items?.[index]?.rate}
                                  helperText={errors.items?.[index]?.rate?.message}
                                  sx={{ width: '100%' }}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                                      </InputAdornment>
                                    ),
                                  }}
                                  sx={{ 
                                    width: '100%',
                                    '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                  }}
                                />
                              )}
                            />
                          </TableCell>

                          {/* Amount */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              KES {amount}
                            </Typography>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Tooltip title="Schedule Date">
                                <Controller
                                  name={`items.${index}.schedule_date`}
                                  control={control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="date"
                                      size="small"
                                      sx={{ 
                                        width: 120,
                                        '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                      }}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                                          </InputAdornment>
                                        ),
                                      }}
                                    />
                                  )}
                                />
                              </Tooltip>
                              
                              <Tooltip title="Remove item">
                                <IconButton
                                  onClick={() => remove(index)}
                                  color="error"
                                  size="small"
                                  disabled={fields.length === 1}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals Section */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2} justifyContent="flex-end">
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        KES {totals.subtotal.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tax (0%)
                      </Typography>
                      <Typography variant="body1">KES 0.00</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Grand Total</Typography>
                      <Typography variant="h5" color="primary" fontWeight={700}>
                        KES {totals.grandTotal.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Submit Buttons */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  onClick={() => navigate('/purchases')} 
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
                >
                  Cancel
                </Button>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    type="button"
                    variant="outlined"
                    onClick={handleSubmit(onSubmit)}
                    sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
                  >
                    Save Draft
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="contained" 
                    onClick={handleSubmit(onSubmit)}
                    startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    disabled={isLoading}
                    sx={{ 
                      minWidth: 200,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Create Purchase Order'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default CreatePurchaseOrder;