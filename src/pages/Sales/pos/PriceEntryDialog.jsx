import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, IconButton, Typography, useMediaQuery } from '@mui/material';
import { Close } from '@mui/icons-material';
import Numpad from './Numpad';
import { formatBuffer, nextBuffer } from './money';

/**
 * "Enter price" keypad for products sold at a different price each time
 * (fresh produce by weight, services, repairs). It opens when a product has
 * no fixed selling price, so the cashier never sells something for zero.
 */
const PriceEntryDialog = ({ open, product, currency, onCancel, onConfirm }) => {
  const [buffer, setBuffer] = useState('');
  const fullScreen = useMediaQuery((t) => t.breakpoints.down('sm'));
  const value = parseFloat(buffer) || 0;

  useEffect(() => {
    if (open) setBuffer('');
  }, [open]);

  const press = (key) => setBuffer((b) => nextBuffer(b, key));

  const confirm = () => {
    if (value > 0) onConfirm(value);
  };

  // A physical keyboard works too: digits, Backspace, Enter to add
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (/^[0-9.]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const name = product?.item_name || product?.name || product?.item_code || '';

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullScreen={fullScreen}
      maxWidth="xs"
      fullWidth
      aria-labelledby="price-entry-title"
      slotProps={{ paper: { sx: { display: 'flex', flexDirection: 'column' } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={onCancel} aria-label="Cancel">
          <Close />
        </IconButton>
        <Typography id="price-entry-title" variant="h6" sx={{ flexGrow: 1 }}>
          Enter price
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5, gap: 2 }}>
        <Box sx={{ textAlign: 'center', pt: { xs: 2, sm: 0 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>{name}</Typography>
          <Typography variant="body2" color="text.secondary">
            This product has no fixed price. Type the price for this sale.
          </Typography>
        </Box>

        <Box
          aria-live="polite"
          aria-label="Price"
          sx={{ py: { xs: 3, sm: 2 }, textAlign: 'center', borderRadius: 3, bgcolor: (t) => t.custom.surface.sunken }}
        >
          <Typography variant="h2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            <Box component="span" sx={{ fontSize: '0.45em', color: 'text.secondary', mr: 1, fontWeight: 650 }}>{currency}</Box>
            {buffer === '' ? <Box component="span" sx={{ color: 'text.disabled' }}>0</Box> : formatBuffer(buffer)}
          </Typography>
        </Box>

        <Box sx={{ mt: { xs: 'auto', sm: 0 } }}>
          <Numpad onKey={press} />
        </Box>

        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={value <= 0}
          onClick={confirm}
          sx={{ height: 60, fontSize: '1.125rem', fontWeight: 750, borderRadius: 3 }}
        >
          Add to sale
        </Button>
      </Box>
    </Dialog>
  );
};

export default PriceEntryDialog;
