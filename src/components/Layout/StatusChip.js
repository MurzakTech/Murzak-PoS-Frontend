import React from 'react';
import { Chip, alpha, useTheme } from '@mui/material';
import { Circle } from '@mui/icons-material';

/**
 * StatusChip Component
 * Consistent status indicator with color-coded dot
 */

// Semantic intent mapping for statuses
const statusSemanticIntent = {
  // Generic statuses
  enabled: 'success',
  disabled: 'default',
  active: 'success',
  inactive: 'default',
  expired: 'error',

  // Document statuses
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
  cancelled: 'error',
  completed: 'success',
  pending: 'warning',

  // Transaction statuses
  paid: 'success',
  unpaid: 'error',
  partial: 'warning',
  partly_paid: 'warning',
  overdue: 'error',
  return: 'warning',
  credit_note_issued: 'warning',

  // Inventory statuses
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'error',
  expires_within_7_days: 'warning',
  expiring_soon: 'info',

  // Transfer statuses
  in_transit: 'info',
  partially_in_transit: 'info',
  partially_received: 'warning',

  // Purchase / Procurement statuses
  received: 'success',
  to_bill: 'warning',
  to_receive: 'warning',
  to_receive_and_bill: 'warning',
  billed: 'success',

  // Audit actions
  created: 'success',
  updated: 'info',
  deleted: 'error',
  signed_in: 'default',
  signed_out: 'default',
  sign_in_failed: 'error',

  // Default
  default: 'default',
};

const resolveIntentColor = (theme, intent) => {
  switch (intent) {
    case 'success':
      return theme.palette?.success?.main || 'currentColor';
    case 'error':
      return theme.palette?.error?.main || 'currentColor';
    case 'warning':
      return theme.palette?.warning?.main || 'currentColor';
    case 'info':
      return theme.palette?.info?.main || 'currentColor';
    default:
      return theme.palette?.text?.secondary || 'currentColor';
  }
};

const StatusChip = ({
  status,
  label,
  color,
  size = 'small',
  variant = 'filled',
  showDot = true,
  sx = {},
}) => {
  const theme = useTheme();

  // Normalize status key for lookup
  const normalizedStatus = status?.toLowerCase().replace(/[\s-]/g, '_') || 'default';

  // Get color from predefined semantic intent or use custom color
  const intent = statusSemanticIntent[normalizedStatus] || 'default';
  const resolvedColor = resolveIntentColor(theme, intent);
  const chipColor = color || resolvedColor;

  // Display label
  const displayLabel = label || status || 'Unknown';

  return (
    <Chip
      size={size}
      variant={variant}
      label={displayLabel}
      icon={
        showDot ? (
          <Circle
            sx={{
              fontSize: 8,
              color: variant === 'outlined' ? chipColor : 'inherit',
              ml: 0.5,
            }}
          />
        ) : undefined
      }
      sx={{
        fontWeight: 500,
        ...(variant === 'filled' && {
          backgroundColor: alpha(chipColor, 0.12),
          color: chipColor,
          border: 'none',
          '& .MuiChip-icon': {
            color: chipColor,
          },
        }),
        ...(variant === 'outlined' && {
          borderColor: alpha(chipColor, 0.3),
          color: chipColor,
          backgroundColor: alpha(chipColor, 0.04),
        }),
        ...sx,
      }}
    />
  );
};

export const statusColors = statusSemanticIntent;
export default StatusChip;
