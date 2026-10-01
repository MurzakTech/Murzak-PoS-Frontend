import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Stars as StarsIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useLoyalty } from '../../hooks/useLoyalty';
import { useAppSelector } from '../../store/hooks';

/**
 * LoyaltyRedemption Component
 * 
 * Displays customer loyalty points information and allows redemption of points
 * for discount on the current invoice.
 * 
 * @param {Object} props
 * @param {string} props.customerId - Customer ID (required)
 * @param {number} props.invoiceTotal - Current invoice total amount (required)
 * @param {Function} props.onRedemptionChange - Callback when redemption changes (points, discountAmount)
 * @param {boolean} [props.disabled=false] - Whether the component is disabled
 * @param {string} [props.company] - Company name (optional, will use from user state if not provided)
 */
const LoyaltyRedemption = ({
  customerId,
  invoiceTotal,
  onRedemptionChange,
  disabled = false,
  company = null,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const userCompany = company || 
    user?.company || 
    user?.custom_company || 
    user?.company_name || 
    user?.company_data?.name || 
    user?.company_data?.company_name;

  const {
    loyaltyDetails,
    redemptionCalculation,
    isLoadingLoyaltyDetails,
    isCalculatingRedemption,
    loyaltyDetailsError,
    redemptionError,
    getLoyaltyDetails,
    calculateRedemption,
    clearLoyaltyDetails,
    clearRedemptionCalculation,
  } = useLoyalty({
    customerId,
  });

  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [localError, setLocalError] = useState(null);

  // Fetch loyalty details when customer or invoice total changes
  useEffect(() => {
    if (customerId && userCompany && !disabled) {
      getLoyaltyDetails(invoiceTotal, userCompany);
    } else {
      // Clear redemption when disabled or no customer
      setPointsToRedeem(0);
      onRedemptionChange(0, 0);
      clearLoyaltyDetails();
      clearRedemptionCalculation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, invoiceTotal, userCompany, disabled]);

  // Calculate redemption when points change
  useEffect(() => {
    if (pointsToRedeem > 0 && customerId && userCompany) {
      handlePointsChange(pointsToRedeem);
    } else if (pointsToRedeem === 0) {
      setLocalError(null);
      onRedemptionChange(0, 0);
      clearRedemptionCalculation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsToRedeem, customerId, invoiceTotal, userCompany]);

  const handlePointsChange = async (points) => {
    if (!points || points <= 0) {
      setLocalError(null);
      onRedemptionChange(0, 0);
      return;
    }

    // Clear previous errors
    setLocalError(null);

    // Validate points input
    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      setLocalError('Points must be a positive number');
      onRedemptionChange(0, 0);
      return;
    }

    // Check against max redeemable
    if (loyaltyDetails?.maxRedeemablePoints && pointsNum > loyaltyDetails.maxRedeemablePoints) {
      setLocalError(
        `Maximum redeemable is ${loyaltyDetails.maxRedeemablePoints.toLocaleString()} points`
      );
      onRedemptionChange(0, 0);
      return;
    }

    // Calculate redemption
    const result = await calculateRedemption(pointsNum, invoiceTotal, userCompany);

    if (result?.type === 'loyalty/calculateLoyaltyRedemption/fulfilled') {
      const payload = result.payload;
      if (payload.status === 'success') {
        setLocalError(null);
        onRedemptionChange(payload.pointsToRedeem, payload.discountAmount || 0);
      } else {
        // Error from API
        setLocalError(payload.message || 'Invalid redemption');
        onRedemptionChange(0, 0);
      }
    } else if (result?.type === 'loyalty/calculateLoyaltyRedemption/rejected') {
      // Rejected thunk
      setLocalError(result.payload?.message || 'Failed to calculate redemption');
      onRedemptionChange(0, 0);
    }
  };

  const handleMaxRedeem = () => {
    if (loyaltyDetails?.maxRedeemablePoints) {
      setPointsToRedeem(loyaltyDetails.maxRedeemablePoints);
    }
  };

  const handleClearRedemption = () => {
    setPointsToRedeem(0);
    setLocalError(null);
    onRedemptionChange(0, 0);
    clearRedemptionCalculation();
  };

  // Loading state
  if (isLoadingLoyaltyDetails) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading loyalty details...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (loyaltyDetailsError && !loyaltyDetails) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Alert severity="warning" sx={{ mb: 0 }}>
          {loyaltyDetailsError}
        </Alert>
      </Paper>
    );
  }

  // No loyalty program
  if (!loyaltyDetails || !loyaltyDetails.hasLoyaltyProgram) {
    return null; // Don't show anything if customer has no loyalty program
  }

  const hasActiveRedemption = 
    redemptionCalculation?.status === 'success' && 
    redemptionCalculation.discountAmount > 0 &&
    !localError;

  const displayError = localError || redemptionError;

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        border: hasActiveRedemption ? '2px solid' : '1px solid',
        borderColor: hasActiveRedemption ? 'success.main' : 'divider',
        backgroundColor: hasActiveRedemption ? 'action.hover' : 'background.paper',
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarsIcon color="primary" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Redeem Loyalty Points
          </Typography>
          {loyaltyDetails.tierName && (
            <Chip
              label={loyaltyDetails.tierName}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Divider />

        {/* Loyalty Info */}
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Available Points:
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="primary.main">
              {loyaltyDetails.loyaltyPoints.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Conversion Rate:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              1 point = {loyaltyDetails.conversionFactor.toFixed(4)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Max Redeemable:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {loyaltyDetails.maxRedeemablePoints.toLocaleString()} points
              {' '}
              ({loyaltyDetails.maxRedeemableAmount.toFixed(2)})
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {/* Redemption Input */}
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              label="Points to Redeem"
              type="number"
              value={pointsToRedeem || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setPointsToRedeem(0);
                } else {
                  const num = parseInt(value);
                  if (!isNaN(num) && num >= 0) {
                    setPointsToRedeem(num);
                  }
                }
              }}
              disabled={disabled || isCalculatingRedemption}
              inputProps={{
                min: 0,
                max: loyaltyDetails.maxRedeemablePoints || 0,
                step: 1,
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isCalculatingRedemption && <CircularProgress size={20} />}
                  </InputAdornment>
                ),
              }}
              helperText={
                pointsToRedeem > 0
                  ? `≈ ${(pointsToRedeem * loyaltyDetails.conversionFactor).toFixed(2)} discount`
                  : 'Enter points to redeem or click Use Max'
              }
            />
            <Button
              variant="outlined"
              onClick={handleMaxRedeem}
              disabled={
                disabled ||
                isCalculatingRedemption ||
                !loyaltyDetails.maxRedeemablePoints ||
                loyaltyDetails.maxRedeemablePoints === 0
              }
              sx={{ minWidth: 100 }}
            >
              Use Max
            </Button>
            {pointsToRedeem > 0 && (
              <Tooltip title="Clear redemption">
                <IconButton
                  onClick={handleClearRedemption}
                  disabled={disabled || isCalculatingRedemption}
                  color="error"
                  size="small"
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Error Message */}
          {displayError && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
              {displayError}
            </Alert>
          )}

          {/* Discount Preview */}
          {hasActiveRedemption && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: 'success.light',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.main',
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="subtitle2" fontWeight="bold" color="success.dark">
                    Redemption Applied
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Discount Amount:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.dark">
                    -{redemptionCalculation.discountAmount.toFixed(2)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Remaining Points:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {redemptionCalculation.remainingPoints.toLocaleString()}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="bold">
                    Amount to Pay:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.dark">
                    {(invoiceTotal - redemptionCalculation.discountAmount).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default LoyaltyRedemption;

