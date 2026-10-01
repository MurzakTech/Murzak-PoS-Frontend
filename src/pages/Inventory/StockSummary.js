import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  Container,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  LinearProgress,
  Divider,
  IconButton,
  alpha,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  Alert,
  TextField,
  Backdrop,
  InputAdornment,
} from '@mui/material';
import {
  Download,
  Discount,
  MoreVert,
  Visibility,
  Edit,
  Inventory,
  TrendingUp,
  Warning,
  ArrowUpward,
  ArrowDownward,
  Assessment,
  Info
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getStockSummary,
  setFilters,
  setPage,
  setPageSize,
  resetFilters,
} from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getItemGroups } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import blue from '../../assets/blue.png';
import green from '../../assets/green.png';
import orange from '../../assets/orange.png';
import purple from '../../assets/purple.png';


// Helper functions from Customers pattern
const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getStockLevelColor = (actualQty, minQty, maxQty) => {
  if (actualQty <= 0) return 'error';
  if (minQty !== undefined && actualQty <= minQty) return 'warning';
  if (maxQty !== undefined && actualQty >= maxQty * 0.9) return 'info';
  return 'success';
};

const getStockLevelPercentage = (actualQty, maxQty) => {
  if (!maxQty || maxQty <= 0) return null;
  return Math.min((actualQty / maxQty) * 100, 100);
};

