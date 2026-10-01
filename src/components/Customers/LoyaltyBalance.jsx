import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import { Refresh, Star, StarBorder } from '@mui/icons-material';
import { useLoyalty } from '../../hooks/useLoyalty';

/**
 * LoyaltyBalance Component
 * 
 * Displays customer's loyalty points balance and recent transactions
 * 
 * @param {Object} props
 * @param {string} props.customerId - Customer ID (required)
 * @param {number} [props.limit=5] - Number of recent transactions to display (default: 5)
 * @param {boolean} [props.showRecentTransactions=true] - Whether to show recent transactions (default: true)
 * @param {Function} [props.onRefresh] - Callback function called after refresh
 * @param {boolean} [props.autoFetch=true] - Whether to auto-fetch balance on mount (default: true)
 */
const LoyaltyBalance = ({
  customerId,
  limit = 5,
  showRecentTransactions = true,
  onRefresh,
  autoFetch = true,
}) => {
  const {
    balance,
    isLoadingBalance,
    balanceError,
    getBalance,
    clearBalance,
  } = useLoyalty({
    customerId,
    autoFetchBalance: autoFetch,
    balanceLimit: limit,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBalance();
    };
  }, [clearBalance]);

  const handleRefresh = async () => {
    await getBalance(limit);
    if (onRefresh) {
      onRefresh();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'earn':
        return 'success';
      case 'redeem':
        return 'error';
      case 'expire':
        return 'warning';
      case 'adjust':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'earn':
        return <Star color="success" fontSize="small" />;
      case 'redeem':
        return <StarBorder color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const renderTransactionAmount = (transaction) => {
    const points = transaction.points_earned || 0;
    const isNegative = points < 0;
    const absPoints = Math.abs(points);

    return (
      <Typography
        variant="body2"
        fontWeight={600}
        color={isNegative ? 'error.main' : 'success.main'}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        {getTransactionIcon(transaction.transaction_type)}
        {isNegative ? '-' : '+'} {absPoints.toLocaleString()} points
      </Typography>
    );
  };

  // Loading state
  if (isLoadingBalance && !balance) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (balanceError && !balance) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {balanceError}
          </Alert>
          <Button variant="outlined" onClick={handleRefresh} startIcon={<Refresh />}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no program assigned or no balance data)
  if (!balance || balance.pointsBalance === null || balance.pointsBalance === undefined) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No loyalty program assigned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This customer doesn't have a loyalty program assigned yet.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { pointsBalance, recentTransactions = [] } = balance;

  return (
    <Card>
      <CardContent>
        {/* Header with refresh button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Loyalty Points</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isLoadingBalance}
          >
            Refresh
          </Button>
        </Box>

        {/* Error alert (if any, but we still have balance data) */}
        {balanceError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {balanceError}
          </Alert>
        )}

        {/* Points Balance Display */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
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
            <Typography
              variant="h3"
              fontWeight="bold"
              color="primary.main"
              sx={{ mb: 1 }}
            >
              {pointsBalance.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Loyalty Points
            </Typography>
          </Box>
        </Paper>

        {/* Recent Transactions */}
        {showRecentTransactions && (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Recent Transactions
            </Typography>

            {isLoadingBalance ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : recentTransactions.length > 0 ? (
              <List sx={{ p: 0 }}>
                {recentTransactions.map((transaction, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        px: 0,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          borderRadius: 1,
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={transaction.transaction_type || 'Unknown'}
                                size="small"
                                color={getTransactionTypeColor(transaction.transaction_type)}
                                variant="outlined"
                              />
                              {transaction.reference_document && (
                                <Typography variant="caption" color="text.secondary">
                                  {transaction.reference_document}
                                </Typography>
                              )}
                            </Box>
                            {renderTransactionAmount(transaction)}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(transaction.date)}
                            </Typography>
                            {transaction.purchase_amount > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • Purchase: {transaction.purchase_amount.toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentTransactions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent transactions
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyBalance;

