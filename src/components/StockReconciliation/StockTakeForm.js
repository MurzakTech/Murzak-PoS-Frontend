import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useStockReconciliationByRole } from '../../hooks/useStockReconciliationByRole';

/**
 * Stock Take Form Component
 * Dynamic form for adding stock take based on user role
 * 
 * @param {Object} props
 * @param {string} props.reconciliationName - Reconciliation name
 * @param {Function} [props.onSuccess] - Callback when stock take is added successfully
 * @returns {JSX.Element}
 */
const StockTakeForm = ({ reconciliationName, onSuccess }) => {
  const {
    addStockTake,
    getReconciliation,
    reconciliation,
    loading,
    isLoadingAction,
    error,
    canAddStockTake,
    canSubmit,
    userRole,
    roleLabel,
  } = useStockReconciliationByRole();

  const [items, setItems] = useState([]);
  const [generalComment, setGeneralComment] = useState('');
  const [submitOnComplete, setSubmitOnComplete] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Load reconciliation on mount
  useEffect(() => {
    if (reconciliationName) {
      getReconciliation(reconciliationName);
    }
  }, [reconciliationName, getReconciliation]);

  // Initialize items from reconciliation
  useEffect(() => {
    if (reconciliation?.items) {
      const initialItems = reconciliation.items.map((item) => ({
        item_code: item.item_code,
        qty: item.qty || 0,
        comment: '',
      }));
      setItems(initialItems);
    }
  }, [reconciliation]);

  const updateItemQty = (itemCode, qty) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_code === itemCode ? { ...item, qty: parseFloat(qty) || 0 } : item
      )
    );
  };

  const updateItemComment = (itemCode, comment) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_code === itemCode ? { ...item, comment } : item
      )
    );
  };

  const validateForm = () => {
    if (items.length === 0) {
      return 'At least one item is required';
    }

    const invalidItems = items.filter((item) => {
      if (!item.item_code) return true;
      if (item.qty === null || item.qty === undefined || item.qty < 0) return true;
      return false;
    });

    if (invalidItems.length > 0) {
      return 'Please ensure all items have valid quantities (≥ 0)';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canAddStockTake) {
      return;
    }

    // Validate form
    const validationErrorMsg = validateForm();
    if (validationErrorMsg) {
      setValidationError(validationErrorMsg);
      return;
    }
    setValidationError(null);

    try {
      const payload = {
        reconciliation_name: reconciliationName,
        items: items
          .filter((item) => item.item_code) // Filter out empty items
          .map((item) => ({
            item_code: item.item_code,
            qty: parseFloat(item.qty) || 0,
            ...(item.comment && { comment: item.comment }),
          })),
        ...(generalComment && { comment: generalComment }),
      };

      // Validate that we have at least one item after filtering
      if (payload.items.length === 0) {
        return;
      }

      // Add submit flag for Stock Manager (explicitly set to false if not checked, since API defaults to true)
      if (userRole === 'Stock Manager' && canSubmit) {
        payload.submit = submitOnComplete;
      }

      const result = await addStockTake(payload);

      if (result.type?.includes('/fulfilled')) {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Error adding stock take:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!reconciliation) {
    return (
      <Alert severity="error">
        Reconciliation not found. Please check the reconciliation name.
      </Alert>
    );
  }

  // Get current quantities from stock taking records
  const getCurrentQty = (itemCode) => {
    const record = reconciliation.stock_taking_records?.find(
      (r) => r.item_code === itemCode
    );
    return record?.current_qty ?? null;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {roleLabel} Stock Take
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reconciliation: <strong>{reconciliationName}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: <strong>{reconciliation.workflow_state}</strong>
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {validationError && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setValidationError(null)}>
          {validationError}
        </Alert>
      )}

      {!canAddStockTake && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You cannot add stock take at the current workflow stage. Current status: {reconciliation.workflow_state}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        {/* General Comment */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="General Comment"
            multiline
            rows={3}
            fullWidth
            value={generalComment}
            onChange={(e) => setGeneralComment(e.target.value)}
            disabled={isLoadingAction || !canAddStockTake}
            placeholder="Add any general comments about this stock take..."
          />
        </Box>

        {/* Items Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Code</TableCell>
                <TableCell align="right">Current Qty</TableCell>
                <TableCell align="right">Counted Qty *</TableCell>
                <TableCell>Comment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No items found in this reconciliation
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const currentQty = getCurrentQty(item.item_code);

                  return (
                    <TableRow key={item.item_code}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {currentQty !== null ? currentQty : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItemQty(item.item_code, e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          required
                          disabled={isLoadingAction || !canAddStockTake}
                          size="small"
                          sx={{ width: 120 }}
                          error={item.qty < 0}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="text"
                          value={item.comment || ''}
                          onChange={(e) => updateItemComment(item.item_code, e.target.value)}
                          placeholder="Item comment"
                          disabled={isLoadingAction || !canAddStockTake}
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Submit Checkbox (Stock Manager only) */}
        {userRole === 'Stock Manager' && canSubmit && (
          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={submitOnComplete}
                  onChange={(e) => setSubmitOnComplete(e.target.checked)}
                  disabled={isLoadingAction || !canAddStockTake}
                />
              }
              label="Submit reconciliation after adding stock take"
            />
          </Box>
        )}

        {/* Submit Button */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoadingAction || !canAddStockTake || items.length === 0}
            startIcon={isLoadingAction ? <CircularProgress size={20} /> : <Save />}
          >
            {isLoadingAction
              ? 'Saving...'
              : userRole === 'Stock Manager' && submitOnComplete
              ? 'Add Stock Take & Submit'
              : 'Add Stock Take'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default StockTakeForm;

