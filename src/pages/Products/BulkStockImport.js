import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { ArrowBack, Upload, Download, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  bulkImportOpeningStock,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import { listWarehouses } from '../../store/warehouseSlice';

const BulkStockImport = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, bulkImportResults } = useAppSelector((state) => state.product);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fileError, setFileError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      warehouse: activeWarehouse?.name || activeWarehouse?.warehouse_name || '',
      posting_date: new Date().toISOString().split('T')[0],
    },
  });

  // Update form when active warehouse changes
  useEffect(() => {
    if (activeWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      setValue('warehouse', warehouseName);
    }
  }, [activeWarehouse, setValue]);

  // Fetch warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFileError('');
    setPreviewData([]);

    if (!selectedFile) {
      return;
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setFileError('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);

    // Read and preview CSV file
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter((line) => line.trim());
        const headers = lines[0].split(',').map((h) => h.trim());
        
        if (headers.length < 2 || !headers.includes('item_code') || !headers.includes('qty')) {
          setFileError('CSV must have "item_code" and "qty" columns');
          return;
        }

        const data = lines.slice(1, Math.min(6, lines.length)).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        setPreviewData(data);
      };
      reader.readAsText(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'item_code,qty\nITEM001,100\nITEM002,50';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opening_stock_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    if (!file) {
      dispatch(showNotification({
        message: 'Please select a file to upload',
        severity: 'error',
        title: 'File Required',
      }));
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim());
      
      const stockData = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return {
          item_code: row.item_code,
          qty: parseFloat(row.qty) || 0,
        };
      }).filter((row) => row.item_code && row.qty > 0);

      const importData = {
        company: userCompany,
        warehouse: data.warehouse,
        posting_date: data.posting_date,
        stock_data: stockData,
      };

      const result = await dispatch(bulkImportOpeningStock(importData));

      if (result.type === 'product/bulkImportOpeningStock/fulfilled') {
        setFile(null);
        setPreviewData([]);
      }
    };

    reader.readAsText(file);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/products')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Bulk Import Opening Stock
          </Typography>
        </Box>

        {/* Import Results */}
        {bulkImportResults && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Import completed! {bulkImportResults.success_count || 0} items imported successfully.
              {bulkImportResults.failed_count > 0 && ` ${bulkImportResults.failed_count} items failed.`}
            </Typography>
          </Alert>
        )}

        {/* Form */}
        <Paper elevation={2} sx={{ p: 4 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="warehouse"
                  control={control}
                  rules={{ required: 'Stock Location is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.warehouse}>
                      <InputLabel>Stock Location *</InputLabel>
                      <Select
                        {...field}
                        label="Stock Location *"
                        disabled={isLoadingWarehouses}
                      >
                        <MenuItem value="">Select Warehouse</MenuItem>
                        {warehouses.map((wh) => (
                          <MenuItem key={wh.name} value={wh.name}>
                            {wh.warehouse_name || wh.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.warehouse && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.warehouse.message}
                        </Typography>
                      )}
                    </FormControl>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Upload File</Typography>
                  <Button
                    startIcon={<Download />}
                    onClick={downloadTemplate}
                    variant="outlined"
                    size="small"
                  >
                    Download Template
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: fileError ? 'error.main' : 'primary.main',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: fileError ? 'error.light' : 'action.hover',
                  }}
                >
                  <input
                    accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<Upload />}
                      sx={{ mb: 2 }}
                    >
                      {file ? 'Change File' : 'Select CSV File'}
                    </Button>
                  </label>
                  {file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected: {file.name}
                    </Typography>
                  )}
                  {fileError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {fileError}
                    </Alert>
                  )}
                </Box>
              </Grid>

              {/* Preview */}
              {previewData.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Preview (First 5 rows)
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(previewData[0] || {}).map((key) => (
                            <TableCell key={key}>{key}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, idx) => (
                              <TableCell key={idx}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {/* Form Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/products')}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={20} /> : <Upload />}
                    disabled={isLoading || !file}
                  >
                    {isLoading ? 'Importing...' : 'Import Stock'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default BulkStockImport;
