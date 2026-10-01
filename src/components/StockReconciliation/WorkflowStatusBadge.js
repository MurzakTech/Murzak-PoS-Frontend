import React from 'react';
import { Chip } from '@mui/material';

/**
 * Workflow Status Badge Component
 * Displays color-coded status badges for stock reconciliation workflow
 * 
 * @param {Object} props
 * @param {string} props.status - Workflow status
 * @returns {JSX.Element}
 */
const WorkflowStatusBadge = ({ status }) => {
  const statusConfig = {
    'Pending Sales User': {
      label: 'Pending Sales User',
      color: 'warning',
    },
    'Pending Quality Manager': {
      label: 'Pending Quality Manager',
      color: 'info',
    },
    'Pending Stock Manager': {
      label: 'Pending Stock Manager',
      color: 'secondary',
    },
    'Completed': {
      label: 'Completed',
      color: 'success',
    },
  };

  const config = statusConfig[status] || {
    label: status || 'Unknown',
    color: 'default',
  };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

export default WorkflowStatusBadge;

