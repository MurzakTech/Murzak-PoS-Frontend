import React, { useEffect, useMemo } from 'react';
import {
  Box,
  Alert,
} from '@mui/material';
import { Inventory2, AttachMoney, ShoppingCart, Assessment } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchInventorySummary } from '../../../store/reportsSlice';
import PageHeader from '../../../components/Layout/PageHeader';
import DataTable from '../../../components/Layout/DataTable';

const InventorySummary = () => {
  const dispatch = useAppDispatch();
  const { inventorySummary } = useAppSelector((state) => state.reports);
  const { data, loading, error } = inventorySummary;

  useEffect(() => {
    dispatch(fetchInventorySummary());
  }, [dispatch]);

  // Calculate totals
  const totals = data
    ? data.reduce(
        (acc, item) => ({
          totalQty: acc.totalQty + (parseFloat(item.total_qty) || 0),
          totalValue: acc.totalValue + (parseFloat(item.total_value) || 0),
        }),
        { totalQty: 0, totalValue: 0 }
      )
    : { totalQty: 0, totalValue: 0 };

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format currency
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'warehouse',
      header: 'Warehouse',
      width: '40%',
      render: (value) => (
        <Box component="span" sx={{ fontWeight: 500 }}>
          {value || 'N/A'}
        </Box>
      ),
    },
    {
      field: 'total_qty',
      header: 'Total Quantity',
      width: '30%',
      align: 'right',
      render: (value) => formatNumber(parseFloat(value) || 0),
    },
    {
      field: 'total_value',
      header: 'Total Value',
      width: '30%',
      align: 'right',
      render: (value) => (
        <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {formatCurrency(parseFloat(value) || 0)}
        </Box>
      ),
    },
  ], []);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <PageHeader
        title="Inventory Summary Report"
        subtitle="Total stock quantity and value by warehouse"
        icon={Assessment}
        stats={[
          {
            value: data ? data.length : 0,
            label: 'Total Warehouses',
            icon: Inventory2,
            color: '#1976d2',
          },
          {
            value: formatNumber(totals.totalQty),
            label: 'Total Quantity',
            icon: ShoppingCart,
            color: '#2e7d32',
          },
          {
            value: formatCurrency(totals.totalValue),
            label: 'Total Value',
            icon: AttachMoney,
            color: '#ed6c02',
          },
        ]}
        loading={loading && !data}
      />

      <DataTable
        columns={columns}
        rows={data || []}
        loading={loading}
        emptyMessage="No inventory data available"
        pagination={false}
        rowKey={(row, index) => `warehouse-${row.warehouse || index}`}
      />
          </Box>
  );
};

export default InventorySummary;

