import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportTable from '../../../components/Reports/ReportTable';

const VarianceReport = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { variance, getInventoryVariance } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    variance_threshold: '',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany) {
      const params = {
        ...localFilters,
        company: userCompany,
      };
      if (localFilters.variance_threshold) {
        params.variance_threshold = parseFloat(localFilters.variance_threshold);
      }
      getInventoryVariance(params);
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse, localFilters.variance_threshold]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      ...localFilters,
      ...newFilters,
      variance_threshold: newFilters.variance_threshold || localFilters.variance_threshold,
    });
  };

  const handleThresholdChange = (event) => {
    setLocalFilters({
      ...localFilters,
      variance_threshold: event.target.value,
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      const params = {
        ...localFilters,
        company: userCompany,
      };
      if (localFilters.variance_threshold) {
        params.variance_threshold = parseFloat(localFilters.variance_threshold);
      }
      getInventoryVariance(params);
    }
  };

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'book_qty', label: 'Book Quantity', align: 'right', format: 'number' },
    { key: 'counted_qty', label: 'Counted Quantity', align: 'right', format: 'number' },
    { key: 'variance_qty', label: 'Variance Qty', align: 'right', format: 'number' },
    { key: 'variance_value', label: 'Variance Value', align: 'right', format: 'currency' },
    { key: 'variance_percentage', label: 'Variance %', align: 'right', format: 'percentage' },
    { key: 'reconciliation_date', label: 'Reconciliation Date', format: 'date' },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Variance Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get detailed variance analysis from stock counts with threshold filtering
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={variance.loading}
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
          required={false}
        />
        <Paper sx={{ p: 2, mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Variance Threshold (Minimum variance value to include)"
            type="number"
            value={localFilters.variance_threshold}
            onChange={handleThresholdChange}
            helperText="Only show variances above this threshold value"
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Paper>
      </Box>

      {/* Loading State */}
      {variance.loading && !variance.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {variance.error && !variance.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {variance.error}
        </Alert>
      )}

      {/* Report Content */}
      {variance.data && !variance.loading && (
        <>
          {/* Table Data */}
          {variance.data.length > 0 ? (
            <ReportTable
              title="Variance Analysis"
              data={variance.data.map((item) => ({
                ...item,
                variance_type: item.variance_qty > 0 ? 'positive' : item.variance_qty < 0 ? 'negative' : 'zero',
                variance_display: (
                  <Chip
                    label={item.variance_qty > 0 ? 'Over' : item.variance_qty < 0 ? 'Under' : 'Match'}
                    color={item.variance_qty > 0 ? 'success' : item.variance_qty < 0 ? 'error' : 'default'}
                    size="small"
                  />
                ),
              }))}
              columns={[
                ...tableColumns,
                {
                  key: 'variance_display',
                  label: 'Variance Type',
                  align: 'center',
                  format: 'text',
                },
              ]}
            />
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              No variances found matching the current filters.
            </Alert>
          )}
        </>
      )}

      {/* Empty State */}
      {!variance.loading && !variance.data && !variance.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters or date range.
        </Alert>
      )}
    </Container>
  );
};

export default VarianceReport;

