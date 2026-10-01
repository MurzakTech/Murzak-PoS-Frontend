import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  GridLegacy as Grid,
  Container,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getSupplierDetails } from '../../store/supplierSlice';

const SupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedSupplier, isLoadingDetails } = useAppSelector((state) => state.supplier);

  useEffect(() => {
    if (id) {
      dispatch(getSupplierDetails({ name: id }));
    }
  }, [dispatch, id]);

  if (isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedSupplier) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Supplier not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/suppliers')}
            sx={{ mt: 2 }}
          >
            Back to Suppliers
          </Button>
        </Box>
      </Container>
    );
  }

  const supplier = selectedSupplier;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/suppliers')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              {supplier.supplier_name || supplier.name}
            </Typography>
            <Chip
              label={supplier.disabled === 1 || supplier.disabled === true ? 'Disabled' : 'Enabled'}
              color={supplier.disabled === 1 || supplier.disabled === true ? 'error' : 'success'}
              size="small"
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/suppliers?edit=${supplier.name}`)}
            sx={{ textTransform: 'none' }}
          >
            Edit Supplier
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supplier Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.supplier_name || supplier.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supplier ID
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Type
                    </Typography>
                    <Chip
                      label={supplier.supplier_type || 'Company'}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supplier Group
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.supplier_group || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Tax ID/PIN
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.tax_id || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Internal Supplier
                    </Typography>
                    <Chip
                      label={supplier.is_internal_supplier === 1 || supplier.is_internal_supplier === true ? 'Yes' : 'No'}
                      color={supplier.is_internal_supplier === 1 || supplier.is_internal_supplier === true ? 'primary' : 'default'}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Location & Currency */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Location & Currency
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Country
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.country || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Default Currency
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {supplier.default_currency || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial Information */}
          {(supplier.outstanding_amount !== undefined || supplier.total_purchase !== undefined) && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={3}>
                    {supplier.outstanding_amount !== undefined && (
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: supplier.outstanding_amount > 0 ? 'error.light' : 'success.light',
                            color: supplier.outstanding_amount > 0 ? 'error.contrastText' : 'success.contrastText',
                          }}
                        >
                          <Typography variant="body2" gutterBottom>
                            Outstanding Amount
                          </Typography>
                          <Typography variant="h5" fontWeight={600}>
                            {supplier.default_currency || 'KES'} {supplier.outstanding_amount?.toFixed(2) || '0.00'}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {supplier.total_purchase !== undefined && (
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                          }}
                        >
                          <Typography variant="body2" gutterBottom>
                            Total Purchases
                          </Typography>
                          <Typography variant="h5" fontWeight={600}>
                            {supplier.default_currency || 'KES'} {supplier.total_purchase?.toFixed(2) || '0.00'}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default SupplierDetails;

