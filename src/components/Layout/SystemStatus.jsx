import React, { useState, useEffect } from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

/**
 * Connection indicator. Quiet green dot while online (nothing to worry about),
 * a clear red "Offline" chip when the connection drops so people know why
 * actions might not be saving.
 */
const SystemStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <Tooltip title="No internet connection. Changes will not be saved until you reconnect.">
        <Chip
          icon={<WifiOff />}
          label="Offline"
          size="small"
          color="error"
          sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Connected">
      <Box
        aria-label="Connected"
        role="img"
        sx={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          bgcolor: 'success.light',
          boxShadow: (t) => `0 0 0 3px ${t.palette.mode === 'dark' ? 'rgba(74,222,128,.18)' : 'rgba(34,197,94,.2)'}`,
          mx: 0.5,
        }}
      />
    </Tooltip>
  );
};

export default SystemStatus;
