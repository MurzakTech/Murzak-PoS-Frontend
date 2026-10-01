import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import { Download, History } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getStockLedgerEntries, setFilters, setPage, setPageSize, resetFilters } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const StockLedger = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { stockLedgerEntries, isLoadingLedger, pagination, filters } = useAppSelector(
    (state) => state.inventory
  );
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [searchTerm, setSearchTerm] = useState('');

  // Initialize filter with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        dispatch(setFilters({ warehouse: warehouseName }));
      }
    }
  }, [activeWarehouse, filters.warehouse, dispatch]);

  // Pre-fill the item filter when arriving with ?item=<code> (e.g. from Stock Summary's "View Movement")
  useEffect(() => {
    const itemParam = searchParams.get('item');
    if (itemParam && !filters.item_code) {
      setSearchTerm(itemParam);
      dispatch(setFilters({ item_code: itemParam }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  useEffect(() => {
    if (userCompany) {
      fetchLedgerEntries();
    }
  }, [dispatch, userCompany, pagination.page, pagination.page_size, filters]);

  const fetchLedgerEntries = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      ...(filters.item_code && { item_code: filters.item_code }),
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.voucher_type && { voucher_type: filters.voucher_type }),
      limit: pagination.page_size,
      offset: (pagination.page - 1) * pagination.page_size,
    };

    dispatch(getStockLedgerEntries(params));
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value === '' ? undefined : value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setFilters({ item_code: value || undefined })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPage(newPage + 1));
    const params = {
      company: userCompany,
      ...(filters.item_code && { item_code: filters.item_code }),
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.voucher_type && { voucher_type: filters.voucher_type }),
      limit: pagination.page_size,
      offset: newPage * pagination.page_size,
    };
    dispatch(getStockLedgerEntries(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      company: userCompany,
      ...(filters.item_code && { item_code: filters.item_code }),
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.voucher_type && { voucher_type: filters.voucher_type }),
      limit: newPageSize,
      offset: 0,
    };
    dispatch(getStockLedgerEntries(params));
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Time',
      'Item Code',
      'Warehouse',
      'Voucher Type',
      'Voucher No',
      'Quantity',
      'Qty After Transaction',
      'Valuation Rate',
      'Stock Value',
      'Status',
    ];
    const rows = stockLedgerEntries.map((entry) => [
      entry.posting_date || '',
      entry.posting_time || '',
      entry.item_code || '',
      entry.warehouse || '',
      entry.voucher_type || '',
      entry.voucher_no || '',
      entry.actual_qty || 0,
      entry.qty_after_transaction || 0,
      entry.valuation_rate || 0,
      entry.stock_value || 0,
      entry.is_cancelled ? 'Cancelled' : 'Active',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const VOUCHER_TYPES = [
    'Stock Entry',
    'Sales Invoice',
    'Purchase Receipt',
    'Stock Reconciliation',
    'Delivery Note',
    'Material Request',
  ];

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'posting_date',
      header: 'Date/Time',
      width: '12%',
      render: (value, row) => (
        <Box>
          <Typography variant="body2">
            {value || '-'}
          </Typography>
          {row.posting_time && (
            <Typography variant="caption" color="text.secondary" display="block">
              {row.posting_time}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'item_code',
      header: 'Item Code',
      width: '12%',
      render: (value) => (
                      <Typography variant="body2" fontWeight={500}>
          {value}
                      </Typography>
      ),
    },
    {
      field: 'warehouse',
      header: 'Warehouse',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'voucher_type',
      header: 'Voucher Type',
      width: '12%',
      render: (value) => (
        <Chip label={value || '-'} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      field: 'voucher_no',
      header: 'Voucher No',
      width: '12%',
      render: (value) => (
        <Typography variant="body2" color="primary.main" fontWeight={500}>
          {value || '-'}
                      </Typography>
      ),
    },
    {
      field: 'actual_qty',
      header: 'Quantity',
      width: '10%',
      align: 'right',
      render: (value) => (
                      <Typography
                        variant="body2"
          color={value >= 0 ? 'success.main' : 'error.main'}
          fontWeight={600}
                      >
          {value >= 0 ? '+' : ''}{value || 0}
        </Typography>
      ),
    },
    {
      field: 'qty_after_transaction',
      header: 'Qty After',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value || 0}
        </Typography>
      ),
    },
    {
      field: 'valuation_rate',
      header: 'Valuation Rate',
      width: '12%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2">
          KES {value?.toLocaleString() || '0.00'}
        </Typography>
      ),
    },
    {
      field: 'stock_value',
      header: 'Stock Value',
      width: '12%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2" fontWeight={600}>
          KES {value?.toLocaleString() || '0.00'}
                      </Typography>
      ),
    },
    {
      field: 'is_cancelled',
      header: 'Status',
      width: '10%',
      render: (value) => (
        <StatusChip
          status={value ? 'cancelled' : 'active'}
          label={value ? 'Cancelled' : 'Active'}
        />
      ),
    },
  ], []);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'warehouse',
      label: 'Warehouse',
      value: filters.warehouse || '',
      allLabel: 'All Warehouses',
      options: warehouses.map((wh) => ({
        value: wh.name,
        label: wh.warehouse_name || wh.name,
      })),
      width: 160,
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
      key: 'voucher_type',
      label: 'Voucher Type',
      value: filters.voucher_type || '',
      allLabel: 'All Types',
      options: VOUCHER_TYPES.map((type) => ({
        value: type,
        label: type,
      })),
      width: 160,
    },
  ], [filters, warehouses]);

  return (
    <Box>
      <PageHeader
        title="Stock Ledger"
        subtitle="Transaction history for stock movements"
        icon={History}
        stats={[
          { value: stockLedgerEntries.length, label: 'Entries', color: 'primary.main' },
        ]}
        actions={[
          {
            label: 'Export CSV',
            icon: <Download />,
            onClick: exportToCSV,
            variant: 'outlined',
            disabled: stockLedgerEntries.length === 0,
          },
        ]}
        loading={isLoadingLedger && stockLedgerEntries.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search by item code..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
            />
      </Box>

      <DataTable
        columns={columns}
        rows={stockLedgerEntries}
        loading={isLoadingLedger}
        emptyMessage="No ledger entries found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || stockLedgerEntries.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey={(row, index) => `${row.name || row.item_code}-${index}`}
      />
    </Box>
  );
};

export default StockLedger;

