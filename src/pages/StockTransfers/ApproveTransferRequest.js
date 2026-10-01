import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useTransferWorkflow } from '../../hooks/useTransferWorkflow';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { showNotification } from '../../store/notificationSlice';
import { canProceedWithWorkflow, formatWorkflowError } from '../../utils/stockTransferWorkflow';
import TransferWorkflowStepper from '../../components/StockTransfers/TransferWorkflowStepper';
import TransferItemsTable from '../../components/StockTransfers/TransferItemsTable';

/**
 * Approve Transfer Request Page
 * Page for approving a stock transfer request
 */
const ApproveTransferRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { request, loading } = useTransferWorkflow(id);
  const { approveTransfer, approveTransferWorkflow, isApproving } = useStockTransfer();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      approval_notes: '',
    },
  });

  const onSubmit = async (data) => {
    if (!request || !user) return;

    // Validate workflow transition
    const workflowCheck = canProceedWithWorkflow(request, 'approve');
    if (!workflowCheck.canProceed) {
      dispatch(showNotification({
        message: formatWorkflowError('approve', workflowCheck.reason),
        severity: 'error',
        title: 'Cannot Approve Transfer',
      }));
      return;
    }

    const approvedBy = user.email || user.name;

    try {
      // Try workflow approval first, fallback to regular approval
      let result;
      try {
        result = await approveTransferWorkflow(id, approvedBy, data.approval_notes);
      } catch (workflowError) {
        // If workflow fails, try regular approval
        result = await approveTransfer(id, approvedBy, data.approval_notes);
      }

      if (result.type === 'stockTransfer/approveStockTransfer/fulfilled' ||
          result.type === 'stockTransfer/approveStockTransferWorkflow/fulfilled') {
        // Navigate back to details page with success state
        navigate(`/stock-transfers/${id}`, {
          state: {
            message: 'Transfer request approved successfully',
            severity: 'success',
          },
        });
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
    }
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

  if (request.status !== 'Submitted') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This transfer request cannot be approved. Current status: {request.status}
          </Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/stock-transfers/${id}`)}
          >
            Back to Details
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
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/stock-transfers/${id}`)}
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              Approve Transfer Request
            </Typography>
          </Box>
        </Box>

        {/* Workflow Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <TransferWorkflowStepper status={request.status} />
        </Paper>

        {/* Request Summary */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Transfer Request Summary
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Request ID: <strong>{request.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From: <strong>{request.origin_warehouse}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              To: <strong>{request.destination_warehouse}</strong>
            </Typography>
          </Box>
        </Paper>

        {/* Items Table */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items to Transfer
          </Typography>
          <TransferItemsTable items={request.items || []} showReceived={false} showRemaining={false} />
        </Paper>

        {/* Approval Form */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Approval Details
          </Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
            <Controller
              name="approval_notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Approval Notes (Optional)"
                  multiline
                  rows={4}
                  placeholder="Add any notes or comments about this approval..."
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/stock-transfers/${id}`)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                startIcon={isApproving ? <CircularProgress size={20} /> : <CheckCircle />}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve Transfer'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ApproveTransferRequest;

