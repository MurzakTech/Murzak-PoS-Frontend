import React, { useCallback } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/authSlice';
import { showNotification } from '../../store/notificationSlice';
import useIdleLogout, { IDLE_MINUTES } from '../../hooks/useIdleLogout';

/** Warns, then signs out, a device left untouched for IDLE_MINUTES. */
const IdleSignOut = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const onExpire = useCallback(() => {
    dispatch(logout());
    dispatch(showNotification({
      message: `You were signed out after ${IDLE_MINUTES} minutes without activity. Sign in again to continue.`,
      severity: 'info',
      title: 'Signed out for safety',
    }));
  }, [dispatch]);

  const { status, secondsLeft, stayActive } = useIdleLogout({ enabled: Boolean(isAuthenticated), onExpire });

  if (!isAuthenticated || status !== 'warning') return null;

  return (
    <Dialog open maxWidth="xs" fullWidth aria-labelledby="idle-title">
      <DialogTitle id="idle-title">Are you still there?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          For safety, you will be signed out in <strong>{secondsLeft} seconds</strong> because this device
          has not been used for a while.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch(logout())}>Sign out now</Button>
        <Button variant="contained" onClick={stayActive} autoFocus>Stay signed in</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IdleSignOut;
