import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import { ArrowBack, Add, Edit, Visibility, Delete } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createProductVariant,
  getProductVariants,
  getProducts,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const ProductVariations = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { products, variants, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      template_item_code: '',
      variant_item_code: '',
      variant_item_name: '',
      attributes: {},
    },
  });

  const templateItemCode = watch('template_item_code');

  // Fetch products on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getProducts({ company: userCompany, page_size: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Fetch variants when template is selected
  useEffect(() => {
    if (templateItemCode && userCompany) {
      dispatch(getProductVariants({ itemCode: templateItemCode, company: userCompany }));
    }
  }, [templateItemCode, userCompany, dispatch]);

  const handleCreateOpen = () => {
    reset();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    reset();
    setSelectedTemplate('');
  };

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const variantData = {
      company: userCompany,
      template_item_code: data.template_item_code,
      variant_item_code: data.variant_item_code,
      variant_item_name: data.variant_item_name,
      attributes: data.attributes,
    };

    const result = await dispatch(createProductVariant(variantData));

    if (result.type === 'product/createProductVariant/fulfilled') {
      handleCreateClose();
      // Refresh variants list
      if (templateItemCode) {
        dispatch(getProductVariants({ itemCode: templateItemCode, company: userCompany }));
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/products')}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              Product Variations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
          >
            Create Variant
          </Button>
        </Box>

        {/* Template Selector */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Template Product
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Template Product</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                reset({ template_item_code: e.target.value });
              }}
              label="Template Product"
            >
              {products
                .filter((p) => p.has_variants || p.is_stock_item === 1)
                .map((product) => (
                  <MenuItem key={product.item_code} value={product.item_code}>
                    {product.item_code} - {product.item_name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Variants List */}
        {selectedTemplate && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Variants of {selectedTemplate}
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : variants.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No variants found for this product. Create one to get started.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Variant Code</TableCell>
                      <TableCell>Variant Name</TableCell>
                      <TableCell>Attributes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.item_code}>
                        <TableCell>{variant.item_code}</TableCell>
                        <TableCell>{variant.item_name}</TableCell>
                        <TableCell>
                          {variant.attributes && Object.keys(variant.attributes).length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {Object.entries(variant.attributes).map(([key, value]) => (
                                <Chip
                                  key={key}
                                  label={`${key}: ${value}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No attributes
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary">
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

        {!selectedTemplate && (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Select a template product to view and manage its variants
            </Typography>
          </Paper>
        )}

        {/* Create Variant Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="md" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>Create Product Variant</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="template_item_code"
                    control={control}
                    rules={{ required: 'Template product is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Template Product</InputLabel>
                        <Select {...field} label="Template Product" error={!!errors.template_item_code}>
                          {products
                            .filter((p) => p.is_stock_item === 1)
                            .map((product) => (
                              <MenuItem key={product.item_code} value={product.item_code}>
                                {product.item_code} - {product.item_name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="variant_item_code"
                    control={control}
                    rules={{ required: 'Variant item code is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Variant Item Code"
                        fullWidth
                        required
                        error={!!errors.variant_item_code}
                        helperText={errors.variant_item_code?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="variant_item_name"
                    control={control}
                    rules={{ required: 'Variant item name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Variant Item Name"
                        fullWidth
                        required
                        error={!!errors.variant_item_name}
                        helperText={errors.variant_item_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Attributes (e.g., Size, Color) - Format: key:value pairs
                  </Typography>
                  <Controller
                    name="attributes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Attributes (JSON format)"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder='{"Size": "Large", "Color": "Red"}'
                        helperText="Enter attributes as JSON object"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Create Variant'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ProductVariations;
