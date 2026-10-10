import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { CheckCircle, Print, WarningAmber } from '@mui/icons-material';
import { orderTypeOf, ticketTitle } from '../../../utils/kitchenTickets';

// Prints only the tickets (on any printer; laid out for an 80mm roll), one page per station
const PRINT_CSS = `
@media print {
  @page { margin: 3mm; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  #root, .MuiBackdrop-root, .no-print { display: none !important; }
  .MuiDialog-root, .MuiDialog-container, .MuiDialog-paper { position: static !important; display: block !important; overflow: visible !important; box-shadow: none !important; max-height: none !important; height: auto !important; margin: 0 !important; background: #fff !important; transform: none !important; }
  .ticket-printable { width: 76mm !important; max-width: 76mm !important; padding: 0 !important; margin: 0 !important; color: #000 !important; }
  .ticket-printable * { color: #000 !important; }
  .ticket-page { break-after: page; page-break-after: always; border: 0 !important; }
  .ticket-page:last-child { break-after: auto; page-break-after: auto; }
}`;

const mono = { fontFamily: 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace' };

/** One ticket, as it prints and as it is previewed */
export const TicketSheet = ({ ticket }) => {
  const counter = orderTypeOf(ticket.orderType, ticket.label) === 'counter';
  return (
  <Box className="ticket-page" data-testid={`ticket-${ticket.station}`} sx={{ ...mono, p: 1.5, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff', color: '#000' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography sx={{ ...mono, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: 'inherit' }}>{ticket.station}</Typography>
      {/* A counter order is called out by its number, so it is printed large */}
      <Typography sx={{ ...mono, fontSize: counter ? 34 : 18, fontWeight: 900, color: 'inherit', lineHeight: 1 }}>#{ticket.number}</Typography>
    </Box>
    <Typography sx={{ ...mono, fontSize: 20, fontWeight: 800, color: 'inherit', lineHeight: 1.2 }}>{ticketTitle(ticket)}</Typography>
    <Typography sx={{ ...mono, fontSize: 12, color: 'inherit', mb: 0.5 }}>
      {ticket.time}{ticket.waiter ? `  ${ticket.waiter}` : ''}  Round {ticket.round}
    </Typography>
    <Divider sx={{ borderStyle: 'dashed', borderColor: '#000', my: 0.75 }} />

    {ticket.adds.map((a, i) => (
      <Box key={`a${i}`} sx={{ mb: 0.75 }}>
        <Typography sx={{ ...mono, fontSize: 17, fontWeight: 800, color: 'inherit' }}>{a.qty} x {a.item_name}</Typography>
        {a.note && <Typography sx={{ ...mono, fontSize: 14, fontWeight: 600, fontStyle: 'italic', color: 'inherit', pl: 2 }}>- {a.note}</Typography>}
      </Box>
    ))}

    {ticket.changes.length > 0 && (
      <Box sx={{ mt: 1, mb: 0.75 }}>
        <Typography sx={{ ...mono, fontSize: 14, fontWeight: 900, color: 'inherit' }}>** CHANGE **</Typography>
        {ticket.changes.map((c, i) => (
          <Box key={`c${i}`}>
            <Typography sx={{ ...mono, fontSize: 16, fontWeight: 800, color: 'inherit' }}>{c.item_name}</Typography>
            <Typography sx={{ ...mono, fontSize: 14, fontStyle: 'italic', color: 'inherit', pl: 2 }}>- now: {c.note || '(no note)'}</Typography>
          </Box>
        ))}
      </Box>
    )}

    {ticket.voids.length > 0 && (
      <Box sx={{ mt: 1, p: 0.75, border: '2px solid #000' }}>
        <Typography sx={{ ...mono, fontSize: 15, fontWeight: 900, color: 'inherit' }}>CANCELLED, DO NOT MAKE</Typography>
        {ticket.voids.map((v, i) => (
          <Typography key={`v${i}`} sx={{ ...mono, fontSize: 16, fontWeight: 800, color: 'inherit' }}>
            {v.qty} x {v.item_name}{v.note ? ` (${v.note})` : ''}
          </Typography>
        ))}
      </Box>
    )}
  </Box>
  );
};

const Section = ({ group }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main' }}>{group.station.name}</Typography>
    {group.adds.map((a, i) => (
      <Box key={`a${i}`} sx={{ pl: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.qty} x {a.item_name}</Typography>
        {a.note && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', pl: 2 }}>{a.note}</Typography>}
      </Box>
    ))}
    {group.changes.map((c, i) => (
      <Typography key={`c${i}`} variant="body2" sx={{ pl: 1 }}>
        <Chip label="Change" size="small" color="warning" sx={{ mr: 1, height: 20 }} />
        {c.item_name}: {c.note || '(no note)'}
      </Typography>
    ))}
    {group.voids.map((v, i) => (
      <Typography key={`v${i}`} variant="body2" sx={{ pl: 1 }}>
        <Chip label="Cancel" size="small" color="error" sx={{ mr: 1, height: 20 }} />
        {v.qty} x {v.item_name}
      </Typography>
    ))}
  </Box>
);

/**
 * The waiter's steps for sending an order, in one dialog:
 *   review   see what will go to each station, say whether it is a table or a counter order, name it
 *   sending  waiting for the station screens to receive it
 *   failed   the screens did not receive it: try again, or print only (the screens will not show it)
 *   sent     the tickets as they print, printed straight away if the till is set to
 */
const KitchenTicketDialog = ({
  open,
  mode,
  plan,
  tickets,
  initialLabel = '',
  initialOrderType = 'table',
  printNow,
  toScreens = false,
  error = '',
  onSend,
  onRetry,
  onPrintOnly,
  onClose,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [orderType, setOrderType] = useState(initialOrderType);
  const printedFor = useRef(null);

  useEffect(() => {
    if (open && mode === 'review') {
      setLabel(initialLabel);
      setOrderType(initialOrderType);
    }
  }, [open, mode, initialLabel, initialOrderType]);

  // Print by itself once per set of tickets, when the till is set to
  useEffect(() => {
    if (open && mode === 'sent' && printNow && tickets.length > 0 && printedFor.current !== tickets) {
      printedFor.current = tickets;
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, mode, printNow, tickets]);

  const review = mode === 'review';
  const counter = orderType === 'counter';
  const busy = mode === 'sending';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" disableEnforceFocus aria-labelledby="ticket-title"
      slotProps={review ? { paper: { component: 'form', onSubmit: (e) => { e.preventDefault(); onSend(label, orderType); } } } : undefined}>
      <style>{PRINT_CSS}</style>

      {review && (
        <>
          <DialogTitle id="ticket-title">Send to kitchen</DialogTitle>
          <DialogContent>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              color="primary"
              value={orderType}
              onChange={(_, value) => value && setOrderType(value)}
              aria-label="Order type"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="table">Table service</ToggleButton>
              <ToggleButton value="counter">Counter order</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label={counter ? 'Name for this order (optional)' : 'Table or tab name'}
              placeholder={counter ? 'Not needed: the ticket number is called out' : 'For example Table 4'}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              inputProps={{ maxLength: 40 }}
              helperText={counter ? 'The ticket number is what the kitchen calls out. Do not put customer names here.' : 'Printed on the ticket, and kept as the name if you hold this bill.'}
              sx={{ mb: 2 }}
            />
            {plan.stations.map((g) => <Section key={g.station.id} group={g} />)}
            {plan.unrouted.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                No station is set for: {plan.unrouted.map((u) => `${u.item_name}${u.item_group ? ` (${u.item_group})` : ''}`).join(', ')}. They will not be sent. Choose a station for their category in Kitchen tickets, under the three dots menu.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button color="inherit" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<Print />}>
              {plan.stations.length > 1 ? `Send to ${plan.stations.length} stations` : 'Send'}
            </Button>
          </DialogActions>
        </>
      )}

      {busy && (
        <>
          <DialogTitle id="ticket-title">Sending to the stations</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress aria-label="Sending" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Please wait a moment.</Typography>
          </DialogContent>
        </>
      )}

      {mode === 'failed' && (
        <>
          <DialogTitle id="ticket-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmber color="warning" /> The stations did not get it
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{error || 'The server could not be reached.'}</Typography>
            <Typography variant="body2" color="text.secondary">
              Nothing has been marked as sent. You can try again, or print the tickets only; if you print only, the station screens will not show this order, so hand the paper over.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
            <Button color="inherit" onClick={onClose}>Cancel</Button>
            <Button variant="outlined" startIcon={<Print />} onClick={onPrintOnly}>Print only</Button>
            <Button variant="contained" onClick={onRetry} autoFocus>Try again</Button>
          </DialogActions>
        </>
      )}

      {mode === 'sent' && (
        <>
          <Box className="no-print" sx={{ textAlign: 'center', pt: 3, px: 3 }}>
            <CheckCircle sx={{ fontSize: 44, color: 'success.main' }} />
            <Typography id="ticket-title" variant="h5" sx={{ mt: 0.5 }}>{toScreens ? 'Sent to the station screens' : 'Sent to the kitchen'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {tickets.length === 0 ? 'Nothing to print.' : printNow ? 'Printing now. If nothing came out, press Print again.' : 'Press Print to print the tickets.'}
            </Typography>
          </Box>
          <DialogContent sx={{ pt: 0 }}>
            <Box className="ticket-printable">
              {tickets.map((t) => <TicketSheet key={t.station} ticket={t} />)}
            </Box>
          </DialogContent>
          <DialogActions className="no-print" sx={{ p: 2, gap: 1 }}>
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()} disabled={tickets.length === 0}>Print again</Button>
            <Button variant="contained" onClick={onClose}>Done</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default KitchenTicketDialog;
