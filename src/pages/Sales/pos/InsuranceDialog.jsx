import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { copayFor, isInsuranceComplete } from '../../../utils/insurance';
import { money } from './money';

/**
 * Pharmacies at the till: billing a patient's medicines to their medical insurer. The patient pays the co-payment now
 * and the rest stays owed by the insurer, as a claim. The dialog only asks; the till does the work (see NewSale.js).
 */

/** The insurance button above the bill's main action, and the insurer the bill is for */
export const InsuranceToolbar = ({ insurance, onOpen, onClear }) => (
  <Box sx={{ mb: 1.5 }}>
    {insurance ? (
      <Chip
        color="secondary"
        size="small"
        label={`${insurance.insurer} · ${insurance.member_no}`}
        onDelete={onClear}
        sx={{ mb: 1, mr: 1 }}
        aria-label={`Billed to ${insurance.insurer}`}
      />
    ) : null}
    <Button size="small" variant="outlined" onClick={onOpen} sx={{ minHeight: 40 }}>
      {insurance ? 'Change insurance' : 'Insurance'}
    </Button>
  </Box>
);

const BLANK = { insurer: '', patient: '', member_no: '', scheme: '', preauth: '' };

/** Who the insurer is and the patient's card details; shows the split of the current bill */
export const InsuranceDialog = ({ open, insurers = [], value, total = 0, currency = 'KES', creditReady = true, onSave, onClose }) => {
  const [form, setForm] = useState(BLANK);
  useEffect(() => {
    if (open) setForm(value ? { ...BLANK, ...value } : { ...BLANK, insurer: insurers[0]?.name || '' });
  }, [open, value, insurers]);
  const insurer = insurers.find((i) => i.name === form.insurer);
  const copay = copayFor(insurer, total);
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const ready = Boolean(insurer && insurer.customer) && isInsuranceComplete(form) && creditReady;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="insurance-title">
      <DialogTitle id="insurance-title">Bill to insurance</DialogTitle>
      <DialogContent>
        {insurers.length === 0 ? (
          <Alert severity="info">No insurers are set. The owner or a manager adds them under Settings, Business, Medical insurers.</Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!creditReady ? (
              <Alert severity="warning">Credit sales are switched off. Switch on the Credit payment method in Settings first: the insurer's share is kept as owed.</Alert>
            ) : null}
            <TextField select label="Insurer" value={form.insurer} onChange={set('insurer')}>
              {insurers.map((i) => (
                <MenuItem key={i.name} value={i.name}>
                  {i.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Patient's name" value={form.patient} onChange={set('patient')} inputProps={{ maxLength: 140 }} autoComplete="off" required />
            <TextField label="Member number" helperText="As on the insurance card" value={form.member_no} onChange={set('member_no')} inputProps={{ maxLength: 60 }} autoComplete="off" required />
            <TextField label="Scheme or employer (optional)" value={form.scheme} onChange={set('scheme')} inputProps={{ maxLength: 140 }} autoComplete="off" />
            <TextField label="Pre-authorisation number (optional)" value={form.preauth} onChange={set('preauth')} inputProps={{ maxLength: 60 }} autoComplete="off" />
            {insurer ? (
              <Box role="status" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2">
                  Patient pays now: <strong>{money(copay, currency)}</strong>
                </Typography>
                <Typography variant="body2">
                  {insurer.name} owes: <strong>{money(Math.max(total - copay, 0), currency)}</strong>
                </Typography>
              </Box>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              Check the card and the patient's ID before dispensing. The claim shows under Reports, Insurance claims.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!ready}
          onClick={() =>
            onSave({
              insurer: insurer.name,
              customer: insurer.customer,
              rule: insurer,
              patient: form.patient.trim(),
              member_no: form.member_no.trim(),
              scheme: form.scheme.trim(),
              preauth: form.preauth.trim(),
            })
          }
        >
          Bill to {insurer?.name || 'insurer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
