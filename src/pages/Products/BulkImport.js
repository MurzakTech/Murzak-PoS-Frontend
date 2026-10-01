import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Grid,
  Container,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowBack, Upload, Download } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  bulkCreateProducts,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const BulkImport = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [fileError, setFileError] = useState('');

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
        if (lines.length === 0) {
          setFileError('File is empty');
          return;
        }
        
        const headers = lines[0].split(',').map((h) => h.trim());
        
        // Check for required columns
        const requiredColumns = ['item_code', 'item_name'];
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          setFileError(`Missing required columns: ${missingColumns.join(', ')}`);
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
    const csvContent = 'item_code,item_name,item_group,stock_uom,standard_rate,description,is_stock_item,is_sales_item\nITEM001,Product 1,Products,Nos,100.00,Description 1,1,1\nITEM002,Product 2,Products,Nos,200.00,Description 2,1,1';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      
      const productsData = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return {
          item_code: row.item_code,
          item_name: row.item_name,
          item_group: row.item_group || '',
          stock_uom: row.stock_uom || 'Nos',
          standard_rate: parseFloat(row.standard_rate) || 0,
          description: row.description || '',
          is_stock_item: row.is_stock_item === '1' || row.is_stock_item === 'true' || row.is_stock_item === '',
          is_sales_item: row.is_sales_item === '1' || row.is_sales_item === 'true' || row.is_sales_item === '',
          is_purchase_item: row.is_purchase_item === '1' || row.is_purchase_item === 'true' || false,
          brand: row.brand || '',
          barcode: row.barcode || '',
        };
      }).filter((row) => row.item_code && row.item_name);

      const importData = {
        company: userCompany,
        products: productsData,
      };

      const result = await dispatch(bulkCreateProducts(importData));

      if (result.type === 'product/bulkCreateProducts/fulfilled') {
        setFile(null);
        setPreviewData([]);
        dispatch(showNotification({
          message: `Successfully imported ${productsData.length} product(s)`,
          severity: 'success',
          title: 'Import Successful',
        }));
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
            Bulk Products Import
          </Typography>
        </Box>

        {/* Form */}
        <Paper elevation={2} sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
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
                    {isLoading ? 'Importing...' : 'Import Products'}
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

export default BulkImport;
