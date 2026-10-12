import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Link, Typography } from '@mui/material';
import { CompareArrows, UploadFile } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import PageHeader from '../../components/Layout/PageHeader';
import DataTable from '../../components/Layout/DataTable';
import { getUserCompany } from '../../utils/getUserCompany';
import {
  fileProblem, getExceptions, importStatement, importSummary, matchStatement, setupPaymentMatching,
} from '../../api/paymentMatchingApi';

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsText(file);
  });

const COLUMNS = [
  { field: 'date', header: 'Date', width: '12%', render: (v) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{v}</Typography> },
  { field: 'reference', header: 'M-Pesa receipt', width: '16%' },
  {
    field: 'amount', header: 'Amount', width: '12%',
    render: (v) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>,
  },
  { field: 'problem', header: 'What is wrong', width: '26%' },
  { field: 'detail', header: 'Details' },
];

/**
 * Payment matching: upload the M-Pesa statement downloaded from the M-Pesa portal. Each paid-in line is matched to
 * the sale that holds its receipt number; whatever does not match is listed with the reason.
 */
const PaymentMatching = () => {
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);
  const input = useRef(null);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const loadList = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setListError('');
    try {
      setRows((await getExceptions(company, 3)).map((r, i) => ({ ...r, id: `${r.reference}-${i}` })));
    } catch (e) {
      setListError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { loadList(); }, [loadList]);

  const choose = (e) => {
    const chosen = e.target.files?.[0] || null;
    setFile(chosen);
    setFileError(chosen ? fileProblem(chosen) : '');
    setResult('');
    setProblems([]);
    setError('');
  };

  const send = async () => {
    const problem = fileProblem(file);
    if (problem) { setFileError(problem); return; }
    setBusy(true);
    setError('');
    setResult('');
    setProblems([]);
    try {
      await setupPaymentMatching(company); // makes the clearing and statement accounts once; safe to repeat
      const summary = await importStatement(company, await readFile(file));
      setResult(importSummary(summary));
      setProblems(summary.problems || []);
      setFile(null);
      if (input.current) input.current.value = '';
      await loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const matchAgain = async () => {
    setBusy(true);
    setError('');
    try {
      const m = await matchStatement(company);
      setResult(`${m.reconciled || 0} matched to a sale, ${m.left || 0} could not be matched.`);
      await loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Payment Matching"
        subtitle="Check M-Pesa payments against the M-Pesa statement"
        icon={CompareArrows}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Bring in the statement</Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 2 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Sign in to the M-Pesa organisation portal and download the statement for the period as a CSV file.</li>
              <li>Choose that file below and press Import. Importing the same statement again adds nothing.</li>
            </ol>
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {result && <Alert severity="success" sx={{ mb: 2 }}>{result}</Alert>}
          {problems.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Some lines of the file could not be read:</Typography>
              {problems.slice(0, 8).map((p) => <Typography key={p} variant="body2">{p}</Typography>)}
              {problems.length > 8 && <Typography variant="body2">and {problems.length - 8} more.</Typography>}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button component="label" variant="outlined" startIcon={<UploadFile />} disabled={busy}>
              {file ? file.name : 'Choose statement file'}
              <input ref={input} hidden type="file" accept=".csv,text/csv,.txt" onChange={choose} />
            </Button>
            <Button
              variant="contained" onClick={send} disabled={busy || !file || !!fileError}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Import and match
            </Button>
            <Link component="button" variant="body2" onClick={matchAgain} disabled={busy}>
              Match again (after correcting a sale)
            </Link>
          </Box>
          {fileError && <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>{fileError}</Typography>}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Payments that do not match</Typography>
      {listError && <Alert severity="error" sx={{ mb: 2 }}>{listError}</Alert>}
      <DataTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        rowKey="id"
        emptyMessage="Everything imported so far matches. Payments are checked three days after they are made."
      />
    </Box>
  );
};

export default PaymentMatching;
