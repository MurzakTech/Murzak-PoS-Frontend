import React, { useCallback } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import useIdleSignOut from '../hooks/useIdleSignOut';

/**
 * Signs a shared till out when nobody has used it for a while, so the next
 * person cannot carry on under someone else's name. Warns a minute before.
 */
const IdleSignOut = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const signOut = useCallback(() => {
    dispatch(logout());
    window.location.assign('/login?reason=idle');
  }, [dispatch]);

  const { secondsLeft, stayActive } = useIdleSignOut({ enabled: !!isAuthenticated, onTimeout: signOut });

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
