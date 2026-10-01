import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';
import WorkflowStatusBadge from './WorkflowStatusBadge';

/**
 * Reconciliation View Component
 * Displays full reconciliation details with stock taking records and audit trail
 * 
 * @param {Object} props
 * @param {string} [props.reconciliationName] - Reconciliation name (optional if reconciliation prop provided)
 * @param {Object} [props.reconciliation] - Reconciliation data (optional, will fetch if not provided)
 * @param {boolean} [props.loading] - Loading state (optional)
 * @param {string} [props.error] - Error message (optional)
 * @returns {JSX.Element}
 */
const ReconciliationView = ({ reconciliationName, reconciliation: propReconciliation, loading: propLoading, error: propError }) => {
  const { getReconciliation, reconciliation: hookReconciliation, loading: hookLoading, error: hookError } = useStockReconciliation();
  
  // Use props if provided, otherwise use hook state
  const reconciliation = propReconciliation || hookReconciliation;
  const loading = propLoading !== undefined ? propLoading : hookLoading;
  const error = propError !== undefined ? propError : hookError;

  // Only fetch if reconciliationName is provided and we don't have reconciliation data
  useEffect(() => {
    if (reconciliationName && !reconciliation && !propReconciliation) {
      getReconciliation(reconciliationName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconciliationName]); // Only depend on reconciliationName

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading reconciliation: {error}
      </Alert>
    );
  }

  if (!reconciliation) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Reconciliation not found or not loaded yet.
        </Alert>
        <Button
          variant="outlined"
          onClick={() => getReconciliation(reconciliationName)}
        >
          Retry Loading
        </Button>
      </Box>
    );
  }

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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Stock Reconciliation: {reconciliation.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <WorkflowStatusBadge status={reconciliation.workflow_state} />
          <Chip
            label={getDocStatusLabel(reconciliation.docstatus)}
            color={getDocStatusColor(reconciliation.docstatus)}
            size="small"
          />
        </Box>
      </Box>

      {/* Reconciliation Info */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reconciliation Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {reconciliation.company || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Warehouse
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {reconciliation.warehouse || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Posting Date
                  </Typography>
                  <Typography variant="body1">
                    {reconciliation.posting_date
                      ? new Date(reconciliation.posting_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Posting Time
                  </Typography>
                  <Typography variant="body1">
                    {reconciliation.posting_time || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Purpose
                  </Typography>
                  <Typography variant="body1">
                    {reconciliation.purpose || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Workflow State
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <WorkflowStatusBadge status={reconciliation.workflow_state} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Document Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={getDocStatusLabel(reconciliation.docstatus)}
                      color={getDocStatusColor(reconciliation.docstatus)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Items
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {reconciliation.items?.length || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock Taking Records Table */}
      {reconciliation.stock_taking_records && reconciliation.stock_taking_records.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Stock Taking Records
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code</TableCell>
                    <TableCell align="right">Current Qty</TableCell>
                    <TableCell align="right">Sales User Qty</TableCell>
                    <TableCell>Sales User Comment</TableCell>
                    <TableCell align="right">Quality Manager Qty</TableCell>
                    <TableCell>Quality Manager Comment</TableCell>
                    <TableCell align="right">Stock Manager Qty</TableCell>
                    <TableCell>Stock Manager Comment</TableCell>
                    <TableCell align="right">
                      <strong>Final Qty</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reconciliation.stock_taking_records.map((record) => (
                    <TableRow key={record.item_code} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {record.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {record.current_qty !== null ? record.current_qty : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {record.sales_person_qty !== null && record.sales_person_qty !== undefined
                          ? record.sales_person_qty
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {record.sales_person_comment || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {record.stock_controller_qty !== null && record.stock_controller_qty !== undefined
                          ? record.stock_controller_qty
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {record.stock_controller_comment || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {record.stock_manager_qty !== null && record.stock_manager_qty !== undefined
                          ? record.stock_manager_qty
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {record.stock_manager_comment || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {record.final_qty}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Audit Trail */}
      {reconciliation.stock_taking_records && reconciliation.stock_taking_records.length > 0 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Audit Trail
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {reconciliation.stock_taking_records.map((record) => (
                <Grid item xs={12} key={record.item_code}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {record.item_code}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {record.sales_person_name && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Sales User:</strong> {record.sales_person_name}
                              {record.sales_person_date && ` on ${new Date(record.sales_person_date).toLocaleDateString()}`}
                            </Typography>
                            <Typography variant="body2">
                              Qty: {record.sales_person_qty !== null && record.sales_person_qty !== undefined
                                ? record.sales_person_qty
                                : 'N/A'}
                              {record.sales_person_comment && ` - ${record.sales_person_comment}`}
                            </Typography>
                          </Box>
                        )}
                        {record.stock_controller_name && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Quality Manager:</strong> {record.stock_controller_name}
                              {record.stock_controller_date && ` on ${new Date(record.stock_controller_date).toLocaleDateString()}`}
                            </Typography>
                            <Typography variant="body2">
                              Qty: {record.stock_controller_qty !== null && record.stock_controller_qty !== undefined
                                ? record.stock_controller_qty
                                : 'N/A'}
                              {record.stock_controller_comment && ` - ${record.stock_controller_comment}`}
                            </Typography>
                          </Box>
                        )}
                        {record.stock_manager_name && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Stock Manager:</strong> {record.stock_manager_name}
                              {record.stock_manager_date && ` on ${new Date(record.stock_manager_date).toLocaleDateString()}`}
                            </Typography>
                            <Typography variant="body2">
                              Qty: {record.stock_manager_qty !== null && record.stock_manager_qty !== undefined
                                ? record.stock_manager_qty
                                : 'N/A'}
                              {record.stock_manager_comment && ` - ${record.stock_manager_comment}`}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight={600}>
                            Final Quantity: {record.final_qty}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      )}

      {(!reconciliation.stock_taking_records || reconciliation.stock_taking_records.length === 0) && (
        <Alert severity="info" sx={{ mt: 3 }}>
          No stock taking records available yet. Stock takes will appear here once users add them.
          <br />
          <Typography variant="body2" sx={{ mt: 1 }}>
            The workflow will progress as each role adds their stock take:
            <br />
            • Sales User → Quality Manager → Stock Manager → Completed
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ReconciliationView;

