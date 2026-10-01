import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  TextField,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Refresh, ExpandMore } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { useInventoryReports } from '../../../hooks/useInventoryReports';
import ReportTable from '../../../components/Reports/ReportTable';

const StockAging = () => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const { stockAging, getStockAging } = useInventoryReports(userCompany);

  const [slowMovingThreshold, setSlowMovingThreshold] = useState(5);

  // Load report on mount
  useEffect(() => {
    getStockAging({
      slow_moving_threshold: slowMovingThreshold,
    });
  }, [slowMovingThreshold]);

  const handleRefresh = () => {
    getStockAging({
      slow_moving_threshold: slowMovingThreshold,
    });
  };

  const handleThresholdChange = (event) => {
    const value = parseFloat(event.target.value) || 0;
    setSlowMovingThreshold(value);
  };

  // Age brackets
  const ageBrackets = ['0-30', '31-60', '61-90', '90+'];

  // Table columns configuration
  const tableColumns = [
    { key: 'item_code', label: 'Item Code', format: 'text' },
    { key: 'warehouse', label: 'Warehouse', format: 'text' },
    { key: 'actual_qty', label: 'Quantity', align: 'right', format: 'number' },
    { key: 'age_days', label: 'Age (Days)', align: 'right', format: 'number' },
    { key: 'movement_rate', label: 'Movement Rate', align: 'right', format: 'number' },
  ];

  // Calculate totals for each bracket
  const calculateBracketTotals = (bracket) => {
    const items = stockAging.data?.[bracket] || [];
    return {
      itemCount: items.length,
      totalQty: items.reduce((sum, item) => sum + (item.actual_qty || 0), 0),
      avgAge: items.length > 0
        ? items.reduce((sum, item) => sum + (item.age_days || 0), 0) / items.length
        : 0,
      slowMovingCount: items.filter((item) => item.is_slow_moving).length,
    };
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Stock Aging Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View stock aging report with movement rate and slow-moving threshold analysis
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={stockAging.loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Slow Moving Threshold Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Slow Moving Threshold (Movement Rate)"
          type="number"
          value={slowMovingThreshold}
          onChange={handleThresholdChange}
          helperText="Items with movement rate below this threshold will be marked as slow-moving"
          inputProps={{ min: 0, step: 0.1 }}
        />
      </Paper>

      {/* Loading State */}
      {stockAging.loading && !stockAging.data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {stockAging.error && !stockAging.data && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {stockAging.error}
        </Alert>
      )}

      {/* Report Content */}
      {stockAging.data && !stockAging.loading && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {ageBrackets.map((bracket) => {
              const totals = calculateBracketTotals(bracket);
              return (
                <Grid item xs={12} sm={6} md={3} key={bracket}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="overline" color="text.secondary">
                      {bracket} Days
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                      {totals.itemCount} Items
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {totals.totalQty.toLocaleString()} units
                    </Typography>
                    {totals.slowMovingCount > 0 && (
                      <Chip
                        label={`${totals.slowMovingCount} slow-moving`}
                        color="warning"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* Age Brackets Accordion */}
          {ageBrackets.map((bracket) => {
            const items = stockAging.data[bracket] || [];
            const totals = calculateBracketTotals(bracket);

            if (items.length === 0) return null;

            return (
              <Accordion key={bracket} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                    <Typography variant="h6">
                      {bracket} Days ({totals.itemCount} items)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={`${totals.totalQty.toLocaleString()} units`}
                        size="small"
                        variant="outlined"
                      />
                      {totals.slowMovingCount > 0 && (
                        <Chip
                          label={`${totals.slowMovingCount} slow-moving`}
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <ReportTable
                    data={items.map((item) => ({
                      ...item,
                      slow_moving_display: item.is_slow_moving ? (
                        <Chip label="Slow Moving" color="warning" size="small" />
                      ) : (
                        <Chip label="Active" color="success" size="small" />
                      ),
                    }))}
                    columns={[
                      ...tableColumns,
                      {
                        key: 'slow_moving_display',
                        label: 'Status',
                        align: 'center',
                        format: 'text',
                      },
                    ]}
                  />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </>
      )}

      {/* Empty State */}
      {!stockAging.loading && !stockAging.data && !stockAging.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No data available.
        </Alert>
      )}
    </Container>
  );
};

export default StockAging;

