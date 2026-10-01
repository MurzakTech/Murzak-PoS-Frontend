import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  GridLegacy as Grid,
  Paper,
  TextField,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const DaysOnHand = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { daysOnHand, getDaysOnHand } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    warehouse: '',
    item_group: '',
    period_days: 30,
  });

  // Load report on mount or when filters change
  useEffect(() => {
    if (userCompany) {
      getDaysOnHand({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.warehouse, localFilters.item_group, localFilters.period_days]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      warehouse: newFilters.warehouse || '',
      item_group: newFilters.item_group || '',
    });
  };

  const handlePeriodDaysChange = (event) => {
    setLocalFilters({
      ...localFilters,
      period_days: parseInt(event.target.value) || 30,
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getDaysOnHand({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = daysOnHand.data?.map((item) => ({
    item: item.item_code,
    name: item.item_name,
    days_on_hand: item.days_on_hand || 0,
    current_stock: item.current_stock || 0,
    avg_daily_sales: item.avg_daily_sales || 0,
    status: item.status || 'normal',
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'warehouse', label: 'Warehouse', format: 'text' },
    { key: 'current_stock', label: 'Current Stock', align: 'right', format: 'number' },
    { key: 'avg_daily_sales', label: 'Avg Daily Sales', align: 'right', format: 'number' },
    { key: 'days_on_hand', label: 'Days on Hand', align: 'right', format: 'number' },
  ];

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
        return 'success';
      case 'low':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  // Summary statistics
  const summary = daysOnHand.data?.length
    ? {
        totalItems: daysOnHand.data.length,
        normalItems: daysOnHand.data.filter((item) => item.status === 'normal').length,
        lowItems: daysOnHand.data.filter((item) => item.status === 'low').length,
        criticalItems: daysOnHand.data.filter((item) => item.status === 'critical').length,
      }
    : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Days on Hand Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Calculate days of stock remaining based on current stock and average consumption
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={daysOnHand.loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <ReportFilters
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          showDateRange={false}
          showWarehouse={true}
          showItemGroup={true}
          showCustomer={false}
          showSearch={false}
          showGroupBy={false}
          required={false}
        />
        <Paper sx={{ p: 2, mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Period Days (for average consumption calculation)"
            type="number"
            value={localFilters.period_days}
            onChange={handlePeriodDaysChange}
            helperText="Number of days to calculate average consumption (default: 30)"
            inputProps={{ min: 1, max: 365 }}
          />
        </Paper>
      </Box>

      {/* Loading State */}
      {daysOnHand.loading && !daysOnHand.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {daysOnHand.error && !daysOnHand.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {daysOnHand.error}
        </Alert>
      )}

      {/* Report Content */}
      {daysOnHand.data && !daysOnHand.loading && (
        <>
          {/* Summary Cards */}
          {summary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Items
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {summary.totalItems}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="overline">Normal Status</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.normalItems}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="overline">Low Status</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.lowItems}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="overline">Critical Status</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.criticalItems}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Bar Chart - Days on Hand */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Days on Hand by Item"
              data={chartData}
              dataKey="item"
              series={[
                {
                  dataKey: 'days_on_hand',
                  name: 'Days on Hand',
                  color: '#2e7d32',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {daysOnHand.data.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <ReportTable
                title="Days on Hand Analysis"
                data={daysOnHand.data.map((item) => ({
                  ...item,
                  status_display: (
                    <Chip
                      label={item.status?.toUpperCase() || 'NORMAL'}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  ),
                }))}
                columns={[
                  ...tableColumns,
                  {
                    key: 'status_display',
                    label: 'Status',
                    align: 'center',
                    format: 'text',
                  },
                ]}
              />
            </Box>
          )}
        </>
      )}

      {/* Empty State */}
      {!daysOnHand.loading && !daysOnHand.data && !daysOnHand.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters.
        </Alert>
      )}
    </Container>
  );
};

export default DaysOnHand;

