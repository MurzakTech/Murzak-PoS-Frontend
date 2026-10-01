import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Container,
  Menu,
  Pagination,
  FormLabel,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Visibility,
  Inventory2,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';
import { listWarehouses } from '../../store/warehouseSlice';
import { listMultiLevelReconciliations } from '../../store/inventorySlice';
import WorkflowStatusBadge from '../../components/StockReconciliation/WorkflowStatusBadge';

/**
 * Multi-Level Stock Reconciliation List Page
 * Displays all multi-level stock reconciliations with filters and search
 */
const MultiLevelReconciliation = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const {
    multiLevelReconciliations,
    isLoadingMultiLevelReconciliation,
    multiLevelReconciliationListPagination,
  } = useAppSelector((state) => state.inventory);

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Fetch reconciliations when filters change
  useEffect(() => {
    if (userCompany) {
      const params = {
        company: userCompany,
        limit,
        offset,
        ...(warehouseFilter && { warehouse: warehouseFilter }),
        ...(statusFilter && { workflow_state: statusFilter }),
        ...(fromDate && { from_date: fromDate }),
        ...(toDate && { to_date: toDate }),
      };
      dispatch(listMultiLevelReconciliations(params));
    }
  }, [dispatch, userCompany, limit, offset, warehouseFilter, statusFilter, fromDate, toDate]);

  const handleMenuOpen = (event, reconciliation) => {
    setAnchorEl(event.currentTarget);
    setSelectedReconciliation(reconciliation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReconciliation(null);
  };

  const handleView = (reconciliationName) => {
    navigate(`/inventory/multi-level-reconciliation/${reconciliationName}`);
    handleMenuClose();
  };

  const handleStockTake = (reconciliationName) => {
    navigate(`/inventory/multi-level-reconciliation/${reconciliationName}/stock-take`);
    handleMenuClose();
  };

  const handlePageChange = (event, value) => {
    setOffset((value - 1) * limit);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil((multiLevelReconciliationListPagination?.total_count || 0) / limit);

  const getDocStatusLabel = (docstatus) => {
    if (docstatus === 0) return 'Draft';
    if (docstatus === 1) return 'Submitted';
    if (docstatus === 2) return 'Cancelled';
    return 'Unknown';
  };

  const getDocStatusColor = (docstatus) => {
    if (docstatus === 0) return 'default';
    if (docstatus === 1) return 'success';
    if (docstatus === 2) return 'error';
    return 'default';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Stock Reconciliation
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/inventory/multi-level-reconciliation/new')}
          >
            Create Reconciliation
          </Button>
        </Box>

        {/* Search and Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
  <Grid container spacing={3}>

    {/* Warehouse */}
    <Grid item xs={12} sm={6} md={3}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
          Warehouse
        </FormLabel>
        <Select
          value={warehouseFilter}
          onChange={(e) => {
            setWarehouseFilter(e.target.value);
            setOffset(0);
          }}
          displayEmpty
        >
          <MenuItem value="">All Warehouses</MenuItem>
          {warehouses.map((wh) => {
            const value = wh.name || wh.warehouse_name;
            return (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Grid>

    {/* Workflow Status */}
    <Grid item xs={12} sm={6} md={2}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
          Workflow State
        </FormLabel>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          displayEmpty
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="Pending Sales User">Pending Sales User</MenuItem>
          <MenuItem value="Pending Quality Manager">Pending Quality Manager</MenuItem>
          <MenuItem value="Pending Stock Manager">Pending Stock Manager</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* From Date */}
    <Grid item xs={12} sm={6} md={2}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
          From Date
        </FormLabel>
        <TextField
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setOffset(0);
          }}
        />
      </FormControl>
    </Grid>

    {/* To Date */}
    <Grid item xs={12} sm={6} md={2}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
          To Date
        </FormLabel>
        <TextField
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setOffset(0);
          }}
        />
      </FormControl>
    </Grid>

    {/* Total Count */}
    <Grid item xs={12} sm={6} md={3}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
          Records
        </FormLabel>
        <Box sx={{ display: 'flex', alignItems: 'center', height: 56 }}>
          <Chip
            label={`Total: ${multiLevelReconciliationListPagination?.total_count || 0}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </FormControl>
    </Grid>

  </Grid>
</Paper>


        {/* Reconciliations Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reconciliation Name</TableCell>
                  <TableCell>Warehouse</TableCell>
                  <TableCell>Posting Date</TableCell>
                  <TableCell>Workflow State</TableCell>
                  <TableCell>Document Status</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingMultiLevelReconciliation ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : multiLevelReconciliations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Inventory2 sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          No reconciliations found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {warehouseFilter || statusFilter || fromDate || toDate
                            ? 'No reconciliations match your filters. Try adjusting your search criteria.'
                            : 'Create a new multi-level stock reconciliation to get started'}
                        </Typography>
                        {!(warehouseFilter || statusFilter || fromDate || toDate) && (
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/inventory/multi-level-reconciliation/new')}
                          >
                            Create Reconciliation
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  multiLevelReconciliations.map((recon) => (
                    <TableRow key={recon.name} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleView(recon.name)}
                        >
                          {recon.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{recon.warehouse || '-'}</TableCell>
                      <TableCell>
                        {recon.posting_date
                          ? new Date(recon.posting_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <WorkflowStatusBadge status={recon.workflow_state} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getDocStatusLabel(recon.docstatus)}
                          color={getDocStatusColor(recon.docstatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{recon.items_count || 0}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, recon)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Pagination */}
        {multiLevelReconciliations.length > 0 && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => handleView(selectedReconciliation?.name)}>
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            View Details
          </MenuItem>
          {selectedReconciliation?.workflow_state !== 'Completed' && (
            <MenuItem onClick={() => handleStockTake(selectedReconciliation?.name)}>
              <Inventory2 sx={{ mr: 1 }} fontSize="small" />
              Add Stock Take
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Container>
  );
};

export default MultiLevelReconciliation;

