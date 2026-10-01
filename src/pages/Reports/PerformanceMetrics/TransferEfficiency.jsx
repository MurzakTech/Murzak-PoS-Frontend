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

const TransferEfficiency = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { transferEfficiency, getTransferEfficiency } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    from_warehouse: '',
    to_warehouse: '',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getTransferEfficiency({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.from_warehouse, localFilters.to_warehouse]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      ...newFilters,
      from_warehouse: newFilters.from_warehouse || localFilters.from_warehouse,
      to_warehouse: newFilters.to_warehouse || localFilters.to_warehouse,
    });
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getTransferEfficiency({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  const data = transferEfficiency.data;

  // Calculate percentages
  const completionRate = data?.total_transfers
    ? ((data.completed_transfers / data.total_transfers) * 100).toFixed(2)
    : 0;
  const cancellationRate = data?.total_transfers
    ? ((data.cancelled_transfers / data.total_transfers) * 100).toFixed(2)
    : 0;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Transfer Efficiency
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get metrics on stock transfer performance including completion rates and accuracy
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={transferEfficiency.loading || !localFilters.start_date || !localFilters.end_date}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <ReportFilters
        filters={localFilters}
        onFiltersChange={handleFiltersChange}
        showDateRange={true}
        showWarehouse={false}
        showItemGroup={false}
        showCustomer={false}
        showSearch={false}
        showGroupBy={false}
        required={true}
      />

      {/* Note: We'll need to add from_warehouse and to_warehouse filters manually */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Note: Warehouse filters for source and destination warehouses can be added here if needed.
        </Typography>
      </Paper>

      {/* Loading State */}
      {transferEfficiency.loading && !transferEfficiency.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {transferEfficiency.error && !transferEfficiency.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {transferEfficiency.error}
        </Alert>
      )}

      {/* Report Content */}
      {data && !transferEfficiency.loading && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  Total Transfers
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.total_transfers || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="overline">Completed</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.completed_transfers || 0}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {completionRate}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <Typography variant="overline">Pending</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.pending_transfers || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                <Typography variant="overline">Cancelled</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
                  {data.cancelled_transfers || 0}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {cancellationRate}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Performance Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Average Completion Time
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {data.average_completion_time_hours?.toFixed(1) || '0.0'} hrs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Average time to complete transfers
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Transfer Accuracy
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    color:
                      (data.transfer_accuracy || 0) >= 95
                        ? 'success.main'
                        : (data.transfer_accuracy || 0) >= 90
                        ? 'warning.main'
                        : 'error.main',
                  }}
                >
                  {(data.transfer_accuracy || 0).toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Accuracy of completed transfers
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  On-Time Rate
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    color:
                      (data.on_time_rate || 0) >= 95
                        ? 'success.main'
                        : (data.on_time_rate || 0) >= 90
                        ? 'warning.main'
                        : 'error.main',
                  }}
                >
                  {(data.on_time_rate || 0).toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Percentage of transfers completed on time
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Performance Assessment */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Assessment
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {completionRate >= 95 && data.transfer_accuracy >= 95 && data.on_time_rate >= 95
                  ? '✅ Excellent transfer performance. All metrics are above 95%.'
                  : completionRate >= 90 && data.transfer_accuracy >= 90 && data.on_time_rate >= 90
                  ? '⚠️ Good transfer performance. Consider reviewing pending transfers.'
                  : '❌ Transfer performance needs improvement. Review processes and investigate issues.'}
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Empty State */}
      {!transferEfficiency.loading && !transferEfficiency.data && !transferEfficiency.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}
    </Container>
  );
};

export default TransferEfficiency;

