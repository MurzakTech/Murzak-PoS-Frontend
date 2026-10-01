import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

// Small, touch-friendly confirmation used for actions that would lose a sale in progress
const PosConfirm = ({ open, title, message, confirmLabel, cancelLabel = 'Cancel', danger = true, onConfirm, onClose }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="pos-confirm-title">
    <DialogTitle id="pos-confirm-title">{title}</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </DialogContent>
    <DialogActions sx={{ p: 2, gap: 1 }}>
      <Button color="inherit" onClick={onClose} sx={{ minWidth: 100 }}>{cancelLabel}</Button>
      <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} autoFocus sx={{ minWidth: 120 }}>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

export default PosConfirm;
