import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { Description } from '@mui/icons-material';
import { saveLetterhead } from '../../api/printApi';

// A logo is shown from its address, so it must be a web address and not a file on this computer
export const logoProblem = (value) => {
  const text = (value || '').trim();
  if (!text) return '';
  return /^https:\/\/\S+$/i.test(text) ? '' : 'Use the https:// address of the logo picture';
};

/**
 * The business's letter head: the header of its A4 invoices, delivery notes and purchase orders.
 * It is built from the business's name, PIN and contact details in the form above, so save those first.
 */
const LetterHeadCard = ({ company }) => {
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const problem = logoProblem(logo);

  const save = async () => {
    if (problem) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await saveLetterhead(company, { logoUrl: logo.trim() });
      setMessage('The letter head is saved. It appears at the top of your printed invoices and orders.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Description color="primary" />
          <Typography variant="h6">Letter head for printed documents</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your business name, PIN, phone and email, taken from the details above, are printed at the top of A4 invoices,
          delivery notes and purchase orders. Save the details above first, then press the button; press it again after
          you change them. The till receipt prints its own short header.
        </Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            size="small" label="Logo address (optional)" placeholder="https://..." value={logo}
            onChange={(e) => setLogo(e.target.value)} error={!!problem} helperText={problem || 'A picture of your logo on the web'}
            sx={{ minWidth: 320, flex: '1 1 320px' }}
          />
          <Button
            variant="contained" onClick={save} disabled={busy || !company || !!problem} sx={{ mt: 0.25 }}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Save letter head
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LetterHeadCard;
