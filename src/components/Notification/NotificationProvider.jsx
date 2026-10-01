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

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration || 6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleClose} 
          severity={severity || 'info'} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationProvider;

