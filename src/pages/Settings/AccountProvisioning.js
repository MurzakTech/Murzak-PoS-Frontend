import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  AccountBalance,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  AutoFixHigh,
  Search,
  Refresh,
  Settings as SettingsIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAccountProvisioning } from '../../hooks/useAccountProvisioning';
import { handleAccountProvisioningError } from '../../utils/accountProvisioningErrorHandler';
import { getUserCompany } from '../../utils/getUserCompany';

const AccountProvisioning = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const userCompany = getUserCompany(user);

  const {
    status,
    accounts,
    accountsCount,
    recommendedTypes,
    validation,
    loading,
    error,
    refetch,
    autoConfigure,
    setDefaultAccount,
    fetchAccounts,
    validate: validateSetup,
    clearError,
  } = useAccountProvisioning(userCompany, { autoFetch: true });

  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [validating, setValidating] = useState(false);
  const [autoConfiguring, setAutoConfiguring] = useState(false);

  // Fetch accounts when selector opens or filters change
  useEffect(() => {
    if (showAccountSelector && userCompany) {
      fetchAccounts({
        searchTerm: searchTerm || undefined,
        accountType: accountTypeFilter || undefined,
        limit: 50,
      });
    }
  }, [showAccountSelector, userCompany, searchTerm, accountTypeFilter, fetchAccounts]);

  const handleAutoConfigure = async () => {
    if (!userCompany) return;
    
    setAutoConfiguring(true);
    clearError();
    
    try {
      await autoConfigure({ createAccountIfMissing: true });
    } catch (err) {
      console.error('Auto-configure failed:', err);
    } finally {
      setAutoConfiguring(false);
    }
  };

  const handleSelectAccount = async (accountName) => {
    if (!userCompany) return;
    
    try {
      await setDefaultAccount(accountName, true);
      setShowAccountSelector(false);
      setSearchTerm('');
      setAccountTypeFilter('');
    } catch (err) {
      console.error('Set account failed:', err);
    }
  };

  const handleValidate = async () => {
    if (!userCompany) return;
    
    setValidating(true);
    clearError();
    
    try {
      await validateSetup();
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleOpenAccountSelector = () => {
    setShowAccountSelector(true);
  };

  const handleCloseAccountSelector = () => {
    setShowAccountSelector(false);
    setSearchTerm('');
    setAccountTypeFilter('');
  };

  if (!userCompany) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AccountBalance color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Account Provisioning
            </Typography>
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Company information not found. Please complete your profile setup or contact your administrator.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AccountBalance color="primary" />
            <Typography variant="h5" fontWeight="bold">
              Account Provisioning
            </Typography>
          </Box>

          {/* Status Section */}
          {loading && !status ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Skeleton variant="text" width="30%" height={20} />
                  <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 1 }} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Skeleton variant="text" width="30%" height={20} />
                  <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 1 }} />
                </Paper>
              </Grid>
            </Grid>
          ) : status ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {status.is_valid ? (
                      <>
                        <CheckCircle color="success" />
                        <Typography variant="body1" color="success.main" fontWeight="medium">
                          Valid Configuration
                        </Typography>
                      </>
                    ) : (
                      <>
                        <ErrorIcon color="error" />
                        <Typography variant="body1" color="error.main" fontWeight="medium">
                          Invalid Configuration
                        </Typography>
                      </>
                    )}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Provisional Accounting
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {status.enable_provisional_accounting ? (
                      <Chip label="Enabled" color="success" size="small" />
                    ) : (
                      <Chip label="Disabled" color="default" size="small" />
                    )}
                  </Box>
                </Paper>
              </Grid>

              {status.default_provisional_account && status.account_details && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Current Account
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ mt: 1 }}>
                      {status.account_details.account_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={status.account_details.account_type} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={status.account_details.root_type} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              )}

              {status.validation_message && (
                <Grid item xs={12}>
                  <Alert severity={status.is_valid ? 'success' : 'warning'}>
                    {status.validation_message}
                  </Alert>
                </Grid>
              )}
            </Grid>
          ) : null}

          <Divider sx={{ my: 3 }} />

          {/* Actions Section */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={autoConfiguring ? <CircularProgress size={16} /> : <AutoFixHigh />}
              onClick={handleAutoConfigure}
              disabled={loading || autoConfiguring}
            >
              {autoConfiguring ? 'Configuring...' : 'Auto-Configure'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AccountCircle />}
              onClick={handleOpenAccountSelector}
              disabled={loading || autoConfiguring}
            >
              Select Account
            </Button>
            <Button
              variant="outlined"
              startIcon={validating ? <CircularProgress size={16} /> : <SettingsIcon />}
              onClick={handleValidate}
              disabled={loading || validating || autoConfiguring}
            >
              {validating ? 'Validating...' : 'Validate Setup'}
            </Button>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={refetch}
              disabled={loading || autoConfiguring || validating}
            >
              Refresh
            </Button>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={clearError}>
              {handleAccountProvisioningError(error).message}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">
                Validation Results
              </Typography>
            </Box>
            
            {validation.is_valid ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                ✓ Setup is valid and ready to use
              </Alert>
            ) : (
              <>
                {validation.issues && validation.issues.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Issues:
                    </Typography>
                    <List dense>
                      {validation.issues.map((issue, index) => (
                        <ListItem key={index}>
                          <ErrorIcon color="error" sx={{ mr: 1, fontSize: 20 }} />
                          <ListItemText primary={issue} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {validation.recommendations && validation.recommendations.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="info.main" gutterBottom>
                      Recommendations:
                    </Typography>
                    <List dense>
                      {validation.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <SettingsIcon color="info" sx={{ mr: 1, fontSize: 20 }} />
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {validation.warnings && validation.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Warnings:
                    </Typography>
                    <List dense>
                      {validation.warnings.map((warning, index) => (
                        <ListItem key={index}>
                          <Warning color="warning" sx={{ mr: 1, fontSize: 20 }} />
                          <ListItemText primary={warning} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Selector Dialog */}
      <Dialog
        open={showAccountSelector}
        onClose={handleCloseAccountSelector}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle color="primary" />
            <Typography variant="h6">Select Provisional Account</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Search and Filter */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={accountTypeFilter}
                label="Account Type"
                onChange={(e) => setAccountTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {recommendedTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Accounts List */}
          {loading ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <ListItem key={i} disablePadding>
                  <ListItemButton disabled>
                    <ListItemText
                      primary={<Skeleton variant="text" width="60%" />}
                      secondary={<Skeleton variant="text" width="40%" />}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </Box>
          ) : accounts.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No accounts found. Try adjusting your search or filters.
            </Alert>
          ) : (
            <List>
              {accounts.map((account) => (
                <ListItem key={account.name} disablePadding>
                  <ListItemButton onClick={() => handleSelectAccount(account.name)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {account.account_name}
                          {account.is_recommended && (
                            <Chip label="Recommended" color="success" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip 
                            label={account.account_type} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={account.root_type} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {accountsCount > accounts.length && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Showing {accounts.length} of {accountsCount} accounts. 
              {searchTerm || accountTypeFilter ? ' Clear filters to see more.' : ' Use search to find specific accounts.'}
            </Alert>
          )}
          
          {accounts.length > 0 && !searchTerm && !accountTypeFilter && accountsCount > accounts.length && (
            <Button
              variant="text"
              size="small"
              onClick={() => {
                fetchAccounts({
                  limit: accountsCount,
                });
              }}
              sx={{ mt: 1 }}
            >
              Load All Accounts ({accountsCount})
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccountSelector} disabled={loading}>
            Cancel
          </Button>
          {searchTerm || accountTypeFilter ? (
            <Button
              onClick={() => {
                setSearchTerm('');
                setAccountTypeFilter('');
              }}
              disabled={loading}
            >
              Clear Filters
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountProvisioning;

