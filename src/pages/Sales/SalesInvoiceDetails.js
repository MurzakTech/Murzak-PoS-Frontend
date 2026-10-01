import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Container,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
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
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Print,
  Receipt,
  AssignmentReturn,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getSalesInvoice,
  getPOSInvoice,
  cancelSalesInvoice,
  cancelPOSInvoice,
  submitInvoice,
  clearSelectedSalesInvoice,
  clearSelectedPOSInvoice,
} from '../../store/salesSlice';
import { showNotification } from '../../store/notificationSlice';

const SalesInvoiceDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Determine if this is a POS invoice based on the pathname
  const isPOS = location.pathname.includes('/pos-invoice/');
  
  const {
    selectedSalesInvoice,
    selectedPOSInvoice,
    isLoadingDetails,
    isLoadingPOSDetails,
  } = useAppSelector((state) => state.sales);
  
  const invoice = isPOS ? selectedPOSInvoice : selectedSalesInvoice;
  const isLoading = isPOS ? isLoadingPOSDetails : isLoadingDetails;
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      if (isPOS) {
        dispatch(getPOSInvoice({ name: id }));
      } else {
        dispatch(getSalesInvoice({ name: id }));
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (isPOS) {
        dispatch(clearSelectedPOSInvoice());
      } else {
        dispatch(clearSelectedSalesInvoice());
      }
    };
  }, [dispatch, id, isPOS]);

  const handleCancel = async () => {
    if (!invoice) return;
    
    const result = isPOS
      ? await dispatch(cancelPOSInvoice({ name: invoice.name }))
      : await dispatch(cancelSalesInvoice({ name: invoice.name }));
    
    if (result.type?.includes('/fulfilled')) {
      setCancelDialogOpen(false);
      dispatch(showNotification({
        message: `${isPOS ? 'POS' : 'Sales'} Invoice cancelled successfully`,
        severity: 'success',
        title: 'Success',
      }));
      navigate('/sales/history');
    }
  };

  const handleSubmit = async () => {
    if (!invoice || isPOS) return;
    
    const result = await dispatch(submitInvoice({ name: invoice.name }));
    
    if (result.type?.includes('/fulfilled')) {
      setSubmitDialogOpen(false);
      dispatch(showNotification({
        message: 'Sales Invoice submitted successfully',
        severity: 'success',
        title: 'Success',
      }));
      // Refresh invoice details
      dispatch(getSalesInvoice({ name: invoice.name }));
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            {isPOS ? 'POS' : 'Sales'} Invoice not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/sales/history')}
            sx={{ mt: 2 }}
          >
            Back to Sales History
          </Button>
        </Box>
      </Container>
    );
  }

  const getStatusColor = (status, docstatus) => {
    const statusLower = status?.toLowerCase() || '';
    const docStatus = docstatus !== undefined ? docstatus : null;
    
    if (statusLower === 'cancelled' || docStatus === 2) return 'error';
    if (statusLower === 'completed' || statusLower === 'paid' || docStatus === 1) return 'success';
    if (statusLower === 'draft' || docStatus === 0) return 'default';
    if (statusLower === 'pending' || statusLower === 'unpaid') return 'warning';
    return 'default';
  };

  const getStatusLabel = () => {
    if (invoice.status) return invoice.status;
    if (invoice.docstatus === 0) return 'Draft';
    if (invoice.docstatus === 1) return 'Submitted';
    if (invoice.docstatus === 2) return 'Cancelled';
    return 'Unknown';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/sales/history')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              {isPOS ? 'POS' : 'Sales'} Invoice: {invoice.name}
            </Typography>
            <Chip
              label={getStatusLabel()}
              color={getStatusColor(invoice.status, invoice.docstatus)}
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {invoice.docstatus === 0 && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/sales/invoice/${invoice.name}/edit`)}
                sx={{ textTransform: 'none' }}
              >
                Edit
              </Button>
            )}
            {invoice.docstatus === 0 && !isPOS && (
              <Button
                variant="outlined"
                startIcon={<Receipt />}
                onClick={() => setSubmitDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Submit
              </Button>
            )}
            {invoice.docstatus === 1 && invoice.status !== 'Cancelled' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setCancelDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => {
                // TODO: Implement print functionality
                dispatch(showNotification({
                  message: 'Print functionality coming soon',
                  severity: 'info',
                  title: 'Info',
                }));
              }}
              sx={{ textTransform: 'none' }}
            >
              Print
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Invoice Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Invoice Number
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {invoice.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Customer
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {invoice.customer || invoice.customer_name || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1">
                      {invoice.posting_date 
                        ? new Date(invoice.posting_date).toLocaleDateString() 
                        : '-'}
                    </Typography>
                  </Grid>
                  {!isPOS && invoice.due_date && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1">
                      {invoice.company || '-'}
                    </Typography>
                  </Grid>
                  {isPOS && invoice.pos_profile && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        POS Profile
                      </Typography>
                      <Typography variant="body1">
                        {invoice.pos_profile}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Net Total
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {(invoice.net_total || invoice.total || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Taxes
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {(invoice.total_taxes_and_charges || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Grand Total
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      KES {(invoice.grand_total || invoice.total_amount || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  {!isPOS && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Outstanding Amount
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        color={invoice.outstanding_amount > 0 ? 'error.main' : 'success.main'}
                      >
                        KES {(invoice.outstanding_amount || 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                  {invoice.discount_amount && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Discount
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="success.main">
                        - KES {invoice.discount_amount.toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Items Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Items
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Code</TableCell>
                        <TableCell>Item Name</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        {(invoice.items?.[0]?.discount_amount || invoice.items?.[0]?.discount_percentage) && (
                          <TableCell align="center">Discount</TableCell>
                        )}
                        <TableCell align="right">Amount</TableCell>
                        {invoice.items?.[0]?.warehouse && (
                          <TableCell>Warehouse</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.item_code}</TableCell>
                            <TableCell>{item.item_name || item.item_code}</TableCell>
                            <TableCell align="right">{item.qty || item.quantity || 0}</TableCell>
                            <TableCell align="right">
                              KES {(item.rate || 0).toFixed(2)}
                            </TableCell>
                            {(invoice.items?.[0]?.discount_amount || invoice.items?.[0]?.discount_percentage) && (
                              <TableCell align="center">
                                {item.discount_percentage ? (
                                  <Chip 
                                    label={`${item.discount_percentage}%`} 
                                    size="small" 
                                    color="success" 
                                    variant="outlined"
                                  />
                                ) : item.discount_amount ? (
                                  <Chip 
                                    label={`-KES ${item.discount_amount.toFixed(2)}`} 
                                    size="small" 
                                    color="success" 
                                    variant="outlined"
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                            )}
                            <TableCell align="right">
                              <Box>
                                {item.discount_amount > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                                    KES {((item.rate || 0) * (item.qty || item.quantity || 0)).toFixed(2)}
                                  </Typography>
                                )}
                                <Typography variant="body2" fontWeight={item.discount_amount > 0 ? 'medium' : 'normal'} color={item.discount_amount > 0 ? 'success.main' : 'inherit'}>
                              KES {(item.amount || 0).toFixed(2)}
                                </Typography>
                              </Box>
                            </TableCell>
                            {item.warehouse && (
                              <TableCell>{item.warehouse}</TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No items found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Payments (for POS invoices) */}
          {isPOS && invoice.payments && invoice.payments.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payments
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Mode of Payment</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Account</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.payments.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>{payment.mode_of_payment}</TableCell>
                            <TableCell align="right">
                              KES {(payment.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>{payment.account || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Actions */}
          {invoice.docstatus === 1 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Actions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<AssignmentReturn />}
                      onClick={() => navigate(`/sales/returns?invoice=${invoice.name}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      Create Return
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Print />}
                      onClick={() => {
                        // TODO: Implement print functionality
                        dispatch(showNotification({
                          message: 'Print functionality coming soon',
                          severity: 'info',
                          title: 'Info',
                        }));
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Print Receipt
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Submit Invoice Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <DialogTitle>Submit Sales Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Submit Sales Invoice "{invoice?.name}"? This will finalize the invoice.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Invoice Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel {isPOS ? 'POS' : 'Sales'} Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel {isPOS ? 'POS' : 'Sales'} Invoice "{invoice?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCancel} 
            color="error" 
            variant="contained" 
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Cancel Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SalesInvoiceDetails;
