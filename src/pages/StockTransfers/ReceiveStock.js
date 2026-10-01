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
import { ArrowBack, Inventory } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useTransferWorkflow } from '../../hooks/useTransferWorkflow';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import { showNotification } from '../../store/notificationSlice';
import { canProceedWithWorkflow, formatWorkflowError } from '../../utils/stockTransferWorkflow';
import TransferWorkflowStepper from '../../components/StockTransfers/TransferWorkflowStepper';
import { getRemainingQuantity } from '../../utils/stockTransferHelpers';

/**
 * Receive Stock Page
 * Page for receiving stock at destination warehouse
 */
const ReceiveStock = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { request, loading } = useTransferWorkflow(id);
  const { receiveStock, isReceiving } = useStockTransfer();
  const [receiveQuantities, setReceiveQuantities] = useState({});

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      receive_notes: '',
      goods_received_note: '',
    },
  });

  const handleQuantityChange = (itemCode, quantity) => {
    setReceiveQuantities((prev) => ({
      ...prev,
      [itemCode]: parseFloat(quantity) || 0,
    }));
  };

  const onSubmit = async (data) => {
    if (!request || !user) return;

    // Validate workflow transition
    const workflowCheck = canProceedWithWorkflow(request, 'receive');
    if (!workflowCheck.canProceed) {
      dispatch(showNotification({
        message: formatWorkflowError('receive', workflowCheck.reason),
        severity: 'error',
        title: 'Cannot Receive Stock',
      }));
      return;
    }

    const items = (request.items || []).map((item) => {
      const receivedQty = receiveQuantities[item.item_code] || getRemainingQuantity(item) || item.requested_qty || 0;
      return {
        item_code: item.item_code,
        received_qty: receivedQty,
      };
    }).filter((item) => item.received_qty > 0);

    if (items.length === 0) {
      return;
    }

    const receivedBy = user.email || user.name;

    try {
      const result = await receiveStock({
        request_id: id,
        destination_warehouse: request.destination_warehouse,
        items,
        received_by: receivedBy,
        receive_notes: data.receive_notes || '',
        goods_received_note: data.goods_received_note || '',
      });

      if (result.type === 'stockTransfer/receiveStockDestination/fulfilled') {
        // Navigate back to details page with success state
        navigate(`/stock-transfers/${id}`, {
          state: {
            message: 'Stock received successfully',
            severity: 'success',
          },
        });
      }
    } catch (error) {
      console.error('Error receiving stock:', error);
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

  const canReceive = request.status === 'In Transit' || request.status === 'Partially In Transit';
  if (!canReceive) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This transfer request cannot be received. Current status: {request.status}
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
              Receive Stock
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
            Receive Information
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
            Items to Receive
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Code</TableCell>
                  <TableCell>Item Name</TableCell>
                  <TableCell align="right">Dispatched Qty</TableCell>
                  <TableCell align="right">Received Qty</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                  <TableCell align="right">Receive Qty *</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(request.items || []).map((item) => {
                  const dispatchedQty = item.dispatched_qty || 0;
                  const receivedQty = item.received_qty || 0;
                  const remaining = getRemainingQuantity(item);
                  const receiveQty = receiveQuantities[item.item_code] || remaining || dispatchedQty;

                  return (
                    <TableRow key={item.item_code}>
                      <TableCell>{item.item_code}</TableCell>
                      <TableCell>{item.item_name || item.item_code}</TableCell>
                      <TableCell align="right">{dispatchedQty}</TableCell>
                      <TableCell align="right">{receivedQty}</TableCell>
                      <TableCell align="right">{remaining}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={receiveQty}
                          onChange={(e) => handleQuantityChange(item.item_code, e.target.value)}
                          inputProps={{ min: 0, max: remaining || dispatchedQty, step: 0.01 }}
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

        {/* Receive Form */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Receive Details
          </Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
            <Controller
              name="goods_received_note"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Goods Received Note (GRN) - Optional"
                  placeholder="Enter GRN number if available"
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Controller
              name="receive_notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Receive Notes (Optional)"
                  multiline
                  rows={4}
                  placeholder="Add any notes about this receipt..."
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/stock-transfers/${id}`)}
                disabled={isReceiving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                startIcon={isReceiving ? <CircularProgress size={20} /> : <Inventory />}
                disabled={isReceiving}
              >
                {isReceiving ? 'Receiving...' : 'Receive Stock'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ReceiveStock;

