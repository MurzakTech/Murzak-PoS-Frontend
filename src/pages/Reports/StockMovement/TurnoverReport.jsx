import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const TurnoverReport = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { turnover, getTurnoverReport } = useInventoryReports(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    item_group: '',
  });

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getTurnoverReport({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters.start_date, localFilters.end_date, localFilters.warehouse, localFilters.item_group]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters({
      start_date: newFilters.start_date || '',
      end_date: newFilters.end_date || '',
      warehouse: newFilters.warehouse || '',
      item_group: newFilters.item_group || '',
    });
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      getTurnoverReport({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const chartData = turnover.data?.map((item) => ({
    item: item.item_code,
    name: item.item_name,
    turnover_rate: item.turnover_rate || 0,
    turnover_days: item.turnover_days || 0,
    average_stock: item.average_stock || 0,
    cost_of_sales: item.cost_of_sales || 0,
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'item_name', label: 'Item Name', format: 'text' },
    { key: 'average_stock', label: 'Average Stock', align: 'right', format: 'number' },
    { key: 'cost_of_sales', label: 'Cost of Sales', align: 'right', format: 'currency' },
    { key: 'turnover_rate', label: 'Turnover Rate', align: 'right', format: 'number' },
    { key: 'turnover_days', label: 'Turnover Days', align: 'right', format: 'number' },
  ];

  // Add status chips to table data
  const tableDataWithStatus = turnover.data?.map((item) => ({
    ...item,
    status: item.turnover_rate >= 12 ? 'Fast' : item.turnover_rate >= 6 ? 'Normal' : 'Slow',
  })) || [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Inventory Turnover Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Calculate turnover rates for inventory items to identify fast and slow-moving stock
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={turnover.loading || !localFilters.start_date || !localFilters.end_date}
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
        showItemGroup={true}
        showCustomer={false}
        showSearch={false}
        showGroupBy={false}
        required={true}
      />

      {/* Loading State */}
      {turnover.loading && !turnover.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {turnover.error && !turnover.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {turnover.error}
        </Alert>
      )}

      {/* Report Content */}
      {turnover.data && !turnover.loading && (
        <>
          {/* Bar Chart - Turnover Rate */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Turnover Rate by Item"
              data={chartData}
              dataKey="item"
              series={[
                {
                  dataKey: 'turnover_rate',
                  name: 'Turnover Rate',
                  color: '#1976d2',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Bar Chart - Turnover Days */}
          {chartData.length > 0 && (
            <ReportChart
              type="bar"
              title="Turnover Days by Item"
              data={chartData}
              dataKey="item"
              series={[
                {
                  dataKey: 'turnover_days',
                  name: 'Turnover Days',
                  color: '#ff9800',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {tableDataWithStatus.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <ReportTable
                title="Turnover Analysis"
                data={tableDataWithStatus.map((item) => ({
                  ...item,
                  status_display: (
                    <Chip
                      label={item.status}
                      color={
                        item.status === 'Fast'
                          ? 'success'
                          : item.status === 'Normal'
                          ? 'info'
                          : 'warning'
                      }
                      size="small"
                    />
                  ),
                }))}
                columns={[
                  ...tableColumns,
                  {
                    key: 'status_display',
                    label: 'Status',
                    align: 'center',
                    format: 'text',
                  },
                ]}
              />
            </Box>
          )}
        </>
      )}

      {/* Empty State */}
      {!turnover.loading && !turnover.data && !turnover.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}
    </Container>
  );
};

export default TurnoverReport;

