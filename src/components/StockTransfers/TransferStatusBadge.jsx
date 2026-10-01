import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor } from '../../utils/stockTransferHelpers';

/**
 * TransferStatusBadge Component
 * Displays a status badge for stock transfer requests with appropriate color coding
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Transfer status (Draft, Submitted, Approved, etc.)
 * @param {'small'|'medium'} [props.size='small'] - Chip size
 * @param {string} [props.variant='filled'] - Chip variant
 * @returns {JSX.Element} Status badge chip
 * 
 * @example
 * <TransferStatusBadge status="In Transit" />
 * <TransferStatusBadge status="Completed" size="medium" />
 */
const TransferStatusBadge = ({ status, size = 'small', variant = 'filled' }) => {
  if (!status) {
    return null;
  }

  const color = getStatusColor(status);

  return (
    <Chip
      label={status}
      color={color}
      size={size}
      variant={variant}
    />
  );
};

export default TransferStatusBadge;

