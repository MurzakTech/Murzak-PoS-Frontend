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
  GridLegacy as Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Tabs,
  Tab,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  useTheme,
  alpha,
  InputAdornment,
  Stack,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  Add, 
  Delete, 
  Upload, 
  Download, 
  Create,
  ShoppingCart,
  Info,
  AccountBalance,
  Settings,
  Business,
  CalendarToday,
  Receipt,
  Warehouse,
  Language,
  AttachMoney,
  QrCodeScanner,
  Numbers,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createPurchaseInvoice,
  upsertPurchaseOrder,
  getPurchaseInvoice,
  checkETIMSStatus,
  listCashAndBankAccounts,
} from '../../store/purchaseSlice';
import { getSuppliers } from '../../store/supplierSlice';
import { getProducts, createProduct } from '../../store/productSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';
const NewPurchase = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const draftName = searchParams.get('draft');
  
  const { suppliers, isLoading: isLoadingSuppliers } = useAppSelector((state) => state.supplier);
  const { products, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { isLoading, isLoadingDetails, etimsStatus, cashBankAccounts, isLoadingAccounts } = useAppSelector((state) => state.purchase);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [uploadMethod, setUploadMethod] = useState(0); // 0 = manual, 1 = CSV
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProductItemIndex, setNewProductItemIndex] = useState(null);

  // Generate or retrieve idempotency key
  const getIdempotencyKey = () => {
    const storageKey = `purchase_idempotency_${draftName || 'new'}`;
    let idempotencyKey = sessionStorage.getItem(storageKey);
    
    if (!idempotencyKey) {
      // Generate a unique key: timestamp + random string
      idempotencyKey = `po_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem(storageKey, idempotencyKey);
    }
    
    return idempotencyKey;
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      supplier: '',
      posting_date: new Date().toISOString().split('T')[0],
      bill_no: '',
      bill_date: '',
      warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      currency: 'KES',
      items: [{ item_code: '', qty: 1, rate: 0, warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '' }],
      taxes: [],
      update_stock: false,
      prevent_etims_submission: false,
      is_paid: false,
      paid_amount: 0,
      cash_bank_account: '',
      mode_of_payment: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedSupplier = watch('supplier');
  const watchedWarehouse = watch('warehouse');
  const watchedIsPaid = watch('is_paid');

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.qty || 0) * parseFloat(item.rate || 0));
    }, 0);
    const taxAmount = 0; // TODO: Calculate from taxes array
    return {
      subtotal,
      taxAmount,
      grandTotal: subtotal + taxAmount,
    };
  };

  const totals = calculateTotals();
  const watchedGrandTotal = totals.grandTotal;

  // Fetch data on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getSuppliers({ company: userCompany }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(checkETIMSStatus({ company: userCompany }));
      dispatch(listCashAndBankAccounts({ company: userCompany }));
      
      // Load draft if editing
      if (draftName) {
        dispatch(getPurchaseInvoice({ po_name: draftName })).then((result) => {
          if (result.type === 'purchase/getPurchaseInvoice/fulfilled' && result.payload.purchase) {
            const purchase = result.payload.purchase;
            const warehouseName = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
            reset({
              supplier: purchase.supplier || '',
              posting_date: purchase.posting_date || new Date().toISOString().split('T')[0],
              bill_no: purchase.bill_no || '',
              bill_date: purchase.bill_date || '',
              warehouse: purchase.items?.[0]?.warehouse || warehouseName,
              currency: purchase.currency || 'KES',
              items: purchase.items?.map(item => ({
                item_code: item.item_code || '',
                qty: item.qty || 1,
                rate: item.rate || 0,
                warehouse: item.warehouse || warehouseName,
              })) || [{ item_code: '', qty: 1, rate: 0, warehouse: '' }],
              update_stock: purchase.update_stock || false,
              prevent_etims_submission: purchase.prevent_etims_submission || false,
              is_paid: purchase.is_paid || false,
              paid_amount: purchase.paid_amount || purchase.grand_total || 0,
              cash_bank_account: purchase.cash_bank_account || '',
              mode_of_payment: purchase.mode_of_payment || '',
            });
            setIsDraft(purchase.docstatus === 0);
          }
        });
      }
    }
  }, [dispatch, userCompany, draftName, reset]);

  // Update warehouse for all items when default warehouse changes
  useEffect(() => {
    if (watchedWarehouse) {
      watchedItems.forEach((_, index) => {
        if (!watchedItems[index].warehouse) {
          setValue(`items.${index}.warehouse`, watchedWarehouse);
        }
      });
    }
  }, [watchedWarehouse, watchedItems, setValue]);

  // Update paid_amount to grand_total when is_paid is checked
  useEffect(() => {
    if (watchedIsPaid && watchedGrandTotal > 0) {
      const currentPaidAmount = watch('paid_amount');
      if (!currentPaidAmount || currentPaidAmount === 0) {
        setValue('paid_amount', watchedGrandTotal);
      }
    }
  }, [watchedIsPaid, watchedGrandTotal, watch, setValue]);

  const downloadTemplate = () => {
    const csvContent = `item_code,qty,rate,warehouse
# Instructions:
# 1. Fill in the item_code column with product item codes
# 2. Fill in qty (quantity) - numbers only
# 3. Fill in rate (price per unit) - numbers only, no currency symbols
# 4. Fill in warehouse (optional, will use default if empty)
# 5. Remove this instruction row and example rows before uploading
# Example:
ITEM-001,10,100.00,Warehouse - Company
ITEM-002,5,50.00,Warehouse - Company`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase_items_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFileError('');
    setPreviewData([]);
    setFile(null);

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setFileError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'));

      if (lines.length === 0) {
        setFileError('File is empty or contains only comments');
        setFile(null);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      const requiredColumns = ['item_code', 'qty', 'rate'];
      const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

      if (missingColumns.length > 0) {
        setFileError(`Missing required columns: ${missingColumns.join(', ')}. Found: ${headers.join(', ')}`);
        setFile(null);
        return;
      }

      const data = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return {
          item_code: row.item_code || '',
          qty: parseFloat(row.qty) || 1,
          rate: parseFloat(row.rate) || 0,
          warehouse: row.warehouse || watchedWarehouse || '',
        };
      }).filter((row) => row.item_code);

      if (data.length === 0) {
        setFileError('No valid data rows found in the file');
        setFile(null);
        return;
      }

      setPreviewData(data);
    };

    reader.onerror = () => {
      setFileError('Error reading file');
      setFile(null);
    };

    reader.readAsText(selectedFile);
  };

  const handleUseCSVData = () => {
    if (previewData.length > 0) {
      // Clear existing items and add CSV items
      remove();
      previewData.forEach((item) => {
        append(item);
      });
      setFile(null);
      setPreviewData([]);
      setUploadMethod(0);
    }
  };

  const onSubmit = async (data, saveAsDraft = false) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    // Filter out empty items
    const validItems = data.items.filter(
      (item) => item.item_code && item.qty > 0 && item.rate >= 0
    );

    if (validItems.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one valid item.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    // Validate payment fields if is_paid is true
    if (data.is_paid) {
      if (!data.cash_bank_account) {
        dispatch(showNotification({
          message: 'Cash/Bank account is required when marking invoice as paid.',
          severity: 'error',
          title: 'Validation Error',
        }));
        return;
      }
      if (!data.paid_amount || data.paid_amount <= 0) {
        dispatch(showNotification({
          message: 'Paid amount must be greater than 0.',
          severity: 'error',
          title: 'Validation Error',
        }));
        return;
      }
      if (data.paid_amount > totals.grandTotal) {
        dispatch(showNotification({
          message: `Paid amount (KES ${data.paid_amount.toFixed(2)}) cannot exceed grand total (KES ${totals.grandTotal.toFixed(2)}).`,
          severity: 'error',
          title: 'Validation Error',
        }));
        return;
      }
    }

    // Get default warehouse from form or first item
    const defaultWarehouse = data.warehouse || validItems[0]?.warehouse || '';
    
    // Build base purchase data structure
    const basePurchaseData = {
      supplier: data.supplier,
      company: userCompany,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        warehouse: item.warehouse || defaultWarehouse,
      })),
      // Top-level warehouse field (required by API)
      warehouse: defaultWarehouse,
    };

    let result;
    
    // If updating an existing draft, use upsert
    if (draftName && isDraft) {
      const updateData = {
        ...basePurchaseData,
        // Optional fields for upsert
        transaction_date: data.posting_date || undefined,
        idempotency_key: `po_update_${draftName}_${Date.now()}`,
        submit: !saveAsDraft,
      };
      result = await dispatch(upsertPurchaseOrder(updateData));
    } else {
      // For new purchases, use createPurchaseInvoice
      const createData = {
        ...basePurchaseData,
        // Optional fields for create
        transaction_date: data.posting_date || undefined,
        idempotency_key: getIdempotencyKey(),
      };
      result = await dispatch(createPurchaseInvoice(createData));
    }

    if (result.type.includes('/fulfilled')) {
      const purchaseName = result.payload?.purchase?.name || draftName;
      
      // Clear idempotency key on success
      if (draftName) {
        sessionStorage.removeItem(`purchase_idempotency_${draftName}`);
      } else {
        sessionStorage.removeItem('purchase_idempotency_new');
      }
      
      if (saveAsDraft || (result.payload?.purchase?.docstatus === 0)) {
        // Still a draft
        dispatch(showNotification({
          message: 'Purchase saved as draft successfully',
          severity: 'success',
          title: 'Draft Saved',
        }));
        navigate(`/purchases/new?draft=${purchaseName}`);
      } else {
        // Submitted
        dispatch(showNotification({
          message: 'Purchase Order submitted successfully',
          severity: 'success',
          title: 'Success',
        }));
        navigate('/purchases');
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/purchases')}
              sx={{ 
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart color="primary" />
                {draftName ? 'Edit Purchase Order' : 'New Purchase Order'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {draftName ? 'Update your purchase order details' : 'Create a new purchase order'}
              </Typography>
            </Box>
          </Box>
          {draftName && (
            <Chip 
              label="Draft" 
              color="warning" 
              variant="outlined"
              sx={{ fontWeight: 'medium' }}
            />
          )}
        </Box>

        {etimsStatus.has_etims && (
          <Alert 
            severity="info" 
            icon={<Info />}
            sx={{ 
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                alignItems: 'center',
              },
            }}
          >
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              eTIMS Integration Active
            </Typography>
            <Typography variant="body2">
              Purchases will be automatically submitted to eTIMS unless prevented.
            </Typography>
          </Alert>
        )}

        {/* Form */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 0,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
          }}
        >
          <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
            <Grid container spacing={0}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Info color="primary" fontSize="small" />
                    Basic Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supplier and order details
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="supplier"
                        control={control}
                        rules={{ required: 'Supplier is required' }}
                        render={({ field }) => {
                          const supplierValue = suppliers.find(
                            (s) => s.supplier_name === field.value || s.name === field.value
                          ) || null;
                          return (
                            <Autocomplete
                              options={suppliers}
                              value={supplierValue}
                              getOptionLabel={(option) => option?.supplier_name || option?.name || ''}
                              isOptionEqualToValue={(option, value) =>
                                option?.supplier_name === value?.supplier_name || option?.name === value?.name
                              }
                              loading={isLoadingSuppliers}
                              onChange={(e, value) => field.onChange(value?.supplier_name || value?.name || '')}
                              onBlur={field.onBlur}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Supplier *"
                                  size="small"
                                  required
                                  error={!!errors.supplier}
                                  helperText={errors.supplier?.message}
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start">
                                          <Business sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                    '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                  }}
                                />
                              )}
                            />
                          );
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Controller
                        name="posting_date"
                        control={control}
                        rules={{ required: 'Posting date is required' }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Posting Date *"
                            type="date"
                            fullWidth
                            size="small"
                            required
                            InputLabelProps={{ shrink: true }}
                            error={!!errors.posting_date}
                            helperText={errors.posting_date?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Controller
                        name="warehouse"
                        control={control}
                        render={({ field }) => {
                          const warehouseValue = warehouses.find(
                            (w) => w.name === field.value || w.warehouse_name === field.value
                          ) || null;
                          return (
                            <Autocomplete
                              options={warehouses}
                              value={warehouseValue}
                              getOptionLabel={(option) => option?.warehouse_name || option?.name || ''}
                              isOptionEqualToValue={(option, value) =>
                                option?.name === value?.name || option?.warehouse_name === value?.warehouse_name
                              }
                              loading={isLoadingWarehouses}
                              onChange={(e, value) => field.onChange(value?.name || '')}
                              onBlur={field.onBlur}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Default Warehouse"
                                  size="small"
                                  placeholder="Select warehouse"
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start">
                                          <Warehouse sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                    '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                  }}
                                />
                              )}
                            />
                          );
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="bill_no"
                        control={control}
                        render={({ field }) => (
                          <TextField 
                            {...field} 
                            label="Bill Number" 
                            fullWidth
                            size="small"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Receipt sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="bill_date"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Bill Date"
                            type="date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <TextField 
                            {...field} 
                            label="Currency" 
                            fullWidth
                            size="small"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Language sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            defaultValue="KES"
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Items Section */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderTop: `1px solid ${theme.palette.divider}`,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold"
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <ShoppingCart color="primary" fontSize="small" />
                        Items
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add items manually or upload via CSV
                      </Typography>
                    </Box>
                    <Tabs 
                      value={uploadMethod} 
                      onChange={(e, newValue) => setUploadMethod(newValue)}
                      sx={{
                        '& .MuiTab-root': {
                          textTransform: 'none',
                          fontWeight: 500,
                          minHeight: 40,
                        },
                      }}
                    >
                      <Tab label="Manual Entry" />
                      <Tab label="CSV Upload" />
                    </Tabs>
                  </Box>
                </Box>
              </Grid>

              {uploadMethod === 0 ? (
                <>
                  <Grid item xs={12}>
                    <Box sx={{ p: 3 }}>
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
                              <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Rate</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600, width: 100 }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = watchedItems[index];
                            const amount = (parseFloat(item?.qty || 0) * parseFloat(item?.rate || 0)).toFixed(2);
                            return (
                              <TableRow 
                                key={field.id}
                                hover
                                sx={{
                                  '&:last-child td': {
                                    borderBottom: 'none',
                                  },
                                }}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Controller
                                      name={`items.${index}.item_code`}
                                      control={control}
                                      rules={{ required: 'Item code is required' }}
                                      render={({ field }) => {
                                        const productValue = products.find(
                                          (p) => p.item_code === field.value || p.name === field.value
                                        ) || null;
                                        return (
                                          <Autocomplete
                                            options={products}
                                            value={productValue}
                                            getOptionLabel={(option) => option?.item_code || option?.name || ''}
                                            isOptionEqualToValue={(option, value) =>
                                              option?.item_code === value?.item_code || option?.name === value?.name
                                            }
                                            loading={isLoadingProducts}
                                            onChange={(e, value) => field.onChange(value?.item_code || value?.name || '')}
                                            onBlur={field.onBlur}
                                            sx={{ flex: 1 }}
                                            renderInput={(params) => (
                                              <TextField
                                                {...params}
                                                placeholder="Item Code"
                                                size="small"
                                                error={!!errors.items?.[index]?.item_code}
                                                InputProps={{
                                                  ...params.InputProps,
                                                  startAdornment: (
                                                    <>
                                                      <InputAdornment position="start">
                                                        <QrCodeScanner sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                      </InputAdornment>
                                                      {params.InputProps.startAdornment}
                                                    </>
                                                  ),
                                                }}
                                                sx={{ 
                                                  '& .MuiOutlinedInput-root': { 
                                                    borderRadius: 1.5,
                                                  },
                                                  '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                                }}
                                              />
                                            )}
                                          />
                                        );
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setNewProductItemIndex(index);
                                        setNewProductDialogOpen(true);
                                      }}
                                      title="Create New Product"
                                    >
                                      <Create fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Controller
                                    name={`items.${index}.qty`}
                                    control={control}
                                    rules={{ required: 'Quantity is required', min: { value: 0.01, message: 'Must be greater than 0' } }}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        type="number"
                                        size="small"
                                        inputProps={{ step: '0.01', min: '0.01' }}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        error={!!errors.items?.[index]?.qty}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <Numbers sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </InputAdornment>
                                          ),
                                        }}
                                        sx={{ 
                                          '& .MuiOutlinedInput-root': { 
                                            borderRadius: 1.5,
                                          },
                                          '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                        }}
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Controller
                                    name={`items.${index}.rate`}
                                    control={control}
                                    rules={{ required: 'Rate is required', min: { value: 0, message: 'Must be >= 0' } }}
                                    render={({ field }) => (
                                      <TextField
                                        {...field}
                                        type="number"
                                        size="small"
                                        inputProps={{ step: '0.01', min: '0' }}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        error={!!errors.items?.[index]?.rate}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </InputAdornment>
                                          ),
                                        }}
                                        sx={{ 
                                          '& .MuiOutlinedInput-root': { 
                                            borderRadius: 1.5,
                                          },
                                          '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                        }}
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    KES {amount}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Controller
                                    name={`items.${index}.warehouse`}
                                    control={control}
                                    render={({ field }) => {
                                      const warehouseValue = warehouses.find(
                                        (w) => w.name === field.value || w.warehouse_name === field.value
                                      ) || (watchedWarehouse ? warehouses.find(
                                        (w) => w.name === watchedWarehouse || w.warehouse_name === watchedWarehouse
                                      ) : null);
                                      return (
                                        <Autocomplete
                                          options={warehouses}
                                          value={warehouseValue}
                                          getOptionLabel={(option) => option?.warehouse_name || option?.name || ''}
                                          isOptionEqualToValue={(option, value) =>
                                            option?.name === value?.name || option?.warehouse_name === value?.warehouse_name
                                          }
                                          loading={isLoadingWarehouses}
                                          onChange={(e, value) => field.onChange(value?.name || '')}
                                          onBlur={field.onBlur}
                                          size="small"
                                          renderInput={(params) => (
                                            <TextField
                                              {...params}
                                              size="small"
                                              placeholder={watchedWarehouse || 'Warehouse'}
                                              InputProps={{
                                                ...params.InputProps,
                                                startAdornment: (
                                                  <>
                                                    <InputAdornment position="start">
                                                      <Warehouse sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                    </InputAdornment>
                                                    {params.InputProps.startAdornment}
                                                  </>
                                                ),
                                              }}
                                              sx={{ 
                                                '& .MuiOutlinedInput-root': { 
                                                  borderRadius: 1.5,
                                                },
                                                '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                              }}
                                            />
                                          )}
                                        />
                                      );
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1}
                                    color="error"
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                        </TableContainer>
                        <Button
                          startIcon={<Add />}
                          onClick={() => {
                            const warehouseName = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
                            append({ item_code: '', qty: 1, rate: 0, warehouse: watchedWarehouse || warehouseName });
                          }}
                          variant="outlined"
                          sx={{ 
                            mt: 2,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                          }}
                        >
                          Add Item
                        </Button>
                      </Box>
                    </Grid>
                  </>
                ) : (
                <>
                  <Grid item xs={12}>
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h6" fontWeight="bold">CSV Upload</Typography>
                        <Button
                          startIcon={<Download />}
                          onClick={downloadTemplate}
                          variant="outlined"
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                          }}
                        >
                          Download Template
                        </Button>
                      </Box>
                      <Alert 
                        severity="info" 
                        icon={<Info />}
                        sx={{ 
                          mb: 3,
                          borderRadius: 2,
                          '& .MuiAlert-icon': {
                            alignItems: 'center',
                          },
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          Upload Instructions:
                        </Typography>
                        <Typography variant="body2" component="div">
                          1. Download the CSV template
                          <br />
                          2. Fill in item_code, qty, rate, and warehouse columns
                          <br />
                          3. Remove instruction rows before uploading
                          <br />
                          4. Upload the filled CSV file below
                        </Typography>
                      </Alert>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ px: 3, pb: 3 }}>
                      <input
                        accept=".csv"
                        style={{ display: 'none' }}
                        id="csv-file-upload"
                        type="file"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="csv-file-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Upload />}
                          fullWidth
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            py: 1.5,
                          }}
                        >
                          {file ? file.name : 'Choose CSV File'}
                        </Button>
                      </label>
                      {fileError && (
                        <Alert 
                          severity="error" 
                          sx={{ 
                            mt: 2,
                            borderRadius: 2,
                          }}
                        >
                          {fileError}
                        </Alert>
                      )}
                    </Box>
                  </Grid>

                  {previewData.length > 0 && (
                    <Grid item xs={12}>
                      <Box sx={{ px: 3, pb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                          Preview ({previewData.length} items):
                        </Typography>
                        <TableContainer 
                          component={Paper} 
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            mb: 2,
                          }}
                        >
                          <Table>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                              </TableRow>
                            </TableHead>
                          <TableBody>
                            {previewData.slice(0, 10).map((row, index) => {
                              const amount = (row.qty * row.rate).toFixed(2);
                              const isValid = row.item_code && row.qty > 0 && row.rate >= 0;
                              return (
                                <TableRow key={index}>
                                  <TableCell>{row.item_code || <Chip label="Missing" color="error" size="small" />}</TableCell>
                                  <TableCell>{row.qty}</TableCell>
                                  <TableCell>KES {row.rate.toFixed(2)}</TableCell>
                                  <TableCell>KES {amount}</TableCell>
                                  <TableCell>{row.warehouse || watchedWarehouse || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {previewData.length > 10 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Showing first 10 items. Total: {previewData.length} items
                        </Typography>
                      )}
                        <Button
                          variant="contained"
                          onClick={handleUseCSVData}
                          sx={{ 
                            mt: 2,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 4,
                          }}
                        >
                          Use CSV Data
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </>
              )}

              {/* Totals */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Card 
                    elevation={0}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      border: `2px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Subtotal:
                          </Typography>
                          <Typography variant="h6" fontWeight="medium">
                            KES {totals.subtotal.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Tax:
                          </Typography>
                          <Typography variant="h6" fontWeight="medium">
                            KES {totals.taxAmount.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Grand Total:
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            KES {totals.grandTotal.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>

              {/* Payment Section */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    gutterBottom
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <AccountBalance color="primary" fontSize="small" />
                    Payment
                  </Typography>
                  <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <Controller
                      name="is_paid"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value} size="small" />}
                          label="Mark as Paid"
                        />
                      )}
                    />
                  </Grid>
                  {watchedIsPaid && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="paid_amount"
                          control={control}
                          rules={{
                            required: watchedIsPaid ? 'Paid amount is required' : false,
                            min: { value: 0.01, message: 'Amount must be greater than 0' },
                            max: { value: watchedGrandTotal, message: `Amount cannot exceed grand total (KES ${watchedGrandTotal.toFixed(2)})` },
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Paid Amount"
                              type="number"
                              fullWidth
                              size="small"
                              required
                              inputProps={{ step: '0.01', min: '0.01', max: watchedGrandTotal }}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              error={!!errors.paid_amount}
                              helperText={errors.paid_amount?.message || `Grand Total: KES ${watchedGrandTotal.toFixed(2)}`}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: 2,
                                },
                                '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="cash_bank_account"
                          control={control}
                          rules={{
                            required: watchedIsPaid ? 'Cash/Bank account is required' : false,
                          }}
                          render={({ field }) => {
                            const accountValue = cashBankAccounts.find(
                              (a) => a.name === field.value || a.account_name === field.value
                            ) || null;
                            return (
                              <Autocomplete
                                options={cashBankAccounts}
                                value={accountValue}
                                getOptionLabel={(option) => option?.account_name || option?.name || ''}
                                isOptionEqualToValue={(option, value) =>
                                  option?.name === value?.name || option?.account_name === value?.account_name
                                }
                                loading={isLoadingAccounts}
                                onChange={(e, value) => field.onChange(value?.name || '')}
                                onBlur={field.onBlur}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Cash/Bank Account"
                                    size="small"
                                    required={watchedIsPaid}
                                    error={!!errors.cash_bank_account}
                                    helperText={errors.cash_bank_account?.message}
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: (
                                        <>
                                          <InputAdornment position="start">
                                            <AccountBalance sx={{ fontSize: 16, color: 'text.disabled' }} />
                                          </InputAdornment>
                                          {params.InputProps.startAdornment}
                                        </>
                                      ),
                                    }}
                                    sx={{ 
                                      '& .MuiOutlinedInput-root': { 
                                        borderRadius: 2,
                                      },
                                      '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                                    }}
                                  />
                                )}
                              />
                            );
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="mode_of_payment"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Mode of Payment"
                              fullWidth
                              size="small"
                              placeholder="e.g., Cash, Bank Transfer, Cheque"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AccountBalance sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: 2,
                                },
                                '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                              }}
                            />
                          )}
                        />
                      </Grid>
                    </>
                  )}
                  </Grid>
                </Box>
              </Grid>

              {/* Options */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    gutterBottom
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Settings color="primary" fontSize="small" />
                    Options
                  </Typography>
                  <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="update_stock"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value} size="small" />}
                          label="Update Stock on Submission"
                        />
                      )}
                    />
                  </Grid>
                  {etimsStatus.has_etims && (
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="prevent_etims_submission"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} size="small" />}
                            label="Prevent eTIMS Submission"
                          />
                        )}
                      />
                    </Grid>
                  )}
                  </Grid>
                </Box>
              </Grid>

              {/* Form Actions */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 3,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.default,
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/purchases')}
                    disabled={isLoading}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      px: 3,
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={isLoading}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      px: 3,
                    }}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    disabled={isLoading}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      px: 4,
                      boxShadow: 2,
                    }}
                  >
                    {isLoading ? 'Saving...' : draftName ? 'Update Purchase' : 'Create Purchase'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {/* New Product Dialog */}
        <NewProductDialog
          open={newProductDialogOpen}
          onClose={() => {
            setNewProductDialogOpen(false);
            setNewProductItemIndex(null);
          }}
          onProductCreated={(product) => {
            // Refresh products list
            dispatch(getProducts({ company: userCompany, limit: 1000 })).then(() => {
              // Set the newly created product in the item code field
              if (newProductItemIndex !== null) {
                setValue(`items.${newProductItemIndex}.item_code`, product.item_code || product.name);
              }
            });
            setNewProductDialogOpen(false);
            setNewProductItemIndex(null);
          }}
          userCompany={userCompany}
        />
      </Box>
    </Container>
  );
};

