import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  GridLegacy as Grid,
  TextField,
  Button,
  Alert,
  Divider,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { listCustomers } from '../../store/customerSlice';
import CreditLimitManagement from '../../components/Customers/CreditLimitManagement';
import CreditHistory from '../../components/Customers/CreditHistory';

const CustomerCredit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { customers, isLoading: isLoadingCustomers } = useAppSelector((state) => state.customer);
  const [customer, setCustomer] = useState('');
  const [company, setCompany] = useState(
    user?.company ||
      user?.custom_company ||
      user?.company_name ||
      user?.company_data?.name ||
      user?.company_data?.company_name ||
      ''
  );
  const [activeCustomer, setActiveCustomer] = useState('');

  useEffect(() => {
    if (company) {
      dispatch(listCustomers({ company, limit: 1000, disabled: false }));
    }
  }, [dispatch, company]);

  // Preload customer from query param if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerParam = params.get('customer');
    if (customerParam) {
      setCustomer(customerParam);
      setActiveCustomer(customerParam);
    }
  }, [location.search]);

  const handleLoad = (e) => {
    e.preventDefault();
    if (!customer) return;
    setActiveCustomer(customer);
    // Update URL for shareable deep link
    const params = new URLSearchParams();
    params.set('customer', customer);
    navigate({ pathname: '/customers/credit', search: params.toString() }, { replace: true });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Customer Credit
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage credit limits and review credit history for customers.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }} component="form" onSubmit={handleLoad}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={customers}
              value={customers.find((c) => c.name === customer) || null}
              loading={isLoadingCustomers}
              getOptionLabel={(option) => option?.customer_name || option?.name || ''}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              onChange={(e, value) => setCustomer(value?.name || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer"
                  required
                  placeholder="Search by customer name..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingCustomers ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              fullWidth
              placeholder="Company name"
            />
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button type="submit" variant="contained" fullWidth>
              Load
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {!activeCustomer ? (
        <Alert severity="info">Enter a customer ID to view credit information.</Alert>
      ) : (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Credit Limit
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <CreditLimitManagement
              customer={activeCustomer}
              company={company || undefined}
              onUpdate={() => {}}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Credit History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <CreditHistory
              customer={activeCustomer}
              company={company || undefined}
            />
          </Paper>
        </Box>
      )}
    </Container>
  );
};

export default CustomerCredit;

