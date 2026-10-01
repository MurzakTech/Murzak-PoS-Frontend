import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import { ArrowBack, Add, Delete, Visibility } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseReturn,
} from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';

const PurchaseReturns = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const purchaseName = searchParams.get('purchase');
  
  const { purchases, selectedPurchase, isLoading, isLoadingDetails } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    defaultValues: {
      return_against: '',
      posting_date: new Date().toISOString().split('T')[0],
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  // Load purchases on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listPurchaseInvoices({
        company: userCompany,
        status: 'Unpaid',
        limit: 100,
        offset: 0,
      }));
    }
  }, [dispatch, userCompany]);

  // Load specific purchase if provided in URL
  useEffect(() => {
    if (purchaseName && userCompany) {
      dispatch(getPurchaseInvoice({ po_name: purchaseName })).then((result) => {
        if (result.type === 'purchase/getPurchaseInvoice/fulfilled' && result.payload.purchase) {
          const purchase = result.payload.purchase;
          setSelectedPurchaseForReturn(purchase);
          reset({
            return_against: purchase.name,
            posting_date: new Date().toISOString().split('T')[0],
            items: purchase.items?.map(item => ({
              item_code: item.item_code,
              qty: 0,
              rate: item.rate,
              warehouse: item.warehouse,
              max_qty: item.qty,
            })) || [],
          });
        }
      });
    }
  }, [purchaseName, userCompany, dispatch, reset]);

  const handleCreateReturn = (purchase) => {
    setSelectedPurchaseForReturn(purchase);
    reset({
      return_against: purchase.name,
      posting_date: new Date().toISOString().split('T')[0],
      items: purchase.items?.map(item => ({
        item_code: item.item_code,
        qty: 0,
        rate: item.rate,
        warehouse: item.warehouse,
        max_qty: item.qty,
      })) || [],
    });
    setReturnDialogOpen(true);
  };

  const handleReturnSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Filter items with return quantities > 0
    const returnItems = data.items.filter((item) => item.qty > 0);

    if (returnItems.length === 0) {
      dispatch(showNotification({
        message: 'Please specify quantities to return for at least one item.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // Validate quantities don't exceed original
    const invalidItems = returnItems.filter((item) => item.qty > item.max_qty);
    if (invalidItems.length > 0) {
      dispatch(showNotification({
        message: `Return quantity cannot exceed original quantity for item(s): ${invalidItems.map(i => i.item_code).join(', ')}`,
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    const returnData = {
      return_against: data.return_against,
      company: userCompany,
      items: returnItems.map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        warehouse: item.warehouse,
      })),
      posting_date: data.posting_date,
    };

    const result = await dispatch(createPurchaseReturn(returnData));

    if (result.type === 'purchase/createPurchaseReturn/fulfilled') {
      setReturnDialogOpen(false);
      navigate('/purchases');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Purchase Returns
          </Typography>
        </Box>

        {/* Purchases List */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Purchase #</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Bill No</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No purchases found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {purchase.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{purchase.supplier || purchase.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {purchase.posting_date ? new Date(purchase.posting_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{purchase.bill_no || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          KES {purchase.grand_total?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={purchase.status || 'Unpaid'}
                          color={getStatusColor(purchase.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => handleCreateReturn(purchase)}
                        >
                          Create Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Create Return Dialog */}
        <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="md" fullWidth>
          <form onSubmit={handleSubmit(handleReturnSubmit)}>
            <DialogTitle>
              Create Purchase Return - {selectedPurchaseForReturn?.name}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="return_against"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Return Against"
                        fullWidth
                        disabled
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="posting_date"
                    control={control}
                    rules={{ required: 'Posting date is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Posting Date"
                        type="date"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.posting_date}
                        helperText={errors.posting_date?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Items to Return
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item Code</TableCell>
                          <TableCell>Original Qty</TableCell>
                          <TableCell>Rate</TableCell>
                          <TableCell>Return Qty</TableCell>
                          <TableCell>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fields.map((field, index) => {
                          const item = watchedItems[index];
                          const returnAmount = (parseFloat(item?.qty || 0) * parseFloat(item?.rate || 0)).toFixed(2);
                          return (
                            <TableRow key={field.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {item?.item_code}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item?.max_qty || 0}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  KES {parseFloat(item?.rate || 0).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`items.${index}.qty`}
                                  control={control}
                                  rules={{
                                    required: 'Return quantity is required',
                                    min: { value: 0, message: 'Must be >= 0' },
                                    max: { value: item?.max_qty || 0, message: `Cannot exceed ${item?.max_qty || 0}` },
                                  }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="number"
                                      size="small"
                                      inputProps={{ step: '0.01', min: '0', max: item?.max_qty || 0 }}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      error={!!errors.items?.[index]?.qty}
                                      helperText={errors.items?.[index]?.qty?.message}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  KES {returnAmount}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Typography variant="h6">
                      Total Return Amount: KES{' '}
                      {watchedItems.reduce((sum, item) => {
                        return sum + (parseFloat(item?.qty || 0) * parseFloat(item?.rate || 0));
                      }, 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Create Return'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default PurchaseReturns;