const StatCard = ({ title, value, subtitle, icon, color, trend, trendValue, vector, loading = false, compact = false }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
      
        '&::after': vector
          ? {
              content: '""',
              position: 'absolute',
              bottom: -12,
              right: -12,
              width: compact ? 120 : 160,
              height: compact ? 120 : 160,
              backgroundImage: `url(${vector})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              opacity: 0.25,
              pointerEvents: 'none',
            }
          : {},
        height: '100%',
        minHeight: compact ? 120 : 160, // Reduced height for compact
        borderRadius: compact ? 2 : 3, // Smaller border radius
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)', // Reduced shadow
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: theme.palette.mode === 'dark'
          ? theme.palette.background.paper
          : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', // Faster transition
        '&:hover': {
          transform: compact ? 'translateY(-2px)' : 'translateY(-4px)', // Smaller hover lift
          boxShadow: compact ? '0 8px 24px rgba(0,0,0,0.06)' : '0 16px 48px rgba(0,0,0,0.08)',
          borderColor: alpha(color, 0.3),
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: compact ? 3 : 4, // Thinner gradient bar
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
          borderRadius: compact ? '2px 2px 0 0' : '3px 3px 0 0',
        },
      }}
    >
      <CardContent   sx={{
    position: 'relative',
    zIndex: 1,
    p: compact ? 2 : 3,
  }}> {/* Reduced padding */}
        <Box display="flex" flexDirection="column" height="100%">
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={compact ? 1 : 2}>
            <Box>
              <Typography
                variant="overline"
                fontWeight="600"
                color="text.secondary"
                sx={{
                  fontSize: compact ? '0.65rem' : '0.7rem', // Smaller font
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              {loading ? (
                <Box sx={{ height: compact ? 32 : 40, display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={compact ? 16 : 20} /> {/* Smaller loader */}
                </Box>
              ) : (
                <Typography
                  variant={compact ? "h5" : "h4"} // Smaller heading
                  fontWeight="700"
                  color="text.primary"
                  sx={{
                    mt: 0.25,
                    fontSize: compact ? '1.25rem' : undefined,
                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  KES {value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: compact ? 1 : 1.5, // Smaller padding
                borderRadius: compact ? 1.5 : 2, // Smaller radius
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: compact ? '1.25rem' : '1.5rem' } })}
            </Box>
          </Box>

          {/* Subtitle and Trend */}
          <Box sx={{ mt: 'auto' }}>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: compact ? '0.8rem' : '0.85rem', // Smaller subtitle
                  mb: compact ? 0.5 : 1,
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </Typography>
            )}
            
            {trend && trendValue && (
              <Box display="flex" alignItems="center" gap={0.5}>
                {trend === 'up' ? (
                  <ArrowUpward sx={{ fontSize: compact ? 14 : 16, color: theme.palette.success.main }} />
                ) : (
                  <ArrowDownward sx={{ fontSize: compact ? 14 : 16, color: theme.palette.error.main }} />
                )}
                <Typography
                  variant="caption"
                  fontWeight="600"
                  color={trend === 'up' ? 'success.main' : 'error.main'}
                  sx={{
                    fontSize: compact ? '0.7rem' : '0.8rem', // Smaller trend text
                  }}
                >
                  {trendValue}% {trend === 'up' ? 'inc' : 'dec'} {/* Abbreviated */}
                </Typography>
                {!compact && ( // Hide "from last period" text in compact mode
                  <Typography variant="caption" color="text.secondary">
                    from last period
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const StockSummary = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { stockSummary, isLoadingSummary, pagination, filters, selectedItem, isLoadingDetails } =
    useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { itemGroups } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [searchTerm, setSearchTerm] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editValuationDialogOpen, setEditValuationDialogOpen] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Initialize filter with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        dispatch(setFilters({ warehouse: warehouseName }));
      }
    }
  }, [activeWarehouse, filters.warehouse, dispatch]);

  // Fetch data
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getItemGroups());
    }
  }, [dispatch, userCompany]);

  useEffect(() => {
    if (userCompany) {
      fetchSummary();
    }
  }, [dispatch, userCompany, pagination.page, pagination.page_size, filters.warehouse, filters.item_group, showLowStockOnly]);

  const fetchSummary = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.item_group && { item_group: filters.item_group }),
      ...(showLowStockOnly && { low_stock_only: true }),
      limit: pagination.page_size,
      offset: (pagination.page - 1) * pagination.page_size,
    };

    dispatch(getStockSummary(params));
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value === '' ? null : value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setShowLowStockOnly(false);
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setFilters({ search: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable/TablePagination uses 0-indexed pages, API uses 1-indexed
    dispatch(setPage(newPage + 1));
    const params = {
      company: userCompany,
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.item_group && { item_group: filters.item_group }),
      ...(showLowStockOnly && { low_stock_only: true }),
      limit: pagination.page_size,
      offset: newPage * pagination.page_size,
    };
    dispatch(getStockSummary(params));
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    dispatch(setPage(1));
    const params = {
      company: userCompany,
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.item_group && { item_group: filters.item_group }),
      ...(showLowStockOnly && { low_stock_only: true }),
      limit: newPageSize,
      offset: 0,
    };
    dispatch(getStockSummary(params));
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItemData(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewOpen = async (item) => {
    setSelectedItemData(item);
    setViewDialogOpen(true);
    handleMenuClose();
    
    // Fetch detailed item information
    // if (item.item_code && userCompany) {
    //   await dispatch(
    //     getItemStockDetails({
    //       item_code: item.item_code,
    //       company: userCompany,
    //       warehouse: filters.warehouse,
    //     })
    //   );
    // }
  };

  const handleViewClose = () => {
    setViewDialogOpen(false);
    if (!editValuationDialogOpen) {
      setSelectedItemData(null);
    }
  };

  const handleEditValuationOpen = (item) => {
    // Valuation rate isn't directly editable — it's derived from stock transactions.
    // The correct way to adjust it is a Stock Reconciliation entry, which already
    // supports a per-item valuation_rate override.
    handleMenuClose();
    navigate(`/inventory/stock-reconciliation?item=${encodeURIComponent(item.item_code)}`);
  };

  const handleEditValuationClose = () => {
    setEditValuationDialogOpen(false);
    if (!viewDialogOpen) {
      setSelectedItemData(null);
    }
  };

  const onEditValuationSubmit = async (data) => {
    if (!selectedItemData || !userCompany) return;

    const updateData = {
      item_code: selectedItemData.item_code,
      company: userCompany,
      valuation_rate: Number(data.valuation_rate),
      ...(data.notes && { notes: data.notes }),
      ...(filters.warehouse && { warehouse: filters.warehouse }),
    };

    // const result = await dispatch(updateItemValuation(updateData));

    // if (result.type === 'inventory/updateItemValuation/fulfilled') {
    //   handleEditValuationClose();
    //   dispatch(
    //     showNotification({
    //       message: 'Valuation rate updated successfully',
    //       severity: 'success',
    //       title: 'Update Successful',
    //     })
    //   );
    //   fetchSummary(); // Refresh the list
    // }
  };

  const handleCreateDiscountRule = (item) => {
    if (!item || !item.item_code) return;
    navigate(`/settings/inventory-discounts/new?item_code=${encodeURIComponent(item.item_code)}`);
  };

  const exportToCSV = async () => {
    try {
      setExportProgress(0);
      
      // Simulate progress for large datasets
      const totalItems = stockSummary.length;
      const chunkSize = 1000;
      const chunks = Math.ceil(totalItems / chunkSize);
      
      const headers = [
        'Item Code',
        'Item Name',
        'Item Group',
        'Warehouse',
        'Actual Qty',
        'Reserved Qty',
        'Projected Qty',
        'Stock Value',
        'Valuation Rate',
        'Stock Level %',
        'Status',
        'Last Updated',
      ];

      let csvContent = [headers];

      for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = stockSummary.slice(i, i + chunkSize);
        const chunkRows = chunk.map((item) => [
          item.item_code || '',
          item.item_name || '',
          item.item_group || '',
          item.warehouse || '',
          item.actual_qty || 0,
          item.reserved_qty || 0,
          item.projected_qty || 0,
          item.stock_value || 0,
          item.valuation_rate || 0,
          getStockLevelPercentage(item.actual_qty, item.max_qty)?.toFixed(1) || '',
          getStockLevelColor(item.actual_qty, item.min_qty, item.max_qty),
          item.modified || '',
        ]);

        csvContent = [...csvContent, ...chunkRows];
        setExportProgress(Math.min(Math.round(((i + chunkSize) / totalItems) * 100), 100));
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const csvString = csvContent
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock-summary-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(0);
      
      dispatch(
        showNotification({
          message: `Exported ${totalItems} items successfully`,
          severity: 'success',
          title: 'Export Complete',
        })
      );
    } catch (error) {
      console.error('Export failed:', error);
      dispatch(
        showNotification({
          message: 'Export failed. Please try again.',
          severity: 'error',
          title: 'Export Error',
        })
      );
      setExportProgress(0);
    }
  };

  // Memoized filtered summary with enhanced filtering
  const filteredSummary = useMemo(() => {
    let filtered = stockSummary;

    // Client-side search (fallback if server-side search not implemented)
    if (searchTerm && !filters.search) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        return (
          (item.item_code || '').toLowerCase().includes(searchLower) ||
          (item.item_name || '').toLowerCase().includes(searchLower) ||
          (item.item_group || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter((item) => {
        if (item.min_qty !== undefined && item.actual_qty <= item.min_qty) return true;
        if (item.actual_qty <= 0) return true;
        return false;
      });
    }

    return filtered;
  }, [stockSummary, searchTerm, filters.search, showLowStockOnly]);

  // Prepare table columns
  const columns = useMemo(() => [
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
      field: 'item_name',
      header: 'Item Name',
      width: '18%',
      render: (value) => value || '-',
    },
    {
      field: 'item_group',
      header: 'Item Group',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'warehouse',
      header: 'Warehouse',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'actual_qty',
      header: 'Actual Qty',
      width: '10%',
      align: 'right',
      render: (value, row) => (
        <Typography
          variant="body2"
          color={
            value <= 0
              ? 'error.main'
              : row.min_qty !== undefined && value <= row.min_qty
              ? 'warning.main'
              : 'text.primary'
          }
          fontWeight={600}
        >
          {formatNumber(value)}
        </Typography>
      ),
    },
    {
      field: 'reserved_qty',
      header: 'Reserved Qty',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Chip
          label={formatNumber(value)}
          size="small"
          color={value > 0 ? 'warning' : 'default'}
          variant={value > 0 ? 'filled' : 'outlined'}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'projected_qty',
      header: 'Projected Qty',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Typography
          variant="body2"
          color={value < 0 ? 'error.main' : 'text.primary'}
          fontWeight={500}
        >
          {formatNumber(value)}
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
          KES {formatNumber(value)}
        </Typography>
      ),
    },
    {
      field: 'stock_level',
      header: 'Stock Level',
      width: '12%',
      align: 'center',
      render: (value, row) => {
        const percentage = getStockLevelPercentage(row.actual_qty, row.max_qty);
        const color = getStockLevelColor(row.actual_qty, row.min_qty, row.max_qty);
        return (
          <Box sx={{ minWidth: 120 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={percentage || 0}
                color={color}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" sx={{ minWidth: 40 }}>
                {percentage ? `${percentage.toFixed(0)}%` : '-'}
              </Typography>
            </Box>
            {row.min_qty !== undefined && (
              <Typography variant="caption" color="text.secondary" display="block">
                Min: {formatNumber(row.min_qty)}
              </Typography>
            )}
          </Box>
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
      width: 180,
    },
    {
      type: 'select',
      key: 'item_group',
      label: 'Item Group',
      value: filters.item_group || '',
      allLabel: 'All Item Groups',
      options: itemGroups
        .filter((group) => (group.item_group_name || group.name || '').trim().toLowerCase() !== 'all item groups')
        .map((group) => ({
          value: group.name,
          label: group.name,
        })),
      width: 160,
    },
    {
      type: 'chip',
      key: 'low_stock_only',
      label: 'Low Stock Only',
      value: showLowStockOnly,
    },
  ], [filters, warehouses, itemGroups, showLowStockOnly, dispatch]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
{/* ===================== HEADER ===================== */}
<PageHeader
  title="Stock Summary"
  subtitle="View stock levels and inventory across warehouses"
  icon={Assessment}
  stats={[
    {
      value: stockSummary.length,
      label: 'Total Items',
      color: '#2196f3',
    },
    {
      value: stockSummary.reduce((sum, item) => sum + (item.stock_value || 0), 0).toLocaleString(),
      label: 'Total Value',
      color: '#4caf50',
    },
    {
      value: stockSummary.filter((item) => item.actual_qty <= 0).length,
      label: 'Out of Stock',
      color: '#f44336',
    },
    {
      value: stockSummary.filter((item) => item.min_qty != null && item.actual_qty <= item.min_qty).length,
      label: 'Low Stock',
      color: '#ff9800',
    },
  ]}
  actions={[
    {
      label: exportProgress > 0 ? `Exporting... ${exportProgress}%` : 'Export CSV',
      icon: <Download />,
      onClick: exportToCSV,
      variant: 'outlined',
      disabled: stockSummary.length === 0 || exportProgress > 0,
    },
    {
      label: 'Stock Adjustment',
      icon: <Inventory />,
      onClick: () => navigate('/inventory/stock-reconciliation'),
      variant: 'contained',
    },
  ]}
  loading={isLoadingSummary && stockSummary.length === 0}
/>
{/* ===================== STATS SUMMARY ===================== */}
<Grid container spacing={3} sx={{ mb: 4 }}>
  {[
    {
      title: 'Total Items',
      value: stockSummary.length,
      subtitle: `Total: ${stockSummary.length.toLocaleString()} items`,
      icon: <TrendingUp />,
      color: '#2196f3',
      trend: 'up',
      vector: blue,
      trendValue: 12.5, // optional / static unless you calculate it
    },
    {
      title: 'Total Stock Value',
      value: stockSummary.reduce(
        (sum, item) => sum + (item.stock_value || 0),
        0
      ),
      subtitle: `Total: KES ${stockSummary
        .reduce(
          (sum, item) => sum + (item.stock_value || 0),
          0
        )
        .toLocaleString()}`,
      icon: <Inventory />,
      color: '#4caf50',
      trend: 'up',
      vector: green,
      trendValue: 3.2,
    },
    {
      title: 'Out of Stock',
      value: stockSummary.filter(
        (item) => item.actual_qty <= 0
      ).length,
      subtitle: `${
        stockSummary.filter((item) => item.actual_qty <= 0).length
      } items`,
      icon: <Warning />,
      color: '#f44336',
      vector: orange,
    },
    {
      title: 'Low Stock Items',
      value: stockSummary.filter(
        (item) =>
          item.min_qty != null &&
          item.actual_qty <= item.min_qty
      ).length,
      subtitle: `${
        stockSummary.filter(
          (item) =>
            item.min_qty != null &&
            item.actual_qty <= item.min_qty
        ).length
      } items`,
      icon: <Warning />,
      color: '#ff9800',
      vector: orange,
    },
  ].map((stat, index) => (
    <Grid item xs={12} sm={6} md={3} key={index}>
      <StatCard
        {...stat}
        compact
      />
    </Grid>
  ))}
</Grid>

{/* ===================== FILTERS ===================== */}
<Box sx={{ mb: 2 }}>
  <FilterBar
    searchValue={searchTerm}
    searchPlaceholder="Search items by code, name, or group..."
    onSearchChange={handleSearch}
    filters={filterBarFilters}
    onFilterChange={(key, value) => {
      if (key === 'low_stock_only') {
        setShowLowStockOnly(value);
        dispatch(setPage(1));
        // useEffect will handle the fetch when showLowStockOnly changes
      } else {
        handleFilterChange(key, value);
        // useEffect will handle the fetch when filters change
      }
    }}
    onClearFilters={handleClearFilters}
  />
</Box>





        {/* Stock Summary Table */}
        <DataTable
          columns={columns}
          rows={filteredSummary}
          loading={isLoadingSummary}
          emptyMessage="No stock items found matching your criteria"
          pagination={{
            page: pagination.page,
            page_size: pagination.page_size,
            total: pagination.total || filteredSummary.length,
            total_pages: pagination.total_pages,
          }}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowKey={(row, index) => `${row.item_code}-${row.warehouse}-${index}`}
          onRowClick={(row) => handleViewOpen(row)}
        />

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleViewOpen(selectedItemData);
            }}
          >
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            View Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleEditValuationOpen(selectedItemData);
            }}
          >
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit Valuation
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleCreateDiscountRule(selectedItemData);
            }}
          >
            <Discount sx={{ mr: 1 }} fontSize="small" />
            Create Discount Rule
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate(`/inventory/stock-reconciliation?item=${encodeURIComponent(selectedItemData.item_code)}`);
            }}
          >
            <Inventory sx={{ mr: 1 }} fontSize="small" />
            Adjust Stock
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate(`/inventory/stock-ledger?item=${encodeURIComponent(selectedItemData.item_code)}`);
            }}
          >
            <TrendingUp sx={{ mr: 1 }} fontSize="small" />
            View Movement
          </MenuItem>
        </Menu>

        {/* View Item Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={handleViewClose} maxWidth="md" fullWidth>
          <DialogTitle>Item Stock Details</DialogTitle>
          <DialogContent>
            {isLoadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Item Code
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedItemData?.item_code || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Item Name
                  </Typography>
                  <Typography variant="body1">
                    {selectedItemData?.item_name || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Item Group
                  </Typography>
                  <Typography variant="body1">
                    {selectedItemData?.item_group || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Warehouse
                  </Typography>
                  <Typography variant="body1">
                    {selectedItemData?.warehouse || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    UOM
                  </Typography>
                  <Typography variant="body1">
                    {selectedItemData?.uom || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Stock Quantities
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Actual Quantity
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color={
                        selectedItemData?.actual_qty <= 0
                          ? 'error.main'
                          : selectedItemData?.min_qty !== undefined &&
                            selectedItemData?.actual_qty <= selectedItemData?.min_qty
                          ? 'warning.main'
                          : 'success.main'
                      }
                    >
                      {formatNumber(selectedItemData?.actual_qty)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Reserved Quantity
                    </Typography>
                    <Typography variant="h5" fontWeight={600} color="warning.main">
                      {formatNumber(selectedItemData?.reserved_qty)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Projected Quantity
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color={selectedItemData?.projected_qty < 0 ? 'error.main' : 'success.main'}
                    >
                      {formatNumber(selectedItemData?.projected_qty)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Stock Level
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={getStockLevelPercentage(
                          selectedItemData?.actual_qty,
                          selectedItemData?.max_qty
                        )}
                        color={getStockLevelColor(
                          selectedItemData?.actual_qty,
                          selectedItemData?.min_qty,
                          selectedItemData?.max_qty
                        )}
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {getStockLevelPercentage(selectedItemData?.actual_qty, selectedItemData?.max_qty)
                          ? `${getStockLevelPercentage(
                              selectedItemData?.actual_qty,
                              selectedItemData?.max_qty
                            ).toFixed(1)}%`
                          : 'N/A'}
                      </Typography>
                    </Box>
                    {selectedItemData?.min_qty !== undefined && (
                      <Typography variant="caption" color="text.secondary">
                        Minimum: {formatNumber(selectedItemData.min_qty)} |{' '}
                        {selectedItemData?.max_qty !== undefined &&
                          `Maximum: ${formatNumber(selectedItemData.max_qty)}`}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Valuation
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Valuation Rate
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    KES {formatNumber(selectedItemData?.valuation_rate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Stock Value
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="primary.main">
                    KES {formatNumber(selectedItemData?.stock_value)}
                  </Typography>
                </Grid>

                {selectedItem?.last_purchase_rate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Last Purchase Rate
                    </Typography>
                    <Typography variant="body1">
                      KES {formatNumber(selectedItem.last_purchase_rate)}
                    </Typography>
                  </Grid>
                )}

                {selectedItem?.last_purchase_date && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Last Purchase Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedItem.last_purchase_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}

                {selectedItemData?.actual_qty <= 0 && (
                  <Grid item xs={12}>
                    <Alert severity="error" icon={<Warning />}>
                      This item is out of stock
                    </Alert>
                  </Grid>
                )}

                {selectedItemData?.min_qty !== undefined &&
                  selectedItemData?.actual_qty <= selectedItemData?.min_qty && (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<Info />}>
                        Stock is below minimum level ({selectedItemData.min_qty})
                      </Alert>
                    </Grid>
                  )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              pt: 2,
              zIndex: 1,
            }}
          >
            <Button onClick={handleViewClose}>Close</Button>
            <Button
              variant="contained"
              onClick={() => {
                handleViewClose();
                handleEditValuationOpen(selectedItemData);
              }}
            >
              Edit Valuation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Valuation Dialog */}
        <Dialog
          open={editValuationDialogOpen}
          onClose={handleEditValuationClose}
          maxWidth="sm"
          fullWidth
        >
          <form onSubmit={handleEditSubmit(onEditValuationSubmit)}>
            <DialogTitle>Edit Valuation Rate</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Item: {selectedItemData?.item_code} - {selectedItemData?.item_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="valuation_rate"
                    control={editControl}
                    rules={{
                      required: 'Valuation rate is required',
                      min: { value: 0, message: 'Rate cannot be negative' },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Valuation Rate (KES)"
                        type="number"
                        fullWidth
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">KES</InputAdornment>
                          ),
                        }}
                        error={!!editErrors.valuation_rate}
                        helperText={editErrors.valuation_rate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock: {formatNumber(selectedItemData?.actual_qty)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    New Value: KES{' '}
                    {(
                      (selectedItemData?.actual_qty || 0) *
                      (editControl._formValues?.valuation_rate || 0)
                    ).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Notes (Optional)"
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Reason for valuation change..."
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Changing the valuation rate will affect the total stock value. This action
                    will be logged in the audit trail.
                  </Alert>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditValuationClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">
                Update Valuation
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Export Progress Backdrop */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={exportProgress > 0 && exportProgress < 100}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Exporting Data...
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {exportProgress}% complete
            </Typography>
            <LinearProgress
              variant="determinate"
              value={exportProgress}
              sx={{ mt: 2, width: 300 }}
            />
          </Box>
        </Backdrop>
      </Box>
    </Container>
  );
};

export default StockSummary;
