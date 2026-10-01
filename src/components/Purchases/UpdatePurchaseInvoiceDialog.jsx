import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Close,
  AttachFile,
  Delete,
  Add,
  Remove,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updatePurchaseInvoiceAPI, getPurchaseInvoiceDetails } from '../../store/purchaseSlice';

const UpdatePurchaseInvoiceDialog = ({ open, onClose, invoice }) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierInvoiceFile, setSupplierInvoiceFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      invoice_no: invoice?.invoice_no || invoice?.name || '',
      bill_no: invoice?.bill_no || '',
      bill_date: invoice?.bill_date || new Date().toISOString().split('T')[0],
      posting_date: invoice?.posting_date || new Date().toISOString().split('T')[0],
      items: invoice?.items?.map(item => ({
        item_code: item.item_code || '',
        qty: item.qty || 0,
        rate: item.rate || 0,
        warehouse: item.warehouse || '',
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice && open) {
      reset({
        invoice_no: invoice.invoice_no || invoice.name || '',
        bill_no: invoice.bill_no || '',
        bill_date: invoice.bill_date || new Date().toISOString().split('T')[0],
        posting_date: invoice.posting_date || new Date().toISOString().split('T')[0],
        items: invoice.items?.map(item => ({
          item_code: item.item_code || '',
          qty: item.qty || 0,
          rate: item.rate || 0,
          warehouse: item.warehouse || '',
        })) || [],
      });
      setSupplierInvoiceFile(null);
      setFileError('');
    }
  }, [invoice, open, reset]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFileError('');
    setSupplierInvoiceFile(null);

    if (!file) return;

    // Validate file type
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
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data) => {
    if (!data.invoice_no) {
      return;
    }

    setIsSubmitting(true);
    setFileError('');

    try {
      const invoiceData = {
        invoice_no: data.invoice_no,
        ...(data.bill_no && { bill_no: data.bill_no }),
        ...(data.bill_date && { bill_date: data.bill_date }),
        ...(data.posting_date && { posting_date: data.posting_date }),
        ...(data.items && data.items.length > 0 && { items: data.items }),
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

      const result = await dispatch(updatePurchaseInvoiceAPI(invoiceData));

      if (result.type === 'purchase/updatePurchaseInvoiceAPI/fulfilled') {
        // Refresh invoice details
        await dispatch(getPurchaseInvoiceDetails({ invoice_no: data.invoice_no }));
        reset();
        setSupplierInvoiceFile(null);
        onClose();
      }
    } catch (error) {
      console.error('Error updating purchase invoice:', error);
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Update Purchase Invoice</Typography>
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
            {invoice?.invoice_no && (
              <Alert severity="info">
                Updating Purchase Invoice: <strong>{invoice.invoice_no}</strong>
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

            <Box sx={{ display: 'flex', gap: 2 }}>
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

              <Controller
                name="posting_date"
                control={control}
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
            </Box>

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

            {/* Items Section */}
            <Divider />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Items</Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => append({ item_code: '', qty: 0, rate: 0, warehouse: '' })}
                  disabled={isSubmitting}
                  sx={{ textTransform: 'none' }}
                >
                  Add Item
                </Button>
              </Box>

              {fields.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Code</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell>Warehouse</TableCell>
                        <TableCell align="center" width={50}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Controller
                              name={`items.${index}.item_code`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  fullWidth
                                  placeholder="Item Code"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`items.${index}.qty`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  fullWidth
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`items.${index}.rate`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  fullWidth
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                                  }}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`items.${index}.warehouse`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  fullWidth
                                  placeholder="Warehouse"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => remove(index)}
                              disabled={isSubmitting}
                            >
                              <Remove />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No items. Click "Add Item" to add items to this invoice.
                </Alert>
              )}
            </Box>
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
            {isSubmitting ? 'Updating...' : 'Update Invoice'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UpdatePurchaseInvoiceDialog;

