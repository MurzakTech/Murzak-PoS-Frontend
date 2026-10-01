import React from 'react';
import { Box, Card, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Key-figure card. Shows a label, a big value and a one-line hint.
 * Only pass `delta` when it is a real, calculated change; never a placeholder.
 *
 * accent: a palette path such as 'primary' | 'success' | 'warning' | 'error' | 'info'
 */
const StatCard = ({ label, value, hint, icon, accent = 'primary', loading = false, onClick, size = 'md' }) => {
  const isLarge = size === 'md';
  return (
    <Card
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      sx={{
        height: '100%',
        p: isLarge ? 2.5 : 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s ease, transform .15s ease, border-color .15s ease',
        '&:hover': onClick
          ? { boxShadow: (t) => t.shadows[4], borderColor: (t) => alpha(t.palette[accent].main, 0.4) }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={110} height={isLarge ? 40 : 32} />
          ) : (
            <Typography
              variant={isLarge ? 'h3' : 'h5'}
              sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}
            >
              {value}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: isLarge ? 40 : 34,
              height: isLarge ? 40 : 34,
              flexShrink: 0,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              color: `${accent}.main`,
              bgcolor: (t) => alpha(t.palette[accent].main, t.palette.mode === 'dark' ? 0.18 : 0.1),
              '& svg': { fontSize: isLarge ? 22 : 19 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {loading ? <Skeleton width={90} /> : hint}
        </Typography>
      )}
    </Card>
  );
};

export default StatCard;
