import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowBack, PointOfSale, Login } from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';
import useRoleAccess from '../hooks/useRoleAccess';
import Layout from '../components/Layout/Layout';

const NotFound = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { hasAccess } = useRoleAccess();

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 2,
      }}
    >
      <Typography variant="overline" color="text.secondary">
        Error 404
      </Typography>
      <Typography variant="h3" component="h1" gutterBottom>
        We could not find that page
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 440 }}>
        The link may be old or mistyped. {isAuthenticated ? 'You can go back, or carry on from one of these.' : 'Sign in to carry on.'}
      </Typography>
      {isAuthenticated ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {hasAccess('/dashboard') && (
            <Button variant="contained" startIcon={<Home />} onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          )}
          {hasAccess('/sales/pos') && (
            <Button variant={hasAccess('/dashboard') ? 'outlined' : 'contained'} startIcon={<PointOfSale />} onClick={() => navigate('/sales/pos')}>
              Open the till
            </Button>
          )}
          <Button color="inherit" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
            Go back
          </Button>
        </Stack>
      ) : (
        <Button variant="contained" startIcon={<Login />} onClick={() => navigate('/login')}>
          Sign in
        </Button>
      )}
    </Box>
  );

  // Signed-in people keep the menu, so a wrong link is never a dead end
  return isAuthenticated ? <Layout>{content}</Layout> : content;
};

export default NotFound;
