import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';

/**
 * Catches unexpected rendering errors so people see a helpful screen with a
 * way forward, instead of a blank white page. Without this, a single bad
 * response from the server can make the whole app disappear.
 *
 * Use `inline` for a smaller panel inside a page (e.g. around one widget).
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a record in the console for support; avoid logging user data
    console.error('UI error caught by ErrorBoundary:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Recover automatically when the person navigates somewhere else
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { inline } = this.props;
    return (
      <Box
        role="alert"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: inline ? 240 : '100vh',
          p: 3,
          bgcolor: inline ? 'transparent' : 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2.5,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'error.main',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(248,113,113,.14)' : 'rgba(220,38,38,.08)'),
            }}
          >
            <ErrorOutline sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" gutterBottom>
            Something went wrong on this screen
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your data is safe. Try reloading the page. If it keeps happening, contact support and tell us
            what you were doing.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>
              Reload page
            </Button>
            {!inline && (
              <Button variant="outlined" startIcon={<Home />} href="/dashboard">
                Go to dashboard
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    );
  }
}

export default ErrorBoundary;
