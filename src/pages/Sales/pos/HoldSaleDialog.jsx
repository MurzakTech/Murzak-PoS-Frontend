import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { MAX_LABEL } from '../../../utils/heldSales';

/**
 * Asks what to call a bill that is being put on hold ("Table 4", "John's tab").
 * Naming is optional: pressing Enter on an empty box holds it unnamed.
 * Also used to rename a bill that is already on hold.
 */
const HoldSaleDialog = ({ open, title = 'Put this sale on hold', confirmLabel = 'Hold sale', initialLabel = '', nameInUse, onConfirm, onClose }) => {
  const [label, setLabel] = useState(initialLabel);

  // Start from the right name each time the dialog opens (a recalled tab keeps its name)
  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open, initialLabel]);

  const duplicate = Boolean(nameInUse && nameInUse(label));

  const submit = (e) => {
    e.preventDefault();
    onConfirm(label);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="hold-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="hold-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Give it a name so you can find it again, such as the table or the customer's tab. You can leave it blank.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Table or tab name (optional)"
          placeholder="For example Table 4"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          inputProps={{ maxLength: MAX_LABEL }}
          helperText={duplicate ? 'Another held sale already has this name. You can still use it.' : ' '}
          error={duplicate}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button color="inherit" onClick={onClose} sx={{ minWidth: 100 }}>Cancel</Button>
        <Button type="submit" variant="contained" sx={{ minWidth: 120 }}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HoldSaleDialog;
