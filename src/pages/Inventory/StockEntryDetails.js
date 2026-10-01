import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  GridLegacy as Grid,
  Divider,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { ArrowBack, Print, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getStockEntryDetails,
  clearSelectedStockEntry,
  updateStockEntry,
  submitStockEntry,
  cancelStockEntry,
} from '../../store/inventorySlice';

const StockEntryDetails = () => {
  const navigate = useNavigate();
  const { stockEntryName } = useParams();
  const dispatch = useAppDispatch();
  const { selectedStockEntry, isLoadingStockEntryDetails, isLoading } = useAppSelector(
    (state) => state.inventory
  );

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (stockEntryName) {
      dispatch(getStockEntryDetails({ stock_entry_name: stockEntryName }));
    }

    return () => {
      dispatch(clearSelectedStockEntry());
    };
  }, [dispatch, stockEntryName]);

  const refreshEntry = () => {
    if (stockEntryName) {
      dispatch(getStockEntryDetails({ stock_entry_name: stockEntryName }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedStockEntry?.name) return;

    const result = await dispatch(submitStockEntry({ stock_entry_name: selectedStockEntry.name }));
    if (result.type === 'inventory/submitStockEntry/fulfilled') {
      refreshEntry();
    }
  };

  const handleCancel = async () => {
    if (!selectedStockEntry?.name) return;

    const result = await dispatch(
      cancelStockEntry({
        stock_entry_name: selectedStockEntry.name,
        reason: cancelReason || undefined,
      })
    );
    if (result.type === 'inventory/cancelStockEntry/fulfilled') {
      setCancelDialogOpen(false);
      setCancelReason('');
      refreshEntry();
    }
  };

  const handleEdit = () => {
    // Navigate to edit page - for now, navigate to stock entry form
    // In the future, we could create a dedicated edit page or pass the entry data
    navigate(`/inventory/stock-entry?edit=${selectedStockEntry.name}`);
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

  if (isLoadingStockEntryDetails) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedStockEntry) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => navigate('/inventory/stock-entries')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Stock Entry Details
            </Typography>
          </Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Stock entry not found
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/inventory/stock-entries')}>
                Back to List
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  const entry = selectedStockEntry;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/inventory/stock-entries')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                Stock Entry Details
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {entry.name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Action buttons based on document status */}
            {entry.docstatus === 0 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEdit}
                  disabled={isLoading}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  Submit
                </Button>
              </>
            )}
            {entry.docstatus === 1 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={() => setCancelDialogOpen(true)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button variant="outlined" onClick={() => navigate('/inventory/stock-entries')}>
              Back to List
            </Button>
          </Box>
        </Box>

        {/* Document Information */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Document Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Document Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box>{getStatusChip(entry.docstatus)}</Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Stock Entry Type
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={entry.stock_entry_type || entry.purpose}
                        size="small"
                        color={getStockEntryTypeColor(entry.stock_entry_type)}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Purpose
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.purpose || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.posting_date || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Posting Time
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.posting_time || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.company || '-'}
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
                  Financial Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Outgoing Value
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {entry.total_outgoing_value?.toLocaleString() || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Incoming Value
                    </Typography>
                    <Typography variant="body1" fontWeight={500} color="success.main">
                      KES {entry.total_incoming_value?.toLocaleString() || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Additional Costs
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {entry.total_additional_costs?.toLocaleString() || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      KES {entry.total_amount?.toLocaleString() || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Items Count
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entry.items_count || entry.items?.length || 0} item(s)
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Items Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Code</TableCell>
                  <TableCell>Item Name</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Source Warehouse</TableCell>
                  <TableCell>Target Warehouse</TableCell>
                  <TableCell align="right">Basic Rate</TableCell>
                  <TableCell align="right">Valuation Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.items && entry.items.length > 0 ? (
                  entry.items.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.item_name || '-'}</TableCell>
                      <TableCell align="right">{item.qty || 0}</TableCell>
                      <TableCell>{item.s_warehouse || '-'}</TableCell>
                      <TableCell>{item.t_warehouse || '-'}</TableCell>
                      <TableCell align="right">
                        KES {item.basic_rate?.toLocaleString() || '0.00'}
                      </TableCell>
                      <TableCell align="right">
                        KES {item.valuation_rate?.toLocaleString() || '0.00'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          KES {item.amount?.toLocaleString() || '0.00'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No items found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Cancel Stock Entry</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Are you sure you want to cancel this stock entry? This action cannot be undone.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Cancellation (Optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setCancelDialogOpen(false);
              setCancelReason('');
            }}>
              No, Keep It
            </Button>
            <Button
              onClick={handleCancel}
              variant="contained"
              color="error"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Yes, Cancel Entry'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default StockEntryDetails;

