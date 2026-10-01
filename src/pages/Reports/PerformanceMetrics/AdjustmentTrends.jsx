import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const AdjustmentTrends = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { adjustmentTrends, getAdjustmentTrends } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    adjustment_type: 'all',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getAdjustmentTrends({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse, localFilters.adjustment_type]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      ...newFilters,
      adjustment_type: newFilters.adjustment_type || localFilters.adjustment_type,
    });
  };

  const handleAdjustmentTypeChange = (event) => {
    setLocalFilters({
      ...localFilters,
      adjustment_type: event.target.value,
    });
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getAdjustmentTrends({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = adjustmentTrends.data?.map((item) => ({
    period: item.period,
    adjustment_count: item.adjustment_count || 0,
    total_adjusted_qty: item.total_adjusted_qty || 0,
    total_adjusted_value: item.total_adjusted_value || 0,
    increase_count: item.increase_count || 0,
    decrease_count: item.decrease_count || 0,
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'period', label: 'Period', format: 'date' },
    { key: 'adjustment_count', label: 'Adjustment Count', align: 'right', format: 'number' },
    { key: 'total_adjusted_qty', label: 'Total Adjusted Qty', align: 'right', format: 'number' },
    { key: 'total_adjusted_value', label: 'Total Adjusted Value', align: 'right', format: 'currency' },
    { key: 'increase_count', label: 'Increases', align: 'right', format: 'number' },
    { key: 'decrease_count', label: 'Decreases', align: 'right', format: 'number' },
  ];

  // Summary statistics
  const summary = adjustmentTrends.data?.length
    ? {
        totalAdjustments: adjustmentTrends.data.reduce((sum, item) => sum + (item.adjustment_count || 0), 0),
        totalQty: adjustmentTrends.data.reduce((sum, item) => sum + (item.total_adjusted_qty || 0), 0),
        totalValue: adjustmentTrends.data.reduce((sum, item) => sum + (item.total_adjusted_value || 0), 0),
        totalIncreases: adjustmentTrends.data.reduce((sum, item) => sum + (item.increase_count || 0), 0),
        totalDecreases: adjustmentTrends.data.reduce((sum, item) => sum + (item.decrease_count || 0), 0),
      }
    : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Adjustment Trends
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track trends in stock adjustments over time with increase/decrease analysis
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={adjustmentTrends.loading || !localFilters.start_date || !localFilters.end_date}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <ReportFilters
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          showDateRange={true}
          showWarehouse={true}
          showItemGroup={false}
          showCustomer={false}
          showSearch={false}
          showGroupBy={false}
          required={true}
        />
        <Paper sx={{ p: 2, mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Adjustment Type</InputLabel>
            <Select
              value={localFilters.adjustment_type}
              onChange={handleAdjustmentTypeChange}
              label="Adjustment Type"
            >
              <MenuItem value="all">All Adjustments</MenuItem>
              <MenuItem value="increase">Increases Only</MenuItem>
              <MenuItem value="decrease">Decreases Only</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Box>

      {/* Loading State */}
      {adjustmentTrends.loading && !adjustmentTrends.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {adjustmentTrends.error && !adjustmentTrends.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {adjustmentTrends.error}
        </Alert>
      )}

      {/* Report Content */}
      {adjustmentTrends.data && !adjustmentTrends.loading && (
        <>
          {/* Summary Cards */}
          {summary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Adjustments
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {summary.totalAdjustments}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Adjusted Quantity
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {summary.totalQty.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Adjusted Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    KES {summary.totalValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Line Chart - Adjustment Count */}
          {chartData.length > 0 && (
            <ReportChart
              type="line"
              title="Adjustment Count Trends"
              data={chartData}
              dataKey="period"
              series={[
                {
                  dataKey: 'adjustment_count',
                  name: 'Adjustment Count',
                  color: '#ed6c02',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Bar Chart - Increases vs Decreases */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Increases vs Decreases"
              data={chartData}
              dataKey="period"
              series={[
                {
                  dataKey: 'increase_count',
                  name: 'Increases',
                  color: '#4caf50',
                  format: 'number',
                },
                {
                  dataKey: 'decrease_count',
                  name: 'Decreases',
                  color: '#f44336',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Line Chart - Adjusted Value */}
          {chartData.length > 0 && (
            <ReportChart
              type="line"
              title="Adjusted Value Trends"
              data={chartData}
              dataKey="period"
              series={[
                {
                  dataKey: 'total_adjusted_value',
                  name: 'Total Adjusted Value',
                  color: '#1976d2',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {adjustmentTrends.data.length > 0 && (
            <ReportTable
              title="Adjustment Trends Data"
              data={adjustmentTrends.data}
              columns={tableColumns}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!adjustmentTrends.loading && !adjustmentTrends.data && !adjustmentTrends.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}
    </Container>
  );
};

export default AdjustmentTrends;

