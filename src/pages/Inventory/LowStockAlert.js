import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import { Add, Download, Warning } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getLowStockItems, setFilters, resetFilters } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';

const LowStockAlert = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { lowStockItems, isLoadingLowStock, filters } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [threshold, setThreshold] = useState(filters.threshold || 10.0);

  // Initialize filter with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        dispatch(setFilters({ warehouse: warehouseName }));
      }
    }
  }, [activeWarehouse, filters.warehouse, dispatch]);

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      fetchLowStockItems();
    }
  }, [dispatch, userCompany, filters.warehouse, filters.threshold]);

  const fetchLowStockItems = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      threshold: filters.threshold || 10.0,
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      limit: 1000,
    };

    dispatch(getLowStockItems(params));
  };

  const handleFilterChange = (key, value) => {
    if (key === 'threshold') {
      const numValue = parseFloat(value) || 10.0;
      setThreshold(numValue);
      dispatch(setFilters({ threshold: numValue }));
    } else {
      dispatch(setFilters({ [key]: value === '' ? undefined : value }));
    }
    // Trigger refetch after filter change
    setTimeout(() => fetchLowStockItems(), 100);
  };

  const handleClearFilters = () => {
    setThreshold(10.0);
    dispatch(resetFilters());
    setTimeout(() => fetchLowStockItems(), 100);
  };

  const exportToCSV = () => {
    const headers = ['Item Code', 'Item Name', 'Warehouse', 'Actual Qty', 'Projected Qty', 'Item Group'];
    const rows = lowStockItems.map((item) => [
      item.item_code || '',
      item.item_name || '',
      item.warehouse || '',
      item.actual_qty || 0,
      item.projected_qty || 0,
      item.item_group || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'item_code',
      header: 'Item Code',
      width: '15%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'item_name',
      header: 'Item Name',
      width: '20%',
      render: (value) => value || '-',
    },
    {
      field: 'warehouse',
      header: 'Warehouse',
      width: '15%',
      render: (value) => value || '-',
    },
    {
      field: 'item_group',
      header: 'Item Group',
      width: '12%',
      render: (value) => (
        <Chip label={value || '-'} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      field: 'actual_qty',
      header: 'Actual Qty',
      width: '12%',
      align: 'right',
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color="error"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      field: 'projected_qty',
      header: 'Projected Qty',
      width: '12%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2" color="error.main" fontWeight={600}>
          {value || 0}
          </Typography>
      ),
    },
    {
      field: 'stock_uom',
      header: 'Stock UOM',
      width: '8%',
      align: 'right',
      render: (value) => value || '-',
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '6%',
      align: 'right',
      render: (value, row) => (
            <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inventory/material-receipt?item=${row.item_code}`);
          }}
            >
              Create Receipt
            </Button>
      ),
    },
  ], [navigate]);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'number',
      key: 'threshold',
      label: 'Threshold',
      value: threshold.toString(),
      placeholder: '10.0',
      width: 140,
      helperText: 'Items below this quantity',
    },
    {
      type: 'select',
      key: 'warehouse',
      label: 'Warehouse',
      value: filters.warehouse || '',
      options: [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map((wh) => ({
          value: wh.name,
          label: wh.warehouse_name || wh.name,
        })),
      ],
      width: 180,
    },
  ], [threshold, filters.warehouse, warehouses]);

  return (
    <Box>
      <PageHeader
        title="Low Stock Alert"
        subtitle="Items below threshold levels"
        icon={Warning}
        stats={[
          { value: lowStockItems.length, label: 'Items', color: 'warning.main' },
          { value: filters.threshold || 10.0, label: 'Threshold', color: 'text.secondary' },
        ]}
        actions={[
          {
            label: 'Export CSV',
            icon: <Download />,
            onClick: exportToCSV,
            variant: 'outlined',
          },
          {
            label: 'Create Receipt',
            icon: <Add />,
            onClick: () => navigate('/inventory/material-receipt'),
            variant: 'contained',
          },
        ]}
        loading={isLoadingLowStock && lowStockItems.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue=""
          searchPlaceholder=""
          onSearchChange={() => {}}
          filters={filterBarFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          showClearButton={true}
        >
              <Button
            size="small"
                variant="outlined"
                onClick={fetchLowStockItems}
            sx={{ ml: 'auto' }}
              >
                Refresh
              </Button>
        </FilterBar>
      </Box>

        {lowStockItems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Found {lowStockItems.length} item(s) below the threshold of {filters.threshold || 10.0}
          </Alert>
        )}

      <DataTable
        columns={columns}
        rows={lowStockItems}
        loading={isLoadingLowStock}
        emptyMessage="No low stock items found. All items are above the threshold."
        rowKey={(row, index) => `${row.item_code}-${row.warehouse}-${index}`}
      />
      </Box>
  );
};

export default LowStockAlert;

