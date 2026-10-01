import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Typography,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Edit,
  People,
  Delete,
  Star,
  Warehouse,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listWarehouses,
  listWarehouseTypes,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  setDefaultWarehouse,
} from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const Warehouses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/warehouses';

  const {
    warehouses,
    warehouseTypes,
    isLoading,
    isLoadingTypes,
    pagination,
    filters,
  } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync search term with filter
  const searchTerm = filters.search || '';

  // Fetch warehouses and warehouse types on mount
  useEffect(() => {
    if (userCompany && !isChildRoute) {
      const params = {
        company: userCompany,
        ...(filters.warehouse_type ? { warehouse_type: filters.warehouse_type } : {}),
        ...(filters.is_group !== null && filters.is_group !== undefined ? { is_group: filters.is_group } : {}),
        ...(filters.is_main_depot !== null && filters.is_main_depot !== undefined ? { is_main_depot: filters.is_main_depot } : {}),
        ...(filters.parent_warehouse ? { parent_warehouse: filters.parent_warehouse } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(listWarehouses(params));
      dispatch(listWarehouseTypes());
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size, isChildRoute]);

  const handleSearch = (value) => {
    dispatch(setFilters({ search: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value === '' ? undefined : value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPage(newPage + 1));
    const params = {
      company: userCompany,
      ...(filters.warehouse_type ? { warehouse_type: filters.warehouse_type } : {}),
      ...(filters.is_group !== null && filters.is_group !== undefined ? { is_group: filters.is_group } : {}),
      ...(filters.is_main_depot !== null && filters.is_main_depot !== undefined ? { is_main_depot: filters.is_main_depot } : {}),
      ...(filters.parent_warehouse ? { parent_warehouse: filters.parent_warehouse } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      limit: pagination.page_size,
      offset: newPage * pagination.page_size,
    };
    dispatch(listWarehouses(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      company: userCompany,
      ...(filters.warehouse_type ? { warehouse_type: filters.warehouse_type } : {}),
      ...(filters.is_group !== null && filters.is_group !== undefined ? { is_group: filters.is_group } : {}),
      ...(filters.is_main_depot !== null && filters.is_main_depot !== undefined ? { is_main_depot: filters.is_main_depot } : {}),
      ...(filters.parent_warehouse ? { parent_warehouse: filters.parent_warehouse } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      limit: newPageSize,
      offset: 0,
    };
    dispatch(listWarehouses(params));
  };

  const handleMenuOpen = (event, warehouse) => {
    setAnchorEl(event.currentTarget);
    setSelectedWarehouse(warehouse);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWarehouse(null);
  };

  const handleSetAsDefault = async (warehouse) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information is required',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    const result = await dispatch(setDefaultWarehouse({
      company: userCompany,
      warehouse: warehouse.name,
    }));

    if (result.type === 'warehouse/setDefaultWarehouse/fulfilled') {
      // Refresh warehouses list
      const params = {
        company: userCompany,
        ...(filters.warehouse_type ? { warehouse_type: filters.warehouse_type } : {}),
        ...(filters.is_group !== null && filters.is_group !== undefined ? { is_group: filters.is_group } : {}),
        ...(filters.is_main_depot !== null && filters.is_main_depot !== undefined ? { is_main_depot: filters.is_main_depot } : {}),
        ...(filters.parent_warehouse ? { parent_warehouse: filters.parent_warehouse } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      dispatch(listWarehouses(params));
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'warehouse_name',
      header: 'Store Name',
      width: '18%',
      render: (value) => (
        <Box component="span" sx={{ fontWeight: 500 }}>
          {value}
        </Box>
      ),
    },
    {
      field: 'company',
      header: 'Company',
      width: '15%',
      render: (value) => value || '-',
    },
    {
      field: 'warehouse_type',
      header: 'Type',
      width: '12%',
      render: (value) => (
        <Chip
          label={value || 'N/A'}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'is_main_depot',
      header: 'Main Depot',
      width: '12%',
      render: (value) => (
        <Chip
          label={value ? 'Yes' : 'No'}
          size="small"
          color={value ? 'success' : 'default'}
          variant={value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'is_default',
      header: 'Default',
      width: '12%',
      render: (value) => (
        value ? (
          <Chip
            label="Default"
            size="small"
            color="primary"
            icon={<Star sx={{ fontSize: '14px !important' }} />}
          />
        ) : (
          <Chip label="-" size="small" variant="outlined" />
        )
      ),
    },
    {
      field: 'address',
      header: 'Address',
      width: '18%',
      render: (value, row) => {
        const address = row.city || row.state
          ? `${row.city || ''}${row.city && row.state ? ', ' : ''}${row.state || ''}`
          : '-';
        return address;
      },
    },
    {
      field: 'disabled',
      header: 'Status',
      width: '10%',
      render: (value) => (
        <StatusChip
          status={value ? 'disabled' : 'enabled'}
          label={value ? 'Disabled' : 'Enabled'}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '8%',
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
  const totalWarehouses = pagination?.total || warehouses.length;
  const enabledWarehouses = warehouses.filter(w => !w.disabled).length;
  const defaultWarehouses = warehouses.filter(w => w.is_default).length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'warehouse_type',
      label: 'Store Type',
      value: filters.warehouse_type || '',
      options: [
        { value: '', label: 'All Types' },
        ...warehouseTypes.map((type) => ({
          value: type.name,
          label: type.warehouse_type,
        })),
      ],
      width: 160,
    },
  ], [filters, warehouseTypes]);

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Box>
      <PageHeader
        title="Stores"
        subtitle="Manage warehouses and store locations"
        icon={Warehouse}
        stats={[
          { value: totalWarehouses, label: 'Total Stores', color: 'primary.main' },
          { value: enabledWarehouses, label: 'Enabled', color: 'success.main' },
          { value: defaultWarehouses, label: 'Default', color: 'info.main' },
        ]}
        actions={[
          {
            label: 'New Store',
            icon: <Add />,
            onClick: () => navigate('/warehouses/new'),
            variant: 'contained',
          },
        ]}
        loading={isLoading && warehouses.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search stores..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={warehouses}
        loading={isLoading}
        emptyMessage="No stores found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || warehouses.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => navigate(`/warehouses/${row.name}`)}
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            navigate(`/warehouses/${selectedWarehouse?.name}`);
            handleMenuClose();
          }}
        >
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/warehouses/${selectedWarehouse?.name}/edit`);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/warehouses/${selectedWarehouse?.name}/staff`);
            handleMenuClose();
          }}
        >
          <People sx={{ mr: 1 }} fontSize="small" />
          Manage Staff
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedWarehouse) {
              handleSetAsDefault(selectedWarehouse);
            }
            handleMenuClose();
          }}
          disabled={selectedWarehouse?.is_default}
        >
          <Star sx={{ mr: 1 }} fontSize="small" />
          Set as Default
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Store</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedWarehouse?.warehouse_name}"? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // TODO: Implement delete functionality
              dispatch(showNotification({
                message: 'Delete functionality to be implemented',
                severity: 'info',
                title: 'Info',
              }));
              setDeleteDialogOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Warehouses;

