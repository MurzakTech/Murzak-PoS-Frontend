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
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const MovementPatterns = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { movementPatterns, getMovementPatterns } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    analysis_type: 'trend',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getMovementPatterns({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse, localFilters.analysis_type]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      ...newFilters,
      analysis_type: newFilters.analysis_type || localFilters.analysis_type,
    });
  };

  const handleAnalysisTypeChange = (event) => {
    setLocalFilters({
      ...localFilters,
      analysis_type: event.target.value,
    });
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getMovementPatterns({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare time series chart data
  const timeSeriesData = movementPatterns.data?.time_series?.map((item) => ({
    date: item.date,
    received: item.received || 0,
    issued: item.issued || 0,
    net_movement: item.net_movement || 0,
  })) || [];

  // Prepare trends data
  const trendsData = movementPatterns.data?.trends?.map((item) => ({
    item: item.item_code,
    name: item.item_name,
    trend: item.trend,
    change_percentage: item.change_percentage || 0,
  })) || [];

  // Table columns for trends
  const trendsTableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'trend', label: 'Trend', format: 'text' },
    { key: 'change_percentage', label: 'Change %', align: 'right', format: 'percentage' },
  ];

  // Table columns for time series
  const timeSeriesTableColumns = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'received', label: 'Received', align: 'right', format: 'number' },
    { key: 'issued', label: 'Issued', align: 'right', format: 'number' },
    { key: 'net_movement', label: 'Net Movement', align: 'right', format: 'number' },
  ];

  // Trend color mapping
  const getTrendColor = (trend) => {
    switch (trend) {
      case 'increasing':
        return 'success';
      case 'decreasing':
        return 'error';
      case 'stable':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Movement Patterns
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Analyze movement trends and patterns over time including seasonal and forecast analysis
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={movementPatterns.loading || !localFilters.start_date || !localFilters.end_date}
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
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={localFilters.analysis_type}
              onChange={handleAnalysisTypeChange}
              label="Analysis Type"
            >
              <MenuItem value="trend">Trend Analysis</MenuItem>
              <MenuItem value="seasonal">Seasonal Analysis</MenuItem>
              <MenuItem value="forecast">Forecast Analysis</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Box>

      {/* Loading State */}
      {movementPatterns.loading && !movementPatterns.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {movementPatterns.error && !movementPatterns.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {movementPatterns.error}
        </Alert>
      )}

      {/* Report Content */}
      {movementPatterns.data && !movementPatterns.loading && (
        <>
          {/* Time Series Chart */}
          {timeSeriesData.length > 0 && (
            <ReportChart
              type="line"
              title="Movement Time Series"
              data={timeSeriesData}
              dataKey="date"
              series={[
                {
                  dataKey: 'received',
                  name: 'Received',
                  color: '#4caf50',
                  format: 'number',
                },
                {
                  dataKey: 'issued',
                  name: 'Issued',
                  color: '#f44336',
                  format: 'number',
                },
                {
                  dataKey: 'net_movement',
                  name: 'Net Movement',
                  color: '#2196f3',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Trends Chart */}
          {trendsData.length > 0 && (
            <ReportChart
              type="bar"
              title="Item Movement Trends"
              data={trendsData}
              dataKey="item"
              series={[
                {
                  dataKey: 'change_percentage',
                  name: 'Change Percentage',
                  color: '#ed6c02',
                  format: 'percentage',
                },
              ]}
              height={400}
            />
          )}

          {/* Trends Table */}
          {trendsData.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <ReportTable
                title="Movement Trends by Item"
                data={trendsData.map((item) => ({
                  ...item,
                  trend_display: (
                    <Chip
                      label={item.trend?.toUpperCase() || 'STABLE'}
                      color={getTrendColor(item.trend)}
                      size="small"
                    />
                  ),
                }))}
                columns={[
                  ...trendsTableColumns,
                  {
                    key: 'trend_display',
                    label: 'Trend Status',
                    align: 'center',
                    format: 'text',
                  },
                ]}
              />
            </Box>
          )}

          {/* Time Series Table */}
          {timeSeriesData.length > 0 && (
            <ReportTable
              title="Time Series Data"
              data={timeSeriesData}
              columns={timeSeriesTableColumns}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!movementPatterns.loading && !movementPatterns.data && !movementPatterns.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}
    </Container>
  );
};

export default MovementPatterns;

