import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import { Stack } from '@mui/material';

/**
 * Reusable Confirmation Dialog Component
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Function to call when dialog is closed (without confirming)
 * @param {function} onConfirm - Function to call when user confirms the action
 * @param {string} title - Dialog title
 * @param {string} message - Main message/content to display
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Dialog variant: "warning", "error", "info", "success" (default: "warning")
 * @param {boolean} loading - Whether the confirm action is in progress
 * @param {string} confirmColor - Color for confirm button (default: based on variant)
 * @param {React.ReactNode} icon - Custom icon (optional, will use default based on variant if not provided)
 * @param {React.ReactNode} children - Additional content to display (optional)
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
  confirmColor,
  icon,
  children,
}) => {
  // Get variant-specific defaults
  const variantConfig = {
    warning: {
      icon: <Warning color="warning" sx={{ fontSize: 48 }} />,
      defaultConfirmColor: 'warning',
      defaultTitle: 'Confirm Action',
    },
    error: {
      icon: <Error color="error" sx={{ fontSize: 48 }} />,
      defaultConfirmColor: 'error',
      defaultTitle: 'Confirm Action',
    },
    info: {
      icon: <Info color="info" sx={{ fontSize: 48 }} />,
      defaultConfirmColor: 'primary',
      defaultTitle: 'Information',
    },
    success: {
      icon: <CheckCircle color="success" sx={{ fontSize: 48 }} />,
      defaultConfirmColor: 'success',
      defaultTitle: 'Confirm Action',
    },
  };

  const config = variantConfig[variant] || variantConfig.warning;
  const displayIcon = icon || config.icon;
  const displayConfirmColor = confirmColor || config.defaultConfirmColor;
  const displayTitle = title || config.defaultTitle;

  const handleConfirm = () => {
    if (onConfirm && !loading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading && onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {displayTitle}
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{ ml: 2 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3} alignItems="center">
          <Box sx={{ mt: 1 }}>{displayIcon}</Box>

          <Typography
            variant="body1"
            align="center"
            sx={{ color: 'text.primary' }}
          >
            {message}
          </Typography>

          {children && (
            <Box sx={{ width: '100%', mt: 1 }}>{children}</Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: 1,
          borderColor: 'divider',
          gap: 2,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          sx={{ borderRadius: 2, px: 3 }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          variant="contained"
          color={displayConfirmColor}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;

