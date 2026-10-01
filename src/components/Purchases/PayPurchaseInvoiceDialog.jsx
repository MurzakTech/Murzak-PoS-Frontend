import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Close,
  AttachMoney,
  Payment,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { payPurchaseInvoice, getPurchaseInvoiceDetails } from '../../store/purchaseSlice';

const PayPurchaseInvoiceDialog = ({ open, onClose, invoice }) => {
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      invoice_no: invoice?.invoice_no || invoice?.name || '',
      paid_amount: invoice?.outstanding_amount || 0,
      mode_of_payment: '',
      bank_account: '',
      posting_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      reference_date: '',
      remarks: '',
      submit: true,
    },
  });

  const watchedPaidAmount = watch('paid_amount');
  const outstandingAmount = invoice?.outstanding_amount || 0;

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice && open) {
      reset({
        invoice_no: invoice.invoice_no || invoice.name || '',
        paid_amount: invoice.outstanding_amount || 0,
        mode_of_payment: '',
        bank_account: '',
        posting_date: new Date().toISOString().split('T')[0],
        reference_no: '',
        reference_date: '',
        remarks: '',
        submit: true,
      });
    }
  }, [invoice, open, reset]);

  const onSubmit = async (data) => {
    if (!data.invoice_no) {
      return;
    }

    // Validate paid amount
    if (data.paid_amount <= 0) {
      return;
    }

    if (data.paid_amount > outstandingAmount) {
      return;
    }

    try {
      const paymentData = {
        invoice_no: data.invoice_no,
        paid_amount: parseFloat(data.paid_amount),
        ...(data.mode_of_payment && { mode_of_payment: data.mode_of_payment }),
        ...(data.bank_account && { bank_account: data.bank_account }),
        ...(data.posting_date && { posting_date: data.posting_date }),
        ...(data.reference_no && { reference_no: data.reference_no }),
        ...(data.reference_date && { reference_date: data.reference_date }),
        ...(data.remarks && { remarks: data.remarks }),
        submit: data.submit !== false,
      };

      const result = await dispatch(payPurchaseInvoice(paymentData));

      if (result.type === 'purchase/payPurchaseInvoice/fulfilled') {
        // Refresh invoice details
        await dispatch(getPurchaseInvoiceDetails({ invoice_no: data.invoice_no }));
        reset();
        onClose();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Format currency
  const formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payment />
            <Typography variant="h6">Pay Purchase Invoice</Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {invoice && (
              <Alert severity="info">
                <Typography variant="body2">
                  Invoice: <strong>{invoice.invoice_no || invoice.name}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Outstanding Amount: <strong>{formatCurrency(outstandingAmount, invoice.currency)}</strong>
                </Typography>
              </Alert>
            )}

            <Controller
              name="invoice_no"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Invoice Number"
                  fullWidth
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="paid_amount"
              control={control}
              rules={{
                required: 'Amount to pay is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' },
                max: {
                  value: outstandingAmount,
                  message: `Amount cannot exceed outstanding amount (${formatCurrency(outstandingAmount, invoice?.currency)})`,
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Amount to Pay"
                  type="number"
                  fullWidth
                  inputProps={{
                    step: '0.01',
                    min: '0.01',
                    max: outstandingAmount,
                  }}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  error={!!errors.paid_amount}
                  helperText={errors.paid_amount?.message || `Outstanding: ${formatCurrency(outstandingAmount, invoice?.currency)}`}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="mode_of_payment"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Mode of Payment"
                  placeholder="e.g., Cash, Bank Transfer, Cheque"
                  fullWidth
                  helperText="Optional - system will use default if not provided"
                />
              )}
            />

            <Controller
              name="bank_account"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Bank Account"
                  placeholder="Required for bank payments"
                  fullWidth
                  helperText="Optional - required for bank payments"
                />
              )}
            />

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
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={!!errors.posting_date}
                  helperText={errors.posting_date?.message}
                />
              )}
            />

            <Controller
              name="reference_no"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Reference Number"
                  placeholder="e.g., Cheque number, Transaction ID"
                  fullWidth
                  helperText="Optional - for cheque numbers, transaction IDs, etc."
                />
              )}
            />

            <Controller
              name="reference_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Reference Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  helperText="Optional - e.g., cheque date"
                />
              )}
            />

            <Controller
              name="remarks"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Remarks"
                  placeholder="Additional notes (optional)"
                  fullWidth
                  multiline
                  rows={3}
                />
              )}
            />

            <Controller
              name="submit"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value !== false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Submit payment entry immediately"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Payment />}
            sx={{ textTransform: 'none' }}
          >
            Process Payment
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PayPurchaseInvoiceDialog;

