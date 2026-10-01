import React from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';

/**
 * TransferFilters Component
 * Filter component for stock transfer requests
 * 
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Function} props.onReset - Callback to reset filters
 * @param {Array} [props.warehouses=[]] - Available warehouses for filter
 * @param {boolean} [props.showDateRange=true] - Show date range filters
 * @returns {JSX.Element} Filter component
 * 
 * @example
 * <TransferFilters
 *   filters={filters}
 *   onFilterChange={updateFilters}
 *   onReset={resetFilters}
 *   warehouses={warehouses}
 * />
 */
const TransferFilters = ({
  filters = {},
  onFilterChange,
  onReset,
  warehouses = [],
  showDateRange = true,
}) => {
  const handleFilterChange = (field, value) => {
    if (onFilterChange) {
      onFilterChange({ [field]: value });
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  const hasActiveFilters = () => {
    return !!(
      filters.status ||
      filters.origin_warehouse ||
      filters.destination_warehouse ||
      filters.from_date ||
      filters.to_date
    );
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterList color="primary" />
          <Typography variant="h6">Filters</Typography>
        </Box>
        {hasActiveFilters() && (
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={handleReset}
            color="secondary"
          >
            Clear Filters
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Status Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Submitted">Submitted</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="In Transit">In Transit</MenuItem>
              <MenuItem value="Partially In Transit">Partially In Transit</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Partially Received">Partially Received</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Origin Warehouse Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Origin Warehouse</InputLabel>
            <Select
              value={filters.origin_warehouse || ''}
              label="Origin Warehouse"
              onChange={(e) => handleFilterChange('origin_warehouse', e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.name || warehouse} value={warehouse.name || warehouse}>
                  {warehouse.warehouse_name || warehouse.name || warehouse}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Destination Warehouse Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Destination Warehouse</InputLabel>
            <Select
              value={filters.destination_warehouse || ''}
              label="Destination Warehouse"
              onChange={(e) => handleFilterChange('destination_warehouse', e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.name || warehouse} value={warehouse.name || warehouse}>
                  {warehouse.warehouse_name || warehouse.name || warehouse}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range Filters */}
        {showDateRange && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="From Date"
                type="date"
                value={filters.from_date || ''}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="To Date"
                type="date"
                value={filters.to_date || ''}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
          </>
        )}
      </Grid>
    </Paper>
  );
};

export default TransferFilters;

