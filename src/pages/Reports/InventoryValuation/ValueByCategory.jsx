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
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const ValueByCategory = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { valueByCategory, getValueByCategory } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    warehouse: '',
    item_group: '',
  });

  // Load report on mount or when filters change
  useEffect(() => {
    if (userCompany) {
      getValueByCategory({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.warehouse, localFilters.item_group]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      warehouse: newFilters.warehouse || '',
      item_group: newFilters.item_group || '',
    });
  };

  const handleRefresh = () => {
    if (userCompany) {
      getValueByCategory({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = valueByCategory.data?.map((item) => ({
    name: item.item_group,
    value: item.total_value || 0,
    quantity: item.total_qty || 0,
    itemCount: item.item_count || 0,
    percentage: item.percentage || 0,
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'item_group', label: 'Item Group', format: 'text' },
    { key: 'total_value', label: 'Total Value', align: 'right', format: 'currency' },
    { key: 'total_qty', label: 'Total Quantity', align: 'right', format: 'number' },
    { key: 'item_count', label: 'Item Count', align: 'right', format: 'number' },
    { key: 'percentage', label: 'Percentage', align: 'right', format: 'percentage' },
  ];

  // Calculate totals for summary
  const totals = valueByCategory.data?.reduce(
    (acc, item) => ({
      totalValue: acc.totalValue + (item.total_value || 0),
      totalQty: acc.totalQty + (item.total_qty || 0),
      totalItems: acc.totalItems + (item.item_count || 0),
    }),
    { totalValue: 0, totalQty: 0, totalItems: 0 }
  ) || { totalValue: 0, totalQty: 0, totalItems: 0 };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Value by Category
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View inventory value breakdown by item category/group
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={valueByCategory.loading}
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
        showItemGroup={true}
        showCustomer={false}
        showSearch={false}
        showGroupBy={false}
        required={false}
      />

      {/* Loading State */}
      {valueByCategory.loading && !valueByCategory.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {valueByCategory.error && !valueByCategory.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {valueByCategory.error}
        </Alert>
      )}

      {/* Report Content */}
      {valueByCategory.data && !valueByCategory.loading && (
        <>
          {/* Summary Cards */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Value
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    KES {totals.totalValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Quantity
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {totals.totalQty.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="overline" color="text.secondary">
                    Total Items
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {totals.totalItems.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Pie Chart */}
          {chartData.length > 0 && (
            <ReportChart
              type="pie"
              title="Value Distribution by Category"
              data={chartData}
              series={[
                {
                  dataKey: 'value',
                  name: 'Value',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Value by Category (Bar Chart)"
              data={chartData}
              dataKey="name"
              series={[
                {
                  dataKey: 'value',
                  name: 'Total Value',
                  color: '#2e7d32',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {valueByCategory.data.length > 0 && (
            <ReportTable
              title="Category Breakdown"
              data={valueByCategory.data}
              columns={tableColumns}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!valueByCategory.loading && !valueByCategory.data && !valueByCategory.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available. Try adjusting your filters.
        </Alert>
      )}
    </Container>
  );
};

export default ValueByCategory;

