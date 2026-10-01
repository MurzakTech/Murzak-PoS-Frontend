import React from 'react';
import { Chip, alpha } from '@mui/material';
import { Circle } from '@mui/icons-material';

/**
 * StatusChip Component
 * Consistent status indicator with color-coded dot
 */

// Predefined status colors
const statusColors = {
  // Generic statuses
  enabled: '#10B981',
  disabled: '#64748B',
  active: '#10B981',
  inactive: '#64748B',

  // Document statuses
  draft: '#64748B',
  submitted: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#EF4444',
  completed: '#059669',
  pending: '#F59E0B',

  // Transaction statuses
  paid: '#10B981',
  unpaid: '#EF4444',
  partial: '#F59E0B',
  overdue: '#DC2626',

  // Inventory statuses
  in_stock: '#10B981',
  low_stock: '#F59E0B',
  out_of_stock: '#EF4444',

  // Transfer statuses
  in_transit: '#8B5CF6',
  partially_in_transit: '#A78BFA',
  partially_received: '#F59E0B',

  // Default
  default: '#64748B',
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
  // Normalize status key for lookup
  const normalizedStatus = status?.toLowerCase().replace(/[\s-]/g, '_') || 'default';

  // Get color from predefined colors or use custom color
  const chipColor = color || statusColors[normalizedStatus] || statusColors.default;

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

// Export status colors for external use
export { statusColors };
export default StatusChip;
