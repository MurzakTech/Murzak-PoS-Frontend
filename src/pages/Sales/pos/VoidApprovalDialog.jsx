import React, { useEffect, useState } from 'react';
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { approveVoid, listVoidApprovers } from '../../../api/industryApi';

const MIN_REASON = 3;

/**
 * Removing something the kitchen or bar already has (restaurant and bar stores). The item comes off the bill only after a
 * manager or the owner approves, with a reason; each approval is kept on the server as a Till Void and shows on the waiter
 * cash-up. A manager or the owner at the till approves their own; anyone else picks a manager, who types their password.
 *
 * lines  [{ item_code, item_name, qty, rate }] what would be removed
 */
const VoidApprovalDialog = ({ open, lines = [], billLabel, warehouse, company, onApproved, onClose }) => {
  const [info, setInfo] = useState({ status: 'loading', needsApprover: true, approvers: [], reasons: [] });
  const [reason, setReason] = useState('');
  const [approver, setApprover] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setReason('');
    setPassword('');
    setError('');
    setSaving(false);
    setInfo((prev) => ({ ...prev, status: 'loading' }));
    listVoidApprovers(company)
      .then((data) => {
        if (cancelled) return;
        const approvers = Array.isArray(data?.approvers) ? data.approvers : [];
        setInfo({ status: 'ready', needsApprover: data?.needs_approver !== false, approvers, reasons: Array.isArray(data?.reasons) ? data.reasons : [] });
        setApprover(approvers.length === 1 ? approvers[0].user : '');
      })
      .catch((e) => {
        if (!cancelled) setInfo({ status: 'error', needsApprover: true, approvers: [], reasons: [], message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [open, company]);

  const reasonOk = reason.trim().length >= MIN_REASON;
  const approverOk = !info.needsApprover || (approver && password);
  const ready = info.status === 'ready' && reasonOk && approverOk && !saving && lines.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError('');
    try {
      let approvedBy = '';
      for (const line of lines) {
        const result = await approveVoid({
          itemCode: line.item_code,
          itemName: line.item_name,
          qty: line.qty,
          rate: line.rate,
          reason: reason.trim(),
          billLabel,
          warehouse,
          approver: info.needsApprover ? approver : '',
          password: info.needsApprover ? password : '',
          company,
        });
        approvedBy = result?.approved_by_name || approvedBy;
      }
      setPassword('');
      onApproved({ approvedBy, reason: reason.trim() });
    } catch (err) {
      setError(err.message || 'The void could not be approved.');
      setSaving(false);
    }
  };

  const total = lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="void-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="void-title">Remove an item the kitchen already has</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {lines.map((l) => `${l.qty} × ${l.item_name || l.item_code}`).join(', ')}
          {billLabel ? ` on ${billLabel}` : ''}
          {total > 0 ? ` (${total.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}. A manager must approve this, and it is recorded.
        </Typography>

        {info.status === 'loading' && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} role="status">
            <CircularProgress size={18} />
            <Typography variant="body2">Checking who can approve…</Typography>
          </Stack>
        )}
        {info.status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {info.message || 'The till could not reach the server.'} The item stays on the bill until a manager can approve.
          </Alert>
        )}

        {info.reasons.length > 0 && (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }} aria-label="Quick reasons">
            {info.reasons.map((r) => (
              <Chip key={r} label={r} size="small" variant={reason === r ? 'filled' : 'outlined'} color={reason === r ? 'primary' : 'default'} onClick={() => setReason(r)} />
            ))}
          </Stack>
        )}
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          required
          inputProps={{ maxLength: 140 }}
          helperText={reason && !reasonOk ? 'Say a little more about why.' : ' '}
          sx={{ mb: 1 }}
        />

        {info.status === 'ready' && info.needsApprover && (
          <>
            {info.approvers.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This business has no manager who can approve. The owner can give someone a manager role under Settings, Team.
              </Alert>
            ) : (
              <TextField select label="Manager approving" value={approver} onChange={(e) => setApprover(e.target.value)} fullWidth required sx={{ mb: 2 }}>
                {info.approvers.map((a) => (
                  <MenuItem key={a.user} value={a.user}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Manager's password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              disabled={info.approvers.length === 0}
            />
          </>
        )}
        {info.status === 'ready' && !info.needsApprover && (
          <Alert severity="info">You are a manager, so you approve this yourself. It is still recorded.</Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} role="alert">
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Keep the item
        </Button>
        <Button type="submit" variant="contained" color="error" disabled={!ready}>
          {saving ? 'Approving…' : 'Approve and remove'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VoidApprovalDialog;
