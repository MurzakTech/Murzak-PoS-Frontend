import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch,
  TextField, Typography,
} from '@mui/material';
import { Add, People } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import { getUserCompany } from '../../utils/getUserCompany';
import {
  createSalesPerson, getCommissionReport, listSalesPeople, monthRange, rateProblem, updateSalesPerson,
} from '../../api/salesPeopleApi';

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY = { name: '', commissionRate: '', user: '', enabled: true };

/**
 * Sales people: who they are, their commission rate and the till login each one uses, and the commission each
 * has earned in a period. Past sales keep the rate they were made at when a rate is changed.
 */
const SalesPeople = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, person = change
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [range, setRange] = useState(monthRange);
  const [report, setReport] = useState({ rows: [], totals: {} });
  const [reportError, setReportError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const loadPeople = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      setPeople((await listSalesPeople(company, true)).map((p) => ({ ...p, id: p.name })));
    } catch (e) {
      setError(e.message);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [company]);

  const loadReport = useCallback(async () => {
    if (!company) return;
    setReportLoading(true);
    setReportError('');
    try {
      const result = await getCommissionReport(company, range);
      setReport({ rows: result.rows.map((r) => ({ ...r, id: r.sales_person })), totals: result.totals });
    } catch (e) {
      setReportError(e.message);
      setReport({ rows: [], totals: {} });
    } finally {
      setReportLoading(false);
    }
  }, [company, range]);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { loadReport(); }, [loadReport]);

  const open = (person) => {
    setEditing(person || {});
    setFormError('');
    setForm(person
      ? { name: person.sales_person_name || person.name, commissionRate: String(person.commission_rate ?? ''), user: person.user || '', enabled: !!person.enabled }
      : EMPTY);
  };

  const rateError = rateProblem(form.commissionRate);

  const save = async () => {
    if (!editing?.name && !form.name.trim()) { setFormError('Give the sales person a name.'); return; }
    if (rateError) return;
    setSaving(true);
    setFormError('');
    try {
      if (editing?.name) {
        await updateSalesPerson(company, editing.name, { commissionRate: form.commissionRate, user: form.user.trim(), enabled: form.enabled });
      } else {
        await createSalesPerson(company, { name: form.name.trim(), commissionRate: form.commissionRate, user: form.user.trim() });
      }
      dispatch(showNotification({ message: 'The sales person is saved.', severity: 'success', title: 'Sales People' }));
      setEditing(null);
      await loadPeople();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const peopleColumns = useMemo(() => [
    { field: 'sales_person_name', header: 'Name', width: '28%', render: (v, row) => v || row.name },
    { field: 'commission_rate', header: 'Commission', width: '14%', render: (v) => `${Number(v || 0)}%` },
    { field: 'user', header: 'Till login', width: '30%', render: (v) => v || <Typography variant="body2" color="text.secondary">Not linked</Typography> },
    {
      field: 'enabled', header: 'Status', width: '14%',
      render: (v) => <StatusChip status={v ? 'active' : 'inactive'} label={v ? 'Active' : 'Switched off'} />,
    },
    { field: 'name', header: '', render: (_v, row) => <Button size="small" onClick={() => open(row)}>Change</Button> },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const reportColumns = [
    { field: 'sales_person', header: 'Sales person', width: '26%' },
    { field: 'sales', header: 'Sales', width: '16%', render: (v) => money(v) },
    { field: 'returns', header: 'Returns', width: '16%', render: (v) => money(v) },
    { field: 'net_sales', header: 'Net sales', width: '16%', render: (v) => money(v) },
    { field: 'commission', header: 'Commission', width: '16%', render: (v) => <strong>{money(v)}</strong> },
    { field: 'invoices', header: 'Invoices', render: (v) => v },
  ];

  return (
    <Box>
      <PageHeader
        title="Sales People"
        subtitle="Who earns commission, and how much they have earned"
        icon={People}
        actions={[{ label: 'Add sales person', icon: <Add />, onClick: () => open(null), variant: 'contained' }]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable columns={peopleColumns} rows={people} loading={loading} rowKey="id" emptyMessage="No sales people yet. Add one to start crediting sales." />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Commission earned</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Worked out on each sale before VAT. A return takes its share back from the person who made the sale.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={range.fromDate} onChange={(e) => setRange((r) => ({ ...r, fromDate: e.target.value }))} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={range.toDate} onChange={(e) => setRange((r) => ({ ...r, toDate: e.target.value }))} />
          </Box>
          {reportError && <Alert severity="error" sx={{ mb: 2 }}>{reportError}</Alert>}
          <DataTable columns={reportColumns} rows={report.rows} loading={reportLoading} rowKey="id" emptyMessage="No sales were credited to a sales person in this period" />
          {report.rows.length > 0 && (
            <Typography variant="body2" sx={{ mt: 1.5, textAlign: 'right' }}>
              Total commission for the period: <strong>{money(report.totals.commission)}</strong>
            </Typography>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing?.name ? 'Change sales person' : 'Add sales person'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            fullWidth margin="normal" label="Name" value={form.name} disabled={!!editing?.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus={!editing?.name}
          />
          <TextField
            fullWidth margin="normal" label="Commission rate (%)" type="number" inputProps={{ min: 0, max: 100, step: '0.1' }}
            value={form.commissionRate} error={!!rateError} helperText={rateError || 'Leave empty for no commission. A change does not affect sales already made.'}
            onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Till login (email, optional)" value={form.user}
            helperText="Sales rung up with this login are credited to this person automatically"
            onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
          />
          {editing?.name && (
            <FormControlLabel
              control={<Switch checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />}
              label="Active"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !!rateError}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesPeople;
