import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * The shell every redesigned screen will sit inside: a top bar, a menu column and a page area.
 *
 * It is EMPTY on purpose. This ticket (P0-5) only proves the switch: with the New look on, this loads;
 * with it off, nothing in the app changes. The real top bar, menu and page header are built in the
 * foundation phase (P1-6) from the design tokens (P1-1), so nothing here invents a colour, size or
 * component: it uses only what the app's current theme already provides.
 */
const NewLookShell = ({ children }) => (
  <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        height: 64,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography component="span" sx={{ fontWeight: 700 }}>
        Murzak POS
      </Typography>
      <Chip size="small" label="New look" />
    </Box>

    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Box
        component="nav"
        aria-label="Main menu"
        sx={{ width: 240, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', display: { xs: 'none', md: 'block' } }}
      />
      <Box component="main" sx={{ flex: 1, p: 3, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  </Box>
);

/** The page shown inside the empty shell. Replaced by real screens as they are built. */
export const NewLookEmptyPage = () => (
  <Box>
    <Typography variant="h1" sx={{ fontSize: 28, fontWeight: 700, mb: 0.5 }}>
      New look
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>
      The New look is on for this shop. No redesigned screens are ready yet; the rest of the app is unchanged.
    </Typography>
    <Button component={RouterLink} to="/dashboard" variant="outlined">
      Back to the current screens
    </Button>
  </Box>
);

export default NewLookShell;
