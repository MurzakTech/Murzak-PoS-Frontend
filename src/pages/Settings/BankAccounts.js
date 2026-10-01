import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import { Add, Edit, Search, Clear, AccountBalance, AccountBalanceWallet } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createCashOrBankAccount,
  listCashAndBankAccounts,
  updateAccount,
  createBank,
  listBanks,
  createBankAccount,
  listBankAccounts,
  getAccountDetails,
} from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';

const BankAccounts = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { cashBankAccounts, banks, bankAccounts, isLoadingAccounts } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [tabValue, setTabValue] = useState(0); // 0 = Cash/Bank Accounts, 1 = Banks, 2 = Bank Accounts
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [createBankDialogOpen, setCreateBankDialogOpen] = useState(false);
  const [createBankAccountDialogOpen, setCreateBankAccountDialogOpen] = useState(false);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState('');

  const {
    control: accountControl,
    handleSubmit: handleAccountSubmit,
    reset: resetAccount,
    formState: { errors: accountErrors },
  } = useForm({
    defaultValues: {
      account_name: '',
      account_type: 'Cash',
      account_number: '',
      account_currency: 'KES',
    },
  });

  const {
    control: bankControl,
    handleSubmit: handleBankSubmit,
    reset: resetBank,
    formState: { errors: bankErrors },
  } = useForm({
    defaultValues: {
      bank_name: '',
      swift_number: '',
    },
  });

  const {
    control: bankAccountControl,
    handleSubmit: handleBankAccountSubmit,
    reset: resetBankAccount,
    formState: { errors: bankAccountErrors },
  } = useForm({
    defaultValues: {
      account_name: '',
      bank: '',
      bank_account_no: '',
      iban: '',
      branch_code: '',
      is_company_account: true,
      is_default: false,
    },
  });

  const {
    control: editAccountControl,
    handleSubmit: handleEditAccountSubmit,
    reset: resetEditAccount,
    formState: { errors: editAccountErrors },
  } = useForm();

  useEffect(() => {
    if (userCompany) {
      dispatch(listCashAndBankAccounts({ company: userCompany, account_type: accountTypeFilter || undefined }));
      dispatch(listBanks());
      dispatch(listBankAccounts({ company: userCompany }));
    }
  }, [dispatch, userCompany, accountTypeFilter]);

  const handleCreateAccountOpen = () => {
    resetAccount();
    setCreateAccountDialogOpen(true);
  };

  const handleCreateAccountClose = () => {
    setCreateAccountDialogOpen(false);
    resetAccount();
  };

  const handleCreateBankOpen = () => {
    resetBank();
    setCreateBankDialogOpen(true);
  };

  const handleCreateBankClose = () => {
    setCreateBankDialogOpen(false);
    resetBank();
  };

  const handleCreateBankAccountOpen = () => {
    resetBankAccount();
    setCreateBankAccountDialogOpen(true);
  };

  const handleCreateBankAccountClose = () => {
    setCreateBankAccountDialogOpen(false);
    resetBankAccount();
  };

  const handleEditAccountOpen = (account) => {
    resetEditAccount({
      account_name: account.account_name,
      account_number: account.account_number || '',
      disabled: !account.disabled,
    });
    setSelectedAccount(account);
    setEditAccountDialogOpen(true);
  };

  const handleEditAccountClose = () => {
    setEditAccountDialogOpen(false);
    setSelectedAccount(null);
    resetEditAccount();
  };

  const onAccountSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const result = await dispatch(createCashOrBankAccount({
      ...data,
      company: userCompany,
    }));

    if (result.type === 'purchase/createCashOrBankAccount/fulfilled') {
      handleCreateAccountClose();
      dispatch(listCashAndBankAccounts({ company: userCompany, account_type: accountTypeFilter || undefined }));
    }
  };

  const onBankSubmit = async (data) => {
    const result = await dispatch(createBank(data));

    if (result.type === 'purchase/createBank/fulfilled') {
      handleCreateBankClose();
      dispatch(listBanks());
    }
  };

  const onBankAccountSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const result = await dispatch(createBankAccount({
      ...data,
      company: userCompany,
    }));

    if (result.type === 'purchase/createBankAccount/fulfilled') {
      handleCreateBankAccountClose();
      dispatch(listBankAccounts({ company: userCompany }));
    }
  };

  const onEditAccountSubmit = async (data) => {
    if (!selectedAccount) return;

    const result = await dispatch(updateAccount({
      name: selectedAccount.name,
      account_name: data.account_name,
      account_number: data.account_number,
      disabled: !data.disabled,
    }));

    if (result.type === 'purchase/updateAccount/fulfilled') {
      handleEditAccountClose();
      dispatch(listCashAndBankAccounts({ company: userCompany, account_type: accountTypeFilter || undefined }));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Bank Accounts Management
          </Typography>
          {tabValue === 0 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateAccountOpen}
            >
              Add Account
            </Button>
          )}
          {tabValue === 1 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateBankOpen}
            >
              Add Bank
            </Button>
          )}
          {tabValue === 2 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateBankAccountOpen}
            >
              Add Bank Account
            </Button>
          )}
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<AccountBalanceWallet />} iconPosition="start" label="Cash/Bank Accounts" />
            <Tab icon={<AccountBalance />} iconPosition="start" label="Banks" />
            <Tab icon={<AccountBalance />} iconPosition="start" label="Bank Accounts" />
          </Tabs>
        </Paper>

        {/* Cash/Bank Accounts Tab */}
        {tabValue === 0 && (
          <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  label="Filter by Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank">Bank</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Account Number</TableCell>
                    <TableCell>Currency</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingAccounts ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : cashBankAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No accounts found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashBankAccounts.map((account) => (
                      <TableRow key={account.name} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {account.account_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={account.account_type} size="small" color={account.account_type === 'Cash' ? 'primary' : 'secondary'} />
                        </TableCell>
                        <TableCell>{account.account_number || '-'}</TableCell>
                        <TableCell>{account.account_currency || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={account.disabled ? 'Disabled' : 'Enabled'}
                            size="small"
                            color={account.disabled ? 'error' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleEditAccountOpen(account)}>
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Banks Tab */}
        {tabValue === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bank Name</TableCell>
                  <TableCell>SWIFT Number</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingAccounts ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : banks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No banks found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  banks.map((bank) => (
                    <TableRow key={bank.name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {bank.bank_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{bank.swift_number || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Bank Accounts Tab */}
        {tabValue === 2 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account Name</TableCell>
                  <TableCell>Bank</TableCell>
                  <TableCell>Account Number</TableCell>
                  <TableCell>IBAN</TableCell>
                  <TableCell>Branch Code</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingAccounts ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : bankAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No bank accounts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bankAccounts.map((bankAccount) => (
                    <TableRow key={bankAccount.name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {bankAccount.account_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{bankAccount.bank || '-'}</TableCell>
                      <TableCell>{bankAccount.bank_account_no || '-'}</TableCell>
                      <TableCell>{bankAccount.iban || '-'}</TableCell>
                      <TableCell>{bankAccount.branch_code || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={bankAccount.disabled ? 'Disabled' : 'Enabled'}
                          size="small"
                          color={bankAccount.disabled ? 'error' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Cash/Bank Account Dialog */}
        <Dialog open={createAccountDialogOpen} onClose={handleCreateAccountClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleAccountSubmit(onAccountSubmit)}>
            <DialogTitle>Create Cash/Bank Account</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="account_name"
                    control={accountControl}
                    rules={{ required: 'Account name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Account Name"
                        fullWidth
                        required
                        error={!!accountErrors.account_name}
                        helperText={accountErrors.account_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="account_type"
                    control={accountControl}
                    rules={{ required: 'Account type is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Account Type"
                        fullWidth
                        select
                        required
                        SelectProps={{ native: true }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="account_currency"
                    control={accountControl}
                    render={({ field }) => (
                      <TextField {...field} label="Currency" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="account_number"
                    control={accountControl}
                    render={({ field }) => (
                      <TextField {...field} label="Account Number" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateAccountClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoadingAccounts}>
                {isLoadingAccounts ? <CircularProgress size={20} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Create Bank Dialog */}
        <Dialog open={createBankDialogOpen} onClose={handleCreateBankClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleBankSubmit(onBankSubmit)}>
            <DialogTitle>Create Bank</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="bank_name"
                    control={bankControl}
                    rules={{ required: 'Bank name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Bank Name"
                        fullWidth
                        required
                        error={!!bankErrors.bank_name}
                        helperText={bankErrors.bank_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="swift_number"
                    control={bankControl}
                    render={({ field }) => (
                      <TextField {...field} label="SWIFT/BIC Code" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateBankClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoadingAccounts}>
                {isLoadingAccounts ? <CircularProgress size={20} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Create Bank Account Dialog */}
        <Dialog open={createBankAccountDialogOpen} onClose={handleCreateBankAccountClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleBankAccountSubmit(onBankAccountSubmit)}>
            <DialogTitle>Create Bank Account</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="account_name"
                    control={bankAccountControl}
                    rules={{ required: 'Account name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Account Name"
                        fullWidth
                        required
                        error={!!bankAccountErrors.account_name}
                        helperText={bankAccountErrors.account_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="bank"
                    control={bankAccountControl}
                    rules={{ required: 'Bank is required' }}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={banks}
                        getOptionLabel={(option) => option.bank_name || option.name || ''}
                        onChange={(e, value) => field.onChange(value?.name || '')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Bank"
                            required
                            error={!!bankAccountErrors.bank}
                            helperText={bankAccountErrors.bank?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="bank_account_no"
                    control={bankAccountControl}
                    render={({ field }) => (
                      <TextField {...field} label="Account Number" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="branch_code"
                    control={bankAccountControl}
                    render={({ field }) => (
                      <TextField {...field} label="Branch Code" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="iban"
                    control={bankAccountControl}
                    render={({ field }) => (
                      <TextField {...field} label="IBAN" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateBankAccountClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoadingAccounts}>
                {isLoadingAccounts ? <CircularProgress size={20} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={editAccountDialogOpen} onClose={handleEditAccountClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditAccountSubmit(onEditAccountSubmit)}>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="account_name"
                    control={editAccountControl}
                    rules={{ required: 'Account name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Account Name"
                        fullWidth
                        required
                        error={!!editAccountErrors.account_name}
                        helperText={editAccountErrors.account_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="account_number"
                    control={editAccountControl}
                    render={({ field }) => (
                      <TextField {...field} label="Account Number" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="disabled"
                    control={editAccountControl}
                    render={({ field }) => (
                      <TextField
                        label="Status"
                        fullWidth
                        value={field.value ? 'Disabled' : 'Enabled'}
                        InputProps={{ readOnly: true }}
                        helperText="Toggle enabled/disabled status"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditAccountClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoadingAccounts}>
                {isLoadingAccounts ? <CircularProgress size={20} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default BankAccounts;

