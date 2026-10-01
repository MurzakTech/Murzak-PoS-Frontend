import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useLoyalty } from '../../hooks/useLoyalty';

/**
 * RedeemPoints Component
 * 
 * Dialog component for redeeming loyalty points
 * 
 * @param {Object} props
 * @param {string} props.customerId - Customer ID (required)
 * @param {number} props.currentBalance - Current loyalty points balance (required)
 * @param {boolean} props.open - Whether dialog is open (required)
 * @param {Function} props.onClose - Callback when dialog closes (required)
 * @param {Function} [props.onSuccess] - Callback after successful redemption (optional)
 */
const RedeemPoints = ({
  customerId,
  currentBalance,
  open,
  onClose,
  onSuccess,
}) => {
  const {
    balance,
    redeem,
    isRedeemingPoints,
    isLoadingBalance,
    error: redeemError,
    getBalance,
  } = useLoyalty({
    customerId,
    autoFetchBalance: false,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      points_to_redeem: '',
      reference_document: '',
    },
  });

  const pointsToRedeem = watch('points_to_redeem');

  // Fetch balance when dialog opens
  useEffect(() => {
    if (open && customerId) {
      getBalance(5);
      reset({
        points_to_redeem: '',
        reference_document: '',
      });
    }
  }, [open, customerId, getBalance, reset]);

  // Use fetched balance if available, otherwise fall back to prop
  const actualBalance = balance?.pointsBalance ?? currentBalance ?? 0;

  // Validate points input
  const validatePoints = (value) => {
    if (!value || value === '') {
      return 'Points to redeem is required';
    }

    const points = parseInt(value, 10);

    if (isNaN(points) || points <= 0) {
      return 'Points must be a positive integer';
    }

    if (!Number.isInteger(parseFloat(value))) {
      return 'Points must be a whole number';
    }

    if (points > actualBalance) {
      return `Insufficient points. Available: ${actualBalance.toLocaleString()}`;
    }

    return true;
  };

  const onSubmit = async (data) => {
    if (!customerId) {
      return;
    }

    const points = parseInt(data.points_to_redeem, 10);

    try {
      const result = await redeem(
        customerId,
        points,
        data.reference_document || null
      );

      if (result.type === 'loyalty/redeemPoints/fulfilled') {
        // Refresh balance
        await getBalance(5);

        // Call success callback
        if (onSuccess) {
          onSuccess(result.payload);
        }

        // Close dialog
        onClose();

        // Reset form
        reset();
      }
    } catch (error) {
      // Error is handled by Redux and shown via notification
      console.error('Redemption error:', error);
    }
  };

  const handleClose = () => {
    if (!isRedeemingPoints) {
      reset();
      onClose();
    }
  };

  // Calculate remaining balance after redemption
  const remainingBalance = pointsToRedeem
    ? Math.max(0, actualBalance - (parseInt(pointsToRedeem, 10) || 0))
    : actualBalance;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Redeem Loyalty Points</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Current Balance Display */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark}20 0%, ${theme.palette.primary.main}20 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}10 100%)`,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Balance
                </Typography>
                {isLoadingBalance ? (
                  <CircularProgress size={40} sx={{ my: 1 }} />
                ) : (
                  <>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {actualBalance.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available Points
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>

            {/* Error Alert */}
            {redeemError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {redeemError}
              </Alert>
            )}

            {/* Points Input */}
            <Controller
              name="points_to_redeem"
              control={control}
              rules={{
                validate: validatePoints,
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Points to Redeem"
                  type="number"
                  fullWidth
                  required
                  error={!!errors.points_to_redeem}
                  helperText={errors.points_to_redeem?.message}
                  disabled={isRedeemingPoints}
                  sx={{ mb: 2 }}
                  InputProps={{
                    inputProps: {
                      min: 1,
                      max: actualBalance,
                      step: 1,
                    },
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive integers
                    if (value === '' || /^\d+$/.test(value)) {
                      field.onChange(value);
                    }
                  }}
                />
              )}
            />

            {/* Remaining Balance Preview */}
            {pointsToRedeem && !errors.points_to_redeem && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  After Redemption
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {remainingBalance.toLocaleString()} points remaining
                </Typography>
              </Box>
            )}

            {/* Reference Document Input */}
            <Controller
              name="reference_document"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Reference Document (Optional)"
                  fullWidth
                  disabled={isRedeemingPoints}
                  helperText="e.g., Sales Invoice number or receipt reference"
                  sx={{ mb: 1 }}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isRedeemingPoints}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isRedeemingPoints || !pointsToRedeem}
            startIcon={isRedeemingPoints ? <CircularProgress size={18} /> : null}
          >
            {isRedeemingPoints ? 'Redeeming...' : 'Redeem Points'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RedeemPoints;

