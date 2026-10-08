import React from 'react';
import { Box, Button, Dialog, DialogActions, Divider, Typography } from '@mui/material';
import { CheckCircle, Print, Receipt } from '@mui/icons-material';
import { fmt, money, round2 } from './money';

// Prints only the receipt (on any printer; it is laid out for an 80mm till roll)
const PRINT_CSS = `
@media print {
  @page { margin: 3mm; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  #root, .MuiBackdrop-root, .no-print { display: none !important; }
  .MuiDialog-root, .MuiDialog-container, .MuiDialog-paper { position: static !important; display: block !important; overflow: visible !important; box-shadow: none !important; max-height: none !important; height: auto !important; margin: 0 !important; background: #fff !important; transform: none !important; }
  .receipt-printable { width: 76mm !important; max-width: 76mm !important; padding: 0 !important; margin: 0 !important; color: #000 !important; }
  .receipt-printable * { color: #000 !important; }
}`;

const Row = ({ label, value, bold, tone }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25 }}>
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 500, color: tone || 'inherit' }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums', color: tone || 'inherit' }}>{value}</Typography>
  </Box>
);

const ReceiptDialog = ({ open, invoice, saleData, companyName, cashierName, currency, onNewSale, onPrint, onViewInvoice }) => {
  if (!invoice || !saleData) return null;

  const items = saleData.items || [];
  const itemsTotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const offers = items.reduce((s, i) => s + (i.discount_amount || 0), 0);
  const grand = invoice.grand_total || saleData.grandTotal || 0;
  const otherDiscount = round2(itemsTotal - offers - grand);
  const isCash = saleData.paymentMode === 'Cash' && saleData.amountGiven > 0;
  const change = isCash ? Math.max(0, round2(saleData.amountGiven - saleData.grandTotal)) : 0;
  const when = saleData.timestamp;

  return (
    <Dialog open={open} onClose={onNewSale} fullWidth maxWidth="xs" disableEnforceFocus aria-labelledby="receipt-title">
      <style>{PRINT_CSS}</style>

      <Box className="no-print" sx={{ textAlign: 'center', pt: 3, px: 3 }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
        <Typography id="receipt-title" variant="h4" sx={{ mt: 0.5 }}>Sale complete</Typography>
        {change > 0 ? (
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 3, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(74,222,128,.14)' : 'rgba(34,197,94,.12)') }}>
            <Typography variant="overline" color="text.secondary">Give change</Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>{money(change, currency)}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{money(grand, currency)} received</Typography>
        )}
      </Box>

      <Box className="receipt-printable" sx={{ p: 3, pt: 2.5, fontSize: '0.8125rem' }}>
        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{companyName || 'Receipt'}</Typography>
          <Typography variant="caption" color="text.secondary">Sales receipt</Typography>
        </Box>
        <Divider sx={{ borderStyle: 'dashed', mb: 1 }} />
        <Row label="Receipt no." value={invoice.name} />
        <Row label="Date" value={`${when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`} />
        <Row label="Served by" value={cashierName} />
        <Row label="Customer" value={invoice.customer || saleData.customer || 'Walk-in Customer'} />
        <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

        {items.map((item) => (
          <Box key={item.item_code} sx={{ py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>{item.item_name || item.item_code}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">{fmt(item.qty)} {item.uom} x {fmt(item.rate)}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(item.subtotal ?? item.rate * item.qty)}</Typography>
            </Box>
            {item.discount_amount > 0 && <Typography variant="caption" color="success.main">Offer: -{fmt(item.discount_amount)}</Typography>}
          </Box>
        ))}
        <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

        <Row label="Items" value={fmt(itemsTotal)} />
        {offers > 0 && <Row label="Offers" value={`-${fmt(offers)}`} />}
        {otherDiscount > 0.01 && <Row label="Discount" value={`-${fmt(otherDiscount)}`} />}
        <Row label={`TOTAL (${currency})`} value={fmt(grand)} bold />
        <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

        {(saleData.payments || []).map((p, i) => (
          <Row key={i} label={p.reference_no ? `${p.mode_of_payment || p.mode} (${p.reference_no})` : p.mode_of_payment || p.mode} value={fmt(p.amount)} />
        ))}
        {isCash && <Row label="Cash given" value={fmt(saleData.amountGiven)} />}
        {change > 0 && <Row label="Change" value={fmt(change)} bold />}

        <Typography variant="caption" color="text.secondary" align="center" component="div" sx={{ mt: 2 }}>
          Thank you for shopping with us.
        </Typography>
      </Box>

      <DialogActions className="no-print" sx={{ p: 2, gap: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        <Button variant="contained" size="large" onClick={onNewSale} autoFocus sx={{ height: 56, fontSize: '1.0625rem', fontWeight: 750 }}>
          Start next sale
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button fullWidth variant="outlined" startIcon={<Print />} onClick={onPrint}>Print receipt</Button>
          {invoice.name && <Button fullWidth variant="outlined" startIcon={<Receipt />} onClick={onViewInvoice}>View invoice</Button>}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptDialog;
