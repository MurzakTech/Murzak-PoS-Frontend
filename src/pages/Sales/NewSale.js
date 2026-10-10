import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useDebounce } from '../../hooks/useDebounce';
import { Alert, Backdrop, Box, CircularProgress, Drawer, IconButton, Snackbar, Typography, useMediaQuery } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useThemeMode } from '../../theme/ThemeProvider';
import {
  getProducts,
  getItemGroups,
  getProductPrice,
} from '../../store/productSlice';
import { earnLoyaltyPoints } from '../../store/loyaltySlice';
import { useInventoryDiscounts } from '../../hooks/useInventoryDiscounts';
import { calculateDiscountAmount, calculateDiscountedPrice, formatDiscountDisplay } from '../../utils/discountCalculator';
import {
  createPOSInvoice,
  createSalesInvoice,
  clearSelectedPOSInvoice,
  createPOSOpeningEntry,
  getPOSOpeningEntry,
  closePOSOpeningEntry,
  listPOSOpeningEntries,
  resumePOSSession,
  listPaymentMethods,
  getReceivableAccount,
} from '../../store/salesSlice';
import { listWarehouses, setActiveWarehouse } from '../../store/warehouseSlice';
import { getStockBalanceMultiple } from '../../store/inventorySlice';
import { showNotification } from '../../store/notificationSlice';
import { listCustomers, createCustomer } from '../../store/customerSlice';
import LoyaltyRedemption from '../../components/Sales/LoyaltyRedemption';
import PosHeader from './pos/PosHeader';
import ProductPanel from './pos/ProductPanel';
import OrderPanel from './pos/OrderPanel';
import PaymentPanel from './pos/PaymentPanel';
import OpenTill from './pos/OpenTill';
import CustomerDialog from './pos/CustomerDialog';
import ReceiptDialog from './pos/ReceiptDialog';
import CloseTillDialog from './pos/CloseTillDialog';
import HeldSalesDialog from './pos/HeldSalesDialog';
import PosConfirm from './pos/PosConfirm';
import PriceEntryDialog from './pos/PriceEntryDialog';
import PhoneSaleBar from './pos/PhoneSaleBar';
import { round2 } from './pos/money';
import { getPosPaymentOptions } from '../../api/paymentGatewayApi';
import OfflineSalesBar from './pos/OfflineSalesBar';
import useOfflineSales from '../../hooks/useOfflineSales';
import { enqueueSale, isConnectionProblem, loadQueue, offlineBlocker, queueRoom } from '../../utils/offlineSales';
import { clearShift, loadCatalog, loadShift, saveCatalog, saveShift } from '../../utils/offlineTill';

// Short id for one sale, sent to M-Pesa / Pesapal / PayPal so payments can be traced to it
const newSaleReference = () => `POS${Date.now().toString(36).toUpperCase()}`;

/**
 * Point of sale (till).
 *
 * Full-screen selling screen for a POS machine: products on the left, the current
 * sale on the right, and a dedicated payment step. On phones the products fill
 * the screen, the sale slides up from a bottom bar, and payment takes the screen. All selling rules (stock,
 * discounts, credit limits, loyalty, invoice creation) live in this file; the
 * screens themselves are in ./pos.
 */

const TILE_PAGE = 60;
const HELD_KEY = 'pos_held_sales_v1';
const AUTOPRINT_KEY = 'pos_auto_print';
const PICTURES_KEY = 'pos_show_pictures';

const readHeldSales = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HELD_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
// On phones and tablets, focusing the search box pops the on-screen keyboard up over
// the products. Only hand focus back to it where there is a mouse (a desk till);
// a barcode scanner still works everywhere because typing anywhere lands in search.
const shouldRefocusSearch = () => {
  try {
    return window.matchMedia('(pointer: fine)').matches;
  } catch (e) {
    return true;
  }
};

const readShowPictures = () => {
  try {
    return localStorage.getItem(PICTURES_KEY) !== 'false';
  } catch (e) {
    return true;
  }
};

const readAutoPrint = () => {
  try {
    return localStorage.getItem(AUTOPRINT_KEY) !== 'false';
  } catch (e) {
    return true;
  }
};

// Barcodes may arrive as a single field or a list, as strings or { barcode } rows
const barcodesOf = (p) => {
  const out = [];
  if (p.barcode) out.push(String(p.barcode).toLowerCase());
  if (Array.isArray(p.barcodes)) {
    p.barcodes.forEach((b) => {
      const v = typeof b === 'string' ? b : b?.barcode;
      if (v) out.push(String(v).toLowerCase());
    });
  }
  return out;
};
const productMatches = (p, term) => {
  const t = (term || '').trim().toLowerCase();
  if (!t) return true;
  return (
    (p.item_name || '').toLowerCase().includes(t) ||
    (p.item_code || '').toLowerCase().includes(t) ||
    (p.description || '').toLowerCase().includes(t) ||
    barcodesOf(p).some((b) => b.includes(t))
  );
};
const exactCodeMatch = (p, t) => (p.item_code || '').toLowerCase() === t || barcodesOf(p).includes(t);

