import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { Security as SecurityIcon, PhonelinkLock, LockClock, Timer } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../../components/Layout/PageHeader';
import {
  getTwoFactorStatus,
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
} from '../../api/twoFactorApi';
import { IDLE_MINUTES } from '../../hooks/useIdleLogout';

// Show the setup key in groups of four so it is easy to type into a phone.
export const groupKey = (secret) => (secret || '').replace(/(.{4})/g, '$1 ').trim();

const onlyDigits = (value) => value.replace(/\D/g, '').slice(0, 6);

const CodeField = ({ value, onChange, disabled }) => (
  <TextField
    label="6-digit code"
    value={value}
    onChange={(e) => onChange(onlyDigits(e.target.value))}
    disabled={disabled}
    inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', 'aria-label': 'Authenticator code' }}
    sx={{ width: 180 }}
    size="small"
  />
);

const Security = () => {
  const [enabled, setEnabled] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getTwoFactorStatus().then(setEnabled).catch((e) => setError(e.message));
  }, []);

  const run = async (action) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const begin = () => run(async () => {
    setSetup(await startTwoFactorSetup());
    setCode('');
  });

  const confirm = () => run(async () => {
    const result = await confirmTwoFactorSetup(code);
    setEnabled(true);
    setSetup(null);
    setCode('');
    setNotice(result.message || 'Two-step sign-in is on.');
  });

  const turnOff = () => run(async () => {
    const result = await disableTwoFactor(code);
    setEnabled(false);
    setCode('');
    setNotice(result.message || 'Two-step sign-in is off.');
  });

  return (
    <Box>
      <PageHeader
        title="Security"
        subtitle="Protect your account and shared tills"
        icon={SecurityIcon}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <PhonelinkLock color="primary" />
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Two-step sign-in</Typography>
          {enabled === null ? (
            <CircularProgress size={16} />
          ) : (
            <Chip size="small" label={enabled ? 'On' : 'Off'} color={enabled ? 'success' : 'default'} />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 680 }}>
          After your password, you will also enter a 6-digit code from an authenticator app on your phone
          (Google Authenticator, Microsoft Authenticator or similar). Someone who learns your password still
          cannot sign in without your phone. Recommended for owners and managers.
        </Typography>

        {enabled === false && !setup && (
          <Button variant="contained" onClick={begin} disabled={busy}>
            Turn on two-step sign-in
          </Button>
        )}

        {setup && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>1. Scan this code with your authenticator app</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 1, width: 'fit-content', border: 1, borderColor: 'divider' }}>
                <QRCodeSVG value={setup.otpauth_uri} size={168} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Cannot scan? Enter this key in the app instead:</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: 1, mt: 0.5, wordBreak: 'break-all' }}>
                  {groupKey(setup.secret)}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>2. Enter the 6-digit code the app shows</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <CodeField value={code} onChange={setCode} disabled={busy} />
              <Button variant="contained" onClick={confirm} disabled={busy || code.length !== 6}>
                Confirm and turn on
              </Button>
              <Button onClick={() => { setSetup(null); setCode(''); }} disabled={busy}>Cancel</Button>
            </Stack>
          </Box>
        )}

        {enabled && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              To turn it off, enter a current code from your app.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <CodeField value={code} onChange={setCode} disabled={busy} />
              <Button color="error" variant="outlined" onClick={turnOff} disabled={busy || code.length !== 6}>
                Turn off
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <LockClock color="primary" />
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Protection against password guessing</Typography>
          <Chip size="small" label="Always on" color="success" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
          After 5 wrong passwords or codes within 15 minutes, the account is locked for 15 minutes.
          If a staff member is locked out, they can wait or reset their password.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Timer color="primary" />
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Automatic sign-out</Typography>
          <Chip size="small" label="Always on" color="success" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
          A device left untouched for {IDLE_MINUTES} minutes signs out on its own, after a one-minute
          warning, so nobody can use an unattended till under someone else's name.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Security;
