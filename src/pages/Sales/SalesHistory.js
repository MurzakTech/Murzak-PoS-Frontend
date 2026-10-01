import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Edit,
  Receipt,
  Delete,
  Print,
  AssignmentReturn,
  History,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listSalesInvoices,
  listPOSInvoices,
  cancelSalesInvoice,
  cancelPOSInvoice,
  submitInvoice,
  setFilters,
  setPOSFilters,
  resetFilters,
  resetPOSFilters,
  setPage,
  setPOSPage,
  setPageSize,
  setPOSPageSize,
} from '../../store/salesSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const SalesHistory = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Tab state - 0 for Sales Invoices, 1 for POS Invoices
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    salesInvoices,
    posInvoices,
    pagination,
    posPagination,
    filters,
    posFilters,
    isLoading,
    isLoadingPOS,
  } = useAppSelector((state) => state.sales);
  const { user } = useAppSelector((state) => state.auth);
  
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState('sales'); // 'sales' or 'pos'

  // Fetch Sales Invoices
  useEffect(() => {
    if (userCompany && activeTab === 0) {
      const params = {
        company: userCompany,
        limit: pagination.page_size,
        offset: (pagination.page - 1) * pagination.page_size,
      };
      
      if (filters.customer) params.customer = filters.customer;
      if (filters.status) params.status = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.search_term) params.search_term = filters.search_term;
      if (filters.is_pos !== undefined) params.is_pos = filters.is_pos;
      
      dispatch(listSalesInvoices(params));
    }
  }, [dispatch, userCompany, filters, pagination.page, pagination.page_size, activeTab]);

  // Fetch POS Invoices
  useEffect(() => {
    if (userCompany && activeTab === 1) {
      const params = {
        company: userCompany,
        limit: posPagination.page_size,
        offset: (posPagination.page - 1) * posPagination.page_size,
      };
      
      if (posFilters.customer) params.customer = posFilters.customer;
      if (posFilters.status) params.status = posFilters.status;
      if (posFilters.from_date) params.from_date = posFilters.from_date;
      if (posFilters.to_date) params.to_date = posFilters.to_date;
      if (posFilters.search_term) params.search_term = posFilters.search_term;
      if (posFilters.pos_profile) params.pos_profile = posFilters.pos_profile;
      
      dispatch(listPOSInvoices(params));
    }
  }, [dispatch, userCompany, posFilters, posPagination.page, posPagination.page_size, activeTab]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (activeTab === 0) {
      dispatch(setFilters({ search_term: value })); // setFilters already resets page to 1
    } else {
      dispatch(setPOSFilters({ search_term: value })); // setPOSFilters already resets page to 1
    }
    // useEffect will handle the fetch when filters change
  };

  const handleFilterChange = (key, value) => {
    if (activeTab === 0) {
      dispatch(setFilters({ [key]: value || undefined })); // setFilters already resets page to 1
    } else {
      dispatch(setPOSFilters({ [key]: value || undefined })); // setPOSFilters already resets page to 1
    }
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    if (activeTab === 0) {
      dispatch(resetFilters()); // resetFilters already resets page to 1
    } else {
      dispatch(resetPOSFilters()); // resetPOSFilters already resets page to 1
    }
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    if (activeTab === 0) {
      dispatch(setPage(newPage + 1));
      const params = {
        company: userCompany,
        limit: pagination.page_size,
        offset: newPage * pagination.page_size,
        ...(filters.customer && { customer: filters.customer }),
        ...(filters.status && { status: filters.status }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
        ...(filters.search_term && { search_term: filters.search_term }),
        ...(filters.is_pos !== undefined && { is_pos: filters.is_pos }),
      };
      dispatch(listSalesInvoices(params));
    } else {
      dispatch(setPOSPage(newPage + 1));
      const params = {
        company: userCompany,
        limit: posPagination.page_size,
        offset: newPage * posPagination.page_size,
        ...(posFilters.customer && { customer: posFilters.customer }),
        ...(posFilters.status && { status: posFilters.status }),
        ...(posFilters.from_date && { from_date: posFilters.from_date }),
        ...(posFilters.to_date && { to_date: posFilters.to_date }),
        ...(posFilters.search_term && { search_term: posFilters.search_term }),
        ...(posFilters.pos_profile && { pos_profile: posFilters.pos_profile }),
      };
      dispatch(listPOSInvoices(params));
    }
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    if (activeTab === 0) {
      dispatch(setPageSize(newPageSize));
      dispatch(setPage(1));
      const params = {
        company: userCompany,
        limit: newPageSize,
        offset: 0,
        ...(filters.customer && { customer: filters.customer }),
        ...(filters.status && { status: filters.status }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
        ...(filters.search_term && { search_term: filters.search_term }),
        ...(filters.is_pos !== undefined && { is_pos: filters.is_pos }),
      };
      dispatch(listSalesInvoices(params));
    } else {
      dispatch(setPOSPageSize(newPageSize));
      dispatch(setPOSPage(1));
      const params = {
        company: userCompany,
        limit: newPageSize,
        offset: 0,
        ...(posFilters.customer && { customer: posFilters.customer }),
        ...(posFilters.status && { status: posFilters.status }),
        ...(posFilters.from_date && { from_date: posFilters.from_date }),
        ...(posFilters.to_date && { to_date: posFilters.to_date }),
        ...(posFilters.search_term && { search_term: posFilters.search_term }),
        ...(posFilters.pos_profile && { pos_profile: posFilters.pos_profile }),
      };
      dispatch(listPOSInvoices(params));
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchTerm('');
  };

  const handleMenuOpen = (event, invoice, type) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
    setInvoiceType(type);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleSubmitInvoice = async () => {
    if (!selectedInvoice || invoiceType !== 'sales') return;
    
    const result = await dispatch(submitInvoice({
      name: selectedInvoice.name,
    }));
    
    if (result.type === 'sales/submitInvoice/fulfilled') {
      setSubmitDialogOpen(false);
      handleMenuClose();
      // Refresh list
      if (userCompany) {
        const params = {
          company: userCompany,
          limit: pagination.page_size,
          offset: (pagination.page - 1) * pagination.page_size,
        };
        if (filters.customer) params.customer = filters.customer;
        if (filters.status) params.status = filters.status;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.search_term) params.search_term = filters.search_term;
        dispatch(listSalesInvoices(params));
      }
    }
  };

  const handleCancelInvoice = async () => {
    if (!selectedInvoice) return;
    
    const result = invoiceType === 'sales'
      ? await dispatch(cancelSalesInvoice({ name: selectedInvoice.name }))
      : await dispatch(cancelPOSInvoice({ name: selectedInvoice.name }));
    
    if (result.type?.includes('/fulfilled')) {
      setCancelDialogOpen(false);
      handleMenuClose();
      // Refresh list
      if (userCompany) {
        const params = activeTab === 0
          ? {
              company: userCompany,
              limit: pagination.page_size,
              offset: (pagination.page - 1) * pagination.page_size,
              ...(filters.customer && { customer: filters.customer }),
              ...(filters.status && { status: filters.status }),
              ...(filters.from_date && { from_date: filters.from_date }),
              ...(filters.to_date && { to_date: filters.to_date }),
              ...(filters.search_term && { search_term: filters.search_term }),
            }
          : {
              company: userCompany,
              limit: posPagination.page_size,
              offset: (posPagination.page - 1) * posPagination.page_size,
              ...(posFilters.customer && { customer: posFilters.customer }),
              ...(posFilters.status && { status: posFilters.status }),
              ...(posFilters.from_date && { from_date: posFilters.from_date }),
              ...(posFilters.to_date && { to_date: posFilters.to_date }),
              ...(posFilters.search_term && { search_term: posFilters.search_term }),
            };
        
        if (activeTab === 0) {
          dispatch(listSalesInvoices(params));
        } else {
          dispatch(listPOSInvoices(params));
        }
      }
    }
  };

  // Helper functions for status
  const getStatusColor = (status, docstatus) => {
    const statusLower = status?.toLowerCase() || '';
    const docStatus = docstatus !== undefined ? docstatus : null;
    
    if (statusLower === 'cancelled' || docStatus === 2) return 'error';
    if (statusLower === 'completed' || statusLower === 'paid' || docStatus === 1) return 'success';
    if (statusLower === 'draft' || docStatus === 0) return 'default';
    if (statusLower === 'pending' || statusLower === 'unpaid') return 'warning';
    return 'default';
  };

  const getStatusLabel = (invoice) => {
    if (invoice.status) return invoice.status;
    if (invoice.docstatus === 0) return 'Draft';
    if (invoice.docstatus === 1) return 'Submitted';
    if (invoice.docstatus === 2) return 'Cancelled';
    return 'Unknown';
  };

  const currentInvoices = activeTab === 0 ? salesInvoices : posInvoices;
  const currentPagination = activeTab === 0 ? pagination : posPagination;
  const currentFilters = activeTab === 0 ? filters : posFilters;
  const currentLoading = activeTab === 0 ? isLoading : isLoadingPOS;

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: activeTab === 0 ? 'Sales Invoice #' : 'POS Invoice #',
      width: '15%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'customer',
      header: 'Customer',
      width: '20%',
      render: (value, row) => value || row.customer_name || '-',
    },
    {
      field: 'posting_date',
      header: 'Date',
      width: '12%',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      field: 'grand_total',
      header: 'Total Amount',
      width: '15%',
      render: (value, row) => (
        <Typography variant="body2" fontWeight={600}>
          KES {(value || row.total_amount || 0).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '15%',
      render: (value, row) => {
        const statusLabel = getStatusLabel(row);
        const statusColor = getStatusColor(row.status, row.docstatus);
        return (
          <StatusChip
            status={statusLabel.toLowerCase().replace(/\s+/g, '_')}
            label={statusLabel}
            color={statusColor === 'error' ? '#EF4444' : statusColor === 'success' ? '#10B981' : statusColor === 'warning' ? '#F59E0B' : undefined}
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
            handleMenuOpen(e, row, activeTab === 0 ? 'sales' : 'pos');
          }}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ], [activeTab, handleMenuOpen]);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => {
    const baseFilters = [
      {
        type: 'text',
        key: 'customer',
        label: 'Customer',
        value: currentFilters.customer || '',
        placeholder: 'Filter by customer name',
        width: 140,
      },
      {
        type: 'select',
        key: 'status',
        label: 'Status',
        value: currentFilters.status || '',
        options: [
          { value: '', label: 'All Statuses' },
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
        value: currentFilters.from_date || '',
        width: 140,
      },
      {
        type: 'date',
        key: 'to_date',
        label: 'To Date',
        value: currentFilters.to_date || '',
        width: 140,
      },
    ];

    // Add POS Profile filter only for POS tab
    if (activeTab === 1) {
      baseFilters.push({
        type: 'text',
        key: 'pos_profile',
        label: 'POS Profile',
        value: currentFilters.pos_profile || '',
        placeholder: 'Filter by POS profile',
        width: 140,
      });
    }

    return baseFilters;
  }, [currentFilters, activeTab]);

  return (
    <Box>
      <PageHeader
        title="Sales History"
        subtitle={activeTab === 0 ? 'View and manage sales invoices' : 'View and manage POS invoices'}
        icon={History}
        stats={[
          { value: currentInvoices.length, label: activeTab === 0 ? 'Sales Invoices' : 'POS Invoices', color: 'primary.main' },
        ]}
        actions={[
          {
            label: 'New Invoice',
            icon: <Add />,
            onClick: () => navigate('/sales/invoice/new'),
            variant: 'outlined',
          },
          {
            label: 'New Sale (POS)',
            icon: <Add />,
            onClick: () => navigate('/sales/pos'),
            variant: 'contained',
          },
        ]}
        loading={currentLoading && currentInvoices.length === 0}
      />

      {/* Tabs */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="invoice type tabs"
        >
          <Tab label="Sales Invoices" />
          <Tab label="POS Invoices" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search by invoice number, customer, or reference..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      {/* Invoices Table */}
      <DataTable
        columns={columns}
        rows={currentInvoices}
        loading={currentLoading}
        emptyMessage={`No ${activeTab === 0 ? 'sales' : 'POS'} invoices found`}
        pagination={{
          page: currentPagination.page,
          page_size: currentPagination.page_size,
          total: currentPagination.total || currentInvoices.length,
          total_pages: currentPagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => {
          if (activeTab === 0) {
            navigate(`/sales/invoice/${row.name}`);
          } else {
            navigate(`/sales/pos-invoice/${row.name}`);
          }
        }}
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => {
          if (invoiceType === 'sales') {
            navigate(`/sales/invoice/${selectedInvoice?.name}`);
          } else {
            navigate(`/sales/pos-invoice/${selectedInvoice?.name}`);
          }
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        {selectedInvoice?.docstatus === 0 && (
          <MenuItem onClick={() => {
            navigate(`/sales/invoice/${selectedInvoice?.name}/edit`);
            handleMenuClose();
          }}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        )}
        {selectedInvoice?.docstatus === 0 && invoiceType === 'sales' && (
          <MenuItem onClick={() => {
            setSubmitDialogOpen(true);
            handleMenuClose();
          }}>
            <Receipt sx={{ mr: 1 }} fontSize="small" />
            Submit Invoice
          </MenuItem>
        )}
        {selectedInvoice?.docstatus === 1 && selectedInvoice?.status !== 'Cancelled' && (
          <MenuItem onClick={() => {
            setCancelDialogOpen(true);
            handleMenuClose();
          }}>
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Cancel {invoiceType === 'sales' ? 'Sales' : 'POS'} Invoice
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => {
          // TODO: Implement print functionality
          handleMenuClose();
        }}>
          <Print sx={{ mr: 1 }} fontSize="small" />
          Print Receipt
        </MenuItem>
        {selectedInvoice?.docstatus === 1 && (
          <MenuItem onClick={() => {
            navigate(`/sales/returns?invoice=${selectedInvoice?.name}`);
            handleMenuClose();
          }}>
            <AssignmentReturn sx={{ mr: 1 }} fontSize="small" />
            Create Return
          </MenuItem>
        )}
      </Menu>

      {/* Submit Invoice Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <DialogTitle>Submit Sales Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Submit Sales Invoice "{selectedInvoice?.name}"? This will finalize the invoice.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitInvoice} variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Invoice Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel {invoiceType === 'sales' ? 'Sales' : 'POS'} Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel {invoiceType === 'sales' ? 'Sales' : 'POS'} Invoice "{selectedInvoice?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCancelInvoice} 
            color="error" 
            variant="contained" 
            disabled={currentLoading}
          >
            {currentLoading ? <CircularProgress size={20} /> : 'Cancel Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesHistory;
