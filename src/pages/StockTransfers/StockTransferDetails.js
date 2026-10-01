import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  GridLegacy as Grid,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Paper,
} from '@mui/material';
import { ArrowBack, Print, CheckCircle, LocalShipping, Inventory } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useTransferWorkflow } from '../../hooks/useTransferWorkflow';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { showNotification } from '../../store/notificationSlice';
import TransferWorkflowStepper from '../../components/StockTransfers/TransferWorkflowStepper';
import TransferItemsTable from '../../components/StockTransfers/TransferItemsTable';
import TransferStatusBadge from '../../components/StockTransfers/TransferStatusBadge';
import { Alert } from '@mui/material';

/**
 * Stock Transfer Details Page
 * View detailed information about a stock transfer request
 */
const StockTransferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { request, currentStep, canApprove, canDispatch, canReceive, loading, refetch } = useTransferWorkflow(id);
  const { isApproving, isDispatching, isReceiving } = useStockTransfer();
  
  const isDirectTransfer = request?.is_direct_transfer || request?.type === 'direct';

  // Show success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      dispatch(showNotification({
        message: location.state.message,
        severity: location.state.severity || 'success',
        title: 'Success',
      }));
      // Clear the state
      window.history.replaceState({}, document.title);
      // Refetch to get updated data
      refetch();
    }
  }, [location.state, dispatch, refetch]);

  const handleApprove = () => {
    navigate(`/stock-transfers/${id}/approve`);
  };

  const handleDispatch = () => {
    navigate(`/stock-transfers/${id}/dispatch`);
  };

  const handleReceive = () => {
    navigate(`/stock-transfers/${id}/receive`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!request) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Transfer request not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/stock-transfers/list')}
            sx={{ mt: 2 }}
          >
            Back to List
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/stock-transfers/list')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Transfer Request: {request.name}
            </Typography>
            <TransferStatusBadge status={request.status} size="medium" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button variant="outlined" onClick={() => navigate('/stock-transfers/list')}>
              Back to List
            </Button>
          </Box>
        </Box>

        {/* Workflow Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <TransferWorkflowStepper status={request.status} />
        </Paper>

        {/* Request Information */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Request Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Request ID
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {request.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <TransferStatusBadge status={request.status} />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Requested By
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {request.requested_by || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Requested On
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {request.requested_on
                        ? new Date(request.requested_on).toLocaleString()
                        : 'N/A'}
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
                  Warehouse Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Origin Warehouse
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {request.origin_warehouse || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Destination Warehouse
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {request.destination_warehouse || 'N/A'}
                    </Typography>
                  </Grid>
                  {request.dispatched_by && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Dispatched By
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {request.dispatched_by}
                      </Typography>
                    </Grid>
                  )}
                  {request.received_by && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Received By
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {request.received_by}
                      </Typography>
                    </Grid>
                  )}
                  {request.goods_received_note && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Goods Received Note (GRN)
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {request.goods_received_note}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Items Table */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Transfer Items
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TransferItemsTable items={request.items || []} />
        </Paper>

        {/* Action Buttons - Only show for Material Requests, not direct transfers */}
        {!isDirectTransfer && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {canApprove && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleApprove}
                disabled={isApproving}
              >
                Approve Transfer
              </Button>
            )}
            {canDispatch && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<LocalShipping />}
                onClick={handleDispatch}
                disabled={isDispatching}
              >
                Dispatch Stock
              </Button>
            )}
            {canReceive && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<Inventory />}
                onClick={handleReceive}
                disabled={isReceiving}
              >
                Receive Stock
              </Button>
            )}
          </Box>
        )}
        
        {/* Direct Transfer Info */}
        {isDirectTransfer && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This is a direct stock transfer. The transfer was completed immediately when created.
              {request.stock_entry && ` Stock Entry: ${request.stock_entry}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default StockTransferDetails;

