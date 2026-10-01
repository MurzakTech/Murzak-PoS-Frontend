import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  GridLegacy as Grid,
  Container,
  Switch,
  FormControlLabel,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Chip,
  Tooltip,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack,
  Discount,
  Inventory,
  CalendarToday,
  Percent,
  AttachMoney,
  PriorityHigh,
  Description,
  Category,
  Tag,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createInventoryDiscountRule,
  updateInventoryDiscountRule,
  getInventoryDiscountRule,
  clearSelectedRule,
} from '../../store/inventoryDiscountSlice';
import { getItemGroups, getProducts } from '../../store/productSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';

const DiscountRuleForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isEditMode = !!id;
  const itemCodeFromUrl = searchParams.get('item_code');

  const {
    selectedRule,
    isLoading,
    isLoadingDetails,
  } = useAppSelector((state) => state.inventoryDiscount);
  const { itemGroups, products } = useAppSelector((state) => state.product);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [filteredProducts, setFilteredProducts] = useState([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      rule_type: 'Item Group',
      company: userCompany || '',
      discount_type: 'Percentage',
      discount_value: 0,
      priority: 10,
      is_active: 1,
      warehouse: '',
      valid_from: '',
      valid_upto: '',
      description: '',
      item_code: '',
      item_name: '',
      batch_no: '',
      item_group: '',
    },
  });

  const watchedRuleType = watch('rule_type');
  const watchedDiscountType = watch('discount_type');
  const watchedItemCode = watch('item_code');

  // Update form when active warehouse changes (only if not in edit mode and warehouse not already set)
  useEffect(() => {
    if (!isEditMode && activeWarehouse && !watch('warehouse')) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        setValue('warehouse', warehouseName);
      }
    }
  }, [activeWarehouse, isEditMode, setValue, watch]);

  // Filter purchase items
  useEffect(() => {
    if (products && Array.isArray(products)) {
      const purchasableProducts = products.filter(
        (product) => product.is_stock_item === 1 && product.disabled === 0
      );
      setFilteredProducts(purchasableProducts);
    }
  }, [products]);

  // Fetch reference data on mount
  useEffect(() => {
    dispatch(getItemGroups());
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Fetch rule details if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      dispatch(getInventoryDiscountRule({ name: id }));
    }
    return () => {
      dispatch(clearSelectedRule());
    };
  }, [dispatch, isEditMode, id]);

  // Populate form when rule details are loaded (edit mode)
  useEffect(() => {
    if (isEditMode && selectedRule) {
      // Find the selected product if rule_type is 'Item'
      let selectedProduct = null;
      if (selectedRule.rule_type === 'Item' && selectedRule.item_code && filteredProducts.length > 0) {
        selectedProduct = filteredProducts.find(p => p.item_code === selectedRule.item_code);
      }

      reset({
        rule_type: selectedRule.rule_type || 'Item Group',
        company: selectedRule.company || userCompany || '',
        discount_type: selectedRule.discount_type || 'Percentage',
        discount_value: selectedRule.discount_value || 0,
        priority: selectedRule.priority || 10,
        is_active: selectedRule.is_active !== undefined ? selectedRule.is_active : 1,
        warehouse: selectedRule.warehouse || '',
        valid_from: selectedRule.valid_from ? selectedRule.valid_from.split('T')[0] : '',
        valid_upto: selectedRule.valid_upto ? selectedRule.valid_upto.split('T')[0] : '',
        description: selectedRule.description || '',
        item_code: selectedRule.item_code || '',
        item_name: selectedProduct?.item_name || selectedRule.item_name || '',
        batch_no: selectedRule.batch_no || '',
        item_group: selectedRule.item_group || '',
      });
    }
  }, [isEditMode, selectedRule, reset, userCompany, filteredProducts]);

  // Auto-populate form when item_code is provided via URL (create mode from inventory list)
  useEffect(() => {
    if (!isEditMode && itemCodeFromUrl && filteredProducts.length > 0 && !watch('item_code')) {
      const product = filteredProducts.find(p => p.item_code === itemCodeFromUrl);
      if (product) {
        // Set rule type to 'Item' and pre-select the product
        setValue('rule_type', 'Item');
        setValue('item_code', product.item_code);
        setValue('item_name', product.item_name);
      }
    }
  }, [isEditMode, itemCodeFromUrl, filteredProducts, setValue, watch]);

  // Handle product selection
  const handleProductSelect = (selectedProduct) => {
    if (selectedProduct) {
      setValue('item_code', selectedProduct.item_code);
      setValue('item_name', selectedProduct.item_name);
    }
  };

  const onSubmit = async (data) => {
    if (!userCompany && !data.company) {
      dispatch(
        showNotification({
          message: 'Company information is required',
          severity: 'error',
          title: 'Company Required',
        })
      );
      return;
    }

    // Validate conditional fields based on rule type
    if (data.rule_type === 'Item' && !data.item_code) {
      dispatch(
        showNotification({
          message: 'Item code is required for Item type rules',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    if (data.rule_type === 'Batch' && !data.batch_no) {
      dispatch(
        showNotification({
          message: 'Batch number is required for Batch type rules',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    if (data.rule_type === 'Item Group' && !data.item_group) {
      dispatch(
        showNotification({
          message: 'Item group is required for Item Group type rules',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    // Validate discount value
    if (data.discount_type === 'Percentage' && (data.discount_value < 0 || data.discount_value > 100)) {
      dispatch(
        showNotification({
          message: 'Percentage discount must be between 0 and 100',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    if (data.discount_type === 'Amount' && data.discount_value < 0) {
      dispatch(
        showNotification({
          message: 'Discount amount must be a positive number',
          severity: 'error',
          title: 'Validation Error',
        })
      );
      return;
    }

    // Prepare rule data
    const ruleData = {
      rule_type: data.rule_type,
      company: data.company || userCompany,
      discount_type: data.discount_type,
      discount_value: parseFloat(data.discount_value),
      priority: parseInt(data.priority) || 10,
      is_active: data.is_active ? 1 : 0,
      ...(data.warehouse && { warehouse: data.warehouse }),
      ...(data.valid_from && { valid_from: data.valid_from }),
      ...(data.valid_upto && { valid_upto: data.valid_upto }),
      ...(data.description && { description: data.description }),
      // Conditional fields based on rule type
      ...(data.rule_type === 'Item' && { item_code: data.item_code }),
      ...(data.rule_type === 'Batch' && { batch_no: data.batch_no }),
      ...(data.rule_type === 'Item Group' && { item_group: data.item_group }),
    };

    if (isEditMode) {
      ruleData.name = id;
      const result = await dispatch(updateInventoryDiscountRule(ruleData));
      if (result.type === 'inventoryDiscount/updateInventoryDiscountRule/fulfilled') {
        navigate('/settings/inventory-discounts');
      }
    } else {
      const result = await dispatch(createInventoryDiscountRule(ruleData));
      if (result.type === 'inventoryDiscount/createInventoryDiscountRule/fulfilled') {
        navigate('/settings/inventory-discounts');
      }
    }
  };

  if (isEditMode && isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Find selected product for display
  const selectedProduct = filteredProducts.find(p => p.item_code === watchedItemCode);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/settings/inventory-discounts')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" fontWeight={600}>
            {isEditMode ? 'Edit Discount Rule' : 'Create Discount Rule'}
          </Typography>
          {isEditMode && (
            <Chip 
              label={selectedRule?.is_active ? 'Active' : 'Inactive'} 
              color={selectedRule?.is_active ? 'success' : 'default'} 
              size="small" 
            />
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - Rule Configuration */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Discount fontSize="small" /> Rule Configuration
              </Typography>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Rule Type */}
                  <Controller
                    name="rule_type"
                    control={control}
                    rules={{ required: 'Rule type is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.rule_type} size="small">
                        <InputLabel>Rule Type</InputLabel>
                        <Select
                          {...field}
                          label="Rule Type"
                        >
                          <MenuItem value="Item Group">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Category fontSize="small" /> Item Group
                            </Box>
                          </MenuItem>
                          <MenuItem value="Item">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Inventory fontSize="small" /> Item
                            </Box>
                          </MenuItem>
                          <MenuItem value="Batch">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Tag fontSize="small" /> Batch
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Priority: Batch → Item → Item Group (most specific first)
                  </Typography>

                  {/* Conditional Fields Based on Rule Type */}
                  {watchedRuleType === 'Item' && (
                    <Controller
                      name="item_code"
                      control={control}
                      rules={{ required: 'Item is required' }}
                      render={({ field: { onChange, value, ...fieldProps } }) => (
                        <Autocomplete
                          {...fieldProps}
                          value={selectedProduct || null}
                          onChange={(_, newValue) => {
                            onChange(newValue?.item_code || '');
                            handleProductSelect(newValue);
                          }}
                          options={filteredProducts}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return `${option.item_name} (${option.item_code})`;
                          }}
                          isOptionEqualToValue={(option, value) => 
                            option?.item_code === value?.item_code
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select Item *"
                              error={!!errors.item_code}
                              helperText={errors.item_code?.message}
                              size="small"
                              placeholder="Search items..."
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box>
                                <Typography variant="body2">
                                  {option.item_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Code: {option.item_code} | Group: {option.item_group}
                                </Typography>
                              </Box>
                            </li>
                          )}
                        />
                      )}
                    />
                  )}

                  {watchedRuleType === 'Batch' && (
                    <Controller
                      name="batch_no"
                      control={control}
                      rules={{ required: 'Batch number is required' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Batch Number *"
                          fullWidth
                          size="small"
                          error={!!errors.batch_no}
                          helperText={errors.batch_no?.message || 'Enter the batch number this discount applies to'}
                        />
                      )}
                    />
                  )}

                  {watchedRuleType === 'Item Group' && (
                    <Controller
                      name="item_group"
                      control={control}
                      rules={{ required: 'Item group is required' }}
                      render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.item_group} size="small">
                          <InputLabel>Item Group *</InputLabel>
                          <Select
                            {...field}
                            label="Item Group *"
                          >
                            {(itemGroups || []).map((group) => (
                              <MenuItem key={group.name} value={group.name}>
                                {group.item_group_name || group.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* Discount Type */}
                  <Controller
                    name="discount_type"
                    control={control}
                    rules={{ required: 'Discount type is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.discount_type} size="small">
                        <InputLabel>Discount Type</InputLabel>
                        <Select
                          {...field}
                          label="Discount Type"
                        >
                          <MenuItem value="Percentage">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Percent fontSize="small" /> Percentage (%)
                            </Box>
                          </MenuItem>
                          <MenuItem value="Amount">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachMoney fontSize="small" /> Fixed Amount
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  {/* Discount Value */}
                  <Controller
                    name="discount_value"
                    control={control}
                    rules={{
                      required: 'Discount value is required',
                      min: {
                        value: 0,
                        message: 'Discount value must be positive',
                      },
                      max: watchedDiscountType === 'Percentage' ? {
                        value: 100,
                        message: 'Percentage cannot exceed 100%',
                      } : undefined,
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label={
                          watchedDiscountType === 'Percentage' 
                            ? 'Discount Percentage * (0-100%)' 
                            : 'Discount Amount *'
                        }
                        fullWidth
                        size="small"
                        required
                        error={!!errors.discount_value}
                        helperText={errors.discount_value?.message}
                        inputProps={{
                          min: 0,
                          max: watchedDiscountType === 'Percentage' ? 100 : undefined,
                          step: 0.01,
                        }}
                        InputProps={{
                          startAdornment: watchedDiscountType === 'Percentage' ? (
                            <InputAdornment position="start">
                              <Percent fontSize="small" />
                            </InputAdornment>
                          ) : (
                            <InputAdornment position="start">
                              <AttachMoney fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Priority */}
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Priority"
                        fullWidth
                        size="small"
                        helperText="Lower number = higher priority"
                        inputProps={{ min: 1 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PriorityHigh fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Warehouse */}
                  <Controller
                    name="warehouse"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small">
                        <InputLabel>Warehouse (Optional)</InputLabel>
                        <Select
                          {...field}
                          label="Warehouse (Optional)"
                        >
                          <MenuItem value="">All Warehouses</MenuItem>
                          {(warehouses || []).map((warehouse) => (
                            <MenuItem key={warehouse.name} value={warehouse.name}>
                              {warehouse.warehouse_name || warehouse.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Leave empty to apply to all warehouses
                  </Typography>
                </Box>
              </form>
            </Paper>
          </Grid>

          {/* Right Column - Additional Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CalendarToday fontSize="small" /> Additional Settings
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Validity Period */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Validity Period (Optional)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="valid_from"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="date"
                            label="Valid From"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="valid_upto"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="date"
                            label="Valid To"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Leave empty for unlimited validity
                  </Typography>
                </Box>

                {/* Description */}
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description (Optional)"
                      fullWidth
                      size="small"
                      multiline
                      rows={3}
                      helperText="Add notes or comments about this rule"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Description fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                {/* Active Status */}
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">Rule Status</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {field.value ? 'Active rules will be applied' : 'Inactive rules will be ignored'}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.value === 1 || field.value === true}
                            onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                            color="primary"
                          />
                        }
                        label={field.value ? 'Active' : 'Inactive'}
                      />
                    </Box>
                  )}
                />

                {/* Selected Item Preview (if Item rule type) */}
                {watchedRuleType === 'Item' && selectedProduct && (
                  <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Item
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption">Item Name:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedProduct.item_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Item Code:</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedProduct.item_code}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Item Group:</Typography>
                        <Typography variant="body2">
                          {selectedProduct.item_group}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">UoM:</Typography>
                        <Typography variant="body2">
                          {selectedProduct.stock_uom}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Submit Buttons */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/settings/inventory-discounts')}
                    startIcon={<ArrowBack />}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={20} />
                    ) : isEditMode ? (
                      'Update Rule'
                    ) : (
                      'Create Rule'
                    )}
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

export default DiscountRuleForm;