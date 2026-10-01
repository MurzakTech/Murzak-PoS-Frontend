import React from 'react';
import { Box, Typography } from '@mui/material';
import logoMark from '../../assets/logo_mark.png';

/**
 * Murzak POS logo: the transparent brand mark plus an optional wordmark.
 * Works on light and dark backgrounds (the mark has no background of its own).
 */
const BrandLogo = ({ size = 32, showText = true, textVariant = 'h6', sx }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, ...sx }}>
    <Box
      component="img"
      src={logoMark}
      alt={showText ? '' : 'Murzak POS'}
      sx={{ height: size, width: 'auto', display: 'block', flexShrink: 0 }}
    />
    {showText && (
      <Typography
        variant={textVariant}
        component="span"
        noWrap
        sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1 }}
      >
        Murzak <Box component="span" sx={{ color: 'primary.main' }}>POS</Box>
      </Typography>
    )}
  </Box>
);

export default BrandLogo;
