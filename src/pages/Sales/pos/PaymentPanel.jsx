import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack,
  Payments,
  CreditCard,
  PhoneAndroid,
  AccountBalance,
  ReceiptLong,
  DeleteOutline,
  Add,
  CheckCircle,
} from '@mui/icons-material';
import { cashSuggestions, fmt, formatBuffer, money, nextBuffer, round2 } from './money';
import Numpad from './Numpad';

const methodIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('cash')) return Payments;
  if (n.includes('card')) return CreditCard;
  if (n.includes('mobile') || n.includes('mpesa') || n.includes('m-pesa')) return PhoneAndroid;
  if (n.includes('bank')) return AccountBalance;
  if (n.includes('credit')) return ReceiptLong;
  return Payments;
};

const PaymentPanel = ({
  currency,
  total,
  paymentModes,
  paymentMode,
  onPaymentModeChange,
  splitPayments,
  setSplitPayments,
  payments,
  onUpdatePayment,
  onAddPayment,
  onRemovePayment,
  splitTotal,
  splitValid,
  splitCreditValid,
  amountGiven,
  setAmountGiven,
  creditAmount,
  setCreditAmount,
  creditInfo,
  hasCustomer,
  customerName,
  loyaltySlot,
  canComplete,
  onComplete,
  isCreating,
  onBack,
  onChooseCustomer,
}) => {
  const [buffer, setBuffer] = useState('');
  const isCash = paymentMode === 'Cash' && !splitPayments;
  const change = Math.max(0, round2(amountGiven - total));
  const short = round2(total - amountGiven);

  // Keep the typed buffer in step when the parent resets the amount (after a sale)
  useEffect(() => {
    if (!amountGiven && buffer !== '') setBuffer('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountGiven]);

  const commit = (next) => {
    setBuffer(next);
    setAmountGiven(Math.max(0, parseFloat(next) || 0));
  };

  const onKey = (k) => commit(nextBuffer(buffer, k));

  // A physical keyboard works too: digits, Backspace, Enter to complete
  useEffect(() => {
    if (!isCash) return undefined;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.ctrlKey || e.metaKey) return;
      if (/^[0-9.]$/.test(e.key)) onKey(e.key);
      else if (e.key === 'Backspace') onKey('back');
      else if (e.key === 'Enter' && canComplete) {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const suggestions = cashSuggestions(total);
  const nonCashMessage = !splitPayments && paymentMode !== 'Cash' && paymentMode !== 'Credit';

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'murzak-fade-up .2s ease both' }}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5, overscrollBehavior: 'contain' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button color="inherit" startIcon={<ArrowBack />} onClick={onBack} sx={{ color: 'text.secondary', ml: -1 }}>
            Back to items
          </Button>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="overline" color="text.secondary">Amount due</Typography>
          <Typography variant="h1" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', fontSize: { xs: '2.5rem', md: '3.25rem' } }}>
            <Box component="span" sx={{ fontSize: '0.45em', color: 'text.secondary', mr: 1, fontWeight: 650 }}>{currency}</Box>
            {fmt(total)}
          </Typography>
        </Box>

        {loyaltySlot}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>How is the customer paying?</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 1.25, mb: 1.5, opacity: splitPayments ? 0.5 : 1, pointerEvents: splitPayments ? 'none' : 'auto' }}>
          {paymentModes.map((mode) => {
            const Icon = methodIcon(mode);
            const selected = paymentMode === mode;
            return (
              <ButtonBase
                key={mode}
                onClick={() => onPaymentModeChange(mode)}
                aria-pressed={selected}
                sx={{
                  height: 76,
                  borderRadius: 3,
                  flexDirection: 'column',
                  gap: 0.5,
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.08) : 'background.paper',
                  color: selected ? 'primary.main' : 'text.primary',
                  fontWeight: 700,
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Icon />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{mode}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
        <FormControlLabel
          control={<Switch checked={splitPayments} onChange={(e) => setSplitPayments(e.target.checked)} />}
          label={<Typography variant="body2">Split between several methods</Typography>}
          sx={{ mb: 2 }}
        />

        {/* Cash */}
        {isCash && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">Customer gives</Typography>
              <Box
                sx={{ height: 72, px: 2, borderRadius: 3, border: 2, borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', bgcolor: 'background.paper', mb: 1.25 }}
                aria-live="polite"
              >
                <Typography variant="h3" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {buffer === '' ? <Box component="span" sx={{ color: 'text.disabled' }}>0</Box> : formatBuffer(buffer)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                {suggestions.map((v, i) => (
                  <Button key={v} variant={amountGiven === v ? 'contained' : 'outlined'} onClick={() => commit(String(v))} sx={{ height: 44, fontWeight: 700 }}>
                    {i === 0 ? 'Exact' : fmt(v)}
                  </Button>
                ))}
              </Box>
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  bgcolor: (t) => (amountGiven <= 0 ? t.custom.surface.sunken : short > 0 ? alpha(t.palette.error.main, 0.1) : alpha(t.palette.success.main, 0.14)),
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: short > 0 && amountGiven > 0 ? 'error.main' : amountGiven > 0 ? 'success.main' : 'text.secondary' }}>
                  {amountGiven <= 0 ? 'Change' : short > 0 ? 'Still to pay' : change > 0 ? 'Give change' : 'Exact amount'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: short > 0 && amountGiven > 0 ? 'error.main' : amountGiven > 0 ? 'success.main' : 'text.secondary' }}>
                  {amountGiven <= 0 ? '-' : short > 0 ? money(short, currency) : change > 0 ? money(change, currency) : 'No change'}
                </Typography>
              </Box>
            </Box>
            <Numpad onKey={onKey} />
          </Box>
        )}

        {/* Card, M-Pesa, bank and other methods */}
        {nonCashMessage && (
          <Alert severity="info" icon={false} sx={{ alignItems: 'center' }}>
            Take the {money(total, currency)} payment on your {paymentMode} terminal or phone. When it goes through, press <b>Complete sale</b>.
          </Alert>
        )}

        {/* Credit (pay later) */}
        {!splitPayments && paymentMode === 'Credit' && (
          <Stack spacing={1.5}>
            {!hasCustomer ? (
              <Alert
                severity="warning"
                action={onChooseCustomer ? <Button color="inherit" size="small" onClick={onChooseCustomer} sx={{ fontWeight: 700 }}>Choose customer</Button> : null}
              >
                Credit sales need a registered customer.
              </Alert>
            ) : (
              <>
                <TextField
                  label={`Amount on credit (${currency})`}
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  inputProps={{ step: '0.01', min: 0, max: total, inputMode: 'decimal' }}
                  helperText={`Up to ${money(total, currency)}`}
                  sx={{ maxWidth: 360 }}
                />
                {creditInfo ? (
                  <Alert severity={creditInfo.is_over_limit || creditInfo.available_credit < creditAmount ? 'error' : 'success'} icon={false}>
                    {customerName}: credit limit {money(creditInfo.credit_limit, currency)}, owes {money(creditInfo.outstanding_amount, currency)}, available <b>{money(creditInfo.available_credit, currency)}</b>
                    {creditInfo.is_over_limit ? '. Over the limit, so more credit cannot be given.' : ''}
                  </Alert>
                ) : (
                  <Alert severity="warning">Credit details for this customer are not loaded, so credit cannot be approved.</Alert>
                )}
              </>
            )}
          </Stack>
        )}

        {/* Split payments */}
        {splitPayments && (
          <Stack spacing={1.25}>
            {payments.map((p, idx) => (
              <Box key={`payment-${idx}`} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, alignItems: 'center' }}>
                <Select value={p.mode} onChange={(e) => onUpdatePayment(idx, 'mode', e.target.value)} aria-label={`Method ${idx + 1}`}>
                  {paymentModes.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
                <TextField type="number" value={p.amount} onChange={(e) => onUpdatePayment(idx, 'amount', e.target.value)} inputProps={{ min: 0, step: '0.01', inputMode: 'decimal', 'aria-label': `Amount ${idx + 1}` }} />
                <IconButton onClick={() => onRemovePayment(idx)} disabled={payments.length <= 1} aria-label="Remove this method" color="error">
                  <DeleteOutline />
                </IconButton>
              </Box>
            ))}
            <Box>
              <Button size="small" startIcon={<Add />} onClick={onAddPayment}>Add method</Button>
            </Box>
            <Alert severity={splitValid ? 'success' : 'warning'} icon={splitValid ? <CheckCircle /> : undefined}>
              {splitValid ? 'The amounts add up to the total.' : `Amounts add up to ${money(splitTotal, currency)}. They must equal ${money(total, currency)} (${round2(total - splitTotal) > 0 ? `${money(total - splitTotal, currency)} to go` : `${money(splitTotal - total, currency)} too much`}).`}
            </Alert>
            {!splitCreditValid && <Alert severity="error">The credit part is more than this customer's available credit, or no customer is selected.</Alert>}
          </Stack>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!canComplete}
          onClick={onComplete}
          startIcon={isCreating ? <CircularProgress size={22} color="inherit" /> : <CheckCircle />}
          sx={{ height: 68, fontSize: '1.375rem', fontWeight: 800, borderRadius: 3, bgcolor: 'success.main', color: 'success.contrastText', '&:hover': { bgcolor: 'success.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
        >
          {isCreating ? 'Processing...' : 'Complete sale'}
        </Button>
      </Box>
    </Box>
  );
};

export default PaymentPanel;
