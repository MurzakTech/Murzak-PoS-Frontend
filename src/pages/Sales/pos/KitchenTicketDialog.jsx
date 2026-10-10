import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography } from '@mui/material';
import { CheckCircle, Print } from '@mui/icons-material';

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
export const TicketSheet = ({ ticket }) => (
  <Box className="ticket-page" data-testid={`ticket-${ticket.station}`} sx={{ ...mono, p: 1.5, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff', color: '#000' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography sx={{ ...mono, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: 'inherit' }}>{ticket.station}</Typography>
      <Typography sx={{ ...mono, fontSize: 18, fontWeight: 800, color: 'inherit' }}>#{ticket.number}</Typography>
    </Box>
    <Typography sx={{ ...mono, fontSize: 20, fontWeight: 800, color: 'inherit', lineHeight: 1.2 }}>{ticket.label}</Typography>
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
 * Two steps in one dialog. First the waiter sees what will go to each station and names the
 * table. After sending, the tickets are shown as they print, and printed straight away if the
 * till is set to (they can always be printed again from here).
 */
const KitchenTicketDialog = ({ open, mode, plan, tickets, initialLabel = '', printNow, onSend, onClose }) => {
  const [label, setLabel] = useState(initialLabel);
  const printedFor = useRef(null);

  useEffect(() => {
    if (open && mode === 'review') setLabel(initialLabel);
  }, [open, mode, initialLabel]);

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" disableEnforceFocus aria-labelledby="ticket-title"
      slotProps={review ? { paper: { component: 'form', onSubmit: (e) => { e.preventDefault(); onSend(label); } } } : undefined}>
      <style>{PRINT_CSS}</style>

      {review ? (
        <>
          <DialogTitle id="ticket-title">Send to kitchen</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Table or tab name"
              placeholder="For example Table 4"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              inputProps={{ maxLength: 40 }}
              helperText="Printed on the ticket, and kept as the name if you hold this bill."
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
      ) : (
        <>
          <Box className="no-print" sx={{ textAlign: 'center', pt: 3, px: 3 }}>
            <CheckCircle sx={{ fontSize: 44, color: 'success.main' }} />
            <Typography id="ticket-title" variant="h5" sx={{ mt: 0.5 }}>Sent to the kitchen</Typography>
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
