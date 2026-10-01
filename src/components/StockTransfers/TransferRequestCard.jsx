import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
} from '@mui/material';
import { Visibility, CheckCircle, LocalShipping, Inventory } from '@mui/icons-material';
import TransferStatusBadge from './TransferStatusBadge';
import { calculateTransferProgress } from '../../utils/stockTransferHelpers';

/**
 * TransferRequestCard Component
 * Displays a transfer request in a card format with actions and progress
 * 
 * @param {Object} props - Component props
 * @param {Object} props.request - Transfer request object
 * @param {Function} props.onView - Callback when view button is clicked
 * @param {Function} [props.onApprove] - Callback when approve button is clicked
 * @param {Function} [props.onDispatch] - Callback when dispatch button is clicked
 * @param {Function} [props.onReceive] - Callback when receive button is clicked
 * @returns {JSX.Element} Transfer request card
 * 
 * @example
 * <TransferRequestCard
 *   request={transferRequest}
 *   onView={(id) => navigate(`/stock-transfers/${id}`)}
 *   onApprove={(id) => handleApprove(id)}
 * />
 */
const TransferRequestCard = ({
  request,
  onView,
  onApprove,
  onDispatch,
  onReceive,
}) => {
  if (!request) {
    return null;
  }

  const progress = calculateTransferProgress(request);
  const isDirectTransfer = request.is_direct_transfer || request.type === 'direct';
  
  // Direct transfers are already completed, so no workflow actions
  const canApprove = !isDirectTransfer && request.status === 'Submitted';
  const canDispatch = !isDirectTransfer && request.status === 'Approved';
  const canReceive = !isDirectTransfer && (request.status === 'In Transit' || request.status === 'Partially In Transit');

  const handleView = () => {
    if (onView && request.name) {
      onView(request.name);
    }
  };

  const handleApprove = () => {
    if (onApprove && request.name) {
      onApprove(request.name);
    }
  };

  const handleDispatch = () => {
    if (onDispatch && request.name) {
      onDispatch(request.name);
    }
  };

  const handleReceive = () => {
    if (onReceive && request.name) {
      onReceive(request.name);
    }
  };

  return (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 4 } }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" component="div">
                {request.name || 'N/A'}
              </Typography>
              {isDirectTransfer && (
                <Chip
                  label="Direct Transfer"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
            {(request.requested_on || request.posting_date) && (
              <Typography variant="caption" color="text.secondary">
                {isDirectTransfer ? 'Created' : 'Requested'}: {new Date(request.requested_on || request.posting_date).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          <TransferStatusBadge status={request.status} />
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>From:</strong> {request.origin_warehouse || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>To:</strong> {request.destination_warehouse || 'N/A'}
          </Typography>
          {request.requested_by && (
            <Typography variant="body2" color="text.secondary">
              <strong>Requested by:</strong> {request.requested_by}
            </Typography>
          )}
        </Box>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {/* Status Indicators */}
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          {isDirectTransfer && request.stock_entry && (
            <Chip
              label={`Stock Entry: ${request.stock_entry}`}
              size="small"
              variant="outlined"
              color="info"
            />
          )}
          {request.dispatched_by && (
            <Chip
              icon={<LocalShipping />}
              label={`Dispatched by ${request.dispatched_by}`}
              size="small"
              variant="outlined"
            />
          )}
          {request.received_by && (
            <Chip
              icon={<Inventory />}
              label={`Received by ${request.received_by}`}
              size="small"
              variant="outlined"
              color="success"
            />
          )}
          {request.goods_received_note && (
            <Chip
              label={`GRN: ${request.goods_received_note}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Action Buttons */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Visibility />}
            onClick={handleView}
          >
            View Details
          </Button>
          {canApprove && onApprove && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleApprove}
            >
              Approve
            </Button>
          )}
          {canDispatch && onDispatch && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<LocalShipping />}
              onClick={handleDispatch}
            >
              Dispatch
            </Button>
          )}
          {canReceive && onReceive && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<Inventory />}
              onClick={handleReceive}
            >
              Receive
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransferRequestCard;

