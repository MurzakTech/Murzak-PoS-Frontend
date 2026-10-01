import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  GridLegacy as Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Pagination,
  InputAdornment,
  IconButton,
  Collapse,
} from '@mui/material';
import { Search, Clear, Download, Visibility, ExpandMore, ExpandLess, FilterList } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listStockEntries,
  setStockEntryPage,
  clearSelectedStockEntry,
} from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';

const StockEntryList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    stockEntries,
    isLoadingStockEntries,
    stockEntryPagination,
  } = useAppSelector((state) => state.inventory);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [filters, setFilters] = useState({
    stock_entry_type: '',
    warehouse: '',
    item_code: '',
    from_date: '',
    to_date: '',
    docstatus: 1, // Default to submitted documents
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      fetchStockEntries();
    }
  }, [dispatch, userCompany, stockEntryPagination.page, filters]);

  const fetchStockEntries = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      page: stockEntryPagination.page,
      page_size: stockEntryPagination.page_size,
      ...(filters.stock_entry_type && { stock_entry_type: filters.stock_entry_type }),
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.item_code && { item_code: filters.item_code }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.docstatus !== undefined && { docstatus: filters.docstatus }),
    };

    dispatch(listStockEntries(params));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    dispatch(setStockEntryPage(1));
  };

  const handlePageChange = (event, value) => {
    dispatch(setStockEntryPage(value));
  };

  const handleResetFilters = () => {
    setFilters({
      stock_entry_type: '',
      warehouse: '',
      item_code: '',
      from_date: '',
      to_date: '',
      docstatus: 1,
    });
    dispatch(setStockEntryPage(1));
  };

  const handleViewDetails = (stockEntryName) => {
    dispatch(clearSelectedStockEntry());
    navigate(`/inventory/stock-entries/${stockEntryName}`);
  };

  const getStatusChip = (docstatus) => {
    switch (docstatus) {
      case 0:
        return <Chip label="Draft" size="small" color="default" />;
      case 1:
        return <Chip label="Submitted" size="small" color="success" />;
      case 2:
        return <Chip label="Cancelled" size="small" color="error" />;
      default:
        return <Chip label="Unknown" size="small" />;
    }
  };

  const getStockEntryTypeColor = (type) => {
    switch (type) {
      case 'Material Receipt':
        return 'success';
      case 'Material Issue':
        return 'error';
      case 'Material Transfer':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Stock Entries
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View and manage all stock entry transactions
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Box>

        {/* Filters */}
        <Collapse in={showFilters}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Stock Entry Type</InputLabel>
                  <Select
                    value={filters.stock_entry_type}
                    label="Stock Entry Type"
                    onChange={(e) => handleFilterChange('stock_entry_type', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="Material Receipt">Material Receipt</MenuItem>
                    <MenuItem value="Material Issue">Material Issue</MenuItem>
                    <MenuItem value="Material Transfer">Material Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={filters.warehouse}
                    label="Warehouse"
                    onChange={(e) => handleFilterChange('warehouse', e.target.value)}
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
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Item Code"
                  value={filters.item_code}
                  onChange={(e) => handleFilterChange('item_code', e.target.value)}
                  placeholder="Search item code"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.docstatus}
                    label="Status"
                    onChange={(e) => handleFilterChange('docstatus', e.target.value)}
                  >
                    <MenuItem value={1}>Submitted</MenuItem>
                    <MenuItem value={0}>Draft</MenuItem>
                    <MenuItem value={2}>Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleResetFilters}
                  sx={{ mr: 2 }}
                >
                  Reset Filters
                </Button>
                <Button
                  variant="contained"
                  onClick={fetchStockEntries}
                >
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Table */}
        <TableContainer component={Paper} sx={{ position: 'relative' }}>
          {isLoadingStockEntries && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Document Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Posting Date</TableCell>
                <TableCell>Warehouse(s)</TableCell>
                <TableCell>Items Count</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockEntries.length === 0 && !isLoadingStockEntries ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No stock entries found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                stockEntries.map((entry) => (
                  <TableRow key={entry.name} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {entry.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.stock_entry_type || entry.purpose}
                        size="small"
                        color={getStockEntryTypeColor(entry.stock_entry_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.posting_date || '-'}
                        {entry.posting_time && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {entry.posting_time}
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {entry.items && entry.items.length > 0 ? (
                        <Box>
                          {entry.items.map((item, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              {item.s_warehouse && `From: ${item.s_warehouse}`}
                              {item.s_warehouse && item.t_warehouse && ' → '}
                              {item.t_warehouse && `To: ${item.t_warehouse}`}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{entry.items_count || entry.items?.length || 0}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        KES {entry.total_amount?.toLocaleString() || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(entry.docstatus)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(entry.name)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {stockEntryPagination.total_pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={stockEntryPagination.total_pages}
              page={stockEntryPagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Summary */}
        {stockEntryPagination.total > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {((stockEntryPagination.page - 1) * stockEntryPagination.page_size) + 1} to{' '}
              {Math.min(stockEntryPagination.page * stockEntryPagination.page_size, stockEntryPagination.total)} of{' '}
              {stockEntryPagination.total} entries
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default StockEntryList;

