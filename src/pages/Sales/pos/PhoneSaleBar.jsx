import React from 'react';
import { Badge, Box, Button, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ShoppingBasketOutlined, ExpandLess, ArrowForward } from '@mui/icons-material';
import { fmt, money } from './money';

/**
 * Bottom bar for the till on phones. The product grid gets the whole screen;
 * the sale itself is one tap away ("View sale" slides it up) and the Charge
 * button is always under the thumb.
 */
const PhoneSaleBar = ({ itemCount, total, currency, onViewSale, onCharge, disabled }) => {
  const empty = itemCount === 0;
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        gap: 1,
        p: 1.25,
        pb: 'calc(10px + env(safe-area-inset-bottom))',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: (t) => `0 -6px 18px ${alpha(t.palette.common.black, t.palette.mode === 'dark' ? 0.4 : 0.06)}`,
      }}
    >
      <ButtonBase
        onClick={onViewSale}
        aria-label={empty ? 'View sale, no items yet' : `View sale, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        sx={{ pl: 1.5, pr: 1.75, height: 56, borderRadius: 3, border: 1, borderColor: 'divider', gap: 2, flexShrink: 0 }}
      >
        <Badge badgeContent={empty ? null : fmt(itemCount)} color="primary" max={999} key={itemCount} sx={{ '& .MuiBadge-badge': { fontWeight: 800, animation: empty ? 'none' : 'murzak-pop .25s ease' } }}>
          <ShoppingBasketOutlined />
        </Badge>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Sale</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', lineHeight: 1.2 }}>
            View <ExpandLess sx={{ fontSize: 16 }} />
          </Typography>
        </Box>
      </ButtonBase>

      <Button
        fullWidth
        variant="contained"
        disabled={empty || disabled}
        onClick={onCharge}
        endIcon={<ArrowForward />}
        sx={{
          height: 56,
          fontSize: '1.125rem',
          fontWeight: 750,
          borderRadius: 3,
          color: empty ? undefined : '#fff',
          background: (t) => (empty ? undefined : t.custom.gradient),
          whiteSpace: 'nowrap',
        }}
      >
        {empty ? 'Charge' : `Charge ${money(total, currency)}`}
      </Button>
    </Box>
  );
};

export default PhoneSaleBar;
