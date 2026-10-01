import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  GridLegacy as Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getStockBalance } from '../../store/inventorySlice';
import { listWarehouses } from '../../store/warehouseSlice';

const StockBalance = ({ itemCode, warehouse: initialWarehouse, onBalanceChange }) => {
  const dispatch = useAppDispatch();
  const { stockBalance, isLoadingBalance, error } = useAppSelector((state) => state.inventory);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { user } = useAppSelector((state) => state.auth);

  const [itemCodeInput, setItemCodeInput] = useState(itemCode || '');
  const [warehouse, setWarehouse] = useState(initialWarehouse || '');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);

  // Initialize with active warehouse if not set
  useEffect(() => {
    if (activeWarehouse && !warehouse && !initialWarehouse) {
      const warehouseName = activeWarehouse.name || activeWarehouse.warehouse_name;
      if (warehouseName) {
        setWarehouse(warehouseName);
      }
    }
  }, [activeWarehouse, warehouse, initialWarehouse]);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  // Fetch warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  // Auto-fetch if itemCode prop is provided
  useEffect(() => {
    if (itemCode && warehouse) {
      handleFetchBalance();
    }
  }, [itemCode, initialWarehouse]);

  const handleFetchBalance = async () => {
    if (!itemCodeInput) {
      return;
    }

    const params = {
      item_code: itemCodeInput,
      ...(warehouse && { warehouse }),
      ...(postingDate && { posting_date: postingDate }),
    };

    const result = await dispatch(getStockBalance(params));
    if (result.type === 'inventory/getStockBalance/fulfilled' && onBalanceChange) {
      onBalanceChange(result.payload.balance);
    }
  };

  const balance = stockBalance;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Stock Balance</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={handleFetchBalance}
          disabled={!itemCodeInput || isLoadingBalance}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Item Code"
            value={itemCodeInput}
            onChange={(e) => setItemCodeInput(e.target.value)}
            disabled={!!itemCode}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              label="Warehouse"
            >
              <MenuItem value="">Default</MenuItem>
              {warehouses.map((wh) => (
                <MenuItem key={wh.name} value={wh.name}>
                  {wh.warehouse_name || wh.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Posting Date"
            type="date"
            value={postingDate}
            onChange={(e) => setPostingDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoadingBalance ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : balance ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Balance
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {balance.balance || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Actual Quantity
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {balance.actual_qty || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Reserved Quantity
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {balance.reserved_qty || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Projected Quantity
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {balance.projected_qty || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Stock Value
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                KES {balance.stock_value?.toLocaleString() || '0.00'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Valuation Rate
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                KES {balance.valuation_rate?.toLocaleString() || '0.00'}
              </Typography>
            </Box>
          </Grid>
          {balance.warehouse && (
            <Grid item xs={12}>
              <Chip label={`Warehouse: ${balance.warehouse}`} size="small" />
            </Grid>
          )}
        </Grid>
      ) : (
        <Alert severity="info">Enter an item code and click Refresh to view stock balance</Alert>
      )}
    </Paper>
  );
};

export default StockBalance;

