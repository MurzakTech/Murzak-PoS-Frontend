import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

/** Shown when charging a bill that still has items the kitchen was never told about */
export const UnsentItemsDialog = ({ open, plan, onSendNow, onChargeAnyway, onClose }) => {
  const lines = plan ? plan.stations.reduce((n, g) => n + g.adds.length + g.changes.length + g.voids.length, 0) : 0;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="unsent-title">
      <DialogTitle id="unsent-title">Not sent to the kitchen yet</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {lines} item{lines === 1 ? ' on this bill has' : 's on this bill have'} not been sent to the kitchen or bar. If you charge now, they will not be told.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button color="inherit" onClick={onClose}>Go back</Button>
        <Button color="inherit" onClick={onChargeAnyway}>Charge anyway</Button>
        <Button variant="contained" onClick={onSendNow} autoFocus>Send now</Button>
      </DialogActions>
    </Dialog>
  );
};

/** Shown when clearing a bill whose items were already sent: the kitchen may already be making them */
export const ClearSentSaleDialog = ({ open, canPrintCancellation, onClear, onClearAndPrint, onClose }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="clear-sent-title">
    <DialogTitle id="clear-sent-title">Clear a bill the kitchen already has?</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        Some items on this bill were already sent to the kitchen or bar. Clearing it does not tell them.
        {canPrintCancellation ? ' You can print a cancellation ticket so they stop.' : ' Tell them yourself so they stop.'}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
      <Button color="inherit" onClick={onClose}>Keep it</Button>
      <Button color="error" onClick={onClear}>Clear sale</Button>
      {canPrintCancellation && <Button variant="contained" color="error" onClick={onClearAndPrint} autoFocus>Clear and print cancellation</Button>}
    </DialogActions>
  </Dialog>
);
