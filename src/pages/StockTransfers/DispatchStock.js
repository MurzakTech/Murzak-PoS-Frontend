import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowBack, LocalShipping } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useTransferWorkflow } from '../../hooks/useTransferWorkflow';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { showNotification } from '../../store/notificationSlice';
import { canProceedWithWorkflow, formatWorkflowError } from '../../utils/stockTransferWorkflow';
import TransferWorkflowStepper from '../../components/StockTransfers/TransferWorkflowStepper';
import { getRemainingQuantity } from '../../utils/stockTransferHelpers';

/**
 * Dispatch Stock Page
 * Page for dispatching stock from origin warehouse
 */
const DispatchStock = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { request, loading } = useTransferWorkflow(id);
  const { dispatchStock, isDispatching } = useStockTransfer();
  const [dispatchQuantities, setDispatchQuantities] = useState({});

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dispatch_notes: '',
    },
  });

  const handleQuantityChange = (itemCode, quantity) => {
    setDispatchQuantities((prev) => ({
      ...prev,
      [itemCode]: parseFloat(quantity) || 0,
    }));
  };

  const onSubmit = async (data) => {
    if (!request || !user) return;

    // Validate workflow transition
    // const workflowCheck = canProceedWithWorkflow(request, 'dispatch');
    // if (!workflowCheck.canProceed) {
    //   dispatch(showNotification({
    //     message: formatWorkflowError('dispatch', workflowCheck.reason),
    //     severity: 'error',
    //     title: 'Cannot Dispatch Stock',
    //   }));
    //   return;
    // }

    const items = (request.items || []).map((item) => {
      const dispatchedQty = dispatchQuantities[item.item_code] || item.requested_qty || 0;
      return {
        item_code: item.item_code,
        dispatched_qty: dispatchedQty,
      };
    }).filter((item) => item.dispatched_qty > 0);

    if (items.length === 0) {
      return;
    }

    const dispatchedBy = user.email || user.name;

    try {
      const result = await dispatchStock({
        request_id: id,
        origin_warehouse: request.origin_warehouse,
        items,
        dispatched_by: dispatchedBy,
        dispatch_notes: data.dispatch_notes || '',
      });

      if (result.type === 'stockTransfer/dispatchStock/fulfilled') {
        // Navigate back to details page with success state
        navigate(`/stock-transfers/${id}`, {
          state: {
            message: 'Stock dispatched successfully',
            severity: 'success',
          },
        });
      } else if (result.type === 'stockTransfer/dispatchStock/rejected') {
        // Error is already handled by the thunk (notification shown)
        // Just log for debugging - don't try to render the error object
        console.error('Dispatch failed:', result.error || result.payload);
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error?.message || 'An unexpected error occurred';
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to dispatch stock',
      }));
      console.error('Error dispatching stock:', error);
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

  // if (request.status !== 'Approved') {
  //   return (
  //     <Container maxWidth="lg">
  //       <Box sx={{ py: 4 }}>
  //         <Alert severity="warning" sx={{ mb: 2 }}>
  //           This transfer request cannot be dispatched. Current status: {request.status}
  //         </Alert>
  //         <Button
  //           startIcon={<ArrowBack />}
  //           onClick={() => navigate(`/stock-transfers/${id}`)}
  //         >
  //           Back to Details
  //         </Button>
  //       </Box>
  //     </Container>
  //   );
  // }

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
              Dispatch Stock
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
            Dispatch Information
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

        {/* Items Table with Quantity Input */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items to Dispatch
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Code</TableCell>
                  <TableCell>Item Name</TableCell>
                  <TableCell align="right">Requested Qty</TableCell>
                  <TableCell align="right">Dispatched Qty</TableCell>
                  <TableCell align="right">Dispatch Qty *</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(request.items || []).map((item) => {
                  const requestedQty = item.requested_qty || 0;
                  const dispatchedQty = item.dispatched_qty || 0;
                  const remainingQty = requestedQty - dispatchedQty;
                  const dispatchQty = dispatchQuantities[item.item_code] || remainingQty || requestedQty;

                  return (
                    <TableRow key={item.item_code}>
                      <TableCell>{item.item_code}</TableCell>
                      <TableCell>{item.item_name || item.item_code}</TableCell>
                      <TableCell align="right">{requestedQty}</TableCell>
                      <TableCell align="right">{dispatchedQty}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={dispatchQty}
                          onChange={(e) => handleQuantityChange(item.item_code, e.target.value)}
                          inputProps={{ min: 0, max: remainingQty || requestedQty, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dispatch Form */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Dispatch Details
          </Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
            <Controller
              name="dispatch_notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Dispatch Notes (Optional)"
                  multiline
                  rows={4}
                  placeholder="Add any notes about this dispatch..."
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/stock-transfers/${id}`)}
                disabled={isDispatching}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isDispatching ? <CircularProgress size={20} /> : <LocalShipping />}
                disabled={isDispatching}
              >
                {isDispatching ? 'Dispatching...' : 'Dispatch Stock'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default DispatchStock;

