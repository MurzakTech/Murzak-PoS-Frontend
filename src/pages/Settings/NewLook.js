import React, { useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/Layout/PageHeader';
import { ConfirmDialog } from '../../components/Common';
import { useNewLook } from '../../newlook/NewLookProvider';

/**
 * Settings > New look. Owners only (the menu hides it from everyone else and the server refuses anyone
 * else). One switch for the whole shop: off shows the app as it has always been, on shows the redesigned
 * screens that are ready and leaves every other screen as it is. Switching back is instant and changes
 * no sale, stock figure or account.
 */
const NewLook = () => {
  const { enabled, status, company, setEnabled } = useNewLook();
  const [confirmOn, setConfirmOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const known = status === 'ready' || status === 'error';

  const save = async (value) => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await setEnabled(value);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setConfirmOn(false);
    }
  };

  const onToggle = (event) => {
    // Turning it on changes what every person in the shop sees, so it asks first. Turning it off does not.
    if (event.target.checked) setConfirmOn(true);
    else save(false);
  };

  return (
    <Box>
      <PageHeader title="New look" subtitle="Show this shop the redesigned screens" icon={AutoAwesome} />

      {status === 'error' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          We could not check the setting just now, so this page may be out of date. Reload to try again.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2, maxWidth: 760 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
            New look{company ? ` for ${company}` : ''}
          </Typography>
          {known ? (
            <Chip size="small" label={enabled ? 'On' : 'Off'} color={enabled ? 'success' : 'default'} />
          ) : (
            <CircularProgress size={16} aria-label="Checking" />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The New look is on by default. While it is on, people see the redesigned screens, and the few screens that have not
          been redesigned stay as they were. If you turn it off, everyone in the shop sees the app exactly as it was before. You
          can switch back at any time; no sale, stock figure or account changes either way.
        </Typography>

        <FormControlLabel
          control={<Switch checked={enabled} onChange={onToggle} disabled={!known || busy} />}
          label="Use the New look in this shop"
        />

        <Box sx={{ minHeight: 28, mt: 1 }} aria-live="polite">
          {busy && <CircularProgress size={16} aria-label="Saving" />}
          {saved && !busy && (
            <Typography variant="body2" color="success.main">
              Saved. The change reaches each device the next time it signs in or reloads.
            </Typography>
          )}
        </Box>

        {enabled && (
          <Button component={RouterLink} to="/" variant="outlined" sx={{ mt: 1 }}>
            Open Home
          </Button>
        )}
      </Paper>

      <ConfirmDialog
        open={confirmOn}
        onClose={() => setConfirmOn(false)}
        onConfirm={() => save(true)}
        loading={busy}
        title="Turn on the New look?"
        message="Everyone who signs in at this shop will see the redesigned screens that are ready. It is best to do this when the till is closed or no cashier has items in the cart. You can switch it off again here at any time."
        confirmText="Turn on"
        cancelText="Keep it off"
        variant="info"
      />
    </Box>
  );
};

export default NewLook;
