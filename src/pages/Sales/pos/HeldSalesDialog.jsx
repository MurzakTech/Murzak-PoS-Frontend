import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, Typography } from '@mui/material';
import { DeleteOutline, EditOutlined } from '@mui/icons-material';
import { money } from './money';
import PosConfirm from './PosConfirm';
import HoldSaleDialog from './HoldSaleDialog';
import { heldTitle, heldTotal, heldAge, labelInUse } from '../../../utils/heldSales';

const HeldSalesDialog = ({ open, onClose, held, onRecall, onDelete, onRename, canRecall, currency, now, status = 'unavailable' }) => {
  const shared = status === 'online' || status === 'offline'; // the server keeps held sales: some may still be only on this device
  const [discarding, setDiscarding] = useState(null); // the held sale someone is about to throw away
  const [renaming, setRenaming] = useState(null);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="held-title">
        <DialogTitle id="held-title">Held sales</DialogTitle>
        <DialogContent>
          {!canRecall && held.length > 0 && (
            <Alert severity="info" sx={{ mb: 1.5 }}>Finish or hold the current sale before bringing one back.</Alert>
          )}
          {held.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No sales are on hold.</Typography>
          ) : (
            <>
              <List disablePadding>
                {held.map((h) => {
                  const title = heldTitle(h);
                  const age = heldAge(h, now);
                  const customer = h.label && h.customer && h.customer !== 'Walk-in Customer' ? `${h.customer} · ` : '';
                  return (
                    <ListItem key={h.id} disableGutters sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{title}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {customer}{h.cart.length} item{h.cart.length === 1 ? '' : 's'} · {money(heldTotal(h), currency)}{h.heldBy ? ` · by ${h.heldBy}` : ''}
                        </Typography>
                        <Typography variant="caption" color={age.stale ? 'warning.main' : 'text.secondary'} component="div" sx={{ fontWeight: age.stale ? 700 : 400 }}>
                          Held {age.text}
                          {age.stale && <Chip label="Open a long time" size="small" color="warning" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.6875rem' }} />}
                          {shared && h.where === 'device' && <Chip label="This device only" size="small" color="info" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.6875rem' }} />}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" disabled={!canRecall} onClick={() => onRecall(h.id)}>Bring back</Button>
                      <IconButton size="small" onClick={() => setRenaming(h)} aria-label={`Rename ${title}`}><EditOutlined fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDiscarding(h)} aria-label={`Discard ${title}`}><DeleteOutline fontSize="small" /></IconButton>
                    </ListItem>
                  );
                })}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                {status === 'online' && 'Held sales are shared with every till and phone in this store.'}
                {status === 'offline' && 'The server cannot be reached right now. Bills held now stay on this device and are shared when the connection returns.'}
                {(status === 'unavailable' || status === 'checking') && 'Held sales are kept on this device only. Another till or phone cannot see them.'}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Done</Button></DialogActions>
      </Dialog>

      <PosConfirm
        open={Boolean(discarding)}
        title="Discard this held sale?"
        message={discarding ? `"${heldTitle(discarding)}" (${money(heldTotal(discarding), currency)}) will be thrown away and cannot be brought back.` : ''}
        confirmLabel="Discard"
        onClose={() => setDiscarding(null)}
        onConfirm={() => {
          onDelete(discarding.id);
          setDiscarding(null);
        }}
      />

      <HoldSaleDialog
        open={Boolean(renaming)}
        title="Rename held sale"
        confirmLabel="Save name"
        initialLabel={renaming?.label || ''}
        nameInUse={(label) => labelInUse(held, label, renaming?.id)}
        onClose={() => setRenaming(null)}
        onConfirm={(label) => {
          onRename(renaming.id, label);
          setRenaming(null);
        }}
      />
    </>
  );
};

export default HeldSalesDialog;
