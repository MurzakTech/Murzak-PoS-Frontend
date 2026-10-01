import React, { useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Autocomplete,
  GridLegacy as Grid,
  Typography,
  Alert,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Controller, useFieldArray } from 'react-hook-form';

/**
 * TransferItemForm Component
 * Form component for adding/editing transfer items
 * 
 * @param {Object} props - Component props
 * @param {Object} props.control - React Hook Form control object
 * @param {Array} props.items - Available items for selection
 * @param {Function} [props.onItemChange] - Callback when item changes
 * @param {boolean} [props.showAddButton=true] - Show add item button
 * @param {boolean} [props.showDeleteButton=true] - Show delete item button
 * @param {string} [props.quantityLabel='Quantity'] - Label for quantity field
 * @param {string} [props.quantityField='qty'] - Field name for quantity
 * @returns {JSX.Element} Item form component
 * 
 * @example
 * <TransferItemForm
 *   control={control}
 *   items={products}
 *   onItemChange={(item) => checkStock(item)}
 * />
 */
const TransferItemForm = ({
  control,
  items = [],
  onItemChange,
  showAddButton = true,
  showDeleteButton = true,
  quantityLabel = 'Quantity',
  quantityField = 'qty',
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Ensure at least one item field exists
  useEffect(() => {
    if (fields.length === 0) {
      append({ item_code: '', [quantityField]: 1 });
    }
  }, [fields.length, append, quantityField]);

  const handleAddItem = () => {
    append({ item_code: '', [quantityField]: 1 });
  };

  const handleItemChange = (index, newValue) => {
    if (onItemChange && newValue) {
      onItemChange(newValue, index);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Items</Typography>
        {showAddButton && (
          <IconButton
            color="primary"
            onClick={handleAddItem}
            aria-label="Add item"
          >
            <Add />
          </IconButton>
        )}
      </Box>

      {fields.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please add at least one item to transfer
        </Alert>
      )}

      <Grid container spacing={2}>
        {fields.map((field, index) => (
          <Grid item xs={12} key={field.id}>
            <Box
              display="flex"
              gap={2}
              alignItems="flex-start"
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Box flex={1}>
                <Controller
                  name={`items.${index}.item_code`}
                  control={control}
                  rules={{ required: 'Item is required' }}
                  render={({ field: itemField, fieldState: { error } }) => (
                    <Autocomplete
                      {...itemField}
                      options={items}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option.item_name || option.item_code || '';
                      }}
                      isOptionEqualToValue={(option, value) => {
                        const optCode = typeof option === 'string' ? option : option.item_code;
                        const valCode = typeof value === 'string' ? value : value?.item_code;
                        return optCode === valCode;
                      }}
                      onChange={(_, newValue) => {
                        itemField.onChange(
                          typeof newValue === 'string'
                            ? newValue
                            : newValue?.item_code || ''
                        );
                        handleItemChange(index, newValue);
                      }}
                      onInputChange={(_, newInputValue) => {
                        // Allow free text input for item codes
                        if (newInputValue && !items.find((i) => i.item_code === newInputValue)) {
                          itemField.onChange(newInputValue);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Item Code"
                          placeholder="Select or type item code"
                          error={!!error}
                          helperText={error?.message}
                          fullWidth
                        />
                      )}
                    />
                  )}
                />
              </Box>

              <Box sx={{ width: 150 }}>
                <Controller
                  name={`items.${index}.${quantityField}`}
                  control={control}
                  rules={{
                    required: `${quantityLabel} is required`,
                    min: { value: 0.01, message: `${quantityLabel} must be greater than 0` },
                  }}
                  render={({ field: qtyField, fieldState: { error } }) => (
                    <TextField
                      {...qtyField}
                      label={quantityLabel}
                      type="number"
                      inputProps={{ min: 0.01, step: 0.01 }}
                      error={!!error}
                      helperText={error?.message}
                      fullWidth
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        qtyField.onChange(value > 0 ? value : '');
                      }}
                    />
                  )}
                />
              </Box>

              {showDeleteButton && fields.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() => remove(index)}
                  aria-label="Remove item"
                  sx={{ mt: 1 }}
                >
                  <Delete />
                </IconButton>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TransferItemForm;

