import React from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

const CloseTillDialog = ({ open, onClose, onConfirm, loading, entry }) => (
  <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="close-till-title">
    <DialogTitle id="close-till-title">End your shift?</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Closing the till finishes this session and totals up every sale made in it. You will need to open the till again to keep selling.
      </Typography>
      {entry && (
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => t.custom.surface.sunken }}>
          <Typography variant="caption" color="text.secondary">Session</Typography>
          <Typography variant="subtitle2">{entry.name}</Typography>
          {entry.pos_profile && (
            <Typography variant="caption" color="text.secondary">Profile: {entry.pos_profile}</Typography>
          )}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button color="inherit" onClick={onClose} disabled={loading}>Keep selling</Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}>
        {loading ? 'Closing...' : 'Close till'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default CloseTillDialog;
