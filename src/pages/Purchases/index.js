import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Edit,
  Receipt,
  AssignmentReturn,
  Delete,
  Send,
  Inventory,
  ShoppingCart,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listPurchaseInvoices,
  cancelPurchaseInvoice,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
} from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const Purchases = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/purchases';
  
  const {
    purchases,
    pagination,
    filters,
    isLoading,
  } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);
  
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [paymentStatusDialogOpen, setPaymentStatusDialogOpen] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState('');

  // Sync searchTerm with filter state
  useEffect(() => {
    if (filters.search_term !== searchTerm) {
      setSearchTerm(filters.search_term || '');
    }
  }, [filters.search_term]);

  useEffect(() => {
    if (userCompany && !isChildRoute) {
      // Build query params
      const params = {
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      
      // Add filters to params
      if (filters.search_term) params.search_term = filters.search_term;
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.status) params.status = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      
      dispatch(listPurchaseInvoices(params));
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size, isChildRoute]);

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
      company: userCompany,
      limit: pagination.page_size,
      offset: newPage * pagination.page_size,
      ...(filters.search_term && { search_term: filters.search_term }),
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
    };
    dispatch(listPurchaseInvoices(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      company: userCompany,
      limit: newPageSize,
      offset: 0,
      ...(filters.search_term && { search_term: filters.search_term }),
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.status && { status: filters.status }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
    };
    dispatch(listPurchaseInvoices(params));
  };

  const handleMenuOpen = (event, purchase) => {
    setAnchorEl(event.currentTarget);
    setSelectedPurchase(purchase);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPurchase(null);
  };


  const handleCancelPurchase = async () => {
    if (!selectedPurchase) return;
    
    const result = await dispatch(cancelPurchaseInvoice({
      name: selectedPurchase.name,
    }));
    
    if (result.type === 'purchase/cancelPurchaseInvoice/fulfilled') {
      setPaymentStatusDialogOpen(false);
      handleMenuClose();
      // Refresh list
      const params = {
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.status) params.status = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      dispatch(listPurchaseInvoices(params));
    }
  };

  // Helper function for status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return '#10B981';
      case 'draft':
        return '#64748B';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return undefined;
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Purchase #',
      width: '15%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'supplier',
      header: 'Supplier',
      width: '18%',
      render: (value) => value || '-',
    },
    {
      field: 'posting_date',
      header: 'Date',
      width: '12%',
      render: (value, row) => {
        const date = row.transaction_date || value;
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      field: 'bill_no',
      header: 'Bill No',
      width: '12%',
      render: (value, row) => value || row.name || '-',
    },
    {
      field: 'grand_total',
      header: 'Total Amount',
      width: '15%',
      render: (value) => (
        <Typography variant="body2" fontWeight={600}>
          KES {(value || 0).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '15%',
      render: (value, row) => {
        const status = value || (row.docstatus === 0 ? 'Draft' : 'Submitted');
        return (
          <StatusChip
            status={status.toLowerCase().replace(/\s+/g, '_')}
            label={status}
            color={getStatusColor(status)}
          />
        );
      },
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
  const totalPurchases = pagination?.total || purchases.length;
  const draftPurchases = purchases.filter(p => p.docstatus === 0).length;
  const submittedPurchases = purchases.filter(p => p.docstatus === 1).length;

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'text',
      key: 'supplier',
      label: 'Supplier',
      value: filters.supplier || '',
      placeholder: 'Filter by supplier',
      width: 160,
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      value: filters.status || '',
      options: [
        { value: '', label: 'All' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Unpaid', label: 'Unpaid' },
        { value: 'Paid', label: 'Paid' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
      width: 140,
    },
    {
      type: 'date',
      key: 'from_date',
      label: 'From Date',
      value: filters.from_date || '',
      width: 140,
    },
    {
      type: 'date',
      key: 'to_date',
      label: 'To Date',
      value: filters.to_date || '',
      width: 140,
    },
  ], [filters]);

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Box>
      <PageHeader
        title="Purchases"
        subtitle="Manage purchase orders and invoices"
        icon={ShoppingCart}
        stats={[
          { value: totalPurchases, label: 'Total', color: 'primary.main' },
          { value: draftPurchases, label: 'Draft', color: 'text.secondary' },
          { value: submittedPurchases, label: 'Submitted', color: 'success.main' },
        ]}
        actions={[
          {
            label: 'Purchase Receipts',
            icon: <Receipt />,
            onClick: () => navigate('/purchases/receipts'),
            variant: 'outlined',
          },
          {
            label: 'New Purchase',
            icon: <Add />,
            onClick: () => navigate('/purchases/create-order'),
            variant: 'contained',
          },
        ]}
        loading={isLoading && purchases.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search purchases..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={purchases}
        loading={isLoading}
        emptyMessage="No purchases found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || purchases.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => navigate(`/purchases/${row.name}`)}
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => {
          navigate(`/purchases/${selectedPurchase?.name}`);
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        {selectedPurchase?.docstatus === 0 && (
          <>
            <MenuItem onClick={() => {
              navigate(`/purchases/new?draft=${selectedPurchase.name}`);
              handleMenuClose();
            }}>
              <Edit sx={{ mr: 1 }} fontSize="small" />
              Edit
            </MenuItem>
            <MenuItem onClick={() => {
              navigate(`/purchases/submit-order`);
              handleMenuClose();
            }}>
              <Send sx={{ mr: 1 }} fontSize="small" />
              Submit Purchase Order
            </MenuItem>
          </>
        )}
        {selectedPurchase?.docstatus === 1 && selectedPurchase?.status !== 'Cancelled' && (
          <>
            <MenuItem onClick={() => {
              navigate(`/purchases/create-grn?lpo_no=${selectedPurchase.name}`);
              handleMenuClose();
            }}>
              <Inventory sx={{ mr: 1 }} fontSize="small" />
              Create GRN (Receive Goods)
            </MenuItem>
            <MenuItem onClick={() => {
              setPaymentStatusDialogOpen(true);
              setNewPaymentStatus('Cancelled');
              handleMenuClose();
            }}>
              <Delete sx={{ mr: 1 }} fontSize="small" />
              Cancel Purchase
            </MenuItem>
          </>
        )}
        <Divider />
        <MenuItem onClick={() => {
          navigate(`/purchases/returns?purchase=${selectedPurchase?.name}`);
          handleMenuClose();
        }}>
          <AssignmentReturn sx={{ mr: 1 }} fontSize="small" />
          Create Return
        </MenuItem>
      </Menu>

      {/* Cancel Purchase Dialog */}
      <Dialog open={paymentStatusDialogOpen} onClose={() => setPaymentStatusDialogOpen(false)}>
        <DialogTitle>Cancel Purchase Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel Purchase Invoice "{selectedPurchase?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCancelPurchase} color="error" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : 'Cancel Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Purchases;

