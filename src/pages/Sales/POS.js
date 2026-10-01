import React, { useState } from 'react';
import {
  Box,
  GridLegacy as Grid,
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
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  LocalOffer as LocalOfferIcon,
  LocalShipping as LocalShippingIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

// Mock data for products
const products = [
  { id: 'AS0017-1', name: 'Acer Aspire E 1...', category: 'Laptops', price: 499.99 },
  { id: 'AS0015-2', name: 'Apple iPhone 8...', category: 'Smartphones', price: 299.99 },
  { id: 'AS0015-3', name: 'Apple iPhone 8...', category: 'Smartphones', price: 329.99 },
  { id: 'AS0015-4', name: 'Apple iPhone 8...', category: 'Smartphones', price: 349.99 },
  { id: 'AS0015-5', name: 'Apple iPhone 8...', category: 'Smartphones', price: 379.99 },
  { id: 'AS0015-6', name: 'Apple iPhone 8...', category: 'Smartphones', price: 399.99 },
  { id: 'AS0015-7', name: 'Apple iPhone 8...', category: 'Smartphones', price: 429.99 },
  { id: 'AS0015-8', name: 'Apple iPhone 8...', category: 'Smartphones', price: 459.99 },
  { id: 'AS0015-9', name: 'Apple iPhone 8...', category: 'Smartphones', price: 299.99 },
  { id: 'AS0015-10', name: 'Apple iPhone 8...', category: 'Smartphones', price: 329.99 },
  { id: 'PR001-1', name: '24x30 High rated', category: 'Posters', price: 29.99 }
];

// Generate more iPhone products for the list
const generateIphones = () => {
  const iphones = [];
  for (let i = 11; i <= 136; i++) {
    iphones.push({
      id: `AS0015-${i}`,
      name: 'Apple iPhone 8...',
      category: 'Smartphones',
      price: 299.99 + Math.floor(i / 10) * 20
    });
  }
  return iphones;
};

const allProducts = [...products, ...generateIphones()];

const categories = ['All', 'Smartphones', 'Laptops', 'Posters'];

const PosInterface = () => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discount, setDiscount] = useState(0);
  const [includeTax, setIncludeTax] = useState(false);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [customerType, setCustomerType] = useState('Walk-in Customer');

  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    let total = calculateSubtotal();
    if (includeTax) total += total * 0.08; // 8% tax
    if (includeShipping) total += 10; // $10 shipping
    total -= discount;
    return Math.max(0, total);
  };

  const handleCheckout = () => {
    const transaction = {
      customerType,
      items: cart,
      subtotal: calculateSubtotal(),
      discount,
      tax: includeTax ? calculateSubtotal() * 0.08 : 0,
      shipping: includeShipping ? 10 : 0,
      total: calculateTotal(),
      timestamp: new Date().toLocaleString()
    };
    
    alert(`Checkout successful!\nTotal: $${transaction.total.toFixed(2)}`);
    setCart([]);
    setDiscount(0);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ mb: 2, backgroundColor: '#1976d2' }}>
        <Toolbar>
          <ReceiptIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Awesome Shop
          </Typography>
          <Typography variant="body2">
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Toolbar>
      </AppBar>

      <Grid container spacing={2}>
        {/* Left Column - Product Selection */}
        <Grid item xs={8}>
          <Paper sx={{ p: 2, height: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Customer Type */}
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={customerType}
                exclusive
                onChange={(e, newValue) => newValue && setCustomerType(newValue)}
                fullWidth
              >
                <ToggleButton value="Walk-in Customer">
                  <PersonIcon sx={{ mr: 1 }} />
                  Walk-in Customer
                </ToggleButton>
                <ToggleButton value="Member">
                  <PersonIcon sx={{ mr: 1 }} />
                  Member
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Enter Product name / SKU / Scan bar code"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Category Filter */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              {categories.map(category => (
                <Chip
                  key={category}
                  label={category}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(category)}
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                />
              ))}
            </Box>

            {/* Product List */}
            <Typography variant="h6" sx={{ mb: 1 }}>Big Category</Typography>
            <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 1 }}>
              <List sx={{ width: '100%' }}>
                {filteredProducts.map((product, index) => (
                  <React.Fragment key={product.id}>
                    <ListItem
                      button
                      onClick={() => addToCart(product)}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {product.name} <Typography component="span" variant="caption" color="text.secondary">({product.id})</Typography>
                          </Typography>
                        }
                        secondary={`$${product.price.toFixed(2)}`}
                      />
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                        <AddIcon />
                      </IconButton>
                    </ListItem>
                    {index < filteredProducts.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Cart & Summary */}
        <Grid item xs={4}>
          <Paper sx={{ p: 2, height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Current Order</Typography>
            
            {/* Cart Items */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              {cart.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                  No items added
                </Typography>
              ) : (
                <List>
                  {cart.map(item => (
                    <ListItem
                      key={item.id}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => updateQuantity(item.id, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQuantity(item.id, 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => removeFromCart(item.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={`$${item.price.toFixed(2)} × ${item.quantity}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Order Summary */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Items:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">${calculateSubtotal().toFixed(2)}</Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2" fontWeight="bold">${calculateTotal().toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Additional Charges */}
            <Box sx={{ mb: 2 }}>
              {/* Discount */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocalOfferIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>Discount (+):</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  sx={{ width: 100 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Box>

              {/* Tax */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>Order Tax (+):</Typography>
                <ToggleButton
                  value="tax"
                  selected={includeTax}
                  onChange={() => setIncludeTax(!includeTax)}
                  size="small"
                  color={includeTax ? 'primary' : 'standard'}
                >
                  {includeTax ? '8%' : '0.00'}
                </ToggleButton>
              </Box>

              {/* Shipping */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalShippingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>Shipping (+):</Typography>
                <ToggleButton
                  value="shipping"
                  selected={includeShipping}
                  onChange={() => setIncludeShipping(!includeShipping)}
                  size="small"
                  color={includeShipping ? 'primary' : 'standard'}
                >
                  {includeShipping ? '$10.00' : '0.00'}
                </ToggleButton>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setCart([]);
                  setDiscount(0);
                  setIncludeTax(false);
                  setIncludeShipping(false);
                }}
              >
                Clear All
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleCheckout}
                disabled={cart.length === 0}
                color="success"
              >
                Checkout (${calculateTotal().toFixed(2)})
              </Button>
            </Box>

            {/* Cart Summary */}
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Items: {cart.reduce((sum, item) => sum + item.quantity, 0)} | 
                Total: ${calculateTotal().toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PosInterface;