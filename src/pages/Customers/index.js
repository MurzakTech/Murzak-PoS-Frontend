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
  Divider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert,
  Paper,
  InputAdornment,
  Stack,
  Autocomplete,
  Card,
  CardContent,
} from '@mui/material';
import { 
  Add, 
  Edit, 
  MoreVert, 
  Visibility, 
  Star, 
  History, 
  CardGiftcard, 
  People,
  Person as PersonIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  AccountBalance as AccountBalanceIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney as AttachMoneyIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createCustomer,
  listCustomers,
  updateCustomer,
  getCustomer,
  getCustomerGroups,
  getTerritories,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} from '../../store/customerSlice';
import { getPriceLists } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import { Outlet, useLocation } from 'react-router-dom';
import LoyaltyBalance from '../../components/Customers/LoyaltyBalance';
import LoyaltyHistory from '../../components/Customers/LoyaltyHistory';
import RedeemPoints from '../../components/Customers/RedeemPoints';
import AssignLoyaltyProgram from '../../components/Customers/AssignLoyaltyProgram';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getUtilizationColor = (percent) => {
  if (percent === null || percent === undefined) return 'success';
  if (percent > 100) return 'error';
  if (percent > 80) return 'warning';
  if (percent > 50) return 'info';
  return 'success';
};

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const {
    customers,
    selectedCustomer,
    pagination,
    filters,
    isLoading,
    isLoadingDetails,
    isCreating,
    isUpdating,
    customerGroups,
    territories,
  } = useAppSelector((state) => state.customer);
  const { priceLists } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);
  const { balance } = useAppSelector((state) => state.loyalty);

  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/customers';

  // Get company from user profile
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCustomerItem, setSelectedCustomerItem] = useState(null);
  // Loyalty dialog states
  const [redeemPointsDialogOpen, setRedeemPointsDialogOpen] = useState(false);
  const [assignProgramDialogOpen, setAssignProgramDialogOpen] = useState(false);
  const [viewHistoryDialogOpen, setViewHistoryDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      customer_name: '',
      customer_type: 'Individual',
      customer_group: '',
      territory: '',
      tax_id: '',
      mobile_no: '',
      email_id: '',
      default_currency: 'KES',
      default_price_list: '',
      disabled: false,
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch customers on mount and when filters/pagination change
  useEffect(() => {
    if (userCompany && !isChildRoute) {
      const params = {
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(listCustomers(params));
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size, isChildRoute]);

  // Handle edit from URL query parameter
  useEffect(() => {
    if (!isChildRoute && customers.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      if (editId) {
        const customerToEdit = customers.find((c) => c.name === editId);
        if (customerToEdit) {
          handleEditOpen(customerToEdit);
          // Clean up URL
          window.history.replaceState({}, '', '/customers');
        }
      }
    }
  }, [customers, isChildRoute]);

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
    dispatch(listCustomers(params));
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
    dispatch(listCustomers(params));
  };

  const handleMenuOpen = (event, customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomerItem(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedCustomerItem here - it's needed for dialogs
    // It will be cleared when dialogs close or when a new customer is selected
  };

  const handleCreateOpen = () => {
    // Fetch price lists if not already loaded
    if (priceLists.length === 0 && userCompany) {
      dispatch(getPriceLists({ 
        company: userCompany,
        filters: {},
        page: 1,
        page_size: 1000 
      }));
    }
    if (customerGroups.length === 0) dispatch(getCustomerGroups());
    if (territories.length === 0) dispatch(getTerritories());
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  const handleEditOpen = (customer) => {
    // Fetch price lists if not already loaded
    if (priceLists.length === 0 && userCompany) {
      dispatch(getPriceLists({ 
        company: userCompany,
        filters: {},
        page: 1,
        page_size: 1000 
      }));
    }
    if (customerGroups.length === 0) dispatch(getCustomerGroups());
    if (territories.length === 0) dispatch(getTerritories());
    resetEdit({
      customer_name: customer.customer_name || customer.name,
      customer_type: customer.customer_type || 'Individual',
      customer_group: customer.customer_group || '',
      territory: customer.territory || '',
      tax_id: customer.tax_id || '',
      mobile_no: customer.mobile_no || '',
      email_id: customer.email_id || '',
      default_currency: customer.default_currency || 'KES',
      default_price_list: customer.default_price_list || '',
      disabled: customer.disabled === 1 || customer.disabled === true,
    });
    setSelectedCustomerItem(customer);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedCustomerItem(null);
    resetEdit();
  };

  const handleViewOpen = async (customer) => {
    setSelectedCustomerItem(customer);
    setViewDialogOpen(true);
    handleMenuClose();
    // Fetch full customer details
    await dispatch(getCustomer({ name: customer.name }));
  };

  const handleViewClose = () => {
    setViewDialogOpen(false);
    // Only clear selectedCustomerItem if no other dialogs are open
    if (!redeemPointsDialogOpen && !assignProgramDialogOpen && !viewHistoryDialogOpen && !editDialogOpen) {
      setSelectedCustomerItem(null);
    }
  };

  const onCreateSubmit = async (data) => {
    if (!userCompany) {
      dispatch(
        showNotification({
          message: 'Company information not found. Please complete your profile setup.',
          severity: 'error',
          title: 'Company Required',
        })
      );
      return;
    }

    const customerData = {
      customer_name: data.customer_name.trim(),
      customer_type: data.customer_type,
      ...(data.customer_group && { customer_group: data.customer_group }),
      ...(data.territory && { territory: data.territory }),
      ...(data.tax_id && { tax_id: data.tax_id }),
      ...(data.mobile_no && { mobile_no: data.mobile_no }),
      ...(data.email_id && { email_id: data.email_id }),
      ...(data.default_currency && { default_currency: data.default_currency }),
      ...(data.default_price_list && typeof data.default_price_list === 'string' && data.default_price_list.trim() && { default_price_list: data.default_price_list.trim() }),
      disabled: data.disabled || false,
      company: userCompany,
    };

    const result = await dispatch(createCustomer(customerData));

    if (result.type === 'customer/createCustomer/fulfilled') {
      handleCreateClose();
      const params = {
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(listCustomers(params));
    }
  };

  const onEditSubmit = async (data) => {
    if (!selectedCustomerItem) {
      return;
    }

    const customerData = {
      name: selectedCustomerItem.name,
      ...(data.customer_name && { customer_name: data.customer_name }),
      ...(data.customer_type && { customer_type: data.customer_type }),
      ...(data.customer_group && { customer_group: data.customer_group }),
      ...(data.territory && { territory: data.territory }),
      ...(data.tax_id && { tax_id: data.tax_id }),
      ...(data.mobile_no && { mobile_no: data.mobile_no }),
      ...(data.email_id && { email_id: data.email_id }),
      ...(data.default_currency && { default_currency: data.default_currency }),
      ...(data.default_price_list && typeof data.default_price_list === 'string' && data.default_price_list.trim() && { default_price_list: data.default_price_list.trim() }),
      disabled: data.disabled || false,
    };

    const result = await dispatch(updateCustomer(customerData));

    if (result.type === 'customer/updateCustomer/fulfilled') {
      handleEditClose();
      // Refresh the list
      const params = {
        ...filters,
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(listCustomers(params));
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'customer_name',
      header: 'Customer Name',
      width: '18%',
      render: (value, row) => (
        <Typography variant="body2" fontWeight={500}>
          {value || row.name || '-'}
        </Typography>
      ),
    },
    {
      field: 'customer_type',
      header: 'Type',
      width: '10%',
      render: (value) => (
        <Chip
          label={value || 'Individual'}
          size="small"
          color={
            value === 'Company'
              ? 'primary'
              : value === 'Partnership'
              ? 'secondary'
              : 'default'
          }
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'customer_group',
      header: 'Group',
      width: '10%',
      render: (value) => value || '-',
    },
    {
      field: 'territory',
      header: 'Territory',
      width: '10%',
      render: (value) => value || '-',
    },
    {
      field: 'mobile_no',
      header: 'Mobile',
      width: '10%',
      render: (value) => value || '-',
    },
    {
      field: 'email_id',
      header: 'Email',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'credit_limit',
      header: 'Credit Limit',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2">
          {value === 0 ? 'Unlimited' : formatNumber(value)}
        </Typography>
      ),
    },
    {
      field: 'outstanding_amount',
      header: 'Outstanding',
      width: '10%',
      align: 'right',
      render: (value) => formatNumber(value),
    },
    {
      field: 'available_credit',
      header: 'Available',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Typography
          variant="body2"
          color={
            value !== null && value !== undefined && value < 0
              ? 'error.main'
              : 'text.primary'
          }
          fontWeight={600}
        >
          {formatNumber(value)}
        </Typography>
      ),
    },
    {
      field: 'credit_utilization_percent',
      header: 'Utilization',
      width: '12%',
      render: (value, row) => (
        <Box sx={{ minWidth: 140 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(value || 0, 100)}
              color={getUtilizationColor(value)}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography
              variant="body2"
              sx={{ minWidth: 48 }}
              color={
                getUtilizationColor(value) === 'error'
                  ? 'error.main'
                  : 'text.primary'
              }
            >
              {(value || 0).toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '10%',
      render: (value, row) => {
        const status = row.is_over_limit
          ? 'over_limit'
          : row.disabled === 1 || row.disabled === true
          ? 'disabled'
          : 'enabled';
        const label = row.is_over_limit
          ? 'Over Limit'
          : row.disabled === 1 || row.disabled === true
          ? 'Disabled'
          : 'Enabled';
        return (
          <StatusChip
            status={status}
            label={label}
            color={status === 'over_limit' || status === 'disabled' ? '#EF4444' : undefined}
          />
        );
      },
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
  const totalCustomers = pagination?.total || customers.length;
  const enabledCustomers = customers.filter(c => !(c.disabled === 1 || c.disabled === true)).length;
  const overLimitCustomers = customers.filter(c => c.is_over_limit).length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'customer_type',
      label: 'Customer Type',
      value: filters.customer_type || '',
      options: [
        { value: '', label: 'All Types' },
        { value: 'Individual', label: 'Individual' },
        { value: 'Company', label: 'Company' },
        { value: 'Partnership', label: 'Partnership' },
      ],
      width: 140,
    },
    {
      type: 'text',
      key: 'customer_group',
      label: 'Customer Group',
      value: filters.customer_group || '',
      placeholder: 'Filter by group',
      width: 140,
    },
    {
      type: 'text',
      key: 'territory',
      label: 'Territory',
      value: filters.territory || '',
      placeholder: 'Filter by territory',
      width: 140,
    },
    {
      type: 'chip',
      key: 'disabled',
      label: 'Include Disabled',
      value: filters.disabled || false,
    },
  ], [filters]);

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts and relationships"
        icon={People}
        stats={[
          { value: totalCustomers, label: 'Total', color: 'primary.main' },
          { value: enabledCustomers, label: 'Active', color: 'success.main' },
          { value: overLimitCustomers, label: 'Over Limit', color: 'error.main' },
        ]}
        actions={[
          {
            label: 'Add Customer',
            icon: <Add />,
            onClick: handleCreateOpen,
            variant: 'contained',
          },
        ]}
        loading={isLoading && customers.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search customers..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={customers}
        loading={isLoading}
        emptyMessage="No customers found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || 0,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => handleViewOpen(row)}
      />

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleViewOpen(selectedCustomerItem);
            }}
          >
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            View Details
          </MenuItem>
          <MenuItem 
            onClick={() => {
              handleMenuClose();
              handleEditOpen(selectedCustomerItem);
            }}
          >
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
          {selectedCustomerItem?.name && (
            <>
              <Divider />
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate(`/customers/credit?customer=${encodeURIComponent(selectedCustomerItem.name)}`);
                }}
              >
                <Typography sx={{ mr: 1 }} fontSize="small">💳</Typography>
                Credit Limit
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate(`/customers/credit?customer=${encodeURIComponent(selectedCustomerItem.name)}#history`);
                }}
              >
                <Typography sx={{ mr: 1 }} fontSize="small">📊</Typography>
                Credit History
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  const customer = selectedCustomerItem;
                  handleMenuClose();
                  if (customer) {
                    setRedeemPointsDialogOpen(true);
                  }
                }}
              >
                <CardGiftcard sx={{ mr: 1 }} fontSize="small" />
                Redeem Points
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const customer = selectedCustomerItem;
                  handleMenuClose();
                  if (customer) {
                    setAssignProgramDialogOpen(true);
                  }
                }}
              >
                <Star sx={{ mr: 1 }} fontSize="small" />
                Assign Loyalty Program
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const customer = selectedCustomerItem;
                  handleMenuClose();
                  if (customer) {
                    setViewHistoryDialogOpen(true);
                  }
                }}
              >
                <History sx={{ mr: 1 }} fontSize="small" />
                Points History
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Create Customer Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={handleCreateClose}
          maxWidth="sm"
          fullWidth
        >
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle sx={{ fontWeight: 600 }}>Add New Customer</DialogTitle>
            <DialogContent sx={{ px: 3, py: 2 }}>
              <Card elevation={0} sx={{ bgcolor: 'background.default' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    {/* Basic Information Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Basic Information
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="customer_name"
                            control={createControl}
                            rules={{ required: 'Customer name is required' }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Customer Name"
                                fullWidth
                                size="small"
                                required
                                error={!!createErrors.customer_name}
                                helperText={createErrors.customer_name?.message}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                            name="customer_group"
                            control={createControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Customer Group</InputLabel>
                                <Select {...field} label="Customer Group">
                                  <MenuItem value="">None</MenuItem>
                                  {customerGroups.map((group) => (
                                    <MenuItem key={group.name} value={group.name}>
                                      {group.customer_group_name || group.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
                      </Grid>
                      <Grid container spacing={1.5} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="customer_type"
                            control={createControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Customer Type</InputLabel>
                                <Select {...field} label="Customer Type">
                                  <MenuItem value="Individual">Individual</MenuItem>
                                  <MenuItem value="Company">Company</MenuItem>
                                  <MenuItem value="Partnership">Partnership</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Contact Information Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Contact Information
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="territory"
                            control={createControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Territory</InputLabel>
                                <Select {...field} label="Territory">
                                  <MenuItem value="">None</MenuItem>
                                  {territories.map((t) => (
                                    <MenuItem key={t.name} value={t.name}>
                                      {t.territory_name || t.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
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
                            name="mobile_no"
                            control={createControl}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Mobile Number"
                                fullWidth
                                size="small"
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                            name="email_id"
                            control={createControl}
                            rules={{
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                              },
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Email"
                                type="email"
                                fullWidth
                                size="small"
                                error={!!createErrors.email_id}
                                helperText={createErrors.email_id?.message}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Pricing & Settings Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Pricing & Settings
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
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
                      name="default_price_list"
                      control={createControl}
                      render={({ field: { onChange, value, ...field } }) => (
                        <Autocomplete
                          {...field}
                          options={priceLists || []}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.price_list_name || option.name || '';
                          }}
                          value={
                            priceLists.find(
                              (pl) => (pl.price_list_name || pl.name) === value
                            ) || null
                          }
                          onChange={(event, newValue) => {
                            onChange(newValue ? (newValue.price_list_name || newValue.name) : '');
                          }}
                          filterOptions={(options, params) => {
                            const filtered = options.filter((option) => {
                              const label = option.price_list_name || option.name || '';
                              return label.toLowerCase().includes(params.inputValue.toLowerCase());
                            });
                            return filtered;
                          }}
                          isOptionEqualToValue={(option, value) => {
                            if (!value) return false;
                            const optionName = option.price_list_name || option.name;
                            const valueName = typeof value === 'string' ? value : (value.price_list_name || value.name);
                            return optionName === valueName;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Default Price List"
                              size="small"
                              placeholder="Search or select price list..."
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <>
                                    <InputAdornment position="start">
                                      <LabelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </InputAdornment>
                                    {params.InputProps.startAdornment}
                                  </>
                                ),
                              }}
                              sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.name || option.price_list_name}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {option.price_list_name || option.name}
                                </Typography>
                                {option.currency && (
                                  <Typography variant="caption" color="text.secondary">
                                    Currency: {option.currency}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                          noOptionsText="No price lists found"
                        />
                      )}
                    />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 1.5 }}>
                      <Controller
                        name="disabled"
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
                            label="Disabled"
                          />
                        )}
                      />
                    </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button 
                onClick={handleCreateClose} 
                disabled={isCreating}
                sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
              >
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

        {/* Edit Customer Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle sx={{ fontWeight: 600 }}>Edit Customer</DialogTitle>
            <DialogContent sx={{ px: 3, py: 2 }}>
              <Card elevation={0} sx={{ bgcolor: 'background.default' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    {/* Basic Information Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Basic Information
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Controller
                        name="customer_name"
                        control={editControl}
                        rules={{ required: 'Customer name is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Customer Name"
                            fullWidth
                            size="small"
                            required
                            error={!!editErrors.customer_name}
                            helperText={editErrors.customer_name?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' }, mb: 1.5 }}
                          />
                        )}
                      />
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="customer_group"
                            control={editControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Customer Group</InputLabel>
                                <Select {...field} label="Customer Group">
                                  <MenuItem value="">None</MenuItem>
                                  {customerGroups.map((group) => (
                                    <MenuItem key={group.name} value={group.name}>
                                      {group.customer_group_name || group.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="customer_type"
                            control={editControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Customer Type</InputLabel>
                                <Select {...field} label="Customer Type">
                                  <MenuItem value="Individual">Individual</MenuItem>
                                  <MenuItem value="Company">Company</MenuItem>
                                  <MenuItem value="Partnership">Partnership</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Contact Information Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Contact Information
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="territory"
                            control={editControl}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Territory</InputLabel>
                                <Select {...field} label="Territory">
                                  <MenuItem value="">None</MenuItem>
                                  {territories.map((t) => (
                                    <MenuItem key={t.name} value={t.name}>
                                      {t.territory_name || t.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
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
                            name="mobile_no"
                            control={editControl}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Mobile Number"
                                fullWidth
                                size="small"
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
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
                            name="email_id"
                            control={editControl}
                            rules={{
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                              },
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Email"
                                type="email"
                                fullWidth
                                size="small"
                                error={!!editErrors.email_id}
                                helperText={editErrors.email_id?.message}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Pricing & Settings Section */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Pricing & Settings
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
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
                      name="default_price_list"
                      control={editControl}
                      render={({ field: { onChange, value, ...field } }) => (
                        <Autocomplete
                          {...field}
                          options={priceLists || []}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.price_list_name || option.name || '';
                          }}
                          value={
                            priceLists.find(
                              (pl) => (pl.price_list_name || pl.name) === value
                            ) || null
                          }
                          onChange={(event, newValue) => {
                            onChange(newValue ? (newValue.price_list_name || newValue.name) : '');
                          }}
                          filterOptions={(options, params) => {
                            const filtered = options.filter((option) => {
                              const label = option.price_list_name || option.name || '';
                              return label.toLowerCase().includes(params.inputValue.toLowerCase());
                            });
                            return filtered;
                          }}
                          isOptionEqualToValue={(option, value) => {
                            if (!value) return false;
                            const optionName = option.price_list_name || option.name;
                            const valueName = typeof value === 'string' ? value : (value.price_list_name || value.name);
                            return optionName === valueName;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Default Price List"
                              size="small"
                              placeholder="Search or select price list..."
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <>
                                    <InputAdornment position="start">
                                      <LabelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </InputAdornment>
                                    {params.InputProps.startAdornment}
                                  </>
                                ),
                              }}
                              sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.name || option.price_list_name}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {option.price_list_name || option.name}
                                </Typography>
                                {option.currency && (
                                  <Typography variant="caption" color="text.secondary">
                                    Currency: {option.currency}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                          noOptionsText="No price lists found"
                        />
                      )}
                    />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 1.5 }}>
                      <Controller
                        name="disabled"
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
                            label="Disabled"
                          />
                        )}
                      />
                    </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button 
                onClick={handleEditClose} 
                disabled={isUpdating}
                sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
              >
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

        {/* View Customer Dialog */}
        <Dialog open={viewDialogOpen} onClose={handleViewClose} maxWidth="sm" fullWidth>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogContent>
            {isLoadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.customer_name || selectedCustomerItem?.customer_name || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.customer_type || selectedCustomerItem?.customer_type || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.name || selectedCustomerItem?.name || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer Group
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.customer_group || selectedCustomerItem?.customer_group || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Territory
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.territory || selectedCustomerItem?.territory || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Mobile Number
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.mobile_no || selectedCustomerItem?.mobile_no || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.email_id || selectedCustomerItem?.email_id || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tax ID/PIN
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.tax_id || selectedCustomerItem?.tax_id || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Default Currency
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.default_currency || selectedCustomerItem?.default_currency || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Default Price List
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer?.default_price_list || selectedCustomerItem?.default_price_list || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={
                      selectedCustomer?.disabled === 1 ||
                      selectedCustomer?.disabled === true ||
                      selectedCustomerItem?.disabled === 1 ||
                      selectedCustomerItem?.disabled === true
                        ? 'Disabled'
                        : 'Enabled'
                    }
                    color={
                      selectedCustomer?.disabled === 1 ||
                      selectedCustomer?.disabled === true ||
                      selectedCustomerItem?.disabled === 1 ||
                      selectedCustomerItem?.disabled === true
                        ? 'error'
                        : 'success'
                    }
                    size="small"
                  />
                </Grid>
                {selectedCustomer?.outstanding_amount !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Outstanding Amount
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedCustomer.outstanding_amount.toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                {selectedCustomer?.total_sales !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Sales
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedCustomer.total_sales.toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                {selectedCustomer?.credit_limits?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                      Credit Limits
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      {selectedCustomer.credit_limits.map((cl) => (
                        <Grid item xs={12} sm={6} key={`${cl.company}-${cl.limit_source}`}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {cl.company}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Source: {cl.limit_source}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Credit Limit
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {cl.credit_limit === 0
                                  ? 'Unlimited'
                                  : formatNumber(cl.effective_credit_limit || cl.credit_limit)}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Outstanding
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatNumber(cl.outstanding_amount)}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Available
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={
                                  cl.available_credit !== null &&
                                  cl.available_credit !== undefined &&
                                  cl.available_credit < 0
                                    ? 'error.main'
                                    : 'text.primary'
                                }
                              >
                                {formatNumber(cl.available_credit)}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Utilization
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(cl.credit_utilization_percent || 0, 100)}
                                  color={getUtilizationColor(cl.credit_utilization_percent)}
                                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" fontWeight={600}>
                                  {(cl.credit_utilization_percent || 0).toFixed(1)}%
                                </Typography>
                              </Box>
                            </Box>
                            {cl.is_over_limit && (
                              <Alert severity="error" sx={{ mt: 1 }}>
                                Over limit
                              </Alert>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                )}

                {/* Loyalty Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star color="primary" />
                      Loyalty Program
                    </Typography>
                  </Box>
                  {selectedCustomer?.name || selectedCustomerItem?.name ? (
                    <LoyaltyBalance
                      customerId={selectedCustomer?.name || selectedCustomerItem?.name}
                      limit={5}
                      showRecentTransactions={true}
                      autoFetch={viewDialogOpen}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Customer ID not available
                    </Typography>
                  )}
                </Grid>

                {/* Quick Actions Section */}
                {selectedCustomerItem?.name && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Quick Actions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => {
                            handleViewClose();
                            navigate(`/customers/credit?customer=${encodeURIComponent(selectedCustomerItem.name)}`);
                          }}
                          sx={{ py: 1.5 }}
                        >
                          Credit Limit
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => {
                            handleViewClose();
                            navigate(`/customers/credit?customer=${encodeURIComponent(selectedCustomerItem.name)}#history`);
                          }}
                          sx={{ py: 1.5 }}
                        >
                          Credit History
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<CardGiftcard />}
                          onClick={() => {
                            setRedeemPointsDialogOpen(true);
                          }}
                          sx={{ py: 1.5 }}
                        >
                          Redeem Points
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Star />}
                          onClick={() => {
                            setAssignProgramDialogOpen(true);
                          }}
                          sx={{ py: 1.5 }}
                        >
                          Assign Program
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<History />}
                          onClick={() => {
                            setViewHistoryDialogOpen(true);
                          }}
                          sx={{ py: 1.5 }}
                        >
                          Points History
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', pt: 2, zIndex: 1 }}>
            <Button onClick={handleViewClose}>Close</Button>
            <Button
              variant="contained"
              onClick={() => {
                handleViewClose();
                if (selectedCustomerItem) {
                  handleEditOpen(selectedCustomerItem);
                }
              }}
            >
              Edit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Loyalty Dialogs */}
        {selectedCustomerItem?.name && (
          <>
            <RedeemPoints
              customerId={selectedCustomerItem.name}
              currentBalance={balance?.pointsBalance || 0}
              open={redeemPointsDialogOpen}
              onClose={() => setRedeemPointsDialogOpen(false)}
              onSuccess={() => {
                // Refresh balance - handled by component
              }}
            />
            <AssignLoyaltyProgram
              customerId={selectedCustomerItem.name}
              currentProgram={selectedCustomer?.loyalty_program || null}
              open={assignProgramDialogOpen}
              onClose={() => setAssignProgramDialogOpen(false)}
              onSuccess={() => {
                // Refresh customer details to get updated program
                if (selectedCustomerItem?.name) {
                  dispatch(getCustomer({ name: selectedCustomerItem.name }));
                }
              }}
            />
            <Dialog
              open={viewHistoryDialogOpen}
              onClose={() => setViewHistoryDialogOpen(false)}
              maxWidth="lg"
              fullWidth
            >
              <DialogTitle>Points History</DialogTitle>
              <DialogContent>
                <LoyaltyHistory
                  customerId={selectedCustomerItem.name}
                  onClose={() => setViewHistoryDialogOpen(false)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewHistoryDialogOpen(false)}>Close</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
    </Box>
  );
};

export default Customers;
