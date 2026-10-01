import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

/**
 * Friendly "nothing here yet" panel. An empty screen should always tell the
 * person what this area is for and offer the one obvious next step.
 *
 * actions: [{ label, onClick, to, icon, variant }]  (first one is the primary)
 */
const EmptyState = ({ icon, title, description, actions = [], compact = false, sx }) => (
  <Box
    sx={{
      textAlign: 'center',
      px: 3,
      py: compact ? 4 : 7,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      ...sx,
    }}
  >
    {icon && (
      <Box
        sx={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          mb: 2,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          background: (t) => t.custom?.gradientSoft,
          '& svg': { fontSize: compact ? 24 : 30 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography variant={compact ? 'h6' : 'h5'} gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: actions.length ? 2.5 : 0 }}>
        {description}
      </Typography>
    )}
    {actions.length > 0 && (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        {actions.map((a, i) => (
          <Button
            key={a.label}
            variant={a.variant || (i === 0 ? 'contained' : 'outlined')}
            startIcon={a.icon}
            onClick={a.onClick}
            href={a.href}
          >
            {a.label}
          </Button>
        ))}
      </Stack>
    )}
  </Box>
);

export default EmptyState;
