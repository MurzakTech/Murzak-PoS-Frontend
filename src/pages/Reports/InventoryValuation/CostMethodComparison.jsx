import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  GridLegacy as Grid,
  Paper,
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';

const CostMethodComparison = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { costMethodComparison, getCostMethodComparison } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    warehouse: '',
    cost_methods: ['FIFO', 'LIFO', 'Weighted Average'],
  });

  // Load report on mount or when filters change
  useEffect(() => {
    if (userCompany) {
      getCostMethodComparison({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.warehouse]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      warehouse: newFilters.warehouse || '',
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getCostMethodComparison({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = costMethodComparison.data
    ? Object.entries(costMethodComparison.data).map(([method, data]) => ({
        method,
        total_value: data?.total_value || 0,
        item_count: data?.item_count || 0,
      }))
    : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Cost Method Comparison
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Compare inventory valuation using different cost methods (FIFO, LIFO, Weighted Average)
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={costMethodComparison.loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
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

      {/* Loading State */}
      {costMethodComparison.loading && !costMethodComparison.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {costMethodComparison.error && !costMethodComparison.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {costMethodComparison.error}
        </Alert>
      )}

      {/* Report Content */}
      {costMethodComparison.data && !costMethodComparison.loading && (
        <>
          {/* Comparison Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(costMethodComparison.data).map(([method, data]) => (
              <Grid item xs={12} md={4} key={method}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  <Chip
                    label={method}
                    color="primary"
                    sx={{ mb: 2, fontWeight: 'bold' }}
                  />
                  <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                    KES {data?.total_value?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data?.item_count || 0} items
                  </Typography>
                  {data?.note && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                      {data.note}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Bar Chart Comparison */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Cost Method Comparison"
              data={chartData}
              dataKey="method"
              series={[
                {
                  dataKey: 'total_value',
                  name: 'Total Value',
                  color: '#1976d2',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Info Message */}
          {costMethodComparison.data && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                Note: Currently showing FIFO method. Other methods (LIFO, Weighted Average) require
                separate calculation logic and may not be fully implemented.
              </Typography>
            </Alert>
          )}
        </>
      )}

      {/* Empty State */}
      {!costMethodComparison.loading &&
        !costMethodComparison.data &&
        !costMethodComparison.error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No data available. Try adjusting your filters.
          </Alert>
        )}
    </Container>
  );
};

export default CostMethodComparison;

