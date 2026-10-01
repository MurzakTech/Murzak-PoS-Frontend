import React from 'react';
import { Box, Card, Typography } from '@mui/material';

/**
 * Standard content card: title + optional subtitle + optional right-hand
 * action, then the body. Using one card everywhere keeps pages consistent.
 */
const SectionCard = ({ title, subtitle, action, children, noPadding = false, sx, bodySx }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
    {(title || action) && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          pt: 2.25,
          pb: noPadding ? 1.5 : 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {title && <Typography variant="h6">{title}</Typography>}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
    )}
    <Box sx={{ p: noPadding ? 0 : 2.5, pt: noPadding ? 0 : 2, flexGrow: 1, minHeight: 0, ...bodySx }}>
      {children}
    </Box>
  </Card>
);

export default SectionCard;
