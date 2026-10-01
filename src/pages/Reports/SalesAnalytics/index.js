import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { GetApp, Refresh } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useSalesAnalytics } from '../../../hooks/useSalesAnalytics';
import ReportFilters from '../../../components/Reports/ReportFilters';
import ReportSummary from '../../../components/Reports/ReportSummary';
import ReportChart from '../../../components/Reports/ReportChart';
import ReportTable from '../../../components/Reports/ReportTable';

const SalesAnalytics = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { data, loading, error, filters, loadReport, exportReport, updateFilters, exportLoading } =
    useSalesAnalytics(userCompany);

  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    warehouse: '',
    item_group: '',
    customer: '',
    group_by: 'date',
  });

  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState('csv');

  // Load report when filters change
  useEffect(() => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      loadReport({
        ...localFilters,
        company: userCompany,
      });
    }
  }, [userCompany, localFilters, loadReport]);

  const handleFiltersChange = (newFilters) => {
    setLocalFilters(newFilters);
    updateFilters(newFilters);
  };

  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportFormatSelect = (format) => {
    setSelectedExportFormat(format);
    setExportMenuAnchor(null);
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    try {
      await exportReport(selectedExportFormat, localFilters);
      setExportDialogOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleRefresh = () => {
    if (userCompany && localFilters.start_date && localFilters.end_date) {
      loadReport({
        ...localFilters,
        company: userCompany,
      });
    }
  };

  // Prepare chart data
  const dailySalesData = data?.daily_sales?.map((day) => ({
    date: day.date,
    total_amount: day.total_amount || 0,
    total_qty: day.total_qty || 0,
    invoice_count: day.invoice_count || 0,
    average_order_value: day.average_order_value || 0,
  })) || [];

  const revenueByGroupData = data?.revenue_by_item_group?.map((group) => ({
    name: group.item_group,
    value: group.total_revenue || 0,
    quantity: group.total_qty || 0,
    percentage: group.percentage || 0,
  })) || [];

  // Table columns configuration
  const tableColumns = [
    { key: 'invoice_no', label: 'Invoice No', format: 'text' },
    { key: 'posting_date', label: 'Date', format: 'date' },
    { key: 'customer', label: 'Customer', format: 'text' },
    { key: 'item_group', label: 'Item Group', format: 'text' },
    { key: 'total_amount', label: 'Total Amount', align: 'right', format: 'currency' },
    { key: 'total_qty', label: 'Quantity', align: 'right', format: 'number' },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Sales Analytics Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive sales analysis with daily trends and revenue breakdowns
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading || !localFilters.start_date || !localFilters.end_date}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<GetApp />}
            onClick={handleExportClick}
            disabled={!data || loading}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={() => handleExportFormatSelect('csv')}>Export as CSV</MenuItem>
            <MenuItem onClick={() => handleExportFormatSelect('excel')}>Export as Excel</MenuItem>
            <MenuItem onClick={() => handleExportFormatSelect('pdf')}>Export as PDF</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Filters */}
      <ReportFilters
        filters={localFilters}
        onFiltersChange={handleFiltersChange}
        showDateRange={true}
        showWarehouse={true}
        showItemGroup={true}
        showCustomer={true}
        showGroupBy={true}
        required={true}
      />

      {/* Loading State */}
      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Content */}
      {data && !loading && (
        <>
          {/* Summary Cards */}
          {data.summary && <ReportSummary data={data.summary} />}

          {/* Daily Sales Chart */}
          {dailySalesData.length > 0 && (
            <ReportChart
              type="line"
              title="Daily Sales Trend"
              data={dailySalesData}
              dataKey="date"
              series={[
                {
                  dataKey: 'total_amount',
                  name: 'Total Sales',
                  color: '#2196f3',
                  format: 'currency',
                },
                {
                  dataKey: 'invoice_count',
                  name: 'Invoice Count',
                  color: '#ff9800',
                  format: 'number',
                },
              ]}
              height={400}
            />
          )}

          {/* Revenue by Item Group Chart */}
          {revenueByGroupData.length > 0 && (
            <ReportChart
              type="pie"
              title="Revenue by Item Group"
              data={revenueByGroupData}
              series={[
                {
                  dataKey: 'value',
                  name: 'Revenue',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Revenue by Item Group Bar Chart */}
          {revenueByGroupData.length > 0 && (
            <ReportChart
              type="bar"
              title="Revenue by Item Group (Bar Chart)"
              data={revenueByGroupData}
              dataKey="name"
              series={[
                {
                  dataKey: 'value',
                  name: 'Total Revenue',
                  color: '#4caf50',
                  format: 'currency',
                },
              ]}
              height={400}
            />
          )}

          {/* Table Data */}
          {data.table_data && data.table_data.length > 0 && (
            <ReportTable
              title="Detailed Sales Data"
              data={data.table_data}
              columns={tableColumns}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !data && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a date range and click refresh to generate the report.
        </Alert>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={selectedExportFormat}
              onChange={(e) => setSelectedExportFormat(e.target.value)}
              label="Export Format"
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExportConfirm}
            variant="contained"
            disabled={exportLoading}
          >
            {exportLoading ? <CircularProgress size={20} /> : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalesAnalytics;

