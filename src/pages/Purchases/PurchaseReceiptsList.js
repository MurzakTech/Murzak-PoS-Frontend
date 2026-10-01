import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import { Add, Visibility, Receipt } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listPurchaseReceipts, setPurchaseReceiptPage } from '../../store/purchaseSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const PurchaseReceiptsList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    purchaseReceipts,
    purchaseReceiptPagination,
    isLoadingPurchaseReceipts,
  } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [filters, setFilters] = useState({
    supplier: '',
    from_date: '',
    to_date: '',
    docstatus: 1, // Default to submitted receipts
  });

  useEffect(() => {
    if (userCompany) {
      fetchReceipts();
    }
  }, [dispatch, userCompany, purchaseReceiptPagination.page, purchaseReceiptPagination.page_size, filters]);

  const fetchReceipts = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      page: purchaseReceiptPagination.page,
      page_size: purchaseReceiptPagination.page_size,
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.docstatus !== undefined && { docstatus: filters.docstatus }),
    };

    dispatch(listPurchaseReceipts(params));
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value === '' && key !== 'docstatus' ? undefined : value };
    setFilters(newFilters);
    // Reset to page 1 when filters change
    if (purchaseReceiptPagination.page !== 1) {
      dispatch(setPurchaseReceiptPage(1));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      supplier: '',
      from_date: '',
      to_date: '',
      docstatus: 1,
    });
    dispatch(setPurchaseReceiptPage(1));
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPurchaseReceiptPage(newPage + 1));
    const params = {
      company: userCompany,
      page: newPage + 1,
      page_size: purchaseReceiptPagination.page_size,
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.docstatus !== undefined && { docstatus: filters.docstatus }),
    };
    dispatch(listPurchaseReceipts(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    // For now, just update page - we may need to add setPurchaseReceiptPageSize later
    dispatch(setPurchaseReceiptPage(1));
    const params = {
      company: userCompany,
      page: 1,
      page_size: newPageSize,
      ...(filters.supplier && { supplier: filters.supplier }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.docstatus !== undefined && { docstatus: filters.docstatus }),
    };
    dispatch(listPurchaseReceipts(params));
  };

  // Helper function for doc status color
  const getDocStatusColor = (docstatus) => {
    switch (docstatus) {
      case 0:
        return '#64748B'; // default gray
      case 1:
        return '#10B981'; // success green
      case 2:
        return '#EF4444'; // error red
      default:
        return undefined;
    }
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Receipt Number',
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
      width: '20%',
      render: (value) => value || '-',
    },
    {
      field: 'posting_date',
      header: 'Posting Date',
      width: '15%',
      render: (value) => value || '-',
    },
    {
      field: 'docstatus',
      header: 'Status',
      width: '15%',
      render: (value) => {
        const labels = { 0: 'Draft', 1: 'Submitted', 2: 'Cancelled' };
        return (
          <StatusChip
            status={labels[value]?.toLowerCase() || 'unknown'}
            label={labels[value] || 'Unknown'}
            color={getDocStatusColor(value)}
          />
        );
      },
    },
    {
      field: 'grand_total',
      header: 'Total Amount',
      width: '15%',
      align: 'right',
      render: (value, row) => (
        <Typography variant="body2" fontWeight={600}>
          KES {(value || row.total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
        </Typography>
      ),
    },
    {
      field: 'items_count',
      header: 'Items',
      width: '10%',
      align: 'right',
      render: (value, row) => value || row.items?.length || 0,
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '10%',
      align: 'right',
      render: (value, row) => (
                    <IconButton
                      size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/purchases/receipts/${row.name}`);
          }}
                    >
                      <Visibility />
                    </IconButton>
      ),
    },
  ], [navigate]);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'text',
      key: 'supplier',
      label: 'Search Supplier',
      value: filters.supplier || '',
      placeholder: 'Filter by supplier name...',
      width: 180,
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
    {
      type: 'select',
      key: 'docstatus',
      label: 'Status',
      value: filters.docstatus,
      options: [
        { value: 0, label: 'Draft' },
        { value: 1, label: 'Submitted' },
        { value: 2, label: 'Cancelled' },
        { value: '', label: 'All' },
      ],
      width: 140,
    },
  ], [filters]);

  return (
    <Box>
      <PageHeader
        title="Purchase Receipts"
        subtitle="View and manage purchase receipts"
        icon={Receipt}
        stats={[
          { value: purchaseReceipts.length, label: 'Total Receipts', color: 'primary.main' },
        ]}
        actions={[
          {
            label: 'New Purchase Receipt',
            icon: <Add />,
            onClick: () => navigate('/purchases/receipts/new'),
            variant: 'contained',
          },
        ]}
        loading={isLoadingPurchaseReceipts && purchaseReceipts.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={filters.supplier || ''}
          searchPlaceholder="Search by supplier name..."
          onSearchChange={(value) => handleFilterChange('supplier', value)}
          filters={filterBarFilters}
          onFilterChange={(key, value) => {
            if (key === 'docstatus') {
              handleFilterChange(key, value === '' ? 1 : Number(value));
            } else {
              handleFilterChange(key, value);
            }
          }}
          onClearFilters={handleClearFilters}
          />
        </Box>

      <DataTable
        columns={columns}
        rows={purchaseReceipts}
        loading={isLoadingPurchaseReceipts}
        emptyMessage="No purchase receipts found"
        pagination={{
          page: purchaseReceiptPagination.page,
          page_size: purchaseReceiptPagination.page_size,
          total: purchaseReceiptPagination.total || purchaseReceipts.length,
          total_pages: purchaseReceiptPagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => navigate(`/purchases/receipts/${row.name}`)}
      />
    </Box>
  );
};

export default PurchaseReceiptsList;
