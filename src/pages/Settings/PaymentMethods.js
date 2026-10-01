import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  GridLegacy as Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Autocomplete,
} from '@mui/material';
import { Add, Close, CreditCard, AccountBalance, Payment } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listPaymentMethods,
  createCreditModeOfPayment,
  getReceivableAccount,
} from '../../store/salesSlice';
import { listCashAndBankAccounts } from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const PaymentMethods = () => {
  const dispatch = useAppDispatch();
  const { paymentMethods, isLoadingPaymentMethods } = useAppSelector((state) => state.sales);
  const { cashBankAccounts } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createCreditDialogOpen, setCreateCreditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultReceivableAccount, setDefaultReceivableAccount] = useState('');
  const [isLoadingReceivableAccount, setIsLoadingReceivableAccount] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      default_account: '',
      mop_type: 'Bank',
      currency: 'KES',
      enabled: 1,
    },
  });

  useEffect(() => {
    if (userCompany) {
      dispatch(listPaymentMethods({ company: userCompany, only_enabled: false }));
      dispatch(listCashAndBankAccounts({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  const handleCreateCreditOpen = async () => {
    reset({
      default_account: '',
      mop_type: 'Bank',
      currency: 'KES',
      enabled: 1,
    });
    setCreateCreditDialogOpen(true);
    
    // Fetch default receivable account for the company
    // Using a placeholder customer - API will return company default if customer-specific account doesn't exist
    if (userCompany) {
      setIsLoadingReceivableAccount(true);
      try {
        // Call with default customer - API returns company default receivable account
        // Using "Walk-in Customer" which is a common default customer in POS systems
        const result = await dispatch(getReceivableAccount({
          customer: 'Walk-in Customer', // Default customer - API will return company default receivable account
          company: userCompany,
        }));
        
        if (getReceivableAccount.fulfilled.match(result)) {
          const account = result.payload.receivableAccount;
          if (account) {
            setDefaultReceivableAccount(account);
            // Pre-populate the form with the default account
            reset({
              default_account: account,
              mop_type: 'Bank',
              currency: 'KES',
              enabled: 1,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching receivable account:', error);
      } finally {
        setIsLoadingReceivableAccount(false);
      }
    }
  };

  const handleCreateCreditClose = () => {
    setCreateCreditDialogOpen(false);
    reset();
  };

  const onSubmitCredit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    setIsCreating(true);
    try {
      const result = await dispatch(createCreditModeOfPayment({
        company: userCompany,
        default_account: data.default_account,
        mop_type: data.mop_type,
        currency: data.currency || undefined,
        enabled: data.enabled,
      }));

      if (createCreditModeOfPayment.fulfilled.match(result)) {
        // Refresh payment methods list
        dispatch(listPaymentMethods({ company: userCompany, only_enabled: false }));
        handleCreateCreditClose();
      }
    } catch (error) {
      console.error('Error creating credit mode of payment:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Filter receivable accounts (typically accounts with "Debtors" or "Receivable" in name)
  const receivableAccounts = cashBankAccounts.filter(account => 
    account.account_name?.toLowerCase().includes('debtor') ||
    account.account_name?.toLowerCase().includes('receivable')
  );

  // Get account options for autocomplete
  const accountOptions = receivableAccounts.length > 0 
    ? receivableAccounts.map(acc => acc.account_name)
    : cashBankAccounts.map(acc => acc.account_name);

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Name',
      width: '20%',
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {value === 'Credit' ? (
            <CreditCard fontSize="small" color="primary" />
          ) : (
            <AccountBalance fontSize="small" />
          )}
          <Typography variant="body2" fontWeight={500}>
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
      header: 'Type',
      width: '15%',
      render: (value) => (
        <Chip
          label={value || 'N/A'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'enabled',
      header: 'Status',
      width: '15%',
      render: (value) => (
        <StatusChip
          status={value === 1 ? 'enabled' : 'disabled'}
          label={value === 1 ? 'Enabled' : 'Disabled'}
        />
      ),
    },
    {
      field: 'accounts',
      header: 'Accounts',
      width: '50%',
      render: (value) => {
        if (!value || value.length === 0) {
          return (
            <Typography variant="caption" color="text.secondary">
              No accounts configured
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.map((account, accIndex) => (
              <Box key={accIndex}>
                <Typography variant="caption" display="block">
                  <strong>Company:</strong> {account.company}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  <strong>Account:</strong> {account.default_account}
                </Typography>
                {account.currency && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    <strong>Currency:</strong> {account.currency}
                  </Typography>
                )}
                {accIndex < value.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </Box>
            ))}
          </Box>
        );
      },
    },
  ], []);

  // Calculate stats
  const totalMethods = paymentMethods.length;
  const enabledMethods = paymentMethods.filter(m => m.enabled === 1).length;

  return (
    <Box>
      <PageHeader
        title="Payment Methods"
        subtitle="Manage payment methods for sales transactions"
        icon={Payment}
        stats={[
          { value: totalMethods, label: 'Total Methods', color: 'primary.main' },
          { value: enabledMethods, label: 'Enabled', color: 'success.main' },
        ]}
        actions={[
          {
            label: 'Create/Enable Credit Payment',
            icon: <Add />,
            onClick: handleCreateCreditOpen,
            variant: 'contained',
          },
        ]}
        loading={isLoadingPaymentMethods && paymentMethods.length === 0}
      />

      <DataTable
        columns={columns}
        rows={paymentMethods}
        loading={isLoadingPaymentMethods}
        emptyMessage="No payment methods found"
        pagination={false}
        rowKey={(row, index) => row.name || `method-${index}`}
      />

        {/* Create/Enable Credit Payment Dialog */}
        <Dialog
          open={createCreditDialogOpen}
          onClose={handleCreateCreditClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Create/Enable Credit Payment Method</Typography>
              <IconButton onClick={handleCreateCreditClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <form onSubmit={handleSubmit(onSubmitCredit)}>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    This will create or enable the "Credit" mode of payment. Credit payments use receivable accounts to track customer outstanding balances. 
                    The default receivable account for your company will be pre-filled below.
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="default_account"
                    control={control}
                    rules={{ required: 'Receivable account is required' }}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={accountOptions}
                        freeSolo
                        loading={isLoadingReceivableAccount}
                        onChange={(event, newValue) => field.onChange(newValue || '')}
                        onInputChange={(event, newInputValue) => field.onChange(newInputValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Receivable Account *"
                            error={!!errors.default_account}
                            helperText={errors.default_account?.message || (isLoadingReceivableAccount ? 'Loading default account...' : '')}
                            placeholder="e.g., Debtors - WSI"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {isLoadingReceivableAccount ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="mop_type"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Payment Type</InputLabel>
                        <Select {...field} label="Payment Type">
                          <MenuItem value="Bank">Bank</MenuItem>
                          <MenuItem value="Cash">Cash</MenuItem>
                          <MenuItem value="Credit Card">Credit Card</MenuItem>
                          <MenuItem value="Wire Transfer">Wire Transfer</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Currency"
                        fullWidth
                        placeholder="KES"
                        helperText="Optional: Set if your schema has a currency column"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="enabled"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select {...field} label="Status">
                          <MenuItem value={1}>Enabled</MenuItem>
                          <MenuItem value={0}>Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCreateCreditClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreating}
                startIcon={isCreating ? <CircularProgress size={20} /> : null}
              >
                {isCreating ? 'Creating...' : 'Create/Enable'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
  );
};

export default PaymentMethods;

