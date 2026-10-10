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
  FormHelperText,
  CircularProgress,
  GridLegacy as Grid,
  Container,
  Divider,
  Alert,
  AlertTitle,
  Stack,
} from '@mui/material';
import { ArrowBack, Upload, Download } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bulkImportOpeningStock } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { problemRowsCsv, summarizeBulkCreate } from '../../utils/productImport';
import { checkStockSheet, STOCK_TEMPLATE_CSV, STOCK_WORDING, localDateString } from '../../utils/stockImport';
import { readProductFile } from '../../utils/readProductFile';
import { saveTextFile } from '../../utils/saveTextFile';
import ImportCheckPanel from '../../components/Products/ImportCheckPanel';

const BulkStockImport = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [warehouse, setWarehouse] = useState('');
  const [postingDate, setPostingDate] = useState(localDateString());
  const [file, setFile] = useState(null);
  const [check, setCheck] = useState(null); // result of checking the file, see checkStockSheet
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [report, setReport] = useState(null); // what the server said after an import

  // Start with the store chosen in the top bar, unless a different one has been picked here
  useEffect(() => {
    if (activeWarehouse) {
      setWarehouse((current) => current || activeWarehouse.name || activeWarehouse.warehouse_name || '');
    }
  }, [activeWarehouse]);

  // Fetch warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  const reset = () => {
    setFile(null);
    setCheck(null);
    setFileError('');
    setImportError('');
    setReport(null);
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again after it has been fixed
    if (!selected) return;

    reset();
    setReading(true);
    const { rows, error } = await readProductFile(selected);
    setReading(false);

    if (error) {
      setFileError(error);
      return;
    }
    setFile(selected);
    setCheck(checkStockSheet(rows));
  };

  const ready = check?.valid.length || 0;
  const zeroRows = check?.zeroRows.length || 0;
  const storeName = (warehouses.find((w) => w.name === warehouse) || {}).warehouse_name || warehouse;
  const inFuture = postingDate > localDateString();
  const canImport = ready > 0 && Boolean(warehouse) && Boolean(postingDate) && !importing && !reading;

  const handleImport = async () => {
    if (!canImport) return;

    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found. Please complete your profile setup.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    setImporting(true);
    setImportError('');
    const stock = check.valid.map((v) => v.stock);
    const result = await dispatch(bulkImportOpeningStock({
      company: userCompany,
      warehouse,
      posting_date: postingDate,
      stock_data: stock,
    }));
    setImporting(false);

    if (bulkImportOpeningStock.fulfilled.match(result)) {
      setReport({
        summary: summarizeBulkCreate(result.payload, stock.length, STOCK_WORDING),
        leftOut: check.invalid.length,
        zeroRows,
        storeName,
      });
      // The file is cleared so the same stock cannot be sent a second time by accident
      setFile(null);
      setCheck(null);
    } else {
      // The reason is already shown in a pop-up; keep the file so the person can try again
      setImportError(result.payload || 'The opening stock could not be recorded. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mr: 2 }}>
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Bulk Import Opening Stock
          </Typography>
        </Box>

        {/* Result of the last import */}
        {report && (
          <Alert severity={report.summary.problems ? 'warning' : 'success'} sx={{ mb: 3 }}>
            <AlertTitle>{report.summary.problems ? 'Some items need attention' : 'Opening stock recorded'}</AlertTitle>
            {report.summary.text}
            {report.summary.created !== null && report.summary.created > 0 && report.storeName ? ` Stock was recorded in ${report.storeName}.` : ''}
            {report.summary.reference ? ` Stock entry: ${report.summary.reference}.` : ''}
            {report.leftOut > 0 && ` ${report.leftOut} row${report.leftOut === 1 ? ' was' : 's were'} left out because of problems in your file.`}
            {report.zeroRows > 0 && ` ${report.zeroRows} row${report.zeroRows === 1 ? ' had' : 's had'} a quantity of 0 and ${report.zeroRows === 1 ? 'was' : 'were'} skipped.`}
            {report.summary.failures.length > 0 && (
              <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {report.summary.failures.slice(0, 10).map((f, i) => (
                  <Typography component="li" variant="body2" key={i}>{f}</Typography>
                ))}
                {report.summary.failures.length > 10 && (
                  <Typography component="li" variant="body2">and {report.summary.failures.length - 10} more</Typography>
                )}
              </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="contained" onClick={() => navigate('/inventory/stock-summary')}>View stock</Button>
              <Button size="small" variant="outlined" onClick={reset}>Import another file</Button>
            </Stack>
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!warehouse}>
                <InputLabel id="stock-location-label">Stock Location</InputLabel>
                <Select
                  labelId="stock-location-label"
                  label="Stock Location"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  disabled={isLoadingWarehouses || importing}
                >
                  {warehouses.map((wh) => (
                    <MenuItem key={wh.name} value={wh.name}>
                      {wh.warehouse_name || wh.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{warehouse ? 'The stock in your file is recorded here.' : 'Choose where this stock is kept.'}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Posting Date"
                type="date"
                fullWidth
                required
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                disabled={importing}
                InputLabelProps={{ shrink: true }}
                error={!postingDate}
                helperText={!postingDate ? 'Choose the date the stock counts from.' : inFuture ? 'This date is in the future.' : 'The date the stock counts from.'}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                <Box>
                  <Typography variant="h6">Upload File</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Excel (.xlsx) or CSV with two columns: item_code and qty. The item codes must already exist as products.
                  </Typography>
                </Box>
                <Button startIcon={<Download />} onClick={() => saveTextFile(STOCK_TEMPLATE_CSV, 'opening_stock_template.csv')} variant="outlined" size="small">
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
                  bgcolor: 'action.hover',
                }}
              >
                <input
                  accept=".csv,.tsv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={reading || importing}
                />
                <label htmlFor="file-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={reading ? <CircularProgress size={18} /> : <Upload />}
                    disabled={reading || importing}
                  >
                    {reading ? 'Reading file...' : file ? 'Choose a different file' : 'Select CSV or Excel file'}
                  </Button>
                </label>
                {file && <Typography variant="body2" sx={{ mt: 1.5 }}>Selected: {file.name}</Typography>}
                {fileError && <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>{fileError}</Alert>}
              </Box>
            </Grid>

            {importError && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setImportError('')}>
                  <AlertTitle>Nothing was recorded</AlertTitle>
                  {importError}
                </Alert>
              </Grid>
            )}

            {/* What we found in the file */}
            {check && (
              <Grid item xs={12}>
                <ImportCheckPanel
                  fileProblems={check.fileProblems}
                  ready={ready}
                  invalid={check.invalid}
                  notices={[
                    ...(check.unknownColumns.length > 0
                      ? [{ severity: 'info', text: `These columns are not used and will be ignored: ${check.unknownColumns.join(', ')}.` }]
                      : []),
                    ...(zeroRows > 0
                      ? [{ severity: 'info', text: `${zeroRows} row${zeroRows === 1 ? ' has' : 's have'} a quantity of 0 and will be skipped, because there is no stock to record.` }]
                      : []),
                  ]}
                  onDownloadProblems={() => saveTextFile('\uFEFF' + problemRowsCsv(check), 'stock_rows_to_fix.csv')}
                  preview={{
                    columns: [
                      { key: 'code', label: 'Item code' },
                      ...(check.valid.some((v) => v.itemName) ? [{ key: 'name', label: 'Item name' }] : []),
                      { key: 'qty', label: 'Quantity', align: 'right' },
                    ],
                    rows: check.valid.slice(0, 5).map(({ rowNumber, itemName, stock }) => ({
                      rowNumber,
                      values: { code: stock.item_code, name: itemName || '-', qty: stock.qty.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                    })),
                  }}
                />
              </Grid>
            )}

            {/* Say exactly what pressing the button will do */}
            {ready > 0 && (
              <Grid item xs={12}>
                <Alert severity={warehouse && postingDate ? 'info' : 'warning'}>
                  {warehouse && postingDate
                    ? `${ready} item${ready === 1 ? '' : 's'} will be recorded in ${storeName}, dated ${postingDate}. Do not import the same file twice: the stock may be recorded twice.`
                    : 'Choose a stock location and a posting date to continue.'}
                </Alert>
              </Grid>
            )}

            {/* Form Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/products')} disabled={importing}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <Upload />}
                  onClick={handleImport}
                  disabled={!canImport}
                >
                  {importing ? 'Recording...' : ready > 0 ? `Record stock for ${ready} item${ready === 1 ? '' : 's'}` : 'Import Stock'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default BulkStockImport;
