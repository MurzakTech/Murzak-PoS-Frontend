import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, CircularProgress, IconButton, MenuItem, TextField, Typography,
} from '@mui/material';
import { Add, Delete, DeleteSweep } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showNotification } from '../../store/notificationSlice';
import PageHeader from '../../components/Layout/PageHeader';
import DataTable from '../../components/Layout/DataTable';
import { getUserCompany } from '../../utils/getUserCompany';
import { getWastageReport, listWarehouseNames, recordWastage, searchItems, wastageProblem } from '../../api/recipesApi';
import { money } from './Recipes';

const isoDate = (d) => d.toISOString().split('T')[0];
const emptyLine = () => ({ key: Math.random().toString(36).slice(2), item: null, qty: '' });

const ItemPicker = ({ company, value, onChange, label, disabled }) => {
  const [options, setOptions] = useState([]);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!company) return undefined;
    let current = true;
    const t = setTimeout(() => {
      searchItems(company, text).then((rows) => { if (current) setOptions(rows); }).catch(() => {});
    }, 250);
    return () => { current = false; clearTimeout(t); };
  }, [company, text]);
  return (
    <Autocomplete
      size="small" disabled={disabled} options={options} value={value}
      getOptionLabel={(o) => (o ? o.item_name || o.item_code : '')}
      isOptionEqualToValue={(a, b) => a.item_code === b.item_code}
      filterOptions={(x) => x} onInputChange={(_e, v) => setText(v)} onChange={(_e, v) => onChange(v)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
};

/**
 * Wastage: stock that was spoiled, burnt or dropped is written off with a reason. A dish wasted is taken out as its
 * ingredients. The report shows what was written off, by item and by day.
 */
const Wastage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { fromDate: isoDate(from), toDate: isoDate(now) };
  });
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (company) listWarehouseNames(company).then(setWarehouses).catch(() => {}); }, [company]);

  const loadReport = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setReportError('');
    try {
      setReport(await getWastageReport(company, range));
    } catch (e) {
      setReportError(e.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [company, range]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const items = lines.map((l) => ({ item_code: l.item?.item_code, qty: l.qty }));
  const problem = wastageProblem({ warehouse, reason, items });
  const setLine = (key, changes) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const save = async () => {
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    try {
      const result = await recordWastage(company, { warehouse, reason: reason.trim(), items });
      dispatch(showNotification({ message: `Wastage recorded (${money(result.total_value)} written off).`, severity: 'success', title: 'Wastage' }));
      setReason('');
      setLines([emptyLine()]);
      await loadReport();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    { field: 'item_name', header: 'Item', width: '40%', render: (v, row) => v || row.item_code },
    { field: 'qty', header: 'Quantity', width: '20%', render: (v, row) => `${v} ${row.uom || ''}` },
    { field: 'value', header: 'Value', render: (v) => money(v) },
  ];
  const entryColumns = [
    { field: 'date', header: 'Date', width: '16%' },
    { field: 'reason', header: 'Why', width: '44%' },
    { field: 'warehouse', header: 'Store', width: '24%' },
    { field: 'value', header: 'Value', render: (v) => money(v) },
  ];

  return (
    <Box>
      <PageHeader title="Wastage" subtitle="Write off spoiled, burnt or dropped stock, with the reason" icon={DeleteSweep} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Record wastage</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField select size="small" label="Store" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} sx={{ minWidth: 240 }} disabled={saving}>
              {warehouses.map((w) => <MenuItem key={w} value={w}>{w}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Why was it wasted?" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: '1 1 260px' }} disabled={saving} placeholder="e.g. burnt, expired, dropped" />
          </Box>
          {lines.map((l, index) => (
            <Box key={l.key} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ flex: '2 1 260px' }}>
                <ItemPicker company={company} label={`Item ${index + 1} (a dish is taken out as its ingredients)`} value={l.item} onChange={(v) => setLine(l.key, { item: v })} disabled={saving} />
              </Box>
              <TextField size="small" label="Quantity" type="number" inputProps={{ min: 0, step: 'any' }} value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} sx={{ flex: '0 1 130px' }} disabled={saving} />
              <IconButton aria-label="Remove line" disabled={saving || lines.length === 1} onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}><Delete /></IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button startIcon={<Add />} onClick={() => setLines((prev) => [...prev, emptyLine()])} disabled={saving}>Add item</Button>
            <Button variant="contained" onClick={save} disabled={saving || !!problem} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
              Record wastage
            </Button>
          </Box>
          {problem && (warehouse || reason || lines.some((l) => l.item)) && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{problem}</Typography>}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">What was written off</Typography>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={range.fromDate} onChange={(e) => setRange((r) => ({ ...r, fromDate: e.target.value }))} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={range.toDate} onChange={(e) => setRange((r) => ({ ...r, toDate: e.target.value }))} />
      </Box>
      {reportError && <Alert severity="error" sx={{ mb: 2 }}>{reportError}</Alert>}
      {report && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Total written off in this period: <strong>{money(report.total_value)}</strong> in {report.entries_count} entries.
        </Typography>
      )}
      <DataTable columns={itemColumns} rows={(report?.items || []).map((r) => ({ ...r, id: r.item_code }))} loading={loading} rowKey="id" emptyMessage="No wastage in this period" />
      {report?.entries?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Latest entries</Typography>
          <DataTable columns={entryColumns} rows={report.entries.map((r) => ({ ...r, id: r.name }))} rowKey="id" />
        </Box>
      )}
    </Box>
  );
};

export default Wastage;
