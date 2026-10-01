import React, { useEffect, useState, useMemo } from 'react';
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
  InputAdornment,
  Stack,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  Add, 
  Delete,
  Receipt,
  Warehouse,
  QrCodeScanner,
  Numbers,
  AttachMoney,
  CalendarToday,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createGRN, getPurchaseInvoice, listPurchaseInvoices } from '../../store/purchaseSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * CreateGRN Component
 * Stage 3: Create GRN (Goods Receipt Note) from submitted Purchase Orders
 * Role-based access: Users with permission to receive goods
 */
const CreateGRN = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, selectedPurchase } = useAppSelector((state) => state.purchase);
  const { warehouses, isLoading: isLoadingWarehouses } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const { hasRole, hasAccess } = useRoleAccess();

  const lpoNo = searchParams.get('lpo_no');
  const [selectedPO, setSelectedPO] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [availablePOs, setAvailablePOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poSearchTerm, setPoSearchTerm] = useState('');

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Check role-based access - allow if user has role or access to create GRN
  const canCreateGRN = hasRole(['Purchase Manager', 'Warehouse Manager', 'Administrator', 'System Manager']) || 
                       hasAccess('/purchases/grn/new');

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      lpo_no: '',
      warehouse: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedLpoNo = watch('lpo_no');
  const watchedWarehouse = watch('warehouse');

  // Fetch warehouses and submitted POs on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      loadAvailablePOs();
    }
  }, [dispatch, userCompany]);

  // Load PO if lpo_no is provided in URL
  useEffect(() => {
    if (lpoNo && userCompany) {
      setValue('lpo_no', lpoNo);
      setPoSearchTerm(lpoNo);
      loadPurchaseOrder(lpoNo);
    }
  }, [lpoNo, userCompany, setValue]);

  // Load available Purchase Orders (submitted ones with pending items)
  const loadAvailablePOs = async () => {
    if (!userCompany) return;
    
    setLoadingPOs(true);
    try {
      const result = await dispatch(listPurchaseInvoices({
        company: userCompany,
        filters: JSON.stringify({ docstatus: 1 }), // Only submitted POs
        limit: 200,
        offset: 0,
      }));

      if (result.type === 'purchase/listPurchaseInvoices/fulfilled') {
        // Filter to only include POs with pending items
        // We'll need to load each PO's details to check, but for now show all submitted POs
        setAvailablePOs(result.payload.purchases || []);
      }
    } catch (error) {
      console.error('Error loading available POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  // Filter POs based on search term
  const filteredPOs = useMemo(() => {
    if (!poSearchTerm) return availablePOs;
    
    const searchLower = poSearchTerm.toLowerCase();
    return availablePOs.filter((po) => {
      const poName = (po.name || '').toLowerCase();
      const supplier = ((po.supplier || po.supplier_name) || '').toLowerCase();
      return poName.includes(searchLower) || supplier.includes(searchLower);
    });
  }, [availablePOs, poSearchTerm]);

  const loadPurchaseOrder = async (poName) => {
    const result = await dispatch(getPurchaseInvoice({ po_name: poName }));
    
    if (result.type === 'purchase/getPurchaseInvoice/fulfilled' && result.payload.purchase) {
      const po = result.payload.purchase;
      setSelectedPO(po);

      // Check if PO is submitted
      if (po.docstatus !== 1) {
        dispatch(
          showNotification({
            message: 'Purchase Order must be submitted before creating GRN',
            severity: 'error',
            title: 'Validation Error',
          })
        );
        return;
      }

      // Prepare available items with pending quantities
      const items = po.items?.map((item) => ({
        item_code: item.item_code,
        description: item.description || item.item_code,
        ordered_qty: item.qty || 0,
        received_qty: item.received_qty || 0,
        pending_qty: (item.qty || 0) - (item.received_qty || 0),
        rate: item.rate || 0,
        warehouse: item.warehouse || po.items?.[0]?.warehouse || '',
        purchase_order_item: item.name || null,
      })) || [];

      setAvailableItems(items);

      // Pre-fill warehouse if available
      if (items.length > 0 && items[0].warehouse) {
        setValue('warehouse', items[0].warehouse);
      }

      // Initialize form with items that have pending quantity
      const itemsWithPending = items.filter((item) => item.pending_qty > 0);
      reset({
        lpo_no: poName,
        warehouse: items[0]?.warehouse || '',
        items: itemsWithPending.map((item) => ({
          item_code: item.item_code,
          qty: item.pending_qty, // Default to full pending quantity
          max_qty: item.pending_qty,
          rate: item.rate,
          warehouse: item.warehouse,
        })),
      });
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

    if (!data.lpo_no) {
      dispatch(
        showNotification({
          message: 'Purchase Order number is required',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    if (!data.warehouse) {
      dispatch(
        showNotification({
          message: 'Warehouse is required',
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
          message: 'Please specify quantities for at least one item',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    // Validate quantities don't exceed pending
    const invalidItems = validItems.filter((item) => item.qty > item.max_qty);
    if (invalidItems.length > 0) {
      dispatch(
        showNotification({
          message: `Quantity exceeds pending quantity for item(s): ${invalidItems.map((i) => i.item_code).join(', ')}`,
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    // Prepare GRN data according to API documentation
    const grnData = {
      lpo_no: data.lpo_no,
      warehouse: data.warehouse,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
      })),
    };

    const result = await dispatch(createGRN(grnData));

    if (result.type === 'purchase/createGRN/fulfilled') {
      navigate('/purchases/grns');
    }
  };

  const addItem = () => {
    const availableItem = availableItems.find(
      (item) => !watchedItems.some((wi) => wi.item_code === item.item_code && item.pending_qty > 0)
    );
    
    if (availableItem && availableItem.pending_qty > 0) {
      append({
        item_code: availableItem.item_code,
        qty: availableItem.pending_qty,
        max_qty: availableItem.pending_qty,
        rate: availableItem.rate,
        warehouse: availableItem.warehouse,
      });
    }
  };

  // If user doesn't have permission, show access denied message
  if (!canCreateGRN) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            You do not have permission to create GRN. Please contact your administrator.
          </Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchases')}>
            Back to Purchases
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Create GRN (Goods Receipt Note)
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Create a GRN to receive goods against a submitted Purchase Order. Stock will be automatically updated upon submission.
        </Alert>

        <Paper elevation={2} sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={1.5}>
              {/* Purchase Order Selection - Smart Autocomplete */}
              <Grid item xs={12}>
                <Controller
                  name="lpo_no"
                  control={control}
                  rules={{ required: 'Purchase Order is required' }}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={filteredPOs}
                      loading={loadingPOs}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return `${option.name || ''} - ${option.supplier || option.supplier_name || 'No Supplier'}`;
                      }}
                      isOptionEqualToValue={(option, value) => {
                        const optionName = typeof option === 'string' ? option : option.name;
                        const valueName = typeof value === 'string' ? value : value?.name;
                        return optionName === valueName;
                      }}
                      inputValue={poSearchTerm}
                      onInputChange={(event, newInputValue) => {
                        setPoSearchTerm(newInputValue);
                      }}
                      onChange={(event, newValue) => {
                        const poName = typeof newValue === 'string' ? newValue : newValue?.name;
                        field.onChange(poName || '');
                        setPoSearchTerm(poName || '');
                        if (poName) {
                          loadPurchaseOrder(poName);
                        } else {
                          setSelectedPO(null);
                          setAvailableItems([]);
                          reset({
                            lpo_no: '',
                            warehouse: '',
                            items: [],
                          });
                        }
                      }}
                      filterOptions={(options, params) => {
                        // Custom filter to search by PO number and supplier
                        const filtered = options.filter((option) => {
                          const searchLower = params.inputValue.toLowerCase();
                          const poName = (option.name || '').toLowerCase();
                          const supplier = ((option.supplier || option.supplier_name) || '').toLowerCase();
                          return poName.includes(searchLower) || supplier.includes(searchLower);
                        });
                        return filtered;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Purchase Order *"
                          size="small"
                          placeholder="Search by PO number or supplier..."
                          error={!!errors.lpo_no}
                          helperText={errors.lpo_no?.message || 'Search and select a submitted Purchase Order'}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <Receipt sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                            endAdornment: (
                              <>
                                {loadingPOs ? <CircularProgress color="inherit" size={18} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const po = option;
                        return (
                          <Box component="li" {...props} key={po.name}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1" fontWeight={500}>
                                  {po.name}
                                </Typography>
                                <Chip
                                  label={po.docstatus === 1 ? 'Submitted' : 'Draft'}
                                  color={po.docstatus === 1 ? 'success' : 'default'}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Supplier: {po.supplier || po.supplier_name || 'N/A'} | 
                                Date: {po.transaction_date ? new Date(po.transaction_date).toLocaleDateString() : 'N/A'} | 
                                Total: KES {po.grand_total?.toFixed(2) || '0.00'}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Warehouse Selection */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="warehouse"
                  control={control}
                  rules={{ required: 'Warehouse is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.warehouse} size="small">
                      <InputLabel>Warehouse *</InputLabel>
                      <Select 
                        {...field} 
                        label="Warehouse *" 
                        disabled={isLoadingWarehouses}
                        startAdornment={
                          <InputAdornment position="start">
                            <Warehouse sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="">Select Warehouse</MenuItem>
                        {warehouses.map((warehouse) => (
                          <MenuItem key={warehouse.name || warehouse.warehouse_name} value={warehouse.name || warehouse.warehouse_name}>
                            {warehouse.warehouse_name || warehouse.name}
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

              {/* Selected PO Info */}
              {selectedPO && (
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Purchase Order: {selectedPO.name}
                    </Typography>
                    <Typography variant="body2">
                      Supplier: {selectedPO.supplier || selectedPO.supplier_name || '-'} | 
                      Date: {selectedPO.transaction_date ? new Date(selectedPO.transaction_date).toLocaleDateString() : '-'} |
                      Total: KES {selectedPO.grand_total?.toFixed(2) || '0.00'}
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Items Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Items to Receive</Typography>
                  {selectedPO && availableItems.some((item) => item.pending_qty > 0 && !watchedItems.some((wi) => wi.item_code === item.item_code)) && (
                    <Button startIcon={<Add />} onClick={addItem} variant="outlined" size="small">
                      Add Item
                    </Button>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                {fields.length === 0 ? (
                  <Alert severity="warning">
                    {selectedPO
                      ? 'No items with pending quantity available to receive.'
                      : 'Please enter a Purchase Order number and load the order to see available items.'}
                  </Alert>
                ) : (
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
                          <TableCell sx={{ fontWeight: 600 }}>Ordered Qty</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Received Qty</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Pending Qty</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Receive Qty *</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fields.map((field, index) => {
                          const item = watchedItems[index];
                          const availableItem = availableItems.find((ai) => ai.item_code === item?.item_code);
                          
                          return (
                            <TableRow key={field.id} hover>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.item_code`}
                                  control={control}
                                  render={({ field }) => (
                                    <Autocomplete
                                      {...field}
                                      options={availableItems.filter((ai) => ai.pending_qty > 0)}
                                      getOptionLabel={(option) =>
                                        typeof option === 'string'
                                          ? option
                                          : `${option.item_code} (${option.description})`
                                      }
                                      isOptionEqualToValue={(option, value) =>
                                        (typeof option === 'string' ? option : option.item_code) ===
                                        (typeof value === 'string' ? value : value?.item_code)
                                      }
                                      onChange={(_, newValue) => {
                                        const itemCode = typeof newValue === 'string' ? newValue : newValue?.item_code;
                                        field.onChange(itemCode);
                                        
                                        if (newValue && typeof newValue !== 'string') {
                                          setValue(`items.${index}.qty`, newValue.pending_qty);
                                          setValue(`items.${index}.max_qty`, newValue.pending_qty);
                                          setValue(`items.${index}.rate`, newValue.rate);
                                          setValue(`items.${index}.warehouse`, newValue.warehouse);
                                        }
                                      }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          placeholder="Select Item"
                                          size="small"
                                          disabled
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
                                    />
                                  )}
                                />
                                {availableItem && (
                                  <Typography variant="caption" color="text.secondary">
                                    {availableItem.description}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {availableItem?.ordered_qty || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {availableItem?.received_qty || 0}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {availableItem?.pending_qty || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.qty`}
                                  control={control}
                                  rules={{
                                    required: 'Quantity is required',
                                    min: { value: 0.01, message: 'Must be greater than 0' },
                                    max: {
                                      value: item?.max_qty || 0,
                                      message: `Cannot exceed ${item?.max_qty || 0}`,
                                    },
                                  }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="number"
                                      size="small"
                                      inputProps={{
                                        step: '0.01',
                                        min: '0.01',
                                        max: item?.max_qty || 0,
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
                                        width: 120,
                                        '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                      }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  onClick={() => remove(index)}
                                  color="error"
                                  size="small"
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
                )}
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button 
                    onClick={() => navigate('/purchases')} 
                    variant="outlined"
                    sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    disabled={isLoading || fields.length === 0}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {isLoading ? <CircularProgress size={20} /> : 'Create GRN'}
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

export default CreateGRN;

