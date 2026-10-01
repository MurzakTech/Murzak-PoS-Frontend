import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Menu,
  Switch,
  FormControlLabel,
  Grid,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Card,
  CardContent,
  Stack,
  Paper,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  MoreVert,
  Visibility,
  Block,
  CheckCircle,
  QrCode,
  AttachMoney,
  Inventory,
  Clear,
  Discount,
  LocalOffer,
  Title,
  Numbers,
  Category,
  Tag,
  Straighten,
  Description,
  Update,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  enableProduct,
  addBarcode,
  removeBarcode,
  getProductPrice,
  setProductPrice,
  getStockQuantity,
  getItemGroups,
  getBrands,
  getUOMs,
  clearSelectedProduct,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  getPriceLists,
  bulkUpdatePrices,
} from '../../store/productSlice';
import { showNotification } from '../../store/notificationSlice';
import { useTheme } from '@mui/material/styles';
import { listInventoryItems } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { useInventoryDiscounts } from '../../hooks/useInventoryDiscounts';
import DiscountBadge from '../../components/Inventory/DiscountBadge';
import DiscountInfo from '../../components/Inventory/DiscountInfo';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const Products = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  // Check if we're on a child route (e.g., /products/new)
  const isChildRoute = location.pathname !== '/products';
  const {
    products,
    selectedProduct,
    itemGroups,
    brands,
    uoms,
    priceLists,
    pagination,
    filters,
    isLoading,
    isLoadingDetails,
    isLoadingReference,
  } = useAppSelector((state) => state.product);
  const { user } = useAppSelector((state) => state.auth);
  const { inventoryItems, isLoadingInventoryItems } = useAppSelector((state) => state.inventory);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  
  // Get company from user profile - check multiple possible fields
  const userCompany = user?.company || user?.custom_company || user?.company_name;
  
  // Get default warehouse for discount fetching - memoize to avoid unnecessary re-renders
  const defaultWarehouse = useMemo(() => 
    user?.default_warehouse || warehouses.find(w => w.is_default)?.name || '',
    [user?.default_warehouse, warehouses]
  );
  
  // Fetch discounts for all products
  const discountItems = useMemo(() => 
    products.map(product => ({
      item_code: product.item_code,
      item_group: product.item_group,
    })),
    [products]
  );
  
  const { discountsMap, loading: isLoadingDiscounts } = useInventoryDiscounts({
    company: userCompany,
    warehouse: defaultWarehouse,
    items: discountItems,
    autoFetch: products.length > 0 && !!userCompany,
  });

  // Build clean params for fetching products - omit empty/undefined filter
  // values so an "All" selection (empty string) isn't sent as a literal filter.
  const buildProductFetchParams = () => {
    const params = {
      company: userCompany,
      price_list: filters.price_list || 'Standard Selling',
      page: pagination.page,
      page_size: pagination.page_size,
    };
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'price_list') return; // handled above with its own default
      if (value !== '' && value !== undefined && value !== null) {
        params[key] = value;
      }
    });
    return params;
  };

  const fetchProducts = () => {
    if (userCompany) {
      dispatch(getProducts(buildProductFetchParams()));
    }
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProductItem, setSelectedProductItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [viewTab, setViewTab] = useState(0);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingBarcode, setIsSubmittingBarcode] = useState(false);
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const [isSubmittingBulkPrice, setIsSubmittingBulkPrice] = useState(false);

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm({
    defaultValues: {
      item_name: '',
      item_group: '',
      stock_uom: '',
      standard_rate: 0,
      buying_price: 0,
      description: '',
      is_stock_item: true,
      is_sales_item: true,
      is_purchase_item: false,
      brand: '',
    },
  });

  const {
    control: barcodeControl,
    handleSubmit: handleBarcodeSubmit,
    reset: resetBarcode,
    formState: { errors: barcodeErrors },
  } = useForm({
    defaultValues: {
      barcode: '',
    },
  });

  const {
    control: priceControl,
    handleSubmit: handlePriceSubmit,
    reset: resetPrice,
    formState: { errors: priceErrors },
  } = useForm({
    defaultValues: {
      price: 0,
      price_list: '',
    },
  });

  const {
    control: bulkPriceControl,
    handleSubmit: handleBulkPriceSubmit,
    reset: resetBulkPrice,
    formState: { errors: bulkPriceErrors },
    watch: watchBulkPrice,
    setValue: setBulkPriceValue,
  } = useForm({
    defaultValues: {
      price_list: '',
      price_entries: [{ item_code: '', price: '', item_name: '', current_price: '' }],
    },
  });

  // Watch price list to enable fetching current prices
  const selectedBulkPriceList = watchBulkPrice('price_list');

  const { fields: priceEntryFields, append: appendPriceEntry, remove: removePriceEntry } = useFieldArray({
    control: bulkPriceControl,
    name: 'price_entries',
  });

  // Initialize the warehouse filter once the default warehouse is known
  useEffect(() => {
    if (defaultWarehouse && !filters.warehouse) {
      dispatch(setFilters({ warehouse: defaultWarehouse }));
    }
  }, [defaultWarehouse, filters.warehouse, dispatch]);

  useEffect(() => {
    fetchProducts();
    if (userCompany && warehouses.length === 0) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }

    // Fetch reference data only once on mount
    if (itemGroups.length === 0) {
      dispatch(getItemGroups());
    }
    if (brands.length === 0) {
      dispatch(getBrands());
    }
    if (uoms.length === 0) {
      dispatch(getUOMs());
    }
    // Fetch price lists if not already loaded
    if (priceLists.length === 0 && userCompany) {
      dispatch(getPriceLists({ 
        company: userCompany,
        filters: {},
        page: 1,
        page_size: 1000 
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters, pagination.page, pagination.page_size, userCompany, defaultWarehouse]);

  // Fetch inventory items when viewing product details
  useEffect(() => {
    if (viewDialogOpen && selectedProduct?.item_code && userCompany) {
      dispatch(listInventoryItems({
        company: userCompany,
        item_code: selectedProduct.item_code,
        page: 1,
        page_size: 100,
      }));
    }
  }, [dispatch, filters, pagination.page, pagination.page_size, userCompany]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    dispatch(setFilters({ search_term: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value })); // setFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    dispatch(resetFilters()); // resetFilters already resets page to 1
    // useEffect will handle the fetch when filters change
  };

  const handlePageChange = (event, newPage) => {
    // DataTable converts TablePagination's 0-indexed to 1-indexed for API
    dispatch(setPage(newPage));
    // useEffect will handle the fetch when pagination.page changes
  };

  const handleRowsPerPageChange = (event, newPageSize) => {
    dispatch(setPageSize(newPageSize));
    // useEffect will handle the fetch when pagination.page_size changes
  };

  const handleMenuOpen = (event, product) => {
    setAnchorEl(event.currentTarget);
    setSelectedProductItem(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProductItem(null);
  };

  const handleEditOpen = (product) => {
    handleMenuClose();
    resetEdit({
      item_name: product.item_name || '',
      item_group: product.item_group || '',
      stock_uom: product.stock_uom || 'Nos',
      standard_rate: product.standard_rate || 0,
      buying_price: product.buying_price || 0,
      description: product.description || '',
      is_stock_item: product.is_stock_item === 1,
      is_sales_item: product.is_sales_item === 1,
      is_purchase_item: product.is_purchase_item === 1,
      brand: product.brand || '',
    });
    setSelectedProductItem(product);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedProductItem(null);
    resetEdit();
    setIsSubmittingEdit(false);
  };

  const handleViewOpen = async (product) => {
    handleMenuClose();
    setSelectedProductItem(product);
    await dispatch(getProductDetails({ itemCode: product.item_code, company: userCompany }));
    setViewDialogOpen(true);
  };

  const handleViewClose = () => {
    setViewDialogOpen(false);
    setSelectedProductItem(null);
    dispatch(clearSelectedProduct());
    setViewTab(0);
  };

  const handleBarcodeOpen = (product) => {
    handleMenuClose();
    resetBarcode();
    setSelectedProductItem(product);
    setBarcodeDialogOpen(true);
  };

  const handleBarcodeClose = () => {
    setBarcodeDialogOpen(false);
    setSelectedProductItem(null);
    resetBarcode();
    setIsSubmittingBarcode(false);
  };

  const handlePriceOpen = async (product) => {
    handleMenuClose();
    resetPrice();
    setSelectedProductItem(product);
    
    // Fetch price lists if not already loaded
    if (priceLists.length === 0 && userCompany) {
      await dispatch(getPriceLists({ 
        company: userCompany,
        filters: {},
        page: 1,
        page_size: 1000 
      }));
    }
    
    const priceData = await dispatch(
      getProductPrice({ itemCode: product.item_code, company: userCompany })
    );
    if (priceData.type === 'product/getProductPrice/fulfilled') {
      resetPrice({
        price: priceData.payload.price || product.standard_rate || 0,
        price_list: priceData.payload.price_list || '',
      });
    }
    setPriceDialogOpen(true);
  };

  const handlePriceClose = () => {
    setPriceDialogOpen(false);
    setSelectedProductItem(null);
    resetPrice();
    setIsSubmittingPrice(false);
  };

  const handleBulkPriceOpen = () => {
    resetBulkPrice();
    setBulkPriceDialogOpen(true);
  };

  // Handle item selection - populate current price and item name
  const handleItemSelection = (index, selectedProduct) => {
    if (selectedProduct) {
      // Set item_code and item_name
      setBulkPriceValue(`price_entries.${index}.item_code`, selectedProduct.item_code);
      setBulkPriceValue(`price_entries.${index}.item_name`, selectedProduct.item_name || '');
      
      // Set current price from product data (use price field from listing or standard_rate)
      const currentPrice = selectedProduct.price || selectedProduct.standard_rate || 0;
      setBulkPriceValue(`price_entries.${index}.current_price`, currentPrice);
      
      // Pre-fill the price field with current price as a reference
      setBulkPriceValue(`price_entries.${index}.price`, currentPrice > 0 ? currentPrice : '');
    } else {
      // Clear fields when item is deselected
      setBulkPriceValue(`price_entries.${index}.item_code`, '');
      setBulkPriceValue(`price_entries.${index}.item_name`, '');
      setBulkPriceValue(`price_entries.${index}.current_price`, '');
      setBulkPriceValue(`price_entries.${index}.price`, '');
    }
  };

  const handleBulkPriceClose = () => {
    if (!isSubmittingBulkPrice) {
      setBulkPriceDialogOpen(false);
      resetBulkPrice();
      setIsSubmittingBulkPrice(false);
    }
  };

  const onBulkPriceSubmit = async (data) => {
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

    // Prepare valid price updates - extract item_code (always string) and parse price
    const validPrices = data.price_entries
      .filter((p) => p.item_code && p.price && parseFloat(p.price) > 0)
      .map((p) => ({
        item_code: p.item_code, // Already parsed as string from handleItemSelection
        price: parseFloat(p.price),
      }));

    if (validPrices.length === 0) {
      dispatch(showNotification({
        message: 'Please add at least one valid price entry with item code and price > 0.',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    setIsSubmittingBulkPrice(true);

    try {
      const priceData = {
        company: userCompany,
        price_list: typeof data.price_list === 'string' 
          ? data.price_list 
          : (data.price_list?.price_list_name || data.price_list?.name || ''),
        currency: 'KES',
        price_updates: validPrices,
      };

      const result = await dispatch(bulkUpdatePrices(priceData));

      if (result.type === 'product/bulkUpdatePrices/fulfilled') {
        handleBulkPriceClose();
        // Refresh products list
        fetchProducts();
      }
    } catch (error) {
      // Error is handled by Redux thunk
    } finally {
      setIsSubmittingBulkPrice(false);
    }
  };

  const onEditSubmit = async (data) => {
    if (!selectedProductItem || !selectedProductItem.item_code) {
      dispatch(showNotification({
        message: 'Product information is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }
    
    setIsSubmittingEdit(true);
    try {
      const result = await dispatch(
        updateProduct({
          item_code: selectedProductItem.item_code,
          ...data,
          buying_price: data.buying_price || 0,
          company: userCompany,
          warehouse: defaultWarehouse
        })
      );
      if (result.type === 'product/updateProduct/fulfilled') {
        handleEditClose();
        fetchProducts();
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const onBarcodeSubmit = async (data) => {
    if (!selectedProductItem || !selectedProductItem.item_code) {
      dispatch(showNotification({
        message: 'Product information is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }
    
    setIsSubmittingBarcode(true);
    try {
      const result = await dispatch(
        addBarcode({
          itemCode: selectedProductItem.item_code,
          barcode: data.barcode,
        })
      );
      if (result.type === 'product/addBarcode/fulfilled') {
        handleBarcodeClose();
        if (viewDialogOpen && selectedProduct) {
          await dispatch(getProductDetails({ itemCode: selectedProductItem.item_code, company: userCompany }));
        }
      }
    } finally {
      setIsSubmittingBarcode(false);
    }
  };

  const onPriceSubmit = async (data) => {
    if (!selectedProductItem || !selectedProductItem.item_code) {
      dispatch(showNotification({
        message: 'Product information is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }
    
    setIsSubmittingPrice(true);
    try {
      const result = await dispatch(
        setProductPrice({
          itemCode: selectedProductItem.item_code,
          price: data.price,
          priceList: data.price_list,
        })
      );
      if (result.type === 'product/setProductPrice/fulfilled') {
        handlePriceClose();
      }
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  const handleToggleEnabled = async (product) => {
    if (product.disabled === 1) {
      await dispatch(enableProduct(product.item_code));
    } else {
      await dispatch(deleteProduct(product.item_code));
    }
    fetchProducts();
    handleMenuClose();
  };

  const handleRemoveBarcode = async (barcode) => {
    if (!selectedProductItem || !selectedProductItem.item_code) {
      dispatch(showNotification({
        message: 'Product information is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }
    
    await dispatch(
      removeBarcode({
        itemCode: selectedProductItem.item_code,
        barcode,
      })
    );
    if (viewDialogOpen && selectedProduct) {
      await dispatch(getProductDetails({ itemCode: selectedProductItem.item_code, company: userCompany }));
    }
  };

  const handleCreateDiscountRule = (product) => {
    if (!product || !product.item_code) {
      dispatch(showNotification({
        message: 'Product information is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }
    handleMenuClose();
    // Navigate to discount rule form with item_code as query parameter
    navigate(`/settings/inventory-discounts/new?item_code=${encodeURIComponent(product.item_code)}`);
  };

  // Prepare table columns
  const columns = useMemo(() => [
    {
      field: 'item_code',
      header: 'Item Code',
      width: '15%',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    {
      field: 'item_name',
      header: 'Name',
      width: '20%',
    },
    {
      field: 'item_group',
      header: 'Group',
      width: '12%',
      render: (value) => value || '-',
    },
    {
      field: 'stock_uom',
      header: 'UOM',
      width: '8%',
      render: (value) => value || '-',
    },
    {
      field: 'price',
      header: 'Price',
      width: '10%',
      align: 'right',
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          KES {value || '0.00'}
        </Typography>
      ),
    },
    {
      field: 'discount',
      header: 'Discount',
      width: '12%',
      render: (value, row) => {
        if (isLoadingDiscounts) {
          return <CircularProgress size={16} />;
        }
        const productDiscount = discountsMap[row.item_code];
        return productDiscount ? (
          <DiscountBadge discountRule={productDiscount} />
        ) : (
          <Typography variant="body2" color="text.disabled">-</Typography>
        );
      },
    },
    {
      field: 'stock_qty',
      header: 'Stock Qty',
      width: '10%',
      align: 'right',
      render: (value) => {
        if (value === undefined || value === null) {
          return <Typography variant="body2" color="text.disabled">-</Typography>;
        }
        return (
          <Chip
            label={Number(value).toFixed(2)}
            size="small"
            color={value > 0 ? 'success' : 'default'}
            sx={{ fontWeight: 500 }}
          />
        );
      },
    },
    {
      field: 'disabled',
      header: 'Status',
      width: '10%',
      render: (value) => (
        <StatusChip
          status={value === 1 ? 'disabled' : 'enabled'}
          label={value === 1 ? 'Disabled' : 'Enabled'}
        />
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      width: '5%',
      align: 'right',
      render: (value, row) => (
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ], [isLoadingDiscounts, discountsMap]);

  // Calculate stats
  const totalProducts = pagination?.total || products.length;
  const enabledProducts = products.filter(p => p.disabled !== 1).length;
  const disabledProducts = products.filter(p => p.disabled === 1).length;

  // Debug pagination and products (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Products State Debug:', {
        pagination,
        productsCount: products.length,
        products: products.map(p => ({ item_code: p.item_code, item_name: p.item_name })),
        isLoading,
        calculatedTotalPages: pagination?.total_pages || Math.ceil((pagination?.total || products.length || 0) / (pagination?.page_size || 20)),
      });
    }
  }, [pagination, products, isLoading]);

  // Prepare filter bar filters
  const filterBarFilters = useMemo(() => [
    {
      type: 'select',
      key: 'item_group',
      label: 'Item Group',
      value: filters.item_group || '',
      allLabel: 'All Item Groups',
      options: itemGroups
        .filter((group) => (group.item_group_name || group.name || '').trim().toLowerCase() !== 'all item groups')
        .map(group => ({
          value: group.item_group_name,
          label: group.item_group_name,
        })),
      width: 140,
    },
    {
      type: 'select',
      key: 'brand',
      label: 'Brand',
      value: filters.brand || '',
      allLabel: 'All Brands',
      options: brands.map(brand => ({
        value: brand.brand,
        label: brand.brand,
      })),
      width: 140,
    },
    {
      type: 'select',
      key: 'is_sales_item',
      label: 'Type',
      value: filters.is_sales_item === true ? 'sales' : '',
      allLabel: 'All Items',
      options: [
        { value: 'sales', label: 'Sales Items' },
      ],
      width: 140,
    },
    {
      type: 'select',
      key: 'enabled',
      label: 'Enabled',
      value: filters.disabled === false ? 'enabled' : '',
      allLabel: 'All',
      options: [
        { value: 'enabled', label: 'Enabled Only' },
      ],
      width: 120,
    },
  ], [filters, itemGroups, brands, handleFilterChange]);

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  // Handle filter change for FilterBar
  const handleFilterBarChange = (key, value) => {
    // Special handling for filters that need conversion
    if (key === 'is_sales_item') {
      handleFilterChange('is_sales_item', value === 'sales' ? true : undefined);
    } else if (key === 'enabled') {
      // enabled filter: 'all' → disabled: true (all products), 'enabled' → disabled: false (only enabled)
      handleFilterChange('disabled', value === 'enabled' ? false : true);
    } else {
      handleFilterChange(key, value);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        icon={Inventory}
        stats={[
          { value: totalProducts, label: 'Total', color: 'primary.main' },
          { value: enabledProducts, label: 'Enabled', color: 'success.main' },
          { value: disabledProducts, label: 'Disabled', color: 'text.secondary' },
        ]}
        actions={[
          {
            label: 'Bulk Price Update',
            icon: <Update />,
            onClick: () => {
              // Fetch price lists if not already loaded
              if (priceLists.length === 0 && userCompany) {
                dispatch(getPriceLists({ 
                  company: userCompany,
                  filters: {},
                  page: 1,
                  page_size: 1000 
                }));
              }
              handleBulkPriceOpen();
            },
            variant: 'outlined',
          },
          {
            label: 'Add Product',
            icon: <Add />,
            onClick: () => navigate('/products/new'),
            variant: 'contained',
          },
        ]}
        loading={isLoading && products.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={searchTerm}
          searchPlaceholder="Search by name or code..."
          onSearchChange={handleSearch}
          filters={filterBarFilters}
          onFilterChange={handleFilterBarChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={products}
        loading={isLoading}
        emptyMessage="No products found"
        pagination={(() => {
          // Always provide pagination object if we have pagination state or products
          if (!pagination && products.length === 0) return null;
          
          const page = pagination?.page || 1;
          const pageSize = pagination?.page_size || 20;
          const total = pagination?.total || products.length || 0;
          const totalPages = pagination?.total_pages || 
            (total > 0 && pageSize > 0 ? Math.ceil(total / pageSize) : 0);
          
          return {
            page,
            page_size: pageSize,
            total,
            total_pages: totalPages,
          };
        })()}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowKey="item_code"
        onRowClick={(row) => handleViewOpen(row)}
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleViewOpen(selectedProductItem)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleEditOpen(selectedProductItem)}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleBarcodeOpen(selectedProductItem)}>
          <QrCode sx={{ mr: 1 }} fontSize="small" />
          Manage Barcodes
        </MenuItem>
        <MenuItem onClick={() => handlePriceOpen(selectedProductItem)}>
          <AttachMoney sx={{ mr: 1 }} fontSize="small" />
          Manage Price
        </MenuItem>
        <MenuItem onClick={() => handleCreateDiscountRule(selectedProductItem)}>
          <Discount sx={{ mr: 1 }} fontSize="small" />
          Create Discou                                                               nt Rule
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleToggleEnabled(selectedProductItem)}>
          {selectedProductItem?.disabled === 1 ? (
            <>
              <CheckCircle sx={{ mr: 1 }} fontSize="small" />
              Enable
            </>
          ) : (
            <>
              <Block sx={{ mr: 1 }} fontSize="small" />
              Disable
            </>
          )}
        </MenuItem>
      </Menu>

      {/* Edit Product Dialog */}
      <Dialog
  open={editDialogOpen}
  onClose={isSubmittingEdit ? undefined : handleEditClose}
  maxWidth="md"
  fullWidth
>
  <form onSubmit={handleEditSubmit(onEditSubmit)}>
    <DialogTitle sx={{ fontWeight: 600 }}>
      Edit Product
    </DialogTitle>

    <DialogContent sx={{ px: 4, py: 3 }}>
      <Grid container spacing={1.5}>

        {/* ===== BASIC INFORMATION ===== */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Basic Information
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12}>
          <FormLabel sx={{ mb: 0.5 }}>Item Code</FormLabel>
          <TextField
            value={selectedProductItem?.item_code || ''}
            fullWidth
            size="small"
            disabled
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Inventory sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Item Name</FormLabel>
          <Controller
            name="item_name"
            control={editControl}
            rules={{ required: 'Item name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                variant="outlined"
                error={!!editErrors.item_name}
                helperText={editErrors.item_name?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Title sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Brand</FormLabel>
          <Controller
            name="brand"
            control={editControl}
            render={({ field }) => (
              <TextField
                select
                {...field}
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Tag sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              >
                <MenuItem value="">None</MenuItem>
                {brands.map((brand) => (
                  <MenuItem key={brand.name} value={brand.brand}>
                    {brand.brand}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        {/* ===== CLASSIFICATION ===== */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Classification
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Item Group</FormLabel>
          <Controller
            name="item_group"
            control={editControl}
            rules={{ required: 'Item group is required' }}
            render={({ field }) => (
              <TextField 
                select 
                {...field} 
                fullWidth 
                size="small"
                variant="outlined"
                error={!!editErrors.item_group}
                helperText={editErrors.item_group?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Category sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              >
                {itemGroups.map((group) => (
                  <MenuItem key={group.name} value={group.item_group_name}>
                    {group.item_group_name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Stock UOM</FormLabel>
          <Controller
            name="stock_uom"
            control={editControl}
            rules={{ required: 'Stock UOM is required' }}
            render={({ field }) => (
              <TextField 
                select 
                {...field} 
                fullWidth 
                size="small"
                variant="outlined"
                error={!!editErrors.stock_uom}
                helperText={editErrors.stock_uom?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Straighten sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              >
                {uoms.map((uom) => (
                  <MenuItem key={uom.name} value={uom.name}>
                    {uom.uom_name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        {/* ===== PRICING ===== */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Pricing
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Selling Price</FormLabel>
          <Controller
            name="standard_rate"
            control={editControl}
            rules={{ required: 'Price is required', min: 0 }}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                fullWidth
                size="small"
                variant="outlined"
                error={!!editErrors.standard_rate}
                helperText={editErrors.standard_rate?.message}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Buying Price</FormLabel>
          <Controller
            name="buying_price"
            control={editControl}
            rules={{ min: { value: 0, message: 'Buying price must be positive' } }}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                fullWidth
                size="small"
                variant="outlined"
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                error={!!editErrors.buying_price}
                helperText={editErrors.buying_price?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              />
            )}
          />
        </Grid>

        {/* ===== FLAGS ===== */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Availability
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="is_stock_item"
            control={editControl}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={!!field.value} size="small" />}
                label="Stock Item"
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="is_sales_item"
            control={editControl}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={!!field.value} size="small" />}
                label="Sales Item"
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="is_purchase_item"
            control={editControl}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={!!field.value} size="small" />}
                label="Purchase Item"
              />
            )}
          />
        </Grid>

      </Grid>
    </DialogContent>

    <DialogActions sx={{ px: 4, py: 2 }}>
      <Button 
        onClick={handleEditClose} 
        disabled={isSubmittingEdit}
        sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isSubmittingEdit}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
        }}
      >
        {isSubmittingEdit ? <CircularProgress size={18} /> : 'Update'}
      </Button>
    </DialogActions>
  </form>
</Dialog>


      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleViewClose} maxWidth="md" fullWidth>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedProduct ? (
            <Box>
              <Tabs value={viewTab} onChange={(e, v) => setViewTab(v)} sx={{ mb: 2 }}>
                <Tab label="Details" />
                <Tab label="Barcodes" />
                <Tab label="Stock" />
                <Tab label="Inventory Details" />
              </Tabs>
              {viewTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Item Code
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedProduct.item_code}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Item Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedProduct.item_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Item Group
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.item_group || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Stock UOM
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.stock_uom || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Selling Price
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      KES {(selectedProduct.price ?? selectedProduct.standard_rate ?? 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      <Chip
                        label={selectedProduct.disabled === 1 ? 'Disabled' : 'Enabled'}
                        color={selectedProduct.disabled === 1 ? 'default' : 'success'}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Brand
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.brand || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Valuation Rate
                    </Typography>
                    <Typography variant="body1">
                      KES {(selectedProduct.valuation_rate || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Weight
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.weight_per_unit ? `${selectedProduct.weight_per_unit} ${selectedProduct.weight_uom || ''}` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Warranty
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.warranty_period ? `${selectedProduct.warranty_period} ${selectedProduct.warranty_period_unit || 'Days'}` : 'No warranty'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Item Flags
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label="Stock Item" size="small" color={selectedProduct.is_stock_item ? 'primary' : 'default'} variant={selectedProduct.is_stock_item ? 'filled' : 'outlined'} />
                      <Chip label="Sales Item" size="small" color={selectedProduct.is_sales_item ? 'primary' : 'default'} variant={selectedProduct.is_sales_item ? 'filled' : 'outlined'} />
                      <Chip label="Purchase Item" size="small" color={selectedProduct.is_purchase_item ? 'primary' : 'default'} variant={selectedProduct.is_purchase_item ? 'filled' : 'outlined'} />
                    </Stack>
                  </Grid>
                  {discountsMap[selectedProduct.item_code] && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Discount
                      </Typography>
                      <DiscountInfo 
                        discountRule={discountsMap[selectedProduct.item_code]} 
                        price={selectedProduct.standard_rate}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedProduct.description || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              )}
              {viewTab === 1 && (
                <Box>
                  <List>
                    {selectedProduct.barcodes && selectedProduct.barcodes.length > 0 ? (
                      selectedProduct.barcodes.map((barcode) => (
                        <ListItem key={barcode}>
                          <ListItemText primary={barcode} />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveBarcode(barcode)}
                              size="small"
                            >
                              <Clear />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No barcodes assigned
                      </Typography>
                    )}
                  </List>
                </Box>
              )}
              {viewTab === 2 && (
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Stock Quantity: {selectedProduct.stock_qty?.toFixed(2) || '0.00'} {selectedProduct.stock_uom || ''}
                  </Typography>
                </Box>
              )}
              {viewTab === 3 && (
                <Box>
                  {isLoadingInventoryItems ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : inventoryItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No warehouse-specific inventory details found. Create inventory details during stock reconciliation.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Warehouse</TableCell>
                            <TableCell>Buying Price</TableCell>
                            <TableCell>Selling Price</TableCell>
                            <TableCell>UOM</TableCell>
                            <TableCell>SKU</TableCell>
                            <TableCell>Expiry Date</TableCell>
                            <TableCell>Batch No</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventoryItems.map((item) => (
                            <TableRow key={`${item.item_code}-${item.warehouse}`}>
                              <TableCell>{item.warehouse}</TableCell>
                              <TableCell>
                                {item.buying_price ? `KES ${item.buying_price.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell>
                                {item.selling_price ? `KES ${item.selling_price.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell>{item.unit_of_measure || '-'}</TableCell>
                              <TableCell>
                                {item.sku ? <Chip label={item.sku} size="small" variant="outlined" /> : '-'}
                              </TableCell>
                              <TableCell>
                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>{item.batch_no || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Typography>No details available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleViewClose}
            sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Dialog */}
      <Dialog open={barcodeDialogOpen} onClose={handleBarcodeClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleBarcodeSubmit(onBarcodeSubmit)}>
          <DialogTitle>Add Barcode - {selectedProductItem?.item_code}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Controller
                name="barcode"
                control={barcodeControl}
                rules={{ required: 'Barcode is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Barcode"
                    fullWidth
                    size="small"
                    autoFocus
                    error={!!barcodeErrors?.barcode}
                    helperText={barcodeErrors?.barcode?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCode sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleBarcodeClose} 
              disabled={isSubmittingBarcode}
              sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmittingBarcode || !selectedProductItem || !selectedProductItem.item_code}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isSubmittingBarcode ? <CircularProgress size={18} /> : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={priceDialogOpen} onClose={handlePriceClose} maxWidth="sm" fullWidth>
        <form onSubmit={handlePriceSubmit(onPriceSubmit)}>
          <DialogTitle>Set Product Price - {selectedProductItem?.item_code}</DialogTitle>
          <DialogContent>
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="price"
                  control={priceControl}
                  rules={{ required: 'Price is required', min: { value: 0, message: 'Price must be positive' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price"
                      type="number"
                      fullWidth
                      size="small"
                      error={!!priceErrors?.price}
                      helperText={priceErrors?.price?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="price_list"
                  control={priceControl}
                  rules={{ required: 'Price list is required' }}
                  render={({ field: { onChange, value, ...field } }) => (
                    <Autocomplete
                      {...field}
                      options={priceLists || []}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option.price_list_name || option.name || '';
                      }}
                      value={
                        priceLists.find(
                          (pl) => (pl.price_list_name || pl.name) === value
                        ) || null
                      }
                      onChange={(event, newValue) => {
                        onChange(newValue ? (newValue.price_list_name || newValue.name) : '');
                      }}
                      filterOptions={(options, params) => {
                        const filtered = options.filter((option) => {
                          const label = option.price_list_name || option.name || '';
                          return label.toLowerCase().includes(params.inputValue.toLowerCase());
                        });
                        return filtered;
                      }}
                      isOptionEqualToValue={(option, value) => {
                        if (!value) return false;
                        const optionName = option.price_list_name || option.name;
                        const valueName = typeof value === 'string' ? value : (value.price_list_name || value.name);
                        return optionName === valueName;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Price List"
                          size="small"
                          placeholder="Search or select price list..."
                          error={!!priceErrors?.price_list}
                          helperText={priceErrors?.price_list?.message}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <LocalOffer sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.name || option.price_list_name}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" fontWeight={500}>
                              {option.price_list_name || option.name}
                            </Typography>
                            {option.currency && (
                              <Typography variant="caption" color="text.secondary">
                                Currency: {option.currency}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                      noOptionsText="No price lists found"
                      loading={isLoading}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handlePriceClose} 
              disabled={isSubmittingPrice}
              sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmittingPrice || !selectedProductItem || !selectedProductItem.item_code}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isSubmittingPrice ? <CircularProgress size={18} /> : 'Set Price'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Price Update Dialog */}
      <Dialog 
        open={bulkPriceDialogOpen} 
        onClose={handleBulkPriceClose} 
        maxWidth="md" 
        fullWidth
      >
        <form onSubmit={handleBulkPriceSubmit(onBulkPriceSubmit)}>
          <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
            Bulk Price Update
          </DialogTitle>
          <DialogContent sx={{ px: 3, py: 2 }}>
            <Card elevation={0} sx={{ bgcolor: 'background.default', mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* Price List Selection */}
                  <Box>
                    <Controller
                      name="price_list"
                      control={bulkPriceControl}
                      rules={{ required: 'Price list is required' }}
                      render={({ field: { onChange, value, ...field } }) => (
                        <Autocomplete
                          {...field}
                          options={priceLists || []}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.price_list_name || option.name || '';
                          }}
                          value={
                            priceLists.find(
                              (pl) => (pl.price_list_name || pl.name) === value
                            ) || null
                          }
                          onChange={(event, newValue) => {
                            onChange(newValue ? (newValue.price_list_name || newValue.name) : '');
                          }}
                          filterOptions={(options, params) => {
                            const filtered = options.filter((option) => {
                              const label = option.price_list_name || option.name || '';
                              return label.toLowerCase().includes(params.inputValue.toLowerCase());
                            });
                            return filtered;
                          }}
                          isOptionEqualToValue={(option, value) => {
                            if (!value) return false;
                            const optionName = option.price_list_name || option.name;
                            const valueName = typeof value === 'string' ? value : (value.price_list_name || value.name);
                            return optionName === valueName;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Price List *"
                              size="small"
                              placeholder="Search or select price list..."
                              error={!!bulkPriceErrors?.price_list}
                              helperText={bulkPriceErrors?.price_list?.message}
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <>
                                    <InputAdornment position="start">
                                      <LocalOffer sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </InputAdornment>
                                    {params.InputProps.startAdornment}
                                  </>
                                ),
                              }}
                              sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.name || option.price_list_name}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {option.price_list_name || option.name}
                                </Typography>
                                {option.currency && (
                                  <Typography variant="caption" color="text.secondary">
                                    Currency: {option.currency}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                          noOptionsText="No price lists found"
                          loading={isLoading}
                        />
                      )}
                    />
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Price Entries Section */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Price Entries
                      </Typography>
                      <Button
                        startIcon={<Add />}
                        onClick={() => appendPriceEntry({ item_code: '', price: '', item_name: '', current_price: '' })}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Add Entry
                      </Button>
                    </Box>

                    {priceEntryFields.length === 0 && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Click "Add Entry" to add products and their prices.
                      </Alert>
                    )}

                    <Stack spacing={1.5}>
                      {priceEntryFields.map((field, index) => (
                        <Paper 
                          key={field.id} 
                          variant="outlined" 
                          sx={{ p: 2, bgcolor: 'background.paper' }}
                        >
                          <Grid container spacing={1.5} alignItems="flex-start">
                            <Grid item xs={12} sm={5}>
                              <Controller
                                name={`price_entries.${index}.item_code`}
                                control={bulkPriceControl}
                                rules={{ required: 'Item is required' }}
                                render={({ field: { onChange, value, ...field } }) => {
                                  // Find the selected product by item_code
                                  const selectedProduct = products.find(
                                    (p) => p.item_code === value
                                  ) || null;
                                  
                                  return (
                                    <Autocomplete
                                      {...field}
                                      options={products || []}
                                      getOptionLabel={(option) => {
                                        if (typeof option === 'string') return option;
                                        // Display item name primarily, with item code as fallback
                                        return option.item_name || option.item_code || '';
                                      }}
                                      value={selectedProduct}
                                      onChange={(event, newValue) => {
                                        const itemCode = newValue ? newValue.item_code : '';
                                        onChange(itemCode);
                                        handleItemSelection(index, newValue);
                                      }}
                                      filterOptions={(options, params) => {
                                        const filtered = options.filter((option) => {
                                          const itemCode = option.item_code || '';
                                          const itemName = option.item_name || '';
                                          const searchTerm = params.inputValue.toLowerCase();
                                          return itemCode.toLowerCase().includes(searchTerm) || 
                                                 itemName.toLowerCase().includes(searchTerm);
                                        });
                                        return filtered;
                                      }}
                                      isOptionEqualToValue={(option, value) => {
                                        if (!value) return false;
                                        return option.item_code === (value.item_code || value);
                                      }}
                                      componentsProps={{
                                        popper: {
                                          modifiers: [
                                            {
                                              name: 'offset',
                                              options: {
                                                offset: [0, 8],
                                              },
                                            },
                                          ],
                                        },
                                      }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          label="Product *"
                                          size="small"
                                          placeholder="Search by name or code..."
                                          error={!!bulkPriceErrors?.price_entries?.[index]?.item_code}
                                          helperText={
                                            bulkPriceErrors?.price_entries?.[index]?.item_code?.message ||
                                            (selectedProduct && `Code: ${selectedProduct.item_code}`)
                                          }
                                          InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                              <>
                                                <InputAdornment position="start">
                                                  <Inventory sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                </InputAdornment>
                                                {params.InputProps.startAdornment}
                                              </>
                                            ),
                                          }}
                                          inputProps={{
                                            ...params.inputProps,
                                            title: selectedProduct ? (selectedProduct.item_name || selectedProduct.item_code) : '',
                                          }}
                                          sx={{ 
                                            '& .MuiInputBase-input': { 
                                              fontSize: '0.8125rem',
                                            },
                                            '& .MuiAutocomplete-input': {
                                              minWidth: '0 !important',
                                            },
                                            '& .MuiInputBase-root': {
                                              '& input': {
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden',
                                              }
                                            }
                                          }}
                                        />
                                      )}
                                      renderOption={(props, option) => (
                                        <Box 
                                          component="li" 
                                          {...props} 
                                          key={option.item_code}
                                          sx={{ 
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            '&.MuiAutocomplete-option': {
                                              minHeight: 'auto',
                                              padding: '8px 12px',
                                            }
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0.5 }}>
                                            <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.4 }}>
                                              {option.item_name || option.item_code}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <Typography variant="caption" color="text.secondary">
                                                Code: {option.item_code}
                                              </Typography>
                                              {(option.price || option.standard_rate) && (
                                                <Chip 
                                                  label={`KES ${parseFloat(option.price || option.standard_rate || 0).toFixed(2)}`}
                                                  size="small"
                                                  variant="outlined"
                                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                                />
                                              )}
                                            </Box>
                                          </Box>
                                        </Box>
                                      )}
                                      noOptionsText="No products found"
                                    />
                                  );
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Controller
                                name={`price_entries.${index}.price`}
                                control={bulkPriceControl}
                                rules={{
                                  required: 'Price is required',
                                  min: { value: 0.01, message: 'Price must be greater than 0' },
                                }}
                                render={({ field }) => {
                                  const currentPrice = watchBulkPrice(`price_entries.${index}.current_price`);
                                  const itemName = watchBulkPrice(`price_entries.${index}.item_name`);
                                  
                                  return (
                                    <TextField
                                      {...field}
                                      label="New Price *"
                                      type="number"
                                      fullWidth
                                      size="small"
                                      placeholder="0.00"
                                      error={!!bulkPriceErrors?.price_entries?.[index]?.price}
                                      helperText={
                                        bulkPriceErrors?.price_entries?.[index]?.price?.message ||
                                        (currentPrice > 0 && `Current: KES ${parseFloat(currentPrice).toFixed(2)}`)
                                      }
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <AttachMoney sx={{ fontSize: 16, color: 'text.disabled' }} />
                                          </InputAdornment>
                                        ),
                                        inputProps: { step: '0.01', min: '0' },
                                      }}
                                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                                    />
                                  );
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-start' }, alignItems: 'center', gap: 1 }}>
                                <IconButton
                                  onClick={() => removePriceEntry(index)}
                                  disabled={priceEntryFields.length === 1}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={handleBulkPriceClose} 
              disabled={isSubmittingBulkPrice}
              sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmittingBulkPrice || priceEntryFields.length === 0}
              startIcon={isSubmittingBulkPrice ? <CircularProgress size={18} /> : <Update />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {isSubmittingBulkPrice ? 'Updating...' : 'Update Prices'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Products;
