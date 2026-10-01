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
  Divider,
  Pagination,
  Card,
  CardContent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getCustomerCreditHistory } from '../../store/customerSlice';

const CreditHistory = ({ customer, company, onRefresh }) => {
  const dispatch = useAppDispatch();
  const {
    creditHistory,
    creditSummary,
    creditHistoryPagination,
    isLoadingCreditHistory,
    creditLimitError,
  } = useAppSelector((state) => state.customer);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    company ||
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });

  const totalPages = useMemo(() => {
    if (!creditHistoryPagination?.total || !pagination.limit) return 1;
    return Math.max(1, Math.ceil(creditHistoryPagination.total / pagination.limit));
  }, [creditHistoryPagination, pagination.limit]);

  const loadHistory = async (page = 1) => {
    if (!customer) return;
    const offset = (page - 1) * pagination.limit;

    await dispatch(
      getCustomerCreditHistory({
        customer,
        company: userCompany || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        limit: pagination.limit,
        offset,
      })
    );
    if (onRefresh) {
      onRefresh();
    }
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 })); // reset page on customer/company change
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, userCompany]);

  const handleFilter = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadHistory(1);
  };

  const handlePageChange = (_event, value) => {
    setPagination((prev) => ({ ...prev, page: value }));
    loadHistory(value);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Sales Invoice':
        return 'primary';
      case 'Payment Entry':
        return 'success';
      case 'Credit Note':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderAmount = (amount) => {
    const isNegative = amount < 0;
    return (
      <Typography
        variant="body2"
        fontWeight={600}
        color={isNegative ? 'error.main' : 'success.main'}
      >
        {isNegative ? '-' : ''} {Math.abs(amount || 0).toLocaleString()}
      </Typography>
    );
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Credit History
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="date"
              label="From Date"
              InputLabelProps={{ shrink: true }}
              value={filters.from_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="date"
              label="To Date"
              InputLabelProps={{ shrink: true }}
              value={filters.to_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={handleFilter} disabled={isLoadingCreditHistory}>
                {isLoadingCreditHistory ? <CircularProgress size={18} /> : 'Filter'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilters({ from_date: '', to_date: '' });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  loadHistory(1);
                }}
                disabled={isLoadingCreditHistory}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {creditSummary && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Credit Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Credit Limit
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {creditSummary.credit_limit === 0
                    ? 'Unlimited'
                    : creditSummary.credit_limit?.toLocaleString() || '0'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Outstanding
                </Typography>
                <Typography variant="h6" fontWeight={700} color="error.main">
                  {creditSummary.outstanding_amount?.toLocaleString() || '0'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Available
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={
                    creditSummary.available_credit !== null &&
                    creditSummary.available_credit < 0
                      ? 'error.main'
                      : 'success.main'
                  }
                >
                  {creditSummary.available_credit?.toLocaleString() || '0'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Paper sx={{ position: 'relative' }}>
        {isLoadingCreditHistory && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
                <TableCell>Document</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Outstanding</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Company</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {creditHistory?.length === 0 && !isLoadingCreditHistory ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                creditHistory?.map((txn) => (
                  <TableRow key={`${txn.voucher_type}-${txn.voucher_no}-${txn.posting_date}`} hover>
                    <TableCell>
                      {txn.posting_date
                        ? new Date(txn.posting_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={txn.voucher_type || '-'}
                        size="small"
                        color={getTypeColor(txn.voucher_type)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{txn.voucher_no || '-'}</TableCell>
                    <TableCell>{renderAmount(txn.amount || 0)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {txn.outstanding_amount?.toLocaleString() || '0'}
                      </Typography>
                    </TableCell>
                    <TableCell>{txn.status || '-'}</TableCell>
                    <TableCell>{txn.company || userCompany || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              count={totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {creditLimitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {creditLimitError}
        </Alert>
      )}
    </Box>
  );
};

export default CreditHistory;

