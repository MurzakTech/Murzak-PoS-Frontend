import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  AppBar,
  Toolbar,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fade,
  Snackbar,
  Alert,
  CircularProgress,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Backdrop,
  Chip,
  LinearProgress,
  FormControlLabel,
  Pagination,
  TablePagination,
  Stack,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  LocalOffer as LocalOfferIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Percent as PercentIcon,
  CurrencyExchange as CurrencyExchangeIcon,
  AttachMoney as AttachMoneyIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  ShoppingCart as ShoppingCartIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Dashboard as DashboardIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccountBalance as TaxIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getProducts,
  getStockQuantity,
  getItemGroups,
  getProductPrice,
} from '../../store/productSlice';
import { earnLoyaltyPoints } from '../../store/loyaltySlice';
import { useInventoryDiscounts } from '../../hooks/useInventoryDiscounts';
import DiscountBadge from '../../components/Inventory/DiscountBadge';
import { calculateDiscountAmount, calculateDiscountedPrice } from '../../utils/discountCalculator';
import {
  createPOSInvoice,
  createSalesInvoice,
  clearSelectedPOSInvoice,
  createPOSOpeningEntry,
  getPOSOpeningEntry,
  closePOSOpeningEntry,
  listPaymentMethods,
  getReceivableAccount,
} from '../../store/salesSlice';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStockBalanceMultiple } from '../../store/inventorySlice';
import { showNotification } from '../../store/notificationSlice';
import { listCustomers, createCustomer } from '../../store/customerSlice';
import LoyaltyRedemption from '../../components/Sales/LoyaltyRedemption';

// Motion components for animations (matching onboarding design)
const MotionButton = motion(Button);

