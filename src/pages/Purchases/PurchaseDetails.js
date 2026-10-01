import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  GridLegacy as Grid,
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
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Print,
  Receipt,
  AssignmentReturn,
  Send,
  Inventory,
  AddShoppingCart,
  QrCodeScanner,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getPurchaseInvoice,
  cancelPurchaseInvoice,
  submitPurchaseOrder,
  clearSelectedPurchase,
  createStockReceipt,
} from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';
import useRoleAccess from '../../hooks/useRoleAccess';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const {
    selectedPurchase,
    isLoadingDetails,
    isLoading,
  } = useAppSelector((state) => state.purchase);
  const { hasRole, hasAccess } = useRoleAccess();
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [stockReceiptDialogOpen, setStockReceiptDialogOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canSubmitPO = hasRole(['Purchase Manager', 'Purchase User', 'Administrator', 'System Manager']) || 
                      hasAccess('/purchases/submit');
  const canCreateGRN = hasRole(['Purchase Manager', 'Warehouse Manager', 'Administrator', 'System Manager']) || 
                       hasAccess('/purchases/grn/new');

  useEffect(() => {
    if (id) {
      dispatch(getPurchaseInvoice({ po_name: id }));
    }
    
    // Cleanup on unmount
    return () => {
      dispatch(clearSelectedPurchase());
    };
  }, [dispatch, id]);

  const handleCancel = async () => {
    if (!selectedPurchase) return;
    
    const result = await dispatch(cancelPurchaseInvoice({ name: selectedPurchase.name }));
    
    if (result.type?.includes('/fulfilled')) {
      setCancelDialogOpen(false);
      dispatch(showNotification({
        message: 'Purchase Invoice cancelled successfully',
        severity: 'success',
        title: 'Success',
      }));
      navigate('/purchases');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPurchase) return;

    setIsSubmitting(true);
    try {
      const result = await dispatch(submitPurchaseOrder({ 
        purchase_order: selectedPurchase.name 
      }));
      
      if (result.type === 'purchase/submitPurchaseOrder/fulfilled') {
        // Success is already handled by the slice with notification
        setSubmitDialogOpen(false);
        // Refresh invoice details
        dispatch(getPurchaseInvoice({ po_name: selectedPurchase.name }));
        // Navigate back to list after a short delay
        setTimeout(() => {
          navigate('/purchases');
        }, 1500);
      } else if (result.type === 'purchase/submitPurchaseOrder/rejected') {
        // Error is already handled by the slice with notification
        // Keep dialog open so user can try again or cancel
        // Don't close the dialog on error
      }
    } catch (error) {
      // Fallback error handling
      dispatch(showNotification({
        message: error.message || 'An unexpected error occurred while submitting the purchase order',
        severity: 'error',
        title: 'Submission Failed',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStockReceipt = async () => {
    if (!selectedGRN || !selectedPurchase) return;
    
    const result = await dispatch(createStockReceipt({ grn_no: selectedGRN }));
    
    if (result.type?.includes('/fulfilled')) {
      setStockReceiptDialogOpen(false);
      setSelectedGRN(null);
      dispatch(showNotification({
        message: 'Stock receipt created successfully',
        severity: 'success',
        title: 'Success',
      }));
      // Refresh invoice details
      dispatch(getPurchaseInvoice({ po_name: selectedPurchase.name }));
    }
  };

  if (isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedPurchase) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Purchase Invoice not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases')}
            sx={{ 
              mt: 2,
              textTransform: 'none',
              fontSize: '0.8125rem'
            }}
          >
            Back to Purchases
          </Button>
        </Box>
      </Container>
    );
  }

  const purchase = selectedPurchase;

  const getStatusColor = (status, docstatus) => {
    const statusLower = status?.toLowerCase() || '';
    const docStatus = docstatus !== undefined ? docstatus : null;
    
    if (statusLower === 'cancelled' || docStatus === 2) return 'error';
    if (statusLower === 'to bill') return 'info';
    if (statusLower === 'completed' || statusLower === 'paid' || docStatus === 1) return 'success';
    if (statusLower === 'draft' || docStatus === 0) return 'default';
    if (statusLower === 'pending' || statusLower === 'unpaid') return 'warning';
    return 'default';
  };

  const getStatusLabel = () => {
    if (purchase.status) return purchase.status;
    if (purchase.docstatus === 0) return 'Draft';
    if (purchase.docstatus === 1) return 'Submitted';
    if (purchase.docstatus === 2) return 'Cancelled';
    return 'Unknown';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/purchases')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Purchase Invoice: {purchase.name}
            </Typography>
            <Chip
              label={getStatusLabel()}
              color={getStatusColor(purchase.status, purchase.docstatus)}
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {purchase.docstatus === 0 && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/purchases/new?draft=${purchase.name}`)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8125rem'
                }}
              >
                Edit
              </Button>
            )}
            {purchase.docstatus === 0 && canSubmitPO && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => setSubmitDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                Submit Purchase Order
              </Button>
            )}
            {purchase.docstatus === 1 && purchase.status !== 'To Bill' && canCreateGRN && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Inventory />}
                onClick={() => navigate(`/purchases/create-grn?lpo_no=${purchase.name}`)}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                Receive Goods (Create GRN)
              </Button>
            )}
            {purchase.status === 'To Bill' && purchase.purchase_receipts && purchase.purchase_receipts.length > 0 && (
              <Button
                variant="contained"
                color="info"
                startIcon={<Receipt />}
                onClick={() => setStockReceiptDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                Create Stock Receipt
              </Button>
            )}
            {purchase.docstatus === 1 && purchase.status !== 'Cancelled' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setCancelDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8125rem'
                }}
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
              sx={{ 
                textTransform: 'none',
                fontSize: '0.8125rem'
              }}
            >
              Print
            </Button>
          </Box>
        </Box>

        {/* Flow Navigation Card */}
        {(purchase.docstatus === 0 || (purchase.docstatus === 1 && purchase.status !== 'To Bill')) && (
          <Box sx={{ mb: 3 }}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {purchase.docstatus === 0 ? 'Next Step: Submit Purchase Order' : 'Next Step: Receive Goods'}
                    </Typography>
                    <Typography variant="body2">
                      {purchase.docstatus === 0
                        ? 'Submit this purchase order to make it available for goods receipt.'
                        : 'Create a GRN to receive goods against this purchase order. Stock will be automatically updated.'}
                    </Typography>
                  </Box>
                  <Box>
                    {purchase.docstatus === 0 && canSubmitPO && (
                      <Button
                        variant="contained"
                        color="inherit"
                        startIcon={<Send />}
                        onClick={() => setSubmitDialogOpen(true)}
                        sx={{ 
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.8125rem'
                        }}
                      >
                        Submit Now
                      </Button>
                    )}
                    {purchase.docstatus === 1 && purchase.status !== 'To Bill' && canCreateGRN && (
                      <Button
                        variant="contained"
                        color="inherit"
                        startIcon={<Inventory />}
                        onClick={() => navigate(`/purchases/create-grn?lpo_no=${purchase.name}`)}
                        sx={{ 
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.8125rem'
                        }}
                      >
                        Create GRN
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* To Bill Status Card */}
        {purchase.status === 'To Bill' && purchase.purchase_receipts && purchase.purchase_receipts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Next Step: Create Stock Receipt or Purchase Invoice
                    </Typography>
                    <Typography variant="body2">
                      This purchase order is ready for billing. You can create a stock receipt from the purchase receipts or create a purchase invoice.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
                      Available Purchase Receipts: {purchase.purchase_receipts.join(', ')}
                    </Typography>
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      color="inherit"
                      startIcon={<Receipt />}
                      onClick={() => setStockReceiptDialogOpen(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Create Stock Receipt
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

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
                      {purchase.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supplier
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {purchase.supplier || purchase.supplier_name || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1">
                      {purchase.posting_date 
                        ? new Date(purchase.posting_date).toLocaleDateString() 
                        : '-'}
                    </Typography>
                  </Grid>
                  {purchase.bill_date && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Bill Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(purchase.bill_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1">
                      {purchase.company || '-'}
                    </Typography>
                  </Grid>
                  {purchase.bill_no && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Bill Number
                      </Typography>
                      <Typography variant="body1">
                        {purchase.bill_no}
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
                      KES {(purchase.net_total || purchase.total || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Taxes
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {(purchase.total_taxes_and_charges || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Grand Total
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      KES {(purchase.grand_total || purchase.total_amount || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  {purchase.outstanding_amount !== undefined && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Outstanding Amount
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        color={purchase.outstanding_amount > 0 ? 'error.main' : 'success.main'}
                      >
                        KES {(purchase.outstanding_amount || 0).toFixed(2)}
                      </Typography>
                    </Grid>
                  )}
                  {purchase.discount_amount && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Discount
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="success.main">
                        - KES {purchase.discount_amount.toFixed(2)}
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
                <TableContainer
                  sx={{
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Item Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                        {purchase.items?.[0]?.warehouse && (
                          <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchase.items && purchase.items.length > 0 ? (
                        purchase.items.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{item.item_code}</TableCell>
                            <TableCell>{item.item_name || item.item_code}</TableCell>
                            <TableCell align="right">{item.qty || item.quantity || 0}</TableCell>
                            <TableCell align="right">
                              KES {(item.rate || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              KES {(item.amount || 0).toFixed(2)}
                            </TableCell>
                            {item.warehouse && (
                              <TableCell>{item.warehouse}</TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6, border: 'none' }}>
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

          {/* Actions */}
          {purchase.docstatus === 1 && (
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
                      onClick={() => navigate(`/purchases/returns?purchase=${purchase.name}`)}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '0.8125rem'
                      }}
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
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '0.8125rem'
                      }}
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

      {/* Submit Purchase Order Dialog */}
      <Dialog 
        open={submitDialogOpen} 
        onClose={isSubmitting ? undefined : () => setSubmitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit Purchase Order <strong>{purchase?.name}</strong>?
            <br />
            <br />
            Once submitted, the purchase order cannot be edited and goods can be received against it.
          </DialogContentText>
          {isSubmitting && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Submitting purchase order...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSubmitDialogOpen(false)} 
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary" 
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Invoice Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Purchase Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel Purchase Invoice "{purchase?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCancel} 
            color="error" 
            variant="contained" 
            disabled={isLoadingDetails}
            startIcon={isLoadingDetails ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem'
            }}
          >
            {isLoadingDetails ? 'Cancelling...' : 'Cancel Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Stock Receipt Dialog */}
      <Dialog open={stockReceiptDialogOpen} onClose={() => {
        setStockReceiptDialogOpen(false);
        setSelectedGRN(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Stock Receipt</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a Purchase Receipt (GRN) to create a stock receipt from:
          </DialogContentText>
          <FormControl fullWidth size="small">
            <InputLabel>Purchase Receipt (GRN)</InputLabel>
            <Select
              value={selectedGRN || ''}
              onChange={(e) => setSelectedGRN(e.target.value)}
              label="Purchase Receipt (GRN)"
            >
              {purchase.purchase_receipts?.map((grnNo) => (
                <MenuItem key={grnNo} value={grnNo}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QrCodeScanner sx={{ fontSize: 16, color: 'text.disabled' }} />
                    {grnNo}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setStockReceiptDialogOpen(false);
              setSelectedGRN(null);
            }}
            sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateStockReceipt}
            variant="contained"
            disabled={!selectedGRN || isLoading}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <Receipt />}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem'
            }}
          >
            {isLoading ? 'Creating...' : 'Create Stock Receipt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchaseDetails;

