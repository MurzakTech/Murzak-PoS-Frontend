import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add,
  Remove,
  DeleteOutline,
  MoreVert,
  PersonOutline,
  ShoppingBasketOutlined,
  PauseCircleOutline,
  ArrowForward,
  Check,
  LocalOfferOutlined,
  ChevronRight,
} from '@mui/icons-material';
import { fmt, money } from './money';
import ProductImage from '../../../components/Common/ProductImage';

const StepperButton = ({ children, ...props }) => (
  <IconButton
    {...props}
    sx={{ width: 40, height: 40, border: 1, borderColor: 'divider', bgcolor: 'background.paper', '&:active': { transform: 'scale(.94)' } }}
  >
    {children}
  </IconButton>
);

const CartLine = React.memo(({ item, readOnly, currency, warehouses, defaultWarehouse, onInc, onDec, onSetQty, onRemove, onChangeWarehouse }) => {
  const [anchor, setAnchor] = useState(null);
  const lineBase = item.rate * item.qty;
  const hasOffer = item.discount_amount > 0;
  const store = item.warehouse && item.warehouse !== defaultWarehouse ? warehouses.find((w) => w.name === item.warehouse) : null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center', py: 1.25 }}>
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <ProductImage product={item} shape="square" rounded={2} sx={{ width: 44 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 650 }}>
            {item.item_name || item.item_code}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {money(item.rate, currency)} each{hasOffer ? ' · offer applied' : ''}
            {store ? ` · from ${store.warehouse_name || store.name}` : ''}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        {hasOffer && (
          <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', display: 'block', lineHeight: 1 }}>
            {fmt(lineBase)}
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: hasOffer ? 'success.main' : 'text.primary' }}>
          {fmt(item.subtotal)}
        </Typography>
      </Box>

      {!readOnly ? (
        <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StepperButton onClick={() => onDec(item.item_code)} aria-label={item.qty <= 1 ? `Remove ${item.item_name}` : `One less ${item.item_name}`}>
            {item.qty <= 1 ? <DeleteOutline fontSize="small" color="error" /> : <Remove fontSize="small" />}
          </StepperButton>
          <InputBase
            value={item.qty}
            onChange={(e) => onSetQty(item.item_code, e.target.value)}
            onFocus={(e) => e.target.select()}
            inputProps={{ inputMode: 'decimal', 'aria-label': `Quantity of ${item.item_name}`, style: { textAlign: 'center' } }}
            sx={{ width: 64, height: 40, border: 1, borderColor: 'divider', borderRadius: 2, fontWeight: 700, fontSize: '1.0625rem', bgcolor: 'background.paper', fontVariantNumeric: 'tabular-nums' }}
          />
          <StepperButton onClick={() => onInc(item.item_code)} aria-label={`One more ${item.item_name}`}>
            <Add fontSize="small" />
          </StepperButton>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {item.uom}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {warehouses.length > 1 && (
            <>
              <IconButton size="small" aria-label={`More options for ${item.item_name}`} onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                <MoreVert fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <Typography variant="overline" sx={{ px: 2, color: 'text.disabled' }}>Take stock from</Typography>
                {warehouses.map((w) => (
                  <MenuItem key={w.name} onClick={() => { setAnchor(null); onChangeWarehouse(item.item_code, w.name); }}>
                    <ListItemIcon>{(item.warehouse || defaultWarehouse) === w.name ? <Check fontSize="small" /> : null}</ListItemIcon>
                    <ListItemText>{w.warehouse_name || w.name}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1', mt: -0.5 }}>
          {item.qty} {item.uom}
        </Typography>
      )}
    </Box>
  );
});
CartLine.displayName = 'CartLine';

const SummaryRow = ({ label, value, color, strong }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <Typography variant="body2" sx={{ color: color || 'text.secondary', fontWeight: strong ? 700 : 500 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: color || 'text.primary', fontWeight: strong ? 700 : 600, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Box>
);

const OrderPanel = ({
  cart,
  readOnly,
  currency,
  customer,
  onCustomerClick,
  onInc,
  onDec,
  onSetQty,
  onRemove,
  warehouses,
  defaultWarehouse,
  onChangeWarehouse,
  totals,
  manualDiscountType,
  manualDiscountValue,
  onManualDiscountChange,
  isLoadingDiscounts,
  onCheckout,
  onHold,
  onClear,
  isBusy,
  footerExtra,
}) => {
  const [discountAnchor, setDiscountAnchor] = useState(null);
  const [draftType, setDraftType] = useState('percentage');
  const [draftValue, setDraftValue] = useState('');
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);
  const empty = cart.length === 0;

  const openDiscount = (e) => {
    setDraftType(manualDiscountType);
    setDraftValue(manualDiscountValue ? String(manualDiscountValue) : '');
    setDiscountAnchor(e.currentTarget);
  };
  const applyDiscount = () => {
    onManualDiscountChange(draftType, Math.max(0, parseFloat(draftValue) || 0));
    setDiscountAnchor(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
      {/* Who is buying */}
      <ButtonBase
        onClick={onCustomerClick}
        disabled={readOnly}
        aria-label={`Customer: ${customer.name}. Tap to change.`}
        sx={{ m: 1.5, p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider', justifyContent: 'flex-start', gap: 1.25, textAlign: 'left', flexShrink: 0, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
          <PersonOutline />
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {customer.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {customer.detail}
          </Typography>
        </Box>
        {!readOnly && <ChevronRight sx={{ color: 'text.disabled' }} />}
      </ButtonBase>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 0.5, flexShrink: 0 }}>
        <Typography variant="h6">{readOnly ? 'Order' : 'Current sale'}</Typography>
        {!empty && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {fmt(itemCount)} item{itemCount === 1 ? '' : 's'}
            {isLoadingDiscounts ? ' · checking offers...' : ''}
          </Typography>
        )}
      </Box>

      {/* Lines */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, overscrollBehavior: 'contain' }}>
        {empty ? (
          <Box sx={{ height: '100%', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'text.secondary', px: 3 }}>
            <ShoppingBasketOutlined sx={{ fontSize: 44, mb: 1, opacity: 0.45 }} />
            <Typography variant="subtitle1" color="text.primary">Nothing in this sale yet</Typography>
            <Typography variant="body2">Tap a product or scan a barcode to add it.</Typography>
          </Box>
        ) : (
          cart.map((item, i) => (
            <React.Fragment key={item.item_code}>
              {i > 0 && <Divider />}
              <CartLine
                item={item}
                readOnly={readOnly}
                currency={currency}
                warehouses={warehouses}
                defaultWarehouse={defaultWarehouse}
                onInc={onInc}
                onDec={onDec}
                onSetQty={onSetQty}
                onRemove={onRemove}
                onChangeWarehouse={onChangeWarehouse}
              />
            </React.Fragment>
          ))
        )}
      </Box>

      {/* Totals and the one big action */}
      <Box sx={{ flexShrink: 0, p: 2, borderTop: 1, borderColor: 'divider', bgcolor: (t) => t.custom.surface.subtle }}>
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {totals.itemDiscount > 0 || totals.manualDiscount > 0 || totals.loyaltyDiscount > 0 ? (
            <SummaryRow label="Items" value={money(totals.itemsTotal, currency)} />
          ) : null}
          {totals.itemDiscount > 0 && <SummaryRow label="Offers" value={`-${money(totals.itemDiscount, currency)}`} color="success.main" />}
          {totals.manualDiscount > 0 && (
            <SummaryRow
              label={`Discount${manualDiscountType === 'percentage' ? ` (${manualDiscountValue}%)` : ''}`}
              value={`-${money(totals.manualDiscount, currency)}`}
              color="success.main"
            />
          )}
          {totals.loyaltyDiscount > 0 && <SummaryRow label="Loyalty points" value={`-${money(totals.loyaltyDiscount, currency)}`} color="success.main" />}
        </Stack>

        {!readOnly && !empty && (
          <Button
            size="small"
            color="inherit"
            startIcon={<LocalOfferOutlined />}
            onClick={openDiscount}
            sx={{ color: 'text.secondary', mb: 1, ml: -1 }}
          >
            {totals.manualDiscount > 0 ? 'Change discount' : 'Add discount'}
          </Button>
        )}

        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>Total</Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }} aria-live="polite">
            <Box component="span" sx={{ fontSize: '0.5em', color: 'text.secondary', mr: 0.75, fontWeight: 650 }}>{currency}</Box>
            {fmt(totals.grandTotal)}
          </Typography>
        </Box>

        {footerExtra || (
          <>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={empty || isBusy}
              onClick={onCheckout}
              endIcon={isBusy ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
              sx={{ height: 64, fontSize: '1.25rem', fontWeight: 750, borderRadius: 3, color: empty ? undefined : '#fff', background: (t) => (empty ? undefined : t.custom.gradient), boxShadow: (t) => (empty ? 'none' : `0 8px 22px ${alpha(t.palette.primary.main, 0.32)}`) }}
            >
              {empty ? 'Charge' : `Charge ${money(totals.grandTotal, currency)}`}
            </Button>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button fullWidth size="small" color="inherit" startIcon={<PauseCircleOutline />} disabled={empty} onClick={onHold} sx={{ color: 'text.secondary' }}>
                Hold sale
              </Button>
              <Button fullWidth size="small" color="inherit" startIcon={<DeleteOutline />} disabled={empty} onClick={onClear} sx={{ color: 'text.secondary' }}>
                Clear
              </Button>
            </Stack>
          </>
        )}
      </Box>

      <Popover
        open={Boolean(discountAnchor)}
        anchorEl={discountAnchor}
        onClose={() => setDiscountAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 280 }} component="form" onSubmit={(e) => { e.preventDefault(); applyDiscount(); }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Discount on the whole sale</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={draftType} onChange={(_, v) => v && setDraftType(v)} sx={{ mb: 1.5 }}>
            <ToggleButton value="percentage">Percent %</ToggleButton>
            <ToggleButton value="amount">Amount {currency}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={draftType === 'percentage' ? 'Percent off' : `Amount off (${currency})`}
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
            sx={{ mb: 1.5 }}
          />
          <Stack direction="row" spacing={1}>
            {manualDiscountValue > 0 && (
              <Button fullWidth color="inherit" onClick={() => { onManualDiscountChange('percentage', 0); setDiscountAnchor(null); }}>
                Remove
              </Button>
            )}
            <Button fullWidth variant="contained" type="submit">Apply</Button>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
};

export default OrderPanel;
