import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Search, Clear, FilterList, GetApp } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { getItemGroups } from '../../store/productSlice';
import DateRangePicker from './DateRangePicker';

/**
 * ReportFilters Component
 * Reusable filter component for reports with date range, warehouse, item group, and customer filters
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {Function} props.onExport - Callback for export action (optional)
 * @param {boolean} props.showDateRange - Show date range picker (default: true)
 * @param {boolean} props.showWarehouse - Show warehouse filter (default: true)
 * @param {boolean} props.showItemGroup - Show item group filter (default: true)
 * @param {boolean} props.showCustomer - Show customer filter (default: false)
 * @param {boolean} props.showSearch - Show search field (default: false)
 * @param {boolean} props.showGroupBy - Show group by selector (default: false)
 * @param {boolean} props.required - Whether filters are required (default: false)
 */
const ReportFilters = ({
  filters = {},
  onFiltersChange,
  onExport,
  showDateRange = true,
  showWarehouse = true,
  showItemGroup = true,
  showCustomer = false,
  showSearch = false,
  showGroupBy = false,
  required = false,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { itemGroups } = useAppSelector((state) => state.product);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [localFilters, setLocalFilters] = useState({
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
    warehouse: filters.warehouse || '',
    item_group: filters.item_group || '',
    customer: filters.customer || '',
    search_term: filters.search_term || '',
    group_by: filters.group_by || 'date',
  });

  // Load warehouses and item groups on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getItemGroups());
    }
  }, [dispatch, userCompany]);

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleStartDateChange = (date) => {
    handleFilterChange('start_date', date);
  };

  const handleEndDateChange = (date) => {
    handleFilterChange('end_date', date);
  };

  const handleReset = () => {
    const resetFilters = {
      start_date: '',
      end_date: '',
      warehouse: '',
      item_group: '',
      customer: '',
      search_term: '',
      group_by: 'date',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterList sx={{ mr: 1 }} />
        <Box sx={{ flexGrow: 1 }}>Filters</Box>
        {onExport && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<GetApp />}
            onClick={handleExport}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Clear />}
          onClick={handleReset}
        >
          Reset
        </Button>
      </Box>

      <Grid container spacing={2}>
        {showDateRange && (
          <Grid item xs={12}>
            <DateRangePicker
              startDate={localFilters.start_date}
              endDate={localFilters.end_date}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              required={required}
            />
          </Grid>
        )}

        {showWarehouse && (
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select
                value={localFilters.warehouse}
                onChange={(e) => handleFilterChange('warehouse', e.target.value)}
                label="Warehouse"
              >
                <MenuItem value="">All Warehouses</MenuItem>
                {warehouses.map((wh) => (
                  <MenuItem key={wh.name} value={wh.name}>
                    {wh.warehouse_name || wh.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {showItemGroup && (
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Item Group</InputLabel>
              <Select
                value={localFilters.item_group}
                onChange={(e) => handleFilterChange('item_group', e.target.value)}
                label="Item Group"
              >
                <MenuItem value="">All Groups</MenuItem>
                {itemGroups.map((group) => (
                  <MenuItem key={group.name} value={group.name}>
                    {group.item_group_name || group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {showCustomer && (
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Customer"
              value={localFilters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
            />
          </Grid>
        )}

        {showGroupBy && (
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Group By</InputLabel>
              <Select
                value={localFilters.group_by}
                onChange={(e) => handleFilterChange('group_by', e.target.value)}
                label="Group By"
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="item_group">Item Group</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {showSearch && (
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={localFilters.search_term}
              onChange={(e) => handleFilterChange('search_term', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment:
                  localFilters.search_term && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleFilterChange('search_term', '')}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
              }}
            />
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default ReportFilters;

