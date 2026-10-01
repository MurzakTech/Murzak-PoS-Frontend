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
  Switch,
  FormControlLabel,
  GridLegacy as Grid,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Inventory,
  Settings,
  QrCodeScanner,
  Category,
  LocalOffer,
  AttachMoney,
  Numbers,
  Title,
  Description,
  Business,
  Tag,
  Straighten,
  Public,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createProduct,
  getProducts,
  getItemGroups,
  getBrands,
  getUOMs,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const NewProduct = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { itemGroups, brands, uoms, isLoading, isLoadingReference } = useAppSelector(
    (state) => state.product
  );
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name;

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    defaultValues: {
      item_code: '',
      item_name: '',
      item_group: '',
      stock_uom: 'Nos',
      standard_rate: 0,
      description: '',
      is_stock_item: true,
      is_sales_item: true,
      is_purchase_item: false,
      brand: '',
      barcode: '',
    },
  });

  useEffect(() => {
    if (userCompany) {
      dispatch(getItemGroups({ company: userCompany }));
      dispatch(getBrands({ company: userCompany }));
      dispatch(getUOMs({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(
        showNotification({
          message: 'Please update your company information in profile settings.',
          severity: 'error',
        })
      );
      return;
    }

    const result = await dispatch(
      createProduct({
        ...data,
        company: userCompany,
      })
    );

    if (result.type === 'product/createProduct/fulfilled') {
      dispatch(
        showNotification({
          message: 'Product created successfully',
          severity: 'success',
        })
      );
      navigate('/products');
    }
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            onClick={() => navigate('/products')}
            sx={{ mr: 1 }}
            aria-label="Go back to products"
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" fontWeight={600}>
            New Product
          </Typography>
          {userCompany && (
            <Chip
              icon={<Business fontSize="small" />}
              label={userCompany}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Add essential product details. All fields are required unless marked optional.
        </Typography>
      </Box>

      {!userCompany && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Company information is required. Please update your profile.
        </Alert>
      )}

      {/* Main Form */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={1.5}>
          {/* Essential Information */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Inventory sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Essential Information
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="item_code"
                    control={control}
                    rules={{ required: 'Required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Item Code"
                        fullWidth
                        required
                        size="small"
                        error={!!errors.item_code}
                        helperText={errors.item_code?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Numbers sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        placeholder="e.g., PROD-001"
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="item_name"
                    control={control}
                    rules={{ required: 'Required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Product Name"
                        fullWidth
                        required
                        size="small"
                        error={!!errors.item_name}
                        helperText={errors.item_name?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Title sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        placeholder="Enter product name"
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Item Group</InputLabel>
                    <Controller
                      name="item_group"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} label="Item Group" disabled={isLoadingReference}>
                          {itemGroups.map((group) => (
                            <MenuItem key={group.name} value={group.item_group_name}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Category fontSize="small" sx={{ mr: 1 }} />
                                {group.item_group_name}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Unit</InputLabel>
                    <Controller
                      name="stock_uom"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} label="Unit" disabled={isLoadingReference}>
                          {uoms.map((uom) => (
                            <MenuItem key={uom.name} value={uom.name}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Straighten fontSize="small" sx={{ mr: 1 }} />
                                {uom.uom_name}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Brand</InputLabel>
                    <Controller
                      name="brand"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} label="Brand" disabled={isLoadingReference}>
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {brands.map((brand) => (
                            <MenuItem key={brand.name} value={brand.brand}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Tag fontSize="small" sx={{ mr: 1 }} />
                                {brand.brand}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Pricing & Settings */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AttachMoney sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Pricing & Settings
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <Controller
                    name="standard_rate"
                    control={control}
                    rules={{
                      required: 'Required',
                      min: { value: 0, message: 'Must be positive' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Price"
                        type="number"
                        fullWidth
                        required
                        size="small"
                        error={!!errors.standard_rate}
                        helperText={errors.standard_rate?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="barcode"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Barcode"
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <QrCodeScanner sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        placeholder="Optional"
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Item Type
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Controller
                          name="is_stock_item"
                          control={control}
                          render={({ field }) => (
                            <Tooltip title="Track inventory">
                              <FormControlLabel
                                control={
                                  <Switch
                                    {...field}
                                    checked={field.value}
                                    size="small"
                                    color="primary"
                                  />
                                }
                                label="Stock"
                                componentsProps={{ typography: { variant: 'body2' } }}
                              />
                            </Tooltip>
                          )}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Controller
                          name="is_sales_item"
                          control={control}
                          render={({ field }) => (
                            <Tooltip title="Available for sales">
                              <FormControlLabel
                                control={
                                  <Switch
                                    {...field}
                                    checked={field.value}
                                    size="small"
                                    color="success"
                                  />
                                }
                                label="Sales"
                                componentsProps={{ typography: { variant: 'body2' } }}
                              />
                            </Tooltip>
                          )}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Controller
                          name="is_purchase_item"
                          control={control}
                          render={({ field }) => (
                            <Tooltip title="Available for purchase">
                              <FormControlLabel
                                control={
                                  <Switch
                                    {...field}
                                    checked={field.value}
                                    size="small"
                                    color="warning"
                                  />
                                }
                                label="Purchase"
                                componentsProps={{ typography: { variant: 'body2' } }}
                              />
                            </Tooltip>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Description & Notes */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Description sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Description
                </Typography>
              </Box>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Product Description"
                    fullWidth
                    multiline
                    rows={5}
                    size="small"
                    placeholder="Describe the product, features, specifications..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <Description sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <Public fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="caption">
                  Company: <strong>{userCompany || 'Not set'}</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Action Bar */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            mt: 4,
            p: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isDirty ? 'warning.main' : 'success.main',
                animation: isDirty ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {isDirty ? 'Unsaved changes' : 'All changes saved'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="text"
              onClick={handleReset}
              disabled={!isDirty || isLoading}
              sx={{ 
                minWidth: 100,
                textTransform: 'none',
                fontSize: '0.8125rem',
              }}
            >
              Reset
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/products')}
              disabled={isLoading}
              sx={{ 
                minWidth: 100,
                textTransform: 'none',
                fontSize: '0.8125rem',
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || !userCompany}
              startIcon={
                isLoading ? <CircularProgress size={18} color="inherit" /> : <Save />
              }
              sx={{ 
                minWidth: 140, 
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isLoading ? 'Creating...' : 'Create Product'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default NewProduct;
