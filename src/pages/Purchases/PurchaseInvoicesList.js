import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  Receipt,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listPurchaseInvoicesAPI,
  setPurchaseInvoiceFilters,
  resetPurchaseInvoiceFilters,
  setPurchaseInvoicePage,
  setPurchaseInvoicePageSize,
} from '../../store/purchaseSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import { PURCHASE_INVOICE_STATUS, DOCUMENT_STATUS } from '../../types/purchaseInvoiceTypes';

const PurchaseInvoicesList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const {
    purchaseInvoices,
    purchaseInvoicePagination,
    purchaseInvoiceFilters,
    isLoadingPurchaseInvoices,
  } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);
  
  const userCompany = user?.company || user?.custom_company || user?.company_name || 
                     user?.company_data?.name || user?.company_data?.company_name;
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch purchase invoices when filters or pagination change
  useEffect(() => {
    if (userCompany) {
      const params = {
        page: purchaseInvoicePagination.page,
        page_size: purchaseInvoicePagination.page_size,
        company: userCompany,
        ...purchaseInvoiceFilters,
      };
      
      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      dispatch(listPurchaseInvoicesAPI(params));
    }
  }, [dispatch, userCompany, purchaseInvoiceFilters, purchaseInvoicePagination.page, purchaseInvoicePagination.page_size]);

  const handleFilterChange = (key, value) => {
    dispatch(setPurchaseInvoiceFilters({ [key]: value || undefined }));
  };

  const handleClearFilters = () => {
    dispatch(resetPurchaseInvoiceFilters());
  };

  const handlePageChange = (event, newPage) => {
    // DataTable uses 0-indexed pages, API uses 1-indexed
    dispatch(setPurchaseInvoicePage(newPage + 1));
  };

  const handleRowsPerPageChange = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    dispatch(setPurchaseInvoicePageSize(newPageSize));
  };

  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleViewDetails = (invoice) => {
    handleMenuClose();
    navigate(`/purchases/invoices/${invoice.name}`);
  };

  // Helper function for status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#10B981';
      case 'draft':
        return '#64748B';
      case 'unpaid':
      case 'overdue':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'partly paid':
        return '#3B82F6';
      default:
        return undefined;
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Invoice No',
      width: 150,
      render: (value) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'supplier_name',
      header: 'Supplier',
      width: 200,
    },
    {
      field: 'posting_date',
      header: 'Posting Date',
      width: 120,
      render: (value) => formatDate(value),
    },
    {
      field: 'due_date',
      header: 'Due Date',
      width: 120,
      render: (value) => formatDate(value),
    },
    {
      field: 'bill_no',
      header: 'Bill No',
      width: 150,
      render: (value) => value || '-',
    },
    {
      field: 'grand_total',
      header: 'Grand Total',
      width: 130,
      align: 'right',
      render: (value, row) => formatCurrency(value || 0, row.currency),
    },
    {
      field: 'outstanding_amount',
      header: 'Outstanding',
      width: 130,
      align: 'right',
      render: (value, row) => formatCurrency(value || 0, row.currency),
    },
    {
      field: 'status',
      header: 'Status',
      width: 120,
      render: (value) => (
        <StatusChip
          label={value}
          color={getStatusColor(value)}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: 80,
      align: 'center',
      render: (value, row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      ),
    },
  ], []);

  // Prepare filter configuration
  const filterConfig = useMemo(() => [
    {
      key: 'supplier',
      label: 'Supplier',
      type: 'text',
      value: purchaseInvoiceFilters.supplier || '',
      placeholder: 'Filter by supplier',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: purchaseInvoiceFilters.status || '',
      options: [
        { value: '', label: 'All Status' },
        { value: PURCHASE_INVOICE_STATUS.DRAFT, label: 'Draft' },
        { value: PURCHASE_INVOICE_STATUS.UNPAID, label: 'Unpaid' },
        { value: PURCHASE_INVOICE_STATUS.PAID, label: 'Paid' },
        { value: PURCHASE_INVOICE_STATUS.PARTLY_PAID, label: 'Partly Paid' },
        { value: PURCHASE_INVOICE_STATUS.OVERDUE, label: 'Overdue' },
        { value: PURCHASE_INVOICE_STATUS.CANCELLED, label: 'Cancelled' },
      ],
    },
    {
      key: 'docstatus',
      label: 'Document Status',
      type: 'select',
      value: purchaseInvoiceFilters.docstatus || '',
      options: [
        { value: '', label: 'All' },
        { value: DOCUMENT_STATUS.DRAFT, label: 'Draft' },
        { value: DOCUMENT_STATUS.SUBMITTED, label: 'Submitted' },
        { value: DOCUMENT_STATUS.CANCELLED, label: 'Cancelled' },
      ],
    },
    {
      key: 'from_date',
      label: 'From Date',
      type: 'date',
      value: purchaseInvoiceFilters.from_date || '',
    },
    {
      key: 'to_date',
      label: 'To Date',
      type: 'date',
      value: purchaseInvoiceFilters.to_date || '',
    },
    {
      key: 'purchase_order',
      label: 'Purchase Order',
      type: 'text',
      value: purchaseInvoiceFilters.purchase_order || '',
      placeholder: 'Filter by PO',
    },
    {
      key: 'purchase_receipt',
      label: 'Purchase Receipt',
      type: 'text',
      value: purchaseInvoiceFilters.purchase_receipt || '',
      placeholder: 'Filter by GRN',
    },
    {
      key: 'bill_no',
      label: 'Bill No',
      type: 'text',
      value: purchaseInvoiceFilters.bill_no || '',
      placeholder: 'Filter by bill number',
    },
  ], [purchaseInvoiceFilters]);

  return (
    <Box>
      <PageHeader
        title="Purchase Invoices"
        subtitle="View and manage purchase invoices from suppliers"
        icon={Receipt}
      />

      <FilterBar
        searchValue=""
        searchPlaceholder="Search invoices..."
        onSearchChange={(value) => {
          // Search can be implemented if needed
          // For now, use bill_no filter for search
        }}
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <DataTable
        columns={columns}
        rows={Array.isArray(purchaseInvoices) ? purchaseInvoices : []}
        loading={isLoadingPurchaseInvoices}
        emptyMessage="No purchase invoices found"
        pagination={{
          page: purchaseInvoicePagination.page,
          pageSize: purchaseInvoicePagination.page_size,
          total: purchaseInvoicePagination.total,
          totalPages: purchaseInvoicePagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onRowClick={(row) => handleViewDetails(row)}
        rowKey="name"
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDetails(selectedInvoice)}>
          <Visibility sx={{ mr: 1, fontSize: 20 }} />
          View Details
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default PurchaseInvoicesList;