const NewSale = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mode: themeMode, toggleColorMode } = useThemeMode();

  // Redux selectors
  const { products: liveProducts, isLoading: isLoadingProducts, isLoadingReference: isLoadingItemGroups } = useAppSelector((state) => state.product);
  const { 
    isLoading: isCreatingInvoice, 
    paymentMethods,
    isLoadingPaymentMethods,
    receivableAccount,
  } = useAppSelector((state) => state.sales);
  const { warehouses, isLoading: isLoadingWarehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);
  const { customers, isLoading: isLoadingCustomers, isCreating: isCreatingCustomer } = useAppSelector((state) => state.customer);

  const userCompany = user?.company || user?.custom_company || user?.company_name || 
                      user?.company_data?.name || user?.company_data?.company_name;
  const userId = user?.email || user?.name || user?.user;

  // Offline: sell from the product list saved the last time the till was online
  const offlineCatalog = useMemo(() => loadCatalog(userCompany), [userCompany]);
  const products = liveProducts.length > 0 ? liveProducts : offlineCatalog;
  useEffect(() => {
    if (liveProducts.length > 0) saveCatalog(userCompany, liveProducts);
  }, [liveProducts, userCompany]);

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
  // How each method is collected: { [mode]: { gateway: 'mpesa' | 'pesapal' | 'paypal' | 'bank', ... } }
  const [paymentOptions, setPaymentOptions] = useState({});
  const [saleReference, setSaleReference] = useState(newSaleReference);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [completedSaleData, setCompletedSaleData] = useState(null); // Store cart and payment data for receipt
  const [posProfile, setPosProfile] = useState('');
  const [updateStock] = useState(true); // always update stock for POS sales
  
  // Use activeWarehouse from global selection
  const defaultWarehouse = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
  const [productStocks, setProductStocks] = useState({}); // { item_code: { warehouse: qty } }
  const [closeSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [openTillError, setOpenTillError] = useState(''); // why the last "Open till" attempt failed
  const isPhone = useMediaQuery((t) => t.breakpoints.down('md'));
  const [cartSheetOpen, setCartSheetOpen] = useState(false); // phones: the sale slides up over the products
  const [priceEntryProduct, setPriceEntryProduct] = useState(null); // product waiting for a typed price
  const [amountGiven, setAmountGiven] = useState(0);
  const [tileLimit, setTileLimit] = useState(TILE_PAGE); // how many product tiles are drawn
  const [shiftChecked, setShiftChecked] = useState(false); // have we looked for an already-open shift?
  const [heldSales, setHeldSales] = useState(readHeldSales);
  const [heldDialogOpen, setHeldDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(readAutoPrint);
  const [showPictures, setShowPictures] = useState(readShowPictures);
  
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

  // Which methods go through a gateway (configured per business under Settings > Payment Gateways)
  useEffect(() => {
    if (!userCompany) return undefined;
    let cancelled = false;
    getPosPaymentOptions(userCompany)
      .then((res) => {
        if (!cancelled) setPaymentOptions(res?.options || {});
      })
      .catch(() => {
        // Without gateway details the till still works; gateway methods fall back to manual entry
        if (!cancelled) setPaymentOptions({});
      });
    return () => {
      cancelled = true;
    };
  }, [userCompany]);

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
    if (!navigator.onLine) return; // offline: keep the last known stock figures
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

  // If this cashier already has a shift open on the server (page refreshed, till restarted),
  // pick it back up instead of asking them to open a second one.
  useEffect(() => {
    if (isPOSSessionOpen) {
      setShiftChecked(true);
      return undefined;
    }
    if (shiftChecked || !userCompany) return undefined;
    let cancelled = false;
    const me = user?.email || user?.name || user?.user;
    dispatch(listPOSOpeningEntries({
      company: userCompany,
      status: 'Open',
      ...(me ? { user: me } : {}),
      limit_start: 0,
      limit_page_length: 20,
    }))
      .then((result) => {
        if (cancelled) return;
        if (listPOSOpeningEntries.fulfilled.match(result)) {
          // Only ever adopt a shift that clearly belongs to the signed-in person
          const mine = (result.payload.posOpeningEntries || []).find((e) => e.status === 'Open' && e.user && me && e.user === me);
          if (mine) dispatch(resumePOSSession(mine));
        } else if (isConnectionProblem(result.payload)) {
          // Offline: carry on with the shift this person had open when last online
          const saved = loadShift(userCompany, me);
          if (saved) dispatch(resumePOSSession(saved));
        }
        setShiftChecked(true);
      })
      .catch(() => !cancelled && setShiftChecked(true));
    return () => {
      cancelled = true;
    };
  }, [dispatch, isPOSSessionOpen, shiftChecked, userCompany, user]);

  // Remember the open shift so the till can keep selling if it is reopened offline
  useEffect(() => {
    if (isPOSSessionOpen && posOpeningEntry?.name) saveShift(userCompany, userId, posOpeningEntry);
    else if (!isPOSSessionOpen && shiftChecked && navigator.onLine) clearShift();
  }, [isPOSSessionOpen, posOpeningEntry, userCompany, userId, shiftChecked]);

  // Use the shift's own POS profile when we picked one up
  useEffect(() => {
    if (posOpeningEntry?.pos_profile && !posProfile) setPosProfile(posOpeningEntry.pos_profile);
  }, [posOpeningEntry?.pos_profile, posProfile]);

  // Prepare the opening-balance form whenever no shift is open
  useEffect(() => {
    if (userCompany && !isPOSSessionOpen) {
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

    setOpenTillError('');
    const result = await dispatch(createPOSOpeningEntry(openingData));

    if (createPOSOpeningEntry.fulfilled.match(result)) {
      setPosProfile(formData.pos_profile.trim());
      resetPosOpeningForm();
    } else if (createPOSOpeningEntry.rejected.match(result)) {
      // Stay on this screen with the reason showing; the cashier can fix it and try again
      setOpenTillError(typeof result.payload === 'string' ? result.payload : 'Please try again.');
    }
  };

  const handleAddBalanceDetail = () => {
    appendBalance({ mode_of_payment: 'Cash', opening_amount: 0 });
  };

  const handleViewSessionDetails = () => {
    if (posOpeningEntry?.name) {
      navigate(`/sales/pos-opening-entries/${posOpeningEntry.name}`);
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
      const matchesSearch = productMatches(product, debouncedSearchTerm);
      const matchesCategory = selectedCategory === 'all' || 
                             (product.item_group || '').toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchTerm, selectedCategory]);

  // Fetch discounts for paginated products (for product table display)
  const productDiscountItems = useMemo(() => 
    filteredProducts
      .slice(0, tileLimit)
      .map(product => ({
        item_code: product.item_code,
        item_group: product.item_group,
      })),
    [filteredProducts, tileLimit]
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

  // Add to cart with stock validation
  // enteredRate: the price typed on the "Enter price" keypad, for products with no fixed price
  const addToCart = async (product, enteredRate) => {
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

      if (enteredRate > 0) {
        rate = enteredRate;
      } else if (!(rate > 0)) {
        // No fixed price: ask for one rather than selling it for nothing
        setPriceEntryProduct(product);
        return;
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
          item_group: product.item_group || '', // for the cart picture only
          image: product.image || '', // for the cart picture only
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
    }
    // Keep the scanner/search field ready for the next item
    if (shouldRefocusSearch()) setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  // Set an exact quantity (typed in the cart)
  const setQuantity = (itemCode, raw) => {
    const value = parseFloat(raw);
    const line = cart.find((i) => i.item_code === itemCode);
    if (!line || !Number.isFinite(value) || value <= 0) return;
    updateQuantity(itemCode, value - line.qty);
  };

  // Enter in the search box: a scanned barcode adds that product straight away
  const handleSearchEnter = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const exact = products.find((p) => exactCodeMatch(p, term));
    const matches = exact ? [exact] : products.filter((p) => productMatches(p, term));
    if (matches.length === 1) {
      addToCart(matches[0]);
      setSearchTerm('');
    } else if (matches.length === 0) {
      setSnackbarMessage(`No product found for "${searchTerm.trim()}"`);
      setSnackbarSeverity('warning');
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
  };

  // Totals are computed once whenever the cart or discounts change
  const itemsTotal = useMemo(() => round2(cart.reduce((sum, item) => sum + item.rate * item.qty, 0)), [cart]);
  const itemDiscountTotal = useMemo(() => round2(cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0)), [cart]);
  const manualDiscountAmount = useMemo(() => {
    const base = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    if (manualDiscountType === 'percentage') return round2((base * (manualDiscountValue || 0)) / 100);
    return round2(Math.min(manualDiscountValue || 0, base));
  }, [cart, manualDiscountType, manualDiscountValue]);
  const grandTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    return round2(Math.max(0, subtotal - loyaltyDiscountAmount - manualDiscountAmount));
  }, [cart, loyaltyDiscountAmount, manualDiscountAmount]);

  const calculateManualDiscountAmount = () => manualDiscountAmount;
  const calculateSubtotal = () => grandTotal;

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
      : [{ mode: paymentMode, amount: paymentMode === 'Credit' ? creditAmount : grandTotal, gateway: payments[0]?.gateway }];

    // M-Pesa, Pesapal, PayPal and bank lines must be collected first (the server checks again)
    const uncollected = paymentLines.find((p) => paymentOptions[p.mode] && Number(p.amount) > 0 && !p.gateway?.confirmed);
    if (uncollected) {
      setSnackbarMessage(`Collect the ${uncollected.mode} payment before completing the sale.`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

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

      // Gateway payment this line was collected with, and its M-Pesa code / reference
      if (p.gateway?.transactionId) basePayload.gateway_transaction = p.gateway.transactionId;
      if (p.gateway?.reference) basePayload.reference_no = p.gateway.reference;
      
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
      // Same id on a retry, so a sale whose reply was lost is not recorded twice
      client_reference: saleReference,
      // is_pos: creditUsed > 0 ? 0 : 1,
      
      // Add loyalty redemption if points are being redeemed
      ...(loyaltyPointsToRedeem > 0 && customerId && {
        redeem_loyalty_points: true,
        loyalty_points: loyaltyPointsToRedeem,
      }),
    };

    // No connection: keep a cash sale on this device and upload it later (see utils/offlineSales)
    const saveOffline = () => {
      const blocker = offlineBlocker({ paymentLines, loyaltyPoints: loyaltyPointsToRedeem })
        || queueRoom(loadQueue()).reason;
      if (blocker) {
        setSnackbarMessage(blocker);
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }
      const entry = enqueueSale({
        payload: invoiceData,
        receipt: { grandTotal, itemCount: cart.length },
        company: userCompany,
        user: userId,
      });
      setCompletedInvoice({ name: entry.id, customer: invoiceCustomer, grand_total: grandTotal, offline: true });
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
      setCart([]);
      setIsCheckoutMode(false);
      setAmountGiven(0);
      setManualDiscountType('percentage');
      setManualDiscountValue(0);
      setSearchTerm('');
      setSaleReference(newSaleReference());
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      saveOffline();
      return;
    }

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
            setSaleReference(newSaleReference());
            return;
          }
        } else if (isConnectionProblem(errorMessage)) {
          // The connection dropped while sending. Keeping it is safe: the server records
          // a sale id only once, even if this attempt did reach it.
          saveOffline();
          return;
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
        setSaleReference(newSaleReference());
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setSnackbarMessage('An error occurred while creating the invoice');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
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
    // Each new sale starts as a walk-in, so it can never be billed to the previous customer
    handleSelectCustomer(null);
    setPaymentMode('Cash');
    setCreditAmount(0);
    if (shouldRefocusSearch()) setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Auto-print receipt when dialog opens
  useEffect(() => {
    if (autoPrint && receiptDialogOpen && completedInvoice) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, receiptDialogOpen, completedInvoice]);

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
    return Math.abs(splitPaymentsTotal - grandTotal) < 0.01;
  }, [splitPayments, splitPaymentsTotal, grandTotal]);

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
              // A different method or amount needs collecting again
              gateway: undefined,
            }
          : p
      )
    );
  };

  const setPaymentGateway = (index, gateway) => {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, gateway: gateway || undefined } : p)));
  };

  // Keep single-payment amount in sync with total when split is disabled. A payment already
  // collected through a gateway is kept while it still covers the total.
  useEffect(() => {
    if (!splitPayments) {
      setPayments((prev) => {
        const kept = prev[0]?.mode === paymentMode && prev[0]?.gateway?.confirmed && Math.abs(prev[0].gateway.amount - grandTotal) <= 1
          ? prev[0].gateway
          : undefined;
        return [{ mode: paymentMode, amount: grandTotal, gateway: kept }];
      });
    }
  }, [splitPayments, paymentMode, grandTotal]);

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


  // ---------------------------------------------------------------- hold, recall, clear
  const persistHeld = (next) => {
    setHeldSales(next);
    try {
      localStorage.setItem(HELD_KEY, JSON.stringify(next));
    } catch (e) {
      // not critical
    }
  };

  const resetSale = () => {
    setCart([]);
    setIsCheckoutMode(false);
    setAmountGiven(0);
    setManualDiscountType('percentage');
    setManualDiscountValue(0);
    setLoyaltyPointsToRedeem(0);
    setLoyaltyDiscountAmount(0);
    setSearchTerm('');
    handleSelectCustomer(null);
    if (shouldRefocusSearch()) setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const holdCurrentSale = () => {
    if (cart.length === 0) return;
    persistHeld([
      ...heldSales,
      {
        id: Date.now(),
        heldAt: new Date().toISOString(),
        cart,
        customer,
        customerId,
        selectedCustomerObj,
        customerPriceList,
        manualDiscountType,
        manualDiscountValue,
      },
    ]);
    resetSale();
    setSnackbarMessage('Sale put on hold. Find it under Held sales at the top.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const recallHeldSale = (id) => {
    const held = heldSales.find((h) => h.id === id);
    if (!held || cart.length > 0) return;
    setCart(held.cart);
    setCustomer(held.customer || 'Walk-in Customer');
    setCustomerId(held.customerId || null);
    setSelectedCustomerObj(held.selectedCustomerObj || null);
    setCustomerPriceList(held.customerPriceList || 'Standard Selling');
    setManualDiscountType(held.manualDiscountType || 'percentage');
    setManualDiscountValue(held.manualDiscountValue || 0);
    persistHeld(heldSales.filter((h) => h.id !== id));
    setHeldDialogOpen(false);
  };

  const requestExit = () => {
    if (cart.length > 0) setLeaveDialogOpen(true);
    else navigate('/dashboard');
  };

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    // Credit starts at the full total; other methods have no credit part
    setCreditAmount(mode === 'Credit' ? grandTotal : 0);
  };

  const toggleShowPictures = () => {
    setShowPictures((prev) => {
      try {
        localStorage.setItem(PICTURES_KEY, String(!prev));
      } catch (e) {
        // not critical
      }
      return !prev;
    });
  };

  const toggleAutoPrint = () => {
    setAutoPrint((prev) => {
      try {
        localStorage.setItem(AUTOPRINT_KEY, String(!prev));
      } catch (e) {
        // not critical
      }
      return !prev;
    });
  };

  const handleChangeLineWarehouse = (itemCode, newWarehouse) => {
    setCart((prevCart) =>
      prevCart.map((cartItem) =>
        cartItem.item_code === itemCode
          ? {
              ...cartItem,
              warehouse: newWarehouse,
              // Clear the offer: it is looked up again for the new store
              discount_rule: undefined,
              discount_amount: 0,
              subtotal: cartItem.rate * cartItem.qty,
            }
          : cartItem
      )
    );
  };

  // ---------------------------------------------------------------- derived values for the screen
  const cartQtyMap = useMemo(() => {
    const map = {};
    cart.forEach((i) => {
      map[i.item_code] = i.qty;
    });
    return map;
  }, [cart]);

  const getTileData = (product) => {
    const itemCode = product.item_code;
    let base = product.standard_rate || product.price || 0;
    if (customerId && customerPriceList !== 'Standard Selling' && customerProductPrices[itemCode] !== undefined) {
      base = customerProductPrices[itemCode];
    }
    const rule = discountsMap[itemCode];
    const stock = defaultWarehouse ? productStocks[itemCode]?.[defaultWarehouse] ?? null : null;
    return {
      price: rule ? calculateDiscountedPrice(base, rule) : base,
      originalPrice: rule ? base : null,
      discountLabel: rule ? formatDiscountDisplay(rule) : null,
      stockQty: stock !== null ? parseFloat(stock) : null,
      cartQty: cartQtyMap[itemCode] || 0,
      uom: product.stock_uom || 'Nos',
    };
  };

  const currency = user?.company_currency || 'KES';
  const cashierName = user?.full_name || user?.first_name || user?.email || 'Cashier';
  const storeName = activeWarehouse?.warehouse_name || activeWarehouse?.name || defaultWarehouse;
  const isCreditWithoutCustomer = !splitPayments && paymentMode === 'Credit' && !customerId;

  const canComplete = !(
    cart.length === 0 ||
    isCreatingInvoice ||
    !isPOSSessionOpen ||
    isCreditWithoutCustomer ||
    (splitPayments
      ? !isSplitPaymentsValid || !isSplitPaymentsCreditValid
      : (paymentMode === 'Credit' && (!creditAmount || creditAmount <= 0 || creditAmount > grandTotal)) ||
        (paymentMode === 'Cash' && (!amountGiven || amountGiven < grandTotal))) ||
    // Gateway methods (M-Pesa, Pesapal, PayPal, bank) must be collected first
    (splitPayments ? payments : payments.slice(0, 1)).some(
      (p) => paymentOptions[p.mode] && Number(p.amount) > 0 && !p.gateway?.confirmed
    )
  );

  const customerView = {
    name: customerId ? customer : 'Walk-in customer',
    detail: customerId
      ? [
          customerPriceList !== 'Standard Selling' ? `${customerPriceList} prices` : null,
          creditInfo && creditInfo.credit_limit > 0 ? `Credit available ${currency} ${Number(creditInfo.available_credit || 0).toLocaleString('en-KE')}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Registered customer'
      : 'Tap to choose or add a customer',
  };

  const totals = {
    itemsTotal,
    itemDiscount: itemDiscountTotal,
    manualDiscount: manualDiscountAmount,
    loyaltyDiscount: loyaltyDiscountAmount,
    grandTotal,
  };

  const anyDialogOpen = customerDialogOpen || closeSessionDialogOpen || receiptDialogOpen || heldDialogOpen || leaveDialogOpen || clearDialogOpen || cartSheetOpen || !!priceEntryProduct;

  // The slide-up sale only exists on phones; never leave it open behind the desktop layout
  useEffect(() => {
    if (!isPhone) setCartSheetOpen(false);
  }, [isPhone]);

  const chargeFromPhone = () => {
    setCartSheetOpen(false);
    handleCheckoutClick();
  };

  // ---------------------------------------------------------------- keyboard
  // F2 or Ctrl+K: search. F4: customer. F9 or Ctrl+Enter: charge / complete. Esc: back one step (never leaves the till).
  // Typing while focus is elsewhere (a barcode scanner) lands in the search box.
  const latest = useRef({});
  latest.current = { anyDialogOpen, isPOSSessionOpen, isCheckoutMode, cart, isCreatingInvoice, canComplete, searchTerm, handleCheckout, handleCheckoutClick, handleOpenCustomerDialog };
  useEffect(() => {
    const onKeyDown = (event) => {
      const s = latest.current;
      if (s.anyDialogOpen || !s.isPOSSessionOpen) return;
      const tag = event.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;

      if ((mod && event.key.toLowerCase() === 'k') || event.key === 'F2') {
        event.preventDefault();
        if (!s.isCheckoutMode) searchInputRef.current?.focus();
      } else if (event.key === 'F4') {
        event.preventDefault();
        s.handleOpenCustomerDialog();
      } else if ((mod && event.key === 'Enter') || event.key === 'F9') {
        event.preventDefault();
        if (s.cart.length === 0 || s.isCreatingInvoice) return;
        if (s.isCheckoutMode) {
          if (s.canComplete) s.handleCheckout();
        } else {
          s.handleCheckoutClick();
        }
      } else if (event.key === 'Escape') {
        if (s.isCheckoutMode) {
          setIsCheckoutMode(false);
          setAmountGiven(0);
        } else if (s.searchTerm) {
          setSearchTerm('');
        }
      } else if (!typing && !mod && !s.isCheckoutMode && event.key.length === 1) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // A half-finished sale should survive an accidental refresh prompt
  useEffect(() => {
    if (cart.length === 0) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [cart.length]);

  // Show more tiles reset when the filter changes
  useEffect(() => setTileLimit(TILE_PAGE), [debouncedSearchTerm, selectedCategory]);

  const showShiftCheck = !isPOSSessionOpen && !shiftChecked;

  const offlineSales = useOfflineSales(userCompany, {
    onSynced: ({ uploaded, flagged }) => {
      if (uploaded) {
        dispatch(showNotification({
          message: `${uploaded} sale${uploaded === 1 ? '' : 's'} made offline ${uploaded === 1 ? 'was' : 'were'} uploaded.`,
          severity: 'success',
          title: 'Offline sales uploaded',
        }));
      }
      if (flagged) {
        dispatch(showNotification({
          message: `${flagged} offline sale${flagged === 1 ? ' was' : 's were'} refused by the server. Open the list on the till to see why.`,
          severity: 'warning',
          title: 'Offline sales need a manager',
        }));
      }
    },
  });
  const cartItemCount = cart.reduce((n, item) => n + (Number(item.qty) || 0), 0);

  const orderPanel = (
    <OrderPanel
      cart={cart}
      readOnly={isCheckoutMode}
      currency={currency}
      customer={customerView}
      onCustomerClick={handleOpenCustomerDialog}
      onInc={(code) => updateQuantity(code, 1)}
      onDec={(code) => updateQuantity(code, -1)}
      onSetQty={setQuantity}
      onRemove={removeFromCart}
      warehouses={warehouses}
      defaultWarehouse={defaultWarehouse}
      onChangeWarehouse={handleChangeLineWarehouse}
      totals={totals}
      manualDiscountType={manualDiscountType}
      manualDiscountValue={manualDiscountValue}
      onManualDiscountChange={(type, value) => {
        setManualDiscountType(type);
        setManualDiscountValue(value);
      }}
      isLoadingDiscounts={isLoadingDiscounts}
      onCheckout={isPhone ? chargeFromPhone : handleCheckoutClick}
      onHold={() => {
        holdCurrentSale();
        setCartSheetOpen(false);
      }}
      onClear={() => setClearDialogOpen(true)}
      isBusy={isCreatingInvoice}
      footerExtra={isCheckoutMode ? <Box /> : undefined}
    />
  );

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
      <PosHeader
        storeName={storeName}
        warehouses={warehouses}
        canChangeStore={cart.length === 0}
        onChangeStore={(w) => dispatch(setActiveWarehouse(w))}
        cashierName={cashierName}
        sessionOpen={isPOSSessionOpen}
        onSessionDetails={handleViewSessionDetails}
        heldCount={heldSales.length}
        onOpenHeld={() => setHeldDialogOpen(true)}
        onExit={requestExit}
        onCloseSession={handleCloseSession}
        onGoHistory={() => navigate('/sales/history')}
        themeMode={themeMode}
        onToggleTheme={toggleColorMode}
        autoPrint={autoPrint}
        onToggleAutoPrint={toggleAutoPrint}
        showPictures={showPictures}
        onToggleShowPictures={toggleShowPictures}
      />

      <OfflineSalesBar {...offlineSales} onSyncNow={offlineSales.syncNow} />

      {/* Screen reader announcements for cart changes */}
      <Box ref={cartAnnouncementRef} role="status" aria-live="polite" aria-atomic="true" sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }} />

      {showShiftCheck ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }} aria-busy="true">
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Checking your shift...</Typography>
          </Box>
        </Box>
      ) : !isPOSSessionOpen ? (
        <OpenTill
          control={posOpeningFormControl}
          fields={balanceFields}
          errors={posOpeningErrors}
          paymentModes={paymentModes}
          onAdd={handleAddBalanceDetail}
          onRemove={removeBalance}
          onSubmit={handlePosOpeningSubmit(handleOpenPOSSession)}
          loading={isLoadingPOSOpening}
          apiLoading={isAnyAPILoading}
          cashierName={cashierName}
          storeName={storeName}
          currency={currency}
          onExit={() => navigate('/dashboard')}
          openError={openTillError}
        />
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {isCheckoutMode ? (
              <PaymentPanel
                currency={currency}
                total={grandTotal}
                paymentModes={paymentModes}
                paymentMode={paymentMode}
                onPaymentModeChange={handlePaymentModeChange}
                splitPayments={splitPayments}
                setSplitPayments={setSplitPayments}
                payments={payments}
                onUpdatePayment={updatePaymentField}
                onAddPayment={addPaymentRow}
                onRemovePayment={removePaymentRow}
                splitTotal={splitPaymentsTotal}
                splitValid={isSplitPaymentsValid}
                splitCreditValid={isSplitPaymentsCreditValid}
                amountGiven={amountGiven}
                setAmountGiven={setAmountGiven}
                creditAmount={creditAmount}
                setCreditAmount={setCreditAmount}
                creditInfo={creditInfo}
                hasCustomer={!!customerId}
                customerName={customer}
                loyaltySlot={
                  customerId ? (
                    <Box sx={{ mb: 2.5 }}>
                      <LoyaltyRedemption
                        customerId={customerId}
                        invoiceTotal={grandTotal + loyaltyDiscountAmount}
                        onRedemptionChange={(points, discountAmount) => {
                          setLoyaltyPointsToRedeem(points);
                          setLoyaltyDiscountAmount(discountAmount);
                        }}
                        disabled={isCreatingInvoice}
                        company={userCompany}
                      />
                    </Box>
                  ) : null
                }
                canComplete={canComplete}
                onComplete={handleCheckout}
                onChooseCustomer={handleOpenCustomerDialog}
                paymentOptions={paymentOptions}
                onSetGateway={setPaymentGateway}
                company={userCompany}
                saleReference={saleReference}
                customerPhone={selectedCustomerObj?.mobile_no || ''}
                isCreating={isCreatingInvoice}
                onBack={() => {
                  setIsCheckoutMode(false);
                  setAmountGiven(0);
                }}
              />
            ) : (
              <ProductPanel
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchInputRef={searchInputRef}
                onSearchEnter={handleSearchEnter}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                products={filteredProducts}
                visibleCount={tileLimit}
                showImages={showPictures}
                onShowMore={() => setTileLimit((n) => n + TILE_PAGE)}
                isLoading={isLoadingProducts}
                getTileData={getTileData}
                addToCart={addToCart}
                hasStore={!!defaultWarehouse}
                priceListNote={
                  customerId && customerPriceList !== 'Standard Selling'
                    ? { loading: isLoadingCustomerPrices, text: isLoadingCustomerPrices ? `Loading ${customerPriceList} prices...` : `Showing ${customerPriceList} prices` }
                    : null
                }
                onAddProducts={() => navigate('/products/new')}
              />
            )}
          </Box>

          {isPhone ? (
            !isCheckoutMode && (
              <PhoneSaleBar
                itemCount={cartItemCount}
                total={grandTotal}
                currency={currency}
                onViewSale={() => setCartSheetOpen(true)}
                onCharge={chargeFromPhone}
                disabled={isCreatingInvoice}
              />
            )
          ) : (
            <Box sx={{ width: { md: 400, lg: 440 }, flexShrink: 0, minHeight: 0 }}>
              {orderPanel}
            </Box>
          )}
        </Box>
      )}

      {/* Phones: the current sale slides up from the bottom bar */}
      <Drawer
        anchor="bottom"
        open={isPhone && cartSheetOpen && isPOSSessionOpen}
        onClose={() => setCartSheetOpen(false)}
        slotProps={{ paper: { sx: { height: '88dvh', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'center', bgcolor: 'background.paper' }}>
          <Box sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: 'divider' }} />
          <IconButton onClick={() => setCartSheetOpen(false)} aria-label="Close sale" sx={{ position: 'absolute', right: 6, top: 2 }}>
            <Close />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, '& > div': { borderLeft: 0 } }}>{orderPanel}</Box>
      </Drawer>

      {/* Dialogs */}
      <CustomerDialog
        open={customerDialogOpen}
        onClose={handleCloseCustomerDialog}
        showAddForm={showAddCustomerForm}
        setShowAddForm={setShowAddCustomerForm}
        resetForm={resetCustomerForm}
        handleFormSubmit={handleCustomerFormSubmit}
        onCreate={handleCreateCustomer}
        formControl={customerFormControl}
        formErrors={customerFormErrors}
        isCreating={isCreatingCustomer}
        searchTerm={customerSearchTerm}
        setSearchTerm={setCustomerSearchTerm}
        customers={filteredCustomers}
        isLoading={isLoadingCustomers}
        onSelect={handleSelectCustomer}
        currency={currency}
      />

      <ReceiptDialog
        open={receiptDialogOpen}
        invoice={completedInvoice}
        saleData={completedSaleData}
        companyName={userCompany}
        cashierName={cashierName}
        currency={currency}
        onNewSale={handleReceiptClose}
        onPrint={handlePrintReceipt}
        onViewInvoice={handleViewInvoice}
      />

      <CloseTillDialog
        open={closeSessionDialogOpen}
        onClose={() => setCloseSessionDialogOpen(false)}
        onConfirm={handleCloseSessionConfirm}
        loading={isClosingPOSOpening}
        entry={posOpeningEntry}
      />

      <HeldSalesDialog
        open={heldDialogOpen}
        onClose={() => setHeldDialogOpen(false)}
        held={heldSales}
        onRecall={recallHeldSale}
        onDelete={(id) => persistHeld(heldSales.filter((h) => h.id !== id))}
        canRecall={cart.length === 0}
        currency={currency}
      />

      <PriceEntryDialog
        open={!!priceEntryProduct}
        product={priceEntryProduct}
        currency={currency}
        onCancel={() => setPriceEntryProduct(null)}
        onConfirm={(price) => {
          const product = priceEntryProduct;
          setPriceEntryProduct(null);
          addToCart(product, price);
        }}
      />

      <PosConfirm
        open={leaveDialogOpen}
        title="Leave the till?"
        message="The sale in progress has items in it. If you leave now, it will be lost. You can put it on hold instead."
        confirmLabel="Leave and discard"
        cancelLabel="Stay"
        onClose={() => setLeaveDialogOpen(false)}
        onConfirm={() => {
          setLeaveDialogOpen(false);
          navigate('/dashboard');
        }}
      />

      <PosConfirm
        open={clearDialogOpen}
        title="Clear this sale?"
        message="Every item will be removed from the current sale. This cannot be undone."
        confirmLabel="Clear sale"
        cancelLabel="Keep it"
        onClose={() => setClearDialogOpen(false)}
        onConfirm={() => {
          setClearDialogOpen(false);
          setCartSheetOpen(false);
          resetSale();
        }}
      />

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ top: '6px !important', maxWidth: 'min(520px, calc(100vw - 32px))' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled" sx={{ width: '100%', py: 0, alignItems: 'center', boxShadow: 6 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Backdrop sx={{ color: '#fff', zIndex: (t) => t.zIndex.modal + 1 }} open={isCreatingInvoice}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default NewSale;
