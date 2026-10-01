import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import BrandLogo from './BrandLogo';

/**
 * Loading placeholders. Skeletons that mimic the page layout feel faster and
 * calmer than a lone spinner, and stop the page "jumping" when data arrives.
 */

// Branded full-screen splash for first load (public pages, auth check)
export const FullPageLoader = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      bgcolor: 'background.default',
    }}
  >
    <Stack alignItems="center" spacing={2.5}>
      <Box
        sx={{
          animation: 'murzak-pulse 1.6s ease-in-out infinite',
          '@keyframes murzak-pulse': {
            '0%, 100%': { opacity: 0.55, transform: 'scale(0.96)' },
            '50%': { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        <BrandLogo size={44} showText={false} />
      </Box>
      <Skeleton variant="rounded" width={120} height={6} />
    </Stack>
  </Box>
);

// Generic page skeleton shown while a page's code or data loads inside the app shell
export const PageSkeleton = () => (
  <Box sx={{ width: '100%', animation: 'murzak-fade-up .25s ease both' }} aria-busy="true" aria-label="Loading">
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
      <Box>
        <Skeleton variant="text" width={220} height={34} />
        <Skeleton variant="text" width={320} height={20} />
      </Box>
      <Skeleton variant="rounded" width={120} height={38} />
    </Stack>
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        mb: 2,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={112} />
      ))}
    </Box>
    <Skeleton variant="rounded" height={320} />
  </Box>
);

export default PageSkeleton;
