import React from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, Typography } from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { money } from './money';

const HeldSalesDialog = ({ open, onClose, held, onRecall, onDelete, canRecall, currency }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="held-title">
    <DialogTitle id="held-title">Held sales</DialogTitle>
    <DialogContent>
      {!canRecall && held.length > 0 && (
        <Alert severity="info" sx={{ mb: 1.5 }}>Finish or hold the current sale before bringing one back.</Alert>
      )}
      {held.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No sales are on hold.</Typography>
      ) : (
        <List disablePadding>
          {held.map((h) => {
            const total = h.cart.reduce((s, i) => s + (i.subtotal || 0), 0);
            return (
              <ListItem key={h.id} disableGutters sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{h.customer || 'Walk-in Customer'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {h.cart.length} item{h.cart.length === 1 ? '' : 's'} · {money(total, currency)} · held at {new Date(h.heldAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" disabled={!canRecall} onClick={() => onRecall(h.id)}>Bring back</Button>
                <IconButton size="small" color="error" onClick={() => onDelete(h.id)} aria-label="Discard this held sale"><DeleteOutline fontSize="small" /></IconButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Done</Button></DialogActions>
  </Dialog>
);

export default HeldSalesDialog;
