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
  GridLegacy as Grid,
  Paper,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const ValueTrends = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { valueTrends, getValueTrends } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    period: 'daily',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getValueTrends({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse, localFilters.period]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      ...newFilters,
      period: newFilters.period || localFilters.period,
    });
  };

  const handlePeriodChange = (event) => {
    setLocalFilters({
      ...localFilters,
      period: event.target.value,
    });
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getValueTrends({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = valueTrends.data?.map((item) => ({
    period: item.period,
    total_value: item.total_value || 0,
    change: item.change || 0,
    change_percentage: item.change_percentage || 0,
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'period', label: 'Period', format: 'date' },
    { key: 'total_value', label: 'Total Value', align: 'right', format: 'currency' },
    { key: 'change', label: 'Change', align: 'right', format: 'currency' },
    { key: 'change_percentage', label: 'Change %', align: 'right', format: 'percentage' },
  ];

  // Calculate summary statistics
  const summary = valueTrends.data?.length
    ? {
        currentValue: valueTrends.data[valueTrends.data.length - 1]?.total_value || 0,
        previousValue: valueTrends.data[valueTrends.data.length - 2]?.total_value || 0,
        totalChange: valueTrends.data.reduce((sum, item) => sum + (item.change || 0), 0),
        averageValue:
          valueTrends.data.reduce((sum, item) => sum + (item.total_value || 0), 0) /
          valueTrends.data.length,
      }
    : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Value Trends
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track historical inventory values over time with period grouping
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={valueTrends.loading || !localFilters.start_date || !localFilters.end_date}
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
            <InputLabel>Period Grouping</InputLabel>
            <Select
              value={localFilters.period}
              onChange={handlePeriodChange}
              label="Period Grouping"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Box>

      {/* Loading State */}
      {valueTrends.loading && !valueTrends.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {valueTrends.error && !valueTrends.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {valueTrends.error}
        </Alert>
      )}

      {/* Report Content */}
      {valueTrends.data && !valueTrends.loading && (
        <>
          {/* Summary Cards */}
          {summary && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Current Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    KES {summary.currentValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Previous Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    KES {summary.previousValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Change
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{
                      color: summary.totalChange >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {summary.totalChange >= 0 ? '+' : ''}
                    KES {summary.totalChange.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Average Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    KES {summary.averageValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Line Chart */}
          {chartData.length > 0 && (
            <ReportChart
              type="line"
              title="Inventory Value Trends Over Time"
              data={chartData}
              dataKey="period"
              series={[
                {
                  dataKey: 'total_value',
                  name: 'Total Value',
                  color: '#ed6c02',
                  format: 'currency',
                },
                {
                  dataKey: 'change',
                  name: 'Change',
                  color: '#2e7d32',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Area Chart for Value */}
          {chartData.length > 0 && (
            <ReportChart
              type="line"
              title="Value Trend (Area Style)"
              data={chartData}
              dataKey="period"
              series={[
                {
                  dataKey: 'total_value',
                  name: 'Total Value',
                  color: '#ed6c02',
                  format: 'currency',
                  strokeWidth: 3,
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {valueTrends.data.length > 0 && (
            <ReportTable
              title="Value Trends Data"
              data={valueTrends.data}
              columns={tableColumns}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!valueTrends.loading && !valueTrends.data && !valueTrends.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}
    </Container>
  );
};

export default ValueTrends;

