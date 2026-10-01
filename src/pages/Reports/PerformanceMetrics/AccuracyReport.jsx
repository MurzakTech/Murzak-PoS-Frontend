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
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';

const AccuracyReport = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { accuracy, getInventoryAccuracy } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany) {
      getInventoryAccuracy({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      start_date: newFilters.start_date || '',
      end_date: newFilters.end_date || '',
      warehouse: newFilters.warehouse || '',
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getInventoryAccuracy({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  const data = accuracy.data;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Accuracy Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get stock accuracy metrics comparing book vs actual inventory counts
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={accuracy.loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <ReportFilters
        filters={localFilters}
        onFiltersChange={handleFiltersChange}
        showDateRange={true}
        showWarehouse={true}
        showItemGroup={false}
        showCustomer={false}
        showSearch={false}
        showGroupBy={false}
        required={false}
      />

      {/* Loading State */}
      {accuracy.loading && !accuracy.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {accuracy.error && !accuracy.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {accuracy.error}
        </Alert>
      )}

      {/* Report Content */}
      {data && !accuracy.loading && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Warehouse
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.warehouse || 'N/A'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Total Items Counted
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.total_items_counted || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Items with Variance
                </Typography>
                <Typography variant="h5" color="error" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.items_with_variance || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Accuracy Rate
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{
                    mt: 1,
                    color:
                      (data.accuracy_rate || 0) >= 95
                        ? 'success.main'
                        : (data.accuracy_rate || 0) >= 90
                        ? 'warning.main'
                        : 'error.main',
                  }}
                >
                  {(data.accuracy_rate || 0).toFixed(2)}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Additional Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Variance Summary
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Variance Count:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.variance_count || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Variance Value:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="error.main">
                      KES {(data.total_variance_value || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Accuracy Assessment
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {data.accuracy_rate >= 95
                      ? '✅ Excellent accuracy rate. Inventory management is performing well.'
                      : data.accuracy_rate >= 90
                      ? '⚠️ Good accuracy rate. Consider reviewing variance items.'
                      : '❌ Accuracy rate needs improvement. Review counting procedures and investigate variances.'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Empty State */}
      {!accuracy.loading && !accuracy.data && !accuracy.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters or date range.
        </Alert>
      )}
    </Container>
  );
};

export default AccuracyReport;

