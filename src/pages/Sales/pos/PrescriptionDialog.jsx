import React, { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography } from '@mui/material';
import { cleanDispensing, isDispensingComplete } from '../../../utils/prescription';

/**
 * Shown before charging a sale that includes prescription-only medicines. The pharmacist says who the medicine
 * is for and who prescribed it, and confirms the prescription was seen. The record is kept on the invoice.
 */
const PrescriptionDialog = ({ open, items, initial, onConfirm, onClose }) => {
  const [form, setForm] = useState(cleanDispensing(initial));
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(cleanDispensing(initial));
      setSeen(false);
    }
  }, [open, initial]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const ready = isDispensingComplete(form) && seen;

  const submit = (e) => {
    e.preventDefault();
    if (ready) onConfirm(cleanDispensing(form));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="rx-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="rx-title">Prescription-only medicines</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          This sale includes: <strong>{(items || []).join(', ')}</strong>. These are only sold against a valid prescription. The details below are kept on the invoice.
        </Alert>
        <TextField autoFocus fullWidth size="small" label="Patient's name" value={form.patient} onChange={set('patient')} inputProps={{ maxLength: 140 }} sx={{ mb: 2 }} />
        <TextField fullWidth size="small" label="Prescribed by" placeholder="Doctor or clinic" value={form.prescriber} onChange={set('prescriber')} inputProps={{ maxLength: 140 }} sx={{ mb: 2 }} />
        <TextField fullWidth size="small" label="Prescription number (optional)" value={form.reference} onChange={set('reference')} inputProps={{ maxLength: 60 }} sx={{ mb: 1 }} />
        <FormControlLabel
          control={<Checkbox checked={seen} onChange={(e) => setSeen(e.target.checked)} />}
          label={<Typography variant="body2">I have seen a valid prescription for these medicines</Typography>}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!ready}>Continue to payment</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrescriptionDialog;
