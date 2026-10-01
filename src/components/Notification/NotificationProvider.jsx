import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearNotification } from '../../store/notificationSlice';

const NotificationProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  const { open, message, severity, title, duration } = useAppSelector((state) => state.notification);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(clearNotification());
  };

  // On the till, messages sit compactly in the middle of the header so they never cover
  // the customer button, the search box or the Charge button.
  const onTill = typeof window !== 'undefined' && window.location.pathname.startsWith('/sales/pos');

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={onTill ? Math.min(duration || 6000, 4000) : duration || 6000}
        onClose={handleClose}
        anchorOrigin={onTill ? { vertical: 'top', horizontal: 'center' } : { vertical: 'top', horizontal: 'right' }}
        sx={onTill ? { top: '6px !important', maxWidth: 'min(520px, calc(100vw - 32px))' } : undefined}
      >
        <Alert
          onClose={handleClose}
          severity={severity || 'info'}
          variant="filled"
          sx={{ width: '100%', ...(onTill ? { py: 0, alignItems: 'center', boxShadow: 6 } : {}) }}
        >
          {title && !onTill && <AlertTitle>{title}</AlertTitle>}
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationProvider;

