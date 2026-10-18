import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from '@mui/material';
import { FactCheck, Save } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import { getUserCompany } from '../../utils/getUserCompany';
import {
  approveRequest, getApprovalSettings, listApprovals, rejectRequest, saveApprovalSettings, STATUSES,
} from '../../api/approvalsApi';

export const STATUS_COLORS = { Pending: '#F59E0B', Approved: '#10B981', Rejected: '#EF4444' };

export const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatWhen = (timestamp) => {
  if (!timestamp) return '-';
  const d = new Date(String(timestamp).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(timestamp) : d.toLocaleString();
};

// A limit field is empty, or a number that is not below zero.
export const limitProblem = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return 'Enter a number';
  if (n < 0) return 'A limit cannot be below zero';
  return '';
};

/**
 * Approvals: the limits above which a refund or a purchase order waits for a manager,
 * and the requests waiting. Approving submits the document; rejecting keeps the draft.
 */
const Approvals = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [limits, setLimits] = useState({ refundLimit: '', purchaseOrderLimit: '' });
  const [limitsError, setLimitsError] = useState('');
  const [savingLimits, setSavingLimits] = useState(false);
  const [status, setStatus] = useState('Pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const notify = useCallback((message, severity, title) => dispatch(showNotification({ message, severity, title })), [dispatch]);

  useEffect(() => {
    if (!company) return;
    getApprovalSettings(company)
      .then((s) => setLimits({ refundLimit: String(s.refundLimit), purchaseOrderLimit: String(s.purchaseOrderLimit) }))
      .catch((e) => setLimitsError(e.message));
  }, [company]);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      setRequests(await listApprovals(company, status));
    } catch (e) {
      setError(e.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [company, status]);

  useEffect(() => { load(); }, [load]);

  const problems = {
    refundLimit: limitProblem(limits.refundLimit),
    purchaseOrderLimit: limitProblem(limits.purchaseOrderLimit),
  };

  const saveLimits = async () => {
    if (problems.refundLimit || problems.purchaseOrderLimit) return;
    setSavingLimits(true);
    setLimitsError('');
    try {
      const saved = await saveApprovalSettings(company, limits);
      setLimits({ refundLimit: String(saved.refundLimit), purchaseOrderLimit: String(saved.purchaseOrderLimit) });
      notify('The approval limits are saved.', 'success', 'Approvals');
    } catch (e) {
      setLimitsError(e.message);
    } finally {
      setSavingLimits(false);
    }
  };

  const approve = async (row) => {
    setBusy(row.name);
    try {
      await approveRequest(row.name);
      notify(`${row.reference_name} was approved and submitted.`, 'success', 'Approved');
      await load();
    } catch (e) {
      notify(e.message, 'error', 'Could not approve');
    } finally {
      setBusy('');
    }
  };

  const reject = async () => {
    const row = rejecting;
    setBusy(row.name);
    try {
      await rejectRequest(row.name, reason.trim());
      notify(`${row.reference_name} was rejected. The draft is kept.`, 'info', 'Rejected');
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) {
      notify(e.message, 'error', 'Could not reject');
    } finally {
      setBusy('');
    }
  };

  const columns = useMemo(() => [
    { field: 'requested_on', header: 'Asked', width: '14%', render: (v) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatWhen(v)}</Typography> },
    { field: 'kind', header: 'What', width: '12%' },
    {
      field: 'reference_name', header: 'Document', width: '18%',
      render: (v, row) => (
        <Box>
          <Typography variant="caption" color="text.secondary">{row.reference_doctype}</Typography>
          <Typography variant="body2">{v}</Typography>
        </Box>
      ),
    },
    { field: 'amount', header: 'Amount', width: '12%', render: (v) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatAmount(v)}</Typography> },
    { field: 'requested_by', header: 'Asked by', width: '16%' },
    {
      field: 'status', header: 'Status', width: '12%',
      render: (v, row) => (
        <Box>
          <StatusChip status={(v || '').toLowerCase()} label={v} color={STATUS_COLORS[v] || '#64748B'} />
          {row.decided_by && <Typography variant="caption" color="text.secondary" display="block">{row.decided_by}</Typography>}
        </Box>
      ),
    },
    {
      field: 'name', header: '', width: '16%',
      render: (_v, row) => row.status === 'Pending' && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained" disabled={busy === row.name} onClick={() => approve(row)}>Approve</Button>
          <Button size="small" color="error" disabled={busy === row.name} onClick={() => { setRejecting(row); setReason(''); }}>Reject</Button>
        </Box>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [busy]);

  return (
    <Box>
      <PageHeader
        title="Approvals"
        subtitle="Large refunds and purchase orders wait here for a manager before they are final"
        icon={FactCheck}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Limits</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Above these amounts the document is saved as a draft and a manager must approve it. Leave a limit at 0 to switch
            that check off. Nobody except the owner can approve their own request.
          </Typography>
          {limitsError && <Alert severity="error" sx={{ mb: 2 }}>{limitsError}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              label="Refunds above" size="small" type="number" inputProps={{ min: 0, step: '0.01' }}
              value={limits.refundLimit} error={!!problems.refundLimit} helperText={problems.refundLimit || 'A refund over this amount needs approval'}
              onChange={(e) => setLimits((p) => ({ ...p, refundLimit: e.target.value }))} sx={{ width: 240 }}
            />
            <TextField
              label="Purchase orders above" size="small" type="number" inputProps={{ min: 0, step: '0.01' }}
              value={limits.purchaseOrderLimit} error={!!problems.purchaseOrderLimit} helperText={problems.purchaseOrderLimit || 'An order over this amount needs approval'}
              onChange={(e) => setLimits((p) => ({ ...p, purchaseOrderLimit: e.target.value }))} sx={{ width: 240 }}
            />
            <Button
              variant="contained" onClick={saveLimits} sx={{ mt: 0.25 }}
              disabled={savingLimits || !!problems.refundLimit || !!problems.purchaseOrderLimit}
              startIcon={savingLimits ? <CircularProgress size={16} color="inherit" /> : <Save />}
            >
              Save limits
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Requests</Typography>
        <TextField select size="small" label="Show" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 160 }}>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          <MenuItem value="">All</MenuItem>
        </TextField>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns}
        rows={requests}
        loading={loading}
        rowKey="name"
        emptyMessage={status === 'Pending' ? 'Nothing is waiting for approval' : 'No requests found'}
      />

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject {rejecting?.reference_name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The draft stays, so it can be corrected or deleted. Say why, so the person who asked knows.
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={2} label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={reject} disabled={!!busy}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Approvals;
