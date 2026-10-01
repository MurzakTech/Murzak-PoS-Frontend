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
} from '@mui/material';
import { ArrowBack, Verified } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setProductWarranty,
  getProductWarranty,
  getProducts,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const Warranties = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { products, warranties, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      item_code: '',
      warranty_period: '',
      warranty_period_unit: 'Days',
    },
  });

  // Fetch products on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getProducts({ company: userCompany, page_size: 1000 }));
    }
  }, [dispatch, userCompany]);

  const handleWarrantyOpen = async (product) => {
    setSelectedProduct(product);
    // Fetch existing warranty if any
    const warrantyData = await dispatch(
      getProductWarranty({ itemCode: product.item_code, company: userCompany })
    );
    
    if (warrantyData.type === 'product/getProductWarranty/fulfilled' && warrantyData.payload.warranty) {
      const warranty = warrantyData.payload.warranty;
      reset({
        item_code: product.item_code,
        warranty_period: warranty.warranty_period || '',
        warranty_period_unit: warranty.warranty_period_unit || 'Days',
      });
    } else {
      reset({
        item_code: product.item_code,
        warranty_period: '',
        warranty_period_unit: 'Days',
      });
    }
    setWarrantyDialogOpen(true);
  };

  const handleWarrantyClose = () => {
    setWarrantyDialogOpen(false);
    setSelectedProduct(null);
    reset();
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

    const warrantyData = {
      company: userCompany,
      item_code: data.item_code,
      warranty_period: parseInt(data.warranty_period),
      warranty_period_unit: data.warranty_period_unit,
    };

    const result = await dispatch(setProductWarranty(warrantyData));

    if (result.type === 'product/setProductWarranty/fulfilled') {
      handleWarrantyClose();
      // Refresh warranty for the product
      dispatch(getProductWarranty({ itemCode: data.item_code, company: userCompany }));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/products')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Warranties Management
          </Typography>
        </Box>

        {/* Products with Warranties */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Products with Warranties
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No products found.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Warranty Period</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => {
                    // const warranty = warranties[product.item_code];
                    return (
                      <TableRow key={product.item_code}>
                        <TableCell>{product.item_code}</TableCell>
                        <TableCell>{product.item_name}</TableCell>
                        <TableCell>
                          {product?.warranty_period ? (
                            <Chip
                              icon={<Verified />}
                              label={`${product.warranty_period} ${product.warranty_period_unit}`}
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No warranty
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleWarrantyOpen(product)}
                            variant="outlined"
                          >
                            {product?.warranty_period ? 'Update' : 'Set'} Warranty
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Set Warranty Dialog */}
        <Dialog open={warrantyDialogOpen} onClose={handleWarrantyClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>
              {selectedProduct ? `Set Warranty for ${selectedProduct.item_code}` : 'Set Product Warranty'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="warranty_period"
                    control={control}
                    rules={{
                      required: 'Warranty period is required',
                      min: { value: 1, message: 'Warranty period must be at least 1' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Warranty Period"
                        type="number"
                        fullWidth
                        required
                        error={!!errors.warranty_period}
                        helperText={errors.warranty_period?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="warranty_period_unit"
                    control={control}
                    rules={{ required: 'Warranty period unit is required' }}
                    render={({ field }) => (
                      <FormControl fullWidth required>
                        <InputLabel>Unit</InputLabel>
                        <Select {...field} label="Unit" error={!!errors.warranty_period_unit}>
                          <MenuItem value="Days">Days</MenuItem>
                          <MenuItem value="Months">Months</MenuItem>
                          <MenuItem value="Years">Years</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleWarrantyClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Save Warranty'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Warranties;
