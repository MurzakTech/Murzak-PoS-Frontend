import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  Container,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Refresh,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getPOSOpeningEntry,
  closePOSOpeningEntry,
  cancelPOSOpeningEntry,
  clearSelectedPOSOpeningEntry,
} from '../../store/salesSlice';

const POSOpeningEntryDetails = () => {
  const navigate = useNavigate();
  const { name } = useParams();
  const dispatch = useAppDispatch();
  const {
    selectedPOSOpeningEntry,
    isLoadingPOSOpeningDetails,
    isClosingPOSOpening,
    isCancellingPOSOpening,
    posOpeningEntry,
  } = useAppSelector((state) => state.sales);

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const entry = selectedPOSOpeningEntry;

  useEffect(() => {
    if (name) {
      dispatch(getPOSOpeningEntry({ name }));
    }

    return () => {
      dispatch(clearSelectedPOSOpeningEntry());
    };
  }, [dispatch, name]);

  const handleClose = () => {
    setCloseDialogOpen(true);
  };

  const handleCancel = () => {
    setCancelDialogOpen(true);
  };

  const handleCloseConfirm = async () => {
    if (!entry) return;

    const result = await dispatch(closePOSOpeningEntry({
      pos_opening_entry: entry.name,
      do_not_submit: false,
    }));

    if (closePOSOpeningEntry.fulfilled.match(result)) {
      setCloseDialogOpen(false);
      // Refresh entry details
      dispatch(getPOSOpeningEntry({ name: entry.name }));
    }
  };

  const handleCancelConfirm = async () => {
    if (!entry) return;

    const result = await dispatch(cancelPOSOpeningEntry({
      name: entry.name,
      reason: cancelReason,
    }));

    if (cancelPOSOpeningEntry.fulfilled.match(result)) {
      setCancelDialogOpen(false);
      setCancelReason('');
      // Refresh entry details
      dispatch(getPOSOpeningEntry({ name: entry.name }));
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Draft':
        return <Chip label="Draft" size="small" color="default" />;
      case 'Open':
        return <Chip label="Open" size="small" color="success" />;
      case 'Closed':
        return <Chip label="Closed" size="small" color="info" />;
      case 'Cancelled':
        return <Chip label="Cancelled" size="small" color="error" />;
      default:
        return <Chip label={status || 'Unknown'} size="small" />;
    }
  };

  const canClose = entry?.status === 'Open';
  const canCancel = entry?.status === 'Draft' || entry?.status === 'Open';

  if (isLoadingPOSOpeningDetails) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!entry) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/sales/pos-opening-entries')}
            sx={{ mb: 2 }}
          >
            Back to List
          </Button>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="error">
              POS Opening Entry not found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              The entry you're looking for doesn't exist or has been deleted.
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/sales/pos-opening-entries')}
              sx={{ mb: 1 }}
            >
              Back to List
            </Button>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              POS Opening Entry Details
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {entry.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => dispatch(getPOSOpeningEntry({ name: entry.name }))}
              disabled={isLoadingPOSOpeningDetails}
            >
              Refresh
            </Button>
            {canClose && (
              <Button
                variant="contained"
                startIcon={<CloseIcon />}
                onClick={handleClose}
                disabled={isClosingPOSOpening}
              >
                Close Entry
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={isCancellingPOSOpening}
              >
                Cancel Entry
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Main Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Entry Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Entry Name
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(entry.status)}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    POS Profile
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.pos_profile}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.company}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    User/Cashier
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.user}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Posting Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.posting_date
                      ? new Date(entry.posting_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Period Start Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.period_start_date
                      ? new Date(entry.period_start_date).toLocaleString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Period End Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.period_end_date
                      ? new Date(entry.period_end_date).toLocaleString()
                      : 'Not closed yet'}
                  </Typography>
                </Grid>
                {entry.pos_closing_entry && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Closing Entry
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {entry.pos_closing_entry}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.creation
                      ? new Date(entry.creation).toLocaleString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Last Modified
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {entry.modified
                      ? new Date(entry.modified).toLocaleString()
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Balance Details */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Opening Balance Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {entry.balance_details && entry.balance_details.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Payment Method</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entry.balance_details.map((balance, index) => (
                        <TableRow key={index}>
                          <TableCell>{balance.mode_of_payment}</TableCell>
                          <TableCell align="right">
                            {typeof balance.opening_amount === 'number'
                              ? balance.opening_amount.toFixed(2)
                              : balance.opening_amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No balance details available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Close Dialog */}
        <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Close POS Opening Entry</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Are you sure you want to close this POS opening entry? This will create a POS Closing Entry
              that consolidates all invoices associated with this entry.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2"><strong>Entry:</strong> {entry.name}</Typography>
              <Typography variant="body2"><strong>POS Profile:</strong> {entry.pos_profile}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {entry.status}</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseDialogOpen(false)} disabled={isClosingPOSOpening}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCloseConfirm}
              disabled={isClosingPOSOpening}
              startIcon={isClosingPOSOpening ? <CircularProgress size={16} /> : null}
            >
              {isClosingPOSOpening ? 'Closing...' : 'Close Entry'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Cancel POS Opening Entry</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Are you sure you want to cancel this POS opening entry? This action can only be performed
              if the entry has no invoices. If it has invoices, please close it instead.
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>Entry:</strong> {entry.name}</Typography>
              <Typography variant="body2"><strong>POS Profile:</strong> {entry.pos_profile}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {entry.status}</Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Cancellation Reason (Optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)} disabled={isCancellingPOSOpening}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancelConfirm}
              disabled={isCancellingPOSOpening}
              startIcon={isCancellingPOSOpening ? <CircularProgress size={16} /> : null}
            >
              {isCancellingPOSOpening ? 'Cancelling...' : 'Cancel Entry'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default POSOpeningEntryDetails;

