import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Pagination,
  IconButton,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  Stack,
  useTheme,
  alpha,
  Checkbox,
} from '@mui/material';
import {
  Download,
  Upload,
  ArrowBack,
  Save,
  Delete,
  Search,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { getSeedProducts, createSeedItems, clearCreateResult } from '../../store/productSeedingSlice';
import { getItemGroups } from '../../store/productSlice';
import { summarizeSeedResult } from '../../utils/seedResult';
import { readProductFile } from '../../utils/readProductFile';
import { saveTextFile } from '../../utils/saveTextFile';
import {
  buildStarterItems,
  checkStarterSelection,
  buildSeedPayload,
  starterTemplateCsv,
  applySheetToItems,
  jsonToSheet,
} from '../../utils/starterProducts';

const ROWS_PER_PAGE = 25;
const NOTICE_ROWS = 8;

const readJsonSheet = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sheet = jsonToSheet(JSON.parse(reader.result));
        resolve(sheet ? { rows: sheet } : { error: 'That JSON file does not contain an "items" list.' });
      } catch (e) {
        resolve({ error: 'That file is not valid JSON.' });
      }
    };
    reader.onerror = () => resolve({ error: 'We could not read that file.' });
    reader.readAsText(file);
  });

const IndustryProductSetup = ({ industryCode: propIndustryCode = null }) => {
  const { industryCode: paramIndustryCode } = useParams();
  // Use prop if provided (for LoadProducts), otherwise use route param
  const industryCode = propIndustryCode || paramIndustryCode;
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { industries, user } = useAppSelector((state) => state.auth);
  const { itemGroups } = useAppSelector((state) => state.product);
  const {
    seedProducts,
    isLoadingSeedProducts,
    seedProductsError,
    isUploading,
    isCreating,
    createResult,
    createError,
  } = useAppSelector((state) => state.productSeeding);
  const { activeWarehouse } = useAppSelector((state) => state.warehouse);

  // Find the industry. The full list is only loaded on the sign-up page, so fall back to the
  // industry on the signed-in user's profile, which carries the readable name.
  const ownIndustry = user?.pos_industry && typeof user.pos_industry === 'object' ? user.pos_industry : null;
  const matches = (ind) => ind && (ind.industry_code === industryCode || ind.name === industryCode);
  const industry = industries.find(matches) || (matches(ownIndustry) ? ownIndustry : null) || { industry_code: industryCode, industry_name: industryCode };
  const industryIdentifier = industry.industry_code || industry.name || industryCode;

  // Get company from user profile
  const userCompany = user?.company ||
                      user?.custom_company ||
                      user?.company_name ||
                      user?.company_data?.name ||
                      user?.company_data?.company_name;

  const activeWarehouseName = activeWarehouse ? (activeWarehouse.name || activeWarehouse.warehouse_name || null) : null;

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set()); // item codes ticked for saving
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileNotice, setFileNotice] = useState(null); // what the last uploaded file changed
  const [readingFile, setReadingFile] = useState(false);
  const [showChecks, setShowChecks] = useState(false); // after the first press of Create, show what is missing
  const [bulkPrice, setBulkPrice] = useState('');

  // Fetch the starter products and the business's own categories
  useEffect(() => {
    if (industryIdentifier) {
      // A failure is shown from the store (seedProductsError), so it is not repeated here
      dispatch(getSeedProducts(industryIdentifier)).unwrap().catch(() => {});
    }
    dispatch(getItemGroups());
  }, [dispatch, industryIdentifier]);

  // Turn the starter products into editable rows when they arrive
  useEffect(() => {
    setItems(buildStarterItems(seedProducts));
    setSelected(new Set());
  }, [seedProducts]);

  const categoryNames = useMemo(() => (itemGroups || []).map((g) => g.item_group_name || g.name).filter(Boolean), [itemGroups]);

  // Search and sort across the whole list; the table shows it one page at a time
  const filteredItems = useMemo(() => {
    let list = items;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      list = list.filter((i) =>
        i.item_name.toLowerCase().includes(query) ||
        i.item_code.toLowerCase().includes(query) ||
        (i.item_group || '').toLowerCase().includes(query)
      );
    }
    if (sortOrder) {
      list = [...list].sort((a, b) => {
        const cmp = a.item_name.toLowerCase().localeCompare(b.item_name.toLowerCase());
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [items, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredItems.length / ROWS_PER_PAGE);
  const pageItems = useMemo(() => filteredItems.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE), [filteredItems, page]);

  useEffect(() => { setPage(1); }, [searchQuery, sortOrder]);
  useEffect(() => { if (page > 1 && page > totalPages) setPage(Math.max(1, totalPages)); }, [page, totalPages]);

  // What still needs fixing among the ticked products (shown once Create has been pressed)
  const checks = useMemo(() => checkStarterSelection(items, selected, activeWarehouseName), [items, selected, activeWarehouseName]);
  const problemByCode = useMemo(() => new Map(checks.problems.map((p) => [p.item_code, p.message])), [checks]);
  const fieldHasProblem = (code, word) => showChecks && (problemByCode.get(code) || '').toLowerCase().includes(word);

  // ---------------------------------------------------------------- editing

  const updateItem = (code, field, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.item_code !== code) return item;
      let v = value;
      if (field === 'qty') {
        v = value === '' ? null : parseInt(value, 10);
        if (Number.isNaN(v)) v = null;
      } else if (field === 'item_price' || field === 'buying_price') {
        v = value === '' ? null : parseFloat(value);
        if (Number.isNaN(v)) v = null;
      }
      return { ...item, [field]: v };
    }));
  };

  const applyToSelected = (field, value) => {
    setItems((prev) => prev.map((item) => (selected.has(item.item_code) ? { ...item, [field]: value } : item)));
  };

  const toggleItem = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // The tick box in the header covers every product that matches the search, not only this page
  const allTicked = filteredItems.length > 0 && filteredItems.every((i) => selected.has(i.item_code));
  const someTicked = filteredItems.some((i) => selected.has(i.item_code)) && !allTicked;
  const toggleAll = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((i) => (checked ? next.add(i.item_code) : next.delete(i.item_code)));
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    if (window.confirm(`Remove ${selected.size} selected product(s) from this list? They will not be saved to your business.`)) {
      setItems((prev) => prev.filter((i) => !selected.has(i.item_code)));
      setSelected(new Set());
    }
  };

  // ---------------------------------------------------------------- spreadsheet

  const handleDownloadList = () => saveTextFile(starterTemplateCsv(items), 'starter_products.csv');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again after it has been fixed
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);
    setFileNotice(null);
    setReadingFile(true);
    const { rows, error } = /\.json$/i.test(file.name) ? await readJsonSheet(file) : await readProductFile(file);
    setReadingFile(false);
    if (error) {
      setUploadError(error);
      return;
    }

    const result = applySheetToItems(items, rows);
    if (result.fileProblems.length) {
      setUploadError(result.fileProblems.join(' '));
      return;
    }
    setItems(result.items);
    setSelected((prev) => new Set([...prev, ...result.touched])); // products the file filled in are ticked for you
    setFileNotice({ updated: result.updated, added: result.added, problems: result.problems });
  };

  // ---------------------------------------------------------------- saving

  const handleSave = async () => {
    if (!user) {
      setUploadError('Please log in to create items');
      return;
    }
    setUploadError(null);
    setShowChecks(true);
    if (checks.problems.length > 0) return;

    const payload = buildSeedPayload({
      items: checks.valid,
      priceList: 'Standard Selling',
      buyingPriceList: 'Standard Buying',
      warehouse: activeWarehouseName,
      company: userCompany,
      industry: industryIdentifier,
    });

    try {
      const result = await dispatch(createSeedItems(payload)).unwrap();
      // The slice only lets through runs where something was saved; the details
      // (including any products that could not be saved, and why) show below
      if (!summarizeSeedResult(result).problems) {
        setUploadSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      // The reason is already shown from the store (createError) and in a pop-up
      setUploadSuccess(false);
    }
  };

  const busy = isCreating || isUploading || readingFile;
  const showTable = !isLoadingSeedProducts && !isUploading;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: theme.palette.text.primary }} aria-label="Back to dashboard">
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {industry.industry_name || industry.name || 'Industry'} Product Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tick the products you sell, enter your selling price for each, then press Create Items.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadList} disabled={items.length === 0}>
              Download list
            </Button>
            <Button variant="outlined" component="label" startIcon={readingFile ? <CircularProgress size={18} /> : <Upload />} disabled={busy || items.length === 0}>
              {readingFile ? 'Reading file...' : 'Upload prices'}
              <input type="file" hidden accept=".csv,.tsv,.txt,.xlsx,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileUpload} />
            </Button>
            <Button
              variant="contained"
              startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={busy || selected.size === 0}
            >
              {isCreating ? 'Creating...' : `Create Items (${selected.size})`}
            </Button>
          </Box>
        </Box>

        {/* Alerts */}
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}
        {seedProductsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {seedProductsError}
          </Alert>
        )}
        {fileNotice && (
          <Alert severity={fileNotice.problems.length ? 'warning' : 'success'} sx={{ mb: 2 }} onClose={() => setFileNotice(null)}>
            <AlertTitle>File applied</AlertTitle>
            {fileNotice.updated + fileNotice.added === 0
              ? 'Nothing in the file changed the list.'
              : `${fileNotice.updated} product${fileNotice.updated === 1 ? '' : 's'} updated${fileNotice.added ? `, ${fileNotice.added} added` : ''}. They are ticked for you.`}
            {fileNotice.problems.length > 0 && (
              <>
                {` ${fileNotice.problems.length} row${fileNotice.problems.length === 1 ? ' was' : 's were'} skipped:`}
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {fileNotice.problems.slice(0, NOTICE_ROWS).map((p, i) => (
                    <Typography component="li" variant="body2" key={i}>
                      Row {p.rowNumber}{p.itemCode ? ` (${p.itemCode})` : ''}: {p.message}
                    </Typography>
                  ))}
                  {fileNotice.problems.length > NOTICE_ROWS && (
                    <Typography component="li" variant="body2">and {fileNotice.problems.length - NOTICE_ROWS} more</Typography>
                  )}
                </Box>
              </>
            )}
          </Alert>
        )}
        {showChecks && checks.problems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>{checks.problems.length} ticked product{checks.problems.length === 1 ? ' needs' : 's need'} attention before saving</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {checks.problems.slice(0, NOTICE_ROWS).map((p) => (
                <Typography component="li" variant="body2" key={p.item_code}>{p.item_name}: {p.message}</Typography>
              ))}
              {checks.problems.length > NOTICE_ROWS && (
                <Typography component="li" variant="body2">and {checks.problems.length - NOTICE_ROWS} more</Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Fix them in the table, or untick the products you do not want to save yet.
            </Typography>
          </Alert>
        )}
        {createError && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => dispatch(clearCreateResult())}>
            <AlertTitle>Products not saved</AlertTitle>
            {createError}
          </Alert>
        )}
        {uploadSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadSuccess(false)}>
            Products saved. Taking you to the dashboard...
          </Alert>
        )}
        {createResult && (createResult.status === 'success' || createResult.status === 'partial_success') && (
          <Alert severity={summarizeSeedResult(createResult).problems ? 'warning' : 'success'} sx={{ mb: 2 }} onClose={() => dispatch(clearCreateResult())}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              {summarizeSeedResult(createResult).problems ? 'Some products need attention' : 'Products saved'}
            </Typography>
            <Box component="div" sx={{ mt: 1 }}>
              <Typography variant="body2" component="div">
                <strong>Total received:</strong> {createResult.total_received || 0}
              </Typography>
              {createResult.items_created?.length > 0 && (
                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                  <strong>Created ({createResult.items_created.length}):</strong> {createResult.items_created.join(', ')}
                </Typography>
              )}
              {createResult.items_skipped?.length > 0 && (
                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                  <strong>Already existed ({createResult.items_skipped.length}):</strong>{' '}
                  {createResult.items_skipped.map((s) => (typeof s === 'string' ? s : s.prefixed_item_code || s.item_code)).join(', ')}
                </Typography>
              )}
              {createResult.items_failed?.length > 0 && (
                <Box component="div" sx={{ mt: 0.5 }}>
                  <Typography variant="body2" component="div">
                    <strong>Could not be saved ({createResult.items_failed.length}):</strong>
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {createResult.items_failed.map((f, i) => (
                      <Typography component="li" variant="body2" key={i}>
                        {typeof f === 'string' ? f : `${f.item_name || f.item_code || f.prefixed_item_code}: ${f.error_message || 'no reason given'}`}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
            {createResult.stock_entry && (
              <Box sx={{ mt: 1 }}>
                {createResult.stock_entry.created && createResult.stock_entry.name ? (
                  <Typography variant="body2">
                    <strong>Stock Entry:</strong> {createResult.stock_entry.name}
                  </Typography>
                ) : createResult.stock_entry.error ? (
                  <Typography variant="body2">
                    <strong>Opening stock not recorded:</strong> {createResult.stock_entry.error}
                  </Typography>
                ) : null}
              </Box>
            )}
            {createResult.note && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {createResult.note}
              </Typography>
            )}
          </Alert>
        )}

        {/* Summary */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Store for opening stock:</Typography>
              {activeWarehouse ? (
                <Chip label={activeWarehouse.warehouse_name || activeWarehouse.name || 'Unknown'} size="small" color="success" />
              ) : (
                <Chip label="No store selected" size="small" color="warning" />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {activeWarehouse ? 'Products with a quantity are added to this store' : 'Choose a store in the top bar to record opening stock'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>Price lists:</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label="Standard Selling" size="small" color="primary" />
                <Chip label="Standard Buying" size="small" color="secondary" />
              </Stack>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery
                ? `Showing ${filteredItems.length} of ${items.length} products`
                : `Total products: ${items.length}`}
              {isLoadingSeedProducts && ' (Loading...)'}
            </Typography>
            <Chip label={`${selected.size} ticked`} size="small" color="primary" variant={selected.size ? 'filled' : 'outlined'} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Many products? Press Download list, type your prices in Excel, then Upload prices. Products the file fills in are ticked for you.
          </Typography>
        </Box>

        {/* Loading State */}
        {(isLoadingSeedProducts || isUploading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              {isUploading ? 'Uploading products...' : 'Loading products...'}
            </Typography>
          </Box>
        )}

        {/* Search */}
        {showTable && items.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search products by name, code, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
              sx={{ maxWidth: 400 }}
            />
          </Box>
        )}

        {/* Actions for the ticked products */}
        {selected.size > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600}>{selected.size} ticked:</Typography>
            <Select
              size="small"
              displayEmpty
              value=""
              onChange={(e) => applyToSelected('item_group', e.target.value)}
              sx={{ minWidth: 200 }}
              SelectDisplayProps={{ 'aria-label': 'Set category for ticked products' }}
              renderValue={() => 'Set category...'}
            >
              {categoryNames.map((name) => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
              {categoryNames.length === 0 && <MenuItem disabled value="">No categories yet</MenuItem>}
            </Select>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type="number"
                placeholder="Selling price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                inputProps={{ min: 0, step: 0.01, 'aria-label': 'Selling price for ticked products' }}
                sx={{ width: 150 }}
              />
              <Button
                variant="outlined"
                disabled={!(parseFloat(bulkPrice) > 0)}
                onClick={() => { applyToSelected('item_price', parseFloat(bulkPrice)); setBulkPrice(''); }}
              >
                Set price
              </Button>
            </Box>
            <Button color="error" startIcon={<Delete />} onClick={handleDeleteSelected} sx={{ ml: 'auto' }}>
              Remove from list
            </Button>
          </Paper>
        )}

        {/* Table */}
        {showTable && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someTicked}
                      checked={allTicked}
                      onChange={(e) => toggleAll(e.target.checked)}
                      color="primary"
                      inputProps={{ 'aria-label': `Tick all ${filteredItems.length} products` }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))}>
                      Item Name
                      {sortOrder === 'asc' && <ArrowUpward sx={{ fontSize: 16 }} />}
                      {sortOrder === 'desc' && <ArrowDownward sx={{ fontSize: 16 }} />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Selling Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Buying Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.length > 0 ? (
                  pageItems.map((item) => {
                    const isSelected = selected.has(item.item_code);
                    const options = item.item_group && !categoryNames.includes(item.item_group) ? [item.item_group, ...categoryNames] : categoryNames;
                    return (
                      <TableRow key={item.item_code} hover selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleItem(item.item_code)}
                            color="primary"
                            inputProps={{ 'aria-label': `Tick ${item.item_name}` }}
                          />
                        </TableCell>
                        <TableCell>{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            displayEmpty
                            value={item.item_group || ''}
                            onChange={(e) => updateItem(item.item_code, 'item_group', e.target.value)}
                            sx={{ minWidth: 150 }}
                            SelectDisplayProps={{ 'aria-label': `Category for ${item.item_name}` }}
                            renderValue={(v) => v || <Typography component="span" variant="body2" color="text.secondary">Uncategorised</Typography>}
                          >
                            <MenuItem value="">Uncategorised</MenuItem>
                            {options.map((name) => (
                              <MenuItem key={name} value={name}>{name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.item_price ?? ''}
                            onChange={(e) => updateItem(item.item_code, 'item_price', e.target.value)}
                            size="small"
                            sx={{ width: 160 }}
                            inputProps={{ min: 0, step: 0.01, 'aria-label': `Selling price for ${item.item_name}` }}
                            error={isSelected && fieldHasProblem(item.item_code, 'selling price')}
                            placeholder="Required"
                            InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>KES</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.buying_price ?? ''}
                            onChange={(e) => updateItem(item.item_code, 'buying_price', e.target.value)}
                            size="small"
                            sx={{ width: 160 }}
                            inputProps={{ min: 0, step: 0.01, 'aria-label': `Buying price for ${item.item_name}` }}
                            error={isSelected && fieldHasProblem(item.item_code, 'buying price')}
                            placeholder="Optional"
                            InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>KES</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.qty ?? ''}
                            onChange={(e) => updateItem(item.item_code, 'qty', e.target.value)}
                            size="small"
                            sx={{ width: 100 }}
                            inputProps={{ min: 0, step: 1, 'aria-label': `Quantity for ${item.item_name}` }}
                            error={isSelected && (fieldHasProblem(item.item_code, 'quantity') || fieldHasProblem(item.item_code, 'store'))}
                            placeholder="Optional"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery
                          ? `No products found matching "${searchQuery}". Try a different search term.`
                          : 'No products found for this industry. Please check back later or contact support.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {showTable && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* Empty State */}
        {showTable && items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {seedProductsError
                ? 'Failed to load products. Please try refreshing the page.'
                : 'No products are available for this industry yet. Please check back later or contact support.'}
            </Typography>
            {seedProductsError && (
              <Button variant="outlined" onClick={() => industryIdentifier && dispatch(getSeedProducts(industryIdentifier))}>
                Retry
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default IndustryProductSetup;
