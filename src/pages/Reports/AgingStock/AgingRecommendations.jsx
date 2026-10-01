import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportTable from '../../../components/Reports/ReportTable';

const AgingRecommendations = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { recommendations, getAgingRecommendations } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    warehouse: '',
  });

  // Load report on mount or when filters change
  useEffect(() => {
    if (userCompany) {
      getAgingRecommendations({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.warehouse]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      warehouse: newFilters.warehouse || '',
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getAgingRecommendations({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'warehouse', label: 'Warehouse', format: 'text' },
    { key: 'age_bracket', label: 'Age Bracket', format: 'text' },
    { key: 'age_days', label: 'Age (Days)', align: 'right', format: 'number' },
    { key: 'current_stock', label: 'Current Stock', align: 'right', format: 'number' },
  ];

  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Action color mapping
  const getActionColor = (action) => {
    switch (action) {
      case 'dispose':
        return 'error';
      case 'discount':
        return 'warning';
      case 'transfer':
        return 'info';
      case 'monitor':
        return 'success';
      default:
        return 'default';
    }
  };

  // Summary statistics
  const summary = recommendations.data?.length
    ? {
        totalItems: recommendations.data.length,
        highPriority: recommendations.data.filter((item) => item.priority === 'high').length,
        mediumPriority: recommendations.data.filter((item) => item.priority === 'medium').length,
        lowPriority: recommendations.data.filter((item) => item.priority === 'low').length,
        dispose: recommendations.data.filter((item) => item.recommended_action === 'dispose').length,
        discount: recommendations.data.filter((item) => item.recommended_action === 'discount').length,
        transfer: recommendations.data.filter((item) => item.recommended_action === 'transfer').length,
        monitor: recommendations.data.filter((item) => item.recommended_action === 'monitor').length,
      }
    : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Aging Recommendations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get recommended actions for aging stock items to optimize inventory
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={recommendations.loading}
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
      {recommendations.loading && !recommendations.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {recommendations.error && !recommendations.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {recommendations.error}
        </Alert>
      )}

      {/* Report Content */}
      {recommendations.data && !recommendations.loading && (
        <>
          {/* Summary Cards */}
          {summary && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                Priority Summary
              </Typography>
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
                    <Typography variant="overline">High Priority</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.highPriority}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="overline">Medium Priority</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.mediumPriority}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="overline">Low Priority</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.lowPriority}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Recommended Actions Summary
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="overline">Dispose</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.dispose}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="overline">Discount</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.discount}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="overline">Transfer</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.transfer}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="overline">Monitor</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {summary.monitor}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}

          {/* Table Data */}
          {recommendations.data.length > 0 && (
            <ReportTable
              title="Aging Recommendations"
              data={recommendations.data.map((item) => ({
                ...item,
                priority_display: (
                  <Chip
                    label={item.priority?.toUpperCase() || 'UNKNOWN'}
                    color={getPriorityColor(item.priority)}
                    size="small"
                  />
                ),
                action_display: (
                  <Chip
                    label={item.recommended_action?.toUpperCase() || 'NONE'}
                    color={getActionColor(item.recommended_action)}
                    size="small"
                  />
                ),
              }))}
              columns={[
                ...tableColumns,
                {
                  key: 'priority_display',
                  label: 'Priority',
                  align: 'center',
                  format: 'text',
                },
                {
                  key: 'action_display',
                  label: 'Recommended Action',
                  align: 'center',
                  format: 'text',
                },
                {
                  key: 'reason',
                  label: 'Reason',
                  format: 'text',
                },
              ]}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!recommendations.loading && !recommendations.data && !recommendations.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters.
        </Alert>
      )}
    </Container>
  );
};

export default AgingRecommendations;

