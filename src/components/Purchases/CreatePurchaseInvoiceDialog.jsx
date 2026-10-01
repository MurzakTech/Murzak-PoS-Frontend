import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Close,
  AttachFile,
  Delete,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { createPurchaseInvoiceFromGRN } from '../../store/purchaseSlice';
import { useNavigate } from 'react-router-dom';

const CreatePurchaseInvoiceDialog = ({ open, onClose, grnNo, grnData }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierInvoiceFile, setSupplierInvoiceFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      bill_no: '',
      bill_date: new Date().toISOString().split('T')[0],
      do_not_submit: false,
    },
  });

  const watchedDoNotSubmit = watch('do_not_submit');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFileError('');
    setSupplierInvoiceFile(null);

    if (!file) return;

    // Validate file type (PDF preferred, but allow other types)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setFileError('Please upload a PDF or image file (PDF, JPG, PNG)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      return;
    }

    setSupplierInvoiceFile(file);
  };

  const handleRemoveFile = () => {
    setSupplierInvoiceFile(null);
    setFileError('');
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data) => {
    if (!grnNo) {
      return;
    }

    setIsSubmitting(true);
    setFileError('');

    try {
      const invoiceData = {
        grn_no: grnNo,
        do_not_submit: data.do_not_submit || false,
        ...(data.bill_no && { bill_no: data.bill_no }),
        ...(data.bill_date && { bill_date: data.bill_date }),
      };

      // Add supplier invoice file if provided
      if (supplierInvoiceFile) {
        try {
          const base64Content = await convertFileToBase64(supplierInvoiceFile);
          invoiceData.supplier_invoice_file = base64Content;
          invoiceData.supplier_invoice_filename = supplierInvoiceFile.name;
        } catch (error) {
          setFileError('Failed to process file. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await dispatch(createPurchaseInvoiceFromGRN(invoiceData));

      if (result.type === 'purchase/createPurchaseInvoiceFromGRN/fulfilled') {
        const invoiceName = result.payload.invoice?.invoice_no || result.payload.invoice?.name;
        reset();
        setSupplierInvoiceFile(null);
        onClose();
        
        // Navigate to the created invoice
        if (invoiceName) {
          navigate(`/purchases/invoices/${invoiceName}`);
        }
      }
    } catch (error) {
      console.error('Error creating purchase invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setSupplierInvoiceFile(null);
      setFileError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Create Purchase Invoice from GRN</Typography>
          <IconButton
            onClick={handleClose}
            disabled={isSubmitting}
            size="small"
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {grnNo && (
              <Alert severity="info">
                Creating Purchase Invoice from GRN: <strong>{grnNo}</strong>
              </Alert>
            )}

            <Controller
              name="bill_no"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Supplier Bill No"
                  placeholder="Enter supplier invoice number"
                  fullWidth
                  error={!!errors.bill_no}
                  helperText={errors.bill_no?.message}
                />
              )}
            />

            <Controller
              name="bill_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Bill Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={!!errors.bill_date}
                  helperText={errors.bill_date?.message}
                />
              )}
            />

            {/* File Upload */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Supplier Invoice File (Optional)
              </Typography>
              {!supplierInvoiceFile ? (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachFile />}
                  fullWidth
                  disabled={isSubmitting}
                >
                  Upload Supplier Invoice
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </Button>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.default',
                  }}
                >
                  <AttachFile sx={{ color: 'text.secondary' }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {supplierInvoiceFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(supplierInvoiceFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              )}
              {fileError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {fileError}
                </Typography>
              )}
            </Box>

            <Controller
              name="do_not_submit"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      {...field}
                      checked={field.value}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">
                        Save as Draft
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.value
                          ? 'Invoice will be saved as draft (docstatus = 0)'
                          : 'Invoice will be submitted automatically (docstatus = 1)'}
                      </Typography>
                    </Box>
                  }
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: 'none' }}
          >
            {isSubmitting ? 'Creating...' : watchedDoNotSubmit ? 'Save as Draft' : 'Create & Submit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreatePurchaseInvoiceDialog;

