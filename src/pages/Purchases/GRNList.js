import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import { Visibility, Inventory } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listGRNs, setPage, setPageSize, setFilters as setGRNFilters, resetFilters } from '../../store/grnSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getSuppliers } from '../../store/supplierSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const GRNList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    grns,
    pagination,
    filters: grnFilters,
    isLoading,
  } = useAppSelector((state) => state.grn);
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { suppliers } = useAppSelector((state) => state.supplier);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Fetch warehouses and suppliers on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getSuppliers({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Fetch GRNs when filters, pagination, or company changes
  useEffect(() => {
    if (userCompany) {
      fetchGRNs();
    }
  }, [dispatch, userCompany, pagination.page, pagination.page_size, grnFilters]);

  const fetchGRNs = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      page: pagination.page,
      page_size: pagination.page_size,
      ...(grnFilters.supplier && { supplier: grnFilters.supplier }),
      ...(grnFilters.purchase_order && { purchase_order: grnFilters.purchase_order }),
      ...(grnFilters.warehouse && { warehouse: grnFilters.warehouse }),
      ...(grnFilters.start_date && { start_date: grnFilters.start_date }),
      ...(grnFilters.end_date && { end_date: grnFilters.end_date }),
      ...(grnFilters.status && { status: grnFilters.status }),
      ...(grnFilters.docstatus !== undefined && { docstatus: grnFilters.docstatus }),
    };

    dispatch(listGRNs(params));
  };

  const handleFilterChange = (key, value) => {
    // Handle special case for docstatus
    if (key === 'docstatus') {
      const docstatusValue = value === '' ? undefined : (value === undefined ? undefined : Number(value));
      dispatch(setGRNFilters({ [key]: docstatusValue })); // setGRNFilters already resets page to 1
    } else {
      dispatch(setGRNFilters({ [key]: value || undefined })); // setGRNFilters already resets page to 1
    }
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
      page: newPage + 1,
      page_size: pagination.page_size,
      ...(grnFilters.supplier && { supplier: grnFilters.supplier }),
      ...(grnFilters.purchase_order && { purchase_order: grnFilters.purchase_order }),
      ...(grnFilters.warehouse && { warehouse: grnFilters.warehouse }),
      ...(grnFilters.start_date && { start_date: grnFilters.start_date }),
      ...(grnFilters.end_date && { end_date: grnFilters.end_date }),
      ...(grnFilters.status && { status: grnFilters.status }),
      ...(grnFilters.docstatus !== undefined && { docstatus: grnFilters.docstatus }),
    };
    dispatch(listGRNs(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      company: userCompany,
      page: 1,
      page_size: newPageSize,
      ...(grnFilters.supplier && { supplier: grnFilters.supplier }),
      ...(grnFilters.purchase_order && { purchase_order: grnFilters.purchase_order }),
      ...(grnFilters.warehouse && { warehouse: grnFilters.warehouse }),
      ...(grnFilters.start_date && { start_date: grnFilters.start_date }),
      ...(grnFilters.end_date && { end_date: grnFilters.end_date }),
      ...(grnFilters.status && { status: grnFilters.status }),
      ...(grnFilters.docstatus !== undefined && { docstatus: grnFilters.docstatus }),
    };
    dispatch(listGRNs(params));
  };

  // Helper functions for status
  const getStatusColor = (status) => {
    if (!status) return undefined;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('received') || statusLower.includes('completed')) {
      return '#10B981'; // success green
    }
    if (statusLower.includes('to bill') || statusLower.includes('pending')) {
      return '#F59E0B'; // warning orange
    }
    return undefined;
  };

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
      header: 'GRN Number',
      width: '12%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'supplier',
      header: 'Supplier',
      width: '15%',
      render: (value, row) => row.supplier_name || value || '-',
    },
    {
      field: 'posting_date',
      header: 'Posting Date',
      width: '10%',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      field: 'set_warehouse',
      header: 'Warehouse',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'purchase_order',
      header: 'Purchase Order',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'grand_total',
      header: 'Total Amount',
      width: '12%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2" fontWeight={600}>
          KES {(value || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '10%',
      render: (value) => {
        if (!value) return '-';
        return (
          <StatusChip
            status={value.toLowerCase().replace(/\s+/g, '_')}
            label={value}
            color={getStatusColor(value)}
          />
        );
      },
    },
    {
      field: 'docstatus',
      header: 'Doc Status',
      width: '10%',
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
      field: 'items_count',
      header: 'Items',
      width: '7%',
      align: 'right',
      render: (value) => value || 0,
    },
    {
      field: 'total_qty',
      header: 'Total Qty',
      width: '10%',
      align: 'right',
      render: (value) => (value || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
      }),
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
            navigate(`/purchases/grns/${row.name}`);
          }}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
      ),
    },
  ], [navigate]);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'supplier',
      label: 'Supplier',
      value: grnFilters.supplier || '',
      options: [
        { value: '', label: 'All Suppliers' },
        ...suppliers.map((supplier) => ({
          value: supplier.name || supplier.supplier_name,
          label: supplier.supplier_name || supplier.name,
        })),
      ],
      width: 160,
    },
    {
      type: 'text',
      key: 'purchase_order',
      label: 'Purchase Order',
      value: grnFilters.purchase_order || '',
      placeholder: 'Search purchase order...',
      width: 160,
    },
    {
      type: 'select',
      key: 'warehouse',
      label: 'Warehouse',
      value: grnFilters.warehouse || '',
      options: [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map((warehouse) => ({
          value: warehouse.name || warehouse.warehouse_name,
          label: warehouse.warehouse_name || warehouse.name,
        })),
      ],
      width: 160,
    },
    {
      type: 'date',
      key: 'start_date',
      label: 'Start Date',
      value: grnFilters.start_date || '',
      width: 140,
    },
    {
      type: 'date',
      key: 'end_date',
      label: 'End Date',
      value: grnFilters.end_date || '',
      width: 140,
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      value: grnFilters.status || '',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'Received', label: 'Received' },
        { value: 'To Bill', label: 'To Bill' },
        { value: 'Completed', label: 'Completed' },
      ],
      width: 140,
    },
    {
      type: 'select',
      key: 'docstatus',
      label: 'Document Status',
      value: grnFilters.docstatus === undefined ? '' : grnFilters.docstatus,
      options: [
        { value: '', label: 'All' },
        { value: 0, label: 'Draft' },
        { value: 1, label: 'Submitted' },
        { value: 2, label: 'Cancelled' },
      ],
      width: 160,
    },
  ], [grnFilters, suppliers, warehouses]);

  return (
    <Box>
      <PageHeader
        title="Goods Receipt Notes (GRN)"
        subtitle="View and manage goods receipt notes"
        icon={Inventory}
        stats={[
          { value: grns.length, label: 'Total GRNs', color: 'primary.main' },
        ]}
        loading={isLoading && grns.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={grnFilters.purchase_order || ''}
          searchPlaceholder="Search by purchase order..."
          onSearchChange={(value) => handleFilterChange('purchase_order', value)}
          filters={filterBarFilters}
          onFilterChange={(key, value) => {
            if (key === 'docstatus') {
              handleFilterChange(key, value === '' ? undefined : Number(value));
            } else {
              handleFilterChange(key, value);
            }
          }}
          onClearFilters={handleClearFilters}
          />
        </Box>

      <DataTable
        columns={columns}
        rows={grns}
        loading={isLoading}
        emptyMessage="No GRNs found"
        pagination={{
          page: pagination.page,
          page_size: pagination.page_size,
          total: pagination.total || grns.length,
          total_pages: pagination.total_pages,
        }}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="name"
        onRowClick={(row) => navigate(`/purchases/grns/${row.name}`)}
      />
    </Box>
  );
};

export default GRNList;
