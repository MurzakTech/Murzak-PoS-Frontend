import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Container,
  Alert,
  AlertTitle,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ArrowBack, Upload, Download } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bulkCreateProducts } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import { checkProductSheet, problemRowsCsv, summarizeBulkCreate } from '../../utils/productImport';
import { readProductFile } from '../../utils/readProductFile';
import { saveTextFile } from '../../utils/saveTextFile';

const PROBLEMS_SHOWN = 50;
const PREVIEW_ROWS = 5;

// The BOM at the start makes Excel open the file as UTF-8, so names with accents stay readable
const TEMPLATE_CSV =
  '\uFEFFitem_code,item_name,item_group,stock_uom,standard_rate,description,is_stock_item,is_sales_item,brand,barcode\r\n' +
  'ITEM001,Tusker Lager 500ml,Beer,Nos,250,Bottled lager,1,1,Tusker,\r\n' +
  'ITEM002,"Burger, Cheese",Food,Nos,650,Put names that contain a comma in quotation marks,1,1,,\r\n';

const BulkImport = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Get company from user profile
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [file, setFile] = useState(null);
  const [check, setCheck] = useState(null); // result of checking the file, see checkProductSheet
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [report, setReport] = useState(null); // what the server said after an import

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
    setCheck(checkProductSheet(rows));
  };

  const handleImport = async () => {
    if (importing || !check || check.valid.length === 0) return;

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
    const products = check.valid.map((v) => v.product);
    const result = await dispatch(bulkCreateProducts({ company: userCompany, products }));
    setImporting(false);

    if (bulkCreateProducts.fulfilled.match(result)) {
      setReport({ summary: summarizeBulkCreate(result.payload, products.length), sent: products.length, leftOut: check.invalid.length });
      setFile(null);
      setCheck(null);
    } else {
      // The reason is already shown in a pop-up; keep the file so the person can try again
      setImportError(result.payload || 'The products could not be imported. Please try again.');
    }
  };

  const ready = check?.valid.length || 0;
  const problems = check?.invalid.length || 0;
  const noPrice = check?.warnings.length || 0;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mr: 2 }}>
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Bulk Products Import
          </Typography>
        </Box>

        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
          {/* Result of the last import */}
          {report && (
            <Alert severity={report.summary.problems ? 'warning' : 'success'} sx={{ mb: 3 }}>
              <AlertTitle>{report.summary.problems ? 'Some products need attention' : 'Import finished'}</AlertTitle>
              {report.summary.text}
              {report.leftOut > 0 && ` ${report.leftOut} row${report.leftOut === 1 ? ' was' : 's were'} left out because of problems in your file.`}
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
                <Button size="small" variant="contained" onClick={() => navigate('/products')}>View products</Button>
                <Button size="small" variant="outlined" onClick={reset}>Import another file</Button>
              </Stack>
            </Alert>
          )}

          {/* Choose a file */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Box>
              <Typography variant="h6">Upload File</Typography>
              <Typography variant="body2" color="text.secondary">
                Excel (.xlsx) or CSV. The first row must hold the column headings. Only item_code and item_name are required.
              </Typography>
            </Box>
            <Button startIcon={<Download />} onClick={() => saveTextFile(TEMPLATE_CSV, 'products_import_template.csv')} variant="outlined" size="small">
              Download Template
            </Button>
          </Box>

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

          {importError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setImportError('')}>
              <AlertTitle>Nothing was imported</AlertTitle>
              {importError}
            </Alert>
          )}

          {/* What we found in the file */}
          {check && (
            <Box sx={{ mt: 3 }}>
              {check.fileProblems.map((p, i) => (
                <Alert severity="error" key={i} sx={{ mb: 2 }}>{p}</Alert>
              ))}

              {check.fileProblems.length === 0 && (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Chip color="success" label={`${ready} ready to import`} />
                    {problems > 0 && <Chip color="error" label={`${problems} with problems`} />}
                    {noPrice > 0 && <Chip color="warning" variant="outlined" label={`${noPrice} without a price`} />}
                  </Stack>

                  {check.unknownColumns.length > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      These columns are not used and will be ignored: {check.unknownColumns.join(', ')}.
                    </Alert>
                  )}

                  {noPrice > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {noPrice} product{noPrice === 1 ? ' has' : 's have'} no price and will be saved with a price of 0. Set the price before selling{noPrice === 1 ? ' it' : ' them'}.
                    </Alert>
                  )}

                  {problems > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Alert
                        severity="error"
                        action={
                          <Button color="inherit" size="small" startIcon={<Download />} onClick={() => saveTextFile('\uFEFF' + problemRowsCsv(check), 'rows_to_fix.csv')}>
                            Download rows to fix
                          </Button>
                        }
                        sx={{ mb: 1 }}
                      >
                        <AlertTitle>{problems} row{problems === 1 ? '' : 's'} will be left out</AlertTitle>
                        {ready > 0
                          ? 'The other rows can still be imported now. Download the rows to fix, correct them, and import that file afterwards.'
                          : 'Fix these in your file and upload it again.'}
                      </Alert>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>Item code</TableCell>
                              <TableCell>Item name</TableCell>
                              <TableCell>Problem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {check.invalid.slice(0, PROBLEMS_SHOWN).map((r) => (
                              <TableRow key={r.rowNumber}>
                                <TableCell>{r.rowNumber}</TableCell>
                                <TableCell>{r.itemCode || '(empty)'}</TableCell>
                                <TableCell>{r.itemName || '(empty)'}</TableCell>
                                <TableCell>{r.problems.join(' ')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {problems > PROBLEMS_SHOWN && (
                        <Typography variant="caption" color="text.secondary">
                          Showing the first {PROBLEMS_SHOWN} of {problems}. Download the rows to fix to see them all.
                        </Typography>
                      )}
                    </Box>
                  )}

                  {ready > 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Preview{ready > PREVIEW_ROWS ? ` (first ${PREVIEW_ROWS} of ${ready})` : ''}
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>Item code</TableCell>
                              <TableCell>Item name</TableCell>
                              <TableCell>Category</TableCell>
                              <TableCell>Unit</TableCell>
                              <TableCell align="right">Price</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {check.valid.slice(0, PREVIEW_ROWS).map(({ rowNumber, product }) => (
                              <TableRow key={rowNumber}>
                                <TableCell>{rowNumber}</TableCell>
                                <TableCell>{product.item_code}</TableCell>
                                <TableCell>{product.item_name}</TableCell>
                                <TableCell>{product.item_group || '-'}</TableCell>
                                <TableCell>{product.stock_uom}</TableCell>
                                <TableCell align="right">{product.standard_rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={() => navigate('/products')} disabled={importing}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <Upload />}
              onClick={handleImport}
              disabled={importing || reading || ready === 0}
            >
              {importing ? 'Importing...' : ready > 0 ? `Import ${ready} product${ready === 1 ? '' : 's'}` : 'Import Products'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default BulkImport;
