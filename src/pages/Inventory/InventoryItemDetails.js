import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
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
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Search, Clear, Edit, Visibility, ArrowBack } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listInventoryItems,
  getInventoryItemDetails,
  updateInventoryItemDetails,
  setInventoryPage,
} from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getProducts, getUOMs } from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';

const InventoryItemDetails = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    inventoryItems,
    inventoryItemDetails,
    inventoryPagination,
    isLoadingInventoryItems,
    isLoadingInventoryDetails,
    isLoading,
  } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { products, uoms } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Initialize with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !selectedWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        setSelectedWarehouse(warehouseName);
      }
    }
  }, [activeWarehouse, selectedWarehouse]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm({
    defaultValues: {
      item_code: '',
      warehouse: '',
      buying_price: '',
      selling_price: '',
      unit_of_measure: '',
      sku: '',
      expiry_date: '',
      batch_no: '',
    },
  });

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getProducts({ company: userCompany, limit: 1000 }));
      dispatch(getUOMs());
      fetchInventoryItems();
    }
  }, [dispatch, userCompany, inventoryPagination.page, selectedWarehouse]);

  const fetchInventoryItems = () => {
    if (!userCompany) return;

    const params = {
      company: userCompany,
      page: inventoryPagination.page,
      page_size: inventoryPagination.page_size,
      ...(selectedWarehouse && { warehouse: selectedWarehouse }),
      ...(searchTerm && { search_term: searchTerm }),
    };

    dispatch(listInventoryItems(params));
  };

  const handleViewDetails = async (item) => {
    setSelectedItem(item);
    const result = await dispatch(
      getInventoryItemDetails({
        item_code: item.item_code,
        warehouse: item.warehouse,
        company: userCompany,
      })
    );

    if (result.type === 'inventory/getInventoryItemDetails/fulfilled') {
      setViewDialogOpen(true);
    }
  };

  const handleEditOpen = (item) => {
    setSelectedItem(item);
    resetEdit({
      item_code: item.item_code,
      warehouse: item.warehouse,
      buying_price: item.buying_price || '',
      selling_price: item.selling_price || '',
      unit_of_measure: item.unit_of_measure || '',
      sku: item.sku || '',
      expiry_date: item.expiry_date || '',
      batch_no: item.batch_no || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedItem(null);
    resetEdit();
  };

  const onEditSubmit = async (data) => {
    if (!selectedItem) return;

    const result = await dispatch(
      updateInventoryItemDetails({
        item_code: selectedItem.item_code,
        warehouse: selectedItem.warehouse,
        company: userCompany,
        ...(data.buying_price && { buying_price: parseFloat(data.buying_price) }),
        ...(data.selling_price && { selling_price: parseFloat(data.selling_price) }),
        ...(data.unit_of_measure && { unit_of_measure: data.unit_of_measure }),
        ...(data.sku && { sku: data.sku.trim() }),
        ...(data.expiry_date && { expiry_date: data.expiry_date }),
        ...(data.batch_no && { batch_no: data.batch_no.trim() }),
      })
    );

    if (result.type === 'inventory/updateInventoryItemDetails/fulfilled') {
      handleEditClose();
      fetchInventoryItems();
    }
  };

  const handlePageChange = (event, value) => {
    dispatch(setInventoryPage(value));
    // Fetch will be triggered by useEffect when inventoryPagination.page changes
  };

  const handleWarehouseChange = (value) => {
    setSelectedWarehouse(value);
    dispatch(setInventoryPage(1));
  };

  const filteredItems = inventoryItems.filter((item) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.item_code || '').toLowerCase().includes(searchLower) ||
      (item.item_name || '').toLowerCase().includes(searchLower) ||
      (item.sku || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/inventory')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Inventory Item Details
          </Typography>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by item code, name, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Warehouse</InputLabel>
                <Select
                  value={selectedWarehouse}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  label="Filter by Warehouse"
                >
                  <MenuItem value="">All Warehouses</MenuItem>
                  {warehouses.map((wh) => (
                    <MenuItem key={wh.name} value={wh.name}>
                      {wh.warehouse_name || wh.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                fullWidth
                onClick={fetchInventoryItems}
                disabled={isLoadingInventoryItems}
              >
                {isLoadingInventoryItems ? <CircularProgress size={20} /> : 'Refresh'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper} sx={{ position: 'relative' }}>
          {isLoadingInventoryItems && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Code</TableCell>
                <TableCell>Item Name</TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Buying Price</TableCell>
                <TableCell>Selling Price</TableCell>
                <TableCell>UOM</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Batch No</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 && !isLoadingInventoryItems ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography color="text.secondary">No inventory items found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={`${item.item_code}-${item.warehouse}`} hover>
                    <TableCell>{item.item_code}</TableCell>
                    <TableCell>{item.item_name || '-'}</TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell>
                      {item.buying_price ? `KES ${item.buying_price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.selling_price ? `KES ${item.selling_price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{item.unit_of_measure || '-'}</TableCell>
                    <TableCell>
                      {item.sku ? (
                        <Chip label={item.sku} size="small" variant="outlined" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{item.batch_no || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(item)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditOpen(item)} color="primary">
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {inventoryPagination.total_pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={inventoryPagination.total_pages}
              page={inventoryPagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Inventory Item Details</DialogTitle>
          <DialogContent>
            {isLoadingInventoryDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : inventoryItemDetails ? (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Item Code
                  </Typography>
                  <Typography variant="body1">{inventoryItemDetails.item_code}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Warehouse
                  </Typography>
                  <Typography variant="body1">{inventoryItemDetails.warehouse}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Buying Price
                  </Typography>
                  <Typography variant="body1">
                    {inventoryItemDetails.buying_price
                      ? `KES ${inventoryItemDetails.buying_price.toFixed(2)}`
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Selling Price
                  </Typography>
                  <Typography variant="body1">
                    {inventoryItemDetails.selling_price
                      ? `KES ${inventoryItemDetails.selling_price.toFixed(2)}`
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Unit of Measure
                  </Typography>
                  <Typography variant="body1">
                    {inventoryItemDetails.unit_of_measure || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    SKU
                  </Typography>
                  <Typography variant="body1">{inventoryItemDetails.sku || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Expiry Date
                  </Typography>
                  <Typography variant="body1">
                    {inventoryItemDetails.expiry_date
                      ? new Date(inventoryItemDetails.expiry_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Batch No
                  </Typography>
                  <Typography variant="body1">{inventoryItemDetails.batch_no || '-'}</Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography>No details available</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Inventory Item Details</DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Item Code"
                    value={selectedItem?.item_code || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Warehouse"
                    value={selectedItem?.warehouse || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="buying_price"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Buying Price"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        error={!!editErrors.buying_price}
                        helperText={editErrors.buying_price?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="selling_price"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Selling Price"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        error={!!editErrors.selling_price}
                        helperText={editErrors.selling_price?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="unit_of_measure"
                    control={editControl}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={uoms}
                        getOptionLabel={(option) =>
                          typeof option === 'string' ? option : option.name || option
                        }
                        isOptionEqualToValue={(option, value) =>
                          (typeof option === 'string' ? option : option.name) ===
                          (typeof value === 'string' ? value : value?.name)
                        }
                        onChange={(_, newValue) => {
                          const uomValue =
                            typeof newValue === 'string' ? newValue : newValue?.name || '';
                          field.onChange(uomValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Unit of Measure"
                            error={!!editErrors.unit_of_measure}
                            helperText={editErrors.unit_of_measure?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="sku"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="SKU"
                        error={!!editErrors.sku}
                        helperText={editErrors.sku?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="expiry_date"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Expiry Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        error={!!editErrors.expiry_date}
                        helperText={editErrors.expiry_date?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="batch_no"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Batch No"
                        error={!!editErrors.batch_no}
                        helperText={editErrors.batch_no?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose}>Cancel</Button>
            <Button
              onClick={handleEditSubmit(onEditSubmit)}
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InventoryItemDetails;

