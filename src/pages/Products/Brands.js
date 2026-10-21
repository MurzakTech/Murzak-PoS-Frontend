import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
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
  IconButton,
  InputAdornment,
  Stack,
} from '@mui/material';
import { ArrowBack, Add, Edit, Delete, Label as LabelIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

const Brands = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { brands, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      brand_name: '',
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch brands on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getBrands({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  const handleEditOpen = (brand) => {
    // Use brand.name or brand.brand_name depending on API response structure
    const currentBrandName = brand.name || brand.brand_name || '';
    resetEdit({
      brand_name: currentBrandName,
    });
    setSelectedBrand(brand);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedBrand(null);
    resetEdit();
  };

  const handleDeleteOpen = (brand) => {
    setSelectedBrand(brand);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedBrand(null);
  };

  const onCreateSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const brandData = {
      company: userCompany,
      brand_name: data.brand_name,
    };

    const result = await dispatch(createBrand(brandData));

    if (result.type === 'product/createBrand/fulfilled') {
      handleCreateClose();
      dispatch(getBrands({ company: userCompany }));
    }
  };

  const onEditSubmit = async (data) => {
    if (!userCompany || !selectedBrand) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Get the original brand name for identification
    const originalBrandName = selectedBrand.name || selectedBrand.brand_name;

    const brandData = {
      // company: userCompany,
      brand_name: originalBrandName, // Original name to identify which brand to update
      new_brand_name: data.brand_name, // New name
    };

    const result = await dispatch(updateBrand(brandData));

    if (result.type === 'product/updateBrand/fulfilled') {
      handleEditClose();
      dispatch(getBrands({ company: userCompany }));
    }
  };

  const onDeleteConfirm = async () => {
    if (!userCompany || !selectedBrand) return;

    // Use name property (API expects 'name' parameter)
    const brandName = selectedBrand.name || selectedBrand.brand_name;

    const result = await dispatch(deleteBrand({
      brand_name: brandName,
      company: userCompany,
    }));

    if (result.type === 'product/deleteBrand/fulfilled') {
      handleDeleteClose();
      dispatch(getBrands({ company: userCompany }));
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
              Brands Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
          >
            Create Brand
          </Button>
        </Box>

        {/* Brands Table */}
        <Paper elevation={2}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : brands.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No brands found. Create one to get started.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Brand Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.name}>
                      <TableCell>{brand.name}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditOpen(brand)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteOpen(brand)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Create Brand</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="brand_name"
                  control={createControl}
                  rules={{ required: 'Brand name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Brand Name"
                      fullWidth
                      size="small"
                      required
                      error={!!createErrors.brand_name}
                      helperText={createErrors.brand_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LabelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>
              Edit Brand
              {selectedBrand && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                  Current: {selectedBrand.name || selectedBrand.brand_name || ''}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="brand_name"
                  control={editControl}
                  rules={{ required: 'Brand name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Brand Name"
                      fullWidth
                      size="small"
                      required
                      error={!!editErrors.brand_name}
                      helperText={editErrors.brand_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LabelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isLoading ? <CircularProgress size={18} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={handleDeleteClose}
          onConfirm={onDeleteConfirm}
          title="Delete Brand"
          message={
            <>
              Are you sure you want to delete <strong>"{selectedBrand?.name || selectedBrand?.brand_name}"</strong>?
              <br />
              <br />
              This action cannot be undone. Make sure this brand is not being used by any products.
            </>
          }
          variant="error"
          confirmText="Delete"
          cancelText="Cancel"
          loading={isLoading}
        />
      </Box>
    </Container>
  );
};

export default Brands;
