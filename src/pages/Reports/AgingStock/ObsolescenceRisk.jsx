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
  GridLegacy as Grid,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const ObsolescenceRisk = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { obsolescenceRisk, getObsolescenceRisk } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    warehouse: '',
    risk_level: 'all',
  });

  // Load report on mount or when filters change
  useEffect(() => {
    if (userCompany) {
      getObsolescenceRisk({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.warehouse, localFilters.risk_level]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      warehouse: newFilters.warehouse || '',
    });
  };

  const handleRiskLevelChange = (event) => {
    setLocalFilters({
      ...localFilters,
      risk_level: event.target.value,
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getObsolescenceRisk({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Filter data by risk level
  const filteredData = obsolescenceRisk.data?.filter((item) => {
    if (localFilters.risk_level === 'all') return true;
    return item.risk_level === localFilters.risk_level;
  }) || [];

  // Prepare chart data
  const chartData = filteredData.map((item) => ({
    item: item.item_code,
    name: item.item_name,
    risk_score: item.risk_score || 0,
    age_days: item.age_days || 0,
    current_stock: item.current_stock || 0,
  }));

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'warehouse', label: 'Warehouse', format: 'text' },
    { key: 'age_days', label: 'Age (Days)', align: 'right', format: 'number' },
    { key: 'last_movement_date', label: 'Last Movement', format: 'date' },
    { key: 'current_stock', label: 'Current Stock', align: 'right', format: 'number' },
    { key: 'risk_score', label: 'Risk Score', align: 'right', format: 'number' },
  ];

  // Risk level color mapping
  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  // Summary statistics
  const summary = obsolescenceRisk.data?.length
    ? {
        totalItems: obsolescenceRisk.data.length,
        highRisk: obsolescenceRisk.data.filter((item) => item.risk_level === 'high').length,
        mediumRisk: obsolescenceRisk.data.filter((item) => item.risk_level === 'medium').length,
        lowRisk: obsolescenceRisk.data.filter((item) => item.risk_level === 'low').length,
        avgRiskScore:
          obsolescenceRisk.data.reduce((sum, item) => sum + (item.risk_score || 0), 0) /
          obsolescenceRisk.data.length,
      }
    : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Obsolescence Risk Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Identify items with high obsolescence risk based on age and movement patterns
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={obsolescenceRisk.loading}
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
          showItemGroup={false}
          showCustomer={false}
          showSearch={false}
          showGroupBy={false}
          required={false}
        />
        <Paper sx={{ p: 2, mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Risk Level</InputLabel>
            <Select
              value={localFilters.risk_level}
              onChange={handleRiskLevelChange}
              label="Risk Level"
            >
              <MenuItem value="all">All Risk Levels</MenuItem>
              <MenuItem value="high">High Risk</MenuItem>
              <MenuItem value="medium">Medium Risk</MenuItem>
              <MenuItem value="low">Low Risk</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Box>

      {/* Loading State */}
      {obsolescenceRisk.loading && !obsolescenceRisk.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {obsolescenceRisk.error && !obsolescenceRisk.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {obsolescenceRisk.error}
        </Alert>
      )}

      {/* Report Content */}
      {obsolescenceRisk.data && !obsolescenceRisk.loading && (
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
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="overline">High Risk</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.highRisk}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <Typography variant="overline">Medium Risk</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.mediumRisk}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="overline">Low Risk</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {summary.lowRisk}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Risk Score Chart */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Risk Score by Item"
              data={chartData}
              dataKey="item"
              series={[
                {
                  dataKey: 'risk_score',
                  name: 'Risk Score',
                  color: '#d32f2f',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {filteredData.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <ReportTable
                title="Obsolescence Risk Analysis"
                data={filteredData.map((item) => ({
                  ...item,
                  risk_level_display: (
                    <Chip
                      label={item.risk_level?.toUpperCase() || 'UNKNOWN'}
                      color={getRiskColor(item.risk_level)}
                      size="small"
                    />
                  ),
                  risk_factors_display: item.risk_factors?.join(', ') || 'None',
                }))}
                columns={[
                  ...tableColumns,
                  {
                    key: 'risk_level_display',
                    label: 'Risk Level',
                    align: 'center',
                    format: 'text',
                  },
                  {
                    key: 'risk_factors_display',
                    label: 'Risk Factors',
                    format: 'text',
                  },
                ]}
              />
            </Box>
          )}
        </>
      )}

      {/* Empty State */}
      {!obsolescenceRisk.loading && !obsolescenceRisk.data && !obsolescenceRisk.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters.
        </Alert>
      )}
    </Container>
  );
};

export default ObsolescenceRisk;

