import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  InputAdornment,
  Stack,
} from '@mui/material';
import { 
  Add, 
  Edit, 
  MoreVert, 
  Visibility, 
  Group, 
  Business,
  Category as CategoryIcon,
  AccountBalance as AccountBalanceIcon,
  Language as LanguageIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  getSupplierGroups,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} from '../../store/supplierSlice';
import { showNotification } from '../../store/notificationSlice';
import { Outlet, useLocation } from 'react-router-dom';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const Suppliers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { suppliers, supplierGroups, isLoading, isLoadingGroups, pagination, filters } = useAppSelector((state) => state.supplier);
  const { user } = useAppSelector((state) => state.auth);

  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/suppliers';

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      supplier_name: '',
      supplier_type: 'Company',
      supplier_group: '',
      tax_id: '',
      country: 'Kenya',
      default_currency: 'KES',
      is_internal_supplier: false,
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch suppliers and supplier groups on mount
  useEffect(() => {
    if (userCompany && !isChildRoute) {
      const params = {
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(getSuppliers(params));
      dispatch(getSupplierGroups());
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size, isChildRoute]);

  // Handle edit from URL query parameter
  useEffect(() => {
    if (!isChildRoute && suppliers.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      if (editId) {
        const supplierToEdit = suppliers.find(s => s.name === editId);
        if (supplierToEdit) {
          handleEditOpen(supplierToEdit);
          // Clean up URL
          window.history.replaceState({}, '', '/suppliers');
        }
      }
    }
  }, [suppliers, isChildRoute]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setFilters({ search_term: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value || undefined })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPage(newPage + 1));
    const params = {
      ...filters,
      company: userCompany,
      limit: pagination.page_size,
      offset: newPage * pagination.page_size,
    };
    dispatch(getSuppliers(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      ...filters,
      company: userCompany,
      limit: newPageSize,
      offset: 0,
    };
    dispatch(getSuppliers(params));
  };

  const handleMenuOpen = (event, supplier) => {
    setAnchorEl(event.currentTarget);
    setSelectedSupplier(supplier);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSupplier(null);
  };

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  const handleEditOpen = (supplier) => {
    resetEdit({
      supplier_name: supplier.supplier_name || supplier.name,
      supplier_type: supplier.supplier_type || 'Company',
      supplier_group: supplier.supplier_group || '',
      tax_id: supplier.tax_id || '',
      country: supplier.country || 'Kenya',
      default_currency: supplier.default_currency || 'KES',
      is_internal_supplier: supplier.is_internal_supplier || false,
      disabled: supplier.disabled === 1 || supplier.disabled === true,
    });
    setSelectedSupplier(supplier);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedSupplier(null);
    resetEdit();
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

    const supplierData = {
      company: userCompany,
      ...data,
    };

    const result = await dispatch(createSupplier(supplierData));

    if (result.type === 'supplier/createSupplier/fulfilled') {
      handleCreateClose();
      dispatch(getSuppliers({
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      }));
    }
  };

  const onEditSubmit = async (data) => {
    if (!selectedSupplier) {
      return;
    }

    const supplierData = {
      name: selectedSupplier.name,
      supplier_name: data.supplier_name,
      supplier_type: data.supplier_type,
      supplier_group: data.supplier_group || undefined,
      tax_id: data.tax_id || undefined,
      country: data.country || undefined,
      default_currency: data.default_currency || undefined,
      disabled: data.disabled || false,
    };

    const result = await dispatch(updateSupplier(supplierData));

    if (result.type === 'supplier/updateSupplier/fulfilled') {
      handleEditClose();
      // Refresh the list
      const params = {
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(getSuppliers(params));
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'supplier_name',
      header: 'Supplier Name',
      width: '20%',
      render: (value, row) => (
        <Typography variant="body2" fontWeight={500}>
          {value || row.name || '-'}
        </Typography>
      ),
    },
    {
      field: 'supplier_type',
      header: 'Type',
      width: '12%',
      render: (value) => (
        <Chip
          label={value || 'Company'}
          size="small"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'supplier_group',
      header: 'Supplier Group',
      width: '15%',
      render: (value) => value || '-',
    },
    {
      field: 'tax_id',
      header: 'Tax ID',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'country',
      header: 'Country',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'default_currency',
      header: 'Currency',
      width: '10%',
      render: (value) => value || '-',
    },
    {
      field: 'disabled',
      header: 'Status',
      width: '10%',
      render: (value, row) => (
        <StatusChip
          status={row.disabled === 1 || row.disabled === true ? 'disabled' : 'enabled'}
          label={row.disabled === 1 || row.disabled === true ? 'Disabled' : 'Enabled'}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '5%',
      align: 'right',
      render: (value, row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ], []);

  // Calculate stats
  const totalSuppliers = pagination?.total || suppliers.length;
  const enabledSuppliers = suppliers.filter(s => !(s.disabled === 1 || s.disabled === true)).length;
  const disabledSuppliers = suppliers.filter(s => s.disabled === 1 || s.disabled === true).length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'supplier_group',
      label: 'Supplier Group',
      value: filters.supplier_group || '',
      options: [
        { value: '', label: 'All Groups' },
        ...supplierGroups.filter(g => !g.is_group).map((group) => ({
          value: group.name,
          label: group.supplier_group_name || group.name,
        })),
      ],
      width: 180,
    },
  ], [filters, supplierGroups]);

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Box>
      <PageHeader
        title="Suppliers"
        subtitle="Manage supplier accounts and relationships"
        icon={Business}
        stats={[
          { value: totalSuppliers, label: 'Total', color: 'primary.main' },
          { value: enabledSuppliers, label: 'Active', color: 'success.main' },
          { value: disabledSuppliers, label: 'Disabled', color: 'text.secondary' },
        ]}
        actions={[
          {
            label: 'Supplier Groups',
            icon: <Group />,
            onClick: () => navigate('/suppliers/groups'),
            variant: 'outlined',
          },
          {
            label: 'Add Supplier',
            icon: <Add />,
            onClick: handleCreateOpen,
            variant: 'contained',
          },
        ]}
        loading={isLoading && suppliers.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search suppliers..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={suppliers}
        loading={isLoading}
        emptyMessage="No suppliers found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || 0,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => navigate(`/suppliers/${row.name}`)}
      />

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => {
            navigate(`/suppliers/${selectedSupplier?.name}`);
            handleMenuClose();
          }}>
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            View Details
          </MenuItem>
          <MenuItem onClick={() => handleEditOpen(selectedSupplier)}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        </Menu>

        {/* Create Supplier Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="supplier_name"
                  control={createControl}
                  rules={{ required: 'Supplier name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Supplier Name"
                      fullWidth
                      size="small"
                      required
                      error={!!createErrors.supplier_name}
                      helperText={createErrors.supplier_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                      name="supplier_type"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Type"
                          fullWidth
                          size="small"
                          select
                          SelectProps={{ native: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CategoryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        >
                          <option value="Company">Company</option>
                          <option value="Individual">Individual</option>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="supplier_group"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Supplier Group"
                          fullWidth
                          size="small"
                          select
                          SelectProps={{ native: true }}
                          disabled={isLoadingGroups}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Group sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        >
                          <option value="">Select Group</option>
                          {supplierGroups.map((group) => (
                            <option key={group.name} value={group.name}>
                              {group.supplier_group_name || group.name}
                            </option>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tax_id"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Tax ID/PIN"
                          fullWidth
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccountBalanceIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                      name="country"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Country"
                          fullWidth
                          size="small"
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
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="default_currency"
                      control={createControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Default Currency"
                          fullWidth
                          size="small"
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="is_internal_supplier"
                      control={createControl}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                              size="small"
                            />
                          }
                          label="Internal Supplier"
                          sx={{ mt: 1 }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
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

        {/* Edit Supplier Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Controller
                  name="supplier_name"
                  control={editControl}
                  rules={{ required: 'Supplier name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Supplier Name"
                      fullWidth
                      size="small"
                      required
                      error={!!editErrors.supplier_name}
                      helperText={editErrors.supplier_name?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                      name="supplier_type"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Type"
                          fullWidth
                          size="small"
                          select
                          SelectProps={{ native: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <CategoryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        >
                          <option value="Company">Company</option>
                          <option value="Individual">Individual</option>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="supplier_group"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Supplier Group"
                          fullWidth
                          size="small"
                          select
                          SelectProps={{ native: true }}
                          disabled={isLoadingGroups}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Group sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        >
                          <option value="">Select Group</option>
                          {supplierGroups.map((group) => (
                            <option key={group.name} value={group.name}>
                              {group.supplier_group_name || group.name}
                            </option>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tax_id"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Tax ID/PIN"
                          fullWidth
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccountBalanceIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                      name="country"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Country"
                          fullWidth
                          size="small"
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
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="default_currency"
                      control={editControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Default Currency"
                          fullWidth
                          size="small"
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="is_internal_supplier"
                      control={editControl}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                              size="small"
                            />
                          }
                          label="Internal Supplier"
                          sx={{ mt: 1 }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Controller
                  name="disabled"
                  control={editControl}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!field.value}
                          onChange={(e) => field.onChange(!e.target.checked)}
                          size="small"
                        />
                      }
                      label="Enabled"
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

      </Box>
  );
};

export default Suppliers;

