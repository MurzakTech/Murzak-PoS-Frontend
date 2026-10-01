import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  InputAdornment,
  Stack,
} from '@mui/material';
import { ArrowBack, Add, Edit, Delete, AttachMoney as AttachMoneyIcon, Language as LanguageIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createPriceList,
  getPriceLists,
  updatePriceList,
  deletePriceList,
  setPriceListFilters,
  resetPriceListFilters,
  setPriceListPage,
  setPriceListPageSize,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import { AttachMoney } from '@mui/icons-material';

const PriceGroups = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { 
    priceLists, 
    isLoading,
    priceListPagination,
    priceListFilters,
  } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      price_list_name: '',
      currency: 'KES',
      enabled: true,
      buying: false,
      selling: true,
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to refetch price lists with current filters and pagination
  const refetchPriceLists = useCallback(() => {
    if (!userCompany) return;
    
    const filters = {
      selling: priceListFilters.selling !== undefined && priceListFilters.selling !== null ? Boolean(priceListFilters.selling) : null,
      buying: priceListFilters.buying !== undefined && priceListFilters.buying !== null ? Boolean(priceListFilters.buying) : null,
      enabled: priceListFilters.enabled || 'all',
    };

    const params = {
      company: userCompany,
      filters,
      page: priceListPagination.page,
      page_size: priceListPagination.page_size,
      pagination: {
        page: priceListPagination.page,
        page_size: priceListPagination.page_size,
      },
      ...(searchTerm && { search_term: searchTerm }),
    };
    
    dispatch(getPriceLists(params));
  }, [dispatch, userCompany, priceListFilters, priceListPagination.page, priceListPagination.page_size, searchTerm]);

  // Fetch price lists when filters, pagination, or company changes
  useEffect(() => {
    refetchPriceLists();
  }, [refetchPriceLists]);

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    if (!isCreating) {
      setCreateDialogOpen(false);
      resetCreate();
      setIsCreating(false);
    }
  };

  const handleEditOpen = (priceList) => {
    resetEdit({
      name: priceList.name,
      price_list_name: priceList.price_list_name || priceList.name,
      currency: priceList.currency || 'KES',
      enabled: priceList.enabled !== 0,
      buying: priceList.buying === 1,
      selling: priceList.selling === 1,
    });
    setSelectedPriceList(priceList);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    if (!isUpdating) {
      setEditDialogOpen(false);
      setSelectedPriceList(null);
      resetEdit();
      setIsUpdating(false);
    }
  };

  const handleDeleteOpen = (priceList) => {
    setSelectedPriceList(priceList);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setSelectedPriceList(null);
      setIsDeleting(false);
    }
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

    setIsCreating(true);

    try {
      const priceListData = {
        company: userCompany,
        price_list_name: data.price_list_name,
        currency: data.currency,
        enabled: data.enabled,
        buying: data.buying,
        selling: data.selling,
      };

      const result = await dispatch(createPriceList(priceListData));

      if (result.type === 'product/createPriceList/fulfilled') {
        handleCreateClose();
        // Explicitly refetch price lists to update the table
        refetchPriceLists();
      }
    } catch (error) {
      // Error is handled by Redux thunk
    } finally {
      setIsCreating(false);
    }
  };

  const onEditSubmit = async (data) => {
    if (!userCompany || !selectedPriceList) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Get the original name to identify which price list to update
    const originalName = data.name || selectedPriceList.name || selectedPriceList.price_list_name;
    
    if (!originalName) {
      dispatch(showNotification({
        message: 'Original price list name is required.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    setIsUpdating(true);

    try {
      // API expects payload structure: 
      // { name (required), new_price_list_name?, currency?, selling?, buying?, enabled? }
      const priceListData = {
        name: originalName,
        ...(data.price_list_name && data.price_list_name !== originalName && { 
          new_price_list_name: data.price_list_name 
        }),
        ...(data.currency && { currency: data.currency }),
        ...(data.selling !== undefined && { selling: Boolean(data.selling) }),
        ...(data.buying !== undefined && { buying: Boolean(data.buying) }),
        ...(data.enabled !== undefined && { enabled: Boolean(data.enabled) }),
      };

      const result = await dispatch(updatePriceList(priceListData));

      if (result.type === 'product/updatePriceList/fulfilled') {
        handleEditClose();
        // Explicitly refetch price lists to update the table
        refetchPriceLists();
      }
    } catch (error) {
      // Error is handled by Redux thunk
    } finally {
      setIsUpdating(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!userCompany || !selectedPriceList) return;

    setIsDeleting(true);

    try {
      const result = await dispatch(deletePriceList({
        name: selectedPriceList.name,
        company: userCompany,
      }));

      if (result.type === 'product/deletePriceList/fulfilled') {
        handleDeleteClose();
        // Explicitly refetch price lists to update the table
        refetchPriceLists();
      }
    } catch (error) {
      // Error is handled by Redux thunk
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter handlers
  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setPriceListPage(1)); // Reset to page 1 on search
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetPriceListFilters());
  };

  const handlePageChange = (event, newPage) => {
    // DataTable already converts to 1-indexed, so newPage is already 1-indexed
    dispatch(setPriceListPage(newPage));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPriceListPageSize(newPageSize));
  };

  // Prepare filter bar filters
  const filterBarFilters = [
    {
      type: 'select',
      key: 'selling',
      label: 'Selling',
      value: priceListFilters.selling === true ? 'yes' : priceListFilters.selling === false ? 'no' : 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      width: 120,
    },
    {
      type: 'select',
      key: 'buying',
      label: 'Buying',
      value: priceListFilters.buying === true ? 'yes' : priceListFilters.buying === false ? 'no' : 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      width: 120,
    },
    {
      type: 'select',
      key: 'enabled',
      label: 'Status',
      value: priceListFilters.enabled || 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'enabled', label: 'Enabled' },
        { value: 'disabled', label: 'Disabled' },
      ],
      width: 120,
    },
  ];

  // Handle filter bar change
  const handleFilterBarChange = (key, value) => {
    // Handle filter conversions to match API expected format
    if (key === 'selling') {
      // selling: null for all, true for yes, false for no
      const sellingValue = value === 'all' ? null : value === 'yes' ? true : false;
      dispatch(setPriceListFilters({ selling: sellingValue }));
    } else if (key === 'buying') {
      // buying: null for all, true for yes, false for no
      const buyingValue = value === 'all' ? null : value === 'yes' ? true : false;
      dispatch(setPriceListFilters({ buying: buyingValue }));
    } else if (key === 'enabled') {
      // enabled: 'all', 'enabled', or 'disabled'
      dispatch(setPriceListFilters({ enabled: value || 'all' }));
    } else {
      dispatch(setPriceListFilters({ [key]: value }));
    }
  };

  // Prepare table columns
  const columns = [
    {
      field: 'price_list_name',
      header: 'Price List Name',
      minWidth: 200,
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value || '-'}
        </Typography>
      ),
    },
    {
      field: 'currency',
      header: 'Currency',
      minWidth: 100,
      render: (value) => value || '-',
    },
    {
      field: 'type',
      header: 'Type',
      minWidth: 150,
      render: (value, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {row.selling === 1 && (
            <Chip label="Selling" size="small" color="primary" />
          )}
          {row.buying === 1 && (
            <Chip label="Buying" size="small" color="secondary" />
          )}
        </Box>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      minWidth: 100,
      render: (value, row) => (
        <Chip
          label={row.enabled === 0 ? 'Disabled' : 'Enabled'}
          color={row.enabled === 0 ? 'default' : 'success'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      align: 'right',
      minWidth: 100,
      render: (value, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleEditOpen(row)}
            color="primary"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteOpen(row)}
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Prepare table rows
  const rows = (priceLists || []).map((priceList) => ({
    id: priceList.name,
    price_list_name: priceList.price_list_name || priceList.name,
    currency: priceList.currency || 'KES',
    selling: priceList.selling,
    buying: priceList.buying,
    enabled: priceList.enabled,
    name: priceList.name, // Store original name for actions
    ...priceList, // Spread all original properties
  }));

  const totalPriceLists = priceListPagination.total || priceLists.length;
  const enabledPriceLists = priceLists.filter(p => p.enabled !== 0).length;
  const disabledPriceLists = priceLists.filter(p => p.enabled === 0).length;

  return (
    <Box>
      <PageHeader
        title="Price Lists"
        subtitle="Manage selling and buying price lists"
        icon={AttachMoney}
        stats={[
          { value: totalPriceLists, label: 'Total', color: 'primary.main' },
          { value: enabledPriceLists, label: 'Enabled', color: 'success.main' },
          { value: disabledPriceLists, label: 'Disabled', color: 'text.secondary' },
        ]}
        actions={[
          {
            label: 'Create Price List',
            icon: <Add />,
            onClick: handleCreateOpen,
            variant: 'contained',
          },
        ]}
        backAction={{
          label: 'Back',
          onClick: () => navigate('/products'),
        }}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search price lists..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterBarChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        pagination={{
          page: priceListPagination.page,
          pageSize: priceListPagination.page_size,
          total: priceListPagination.total,
          totalPages: priceListPagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        emptyMessage="No price lists found. Create one to get started."
      />

      {/* Create Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={isCreating ? undefined : handleCreateClose} 
        maxWidth="sm" 
        fullWidth
      >
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Create Price List</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="price_list_name"
                  control={createControl}
                  rules={{ required: 'Price list name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price List Name"
                      fullWidth
                      size="small"
                      required
                      disabled={isCreating}
                      error={!!createErrors.price_list_name}
                      helperText={createErrors.price_list_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="currency"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Currency"
                          fullWidth
                          size="small"
                          disabled={isCreating}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LanguageIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="enabled"
                      control={createControl}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value} disabled={isCreating} size="small" />}
                          label="Enabled"
                          sx={{ mt: 1 }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                    Price List Type
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Controller
                        name="buying"
                        control={createControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} disabled={isCreating} size="small" />}
                            label="Buying"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="selling"
                        control={createControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} disabled={isCreating} size="small" />}
                            label="Selling"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreating}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isCreating ? <CircularProgress size={18} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={isUpdating ? undefined : handleEditClose} 
        maxWidth="sm" 
        fullWidth
      >
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>Edit Price List</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="price_list_name"
                  control={editControl}
                  rules={{ required: 'Price list name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price List Name"
                      fullWidth
                      size="small"
                      required
                      disabled={isUpdating}
                      error={!!editErrors.price_list_name}
                      helperText={editErrors.price_list_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="currency"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Currency"
                          fullWidth
                          size="small"
                          disabled={isUpdating}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LanguageIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="enabled"
                      control={editControl}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value} disabled={isUpdating} size="small" />}
                          label="Enabled"
                          sx={{ mt: 1 }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                    Price List Type
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Controller
                        name="buying"
                        control={editControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} disabled={isUpdating} size="small" />}
                            label="Buying"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="selling"
                        control={editControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} disabled={isUpdating} size="small" />}
                            label="Selling"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isUpdating}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {isUpdating ? <CircularProgress size={18} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={isDeleting ? undefined : handleDeleteClose}
      >
          <DialogTitle>Delete Price List</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedPriceList?.price_list_name || selectedPriceList?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={onDeleteConfirm}
              color="error"
              variant="contained"
              disabled={isDeleting}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isDeleting ? <CircularProgress size={18} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default PriceGroups;
