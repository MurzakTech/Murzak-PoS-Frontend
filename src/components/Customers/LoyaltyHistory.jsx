import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { useLoyalty } from '../../hooks/useLoyalty';

/**
 * LoyaltyHistory Component
 * 
 * Displays detailed loyalty points transaction history with filtering and pagination
 * 
 * @param {Object} props
 * @param {string} props.customerId - Customer ID (required)
 * @param {Function} [props.onClose] - Callback function when component is closed (optional)
 * @param {Object} [props.defaultFilters] - Default filters to apply (optional)
 * @param {string} [props.defaultFilters.startDate] - Default start date (YYYY-MM-DD)
 * @param {string} [props.defaultFilters.endDate] - Default end date (YYYY-MM-DD)
 * @param {string} [props.defaultFilters.transactionType] - Default transaction type filter
 */
const LoyaltyHistory = ({
  customerId,
  onClose,
  defaultFilters = {},
}) => {
  const {
    history,
    historyPagination,
    historyFilters,
    isLoadingHistory,
    historyError,
    getHistory,
    setHistoryFilters,
    setHistoryPage,
    setHistoryLimit,
    clearHistory,
  } = useLoyalty({
    customerId,
    autoFetchHistory: false,
  });

  const [localFilters, setLocalFilters] = useState({
    start_date: defaultFilters.startDate || '',
    end_date: defaultFilters.endDate || '',
    transaction_type: defaultFilters.transactionType || '',
  });

  const [localPagination, setLocalPagination] = useState({
    page: 1,
    limit: 50,
  });

  const loadHistory = async (page = localPagination.page) => {
    if (!customerId) return;

    const filters = {
      start_date: localFilters.start_date || null,
      end_date: localFilters.end_date || null,
      transaction_type: localFilters.transaction_type || null,
    };

    // Update Redux filters
    setHistoryFilters(filters);
    setHistoryPage(page);
    setHistoryLimit(localPagination.limit);

    // Fetch history
    await getHistory({
      start_date: filters.start_date,
      end_date: filters.end_date,
      transaction_type: filters.transaction_type,
      limit: localPagination.limit,
      page,
    });
  };

  // Load history when component mounts or customerId changes
  useEffect(() => {
    if (customerId) {
      setLocalPagination((prev) => ({ ...prev, page: 1 })); // reset page on customer change
      loadHistory(1);
    }

    // Cleanup on unmount
    return () => {
      clearHistory();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleFilter = () => {
    setLocalPagination((prev) => ({ ...prev, page: 1 }));
    loadHistory(1);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      start_date: '',
      end_date: '',
      transaction_type: '',
    };
    setLocalFilters(clearedFilters);
    setHistoryFilters({});
    setLocalPagination((prev) => ({ ...prev, page: 1 }));
    loadHistory(1);
  };

  const handlePageChange = (_event, value) => {
    setLocalPagination((prev) => ({ ...prev, page: value }));
    loadHistory(value);
  };

  const handleLimitChange = (event) => {
    const newLimit = parseInt(event.target.value);
    setLocalPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    setHistoryLimit(newLimit);
    loadHistory(1);
  };

  const totalPages = useMemo(() => {
    if (!historyPagination?.totalPages) return 1;
    return Math.max(1, historyPagination.totalPages);
  }, [historyPagination]);

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

  const renderPoints = (points) => {
    if (points === null || points === undefined) return '-';
    const isNegative = points < 0;
    const absPoints = Math.abs(points);

    return (
      <Typography
        variant="body2"
        fontWeight={600}
        color={isNegative ? 'error.main' : 'success.main'}
      >
        {isNegative ? '-' : '+'} {absPoints.toLocaleString()}
      </Typography>
    );
  };

  const transactionTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'earn', label: 'Earn' },
    { value: 'redeem', label: 'Redeem' },
    { value: 'expire', label: 'Expire' },
    { value: 'adjust', label: 'Adjust' },
  ];

  // Check if filters are active
  const hasActiveFilters = localFilters.start_date || localFilters.end_date || localFilters.transaction_type;

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Points History</Typography>
        {onClose && (
          <Button variant="outlined" size="small" onClick={onClose}>
            Close
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={localFilters.start_date}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={localFilters.end_date}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, end_date: e.target.value }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={localFilters.transaction_type}
                label="Transaction Type"
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, transaction_type: e.target.value }))
                }
              >
                {transactionTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<FilterList />}
                onClick={handleFilter}
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? <CircularProgress size={18} /> : 'Filter'}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  disabled={isLoadingHistory}
                >
                  Clear
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {historyError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {historyError}
        </Alert>
      )}

      {/* Transactions Table */}
      <Paper sx={{ position: 'relative' }}>
        {isLoadingHistory && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Purchase Amount</TableCell>
                <TableCell>Reference Document</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoadingHistory && (!history || history.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                history?.map((transaction, index) => (
                  <TableRow
                    key={transaction.name || `transaction-${index}`}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(transaction.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.transaction_type || 'Unknown'}
                        size="small"
                        color={getTransactionTypeColor(transaction.transaction_type)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{renderPoints(transaction.points_earned)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transaction.purchase_amount
                          ? transaction.purchase_amount.toLocaleString()
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.reference_document || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        {!isLoadingHistory && history && history.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {((localPagination.page - 1) * localPagination.limit) + 1} to{' '}
                {Math.min(
                  localPagination.page * localPagination.limit,
                  historyPagination?.totalRecords || 0
                )}{' '}
                of {historyPagination?.totalRecords || 0} transactions
              </Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={localPagination.limit}
                  label="Per Page"
                  onChange={handleLimitChange}
                >
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={localPagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LoyaltyHistory;

