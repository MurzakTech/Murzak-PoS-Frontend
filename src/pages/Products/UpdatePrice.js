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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Divider,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { ArrowBack, Save, Add, Delete, Upload, Download } from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  bulkUpdatePrices,
  getPriceLists,
  getProducts,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const UpdatePrice = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { priceLists, isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      price_list: '',
      prices: [{ item_code: '', price: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prices',
  });

  const selectedPriceList = watch('price_list');
  const [uploadMethod, setUploadMethod] = useState(0); // 0 = manual, 1 = CSV
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fileError, setFileError] = useState('');

  // Fetch price lists on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getPriceLists({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  const downloadTemplate = () => {
    const csvContent = `item_code,price
# Instructions:
# 1. Fill in the item_code column with the product item codes
# 2. Fill in the price column with the new prices (numbers only, no currency symbols)
# 3. Remove this instruction row and the example row before uploading
# 4. Save the file as CSV format
# Example:
PROD-001,100.00
PROD-002,150.50
PROD-003,200.00`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'price_update_template.csv');
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

    // Validate file type
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setFileError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    // Read and preview CSV file
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
      
      // Check for required columns
      const requiredColumns = ['item_code', 'price'];
      const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        setFileError(`Missing required columns: ${missingColumns.join(', ')}. Found: ${headers.join(', ')}`);
        setFile(null);
        return;
      }

      // Parse CSV data
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map((v) => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return {
          item_code: row.item_code || '',
          price: row.price || '',
          rowNumber: index + 2, // +2 because we start from line 2 (after header)
        };
      }).filter((row) => row.item_code || row.price); // Keep rows with at least one value

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

  const onSubmit = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    if (!data.price_list) {
      dispatch(showNotification({
        message: 'Please select a price list.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    let validPrices = [];

    if (uploadMethod === 1) {
      // CSV upload method
      if (!file) {
        dispatch(showNotification({
          message: 'Please upload a CSV file.',
          severity: 'error',
          title: 'File Required',
        }));
        return;
      }

      // Use preview data from CSV
      validPrices = previewData
        .filter((p) => p.item_code && p.price && parseFloat(p.price) > 0)
        .map((p) => ({
          item_code: p.item_code,
          price: parseFloat(p.price),
        }));
    } else {
      // Manual entry method
      validPrices = data.prices
        .filter((p) => p.item_code && p.price && parseFloat(p.price) > 0)
        .map((p) => ({
          item_code: p.item_code,
          price: parseFloat(p.price),
        }));
    }

    if (validPrices.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one valid price entry.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    const priceData = {
      company: userCompany,
      price_list: data.price_list,
      currency: 'KES',
      price_updates: validPrices,
    };

    const result = await dispatch(bulkUpdatePrices(priceData));

    if (result.type === 'product/bulkUpdatePrices/fulfilled') {
      dispatch(showNotification({
        message: `Successfully updated ${validPrices.length} product price(s)`,
        severity: 'success',
        title: 'Success',
      }));
      // Reset form
      if (uploadMethod === 0) {
        remove();
        append({ item_code: '', price: '' });
      } else {
        setFile(null);
        setPreviewData([]);
        setFileError('');
      }
    }
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
            Bulk Update Prices
          </Typography>
        </Box>

        {/* Form */}
        <Paper elevation={2} sx={{ p: 4 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Price List</InputLabel>
                  <Controller
                    name="price_list"
                    control={control}
                    rules={{ required: 'Price list is required' }}
                    render={({ field }) => (
                      <Select {...field} label="Price List" error={!!errors.price_list}>
                        {priceLists.map((pl) => (
                          <MenuItem key={pl.name} value={pl.name}>
                            {pl.price_list_name || pl.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Tabs value={uploadMethod} onChange={(e, newValue) => setUploadMethod(newValue)} sx={{ mb: 3 }}>
                  <Tab label="Manual Entry" />
                  <Tab label="CSV Upload" />
                </Tabs>
              </Grid>

              {uploadMethod === 0 ? (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Price Entries</Typography>
                      <Button
                        startIcon={<Add />}
                        onClick={() => append({ item_code: '', price: '' })}
                        variant="outlined"
                        size="small"
                      >
                        Add Row
                      </Button>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Item Code</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell align="right" width={100}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <Controller
                                  name={`prices.${index}.item_code`}
                                  control={control}
                                  rules={{ required: 'Item code is required' }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      fullWidth
                                      placeholder="Item Code"
                                      error={!!errors.prices?.[index]?.item_code}
                                      size="small"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Controller
                                  name={`prices.${index}.price`}
                                  control={control}
                                  rules={{
                                    required: 'Price is required',
                                    min: { value: 0, message: 'Price must be positive' },
                                  }}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      fullWidth
                                      type="number"
                                      placeholder="0.00"
                                      error={!!errors.prices?.[index]?.price}
                                      helperText={errors.prices?.[index]?.price?.message}
                                      size="small"
                                      inputProps={{ step: '0.01', min: '0' }}
                                    />
                                  )}
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
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">CSV Upload</Typography>
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
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Instructions:</strong>
                        <br />
                        1. Download the CSV template using the button above
                        <br />
                        2. Fill in the item_code and price columns
                        <br />
                        3. Remove instruction rows (starting with #) before uploading
                        <br />
                        4. Upload the filled CSV file below
                      </Typography>
                    </Alert>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
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
                        >
                          {file ? file.name : 'Choose CSV File'}
                        </Button>
                      </label>
                    </Box>
                    {fileError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {fileError}
                      </Alert>
                    )}
                  </Grid>

                  {previewData.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Preview ({previewData.length} rows):
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>Item Code</TableCell>
                              <TableCell>Price</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {previewData.slice(0, 10).map((row, index) => {
                              const isValid = row.item_code && row.price && parseFloat(row.price) > 0;
                              return (
                                <TableRow key={index}>
                                  <TableCell>{row.rowNumber}</TableCell>
                                  <TableCell>{row.item_code || <Chip label="Missing" color="error" size="small" />}</TableCell>
                                  <TableCell>
                                    {row.price ? (
                                      parseFloat(row.price) > 0 ? (
                                        `KES ${parseFloat(row.price).toFixed(2)}`
                                      ) : (
                                        <Chip label="Invalid" color="error" size="small" />
                                      )
                                    ) : (
                                      <Chip label="Missing" color="error" size="small" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isValid ? (
                                      <Chip label="Valid" color="success" size="small" />
                                    ) : (
                                      <Chip label="Invalid" color="error" size="small" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {previewData.length > 10 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Showing first 10 rows. Total: {previewData.length} rows
                        </Typography>
                      )}
                    </Grid>
                  )}
                </>
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
                    startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
                    disabled={isLoading || !selectedPriceList}
                  >
                    {isLoading ? 'Updating...' : 'Update Prices'}
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

export default UpdatePrice;
