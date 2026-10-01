import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listPurchaseInvoices, submitPurchaseOrder } from '../../store/purchaseSlice';
import { showNotification } from '../../store/notificationSlice';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * SubmitPurchaseOrder Component
 * Stage 2: Submit Purchase Orders that are in Draft state
 * Role-based access: Users with permission to submit purchase orders
 */
const SubmitPurchaseOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { purchases, isLoading } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);
  const { hasRole, hasAccess } = useRoleAccess();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Check role-based access - allow if user has role or access to submit purchases
  const canSubmitPO = hasRole(['Purchase Manager', 'Purchase User', 'Administrator', 'System Manager']) || 
                      hasAccess('/purchases/submit');

  // Filter to show only Draft purchase orders (docstatus === 0)
  const draftPurchases = purchases.filter((po) => po.docstatus === 0 || po.status === 'Draft');

  // Load purchases on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listPurchaseInvoices({
        company: userCompany,
        filters: JSON.stringify({ docstatus: 0 }), // Only draft orders
        limit: 100,
        offset: 0,
      }));
    }
  }, [dispatch, userCompany]);

  const handleSubmitClick = (purchaseOrder) => {
    setSelectedPO(purchaseOrder);
    setSubmitDialogOpen(true);
  };

  const handleSubmitConfirm = async () => {
    if (!selectedPO) return;

    setIsSubmitting(true);
    try {
      const result = await dispatch(submitPurchaseOrder({ lpo_no: selectedPO.name }));

      if (result.type === 'purchase/submitPurchaseOrder/fulfilled') {
        // Success is already handled by the slice with notification
        // Close dialog and refresh list
        setSubmitDialogOpen(false);
        setSelectedPO(null);
        
        // Refresh the list to remove the submitted PO from draft list
        if (userCompany) {
          dispatch(listPurchaseInvoices({
            company: userCompany,
            filters: JSON.stringify({ docstatus: 0 }),
            limit: 100,
            offset: 0,
          }));
        }
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

  const handleCancelSubmit = () => {
    setSubmitDialogOpen(false);
    setSelectedPO(null);
  };

  const getStatusColor = (docstatus, status) => {
    if (docstatus === 0 || status === 'Draft') return 'default';
    if (docstatus === 1 || status === 'Submitted') return 'success';
    if (docstatus === 2 || status === 'Cancelled') return 'error';
    return 'default';
  };

  const getStatusLabel = (docstatus, status) => {
    if (docstatus === 0 || status === 'Draft') return 'Draft';
    if (docstatus === 1 || status === 'Submitted') return 'Submitted';
    if (docstatus === 2 || status === 'Cancelled') return 'Cancelled';
    return status || 'Unknown';
  };

  // If user doesn't have permission, show access denied message
  if (!canSubmitPO) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            You do not have permission to submit purchase orders. Please contact your administrator.
          </Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/purchases')}>
            Back to Purchases
          </Button>
        </Box>
      </Container>
    );
  }

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
            Submit Purchase Orders
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          This page shows all Purchase Orders in Draft state. Submit them to make them available for goods receipt.
        </Alert>

        {/* Draft Purchase Orders List */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Transaction Date</TableCell>
                  <TableCell>Grand Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : draftPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No draft purchase orders found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  draftPurchases.map((po) => (
                    <TableRow key={po.name} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/purchases/${po.name}`)}
                        >
                          {po.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{po.supplier || po.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {po.transaction_date
                          ? new Date(po.transaction_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          KES {po.grand_total?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(po.docstatus, po.status)}
                          color={getStatusColor(po.docstatus, po.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Send />}
                          onClick={() => handleSubmitClick(po)}
                        >
                          Submit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Submit Confirmation Dialog */}
        <Dialog 
          open={submitDialogOpen} 
          onClose={isSubmitting ? undefined : handleCancelSubmit} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Confirm Submission</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to submit Purchase Order <strong>{selectedPO?.name}</strong>?
              <br />
              <br />
              Once submitted, the purchase order cannot be edited and goods can be received against it.
            </DialogContentText>
            {isSubmitting && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Submitting purchase order...
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelSubmit} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitConfirm}
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SubmitPurchaseOrder;

