import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';
import { useNewLook } from '../newlook/NewLookProvider';
import S from '../newlook/strings';

const NotFound = () => {
  const navigate = useNavigate();
  const { enabled: newLook } = useNewLook(); // the New look shows plain words with no error number

  if (newLook) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', px: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {S.notFound.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {S.notFound.text}
        </Typography>
        <Button variant="contained" startIcon={<Home />} onClick={() => navigate('/dashboard')}>
          {S.notFound.home}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        The page you are looking for does not exist.
      </Typography>
      <Button
        variant="contained"
        startIcon={<Home />}
        onClick={() => navigate('/dashboard')}
        sx={{ mr: 2 }}
      >
        Go to Dashboard
      </Button>
      <Button
        variant="outlined"
        onClick={() => navigate('/')}
      >
        Go to Home
      </Button>
    </Box>
  );
};

export default NotFound;