const NewSale = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux selectors
  const { products, isLoading: isLoadingProducts, isLoadingReference: isLoadingItemGroups, itemGroups } = useAppSelector((state) => state.product);
  const { 
    isLoading: isCreatingInvoice, 
    selectedPOSInvoice,
    paymentMethods,
    isLoadingPaymentMethods,
    receivableAccount,
    isLoadingReceivableAccount,
  } = useAppSelector((state) => state.sales);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const { customers, isLoading: isLoadingCustomers, isCreating: isCreatingCustomer } = useAppSelector((state) => state.customer);

  const userCompany = user?.company || user?.custom_company || user?.company_name || 
                      user?.company_data?.name || user?.company_data?.company_name;

  // Refs for accessibility
  const searchInputRef = useRef(null);
  const cartAnnouncementRef = useRef(null);

  // Local state
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [manualDiscountType, setManualDiscountType] = useState('percentage'); // 'percentage' | 'amount'
  const [manualDiscountValue, setManualDiscountValue] = useState(0);
  const [customer, setCustomer] = useState('Walk-in Customer'); // Display name for UI (e.g., "John Doe")
  // Note: customer.name is the Customer ID (unique identifier, e.g., "CUST-00001")
  const [customerId, setCustomerId] = useState(null); // Customer ID for API calls (from customer.name field)
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null); // Full customer object for metadata access
  const [customerPriceList, setCustomerPriceList] = useState('Standard Selling'); // Customer's default price list
  const [customerProductPrices, setCustomerProductPrices] = useState({}); // { item_code: price } for customer-specific prices
  const [isLoadingCustomerPrices, setIsLoadingCustomerPrices] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [splitPayments, setSplitPayments] = useState(false);
  const [payments, setPayments] = useState([{ mode: 'Cash', amount: 0 }]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [completedSaleData, setCompletedSaleData] = useState(null); // Store cart and payment data for receipt
  const [stockChecking, setStockChecking] = useState({});
  const [posProfile, setPosProfile] = useState('');
  const [posProfileDialogOpen, setPosProfileDialogOpen] = useState(false);
  const [updateStock, setUpdateStock] = useState(true);
  
  // Use activeWarehouse from global selection
  const defaultWarehouse = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
  const [productStocks, setProductStocks] = useState({}); // { item_code: { warehouse: qty } }
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [closeSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [amountGiven, setAmountGiven] = useState(0);
  const [saleType, setSaleType] = useState('Retail');
  const [productsPage, setProductsPage] = useState(0);
  const [productsRowsPerPage, setProductsRowsPerPage] = useState(25);
  
  // Loyalty redemption state
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [loyaltyDiscountAmount, setLoyaltyDiscountAmount] = useState(0);

  const { isPOSSessionOpen, isLoadingPOSOpening, posOpeningEntry, isClosingPOSOpening } = useAppSelector((state) => state.sales);

  // Get POS profile from user data (must be declared before useForm)
  const userPosProfile = user?.pos_profile || user?.pos_profile_data?.name || '';

  // Form for POS Opening Entry
  const {
    control: posOpeningFormControl,
    handleSubmit: handlePosOpeningSubmit,
    reset: resetPosOpeningForm,
    formState: { errors: posOpeningErrors },
    watch: watchPosOpening,
  } = useForm({
    defaultValues: {
      pos_profile: userPosProfile || '',
      company: userCompany || '',
      user: user?.email || user?.name || user?.user || '',
      balance_details: [],
    },
  });

  const { fields: balanceFields, append: appendBalance, remove: removeBalance } = useFieldArray({
    control: posOpeningFormControl,
    name: 'balance_details',
  });

  // Form for Customer Creation
  const {
    control: customerFormControl,
    handleSubmit: handleCustomerFormSubmit,
    reset: resetCustomerForm,
    formState: { errors: customerFormErrors },
  } = useForm({
    defaultValues: {
      customer_name: '',
      customer_type: 'Individual',
      mobile_no: '',
      email_id: '',
      tax_id: '',
    },
  });

  // Get default warehouse from user profile or POS profile
  const userDefaultWarehouse = user?.default_warehouse || '';
  const posProfileWarehouse = user?.pos_profile_data?.warehouse || '';

  // Fetch products, item groups, and warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getProducts({ 
        company: userCompany,
        limit: 1000,
        is_sales_item: true,
        disabled: false,
      }));
      dispatch(getItemGroups());
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Fetch customers when dialog opens
  useEffect(() => {
    if (customerDialogOpen && userCompany) {
      dispatch(listCustomers({ 
        company: userCompany,
        limit: 100,
        disabled: false,
      }));
    }
  }, [customerDialogOpen, userCompany, dispatch]);

  // Fetch payment methods on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listPaymentMethods({ 
        company: userCompany,
        only_enabled: true 
      }));
    }
  }, [userCompany, dispatch]);

  // Fetch receivable account when credit payment is used
  useEffect(() => {
    const isCreditUsed = paymentMode === 'Credit' || payments.some(p => p.mode === 'Credit');
    
    // Use customer ID if available (non-walk-in), otherwise skip
    if (customerId && 
        userCompany &&
        isCreditUsed) {
      dispatch(getReceivableAccount({ 
        customer: customerId, // Use customer ID instead of display name
        company: userCompany 
      }));
    }
  }, [customerId, userCompany, paymentMode, payments, dispatch]);

  // Clear loyalty redemption when customer changes
  useEffect(() => {
    setLoyaltyPointsToRedeem(0);
    setLoyaltyDiscountAmount(0);
  }, [customerId]);

  // Warehouse is now managed globally via activeWarehouse in Redux
  // No need for local state management

  // Fetch stock quantities for all products when warehouse changes
  useEffect(() => {
    if (defaultWarehouse && products.length > 0 && userCompany) {
      const itemCodes = products.map(p => p.item_code).filter(Boolean);
      if (itemCodes.length > 0) {
        dispatch(getStockBalanceMultiple({
          items: itemCodes,
          warehouse: defaultWarehouse,
          company: userCompany,
        })).then((result) => {
          if (result.type === 'inventory/getStockBalanceMultiple/fulfilled') {
            const stocks = {};
            result.payload.balances?.forEach((balance) => {
              if (!stocks[balance.item_code]) {
                stocks[balance.item_code] = {};
              }
              stocks[balance.item_code][defaultWarehouse] = balance.actual_qty || 0;
            });
            setProductStocks(prev => ({ ...prev, ...stocks }));
          }
        });
      }
    }
  }, [defaultWarehouse, products.length, userCompany, dispatch]);

  // Set POS profile from user data on mount
  useEffect(() => {
    if (userPosProfile && !posProfile) {
      setPosProfile(userPosProfile);
    }
  }, [userPosProfile, posProfile]);

  // Fetch current session details when session is open
  useEffect(() => {
    if (isPOSSessionOpen && posOpeningEntry?.name) {
      dispatch(getPOSOpeningEntry({ name: posOpeningEntry.name }));
    }
  }, [dispatch, isPOSSessionOpen, posOpeningEntry?.name]);

  // Track last fetched customer/price list to avoid unnecessary re-fetches
  const lastFetchedCustomerPriceList = useRef(null);
  
  // Fetch customer-specific prices when customer with different price list is selected
  useEffect(() => {
    const customerPriceListKey = `${customerId}_${customerPriceList}`;
    
    // Only fetch if:
    // 1. Customer is not walk-in (has customerId)
    // 2. Customer has a different price list than "Standard Selling"
    // 3. Products are loaded
    // 4. Company is available
    // 5. We haven't already fetched for this customer/price list combination
    if (customerId && 
        customerPriceList !== 'Standard Selling' && 
        products.length > 0 && 
        userCompany &&
        lastFetchedCustomerPriceList.current !== customerPriceListKey) {
      
      setIsLoadingCustomerPrices(true);
      lastFetchedCustomerPriceList.current = customerPriceListKey;
      
      const pricePromises = products.map(product => 
        dispatch(getProductPrice({
          itemCode: product.item_code,
          priceList: customerPriceList,
          company: userCompany,
        })).then(result => {
          if (result.type === 'product/getProductPrice/fulfilled' && result.payload) {
            return {
              item_code: product.item_code,
              price: result.payload.price || product.standard_rate || product.price || 0,
            };
          }
          // Fallback to standard rate if price fetch fails
          return {
            item_code: product.item_code,
            price: product.standard_rate || product.price || 0,
          };
        }).catch(() => {
          // Fallback to standard rate on error
          return {
            item_code: product.item_code,
            price: product.standard_rate || product.price || 0,
          };
        })
      );
      
      Promise.all(pricePromises).then(prices => {
        const priceMap = {};
        prices.forEach(({ item_code, price }) => {
          priceMap[item_code] = price;
        });
        setCustomerProductPrices(priceMap);
        setIsLoadingCustomerPrices(false);
      }).catch(() => {
        setIsLoadingCustomerPrices(false);
        lastFetchedCustomerPriceList.current = null; // Reset on error to allow retry
        // Keep existing prices or fallback to standard rates
      });
    } else if (!customerId || customerPriceList === 'Standard Selling') {
      // Reset customer prices for walk-in or standard price list customers
      setCustomerProductPrices({});
      setIsLoadingCustomerPrices(false);
      lastFetchedCustomerPriceList.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerPriceList, products.length, userCompany, dispatch]);

  // Fetch discounts for cart items
  const cartDiscountItems = useMemo(() => 
    cart.map(item => ({
      item_code: item.item_code,
      warehouse: item.warehouse || defaultWarehouse,
    })),
    [cart, defaultWarehouse]
  );
  
  const { discountsMap: cartDiscountsMap, loading: isLoadingCartDiscounts } = useInventoryDiscounts({
    company: userCompany,
    warehouse: defaultWarehouse,
    items: cartDiscountItems,
    autoFetch: cart.length > 0 && !!userCompany && !!defaultWarehouse,
  });

  // Update cart items when discounts are fetched
  useEffect(() => {
    if (!isLoadingCartDiscounts && cart.length > 0 && Object.keys(cartDiscountsMap).length > 0) {
      setCart(prevCart =>
        prevCart.map(item => {
          const discountRule = cartDiscountsMap[item.item_code];
          if (discountRule && (!item.discount_rule || item.discount_rule.name !== discountRule.name)) {
            // Update discount info for this item
            const discountAmount = calculateDiscountAmount(item.rate, discountRule) * item.qty;
            const discountedSubtotal = calculateDiscountedPrice(item.rate, discountRule) * item.qty;
            return {
              ...item,
              discount_rule: discountRule,
              discount_amount: discountAmount,
              subtotal: discountedSubtotal,
            };
          }
          return item;
        })
      );
    }
  }, [cartDiscountsMap, isLoadingCartDiscounts, cart.length]);

  // Show POS opening dialog when no session is open
  useEffect(() => {
    if (userCompany && !isPOSSessionOpen) {
      // Always show dialog to enter POS opening details
      setPosProfileDialogOpen(true);
      // Reset form with default values - include one default payment method row
      resetPosOpeningForm({
        pos_profile: userPosProfile || '',
        company: userCompany || '',
        user: user?.email || user?.name || user?.user || '',
        balance_details: [{ mode_of_payment: 'Cash', opening_amount: 0 }],
      });
    }
  }, [userCompany, isPOSSessionOpen, userPosProfile, user, resetPosOpeningForm]);

  const handleOpenPOSSession = async (formData) => {
    if (!formData.pos_profile || !formData.pos_profile.trim()) {
      dispatch(showNotification({
        message: 'POS profile is required',
        severity: 'error',
        title: 'Validation Error',
      }));
      return;
    }

    const openingData = {
      pos_profile: formData.pos_profile.trim(),
      ...(formData.company && { company: formData.company }),
      ...(formData.user && { user: formData.user }),
      ...(formData.balance_details && formData.balance_details.length > 0 && {
        balance_details: formData.balance_details.map(balance => ({
          mode_of_payment: balance.mode_of_payment,
          opening_amount: parseFloat(balance.opening_amount) || 0,
        })),
      }),
    };

    const result = await dispatch(createPOSOpeningEntry(openingData));

    if (createPOSOpeningEntry.fulfilled.match(result)) {
      setPosProfile(formData.pos_profile.trim());
      setPosProfileDialogOpen(false);
      resetPosOpeningForm();
    } else if (createPOSOpeningEntry.rejected.match(result)) {
      // Navigate to dashboard on error
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000); // Give user time to see the error message
    }
    // Error handling is done in the Redux slice via showNotification
    // The extractErrorMessage function now properly parses _server_messages
  };

  const handleAddBalanceDetail = () => {
    appendBalance({ mode_of_payment: 'Cash', opening_amount: 0 });
  };

  const handleViewSessionDetails = () => {
    if (posOpeningEntry?.name) {
      navigate(`/sales/pos-opening-entries/${posOpeningEntry.name}`);
    } else {
      setSessionDialogOpen(true);
    }
  };

  const handleCloseSession = () => {
    setCloseSessionDialogOpen(true);
  };

  const handleCloseSessionConfirm = async () => {
    if (!posOpeningEntry?.name) return;

    const result = await dispatch(closePOSOpeningEntry({
      pos_opening_entry: posOpeningEntry.name,
      do_not_submit: false,
    }));

    if (closePOSOpeningEntry.fulfilled.match(result)) {
      setCloseSessionDialogOpen(false);
      dispatch(showNotification({
        message: 'POS session closed successfully',
        severity: 'success',
        title: 'Session Closed',
      }));
      // Stay on the POS screen - isPOSSessionOpen is now correctly false,
      // so the "No Active POS Session" reopen banner takes over.
    }
  };

  // Get unique categories from products
  const categories = React.useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.item_group).filter(Boolean))];
    return cats.map(cat => ({ id: cat, name: cat === 'all' ? 'All Products' : cat }));
  }, [products]);

  // Filter products with memoization
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        (product.item_name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (product.item_code || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                             (product.item_group || '').toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchTerm, selectedCategory]);

  // Fetch discounts for paginated products (for product table display)
  const productDiscountItems = useMemo(() => 
    filteredProducts
      .slice(productsPage * productsRowsPerPage, productsPage * productsRowsPerPage + productsRowsPerPage)
      .map(product => ({
        item_code: product.item_code,
        item_group: product.item_group,
      })),
    [filteredProducts, productsPage, productsRowsPerPage]
  );
  
  // Fetch discounts for products in grid
  const { discountsMap: productDiscountsMap, loading: isLoadingProductDiscounts } = useInventoryDiscounts({
    company: userCompany,
    warehouse: defaultWarehouse,
    items: productDiscountItems,
    autoFetch: filteredProducts.length > 0 && !!userCompany && !!defaultWarehouse,
  });
  
  // Combined discounts map (cart takes priority)
  const discountsMap = useMemo(() => ({
    ...productDiscountsMap,
    ...cartDiscountsMap, // Cart discounts override product discounts
  }), [productDiscountsMap, cartDiscountsMap]);
  
  const isLoadingDiscounts = isLoadingCartDiscounts || isLoadingProductDiscounts;

  // Check stock availability
  const checkStock = useCallback(async (itemCode, warehouse) => {
    if (!itemCode || !warehouse || !userCompany) return null;
    
    setStockChecking(prev => ({ ...prev, [itemCode]: true }));
    try {
      const result = await dispatch(getStockQuantity({ 
        item_code: itemCode, 
        company: userCompany,
        warehouse,
      }));
      setStockChecking(prev => ({ ...prev, [itemCode]: false }));
      return result.payload?.qty || 0;
    } catch (error) {
      setStockChecking(prev => ({ ...prev, [itemCode]: false }));
      return null;
    }
  }, [dispatch, userCompany]);

  // Add to cart with stock validation
  const addToCart = async (product) => {
    const itemCode = product.item_code;
    
    if (!defaultWarehouse) {
      dispatch(showNotification({
        message: 'Please select a warehouse first',
        severity: 'warning',
        title: 'Warehouse Required',
      }));
      return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.item_code === itemCode);
    
    if (existingItem) {
      // Increment quantity
      updateQuantity(itemCode, 1);
    } else {
      // Add new item to cart with default warehouse
      // Use customer-specific price if available, otherwise use standard rate
      let rate = product.standard_rate || product.price || 0;
      
      // If customer has a different price list and we have customer-specific price, use it
      if (customerId && 
          customerPriceList !== 'Standard Selling' && 
          customerProductPrices[itemCode] !== undefined) {
        rate = customerProductPrices[itemCode];
      }
      
      // Get discount for this item
      const discountRule = discountsMap[itemCode];
      const discountAmount = discountRule ? calculateDiscountAmount(rate, discountRule) : 0;
      const discountedPrice = discountRule ? calculateDiscountedPrice(rate, discountRule) : rate;
      
      setCart(prevCart => {
        const newCart = [...prevCart, {
          item_code: itemCode,
          item_name: product.item_name || product.name || '',
          qty: 1,
          rate: rate,
          uom: product.stock_uom || 'Nos',
          warehouse: defaultWarehouse, // Use default warehouse
          description: product.description || '',
          subtotal: discountedPrice,
          discount_amount: discountAmount,
          discount_rule: discountRule,
        }];
        // Announce to screen readers
        if (cartAnnouncementRef.current) {
          cartAnnouncementRef.current.textContent = `${product.item_name || product.name} added to cart. Cart now has ${newCart.length} items.`;
        }
        return newCart;
      });
      setSnackbarMessage(`${product.item_name || product.name} added to cart`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  };

  // Update quantity
  const updateQuantity = (itemCode, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.item_code === itemCode) {
          const newQuantity = Math.max(0, item.qty + delta);
          const discountRule = discountsMap[itemCode];
          const baseSubtotal = newQuantity * item.rate;
          const discountAmount = discountRule ? calculateDiscountAmount(item.rate, discountRule) * newQuantity : 0;
          const discountedSubtotal = discountRule ? calculateDiscountedPrice(item.rate, discountRule) * newQuantity : baseSubtotal;
          return { 
            ...item, 
            qty: newQuantity, 
            subtotal: discountedSubtotal,
            discount_amount: discountAmount,
            discount_rule: discountRule,
          };
        }
        return item;
      }).filter(item => item.qty > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (itemCode) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.item_code !== itemCode);
      // Announce to screen readers
      if (cartAnnouncementRef.current) {
        cartAnnouncementRef.current.textContent = `Item removed from cart. Cart now has ${newCart.length} items.`;
      }
      return newCart;
    });
    setSnackbarMessage('Item removed from cart');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  // Calculate totals
  const calculateItemsTotal = () => {
    return cart.reduce((sum, item) => sum + (item.rate * item.qty), 0);
  };

  const calculateDiscount = () => {
    return cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
  };

  const calculateManualDiscountAmount = () => {
    const base = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    if (manualDiscountType === 'percentage') {
      return (base * (manualDiscountValue || 0)) / 100;
    }
    return Math.min(manualDiscountValue || 0, base);
  };

  const calculateSubtotal = () => {
    // Use discounted subtotals from cart items
    const subtotal = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    // Subtract loyalty discount and any manually-applied whole-sale discount
    return Math.max(0, subtotal - loyaltyDiscountAmount - calculateManualDiscountAmount());
  };

  // Calculate change/balance
  const calculateChange = () => {
    if (!amountGiven || amountGiven <= 0) return 0;
    const total = calculateSubtotal();
    return Math.max(0, amountGiven - total);
  };

  // Calculate balance (amount still owed)
  const calculateBalance = () => {
    if (!amountGiven || amountGiven <= 0) return calculateSubtotal();
    const total = calculateSubtotal();
    return Math.max(0, total - amountGiven);
  };

  // Handle checkout button click - Enter checkout mode
  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setIsCheckoutMode(true);
    // Auto-focus amount given field for cash payments
    if (paymentMode === 'Cash') {
      setTimeout(() => {
        const amountInput = document.getElementById('amount-given-input');
        if (amountInput) amountInput.focus();
      }, 100);
    }
  };

  // Handle complete sale - Create POS Invoice
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setSnackbarMessage('Cart is empty');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!customer) {
      setSnackbarMessage('Please select a customer');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!userCompany) {
      setSnackbarMessage('Company information is required. Please contact your administrator.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      dispatch(showNotification({
        message: 'Company information not found. Please ensure you are logged in with a valid company.',
        severity: 'error',
        title: 'Company Required',
      }));
      return;
    }

    const itemsTotal = calculateItemsTotal();
    const discountAmount = 0;
    const grandTotal = calculateSubtotal(); // Already includes loyalty discount

    // Helper function to earn loyalty points after successful sale
    const earnLoyaltyPointsForSale = async (customerId, purchaseAmount) => {
      // Only earn points if customer is not "Walk-in Customer" and has a valid ID
      if (!customerId || 
          customerId.toLowerCase() === 'walk-in customer' ||
          customerId.toLowerCase() === 'walk-in') {
        return;
      }

      try {
        const pointsResult = await dispatch(earnLoyaltyPoints({
          customer_id: customerId,
          purchase_amount: purchaseAmount,
        }));

        if (pointsResult.type === 'loyalty/earnLoyaltyPoints/fulfilled') {
          const pointsEarned = pointsResult.payload?.pointsEarned || 0;
          if (pointsEarned > 0) {
            // Points earned notification is already shown by the Redux slice
            // We can add additional message to the success notification
            console.log(`Customer earned ${pointsEarned} loyalty points`);
          }
        }
      } catch (error) {
        // Silently fail - don't block checkout if points earning fails
        console.error('Failed to earn loyalty points:', error);
      }
    };

    // Build payments
    const paymentLines = splitPayments
      ? payments
      : [{ mode: paymentMode, amount: paymentMode === 'Credit' ? creditAmount : grandTotal }];

    const totalPaid = paymentLines.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
      setSnackbarMessage('Payment amounts must equal the grand total.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // Credit limit enforcement - using available_credit from customer list
    const creditUsed = paymentLines
      .filter((p) => p.mode === 'Credit')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    if (creditUsed > 0) {
      // Only allow credit for non-walk-in customers
      if (!customerId) {
        setSnackbarMessage('Credit sales are only available for registered customers. Please select a customer.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      if (!creditInfo) {
        setSnackbarMessage('Credit info unavailable. Customer may not have credit information loaded.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      // Use available_credit directly from customer object
      const availableCredit = creditInfo.available_credit || 0;

      if (availableCredit < creditUsed - 0.01) {
        setSnackbarMessage(
          `Credit limit exceeded. Available credit: KES ${availableCredit.toLocaleString()}`
        );
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      // Also check if customer is already over limit
      if (creditInfo.is_over_limit) {
        setSnackbarMessage(
          'Customer is already over credit limit. Cannot process additional credit transactions.'
        );
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
    }

    // Build payment payload with proper structure
    const paymentsPayload = paymentLines.map((p) => {
      const basePayload = {
        mode_of_payment: p.mode, // Use actual mode - don't convert Credit to Cash!
        amount: Number(p.amount) || 0,
        base_amount: Number(p.amount) || 0, // Add base_amount field
      };
      
      // Handle credit payments - use receivable account flag
      if (p.mode === 'Credit') {
        basePayload.use_receivable_account = true;
        // Optionally include account if we have it, but use_receivable_account flag is preferred
        if (receivableAccount) {
          basePayload.account = receivableAccount;
        }
      }
      
      return basePayload;
    });

    // Prepare invoice data
    // Note: customer.name is the Customer ID (unique identifier, e.g., "CUST-00001")
    // Use customer ID for API (customerId) or "Walk-in Customer" string for walk-in
    const invoiceCustomer = customerId || customer; // Use customer ID (from customer.name) if available, otherwise "Walk-in Customer"
    
    const invoiceData = {
      customer: invoiceCustomer, // Customer ID (from customer.name field) for non-walk-in, or "Walk-in Customer" string
      company: userCompany, // Required: Company must be included in the payload
      warehouse: defaultWarehouse, // Default warehouse for all items
      update_stock: updateStock, // Update inventory flag
      items: cart.map(item => {
        const itemData = {
        item_code: item.item_code,
        qty: item.qty,
        rate: item.rate,
        uom: item.uom,
        warehouse: item.warehouse || defaultWarehouse, // Per-item warehouse (optional override)
        };
        
        // Include discount fields if discount exists, otherwise omit to let backend auto-apply
        if (item.discount_rule) {
          if (item.discount_rule.discount_type === 'Percentage') {
            itemData.discount_percentage = item.discount_rule.discount_value;
          } else {
            itemData.discount_amount = item.discount_amount || calculateDiscountAmount(item.rate, item.discount_rule) * item.qty;
          }
        }
        // If no discount rule, omit discount fields - backend will auto-apply inventory discount rules
        
        return itemData;
      }),
      posting_date: new Date().toISOString().split('T')[0],
      pos_profile: posProfile || undefined,
      payments: paymentsPayload,
      ...(calculateManualDiscountAmount() > 0 && {
        apply_discount_on: 'Grand Total',
        ...(manualDiscountType === 'percentage'
          ? { additional_discount_percentage: manualDiscountValue }
          : { discount_amount: manualDiscountValue }),
      }),
      do_not_submit: false, // Submit immediately for POS
      is_pos: 1, // Mark as POS transaction unless credit is used
      invoice_type: "POS Invoice",
      // is_pos: creditUsed > 0 ? 0 : 1,
      
      // Add loyalty redemption if points are being redeemed
      ...(loyaltyPointsToRedeem > 0 && customerId && {
        redeem_loyalty_points: true,
        loyalty_points: loyaltyPointsToRedeem,
      }),
    };

    try {
      // Try creating POS Invoice first
      let result = await dispatch(createPOSInvoice(invoiceData));
      
      // If POS Invoice creation fails with "Sales Invoice mode" error, create Sales Invoice instead
      if (result.type === 'sales/createPOSInvoice/rejected') {
        const errorMessage = result.payload || result.error?.message || '';
        
        // Check if error indicates Sales Invoice mode is required
        if (errorMessage.includes('Sales Invoice mode') || 
            errorMessage.includes('create Sales Invoice instead')) {
          
          // Create Sales Invoice with is_pos: 1 instead
          const salesInvoiceData = {
            ...invoiceData,
            is_pos: 1, // Mark as POS Sales Invoice
          };
          
          result = await dispatch(createSalesInvoice(salesInvoiceData));
          
          if (result.type === 'sales/createSalesInvoice/fulfilled') {
            const createdInvoice = result.payload.salesInvoice || result.payload.data;
            setCompletedInvoice(createdInvoice);
            // Store sale data for receipt before clearing cart
            setCompletedSaleData({
              items: cart,
              customer,
              paymentMode,
              payments: paymentsPayload,
              amountGiven,
              grandTotal,
              timestamp: new Date(),
            });
            setReceiptDialogOpen(true);
            
            // Earn loyalty points (non-blocking - doesn't fail checkout if it fails)
            const invoiceAmount = createdInvoice.grand_total || grandTotal;
            if (customerId && invoiceAmount > 0) {
              earnLoyaltyPointsForSale(customerId, invoiceAmount);
            }
            
            // Reset cart and checkout mode
            setCart([]);
            setIsCheckoutMode(false);
            setAmountGiven(0);
            setManualDiscountType('percentage');
            setManualDiscountValue(0);
            setSearchTerm('');
            
            setSnackbarMessage('Sales Invoice (POS) created successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            return;
          }
        } else {
          // Other error - show it
          setSnackbarMessage(errorMessage || 'Failed to create invoice');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }
      
      // POS Invoice created successfully
      if (result.type === 'sales/createPOSInvoice/fulfilled') {
        const createdInvoice = result.payload.posInvoice || result.payload.data;
        setCompletedInvoice(createdInvoice);
        // Store sale data for receipt before clearing cart
        setCompletedSaleData({
          items: cart,
          customer,
          paymentMode,
          payments: paymentsPayload,
          amountGiven,
          grandTotal,
          timestamp: new Date(),
        });
        setReceiptDialogOpen(true);
        
        // Earn loyalty points (non-blocking - doesn't fail checkout if it fails)
        const invoiceAmount = createdInvoice.grand_total || grandTotal;
        if (customerId && invoiceAmount > 0) {
          earnLoyaltyPointsForSale(customerId, invoiceAmount);
        }
        
        // Reset cart and checkout mode
        setCart([]);
        setIsCheckoutMode(false);
        setAmountGiven(0);
        setManualDiscountType('percentage');
        setManualDiscountValue(0);
        setSearchTerm('');
        
        setSnackbarMessage('POS Invoice created successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setSnackbarMessage('An error occurred while creating the invoice');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle barcode scanning
  const handleScanBarcode = () => {
    // This would integrate with actual barcode scanner
    setSnackbarMessage('Barcode scanner integration needed');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Handle receipt dialog close
  const handleReceiptClose = () => {
    setReceiptDialogOpen(false);
    setCompletedInvoice(null);
    setCompletedSaleData(null);
    dispatch(clearSelectedPOSInvoice());
  };

  // Print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Auto-print receipt when dialog opens
  useEffect(() => {
    if (receiptDialogOpen && completedInvoice) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receiptDialogOpen, completedInvoice]);

  // Navigate to invoice details
  const handleViewInvoice = () => {
    if (completedInvoice?.name) {
      // Check if it's a Sales Invoice (POS) or POS Invoice
      const isSalesInvoice = completedInvoice.name?.startsWith('SINV') || 
                            completedInvoice.is_pos === true ||
                            completedInvoice.is_pos === 1;
      
      if (isSalesInvoice) {
        navigate(`/sales/invoice/${completedInvoice.name}`);
      } else {
        navigate(`/sales/pos-invoice/${completedInvoice.name}`);
      }
      handleReceiptClose();
    }
  };

  // Payment modes - derived from API with fallback to hardcoded list
  const paymentModes = useMemo(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      // Extract payment method names from API response
      // Credit should now be included from the API if it was created/enabled in settings
      return paymentMethods.map(pm => pm.name);
    }
    // Fallback to hardcoded list if API hasn't loaded or failed
    return ['Cash', 'Card', 'Mobile Money', 'Bank Transfer'];
  }, [paymentMethods]);

  // Credit info helper - use selectedCustomerObj directly (more reliable than searching)
  // Note: customer.name is the Customer ID (unique identifier, e.g., "CUST-00001")
  const creditInfo = useMemo(() => {
    // Use selectedCustomerObj if available (most reliable)
    if (selectedCustomerObj) {
      return {
        credit_limit: selectedCustomerObj.credit_limit || 0,
        outstanding_amount: selectedCustomerObj.outstanding_amount || 0,
        available_credit: selectedCustomerObj.available_credit || 0,
        credit_utilization_percent: selectedCustomerObj.credit_utilization_percent || 0,
        is_over_limit: selectedCustomerObj.is_over_limit || false,
      };
    }
    
    // Fallback: search by customer ID (customer.name field) for backward compatibility
    if (!customerId || customerId.toLowerCase() === 'walk-in customer' || !customers || customers.length === 0) {
      return null;
    }
    
    // Search by customer ID (name field) - more reliable than display name
    const selectedCustomer = customers.find(
      (c) => c.name === customerId // customer.name is the Customer ID
    );
    
    if (!selectedCustomer) return null;
    
    return {
      credit_limit: selectedCustomer.credit_limit || 0,
      outstanding_amount: selectedCustomer.outstanding_amount || 0,
      available_credit: selectedCustomer.available_credit || 0,
      credit_utilization_percent: selectedCustomer.credit_utilization_percent || 0,
      is_over_limit: selectedCustomer.is_over_limit || false,
    };
  }, [selectedCustomerObj, customerId, customer, customers]);

  // Calculate total of split payments
  const splitPaymentsTotal = useMemo(() => {
    if (!splitPayments) return 0;
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [splitPayments, payments]);

  // Check if split payments are valid (sum equals grand total)
  const isSplitPaymentsValid = useMemo(() => {
    if (!splitPayments) return true;
    const grandTotal = calculateSubtotal();
    return Math.abs(splitPaymentsTotal - grandTotal) < 0.01;
  }, [splitPayments, splitPaymentsTotal, cart]); // cart is used by calculateSubtotal

  // Check if credit limit is valid for split payments
  const isSplitPaymentsCreditValid = useMemo(() => {
    if (!splitPayments) return true;
    
    const creditUsed = payments
      .filter((p) => p.mode === 'Credit')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    if (creditUsed === 0) return true; // No credit used
    
    if (!creditInfo) return false; // Credit used but no credit info available
    
    // Check if customer is over limit
    if (creditInfo.is_over_limit) return false;
    
    // Check if credit used exceeds available credit
    return creditInfo.available_credit >= creditUsed - 0.01;
  }, [splitPayments, payments, creditInfo]);

  const addPaymentRow = () => {
    setPayments((prev) => [...prev, { mode: 'Cash', amount: 0 }]);
  };

  const removePaymentRow = (index) => {
    setPayments((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updatePaymentField = (index, field, value) => {
    setPayments((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              [field]: field === 'amount' ? Math.max(0, Number(value) || 0) : value,
            }
          : p
      )
    );
  };

  // Keep single-payment amount in sync with total when split is disabled
  useEffect(() => {
    if (!splitPayments) {
      setPayments([{ mode: paymentMode, amount: calculateSubtotal() }]);
    }
  }, [splitPayments, paymentMode, cart, calculateSubtotal]);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    const searchLower = customerSearchTerm.toLowerCase();
    return customers.filter(customer => 
      (customer.customer_name || customer.name || '').toLowerCase().includes(searchLower) ||
      (customer.mobile_no || '').includes(searchLower) ||
      (customer.email_id || '').toLowerCase().includes(searchLower)
    );
  }, [customers, customerSearchTerm]);

  // Handle customer selection
  // Note: customer.name is the Customer ID (unique identifier, e.g., "CUST-00001")
  //       customer.customer_name is the display name (e.g., "John Doe")
  const handleSelectCustomer = (selectedCustomer) => {
    // Check if it's walk-in customer
    if (!selectedCustomer || 
        selectedCustomer.name === 'Walk-in Customer' || 
        selectedCustomer.customer_name === 'Walk-in Customer') {
      // Reset to walk-in customer
      setCustomer('Walk-in Customer');
      setCustomerId(null);
      setSelectedCustomerObj(null);
      setCustomerPriceList('Standard Selling');
      setCustomerProductPrices({});
    } else {
      // Store customer ID (for API) and display name (for UI)
      // Note: selectedCustomer.name is the Customer ID (unique identifier)
      const customerIdValue = selectedCustomer.name; // Customer ID: e.g., "CUST-00001"
      const customerName = selectedCustomer.customer_name || selectedCustomer.name || 'Walk-in Customer';
      const priceList = selectedCustomer.default_price_list || 'Standard Selling';
      
      setCustomer(customerName); // Display name for UI (e.g., "John Doe")
      setCustomerId(customerIdValue); // Customer ID for API calls (e.g., "CUST-00001")
      setSelectedCustomerObj(selectedCustomer); // Full object for metadata
      setCustomerPriceList(priceList); // Customer's default price list
    }
    setCustomerDialogOpen(false);
    setCustomerSearchTerm('');
    setShowAddCustomerForm(false);
  };

  // Handle customer creation
  const handleCreateCustomer = async (data) => {
    if (!userCompany) {
      dispatch(showNotification({
        message: 'Company information not found',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    const customerData = {
      customer_name: data.customer_name.trim(),
      customer_type: data.customer_type,
      ...(data.mobile_no && { mobile_no: data.mobile_no }),
      ...(data.email_id && { email_id: data.email_id }),
      ...(data.tax_id && { tax_id: data.tax_id }),
      company: userCompany,
    };

    const result = await dispatch(createCustomer(customerData));

    if (createCustomer.fulfilled.match(result)) {
      const newCustomer = result.payload.customer;
      // Refresh customer list
      dispatch(listCustomers({ 
        company: userCompany,
        limit: 100,
        disabled: false,
      }));
      // Select the newly created customer
      handleSelectCustomer(newCustomer);
      resetCustomerForm();
      setShowAddCustomerForm(false);
    }
  };

  // Handle open customer dialog
  const handleOpenCustomerDialog = () => {
    setCustomerDialogOpen(true);
    setShowAddCustomerForm(false);
    setCustomerSearchTerm('');
  };

  // Handle close customer dialog
  const handleCloseCustomerDialog = () => {
    setCustomerDialogOpen(false);
    setShowAddCustomerForm(false);
    setCustomerSearchTerm('');
    resetCustomerForm();
  };

  // Check if any required APIs are still loading
  const isAnyAPILoading = isLoadingProducts || isLoadingItemGroups || isLoadingWarehouses || isLoadingPaymentMethods;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if typing in input or textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        // Allow Ctrl/Cmd shortcuts even in inputs
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      // ESC to navigate to dashboard
      if (event.key === 'Escape') {
        navigate('/dashboard');
      }
      
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Ctrl/Cmd + Enter to complete sale
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (cart.length > 0 && isPOSSessionOpen && !isCreatingInvoice) {
          event.preventDefault();
          handleCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, cart.length, isPOSSessionOpen, isCreatingInvoice]);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100vh',
      backgroundColor: theme.palette.background.default,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Enhanced Header with AppBar - Full Screen */}
      <AppBar position="static" color="default" elevation={0} sx={{ borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ px: 3, py: 1, minHeight: '56px !important' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Tooltip title="Return to Dashboard (Press ESC)">
                  <IconButton
                    onClick={() => navigate('/dashboard')}
                    color="primary"
                    size="small"
                    sx={{ p: 1 }}
                    aria-label="Return to Dashboard, press Escape key"
                  >
                    <DashboardIcon />
                  </IconButton>
                </Tooltip>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h5" fontWeight="bold" color="primary" sx={{ lineHeight: 1.2 }}>
                      POS
                    </Typography>
                    {isPOSSessionOpen && (
                      <Chip 
                        label="✓ Session Open" 
                        color="success" 
                        size="small"
                        sx={{ 
                          height: 24, 
                          fontSize: '0.75rem', 
                          fontWeight: 'medium',
                          cursor: 'pointer',
                          '&:focus-visible': {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: '2px',
                          },
                        }}
                        onClick={handleViewSessionDetails}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleViewSessionDetails();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="View session details, click to view"
                        title="Click to view session details"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2, mt: 0.25 }}>
                    {new Date().toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', ml: 'auto' }}>
                {/* Close Session - Only show when session is open and not in checkout mode */}
                {isPOSSessionOpen && !isCheckoutMode && (
                  <Tooltip title="Close POS Session">
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon fontSize="small" />}
                      onClick={handleCloseSession}
                      disabled={isClosingPOSOpening}
                      size="medium"
                      sx={{ borderRadius: 1.5, px: 2, textTransform: 'none' }}
                      aria-label="Close POS Session"
                    >
                      {isClosingPOSOpening ? (
                        <>
                          <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" />
                          Closing...
                        </>
                      ) : (
                        'Close Session'
                      )}
                    </Button>
                  </Tooltip>
                )}
                
                {/* Save Draft - Show when cart has items and not in checkout mode */}
                {!isCheckoutMode && cart.length > 0 && (
                  <Tooltip title="Save as Draft">
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon fontSize="small" />}
                      disabled={cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen}
                      size="medium"
                      sx={{ borderRadius: 1.5, px: 2, textTransform: 'none' }}
                      aria-label="Save current sale as draft"
                    >
                      Save Draft
                    </Button>
                  </Tooltip>
                )}
                
                {/* Complete Sale / Checkout - Dynamic based on checkout mode */}
                {!isCheckoutMode ? (
                  <Tooltip title="Proceed to checkout">
                    <MotionButton
                      variant="contained"
                      color="primary"
                      startIcon={<ShoppingCartIcon fontSize="small" />}
                      onClick={handleCheckoutClick}
                      disabled={cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen}
                      size="medium"
                      whileHover={{ scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 1.02 }}
                      whileTap={{ scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 0.98 }}
                      sx={{ borderRadius: 1.5, px: 2, textTransform: 'none', fontWeight: 'bold' }}
                      aria-label={`Proceed to checkout. ${cart.length} items in cart. Total: KES ${calculateSubtotal().toFixed(2)}`}
                    >
                      {cart.length === 0 ? 'Add Items' : 'Checkout →'}
                    </MotionButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Complete sale and process payment">
                    <MotionButton
                      variant="contained"
                      color="primary"
                      startIcon={<ShoppingCartIcon fontSize="small" />}
                      onClick={handleCheckout}
                      disabled={
                        cart.length === 0 || 
                        isCreatingInvoice || 
                        !isPOSSessionOpen ||
                        (splitPayments 
                          ? (!isSplitPaymentsValid || !isSplitPaymentsCreditValid)
                          : (
                            (paymentMode === 'Credit' && (!creditAmount || creditAmount <= 0 || creditAmount > calculateSubtotal())) ||
                            (paymentMode === 'Cash' && (!amountGiven || amountGiven < calculateSubtotal()))
                          )
                        )
                      }
                      size="medium"
                      whileHover={{ 
                        scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 1.02 
                      }}
                      whileTap={{ 
                        scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 0.98 
                      }}
                      sx={{ borderRadius: 1.5, px: 2, textTransform: 'none', fontWeight: 'bold' }}
                      aria-label={`Complete sale. ${cart.length} items in cart. Total: KES ${calculateSubtotal().toFixed(2)}`}
                    >
                      {isCreatingInvoice ? (
                        <>
                          <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" aria-label="Processing" />
                          Processing...
                        </>
                      ) : (
                        'Complete Sale'
                      )}
                    </MotionButton>
                  </Tooltip>
                )}
              </Box>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>

      {/* Screen reader announcement region */}
      <Box
        ref={cartAnnouncementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />

      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden', 
        p: 2, 
        gap: 2,
        flexDirection: isMobile ? 'column' : 'row',
        opacity: isPOSSessionOpen ? 1 : 0.6,
        pointerEvents: isPOSSessionOpen ? 'auto' : 'none',
        height: 'calc(100vh - 80px)',
        position: 'relative',
      }}>
        {!isPOSSessionOpen && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
            }}
          >
            <Paper
              elevation={4}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                maxWidth: 360,
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No Active POS Session
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Open a session to start taking sales.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setPosProfileDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Open POS Session
              </Button>
            </Paper>
          </Box>
        )}
        {/* Right Column - Customer & Order Summary */}
        <Box sx={{ 
          flex: isMobile ? '1 1 100%' : '1 1 40%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <Paper sx={{ 
            p: 2, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}>
            {/* Scrollable Content Area */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              minHeight: 0,
            }}>
            {/* Customer Selection */}
            <Box sx={{ flexShrink: 0, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Customer
              </Typography>
              <TextField
                fullWidth
                placeholder="Walk-in Customer"
                variant="outlined"
                size="small"
                value={customer}
                readOnly={!!customerId} // Read-only when real customer is selected (must use dialog)
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Only allow manual changes if it's walk-in customer
                  if (!customerId || 
                      newValue.toLowerCase() === 'walk-in customer' || 
                      newValue.toLowerCase() === 'walk-in' ||
                      !newValue) {
                    setCustomer(newValue);
                    // Reset customer-specific data if changed to walk-in
                    if (!newValue || 
                        newValue.toLowerCase() === 'walk-in customer' || 
                        newValue.toLowerCase() === 'walk-in') {
                      setCustomerId(null);
                      setSelectedCustomerObj(null);
                      setCustomerPriceList('Standard Selling');
                      setCustomerProductPrices({});
                    }
                  }
                }}
                label="Customer"
                aria-label="Customer name or identifier. Click the person icon to select a customer."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} aria-hidden="true" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Select or Add Customer">
                        <IconButton
                          size="small"
                          onClick={handleOpenCustomerDialog}
                          aria-label="Select or add customer"
                          sx={{
                            '&:focus-visible': {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: '2px',
                            },
                          }}
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5
                  },
                  '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                }}
              />
            </Box>

            {/* Order Summary Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              flexShrink: 0,
            }}>
              <Typography variant="h6" fontWeight={600}>
                {isCheckoutMode ? 'Sale Summary' : 'Order Summary'}
              </Typography>
              {cart.length > 0 && (
                <Chip 
                  label={`${cart.length} item${cart.length !== 1 ? 's' : ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            
            {/* Cart Items Table - Show only in checkout mode or if cart has items */}
            <Box sx={{ mb: 3, flexGrow: 1, overflow: 'auto' }}>
              {cart.length === 0 && !isCheckoutMode ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '200px',
                    color: 'text.secondary'
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <ShoppingCartIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} aria-hidden="true" />
                  <Typography variant="h6">No items in cart</Typography>
                  <Typography variant="body2">Add products from the list</Typography>
                </Box>
              ) : cart.length > 0 ? (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table 
                    size="small" 
                    stickyHeader
                    aria-label="Shopping cart items"
                  >
                    <caption style={{ captionSide: 'top', textAlign: 'left', padding: '8px', fontSize: '0.875rem' }}>
                      Cart contains {cart.length} item{cart.length !== 1 ? 's' : ''}. Total: KES {calculateSubtotal().toFixed(2)}
                    </caption>
                    <TableHead>
                      <TableRow>
                        <TableCell scope="col" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                        <TableCell scope="col" sx={{ fontWeight: 'bold' }}>Product</TableCell>
                        <TableCell scope="col" sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                        <TableCell scope="col" align="right" sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                        <TableCell scope="col" align="center" sx={{ fontWeight: 'bold' }}>Discount</TableCell>
                        <TableCell scope="col" align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                        <TableCell scope="col" padding="none" width={40}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cart.map((item) => (
                        <Fade in key={item.item_code} timeout={300}>
                          <TableRow hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Decrease Quantity">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => updateQuantity(item.item_code, -1)}
                                    aria-label={`Decrease quantity of ${item.item_name || item.item_code}`}
                                    sx={{
                                      '&:focus-visible': {
                                        outline: `2px solid ${theme.palette.primary.main}`,
                                        outlineOffset: '2px',
                                      },
                                    }}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Typography 
                                  variant="body1" 
                                  sx={{ minWidth: 30, textAlign: 'center' }}
                                  aria-label={`Quantity: ${item.qty}`}
                                >
                                  {item.qty}
                                </Typography>
                                <Tooltip title="Increase Quantity">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => updateQuantity(item.item_code, 1)}
                                    aria-label={`Increase quantity of ${item.item_name || item.item_code}`}
                                    sx={{
                                      '&:focus-visible': {
                                        outline: `2px solid ${theme.palette.primary.main}`,
                                        outlineOffset: '2px',
                                      },
                                    }}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                {item.item_name || item.item_code}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <Select
                                  value={item.warehouse || defaultWarehouse}
                                  onChange={(e) => {
                                    const newWarehouse = e.target.value;
                                    setCart(prevCart =>
                                      prevCart.map(cartItem => {
                                        if (cartItem.item_code === item.item_code) {
                                          // Clear discount when warehouse changes - will be refetched
                                          return { 
                                            ...cartItem, 
                                            warehouse: newWarehouse,
                                            discount_rule: undefined,
                                            discount_amount: 0,
                                            subtotal: cartItem.rate * cartItem.qty,
                                          };
                                        }
                                        return cartItem;
                                      })
                                    );
                                  }}
                                  aria-label={`Select warehouse for ${item.item_name || item.item_code}`}
                                  sx={{
                                    fontSize: '0.8125rem',
                                    '&:focus-visible': {
                                      outline: `2px solid ${theme.palette.primary.main}`,
                                      outlineOffset: '2px',
                                    },
                                  }}
                                >
                                  {warehouses.map((wh) => (
                                    <MenuItem key={wh.name} value={wh.name} sx={{ fontSize: '0.8125rem' }}>
                                      {wh.warehouse_name || wh.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                KES {item.rate.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {isLoadingDiscounts ? (
                                <CircularProgress size={16} />
                              ) : item.discount_rule ? (
                                <DiscountBadge discountRule={item.discount_rule} size="small" />
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Box>
                                {item.discount_amount > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textDecoration: 'line-through' }}>
                                    KES {(item.rate * item.qty).toFixed(2)}
                                  </Typography>
                                )}
                                <Typography variant="body2" fontWeight="medium" color={item.discount_amount > 0 ? 'success.main' : 'inherit'}>
                                KES {item.subtotal.toFixed(2)}
                              </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Remove Item">
                                <IconButton 
                                  size="small" 
                                  onClick={() => removeFromCart(item.item_code)}
                                  color="error"
                                  aria-label={`Remove ${item.item_name || item.item_code} from cart`}
                                  sx={{
                                    '&:focus-visible': {
                                      outline: `2px solid ${theme.palette.error.main}`,
                                      outlineOffset: '2px',
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        </Fade>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
            </Box>

            {/* Order Calculation Section - Show in checkout mode */}
            {isCheckoutMode && (
              <Card variant="outlined" sx={{ mb: 2, borderRadius: 2, flexShrink: 0 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    {/* Subtotal */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        KES {calculateItemsTotal().toFixed(2)}
                      </Typography>
                    </Box>

                    {/* Discount */}
                    {calculateDiscount() > 0 && (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" color="success.main">
                          Discount
                        </Typography>
                        <Typography variant="body2" fontWeight={500} color="success.main">
                          -KES {calculateDiscount().toFixed(2)}
                        </Typography>
                      </Box>
                    )}

                    {/* Manual whole-sale discount */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Apply Discount (optional)
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <FormControl size="small" sx={{ width: 90 }}>
                          <Select
                            value={manualDiscountType}
                            onChange={(e) => {
                              setManualDiscountType(e.target.value);
                              setManualDiscountValue(0);
                            }}
                          >
                            <MenuItem value="percentage">%</MenuItem>
                            <MenuItem value="amount">KES</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          type="number"
                          fullWidth
                          value={manualDiscountValue || ''}
                          placeholder="0"
                          onChange={(e) => setManualDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LocalOfferIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Stack>
                      {calculateManualDiscountAmount() > 0 && (
                        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                          -KES {calculateManualDiscountAmount().toFixed(2)} applied
                        </Typography>
                      )}
                    </Box>

                    {/* Taxes */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Taxes
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        KES 0.00
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 0.5 }} />
                    
                    {/* Grand Total */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="h6" fontWeight={600}>
                        Grand Total
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight={600}>
                        KES {calculateSubtotal().toFixed(2)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Loyalty Redemption - Show only in checkout mode for registered customers */}
            {isCheckoutMode && customerId && (
              <LoyaltyRedemption
                customerId={customerId}
                invoiceTotal={calculateSubtotal() + loyaltyDiscountAmount} // Pass subtotal before discount
                onRedemptionChange={(points, discountAmount) => {
                  setLoyaltyPointsToRedeem(points);
                  setLoyaltyDiscountAmount(discountAmount);
                }}
                disabled={isCreatingInvoice}
                company={userCompany}
              />
            )}

            {/* Payment Method - Show only in checkout mode */}
            {isCheckoutMode && (
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={splitPayments}
                      onChange={(e) => setSplitPayments(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Enable split payment</Typography>}
                  sx={{ m: 0 }}
                />

                {!splitPayments && (
                  <Stack spacing={1.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="payment-method-label">Payment Method</InputLabel>
                      <Select
                        labelId="payment-method-label"
                        id="payment-method-select"
                        value={paymentMode}
                        label="Payment Method"
                        onChange={(e) => {
                          setPaymentMode(e.target.value);
                          // Reset credit amount when changing payment method
                          if (e.target.value !== 'Credit') {
                            setCreditAmount(0);
                          } else {
                            // Set credit amount to grand total when selecting Credit
                            setCreditAmount(calculateSubtotal());
                          }
                        }}
                        aria-label="Select payment method"
                        sx={{ fontSize: '0.8125rem' }}
                      >
                        {paymentModes.map(mode => (
                          <MenuItem key={mode} value={mode} sx={{ fontSize: '0.8125rem' }}>
                            {mode}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Credit Amount Input - Only show for Credit payment method */}
                    {paymentMode === 'Credit' && (
                      <TextField
                        fullWidth
                        label="Credit Amount *"
                        type="number"
                        size="small"
                        value={creditAmount}
                        onChange={(e) => {
                          const amount = Math.max(0, parseFloat(e.target.value) || 0);
                          setCreditAmount(amount);
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                        inputProps={{ step: '0.01', min: 0, max: calculateSubtotal() }}
                        helperText={<Typography variant="caption">Maximum: KES {calculateSubtotal().toFixed(2)}</Typography>}
                        aria-label="Enter credit amount for credit sales"
                        required
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                      />
                    )}
                  </Stack>
                )}

                {splitPayments && (
                  <Stack spacing={1.5}>
                    {payments.map((p, idx) => (
                      <Grid container spacing={1.5} key={`payment-${idx}`} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`payment-mode-${idx}`}>Method</InputLabel>
                            <Select
                              labelId={`payment-mode-${idx}`}
                              value={p.mode}
                              label="Method"
                              onChange={(e) => updatePaymentField(idx, 'mode', e.target.value)}
                              sx={{ fontSize: '0.8125rem' }}
                            >
                              {paymentModes.map((mode) => (
                                <MenuItem key={mode} value={mode}>
                                  {mode}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Amount"
                            size="small"
                            value={p.amount}
                            onChange={(e) => updatePaymentField(idx, 'amount', e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </InputAdornment>
                              ),
                            }}
                            inputProps={{ step: '0.01', min: 0 }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {payments.length > 1 && (
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => removePaymentRow(idx)}
                              aria-label="Remove payment method"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addPaymentRow}
                      sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                    >
                      Add Payment Method
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Split payments must sum to the grand total. Credit portion will be validated against the customer's credit limit.
                    </Typography>
                  </Stack>
                )}

                {/* Amount Given and Change/Balance - Show only in checkout mode for Cash payments */}
                {paymentMode === 'Cash' && !splitPayments && (
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      id="amount-given-input"
                      label="Amount Given"
                      type="number"
                      size="small"
                      value={amountGiven || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setAmountGiven(Math.max(0, value));
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{ step: '0.01', min: 0 }}
                      helperText={<Typography variant="caption">Total: KES {calculateSubtotal().toFixed(2)}</Typography>}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                      {amountGiven > 0 && (
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: 1, 
                          bgcolor: calculateChange() > 0 ? 'success.light' : 'error.light',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          {calculateChange() > 0 ? (
                            <>
                              <Typography variant="body2" fontWeight="bold" color="success.dark">
                                Change:
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="success.dark">
                                KES {calculateChange().toFixed(2)}
                              </Typography>
                            </>
                          ) : calculateBalance() > 0 ? (
                            <>
                              <Typography variant="body2" fontWeight="bold" color="error.dark">
                                Balance:
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="error.dark">
                                KES {calculateBalance().toFixed(2)}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" fontWeight="bold" color="success.dark">
                                Exact Amount
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="success.dark">
                                KES 0.00
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}
                    </Stack>
                  )}
                </Stack>
            )}
            </Box>

            {/* Payment Button - Conditional based on checkout mode and payment method */}
            <Box sx={{ mt: 'auto', flexShrink: 0, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {!isCheckoutMode ? (
                // Initial Checkout Button
                <MotionButton
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={handleCheckoutClick}
                  disabled={cart.length === 0 || !isPOSSessionOpen}
                  whileHover={{ scale: cart.length === 0 || !isPOSSessionOpen ? 1 : 1.02 }}
                  whileTap={{ scale: cart.length === 0 || !isPOSSessionOpen ? 1 : 0.98 }}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                  aria-label={`Checkout. ${cart.length} items in cart. Total: KES ${calculateSubtotal().toFixed(2)}`}
                >
                  Checkout →
                </MotionButton>
              ) : (
                // Complete Sale Button (in checkout mode)
                <Stack spacing={1.5}>
                  {(paymentMode === 'Card' || paymentMode === 'Mobile Money') ? (
                    // Validate Payment button for Card and Mobile Money
                    <MotionButton
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen}
                      whileHover={{ scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 1.02 }}
                      whileTap={{ scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 0.98 }}
                      sx={{ 
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: 2,
                        textTransform: 'none',
                      }}
                      aria-label={`Complete sale. ${cart.length} items in cart. Total: KES ${calculateSubtotal().toFixed(2)}`}
                    >
                      {isCreatingInvoice ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" aria-label="Processing" />
                          Processing...
                        </>
                      ) : (
                        'Complete Sale →'
                      )}
                    </MotionButton>
                  ) : (
                    // Complete Sale button for Cash, Bank Transfer, and Credit
                    <MotionButton
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      onClick={handleCheckout}
                      disabled={
                        cart.length === 0 || 
                        isCreatingInvoice || 
                        !isPOSSessionOpen ||
                        (splitPayments 
                          ? (!isSplitPaymentsValid || !isSplitPaymentsCreditValid)
                          : (
                            (paymentMode === 'Credit' && (!creditAmount || creditAmount <= 0 || creditAmount > calculateSubtotal())) ||
                            (paymentMode === 'Cash' && (!amountGiven || amountGiven < calculateSubtotal()))
                          )
                        )
                      }
                      whileHover={{ 
                        scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 1.02 
                      }}
                      whileTap={{ 
                        scale: cart.length === 0 || isCreatingInvoice || !isPOSSessionOpen ? 1 : 0.98 
                      }}
                      sx={{ 
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: 2,
                        textTransform: 'none',
                      }}
                      aria-label={`Complete sale. ${cart.length} items in cart. Total: KES ${calculateSubtotal().toFixed(2)}`}
                    >
                      {isCreatingInvoice ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" aria-label="Processing" />
                          Processing...
                        </>
                      ) : (
                        'Complete Sale →'
                      )}
                    </MotionButton>
                  )}
                  {/* Back button to return to cart view */}
                  <Button
                    variant="outlined"
                    fullWidth
                    size="medium"
                    onClick={() => {
                      setIsCheckoutMode(false);
                      setAmountGiven(0);
                    }}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                    }}
                  >
                    ← Back to Cart
                  </Button>
                </Stack>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Left Column - Warehouse, Search & Product Selection */}
        <Box sx={{ 
          flex: isMobile ? '1 1 100%' : '1 1 60%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <Paper sx={{ 
            p: 2, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}>
            {/* Top Section - Fixed (Warehouse, Search, Categories) */}
            <Box sx={{ flexShrink: 0, mb: 2 }}>
              {/* Warehouse and Search in same row */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Warehouse *
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="warehouse-select-label-left">Warehouse</InputLabel>
                    <Select
                      labelId="warehouse-select-label-left"
                      id="warehouse-select-left"
                      value={defaultWarehouse}
                      disabled
                      displayEmpty
                      label="Warehouse"
                      aria-label="Warehouse (managed globally from app bar)"
                      sx={{
                        borderRadius: 1.5,
                        fontSize: '0.8125rem'
                      }}
                    >
                      <MenuItem value={defaultWarehouse}>
                        {activeWarehouse?.warehouse_name || activeWarehouse?.name || defaultWarehouse || 'Select warehouse from app bar'}
                      </MenuItem>
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Change warehouse from the app bar above
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Search Products
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Search products by name, SKU, or scan barcode"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    inputRef={searchInputRef}
                    aria-label="Search products by name, SKU, or scan barcode. Press Ctrl+K to focus."
                    aria-describedby="search-help-text"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} aria-hidden="true" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Scan Barcode">
                            <IconButton 
                              size="small" 
                              onClick={handleScanBarcode}
                              aria-label="Scan barcode"
                            >
                              <QrCodeScannerIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5
                      },
                      '& .MuiInputBase-input': { fontSize: '0.8125rem' }
                    }}
                  />
                  <Typography id="search-help-text" variant="caption" sx={{ display: 'none' }}>
                    Search products by name, SKU, or description. Press Ctrl+K or Cmd+K to focus search.
                  </Typography>
                </Grid>
              </Grid>

              {/* Category Filter */}
              <Box sx={{ mb: 2 }}>
                <Box 
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                  role="group"
                  aria-label="Product category filters"
                >
                  {categories.map(category => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      onClick={() => setSelectedCategory(category.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCategory(category.id);
                        }
                      }}
                      color={selectedCategory === category.id ? 'primary' : 'default'}
                      variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                      size="small"
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedCategory === category.id}
                      aria-label={`Filter by ${category.name}${selectedCategory === category.id ? ', currently selected' : ''}`}
                      sx={{ 
                        borderRadius: 1.5, 
                        fontSize: '0.75rem',
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: '2px',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Product List */}
            <Box sx={{ 
              flex: '1 1 auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 1,
                flexShrink: 0,
              }}>
                <Box>
                  <Typography variant="h6" fontWeight={600} id="products-heading">
                    Products {filteredProducts.length > 0 && `(${filteredProducts.length})`}
                  </Typography>
                  {customerId && 
                   customerPriceList !== 'Standard Selling' && (
                    <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      {isLoadingCustomerPrices ? (
                        <>
                          <CircularProgress size={10} />
                          Loading {customerPriceList} prices...
                        </>
                      ) : (
                        <>
                          Showing {customerPriceList} prices
                        </>
                      )}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ 
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
              }}>
              {isLoadingProducts ? (
                <Box 
                  sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, flex: 1 }}
                  role="status"
                  aria-live="polite"
                  aria-label="Loading products"
                >
                  <CircularProgress aria-label="Loading products" />
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minHeight: 200,
                    flex: 1,
                    color: 'text.secondary'
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <Typography variant="h6">No products found</Typography>
                  <Typography variant="body2">Try adjusting your search or category filter</Typography>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                    <Table stickyHeader size="small" aria-label="Products table">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Product Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>SKU</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">Stock</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }} align="right">Price</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="center">Discount</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts
                          .slice(productsPage * productsRowsPerPage, productsPage * productsRowsPerPage + productsRowsPerPage)
                          .map((product) => {
                            // Use customer-specific price if available, otherwise use standard rate
                            let price = product.standard_rate || product.price || 0;
                            if (customerId && 
                                customerPriceList !== 'Standard Selling' && 
                                customerProductPrices[product.item_code] !== undefined) {
                              price = customerProductPrices[product.item_code];
                            }
                            const stockUom = product.stock_uom || 'Nos';
                            const itemCode = product.item_code;
                            
                            // Get stock quantity for this product in selected warehouse
                            const stockQty = defaultWarehouse 
                              ? (productStocks[itemCode]?.[defaultWarehouse] ?? null)
                              : null;
                            const stockQtyNum = stockQty !== null ? parseFloat(stockQty) : null;
                            
                            // Check if item is in cart and get cart quantity
                            const cartItem = cart.find(item => item.item_code === itemCode);
                            const cartQty = cartItem ? cartItem.qty : 0;
                            
                            // Highlight if stock is less than cart quantity or if stock is low
                            const isLowStock = stockQtyNum !== null && (stockQtyNum < cartQty || stockQtyNum < 1);
                            
                            return (
                              <TableRow 
                                key={itemCode || product.name}
                                hover
                                sx={{
                                  cursor: defaultWarehouse ? 'pointer' : 'not-allowed',
                                  opacity: defaultWarehouse ? 1 : 0.6,
                                  backgroundColor: isLowStock ? 'warning.light' : 'inherit',
                                  '&:hover': {
                                    backgroundColor: defaultWarehouse 
                                      ? (isLowStock ? 'warning.light' : 'action.hover')
                                      : 'inherit',
                                  },
                                }}
                                onClick={() => defaultWarehouse && addToCart(product)}
                                onKeyDown={(e) => {
                                  if (defaultWarehouse && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    addToCart(product);
                                  }
                                }}
                                role="button"
                                tabIndex={defaultWarehouse ? 0 : -1}
                                aria-label={`${product.item_name || product.name || 'Product'}, Price: KES ${price.toFixed(2)} per ${stockUom}${stockQtyNum !== null ? `, Stock: ${stockQtyNum.toFixed(2)} ${stockUom}` : ''}${isLowStock ? ', Low Stock Warning' : ''}${cartQty > 0 ? `, In Cart: ${cartQty}` : ''}. Press Enter or Space to add to cart.`}
                              >
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {product.item_name || product.name || 'N/A'}
                                    </Typography>
                                    {isLowStock && (
                                      <Chip
                                        label="Low Stock"
                                        size="small"
                                        color="error"
                                        sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {product.item_code || product.sku || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {defaultWarehouse && stockQtyNum !== null ? (
                                    <Typography 
                                      variant="body2" 
                                      color={isLowStock ? 'error.main' : 'text.secondary'}
                                      fontWeight={isLowStock ? 'bold' : 'normal'}
                                    >
                                      {stockQtyNum.toFixed(2)} {stockUom}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  <Box>
                                    {/* Show original price if customer-specific price is different from standard */}
                                    {customerId && 
                                     customerPriceList !== 'Standard Selling' && 
                                     customerProductPrices[itemCode] !== undefined &&
                                     (product.standard_rate || product.price || 0) !== price && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ textDecoration: 'line-through', display: 'block' }}
                                      >
                                        KES {(product.standard_rate || product.price || 0).toFixed(2)}
                                      </Typography>
                                    )}
                                    {discountsMap[itemCode] && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ textDecoration: 'line-through', display: 'block' }}
                                      >
                                        KES {price.toFixed(2)}
                                      </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                      <Typography 
                                        variant="body2" 
                                        color={discountsMap[itemCode] ? 'success.main' : 'primary'} 
                                        fontWeight="bold"
                                      >
                                        KES {discountsMap[itemCode] 
                                          ? calculateDiscountedPrice(price, discountsMap[itemCode]).toFixed(2)
                                          : price.toFixed(2)}
                                      </Typography>
                                      {isLoadingCustomerPrices && customerProductPrices[itemCode] === undefined && (
                                        <CircularProgress size={12} sx={{ ml: 0.5 }} />
                                      )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                      /{stockUom}
                                    </Typography>
                                    {customerId && 
                                     customerPriceList !== 'Standard Selling' && 
                                     customerProductPrices[itemCode] !== undefined && (
                                      <Chip
                                        label={customerPriceList}
                                        size="small"
                                        color="info"
                                        sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {isLoadingDiscounts ? (
                                    <CircularProgress size={16} />
                                  ) : discountsMap[itemCode] ? (
                                    <DiscountBadge discountRule={discountsMap[itemCode]} size="small" />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip title={!defaultWarehouse ? "Select warehouse first" : "Add to Cart"}>
                                    <span>
                                      <IconButton 
                                        size="small"
                                        color="primary"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (defaultWarehouse) addToCart(product); 
                                        }}
                                        disabled={!defaultWarehouse}
                                        sx={{ 
                                          '&:focus-visible': {
                                            outline: `2px solid ${theme.palette.primary.main}`,
                                            outlineOffset: '2px',
                                          },
                                        }}
                                        aria-label={!defaultWarehouse ? "Select warehouse first to add product" : `Add ${product.item_name || product.name} to cart`}
                                      >
                                        <AddIcon />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      Showing {productsPage * productsRowsPerPage + 1} to {Math.min((productsPage + 1) * productsRowsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                    </Typography>
                    <TablePagination
                      component="div"
                      count={filteredProducts.length}
                      page={productsPage}
                      onPageChange={(event, newPage) => setProductsPage(newPage)}
                      rowsPerPage={productsRowsPerPage}
                      onRowsPerPageChange={(event) => {
                        setProductsRowsPerPage(parseInt(event.target.value, 10));
                        setProductsPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      labelRowsPerPage="Rows:"
                    />
                  </Box>
                </>
              )}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* POS Opening Entry Dialog - Required before accessing POS */}
      <Dialog 
        open={posProfileDialogOpen} 
        onClose={() => setPosProfileDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="pos-dialog-title"
        aria-describedby="pos-dialog-description"
        aria-modal="true"
      >
        <DialogTitle id="pos-dialog-title" sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Open POS Session
              </Typography>
              <Typography id="pos-dialog-description" variant="body2" color="text.secondary">
                Enter opening balance amounts for payment methods
              </Typography>
            </Box>
            <IconButton
              onClick={() => setPosProfileDialogOpen(false)}
              size="small"
              aria-label="Close dialog"
              sx={{ mt: -0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handlePosOpeningSubmit(handleOpenPOSSession)}>
          <DialogContent sx={{ pt: 3 }}>
            {/* Hidden fields for company, pos_profile, and user - set programmatically */}
            <input
              type="hidden"
              {...posOpeningFormControl.register('pos_profile', {
                required: 'POS Profile is required',
              })}
            />
            <input
              type="hidden"
              {...posOpeningFormControl.register('company')}
            />
            <input
              type="hidden"
              {...posOpeningFormControl.register('user')}
            />

            {/* Balance Details Section */}
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Opening Balance Details
                </Typography>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddBalanceDetail}
                  sx={{ textTransform: 'none' }}
                >
                  Add Payment Method
                </Button>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, py: 1 }}>Payment Method</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Opening Amount</TableCell>
                        <TableCell width={50} sx={{ py: 1 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {balanceFields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell sx={{ py: 1.5 }}>
                            <FormControl fullWidth size="small">
                              <Controller
                                name={`balance_details.${index}.mode_of_payment`}
                                control={posOpeningFormControl}
                                rules={{ required: 'Payment method is required' }}
                                defaultValue={field.mode_of_payment || 'Cash'}
                                render={({ field: selectField }) => (
                                  <Select
                                    {...selectField}
                                    error={!!posOpeningErrors.balance_details?.[index]?.mode_of_payment}
                                    sx={{ fontSize: '0.8125rem' }}
                                  >
                                    {paymentModes.map(mode => (
                                      <MenuItem key={mode} value={mode}>
                                        {mode}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                )}
                              />
                            </FormControl>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Controller
                              name={`balance_details.${index}.opening_amount`}
                              control={posOpeningFormControl}
                              rules={{
                                required: 'Opening amount is required',
                                min: { value: 0, message: 'Amount must be 0 or greater' },
                              }}
                              defaultValue={field.opening_amount || 0}
                              render={({ field: inputField }) => (
                                <TextField
                                  {...inputField}
                                  fullWidth
                                  type="number"
                                  size="small"
                                  error={!!posOpeningErrors.balance_details?.[index]?.opening_amount}
                                  helperText={posOpeningErrors.balance_details?.[index]?.opening_amount?.message}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                      </InputAdornment>
                                    ),
                                  }}
                                  inputProps={{ step: '0.01', min: 0 }}
                                  onChange={(e) => inputField.onChange(parseFloat(e.target.value) || 0)}
                                  autoFocus={index === 0}
                                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            {balanceFields.length > 1 ? (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeBalance(index)}
                                aria-label="Remove payment method"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
            <MotionButton
              type="submit"
              variant="contained"
              disabled={isLoadingPOSOpening || isAnyAPILoading}
              whileHover={{ scale: isLoadingPOSOpening || isAnyAPILoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoadingPOSOpening || isAnyAPILoading ? 1 : 0.98 }}
              fullWidth
              sx={{ minWidth: 120, textTransform: 'none' }}
            >
              {isLoadingPOSOpening ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Opening Session...
                </>
              ) : isAnyAPILoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Loading...
                </>
              ) : (
                'Open POS Session'
              )}
            </MotionButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog 
        open={receiptDialogOpen} 
        onClose={handleReceiptClose}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        disableEnforceFocus={true}
        aria-labelledby="receipt-dialog-title"
        aria-describedby="receipt-dialog-description"
        aria-modal="true"
        sx={{
          '& .MuiDialog-paper': {
            '@media print': {
              margin: 0,
              maxWidth: '100%',
              width: '100%',
              height: '100%',
            },
          },
        }}
      >
        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body * {
                visibility: hidden;
              }
              .MuiDialog-root,
              .MuiDialog-container,
              .MuiDialog-paper,
              .MuiDialog-paperScrollPaper,
              .receipt-printable,
              .receipt-printable * {
                visibility: visible !important;
              }
              .MuiDialog-root {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
              }
              .MuiDialog-container {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
              }
              .MuiDialog-paper {
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                height: 100% !important;
                box-shadow: none !important;
              }
              .MuiBackdrop-root {
                display: none !important;
              }
              .no-print {
                display: none !important;
              }
              .receipt-printable {
                position: static;
                width: 100%;
                padding: 20px !important;
              }
            }
          `}
        </style>
        
        <Box className="no-print">
          <DialogTitle id="receipt-dialog-title" sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                Receipt
              </Typography>
              <IconButton 
                onClick={handleReceiptClose} 
                size="small"
                aria-label="Close receipt dialog"
                sx={{ mt: -0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </DialogTitle>
        </Box>
        
        <DialogContent 
          id="receipt-dialog-description" 
          className="receipt-printable"
          sx={{ 
            pt: 3,
            p: { xs: 2, sm: 3 },
            '@media print': {
              p: 3,
              pt: 3,
            },
          }}
        >
          {completedInvoice && completedSaleData && (
            <Box>
              {/* Company Header */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid', borderColor: 'divider' }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {userCompany || 'Company Name'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  POS Receipt
                </Typography>
              </Box>

              {/* Invoice Details */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Invoice #</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {completedInvoice.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {completedSaleData.timestamp.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Time</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {completedSaleData.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">Cashier</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {user?.full_name || user?.name || user?.email || 'Cashier'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Customer Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Customer</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {completedInvoice.customer || completedSaleData.customer || 'Walk-in Customer'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Items Table */}
              <Box sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', px: 1, py: 0.5 }}>Item</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', px: 1, py: 0.5 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5 }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', px: 1, py: 0.5 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedSaleData.items.map((item) => {
                      const itemTotal = item.subtotal || (item.rate * item.qty);
                      return (
                        <TableRow key={item.item_code}>
                          <TableCell sx={{ px: 1, py: 0.5 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {item.item_name || item.item_code}
                            </Typography>
                            {item.discount_amount > 0 && (
                              <Typography variant="caption" color="success.main">
                                Discount: KES {item.discount_amount.toFixed(2)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ px: 1, py: 0.5 }}>
                            {item.qty} {item.uom}
                          </TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.5 }}>
                            KES {item.rate.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.5, fontWeight: 'medium' }}>
                            KES {itemTotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Totals */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    KES {completedSaleData.items.reduce((sum, item) => sum + (item.rate * item.qty), 0).toFixed(2)}
                  </Typography>
                </Box>
                {completedSaleData.items.reduce((sum, item) => sum + (item.discount_amount || 0), 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="success.main">Discount</Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      -KES {completedSaleData.items.reduce((sum, item) => sum + (item.discount_amount || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="h6" fontWeight="bold">Grand Total</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    KES {(completedInvoice.grand_total || completedSaleData.grandTotal || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Payment Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Payment Method</Typography>
                {completedSaleData.payments?.map((payment, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{payment.mode_of_payment || payment.mode}</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      KES {Number(payment.amount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
                {completedSaleData.amountGiven > 0 && completedSaleData.paymentMode === 'Cash' && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Amount Given</Typography>
                      <Typography variant="body2">KES {completedSaleData.amountGiven.toFixed(2)}</Typography>
                    </Box>
                    {completedSaleData.amountGiven > completedSaleData.grandTotal && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight="bold" color="success.main">Change</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          KES {(completedSaleData.amountGiven - completedSaleData.grandTotal).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Footer */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Thank you for your business!
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {completedInvoice.status || 'Paid'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <Box className="no-print">
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
            <Button 
              onClick={handleReceiptClose} 
              variant="outlined"
              color="secondary"
              aria-label="Close receipt dialog"
              sx={{ textTransform: 'none' }}
            >
              Close
            </Button>
            {completedInvoice?.name && (
              <>
                <Button 
                  onClick={handlePrintReceipt} 
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  aria-label="Print receipt"
                  sx={{ textTransform: 'none' }}
                >
                  Print Receipt
                </Button>
                <MotionButton
                  onClick={handleViewInvoice} 
                  variant="contained" 
                  color="primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={`View invoice ${completedInvoice.name}`}
                  sx={{ minWidth: 120, textTransform: 'none' }}
                >
                  View Invoice
                </MotionButton>
              </>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Close Session Dialog */}
      <Dialog 
        open={closeSessionDialogOpen} 
        onClose={() => setCloseSessionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="close-session-dialog-title"
        aria-describedby="close-session-dialog-description"
        aria-modal="true"
      >
        <DialogTitle id="close-session-dialog-title" sx={{ pb: 2 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Close POS Session
          </Typography>
          <Typography id="close-session-dialog-description" variant="body2" color="text.secondary">
            Are you sure you want to close this POS session?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              This will create a POS Closing Entry that consolidates all invoices associated with this session.
            </Typography>
            {posOpeningEntry && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                      Entry
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {posOpeningEntry.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                      POS Profile
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {posOpeningEntry.pos_profile}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                      Status
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {posOpeningEntry.status}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
          <Button 
            onClick={() => setCloseSessionDialogOpen(false)} 
            disabled={isClosingPOSOpening}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <MotionButton
            variant="contained"
            color="error"
            onClick={handleCloseSessionConfirm}
            disabled={isClosingPOSOpening}
            whileHover={{ scale: isClosingPOSOpening ? 1 : 1.02 }}
            whileTap={{ scale: isClosingPOSOpening ? 1 : 0.98 }}
            sx={{ minWidth: 120, textTransform: 'none' }}
          >
            {isClosingPOSOpening ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                Closing...
              </>
            ) : (
              'Close Session'
            )}
          </MotionButton>
        </DialogActions>
      </Dialog>

      {/* Customer Selection/Add Dialog */}
      <Dialog
        open={customerDialogOpen}
        onClose={handleCloseCustomerDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="customer-dialog-title"
        aria-describedby="customer-dialog-description"
        aria-modal="true"
      >
        <DialogTitle id="customer-dialog-title" sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showAddCustomerForm && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setShowAddCustomerForm(false);
                    resetCustomerForm();
                  }}
                  aria-label="Back to customer list"
                  sx={{ mt: -0.5 }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <Box>
                <Typography variant="h6" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {showAddCustomerForm ? 'Add New Customer' : 'Select Customer'}
                </Typography>
                {!showAddCustomerForm && (
                  <Typography variant="body2" color="text.secondary">
                    Choose a customer or add a new one
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleCloseCustomerDialog}
              aria-label="Close customer dialog"
              sx={{ mt: -0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent id="customer-dialog-description" sx={{ pt: 3 }}>
          {showAddCustomerForm ? (
            // Add Customer Form
            <form onSubmit={handleCustomerFormSubmit(handleCreateCustomer)}>
              <Stack spacing={1.5}>
                <Controller
                  name="customer_name"
                  control={customerFormControl}
                  rules={{ required: 'Customer name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Customer Name *"
                      fullWidth
                      size="small"
                      required
                      autoFocus
                      error={!!customerFormErrors.customer_name}
                      helperText={customerFormErrors.customer_name?.message}
                      aria-label="Customer name, required"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                    />
                  )}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="customer_type"
                      control={customerFormControl}
                      render={({ field }) => (
                        <FormControl fullWidth size="small">
                          <InputLabel>Customer Type</InputLabel>
                          <Select {...field} label="Customer Type" aria-label="Customer type" sx={{ fontSize: '0.8125rem' }}>
                            <MenuItem value="Individual" sx={{ fontSize: '0.8125rem' }}>Individual</MenuItem>
                            <MenuItem value="Company" sx={{ fontSize: '0.8125rem' }}>Company</MenuItem>
                            <MenuItem value="Partnership" sx={{ fontSize: '0.8125rem' }}>Partnership</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="mobile_no"
                      control={customerFormControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Mobile Number"
                          fullWidth
                          size="small"
                          placeholder="+254712345678"
                          aria-label="Mobile number"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="email_id"
                      control={customerFormControl}
                      rules={{
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          type="email"
                          fullWidth
                          size="small"
                          error={!!customerFormErrors.email_id}
                          helperText={customerFormErrors.email_id?.message}
                          aria-label="Email address"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tax_id"
                      control={customerFormControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Tax ID/PIN"
                          fullWidth
                          size="small"
                          aria-label="Tax ID or PIN"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <TaxIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Stack>
              <DialogActions sx={{ mt: 3, px: 0, gap: 1.5 }}>
                <Button 
                  onClick={() => {
                    setShowAddCustomerForm(false);
                    resetCustomerForm();
                  }}
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                >
                  Cancel
                </Button>
                <MotionButton
                  type="submit"
                  variant="contained"
                  disabled={isCreatingCustomer}
                  whileHover={{ scale: isCreatingCustomer ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingCustomer ? 1 : 0.98 }}
                  sx={{ minWidth: 120, textTransform: 'none' }}
                >
                  {isCreatingCustomer ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                      Creating...
                    </>
                  ) : (
                    'Create Customer'
                  )}
                </MotionButton>
              </DialogActions>
            </form>
          ) : (
            // Customer Selection List
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                placeholder="Search customers by name, mobile, or email"
                variant="outlined"
                size="small"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                aria-label="Search customers"
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setShowAddCustomerForm(true)}
                  size="small"
                  aria-label="Add new customer"
                  sx={{ textTransform: 'none' }}
                >
                  Add New Customer
                </Button>
              </Box>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {isLoadingCustomers ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredCustomers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No customers found
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setShowAddCustomerForm(true)}
                      sx={{ mt: 2 }}
                      aria-label="Add new customer"
                    >
                      Add New Customer
                    </Button>
                  </Box>
                ) : (
                  <List>
                    {/* Walk-in Customer Option */}
                    <ListItem
                      button
                      onClick={() => handleSelectCustomer({ name: 'Walk-in Customer', customer_name: 'Walk-in Customer' })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectCustomer({ name: 'Walk-in Customer', customer_name: 'Walk-in Customer' });
                        }
                      }}
                      sx={{
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: '2px',
                        },
                      }}
                      aria-label="Walk-in Customer, default customer for cash sales"
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              Walk-in Customer
                            </Typography>
                            <Chip label="Default" size="small" color="default" />
                          </Box>
                        }
                        secondary="Default customer for cash sales"
                      />
                    </ListItem>
                    <Divider />
                    {/* Customer List */}
                    {filteredCustomers.map((customer) => (
                      <React.Fragment key={customer.name}>
                        <ListItem
                          button
                          onClick={() => handleSelectCustomer(customer)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectCustomer(customer);
                            }
                          }}
                          sx={{
                            '&:focus-visible': {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: '2px',
                            },
                          }}
                          aria-label={`${customer.customer_name || customer.name}${customer.mobile_no ? `, Mobile: ${customer.mobile_no}` : ''}`}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body1" fontWeight="medium">
                                {customer.customer_name || customer.name}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                {customer.mobile_no && (
                                  <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PhoneIcon fontSize="inherit" sx={{ fontSize: '0.75rem' }} />
                                    {customer.mobile_no}
                                  </Typography>
                                )}
                                {customer.email_id && (
                                  <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <EmailIcon fontSize="inherit" sx={{ fontSize: '0.75rem' }} />
                                    {customer.email_id}
                                  </Typography>
                                )}
                                {customer.customer_type && (
                                  <Chip 
                                    label={customer.customer_type} 
                                    size="small" 
                                    sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        {!showAddCustomerForm && (
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
            <Button 
              onClick={handleCloseCustomerDialog}
              variant="outlined"
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isCreatingInvoice}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default NewSale;
