import React, { useCallback, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Stack, Typography,
} from '@mui/material';
import { CloudOff, LockOutlined } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import useIdleSignOut from '../hooks/useIdleSignOut';

/**
 * Signs a shared till out when nobody has used it for a while, so the next
 * person cannot carry on under someone else's name. Warns a minute before.
 *
 * Offline resilience: If the till is offline when the timer expires, it engages
 * an "Offline Lock Screen" instead of calling logout(). This protects the open shift,
 * offline sales queue, and cached catalog from being destructively wiped while
 * allowing the cashier to unlock and resume selling.
 */
const IdleSignOut = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [isLocked, setIsLocked] = useState(false);

  const signOut = useCallback(() => {
    dispatch(logout());
    window.location.assign('/login?reason=idle');
  }, [dispatch]);

  const handleTimeout = useCallback(() => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      // Lock the terminal without destroying the offline session, shift, or catalog
      setIsLocked(true);
    } else {
      signOut();
    }
  }, [signOut]);

  const { secondsLeft, stayActive } = useIdleSignOut({
    enabled: !!isAuthenticated && !isLocked,
    onTimeout: handleTimeout,
  });

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    stayActive();
  }, [stayActive]);

  // Offline Locked Modal
  if (isLocked) {
    return (
      <Dialog
        open={isLocked}
        aria-labelledby="offline-lock-title"
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { p: 1, borderRadius: 3 } }}
      >
        <DialogTitle id="offline-lock-title" sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '50%', bgcolor: 'warning.light', color: 'warning.contrastText', mb: 1 }}>
            <LockOutlined fontSize="large" />
          </Box>
          <Typography variant="h6" component="div" fontWeight={700}>
            Terminal Locked
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, textAlign: 'center' }}>
            <Alert severity="warning" icon={<CloudOff fontSize="inherit" />} sx={{ textAlign: 'left' }}>
              Device is currently <strong>offline</strong>. Your open shift and cached catalog are preserved.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Cashier: <strong>{user?.full_name || user?.name || user?.email || 'Active Operator'}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tap Unlock to resume selling on this till.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
          <Button variant="contained" fullWidth size="large" onClick={handleUnlock} autoFocus>
            Unlock Terminal
          </Button>
          <Button color="error" size="small" onClick={signOut}>
            Sign out anyway
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={secondsLeft !== null} onClose={stayActive} aria-labelledby="idle-sign-out-title">
      <DialogTitle id="idle-sign-out-title">Are you still there?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          For security, you will be signed out in {secondsLeft} seconds because this screen has not been used.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={signOut}>Sign out now</Button>
        <Button variant="contained" onClick={stayActive} autoFocus>
          Stay signed in
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IdleSignOut;