// New Product Dialog Component
const NewProductDialog = ({ open, onClose, onProductCreated, userCompany }) => {
  const dispatch = useAppDispatch();
  const { isLoading: isCreatingProduct } = useAppSelector((state) => state.product);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      item_code: '',
      item_name: '',
      standard_rate: 0,
      stock_uom: 'Nos',
      is_purchase_item: true,
    },
  });

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const result = await dispatch(createProduct({
      ...data,
      company: userCompany,
      is_stock_item: true,
      is_sales_item: false,
    }));

    if (result.type === 'product/createProduct/fulfilled') {
      onProductCreated(result.payload);
      reset();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Product</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="item_code"
                control={control}
                rules={{ required: 'Item code is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Item Code"
                    fullWidth
                    required
                    error={!!errors.item_code}
                    helperText={errors.item_code?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="item_name"
                control={control}
                rules={{ required: 'Item name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Item Name"
                    fullWidth
                    required
                    error={!!errors.item_name}
                    helperText={errors.item_name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="standard_rate"
                control={control}
                rules={{ required: 'Standard rate is required', min: { value: 0, message: 'Must be >= 0' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Standard Rate"
                    type="number"
                    fullWidth
                    required
                    inputProps={{ step: '0.01', min: '0' }}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    error={!!errors.standard_rate}
                    helperText={errors.standard_rate?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="stock_uom"
                control={control}
                rules={{ required: 'Stock UOM is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Stock UOM"
                    fullWidth
                    required
                    placeholder="e.g., Nos, Kg, Ltr"
                    error={!!errors.stock_uom}
                    helperText={errors.stock_uom?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isCreatingProduct}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isCreatingProduct}>
            {isCreatingProduct ? <CircularProgress size={20} /> : 'Create Product'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewPurchase;
