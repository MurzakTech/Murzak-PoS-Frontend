import React, { useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { CloudOff, CloudUpload } from '@mui/icons-material';
import { STATUS, removeSale, retrySale, MAX_QUEUED_SALES, MAX_QUEUE_AGE_HOURS } from '../../../utils/offlineSales';
import { money } from './money';

const saleTotal = (sale) => Number(sale.receipt?.grandTotal) || 0;

/**
 * Shown on the till when it is offline or when sales are waiting to upload.
 * Lists waiting sales; ones the server refused can be retried or, after checking,
 * removed by a manager.
 */
const OfflineSalesBar = ({ online, syncing, sales, pending, needsAttention, onSyncNow }) => {
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  if (online && sales.length === 0) return null;

  const severity = needsAttention.length ? 'warning' : online ? 'info' : 'warning';
  const message = !online
    ? `Offline. Cash sales are saved on this device and upload automatically when the connection returns.${pending.length ? ` ${pending.length} waiting.` : ''}`
    : needsAttention.length
      ? `${needsAttention.length} offline sale${needsAttention.length === 1 ? ' was' : 's were'} refused by the server and need a manager.`
      : `${pending.length} offline sale${pending.length === 1 ? ' is' : 's are'} uploading.`;

  return (
    <>
      <Alert
        severity={severity}
        icon={online ? <CloudUpload fontSize="inherit" /> : <CloudOff fontSize="inherit" />}
        sx={{ borderRadius: 0, py: 0.25, '& .MuiAlert-message': { py: 0.75 } }}
        action={sales.length > 0 && (
          <Stack direction="row" spacing={1}>
            {online && pending.length > 0 && (
              <Button color="inherit" size="small" onClick={onSyncNow} disabled={syncing}
                startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : null}>
                Upload now
              </Button>
            )}
            <Button color="inherit" size="small" onClick={() => setOpen(true)}>View</Button>
          </Stack>
        )}
      >
        {message}
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sales made offline</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These sales are stored on this device until they reach the server. Up to {MAX_QUEUED_SALES} sales
            and {MAX_QUEUE_AGE_HOURS} hours can wait; signing out does not remove them.
          </Typography>
          {sales.length === 0 ? (
            <Typography variant="body2">Nothing is waiting.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sold at</TableCell>
                    <TableCell>Sale</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{sale.soldAt}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{sale.id}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(sale.payload.items || []).length} item(s) · {sale.payload.customer}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{money(saleTotal(sale))}</TableCell>
                      <TableCell>
                        {sale.status === STATUS.PENDING ? (
                          <Chip size="small" label="Waiting to upload" color="info" />
                        ) : (
                          <Box>
                            <Chip size="small" label="Refused" color="warning" />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, maxWidth: 260 }}>
                              {sale.error}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {sale.status === STATUS.NEEDS_ATTENTION && (
                          <>
                            <Button size="small" onClick={() => { retrySale(sale.id); onSyncNow(); }}>Try again</Button>
                            <Button size="small" color="error" onClick={() => setConfirmRemove(sale)}>Remove</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          {needsAttention.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              A refused sale usually means stock ran out or a price or item changed. Fix the cause (for example
              receive the missing stock), then choose Try again. The money was already taken, so only remove a
              sale after recording it another way.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmRemove)} onClose={() => setConfirmRemove(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove this sale from the device?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmRemove && `${confirmRemove.id}, ${money(saleTotal(confirmRemove))}. `}
            It will not be recorded anywhere. Only do this if you have recorded the sale another way.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(null)}>Keep it</Button>
          <Button color="error" variant="contained" onClick={() => { removeSale(confirmRemove.id); setConfirmRemove(null); }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OfflineSalesBar;
