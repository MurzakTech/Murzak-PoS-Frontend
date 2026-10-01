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
  Grid,
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
  IconButton,
  Collapse,
} from '@mui/material';
import { ArrowBack, Visibility, FilterList, Clear, Add } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listMaterialIssues,
  setMaterialIssuePage,
} from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';

const MaterialIssuesList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    materialIssues,
    isLoadingMaterialIssues,
    materialIssuePagination,
  } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [filters, setFilters] = useState({
    warehouse: '',
    item_code: '',
    from_date: '',
    to_date: '',
    docstatus: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Initialize filter with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        setFilters((prev) => ({ ...prev, warehouse: warehouseName }));
      }
    }
  }, [activeWarehouse, filters.warehouse]);

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      fetchIssues();
    }
  }, [dispatch, userCompany, materialIssuePagination.page, filters]);

  const fetchIssues = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      page: materialIssuePagination.page,
      page_size: materialIssuePagination.page_size,
      ...(filters.warehouse && { warehouse: filters.warehouse }),
      ...(filters.item_code && { item_code: filters.item_code }),
      ...(filters.from_date && { from_date: filters.from_date }),
      ...(filters.to_date && { to_date: filters.to_date }),
      ...(filters.docstatus !== undefined && { docstatus: filters.docstatus }),
    };

    dispatch(listMaterialIssues(params));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    dispatch(setMaterialIssuePage(1));
  };

  const handlePageChange = (event, value) => {
    dispatch(setMaterialIssuePage(value));
  };

  const handleResetFilters = () => {
    setFilters({
      warehouse: '',
      item_code: '',
      from_date: '',
      to_date: '',
      docstatus: 1,
    });
    dispatch(setMaterialIssuePage(1));
  };

  const handleViewDetails = (stockEntryName) => {
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/inventory')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Material Issues
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View all material issue transactions
              </Typography>
            </Box>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ mr: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/inventory/material-issue')}
            >
              New Issue
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Collapse in={showFilters}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
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
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={2}>
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
                  onClick={fetchIssues}
                >
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Table */}
        <TableContainer component={Paper} sx={{ position: 'relative' }}>
          {isLoadingMaterialIssues && (
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
                <TableCell>Posting Date</TableCell>
                <TableCell>Source Warehouse</TableCell>
                <TableCell>Items Count</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materialIssues.length === 0 && !isLoadingMaterialIssues ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No material issues found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                materialIssues.map((issue) => (
                  <TableRow key={issue.name} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {issue.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {issue.posting_date || '-'}
                        {issue.posting_time && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {issue.posting_time}
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {issue.items && issue.items.length > 0
                        ? issue.items[0].s_warehouse || '-'
                        : '-'}
                    </TableCell>
                    <TableCell>{issue.items_count || issue.items?.length || 0}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        KES {issue.total_amount?.toLocaleString() || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(issue.docstatus)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(issue.name)}
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
        {materialIssuePagination.total_pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={materialIssuePagination.total_pages}
              page={materialIssuePagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Summary */}
        {materialIssuePagination.total > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {((materialIssuePagination.page - 1) * materialIssuePagination.page_size) + 1} to{' '}
              {Math.min(materialIssuePagination.page * materialIssuePagination.page_size, materialIssuePagination.total)} of{' '}
              {materialIssuePagination.total} entries
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default MaterialIssuesList;

