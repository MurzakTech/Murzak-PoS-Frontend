import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Chip, alpha } from '@mui/material';
import {
  CloudSync,
  CloudOff,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const SystemStatus = ({ onSync }) => {
  const theme = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onSync) {
        await onSync();
      }
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* System Time */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.5)
            : alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 700, 
            lineHeight: 1.2,
            color: theme.palette.mode === 'dark' 
              ? theme.palette.text.primary 
              : theme.palette.primary.dark,
            fontSize: '0.875rem',
          }}
        >
          {formatTime(currentTime)}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            lineHeight: 1.2,
            color: theme.palette.mode === 'dark' 
              ? theme.palette.text.secondary 
              : theme.palette.primary.main,
            fontWeight: 500,
            fontSize: '0.7rem',
          }}
        >
          {formatDate(currentTime)}
        </Typography>
      </Box>

      {/* Online/Offline Status */}
      <Tooltip title={isOnline ? 'Online' : 'Offline'}>
        <Chip
          icon={isOnline ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
          label={isOnline ? 'Online' : 'Offline'}
          color={isOnline ? 'success' : 'error'}
          size="small"
          variant="outlined"
          sx={{
            height: 28,
            '& .MuiChip-icon': {
              fontSize: 16,
            },
          }}
        />
      </Tooltip>

      {/* Sync Button */}
      <Tooltip title={isOnline ? 'Sync Data' : 'Cannot sync while offline'}>
        <span>
          <IconButton
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            size="small"
            sx={{
              color: isOnline ? 'inherit' : 'text.disabled',
            }}
          >
            {isSyncing ? (
              <CloudSync sx={{ animation: 'spin 1s linear infinite' }} />
            ) : isOnline ? (
              <CloudSync />
            ) : (
              <CloudOff />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default SystemStatus;

