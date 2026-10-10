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
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  Checkbox,
  GridLegacy as Grid,
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
import { bulkUploadProducts, getSeedProducts, createSeedItems, clearCreateResult } from '../../store/productSeedingSlice';
import { summarizeSeedResult } from '../../utils/seedResult';


const IndustryProductSetup = ({ industryCode: propIndustryCode = null }) => {
  const { industryCode: paramIndustryCode } = useParams();
  // Use prop if provided (for LoadProducts), otherwise use route param
  const industryCode = propIndustryCode || paramIndustryCode;
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { industries } = useAppSelector((state) => state.auth);
  const { user } = useAppSelector((state) => state.auth);
  const { 
    seedProducts, 
    totalProducts, 
    isLoadingSeedProducts, 
    seedProductsError,
    isUploading,
    isCreating,
    createResult,
    createError
  } = useAppSelector((state) => state.productSeeding);
  const { activeWarehouse } = useAppSelector((state) => state.warehouse);
  
  // Find the industry
  const industry = industries.find(
    (ind) => ind.industry_code === industryCode || ind.name === industryCode
  ) || { industry_code: industryCode, industry_name: industryCode };
  
  // Get company from user profile
  const userCompany = user?.company || 
                      user?.custom_company || 
                      user?.company_name || 
                      user?.company_data?.name || 
                      user?.company_data?.company_name;
  
  // Initialize data state
  // Price lists are always set to defaults and not shown in UI
  const [data, setData] = useState({
    price_list: 'Standard Selling',
    buying_price_list: 'Standard Buying',
    warehouse: '',
    items: []
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set()); // Track selected item codes
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [sortOrder, setSortOrder] = useState('asc'); // Sort order: 'asc', 'desc', or null

  // Fetch products on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products for this industry
        const industryIdentifier = industry.industry_code || industry.name || industryCode;
        if (industryIdentifier) {
          await dispatch(getSeedProducts(industryIdentifier)).unwrap();
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setUploadError(error || 'Failed to fetch data');
      }
    };

    fetchData();
  }, [dispatch, industryCode]);

  // Update data when seedProducts are loaded
  useEffect(() => {
    if (seedProducts && seedProducts.length > 0) {
      // Transform seed products to match the expected format
      const transformedItems = seedProducts.map((product) => ({
        item_code: product.sku,
        item_name: product.name,
        item_price: 0, // Price will be set by user
        buying_price: null, // Buying price will be set by user
        item_group: 'All Item Groups',
        uom: 'Nos',
        qty: null, // Quantity will be set by user
      }));
      
      setData((prev) => ({
        price_list: 'Standard Selling',
        buying_price_list: 'Standard Buying',
        items: transformedItems
      }));
    }
  }, [seedProducts]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = data.items;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.item_name?.toLowerCase().includes(query) ||
        item.item_code?.toLowerCase().includes(query) ||
        item.item_group?.toLowerCase().includes(query)
      );
    }

    // Apply sort by name
    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const nameA = (a.item_name || '').toLowerCase();
        const nameB = (b.item_name || '').toLowerCase();
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    }

    return filtered;
  }, [data.items, searchQuery, sortOrder]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedItems, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / rowsPerPage);

  // Reset page when search or sort changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortOrder]);

  // Handle field changes for items
  const handleFieldChange = (itemCode, field, value) => {
    setData((prev) => {
      const newItems = prev.items.map(item => {
        if (item.item_code === itemCode) {
          let processedValue = value;
          
          // Handle different field types
          if (field === 'qty') {
            processedValue = value === '' || value === null ? null : parseInt(value) || 0;
          } else if (field === 'item_price' || field === 'buying_price') {
            processedValue = value === '' || value === null ? null : parseFloat(value) || 0;
          }
          
          return {
            ...item,
            [field]: processedValue,
          };
        }
        return item;
      });
      
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  // Get active warehouse name for use in payload
  const getActiveWarehouseName = () => {
    if (!activeWarehouse) return null;
    return activeWarehouse.name || activeWarehouse.warehouse_name || null;
  };

  // Handle checkbox selection
  const handleSelectItem = (itemCode) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemCode)) {
        newSet.delete(itemCode);
      } else {
        newSet.add(itemCode);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      const allItemCodes = new Set(paginatedItems.map(item => item.item_code));
      setSelectedItems(allItemCodes);
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle sort toggle
  const handleSortToggle = () => {
    setSortOrder(prev => {
      if (prev === 'asc') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'asc';
    });
  };

  // Check if all items on current page are selected
  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(item.item_code));
  const isIndeterminate = paginatedItems.some(item => selectedItems.has(item.item_code)) && !isAllSelected;

  // Handle delete selected items
  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) {
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} selected item(s)? This will remove them from the view and they will not be sent to the API.`)) {
      setData((prev) => {
        const newItems = prev.items.filter(item => !selectedItems.has(item.item_code));
        // Adjust page if current page becomes empty
        const newTotalPages = Math.ceil(newItems.length / rowsPerPage);
        if (page > newTotalPages && newTotalPages > 0) {
          setPage(newTotalPages);
        } else if (newItems.length === 0) {
          setPage(1);
        }
        return {
          ...prev,
          items: newItems
        };
      });
      setSelectedItems(new Set());
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = {
      price_list: 'Standard Selling',
      buying_price_list: 'Standard Buying',
      items: [
        {
          item_code: 'ITEM001',
          item_name: 'Sample Item',
          item_price: 9.99,
          buying_price: 5.50,
          item_group: 'All Item Groups',
          uom: 'Nos',
          qty: 10,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'industry_products_template.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = JSON.parse(content);

        // Validate structure
        if (!parsed.price_list || !Array.isArray(parsed.items)) {
          throw new Error('Invalid file format. Expected price_list and items array.');
        }

        // Validate items structure
        const invalidItems = parsed.items.filter(
          (item) => !item.item_code || !item.item_name || item.item_price === undefined
        );

        if (invalidItems.length > 0) {
          throw new Error('Some items are missing required fields (item_code, item_name, item_price).');
        }

        setData(parsed);
        setSelectedItems(new Set()); // Clear selections when new data is loaded
        setUploadSuccess(true);
        setPage(1); // Reset to first page
      } catch (error) {
        setUploadError(error.message || 'Failed to parse file. Please check the format.');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read file.');
    };

    reader.readAsText(file);
  };

  // Handle save - create seed items
  const handleSave = async () => {
    if (!user) {
      setUploadError('Please log in to create items');
      return;
    }

    // Get selected items only
    const selectedItemsArray = data.items.filter(item => 
      selectedItems.has(item.item_code)
    );

    // Validate selected items
    const validItems = selectedItemsArray.filter(item => {
      if (!item.item_code || !item.item_name || item.item_price === undefined || item.item_price === null || item.item_price < 0) {
        return false;
      }
      
      // Buying price list is always set, so no validation needed
      
      // If qty is provided, active warehouse must be set
      if (item.qty !== null && item.qty !== undefined && item.qty > 0) {
        if (!getActiveWarehouseName()) {
          setUploadError('Please select a warehouse from the app bar before adding inventory quantities');
          return false;
        }
      }
      
      return true;
    });

    if (validItems.length === 0) {
      setUploadError('Please select at least one valid item with item code, name, and price');
      return;
    }

    try {
      // Prepare payload for create_seed_item
      // Price lists are always set to defaults
      const payload = {
        price_list: data.price_list, // Always 'Standard Selling'
        buying_price_list: data.buying_price_list, // Always 'Standard Buying'
        items: validItems.map(item => {
          const itemPayload = {
            item_code: item.item_code,
            item_name: item.item_name,
            item_price: parseFloat(item.item_price) || 0,
            item_group: item.item_group || 'All Item Groups',
            uom: item.uom || 'Nos',
          };
          
          // Add buying_price if provided
          if (item.buying_price !== null && item.buying_price !== undefined && item.buying_price >= 0) {
            itemPayload.buying_price = parseFloat(item.buying_price);
          }
          
          if (item.qty !== null && item.qty !== undefined && item.qty > 0) {
            itemPayload.qty = parseInt(item.qty);
            // Always use active warehouse from appbar
            const warehouseName = getActiveWarehouseName();
            if (warehouseName) {
              itemPayload.warehouse = warehouseName;
            }
            // If buying_price is provided, use it as basic_rate for inventory valuation
            if (itemPayload.buying_price !== undefined) {
              itemPayload.basic_rate = itemPayload.buying_price;
            }
          }
          
          return itemPayload;
        }),
      };

      // Add optional top-level fields
      const warehouseName = getActiveWarehouseName();
      if (warehouseName) {
        payload.warehouse = warehouseName;
      }
      
      if (userCompany) {
        payload.company = userCompany;
      }

      // Add industry if available
      const industryIdentifier = industry.industry_code || industry.name || industryCode;
      if (industryIdentifier) {
        payload.industry = industryIdentifier;
      }

      // Call create_seed_item API
      const result = await dispatch(createSeedItems(payload)).unwrap();
      
      // The slice only lets through runs where something was saved; the details
      // (including any products that could not be saved, and why) show below
      setUploadError(null);
      if (!summarizeSeedResult(result).problems) {
        setUploadSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      // The reason is already shown from the store (createError) and in a pop-up
      setUploadSuccess(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: theme.palette.text.primary }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {industry.industry_name || industry.name || 'Industry'} Product Setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure products and pricing for your industry
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
            >
              Upload
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileUpload}
              />
            </Button>
            {selectedItems.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeleteSelected}
              >
                Delete Selected ({selectedItems.size})
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={isCreating || isUploading ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSave}
              disabled={isCreating || isUploading || selectedItems.size === 0}
            >
              {isCreating ? 'Creating...' : `Create Items (${selectedItems.size})`}
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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
            {seedProductsError}
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

        {/* Configuration Section */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Configuration
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Price Lists:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Standard Selling" size="small" color="primary" />
                  <Chip label="Standard Buying" size="small" color="secondary" />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Active Warehouse:
                </Typography>
                {activeWarehouse ? (
                  <Chip 
                    label={activeWarehouse.warehouse_name || activeWarehouse.name || 'Unknown'} 
                    size="small" 
                    color="success"
                  />
                ) : (
                  <Chip 
                    label="No warehouse selected" 
                    size="small" 
                    color="warning"
                  />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {activeWarehouse 
                    ? 'Items with quantity will be added to this warehouse'
                    : 'Please select a warehouse from the app bar to add inventory'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery 
                ? `Showing ${filteredAndSortedItems.length} of ${totalProducts > 0 ? totalProducts : data.items.length} items`
                : `Total Items: ${totalProducts > 0 ? totalProducts : data.items.length}`}
              {isLoadingSeedProducts && ' (Loading...)'}
            </Typography>
            {selectedItems.size > 0 && (
              <Chip 
                label={`${selectedItems.size} selected`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
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

        {/* Search and Sort Controls */}
        {!isLoadingSeedProducts && !isUploading && data.items.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search products by name, code, or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ maxWidth: 400 }}
            />
            {searchQuery && (
              <Typography variant="body2" color="text.secondary">
                {filteredAndSortedItems.length} of {data.items.length} products
              </Typography>
            )}
          </Box>
        )}

        {/* Table */}
        {!isLoadingSeedProducts && !isUploading && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={isIndeterminate}
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={handleSortToggle}>
                      Item Name
                      {sortOrder === 'asc' && <ArrowUpward sx={{ fontSize: 16 }} />}
                      {sortOrder === 'desc' && <ArrowDownward sx={{ fontSize: 16 }} />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Item Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Selling Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Buying Price</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => {
                    const isSelected = selectedItems.has(item.item_code);
                    return (
                      <TableRow 
                        key={item.item_code} 
                        hover
                        selected={isSelected}
                        sx={{
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          },
                          '&.Mui-selected:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectItem(item.item_code)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>
                          <Chip label={item.item_group} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.item_price || ''}
                            onChange={(e) => handleFieldChange(item.item_code, 'item_price', e.target.value)}
                            size="small"
                            sx={{ width: 120 }}
                            inputProps={{ min: 0, step: 0.01 }}
                            required
                            InputProps={{
                              startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>KES</Typography>,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.buying_price !== null && item.buying_price !== undefined ? item.buying_price : ''}
                            onChange={(e) => handleFieldChange(item.item_code, 'buying_price', e.target.value)}
                            size="small"
                            sx={{ width: 120 }}
                            inputProps={{ min: 0, step: 0.01 }}
                            placeholder="Optional"
                            InputProps={{
                              startAdornment: <Typography variant="body2" sx={{ mr: 0.5 }}>KES</Typography>,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={item.qty !== null && item.qty !== undefined ? item.qty : ''}
                            onChange={(e) => handleFieldChange(item.item_code, 'qty', e.target.value)}
                            size="small"
                            sx={{ width: 100 }}
                            inputProps={{ min: 0, step: 1 }}
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
        {!isLoadingSeedProducts && !isUploading && totalPages > 1 && (
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
        {!isLoadingSeedProducts && !isUploading && data.items.length === 0 && (
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
              <Button
                variant="outlined"
                onClick={() => {
                  const industryIdentifier = industry.industry_code || industry.name || industryCode;
                  if (industryIdentifier) {
                    dispatch(getSeedProducts(industryIdentifier));
                  }
                }}
              >
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

